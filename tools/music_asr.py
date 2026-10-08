"""Тайминг слов нейросетью: docs/music/<имя>.mp3 → tools/asr_lyrics.json.

Suno отдаёт тайминг только к тексту, который в него ввели (music_lyrics.py
--fetch), а в половине треков текста там нет вовсе — одни пометки стиля, —
хотя голос есть: слова Suno придумал сам. Здесь тайминг считается по звуку:

1. Demucs (htdemucs) отделяет голос от музыки — на фонке с перегрузом и
   808-м басом распознавание без этого тонет.
2. Текст в Suno есть — Whisper (stable-ts, model.align) привязывает к голосу
   каждое известное слово: текст верный, нейросеть ищет только время.
3. Текста нет — Whisper large-v3 распознаёт слова сам, с таймингом каждого.
   Сомнительное (низкая уверенность, слово дольше трёх секунд, отрезок, где
   по Demucs голоса нет) выкидывается: лучше пропустить строчку, чем показать
   на сцене то, чего не пели.

Результат — tools/asr_lyrics.json, в том же виде, что кеш Suno
({"word", "start_s", "end_s"}), и music_lyrics.py собирает .lyr из него
в первую очередь.

Запуск — только из отдельного окружения (torch с CUDA, demucs, stable-ts),
в основной Python это не ставится:

    python -m venv tools/_asr_env
    tools/_asr_env/Scripts/python -m pip install torch==2.8.0 torchaudio==2.8.0 ^
        --index-url https://download.pytorch.org/whl/cu126
    tools/_asr_env/Scripts/python -m pip install demucs stable-ts soundfile

    tools/_asr_env/Scripts/python tools/music_asr.py              все треки
    tools/_asr_env/Scripts/python tools/music_asr.py bodycam never  выбранные
"""

import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MUSIC = ROOT / "docs" / "music"
WORK = Path(__file__).resolve().parent / "_asr_work"
OUT = Path(__file__).resolve().parent / "asr_lyrics.json"
SUNO_TEXT = Path(__file__).resolve().parent / "suno_text.json"
MODEL = "large-v3"

for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")

# Язык пения: Whisper на смешанном тексте сам угадывает плохо. Трека нет в
# списке — язык определяет модель.
LANG = {
    "pust-begut-neuklyuzhe": "ru",
    "bodycam": "ru",
    "phonk-and-phonk": "en",
    "bezlikiy": "zh",
    "triste-raposa": "es",
    # текста в Suno нет — язык по названию и промту стиля (tools/suno_styles.json)
    "never": "en",
    "where-have-you-gone": "en",
    "pota": "pt",
    "razbityy-bit": "uk",
    "zabud-moe-imya": "ru",
    "neon-v-tishine": "ru",
    "spim-v-meste": "ru",
    "cursed-digicore": "ru",
}

# Что Whisper «слышит» в тишине и шуме — частые галлюцинации из субтитров,
# на которых он учился. Сами по себе такие строки не поют.
HALLUCINATIONS = re.compile(
    r"^(you|thank you|thanks for watching|субтитры|продолжение следует|редактор субтитров"
    r"|дякую|спасибо|hmm|uh|oh)[.!,]*$|dimatorzok|создавал|субтитр", re.I)


def tracks():
    src = (ROOT / "docs" / "music.js").read_text(encoding="utf-8")
    return re.findall(r"file:\s*'([^']+)',\s*suno:\s*'([^']+)'", src)


def sung_text(prompt):
    """Текст из Suno без пометок; пусто — значит, текста там нет."""
    text = re.sub(r"\[[^\]]*\]|\([^)]*\)", "", prompt or "")
    lines = [l.strip() for l in text.splitlines()]
    lines = [l for l in lines if re.search(r"\w", l)]
    return "\n".join(lines)


def suno_texts(want):
    """Тексты треков из открытого API Suno (без входа), кеш — tools/suno_text.json."""
    try:
        cache = json.loads(SUNO_TEXT.read_text(encoding="utf-8"))
    except FileNotFoundError:
        cache = {}
    for name, sid in want:
        if name in cache:
            continue
        r = subprocess.run(["curl", "-s", "-m", "30", "https://studio-api.prod.suno.com/api/clip/" + sid],
                           capture_output=True)
        cache[name] = (json.loads(r.stdout or b"{}").get("metadata") or {}).get("prompt") or ""
    SUNO_TEXT.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
    return cache


# ── 1. голос отдельно ─────────────────────────────────────────────────────────

def vocals(name):
    out = WORK / "htdemucs" / name / "vocals.wav"
    if not out.exists():
        subprocess.run([sys.executable, "-m", "demucs", "--two-stems", "vocals", "-n", "htdemucs",
                        "-o", str(WORK), str(MUSIC / (name + ".mp3"))], check=True)
    return out


