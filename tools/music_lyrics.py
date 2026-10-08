"""Слова песен с таймингом: Suno → docs/music/<имя>.lyr (fox-lyrics.js).

На сцене (десять нажатий на лисёнка, fox-stage.js) слова появляются в тот
момент, когда их поют. Момент каждого слова считает сам Suno — тот же,
по которому он подсвечивает текст у себя на сайте, — и сюда он попадает так:

    python tools/music_lyrics.py --fetch    взять тайминг у Suno (нужен вход)
    python tools/music_lyrics.py            из кеша — в docs/music/*.lyr

Тайминг (api/gen/<id>/aligned_lyrics/v2/) Suno отдаёт только вошедшему, а
токен у страницы suno.com спрятан внутри её кода. Поэтому --fetch не берёт
токен вовсе: в отладочном браузере (Edge с профилем RuGuideEdge, порт 9222 —
тот же, что для руководств Steam) открыта вкладка suno.com с выполненным
входом; скрипт открывает в ней страницу песни, ловит запрос, который
страница сама шлёт за комментариями, и подменяет в нём адрес на адрес
тайминга. Запрос уходит со входом страницы, а наружу выходит только ответ.
Первый запрос Suno иногда отдаёт пустым — считает тайминг впервые; второй
проход добирает такие песни.

Ответ кешируется в tools/suno_lyrics.json (только слова и время) —
перечитывать Suno без надобности не нужно, и .lyr пересобираются без сети.

Формат .lyr — JSON: {"w": [[начало, конец, "слово", конец строки 0/1], …]},
время в секундах записи. Пометки Suno в квадратных и круглых скобках
([Intro], (Vinyl crackle…)) выкинуты: их не поют, а Suno ставит им время
впритык к соседним словам.
"""

import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MUSIC = ROOT / "docs" / "music"
CACHE = Path(__file__).resolve().parent / "suno_lyrics.json"
PORT = 9222
# на машине владельца стоит HTTP_PROXY, и без этого к 127.0.0.1 ходили бы через него
os.environ["NO_PROXY"] = os.environ["no_proxy"] = "127.0.0.1,localhost"

for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")


def tracks():
    """(file, suno) из docs/music.js — список треков там один на всё."""
    src = (ROOT / "docs" / "music.js").read_text(encoding="utf-8")
    return re.findall(r"file:\s*'([^']+)',\s*suno:\s*'([^']+)'", src)


def load_cache():
    try:
        return json.loads(CACHE.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}


# ── --fetch: тайминг у Suno через вошедшую вкладку ────────────────────────────

def fetch(want):
    import websocket   # websocket-client, как у tools/steam_guide.py мастерской
    no_proxy = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    tabs = json.load(no_proxy.open("http://127.0.0.1:%d/json/list" % PORT))
    tab = next((t for t in tabs if t["type"] == "page" and "suno.com" in t["url"]), None)
    if not tab:
        raise SystemExit("в отладочном браузере нет вкладки suno.com — откройте её и войдите")
    ws = websocket.create_connection(tab["webSocketDebuggerUrl"], suppress_origin=True)
    n = [0]

    def call(method, **params):
        n[0] += 1
        ws.send(json.dumps({"id": n[0], "method": method, "params": params}))
        return n[0]

    def answer(i):
        ws.settimeout(10)
        while True:
            r = json.loads(ws.recv())
            if r.get("id") == i:
                return r

    call("Network.enable")
    call("Fetch.enable", patterns=[{"urlPattern": "*/api/gen/*/comments*", "requestStage": "Request"}])
    got = {}
    try:
        for name, sid in want:
            call("Page.navigate", url="https://suno.com/song/" + sid)
            ws.settimeout(1)
            t0, rid, words = time.time(), None, None
            while time.time() - t0 < 25 and words is None:
                try:
                    r = json.loads(ws.recv())
                except Exception:
                    continue
                m = r.get("method")
                if m == "Fetch.requestPaused":
                    p = r["params"]
                    if sid in p["request"]["url"] and rid is None:
                        call("Fetch.continueRequest", requestId=p["requestId"],
                             url="https://studio-api-prod.suno.com/api/gen/%s/aligned_lyrics/v2/" % sid)
                        rid = p.get("networkId")
                    else:
                        call("Fetch.continueRequest", requestId=p["requestId"])
                elif m == "Network.loadingFinished" and rid and r["params"]["requestId"] == rid:
                    body = answer(call("Network.getResponseBody", requestId=rid)).get("result", {}).get("body", "")
                    try:
                        words = json.loads(body).get("aligned_words") or []
                    except ValueError:
                        words = []
                    ws.settimeout(1)
            if words:
                got[name] = [{"word": w["word"], "start_s": w["start_s"], "end_s": w["end_s"]} for w in words]
            print("%-24s %s" % (name, "%d слов" % len(words) if words else "нет тайминга"))
    finally:
        call("Fetch.disable")
        # страница песни сама включает трек — в браузере владельца он не нужен
        call("Runtime.evaluate", expression="document.querySelectorAll('audio,video').forEach(a=>a.pause())")
        ws.close()
    return got


