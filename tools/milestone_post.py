"""Рубежи скачиваний — объявление в Discord, в #булочную, от «Лисьей мастерской».

Счёт — тот же, что в колонке каталога (docs/side.js): скачивания всех файлов
всех релизов на GitHub плюс моды Thunderstore из снимка docs/downloads.js.
Рубежи — степени двойки, фраза на каждый — из THANKS в side.js (одно место
на сайт и на сервер; нет фразы — «Ещё одно удвоение», как и на сайте).

Последний объявленный рубеж — tools/milestones_state.json, его коммитит
workflow «Снимок скачиваний». Прошли сразу несколько рубежей — объявляется
старший: два сообщения подряд выглядели бы как сбой.

    python tools/milestone_post.py            проверить и, если пора, объявить
    python tools/milestone_post.py --dry      только показать, что было бы

Адрес вебхука — переменная DISCORD_BAKERY_WEBHOOK (секрет репозитория).
Без него скрипт только печатает и состояние не трогает.
"""
import os, re, sys, json, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIDE = os.path.join(ROOT, "docs", "side.js")
DOWNLOADS = os.path.join(ROOT, "docs", "downloads.js")
STATE = os.path.join(ROOT, "tools", "milestones_state.json")
API = "https://api.github.com/repos/e24x5-Fox/claude-rus-hub/releases?per_page=100&page=%d"
CATALOG = "https://e24x5-fox.github.io/claude-rus-hub/"
AVATAR = CATALOG + "assets/lisya-avatar.png"


def get(url):
    head = {"User-Agent": "claude-rus-hub-milestones", "Accept": "application/vnd.github+json"}
    if os.environ.get("GH_TOKEN"):
        head["Authorization"] = "Bearer " + os.environ["GH_TOKEN"]
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=head), timeout=30))


def total():
    n, page = 0, 1
    while True:
        rels = get(API % page)
        for r in rels:
            if not r.get("draft"):
                n += sum(a.get("download_count", 0) for a in r.get("assets", []))
        if len(rels) < 100:
            break
        page += 1
    text = open(DOWNLOADS, encoding="utf-8").read()
    snap = json.loads(text[text.index("{", text.index("CRH_DOWNLOADS")):text.rindex("}") + 1])
    n += sum(v.get("downloads", 0) for v in snap.get("thunderstore", {}).values())
    return n


def phrases():
    """THANKS из side.js: число -> фраза."""
    text = open(SIDE, encoding="utf-8").read()
    block = text[text.index("var THANKS = {"):]
    block = block[:block.index("};")]
    out = {}
    for m in re.finditer(r"(\d+):\s*'((?:[^'\\]|\\.)*)'", block):
        out[int(m.group(1))] = m.group(2).replace("\\'", "'")
    return out


def num(n):
    return re.sub(r"\B(?=(\d{3})+(?!\d))", " ", str(n))


def main():
    dry = "--dry" in sys.argv
    state = json.load(open(STATE, encoding="utf-8")) if os.path.exists(STATE) else {"announced": 0}
    t = total()
    top = 1
    while top * 2 <= t:
        top *= 2
    print("скачиваний: %d, старший рубеж: %d, объявлен: %d" % (t, top, state["announced"]))
    if top <= state["announced"]:
        return
    text = phrases().get(top) or "Ещё одно удвоение — %s. Спасибо, что вы с нами :3" % num(top)
    msg = "🎉 **%s скачиваний переводов!**\n%s\n\n<%s>" % (num(top), text, CATALOG)
    hook = os.environ.get("DISCORD_BAKERY_WEBHOOK")
    if dry or not hook:
        print("--- было бы отправлено%s ---\n%s" % ("" if hook else " (нет DISCORD_BAKERY_WEBHOOK)", msg))
        return
    body = json.dumps({"content": msg, "username": "Лисья мастерская", "avatar_url": AVATAR,
                       "allowed_mentions": {"parse": []}}).encode()
    urllib.request.urlopen(urllib.request.Request(
        hook + "?wait=true", data=body, headers={"Content-Type": "application/json", "User-Agent": "lisya-masterskaya"}),
        timeout=30).read()
    state["announced"] = top
    with open(STATE, "w", encoding="utf-8", newline="\n") as f:
        json.dump(state, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("объявлено:", top)


if __name__ == "__main__":
    main()
