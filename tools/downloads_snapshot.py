"""Снимок счётчиков скачиваний для каталога — раз в сутки, из GitHub Actions.

GitHub хранит у файла релиза только общий download_count, без истории, а
каталогу нужно «популярное за неделю». Поэтому история копится здесь: каждый
запуск дописывает в docs/downloads.js счёт каждой игры на сегодня. Страница
берёт живой счёт из API и вычитает из него снимок недельной давности.

Игры и префиксы тегов берутся из docs/games.js, отдельного списка нет.
Файл — .js, а не .json, по той же причине, что и games.js: страница должна
открываться с диска двойным щелчком.

    python tools/downloads_snapshot.py      дописать снимок за сегодня (UTC)
"""
import os, re, json, datetime, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAMES = os.path.join(ROOT, "docs", "games.js")
OUT = os.path.join(ROOT, "docs", "downloads.js")
API = "https://api.github.com/repos/e24x5-Fox/claude-rus-hub/releases?per_page=100"
KEEP_DAYS = 120


def prefixes():
    """slug → префикс тега, по порядку объектов в games.js."""
    text = open(GAMES, encoding="utf-8").read()
    out = {}
    for block in re.split(r'\n    \{', text)[1:]:
        slug = re.search(r'"slug":\s*"([^"]+)"', block)
        pre = re.search(r'"tag_prefix":\s*"([^"]+)"', block)
        if slug and pre:
            out[slug.group(1)] = pre.group(1)
    return out


def releases():
    req = urllib.request.Request(API, headers={"Accept": "application/vnd.github+json",
                                               "User-Agent": "claude-rus-hub-snapshot"})
    token = os.environ.get("GH_TOKEN")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def load():
    if not os.path.isfile(OUT):
        return {}
    text = open(OUT, encoding="utf-8").read()
    m = re.search(r"window\.CRH_DOWNLOADS\s*=\s*(\{.*\})\s*;", text, re.S)
    return json.loads(m.group(1))["days"] if m else {}


def main():
    rels = [r for r in releases() if not r.get("draft")]
    today = {}
    for slug, pre in prefixes().items():
        today[slug] = sum(a.get("download_count", 0)
                          for r in rels if (r.get("tag_name") or "").startswith(pre)
                          for a in r.get("assets", []))
    days = load()
    day = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    days[day] = today
    days = dict(sorted(days.items())[-KEEP_DAYS:])

    body = json.dumps({"days": days}, ensure_ascii=False, indent=1)
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("/* Счёт скачиваний по дням: пишет tools/downloads_snapshot.py из GitHub\n"
                "   Actions раз в сутки. Руками не править. По нему каталог считает,\n"
                "   какая игра популярнее за последнюю неделю. */\n")
        f.write("window.CRH_DOWNLOADS = " + body + ";\n")
    print(day, today)


if __name__ == "__main__":
    main()
