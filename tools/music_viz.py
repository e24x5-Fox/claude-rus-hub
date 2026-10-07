"""Заранее записанная анимация плеера: docs/music/<имя>.mp3 → docs/music/<имя>.viz.

Страница звук не анализирует — ни AudioContext, ни AnalyserNode. Она берёт
готовые кадры из .viz и показывает тот, что приходится на audio.currentTime.
Поэтому анимация одинаковая у всех, ничего не стоит процессору и сама
замедляется и разгоняется вместе с треком: время в нём — время записи.

Формат (всё little-endian):
    'CRHV'  u8 версия = 1  u8 кадров в секунду  u8 полос  u8 0  u32 кадров
    дальше кадры подряд, в каждом по байту (0…255):
        полосы спектра от баса к верхам, общая громкость, доля «на бит»

Полосы нормированы по самому треку (5-й и 99-й процентиль), а не по всем
трекам сразу: тихая баллада шевелит полосы так же заметно, как фонк. Спад
после удара считается здесь же — быстро вверх, плавно вниз, — и странице
остаётся только интерполировать между кадрами.

    python tools/music_viz.py            # все mp3, у которых нет .viz или он старше
    python tools/music_viz.py --force    # пересчитать всё
    python tools/music_viz.py never      # один трек

Нужны numpy и librosa (в основной Python ничего не ставить — см. CLAUDE.md
мастерской; здесь хватает того, что уже стоит).
"""
import argparse
import struct
import sys
from pathlib import Path

import numpy as np
import librosa

MUSIC = Path(__file__).resolve().parent.parent / "docs" / "music"
SR = 22050
FPS = 25
BANDS = 8
FMIN, FMAX = 40.0, 11000.0
RELEASE_S = 0.18      # за сколько секунд полоса спадает примерно втрое
BEAT_S = 0.22         # сколько длится вспышка «на бит»


def norm(x, lo=5, hi=99):
    a, b = np.percentile(x, [lo, hi])
    return np.clip((x - a) / max(b - a, 1e-6), 0, 1)


def release(x, fps):
    """Быстро вверх, плавно вниз: как стрелка на пульте."""
    k = np.exp(-1.0 / (fps * RELEASE_S))
    y = np.empty_like(x)
    acc = np.zeros(x.shape[1:]) if x.ndim > 1 else 0.0
    for i in range(len(x)):
        acc = np.maximum(x[i], acc * k)
        y[i] = acc
    return y


def analyse(mp3):
    y, sr = librosa.load(mp3, sr=SR, mono=True)
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
    for b in beats:
        # сильная доля ярче слабой: высота вспышки — сила атаки в этом месте
        h = 0.45 + 0.55 * strength[max(0, b - 1):b + 2].max()
        seg = pulse[b:b + len(decay)]
        np.maximum(seg, h * decay[:len(seg)], out=seg)

    n = min(frames, len(bands), len(level), len(pulse))
    out = np.concatenate([bands[:n], level[:n, None], pulse[:n, None]], axis=1)
    return np.round(np.clip(out, 0, 1) * 255).astype(np.uint8), len(beats), len(y) / SR


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*", help="имена треков без .mp3; без них — все")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    mp3s = [MUSIC / f"{n}.mp3" for n in args.names] if args.names else sorted(MUSIC.glob("*.mp3"))
    for mp3 in mp3s:
        viz = mp3.with_suffix(".viz")
        if not args.force and not args.names and viz.exists() and viz.stat().st_mtime >= mp3.stat().st_mtime:
            continue
        data, nbeats, dur = analyse(mp3)
        head = b"CRHV" + struct.pack("<BBBBI", 1, FPS, BANDS, 0, len(data))
        viz.write_bytes(head + data.tobytes())
        print(f"{mp3.stem}: {dur:.0f} с, {len(data)} кадров, {nbeats} долей, {viz.stat().st_size // 1024} КБ")


if __name__ == "__main__":
    sys.exit(main())