def voice_mask(path, hop=0.05):
    """Где по Demucs есть голос: громкость дорожки голоса окнами по 50 мс."""
    import numpy as np
    import soundfile as sf
    a, sr = sf.read(str(path), dtype="float32")
    if a.ndim > 1:
        a = a.mean(axis=1)
    n = int(sr * hop)
    frames = a[: len(a) // n * n].reshape(-1, n)
    rms = np.sqrt((frames ** 2).mean(axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    # порог — от самого трека: на 25 дБ ниже его громких мест
    loud = np.percentile(db, 95)
    return db > loud - 25, hop


def onsets(path, hop=0.02):
    """Моменты, где голос вступает: громкость дорожки голоса прыгает на 12 дБ
    за 60 мс и выходит выше фона трека."""
    import numpy as np
    import soundfile as sf
    a, sr = sf.read(str(path), dtype="float32")
    if a.ndim > 1:
        a = a.mean(axis=1)
    n = int(sr * hop)
    f = a[: len(a) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((f ** 2).mean(axis=1)) + 1e-9)
    floor = np.percentile(db, 95) - 30
    rise = db[3:] - db[:-3]
    idx = np.where((rise > 12) & (db[3:] > floor))[0] + 3
    keep = [i for k, i in enumerate(idx) if k == 0 or i - idx[k - 1] > 3]   # одна вспышка — одна точка
    return np.array(keep) * hop


def snap(words, points, back=0.15, ahead=0.3):
    """Начало слова — к ближайшему вступлению голоса рядом, если оно есть.

    Whisper точен до десятых, а глаз замечает и меньше: подсвеченное слово,
    вспыхнувшее раньше звука, выглядит как ошибка. Слова не меняются местами:
    начало не уходит раньше начала предыдущего и позже конца своего.
    """
    import numpy as np
    prev = -1.0
    for w in words:
        s = w["start_s"]
        near = points[(points >= s - back) & (points <= s + ahead)]
        if near.size:
            t = float(near[np.argmin(np.abs(near - s))])
            if prev < t < w["end_s"]:
                w["start_s"] = round(t, 3)
        prev = w["start_s"]
    return words


def voiced(mask, hop, t0, t1):
    i0, i1 = int(t0 / hop), max(int(t0 / hop) + 1, int(t1 / hop))
    seg = mask[i0:i1]
    return seg.size and seg.mean() > 0.3


# ── 2–3. слова и время ────────────────────────────────────────────────────────

def words_of(result):
    out = []
    for seg in result.segments:
        for w in seg.words:
            out.append({"word": w.word, "start_s": round(w.start, 3), "end_s": round(w.end, 3),
                        "p": round(getattr(w, "probability", 1.0) or 0.0, 3)})
    return out


def to_lyric_tokens(text, aligned):
    """Время из выравнивания → на слова исходного текста, с концами строк.

    Модель режет текст по-своему (китайский — по иероглифу, пунктуацию
    отщепляет), поэтому сравниваются потоки букв без пробелов, а время слова
    исходного текста — от его первой буквы до последней.
    """
    chars, times = [], []
    for w in aligned:
        for ch in w["word"]:
            if not ch.isspace():
                chars.append(ch.lower())
                times.append((w["start_s"], w["end_s"]))
    src_chars, owner = [], []
    tokens = []
    for line in text.splitlines():
        for tok in line.split():
            tokens.append([tok, None, None, False])
            for ch in tok:
                src_chars.append(ch.lower())
                owner.append(len(tokens) - 1)
        if tokens:
            tokens[-1][3] = True
    sm = difflib.SequenceMatcher(None, src_chars, chars, autojunk=False)
    for a, b, size in sm.get_matching_blocks():
        for k in range(size):
            t = tokens[owner[a + k]]
            s, e = times[b + k]
            t[1] = s if t[1] is None else min(t[1], s)
            t[2] = e if t[2] is None else max(t[2], e)
    out = []
    for tok, s, e, br in tokens:
        if s is None:
            continue            # модель это место не нашла — не гадаем
        out.append({"word": tok + ("\n" if br else " "), "start_s": s, "end_s": e})
    return out


def main():
    import stable_whisper
    want = tracks()
    if len(sys.argv) > 1:
        want = [t for t in want if t[0] in sys.argv[1:]]
    texts = suno_texts(want)
    try:
        result = json.loads(OUT.read_text(encoding="utf-8"))
    except FileNotFoundError:
        result = {}

    WORK.mkdir(exist_ok=True)
    model = stable_whisper.load_model(MODEL, device="cuda")
    for name, _ in want:
        voc = vocals(name)
        mask, hop = voice_mask(voc)
        text = sung_text(texts.get(name))
        if len(text.split()) >= 3:
            r = model.align(str(voc), text, language=LANG.get(name), original_split=True)
            words = to_lyric_tokens(text, words_of(r))
            how = "выравнивание по тексту Suno"
        else:
            r = model.transcribe(str(voc), language=LANG.get(name), word_timestamps=True,
                                 vad=True, suppress_silence=True, condition_on_previous_text=False,
                                 temperature=0.0)
            raw = words_of(r)
            if not raw:                                    # VAD съел перегруженный голос
                r = model.transcribe(str(voc), language=LANG.get(name), word_timestamps=True,
                                     suppress_silence=True, condition_on_previous_text=False,
                                     temperature=0.0)
                raw = words_of(r)
            words = [w for w in raw
                     if w["p"] >= 0.45 and w["end_s"] - w["start_s"] <= 3
                     and voiced(mask, hop, w["start_s"], w["end_s"])
                     and not HALLUCINATIONS.search(w["word"].strip())]
            # строка — сегмент модели: его последнее слово закрывает строку
            ends = {round(seg.words[-1].end, 3) for seg in r.segments if seg.words}
            for w in words:
                w["word"] = w["word"].strip() + ("\n" if w["end_s"] in ends else " ")
                w.pop("p", None)
            how = "распознано (%d из %d слов прошли отбор), язык %s" % (len(words), len(raw), r.language)
        result[name] = snap(words, onsets(voc))
        OUT.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
        print("%-24s %3d слов — %s" % (name, len(words), how), flush=True)


if __name__ == "__main__":
    main()
