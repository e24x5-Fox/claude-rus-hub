"""Список донатеров для каталога — из GitHub Actions, по расписанию.

У GitHub Pages нет сервера, а API DonationAlerts требует ключ, которому на
открытой странице не место. Поэтому ключ живёт в секрете репозитория
DA_TOKEN, а страница получает готовую выжимку в docs/donors.js: ник, общая
сумма и последнее сообщение, без дат. Донаты одного человека складываются в
одну строку.

Сообщение пишет кто угодно, а показывается оно на сайте, поэтому ссылки из
него вырезаются, длина обрезается, а ники из tools/donors_hide.txt остаются
в списке без сообщения. Голосовые сообщения не показываются: текста у них нет.

Ключа нет — скрипт ничего не трогает и выходит без ошибки: тогда donors.js
можно вести руками, в том же формате.

    python tools/donors_snapshot.py      пересобрать docs/donors.js

Ключ получается один раз, на своей машине: tools/donors_token.py.
"""
import os, re, sys, json, datetime, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "donors.js")
HIDE = os.path.join(ROOT, "tools", "donors_hide.txt")
API = "https://www.donationalerts.com/api/v1/alerts/donations"
ANON = "Аноним"
MSG_MAX = 200
LINK = re.compile(r"(https?://|www\.)\S+|\b[\w-]+\.(ru|com|net|org|io|gg|me|tv|su|рф|xyz|ly|to)(/\S*)?\b", re.I)

# Донаты раньше этого дня пришли со стримов на Twitch, а не за переводы:
# откуда донат, DonationAlerts не сообщает, поэтому граница — по дате.
# 2026-09-20 — первый релиз каталога, dragnwash-v1.0.
SINCE = "2026-09-20"

HEADER = """/* Донатеры для виджета слева: пишет tools/donors_snapshot.py из GitHub
   Actions по списку донатов DonationAlerts. Ник, сумма и последнее сообщение.
   Без ключа DA_TOKEN скрипт файл не трогает — тогда его можно вести руками. */
"""


def fetch(token):
    out, page = [], 1
    while True:
        req = urllib.request.Request(API + "?page=%d" % page, headers={
            "Authorization": "Bearer " + token,
            "User-Agent": "claude-rus-hub-donors"})
        with urllib.request.urlopen(req, timeout=30) as r:
            box = json.load(r)
        out.extend(box.get("data") or [])
        meta = box.get("meta") or {}
        if page >= int(meta.get("last_page") or 1):
            return out
        page += 1


def amount_of(d):
    """Сумма в основной валюте аккаунта, если API её дал, иначе как пришла."""
    if d.get("amount_in_user_currency") is not None:
        return float(d["amount_in_user_currency"]), None
    return float(d.get("amount") or 0), d.get("currency")


def hidden():
    """Ники, чьи сообщения не показывать: по одному в строке, # — комментарий."""
    if not os.path.isfile(HIDE):
        return set()
    out = set()
    for line in open(HIDE, encoding="utf-8"):
        line = line.split("#", 1)[0].strip()
        if line:
            out.add(line.lower())
    return out


def clean(text):
    """Текст сообщения для сайта: без ссылок, в одну строку, не длиннее MSG_MAX."""
    text = LINK.sub("", text or "")
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > MSG_MAX:
        text = text[:MSG_MAX - 1].rstrip() + "…"
    return text


def build(donations, hide):
    main_cur = "RUB"
    rows = {}
    # от старых к новым: у каждого остаётся последнее непустое сообщение
    for d in sorted(donations, key=lambda d: d.get("created_at") or ""):
        name = (d.get("username") or "").strip() or ANON
        value, cur = amount_of(d)
        cur = cur or main_cur
        key = (name.lower(), cur)
        row = rows.setdefault(key, {"name": name, "amount": 0.0, "currency": cur})
        row["amount"] += value
        if d.get("message_type", "text") == "text" and name.lower() not in hide:
            msg = clean(d.get("message"))
            if msg:
                row["message"] = msg

    donors = sorted(rows.values(), key=lambda r: -r["amount"])
    for r in donors:
        r["amount"] = round(r["amount"], 2)
        if r["amount"] == int(r["amount"]):
            r["amount"] = int(r["amount"])
    return donors


def main():
    token = os.environ.get("DA_TOKEN", "").strip()
    if not token:
        print("DA_TOKEN не задан — donors.js не трогаю")
        return
    try:
        donations = fetch(token)
    except urllib.error.HTTPError as e:
        # 401 — ключ истёк или отозван: список остаётся прежним, а не пустым
        raise SystemExit("DonationAlerts ответил %d: %s" % (e.code, e.read()[:200]))

    if "--inspect" in sys.argv:
        # лог Actions у открытого репозитория виден всем: ники и тексты не печатаем
        keys = sorted({k for d in donations for k in d})
        print("поля:", ", ".join(keys))
        for d in donations:
            print({k: v for k, v in d.items() if k not in ("username", "message", "recipient_name")})
        return

    donations = [d for d in donations if (d.get("created_at") or "") >= SINCE]

    donors = build(donations, hidden())

    data = {"updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
            "donors": donors}
    text = HEADER + "window.CRH_DONORS = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n"

    old = open(OUT, encoding="utf-8").read() if os.path.isfile(OUT) else ""
    # время обновления само по себе не повод для коммита
    if old.split('"donors"', 1)[-1] == text.split('"donors"', 1)[-1]:
        print("без изменений: %d донатеров" % len(donors))
        return
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    print("записано: %d донатеров, %d донатов" % (len(donors), len(donations)))


if __name__ == "__main__":
    main()
