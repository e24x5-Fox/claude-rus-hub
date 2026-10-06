"""Список донатеров для каталога — из GitHub Actions, по расписанию.

У GitHub Pages нет сервера, а API DonationAlerts требует ключ, которому на
открытой странице не место. Поэтому ключ живёт в секрете репозитория
DA_TOKEN, а страница получает готовую выжимку в docs/donors.js: ник, общая
сумма и последнее сообщение, без дат. Донаты одного человека складываются в
одну строку.

Сообщение пишет кто угодно, а показывается оно на сайте, поэтому ссылки из
него вырезаются, почта заменяется на «[почта скрыта]», длина обрезается, а ники из tools/donors_hide.txt остаются
в списке без сообщения. Голосовые сообщения не показываются: текста у них нет.

Ключа нет — скрипт ничего не трогает и выходит без ошибки: тогда donors.js
можно вести руками, в том же формате.

Запрещённые слова — тот же список, что в «Общих настройках» виджетов
DonationAlerts: скрипт читает его со страницы виджета по токену из секрета
DA_WIDGET_TOKEN (тот, что в ссылке widget/alerts?token=…) и заменяет слова на
***, в сообщениях и в никах. API донатов отдаёт текст как есть, фильтр
DonationAlerts работает только в оповещениях. Список не прочитался — файл
не трогается: лучше вчерашний список, чем мат на сайте.

    python tools/donors_snapshot.py      пересобрать docs/donors.js

Ключ получается один раз, на своей машине: tools/donors_token.py.
"""
import os, re, sys, ssl, json, time, unicodedata, datetime, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "donors.js")
HIDE = os.path.join(ROOT, "tools", "donors_hide.txt")
API = "https://www.donationalerts.com/api/v1/alerts/donations"
ANON = "Аноним"
MSG_MAX = 200
NAME_MAX = 32
# Разворот направления текста (U+202A–202E, U+2066–2069) переворачивает
# строку на странице; прочие управляющие символы ломают вёрстку.
BIDI = set(range(0x202A, 0x202F)) | set(range(0x2066, 0x206A))
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)+", re.I)
LINK = re.compile(r"(https?://|www\.)\S+|\b[\w-]+\.(ru|com|net|org|io|gg|me|tv|su|рф|xyz|ly|to)(/\S*)?\b", re.I)

# Донаты раньше этого дня пришли со стримов на Twitch, а не за переводы:
# откуда донат, DonationAlerts не сообщает, поэтому граница — по дате.
# 2026-09-20 — первый релиз каталога, dragnwash-v1.0.
SINCE = "2026-09-20"

HEADER = """/* Донатеры для виджета слева: пишет tools/donors_snapshot.py из GitHub
   Actions по списку донатов DonationAlerts. Ник, сумма и последнее сообщение.
   Без ключа DA_TOKEN скрипт файл не трогает — тогда его можно вести руками. */
"""


def opened(req, tries=3):
    """urlopen с повтором: DonationAlerts изредка рвёт TLS посреди ответа
    (UNEXPECTED_EOF_WHILE_READING, 01.10.2026), и прогон падал на ровном месте.
    HTTPError не повторяем — это ответ сервера, а не обрыв."""
    for n in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError:
            raise
        except (urllib.error.URLError, ConnectionError, TimeoutError, ssl.SSLError):
            if n == tries - 1:
                raise
            time.sleep(10 * (n + 1))


def fetch(token):
    out, page = [], 1
    while True:
        req = urllib.request.Request(API + "?page=%d" % page, headers={
            "Authorization": "Bearer " + token,
            "User-Agent": "claude-rus-hub-donors"})
        box = json.loads(opened(req))
        out.extend(box.get("data") or [])
        meta = box.get("meta") or {}
        if page >= int(meta.get("last_page") or 1):
            return out
        page += 1


WIDGET = "https://www.donationalerts.com/widget/lastdonations?token="
BAD = None   # регулярка запрещённых слов, собирается в main()


def blacklist(widget_token):
    """Запрещённые слова из общих настроек виджетов DonationAlerts."""
    req = urllib.request.Request(WIDGET + widget_token, headers={"User-Agent": "claude-rus-hub-donors"})
    html = opened(req).decode("utf-8")
    m = re.search(r"handleGeneralWidgetSettings\('(.*?)'\);", html, re.S)
    if not m:
        raise ValueError("на странице виджета нет настроек")
    # строка JS в одинарных кавычках: снимаем экранирование, не ломая кириллицу
    raw = m.group(1).encode("utf-8").decode("unicode_escape").encode("latin-1").decode("utf-8")
    words = json.loads(raw).get("black_list_words") or ""
    if isinstance(words, list):
        words = " ".join(words)
    return [w for w in re.split(r"[\s,;]+", words) if w]


def bad_pattern(words):
    """Слово целиком, без регистра, е и ё — одно и то же. Целиком — потому что
    иначе «бля» спрятало бы кусок «употребляю»."""
    if not words:
        return None
    alts = sorted({re.escape(w.lower().replace("ё", "е")).replace("е", "[её]") for w in words},
                  key=len, reverse=True)
    return re.compile(r"(?<!\w)(?:" + "|".join(alts) + r")(?!\w)", re.I)


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


def strip_controls(text):
    """Без управляющих символов и разворотов. Управляющие (в том числе перенос
    строки) становятся пробелом, чтобы не склеить слова; ZWJ остаётся — на нём
    держатся составные эмодзи."""
    out = []
    for ch in text:
        cat = unicodedata.category(ch)
        if cat == "Cc":
            out.append(" ")
        elif ord(ch) in BIDI or (cat == "Cf" and ch != "\u200d"):
            continue
        else:
            out.append(ch)
    return "".join(out)


def clean(text, limit=MSG_MAX):
    """Текст сообщения для сайта: без почты и ссылок, в одну строку, не длиннее MSG_MAX.
    Почта — первой: иначе ссылка съест «mail.ru», а «имя@» останется."""
    text = EMAIL.sub("[почта скрыта]", strip_controls(text or ""))
    text = LINK.sub("", text)
    if BAD:
        text = BAD.sub("***", text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > limit:
        text = text[:limit - 1].rstrip() + "…"
    return text


def build(donations, hide):
    main_cur = "RUB"
    rows = {}
    # от старых к новым: у каждого остаётся последнее непустое сообщение
    for d in sorted(donations, key=lambda d: d.get("created_at") or ""):
        # ник у анонимного доната — свободный текст, чистится как сообщение
        name = clean(d.get("username"), NAME_MAX) or ANON
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
    global BAD
    widget = os.environ.get("DA_WIDGET_TOKEN", "").strip()
    if widget:
        try:
            words = blacklist(widget)
        except Exception as e:
            raise SystemExit("Запрещённые слова не прочитались (%s) — donors.js не трогаю" % e)
        BAD = bad_pattern(words)
        print("запрещённых слов: %d" % len(words))   # сами слова в открытый лог не пишем
    else:
        print("DA_WIDGET_TOKEN не задан — запрещённые слова не фильтруются")
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
    body = json.dumps(data, ensure_ascii=False, indent=1)
    # U+2028/2029 — перевод строки для старых движков JS: в строковом литерале ломает файл
    body = body.replace(chr(0x2028), r"\u2028").replace(chr(0x2029), r"\u2029")
    text = HEADER + "window.CRH_DONORS = " + body + ";\n"

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
