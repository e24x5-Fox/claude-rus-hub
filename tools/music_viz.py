"""Заранее записанная анимация плеера: docs/music/<имя>.mp3 → docs/music/<имя>.viz.

Страница звук не анализирует — ни AudioContext, ни AnalyserNode. Она берёт
готовые кадры из .viz и показывает тот, что приходится на audio.currentTime.
Поэтому анимация одинаковая у всех, ничего не стоит процессору и сама
замедляется и разгоняется вместе с треком: время в нём — время записи.

Формат v2 (всё little-endian):
    'CRHV'  u8 версия = 2  u8 кадров в секунду  u8 полос  u8 0
    u32 кадров  u32 долей
    8 байт характера танца (0…255, кроме двух):
        энергия  прыжок  резкость  приседание  размах  доль-на-качок (1…4)  BPM  0
    кадры подряд, в каждом по байту (0…255):
        полосы спектра от баса к верхам, общая громкость, доля «на бит»
    f32 × долей — моменты долей в секундах записи
    u8 × долей  — сила каждой доли

Полосы нормированы по самому треку (5-й и 99-й процентиль), а не по всем
трекам сразу: тихая баллада шевелит полосы так же заметно, как фонк. Спад
после удара считается здесь же — быстро вверх, плавно вниз, — и странице
остаётся только интерполировать между кадрами.

Характер танца — из двух источников. Промт стиля из Suno (по id трека из
music.js, открытый API studio-api.prod.suno.com/api/clip/<id>, без входа)
даёт настроение: «aggressive, violent, hard» против «sad, lo-fi, ambient».
Сам звук даёт то, что промт не скажет: сколько в нём ударных и как часто
атаки. Промты кешируются в tools/suno_styles.json — второй раз сеть не нужна.
Из энергии выходит: агрессивный трек — резкий прыжок на каждую долю и короткий
рывок из стороны в сторону; спокойный — мягкий кивок и качание раз в 2–4 доли.

    python tools/music_viz.py            # все mp3, у которых нет .viz или он старше
    python tools/music_viz.py --force    # пересчитать всё
    python tools/music_viz.py never      # один трек

Нужны numpy и librosa (в основной Python ничего не ставить — см. CLAUDE.md
мастерской; здесь хватает того, что уже стоит).
"""
import argparse
import json
import re
import struct
import sys
import urllib.request
from pathlib import Path

import numpy as np
import librosa

ROOT = Path(__file__).resolve().parent.parent
MUSIC = ROOT / "docs" / "music"
STYLES = ROOT / "tools" / "suno_styles.json"
SUNO_API = "https://studio-api.prod.suno.com/api/clip/%s"
SR = 22050
FPS = 25
BANDS = 8
FMIN, FMAX = 40.0, 11000.0
RELEASE_S = 0.18      # за сколько секунд полоса спадает примерно втрое
BEAT_S = 0.22         # сколько длится вспышка «на бит»

# слова из промтов Suno: что делает трек жёстче и что — мягче
HARD = ["aggressive", "violent", "brutal", "rage", "hard", "hostile", "destructive",
        "relentless", "unrelenting", "chaotic", "screamo", "demonic", "crushing",
        "massive", "punchy", "overdriven", "clipping", "drum & bass", "drum and bass",
        "jungle", "fast", "machine-gun", "smashing", "menacing", "industrial percussion",
        "brazilian", "baile", "rapid", "razor"]
SOFT = ["sad", "melancholic", "mournful", "soft", "ambient", "lo-fi", "lofi", "slow",
        "dreamy", "haunting", "lonely", "piano", "pads", "hiss", "memories", "chill",
        "mellow", "calm", "gentle", "sleepy", "lullaby", "acoustic", "ballad"]


def norm(x, lo=5, hi=99):
    a, b = np.percentile(x, [lo, hi])
    return np.clip((x - a) / max(b - a, 1e-6), 0, 1)


def lin(x, a, b):
    return float(np.clip((x - a) / (b - a), 0, 1))


def release(x, fps):
    """Быстро вверх, плавно вниз: как стрелка на пульте."""
    k = np.exp(-1.0 / (fps * RELEASE_S))
    y = np.empty_like(x)
    acc = np.zeros(x.shape[1:]) if x.ndim > 1 else 0.0
    for i in range(len(x)):
        acc = np.maximum(x[i], acc * k)
        y[i] = acc
    return y


# ── промты стиля из Suno ──
def suno_ids():
    text = (ROOT / "docs" / "music.js").read_text(encoding="utf-8")
    return dict(re.findall(r"file:\s*'([^']+)',\s*suno:\s*'([^']+)'", text))


