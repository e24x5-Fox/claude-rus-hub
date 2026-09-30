"""Список донатеров для каталога — из GitHub Actions, по расписанию.

У GitHub Pages нет сервера, а API DonationAlerts требует ключ, которому на
открытой странице не место. Поэтому ключ живёт в секрете репозитория
DA_TOKEN, а страница получает готовую выжимку в docs/donors.js: ник и общая
сумма, без сообщений и дат. Донаты одного человека складываются в одну строку.

Ключа нет — скрипт ничего не трогает и выходит без ошибки: тогда donors.js
можно вести руками, в том же формате.

    python tools/donors_snapshot.py      пересобрать docs/donors.js

Ключ получается один раз, на своей машине: tools/donors_token.py.
"""
import os, sys, json, datetime, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "donors.js")
API = "https://www.donationalerts.com/api/v1/alerts/donations"
ANON = "Аноним"

HEADER = """/* Донатеры для виджета слева: пишет tools/donors_snapshot.py из GitHub
   Actions по списку донатов DonationAlerts. Ник и сумма, больше ничего.
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

    main_cur = "RUB"
    rows = {}
    for d in donations:
        name = (d.get("username") or "").strip() or ANON
        value, cur = amount_of(d)
        cur = cur or main_cur
        key = (name.lower(), cur)
        row = rows.setdefault(key, {"name": name, "amount": 0.0, "currency": cur})
        row["amount"] += value

    donors = sorted(rows.values(), key=lambda r: -r["amount"])
    for r in donors:
        r["amount"] = round(r["amount"], 2)
        if r["amount"] == int(r["amount"]):
            r["amount"] = int(r["amount"])

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
