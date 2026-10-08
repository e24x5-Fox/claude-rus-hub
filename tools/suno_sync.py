"""Плейлист Suno → плеер каталога: docs/music.js, обложки и тексты песен.

    python tools/suno_sync.py           список, обложки, тексты
    python tools/suno_sync.py --viz     и кадры анимации (.viz) для новых треков

Какие треки играют на сайте, решает плейлист в Suno: добавил песню туда —
на следующий день она в плеере, убрал — пропала. Раз в сутки это делает
GitHub Actions (.github/workflows/music-sync.yml), руками запускать не нужно.

Звук сайт берёт прямо у Suno — из видео трека (video_url, cdn1.suno.ai/<id>.mp4):
обложка-заставка и звук AAC ~190 кбит/с, открыто для любого сайта
(Access-Control-Allow-Origin: *), тег <audio> играет его звуковую дорожку.
Прочие пути закрыты или негодны: mp3 Suno не отдаёт (audio_url ведёт на
/api/forbidden, cdn1/<id>.mp3 — 403), а m4a из media_urls зашифрован — в нём
нет даже заголовка MP4, играет его только сайт Suno своим скриптом. Если у
трека остался старый music/<имя>.mp3, в music.js стоит mp3: 1, и плеер берёт
его, когда Suno не ответил.

Своё, чтобы было всегда, даже если Suno что-то уберёт:
  music/<имя>.jpg  — обложка 256×256 (перекачивается, если её сменили в Suno);
  music/<имя>.txt  — текст песни, как он записан в Suno (у инструменталов нет);
  music/<имя>.viz  — кадры анимации, см. tools/music_viz.py (только с --viz).

Слова с таймингом для сцены (.lyr) Suno без входа не отдаёт (401) — их
по-прежнему добирает tools/music_lyrics.py --fetch через отладочный браузер.

API неофициальный (studio-api.prod.suno.com, без входа). Если он сломается,
скрипт упадёт, ничего не записав, и сайт останется со вчерашним music.js.
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
import urllib.request
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MUSIC = ROOT / "docs" / "music"
MUSIC_JS = ROOT / "docs" / "music.js"
STYLES = ROOT / "tools" / "suno_styles.json"
CACHE = ROOT / "tools" / "suno_tracks.json"     # id → имя файла и адрес обложки

PLAYLIST = "7be9efc4-0b47-4ca9-85d6-37db38a60aeb"
API = "https://studio-api.prod.suno.com/api/playlist/%s/?page=%d"
ARTIST = "e24x5"
COVER = 256

for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")


def get(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def playlist():
    clips, page = [], 1
    while True:
        d = json.loads(get(API % (PLAYLIST, page)))
        batch = [c["clip"] for c in d.get("playlist_clips") or []]
        clips += batch
        total = d.get("num_total_results") or 0
        if not batch or len(clips) >= total:
            break
        page += 1
    if not clips:
        raise SystemExit("плейлист пуст или Suno ответил не то — ничего не меняю")
    seen, out = set(), []
    for c in clips:                                  # одна песня дважды — один раз
        if c["id"] not in seen and c.get("status") == "complete":
            seen.add(c["id"])
            out.append(c)
    return out


TRANSLIT = dict(zip("абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
                    ["a", "b", "v", "g", "d", "e", "e", "zh", "z", "i", "y", "k", "l", "m", "n", "o",
                     "p", "r", "s", "t", "u", "f", "h", "ts", "ch", "sh", "sch", "", "y", "", "e", "yu", "ya"]))


def slug(title):
    t = "".join(TRANSLIT.get(ch, ch) for ch in title.lower()).replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:40].strip("-")


def names(clips, cache):
    """Имя файла у трека постоянное: старое из music.js или кеша, новое — из названия."""
    old = dict((s, f) for f, s in re.findall(r"file:\s*'([^']+)',\s*suno:\s*'([^']+)'",
                                              MUSIC_JS.read_text(encoding="utf-8")))
    taken, out = set(), {}
    for c in clips:
        name = old.get(c["id"]) or (cache.get(c["id"]) or {}).get("file")
        if name:
            out[c["id"]] = name
            taken.add(name)
    for c in clips:
        if c["id"] in out:
            continue
        base = slug(c.get("title") or "")
        if not base or base == "untitled" or base in taken:
            base = (base + "-" if base else "") + c["id"][:8]
        out[c["id"]] = base
        taken.add(base)
    return out


def cover(c, path, cache_row):
    url = c.get("image_large_url") or c.get("image_url")
    if not url or (path.exists() and cache_row.get("image") == url):
        return False
    raw = get(url)
    try:
        from PIL import Image
        im = Image.open(BytesIO(raw)).convert("RGB")
        side = min(im.size)                          # по центру в квадрат
        left, top = (im.width - side) // 2, (im.height - side) // 2
        im = im.crop((left, top, left + side, top + side)).resize((COVER, COVER), Image.LANCZOS)
        im.save(path, "JPEG", quality=88)
    except ImportError:                              # без Pillow — как отдал Suno
        path.write_bytes(raw)
    cache_row["image"] = url
    return True


def lyrics(c, path):
    m = c.get("metadata") or {}
    text = (m.get("prompt") or "").strip()
    if m.get("make_instrumental") or m.get("has_vocal") is False or len(text) < 20:
        return False
    text = text.replace("\r\n", "\n") + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return False
    path.write_text(text, encoding="utf-8")
    return True


def audio_url(c):
    url = c.get("video_url") or ""
    return url if url.endswith(".mp4") else None


def js_str(s):
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


def write_music_js(rows):
    lines = []
    for r in rows:
        parts = ["title: " + js_str(r["title"]), "file: " + js_str(r["file"]), "suno: " + js_str(r["suno"])]
        if r.get("audio"):
            parts.append("audio: " + js_str(r["audio"]))
        if r.get("mp3"):
            parts.append("mp3: 1")
        lines.append("    { " + ", ".join(parts) + " }")
    text = ("/* Музыка для плеера в левом углу (music-widget.js). Треки автора, сделаны в Suno.\n"
            "   ФАЙЛ ПИШЕТ tools/suno_sync.py по плейлисту Suno — руками не править:\n"
            "   добавить трек = добавить его в плейлист «сайт каталог русификаторы».\n"
            "   audio — звук у Suno (mp4); mp3: 1 — есть запасной music/<file>.mp3.\n"
            "   Обложки music/<file>.jpg и тексты music/<file>.txt лежат у нас. */\n"
            "window.CRH_MUSIC = {\n"
            "  artist: " + js_str(ARTIST) + ",\n"
            "  tracks: [\n" + ",\n".join(lines) + "\n  ]\n};\n")
    if MUSIC_JS.read_text(encoding="utf-8") != text:
        MUSIC_JS.write_text(text, encoding="utf-8")
        return True
    return False


def make_viz(todo, styles):
    sys.path.insert(0, str(ROOT / "tools"))
    import music_viz
    with tempfile.TemporaryDirectory() as tmp:
        for r in todo:
            src = Path(tmp) / (r["file"] + ".mp4")
            wav = src.with_suffix(".wav")
            try:
                src.write_bytes(get(r["audio"], timeout=180))
                # mp4 librosa читает только через устаревший audioread — даём ей wav
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ac", "1",
                                "-ar", str(music_viz.SR), str(wav)], check=True)
                music_viz.write_viz(wav, MUSIC / (r["file"] + ".viz"), styles.get(r["file"]), r["file"])
            except Exception as e:                   # один трек не сорвёт остальные
                print(f"  ! {r['file']}: .viz не посчитан ({e})")
            finally:
                src.unlink(missing_ok=True)
                wav.unlink(missing_ok=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--viz", action="store_true", help="посчитать .viz для треков без него")
    args = ap.parse_args()

    clips = playlist()
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    styles = json.loads(STYLES.read_text(encoding="utf-8")) if STYLES.exists() else {}
    name_of = names(clips, cache)
    MUSIC.mkdir(parents=True, exist_ok=True)

    rows, covers, texts = [], 0, 0
    for c in clips:
        file = name_of[c["id"]]
        row = cache.setdefault(c["id"], {})
        row["file"] = file
        covers += cover(c, MUSIC / (file + ".jpg"), row)
        texts += lyrics(c, MUSIC / (file + ".txt"))
        tags = ((c.get("metadata") or {}).get("tags") or "").strip()
        if tags and file not in styles:
            styles[file] = tags
        rows.append({"title": " ".join((c.get("title") or "").split()) or "Untitled",
                     "file": file, "suno": c["id"], "audio": audio_url(c),
                     "mp3": (MUSIC / (file + ".mp3")).exists()})

    js = write_music_js(rows)
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    STYLES.write_text(json.dumps(styles, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    print(f"треков в плейлисте {len(rows)}; обложек скачано {covers}, текстов записано {texts}; "
          f"music.js {'обновлён' if js else 'без изменений'}")

    if args.viz:
        todo = [r for r in rows if r["audio"] and not (MUSIC / (r["file"] + ".viz")).exists()]
        print(f".viz посчитать: {len(todo)}")
        make_viz(todo, styles)


if __name__ == "__main__":
    main()
