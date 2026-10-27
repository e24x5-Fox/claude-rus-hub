"""Объявление о новом релизе в Discord: #новые-переводы на сервере «Лисья мастерская».

Запускается из .github/workflows/discord-release.yml, когда в репозитории опубликован
релиз. Тег релиза — «<слаг>-v<версия>» (warriorcats-v1.0.1); по слагу выбирается роль
игры, которую участники берут себе в меню «Выбор игр» (ProBot), и упоминается вместе
с ролью «Все обновления» — уведомление приходит только подписчикам.

В объявление идёт раздел «## Что нового …» из описания релиза, а у первой версии,
где его нет, — первый абзац. Ссылка — страница игры в каталоге, не релиз: адрес
релиза устаревает с выходом следующей версии.

    DISCORD_WEBHOOK=... python tools/discord_release.py <тег> <файл с JSON релиза>
    ... --dry     напечатать сообщение, ничего не отправляя
    ... --test    отправить без упоминаний и через 20 секунд удалить (проверка вебхука)

Только стандартная библиотека: в Actions ничего не ставится.
"""
import json
import os
import re
import sys
import time
import urllib.request

CATALOG = "https://e24x5-fox.github.io/claude-rus-hub/"
ALL_UPDATES = "1564237444197523516"          # роль «Все обновления»

# слаг тега → роль игры на сервере (id ролей не меняются при переименовании)
ROLES = {
    "dragnwash":     "1564237374081204264",
    "amorous":       "1564237378258862091",
    "atlyss":        "1564237381924687932",
    "bodycam":       "1564237385414217849",
    "easydelivery":  "1564237389189087262",
    "feedthecups":   "1564237392444129370",
    "kemopop":       "1564237395648319508",
    "lethalcompany": "1564237399196962856",
    "lockdown":      "1564237403193868401",
    "lucidcats":     "1564237407501549588",
    "lucidcheats":   "1564237407501549588",  # мод для Lucid Cats — тем же подписчикам
    "meetcute":      "1564237410630639728",
    "meetcute2":     "1564237414342594560",
    "oddremedy":     "1564237417660022834",
    "protogen":      "1564237421246291978",
    "protogen2":     "1564237425168097341",
    "repo":          "1564237428615549049",
    "tailsandpines": "1564237432118054972",
    "warriorcats":   "1564237436308033606",
    "webfishing":    "1564237440904859658",
}

# свои эмодзи сервера (лис владельца) — боты пишут ими, а не стандартными (28.10.2026);
# id — из GET /guilds/{id}/emojis, вебхуку сервера они доступны без Nitro
PARTY = "<:lis_party:1564535633853288478>"
SQUINT = "<:lis_squint:1564535668602839051>"

# страница игры в каталоге есть не у всех слагов (мод для Lucid Cats живёт на её странице)
PAGES = {"lucidcheats": "lucidcats"}


def whats_new(body):
    """Раздел «## Что нового …» без заголовка; нет его — первый абзац описания."""
    body = (body or "").replace("\r\n", "\n")
    m = re.search(r"^##\s*Что нового[^\n]*\n(.*?)(?=^##\s|\Z)", body, re.M | re.S)
    text = m.group(1) if m else body.strip().split("\n\n")[0]
    text = text.strip()
    # таблицы и картинки в эмбеде Discord не рисуются — выкинуть
    text = "\n".join(l for l in text.split("\n") if not l.lstrip().startswith(("|", "![")))
    if len(text) > 1500:
        text = text[:1500].rsplit("\n", 1)[0].rstrip() + "\n…"
    return text


def message(tag, release, test=False):
    slug = tag.rsplit("-v", 1)[0]
    version = tag.rsplit("-v", 1)[1] if "-v" in tag else ""
    page = CATALOG + PAGES.get(slug, slug) + "/"
    roles = [r for r in (ROLES.get(slug), ALL_UPDATES) if r]
    mention = " ".join("<@&%s>" % r for r in roles)
    name = release.get("name") or tag
    head = PARTY + " Вышла новая версия!" if not test else SQUINT + " Проверка объявлений (без упоминаний)"
    return {
        "content": ("%s %s" % (mention, head)) if not test else head,
        "allowed_mentions": {"parse": [], "roles": [] if test else roles},
        "embeds": [{
            "title": name,
            "url": page,
            "description": whats_new(release.get("body")) + "\n\n**[Скачать на странице каталога](%s)**" % page,
            "color": 0x8B5CF6,
            "thumbnail": {"url": CATALOG + "assets/%s.png" % PAGES.get(slug, slug)},
            "footer": {"text": "версия %s · подписаться на свои игры: «Каналы и роли» вверху списка каналов" % version},
        }],
    }


def post(url, payload, wait=False):
    req = urllib.request.Request(url + ("?wait=true" if wait else ""), method="POST",
                                 data=json.dumps(payload).encode("utf-8"),
                                 headers={"Content-Type": "application/json",
                                          "User-Agent": "claude-rus-hub release notifier"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read() or b"null")


def delete(url, msg_id):
    req = urllib.request.Request("%s/messages/%s" % (url, msg_id), method="DELETE",
                                 headers={"User-Agent": "claude-rus-hub release notifier"})
    urllib.request.urlopen(req, timeout=30).read()


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry, test = "--dry" in sys.argv, "--test" in sys.argv
    if len(args) != 2:
        raise SystemExit(__doc__)
    tag, path = args
    with open(path, encoding="utf-8") as f:
        release = json.load(f)
    payload = message(tag, release, test=test)
    if dry:
        print(json.dumps(payload, ensure_ascii=False, indent=1))
        return
    url = os.environ.get("DISCORD_WEBHOOK", "").strip()
    if not url:
        raise SystemExit("нет DISCORD_WEBHOOK — секрет DISCORD_RELEASES_WEBHOOK в настройках репозитория")
    sent = post(url, payload, wait=True)
    print("отправлено:", sent and sent.get("id"))
    if test and sent:
        time.sleep(20)
        delete(url, sent["id"])
        print("проверочное сообщение удалено")


if __name__ == "__main__":
    for s in (sys.stdout, sys.stderr):
        if hasattr(s, "reconfigure"):
            s.reconfigure(encoding="utf-8", errors="replace")
    main()