def styles(names):
    cache = json.loads(STYLES.read_text(encoding="utf-8")) if STYLES.exists() else {}
    ids = suno_ids()
    changed = False
    for name in names:
        if name in cache or name not in ids:
            continue
        try:
            req = urllib.request.Request(SUNO_API % ids[name], headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                tags = (json.load(r).get("metadata") or {}).get("tags") or ""
        except Exception as e:                     # нет сети — танец только по звуку
            print(f"{name}: стиль из Suno не получен ({e})")
            continue
        cache[name] = tags.strip()
        changed = True
    if changed:
        STYLES.write_text(json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    return cache


def tag_energy(tags):
    """0 — спокойно, 1 — жёстко; None, если промта нет."""
    t = (tags or "").lower()
    if not t:
        return None
    # словами целиком: «slowed» из «chopped & screwed, slowed down» — приём
    # фонка, а не медленный трек, и за «slow» считаться не должен
    def count(words):
        return sum(len(re.findall(r"(?<![\w-])" + re.escape(w) + r"(?![\w-])", t)) for w in words)
    hard, soft = count(HARD), count(SOFT)
    return (hard + 1) / (hard + soft + 2)


# ── разбор звука ──
def analyse(mp3, tags):
    y, sr = librosa.load(mp3, sr=SR, mono=True)
    dur = len(y) / SR
    hop = SR // FPS
    frames = 1 + len(y) // hop

    spec = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop)) ** 2
    freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
    edges = np.geomspace(FMIN, FMAX, BANDS + 1)
    bands = np.stack([spec[(freqs >= lo) & (freqs < hi)].mean(axis=0)
                      for lo, hi in zip(edges[:-1], edges[1:])], axis=1)
    bands = librosa.power_to_db(bands, ref=np.max)
    bands = np.stack([norm(bands[:, i]) for i in range(BANDS)], axis=1) ** 1.4
    bands = release(bands, FPS)

    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
    level = release(norm(librosa.amplitude_to_db(rms, ref=np.max), 2, 99.5), FPS)

    onset = librosa.onset.onset_strength(y=y, sr=SR, hop_length=hop)
    _, beats = librosa.beat.beat_track(onset_envelope=onset, sr=SR, hop_length=hop)
    pulse = np.zeros(len(onset))
    strength = norm(onset, 50, 99.5)
    decay = np.exp(-np.arange(int(FPS * BEAT_S * 3)) / (FPS * BEAT_S))
    beat_force = []
    for b in beats:
        # сильная доля ярче слабой: высота вспышки — сила атаки в этом месте
        s = strength[max(0, b - 1):b + 2].max()
        beat_force.append(s)
        seg = pulse[b:b + len(decay)]
        np.maximum(seg, (0.45 + 0.55 * s) * decay[:len(seg)], out=seg)
    beat_times = librosa.frames_to_time(beats, sr=SR, hop_length=hop)
    # доля в тихом месте — слабая, даже если атака там чёткая: на брейке лисёнок стоит
    lvl_at = level[np.clip(beats, 0, len(level) - 1)] if len(beats) else np.array([])
    beat_force = np.clip(np.array(beat_force) * (0.3 + 0.7 * lvl_at), 0, 1)

    # характер: сколько ударных и как часто атаки — плюс настроение из промта
    _, perc = librosa.effects.hpss(y)
    perc_share = float(np.sum(perc ** 2) / max(np.sum(y ** 2), 1e-9))
    attacks = len(librosa.onset.onset_detect(onset_envelope=onset, sr=SR, hop_length=hop)) / max(dur, 1)
    sound_e = 0.5 * lin(perc_share, 0.10, 0.40) + 0.5 * lin(attacks, 1.5, 5.0)
    tag_e = tag_energy(tags)
    energy = sound_e if tag_e is None else 0.6 * tag_e + 0.4 * sound_e
    gap = float(np.median(np.diff(beat_times))) if len(beat_times) > 2 else 0.5
    bpm = 60 / gap
    side_s = 1.35 - 0.9 * energy                 # сколько секунд на один качок в сторону
    per_sway = int(np.clip(round(side_s / gap), 1, 4))
    profile = dict(energy=energy, hop=0.35 + 0.65 * energy, sharp=energy,
                   squash=0.4 + 0.6 * energy, sway=0.95 - 0.25 * energy,
                   per_sway=per_sway, bpm=bpm, sound=sound_e, tag=tag_e,
                   perc=perc_share, attacks=attacks)

    n = min(frames, len(bands), len(level), len(pulse))
    out = np.concatenate([bands[:n], level[:n, None], pulse[:n, None]], axis=1)
    data = np.round(np.clip(out, 0, 1) * 255).astype(np.uint8)
    return data, beat_times.astype(np.float32), beat_force, profile, dur


def byte(x):
    return int(round(np.clip(x, 0, 1) * 255))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*", help="имена треков без .mp3; без них — все")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    mp3s = [MUSIC / f"{n}.mp3" for n in args.names] if args.names else sorted(MUSIC.glob("*.mp3"))
    todo = [m for m in mp3s if args.force or args.names or not m.with_suffix(".viz").exists()
            or m.with_suffix(".viz").stat().st_mtime < m.stat().st_mtime]
    style = styles([m.stem for m in todo])
    for mp3 in todo:
        data, times, force, p, dur = analyse(mp3, style.get(mp3.stem))
        head = b"CRHV" + struct.pack("<BBBBII", 2, FPS, BANDS, 0, len(data), len(times))
        head += bytes([byte(p["energy"]), byte(p["hop"]), byte(p["sharp"]), byte(p["squash"]),
                       byte(p["sway"]), p["per_sway"], int(min(255, round(p["bpm"]))), 0])
        body = data.tobytes() + times.astype("<f4").tobytes() + bytes(byte(f) for f in force)
        viz = mp3.with_suffix(".viz")
        viz.write_bytes(head + body)
        tag = "—" if p["tag"] is None else f"{p['tag']:.2f}"
        print(f"{mp3.stem:<24} энергия {p['energy']:.2f} (промт {tag}, звук {p['sound']:.2f}: "
              f"ударные {p['perc']:.2f}, атак {p['attacks']:.1f}/с)  {p['bpm']:.0f} BPM, "
              f"качок раз в {p['per_sway']} д.  {len(times)} долей, {viz.stat().st_size // 1024} КБ")


if __name__ == "__main__":
    sys.exit(main())
