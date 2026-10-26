"""Текущая сборка каждой игры в Steam — раз в сутки, из GitHub Actions.

Каталогу нужна плашка «работает с текущей версией игры». Для неё мало знать,
на какой сборке мы проверяли перевод (docs/verified.js, пишет трекер), надо
знать и какая сборка сейчас в Steam. Номер сборки (buildid) ветки public и
время её выкладки отдаёт открытый api.steamcmd.net без входа в Steam.

Игры и их appid берутся из docs/games.js (links.steam), отдельного списка нет.
Steam не ответил по игре — остаётся вчерашняя запись: лучше старое число,
чем жёлтая плашка у всех из-за сбоя.

    python tools/builds_snapshot.py
"""
import os, re, json, datetime, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAMES = os.path.join(ROOT, "docs", "games.js")
OUT = os.path.join(ROOT, "docs", "builds.js")
API = "https://api.steamcmd.net/v1/info/%s"


def appids():
    """slug -> appid из ссылки на магазин, по порядку объектов в games.js."""
    text = open(GAMES, encoding="utf-8").read()
    out = {}
    for block in re.split(r'\n    \{', text)[1:]:
        slug = re.search(r'"slug":\s*"([^"]+)"', block)
        app = re.search(r'"steam":\s*"https://store\.steampowered\.com/app/(\d+)', block)
        if slug and app:
            out[slug.group(1)] = app.group(1)
    return out


def public_build(appid):
    req = urllib.request.Request(API % appid, headers={"User-Agent": "claude-rus-hub-builds"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    branch = data["data"][appid]["depots"]["branches"]["public"]
    return {"build": str(branch["buildid"]), "updated": int(branch.get("timeupdated") or 0)}


def load():
    if not os.path.isfile(OUT):
        return {}
    text = open(OUT, encoding="utf-8").read()
    m = re.search(r"window\.CRH_BUILDS\s*=\s*(\{.*\})\s*;", text, re.S)
    return json.loads(m.group(1)).get("games", {}) if m else {}


def main():
    games = load()
    for slug, appid in appids().items():
        try:
            games[slug] = dict(public_build(appid), appid=appid)
        except Exception as e:                       # сбой одной игры не роняет остальные
            print("steam", slug, appid, e)
    day = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    body = json.dumps({"checked": day, "games": games}, ensure_ascii=False, indent=1)
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("/* Текущая сборка игр в Steam (buildid ветки public и время выкладки):\n"
                "   пишет tools/builds_snapshot.py из GitHub Actions раз в сутки. Руками\n"
                "   не править. С docs/verified.js даёт плашку версии игры. */\n")
        f.write("window.CRH_BUILDS = " + body + ";\n")
    print(day, {s: g["build"] for s, g in games.items()})


if __name__ == "__main__":
    main()