# ── сборка .lyr ───────────────────────────────────────────────────────────────

def clean(words):
    """Слова Suno → [[t0, t1, текст, конец строки]] без пометок в скобках.

    У Suno «слово» — кусок исходного текста вместе с пробелами и переводами
    строк, и пометка бывает приклеена к слову («услышит.[»). Поэтому текст
    склеивается целиком с временем у каждой буквы, скобки вырезаются, и
    только потом режется на слова.
    """
    chars = []
    for w in words:
        for ch in w["word"]:
            chars.append((ch, w["start_s"], w["end_s"]))
    text = "".join(c[0] for c in chars)
    keep = [True] * len(text)
    for m in re.finditer(r"\[[^\]]*\]|\([^)]*\)", text):
        for i in range(m.start(), m.end()):
            keep[i] = False

    out, cur = [], None
    for i, (ch, t0, t1) in enumerate(chars):
        if not keep[i]:
            ch = " "
        if ch.isspace():
            if cur:
                out.append(cur)
                cur = None
            if ch == "\n" and out:
                out[-1][3] = 1
            continue
        if cur is None:
            cur = [t0, t1, "", 0]
        cur[1] = t1
        cur[2] += ch
    if cur:
        out.append(cur)

    # «—» и прочее без букв — не слово, а часть соседнего
    words = []
    for w in out:
        if words and not re.search(r"\w", w[2]):
            words[-1][2] += " " + w[2]
            words[-1][1] = max(words[-1][1], w[1])
            words[-1][3] |= w[3]
        else:
            words.append(w)

    # Слово «висит» дольше 8 с — Suno растянул на проигрыш его конец (к нему
    # приклеилась пометка, «услышит.[Rising…]»): начало верное, конец — нет.
    # Если же следом идёт то же самое, это повтор, который Suno привязал ко
    # вступлению целиком (первая строка Bezlikiy), и он лишний.
    res = []
    for i, w in enumerate(words):
        if w[1] - w[0] > 8:
            nxt = words[i + 1] if i + 1 < len(words) else None
            if nxt and nxt[2] == w[2]:
                continue
            w[1] = w[0] + 1.5
        res.append([round(w[0], 3), round(w[1], 3), w[2], w[3]])
    return res


def build(cache):
    for name, _ in tracks():
        path = MUSIC / (name + ".lyr")
        words = clean(cache[name]) if name in cache else []
        if not words:
            if path.exists():
                path.unlink()
            continue
        path.write_text(json.dumps({"w": words}, ensure_ascii=False, separators=(",", ":")),
                        encoding="utf-8")
        print("%-24s %3d слов → %s" % (name, len(words), path.name))


def main():
    cache = load_cache()
    if "--fetch" in sys.argv:
        want = tracks()
        for _ in range(2):
            got = fetch(want)
            cache.update(got)
            want = [t for t in want if t[0] not in got]
            if not want:
                break
        CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
    build(cache)


if __name__ == "__main__":
    main()
