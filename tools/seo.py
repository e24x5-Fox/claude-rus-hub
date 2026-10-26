"""Разметка для поисковиков: из docs/games.js в docs/index.html и docs/sitemap.xml.

Карточки каталога рисует JavaScript, а без него на странице одна строка
«Каталог загружается…» — поисковику, который скрипты не исполняет или
исполняет не сразу, индексировать нечего. Поэтому сюда же, в HTML, кладутся:

- в <head> между <!-- seo:head --> и <!-- /seo:head -->: ключевые фразы,
  канонический адрес, картинка для превью и JSON-LD (schema.org) — список
  русификаторов с названием игры, версией, ссылкой на Steam;
- в #catalog между <!-- seo:list --> и <!-- /seo:list -->: обычный список
  переводов со ссылками. Скрипт страницы очищает #catalog при отрисовке, так
  что люди видят карточки, а без JavaScript — этот список. Содержание то же
  самое, что в карточках: прятать от людей текст «только для роботов»
  поисковики считают обманом и за это понижают, поэтому так не делаем.

Ещё у каждой готовой игры своя страница docs/<слаг>/index.html: копия главной
с <base href="../">, своими заголовком, описанием, картинкой превью и
window.CRH_FOCUS — на странице только карточка игры, а колонка справа считает
скачивания и посещения этой игры (side.js). Руками их не
править: переписываются при каждом запуске.

Запускать после правки games.js или index.html (это делает и workflow
«Разметка для поисковиков»):  python tools/seo.py
"""

import html
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
SITE = "https://e24x5-fox.github.io/claude-rus-hub/"
REPO = "https://github.com/e24x5-Fox/claude-rus-hub"


def load_catalog():
    text = (DOCS / "games.js").read_text(encoding="utf-8")
    return json.loads(text[text.index("{"):text.rindex("}") + 1])


def released(catalog):
    return [g for g in catalog["games"] if g.get("status") == "released"]


def is_mod(game):
    """Вкладка «Модификации»: мод меняет игру, а не текст — и называется иначе."""
    return game.get("kind") == "mod"


def what(game):
    return "Мод" if is_mod(game) else "Русификатор"


def word(game):
    """Как назвать в заголовке страницы игры."""
    return {"mod": "Мод", "furry": "Фуривизатор"}.get(game.get("kind"), "Русификатор")


def page_url(game):
    return f"{SITE}{game['slug']}/"


def phrases(game):
    """Как ищут перевод люди: «русификатор X», «X на русском» и т. п."""
    names = [game["title"]] + list(game.get("aliases") or [])
    out = []
    if is_mod(game):
        for n in names[:3]:
            out += [f"{n} мод", f"{n} читы", f"{n} noclip"]
        return out
    for n in names[:3]:
        out += [f"русификатор {n}", f"{n} на русском", f"{n} русский язык"]
    out += [f"{game['title']} перевод", f"{game['title']} russian"]
    return out


def app_ld(g):
    app = {
        "@type": "SoftwareApplication",
        "name": f"{what(g)} {g['title']}",
        "alternateName": [f"{a} {what(g).lower()}" for a in g.get("aliases") or []],
        "description": g.get("summary", ""),
        "applicationCategory": "GameApplication",
        "operatingSystem": "Windows",
        "inLanguage": "ru",
        "url": page_url(g),
        "image": SITE + g["banner"] if g.get("banner") else None,
        "softwareVersion": g.get("version"),
        "fileSize": g.get("install_size"),
        "downloadUrl": (g.get("links") or {}).get("mod") or f"{REPO}/releases",
        "isAccessibleForFree": True,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "RUB"},
        "about": {
            "@type": "VideoGame",
            "name": g["title"],
            "gamePlatform": "PC",
            "sameAs": (g.get("links") or {}).get("steam") or None,
        },
        "keywords": ", ".join(phrases(g)),
    }
    if g.get("adult"):
        app["contentRating"] = "18+"
    return clean(app)


def jsonld(games):
    items = [{"@type": "ListItem", "position": i, "item": app_ld(g)}
             for i, g in enumerate(games, 1)]
    return [
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Русификаторы с Клодом",
            "url": SITE,
            "inLanguage": "ru",
        },
        {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Русификаторы игр",
            "itemListElement": items,
        },
    ]


def clean(obj):
    """Пустые поля из JSON-LD убираются: валидаторы ругаются на null."""
    if isinstance(obj, dict):
        return {k: clean(v) for k, v in obj.items() if v not in (None, "", [], {})}
    return obj


def head_block(games):
    titles = ", ".join(g["title"] for g in games)
    keywords = ["русификатор", "русификаторы игр", "перевод игр на русский",
                "русский язык для игр Steam"]
    for g in games:
        keywords += phrases(g)[:3]
    e = html.escape
    lines = [
        "<!-- seo:head — пишет tools/seo.py из games.js, руками не править -->",
        f'<meta name="keywords" content="{e(", ".join(keywords))}">',
        '<meta name="robots" content="index, follow">',
        # Список в #catalog нужен поисковику и тем, у кого нет JavaScript; у
        # остальных он мелькал до отрисовки карточек. Класс ставится до первой
        # отрисовки, и CSS прячет список сразу (site.css, .js .seo-list).
        "<script>document.documentElement.className += ' js';</script>",
        f'<link rel="canonical" href="{SITE}">',
        f'<meta property="og:url" content="{SITE}">',
        f'<meta property="og:image" content="{SITE}assets/mascot-wave.png">',
        '<meta property="og:locale" content="ru_RU">',
        '<meta name="twitter:card" content="summary">',
        f'<meta name="twitter:title" content="Русификаторы: {e(titles)}">',
        '<script type="application/ld+json">',
        json.dumps(jsonld(games), ensure_ascii=False, indent=1).replace("</", "<\\/"),
        "</script>",
        "<!-- /seo:head -->",
    ]
    return "\n".join(lines)


def list_block(games):
    e = html.escape
    out = ["<!-- seo:list — пишет tools/seo.py; скрипт страницы заменяет это карточками -->",
           '    <p class="empty">Каталог загружается…</p>',
           '    <ul class="seo-list">']
    for g in games:
        steam = (g.get("links") or {}).get("steam")
        also = ", ".join(g.get("aliases") or [])
        out.append(f'      <li id="{e(g["slug"])}"><h2>{what(g)} {e(g["title"])}</h2>')
        if also:
            out.append(f"        <p>Ещё называют: {e(also)}.</p>")
        out.append(f'        <p>{e(g.get("summary", ""))}</p>')
        mod = (g.get("links") or {}).get("mod")
        links = [f'<a href="{e(mod)}" rel="noopener">Мод {e(g["title"])} на Thunderstore</a>' if mod
                 else f'<a href="{REPO}/releases">Скачать {what(g).lower()} {e(g["title"])}</a>']
        if steam:
            links.append(f'<a href="{e(steam)}" rel="noopener">{e(g["title"])} в Steam</a>')
        links.insert(0, f'<a href="{e(g["slug"])}/">{word(g)} {e(g["title"])}: страница перевода</a>')
        out.append("        <p>" + " · ".join(links) + "</p></li>")
    out += ["    </ul>", "    <!-- /seo:list -->"]
    return "\n".join(out)


def replace(text, name, block, anchor, keep=False):
    """Подменяет блок между метками; если меток ещё нет — ставит на место anchor
    (или следом за ним, если keep)."""
    pat = re.compile(rf"<!-- {name}\b.*?<!-- /{name} -->", re.S)
    if pat.search(text):
        return pat.sub(lambda _: block, text, count=1)
    if anchor not in text:
        raise SystemExit(f"не нашёл, куда вставить {name}: {anchor!r}")
    return text.replace(anchor, anchor + "\n" + block if keep else block, 1)


# Стили и код страницы: к адресу дописывается ?v=<хеш содержимого>, иначе после
# правки браузер держит старый файл из кеша и новая разметка ломается без стилей
# (06.10.2026 значок VirusTotal раздуло на всю карточку). Данные (games.js,
# downloads.js, donors.js, virustotal.js) сюда не входят: их переписывают
# workflow, а GitHub Pages и так кеширует всего на 10 минут.
STAMPED = ("fx.js", "layout.js", "tokens.css", "site.css", "side.js", "donors-widget.js", "music-widget.js", "thanks-widget.js", "top-egg.js", "fox-stage.js", "fox-lyrics.js", "fox-stage-bg.js")


def stamp(text):
    import hashlib
    for name in STAMPED:
        # переводы строк не в счёт: на Windows git отдаёт файл с CRLF, в Actions — с LF,
        # и без этого метки расходились, а index.html переписывался туда-обратно
        digest = hashlib.sha1((DOCS / name).read_bytes().replace(b"\r\n", b"\n")).hexdigest()[:8]
        text = re.sub(r'"%s(\?v=[0-9a-f]*)?"' % re.escape(name),
                      lambda m: f'"{name}?v={digest}"', text)
    return text


def sitemap(catalog, games):
    day = catalog.get("updated") or date.today().isoformat()
    urls = [SITE] + [page_url(g) for g in games]
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + "".join(f"  <url><loc>{u}</loc><lastmod>{day}</lastmod>"
                      "<changefreq>weekly</changefreq></url>\n" for u in urls)
            + "</urlset>\n")


INTRO = ('<p>Из каталога <a href="./">«Русификаторы с Клодом»</a>: переводы игр, собранные '
         'вместе с нейросетью Claude. Установщик сам находит игру, делает резервные копии '
         'и умеет вернуть всё как было.</p>')


def game_page(text, g):
    """Страница игры из готовой главной: подменяются шапка, разметка и заголовок."""
    e = html.escape
    # «Фуривизатор R.E.P.O. — Фуриный» - дважды одно и то же
    title = f"{word(g)} {g['title'].removesuffix(' — Фуриный')}"
    desc = g.get("summary", "")
    short = desc if len(desc) <= 160 else desc[:157].rsplit(" ", 1)[0] + "…"
    image = SITE + g["banner"] if g.get("banner") else f"{SITE}assets/mascot-wave.png"
    ld = json.dumps({"@context": "https://schema.org", **app_ld(g)}, ensure_ascii=False, indent=1)
    head = "\n".join([
        "<!-- seo:head — пишет tools/seo.py из games.js, руками не править -->",
        f'<meta name="keywords" content="{e(", ".join(phrases(g)))}">',
        '<meta name="robots" content="index, follow">',
        # в шапке, до всех скриптов: side.js читает CRH_FOCUS сразу, а поиск и
        # вкладки прячет CSS по классу focus - не мелькают до отрисовки
        f"<script>window.CRH_FOCUS = {json.dumps(g['slug'])};"
        " document.documentElement.className += ' js focus';</script>",
        f'<link rel="canonical" href="{page_url(g)}">',
        f'<meta property="og:url" content="{page_url(g)}">',
        f'<meta property="og:image" content="{image}">',
        '<meta property="og:locale" content="ru_RU">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{e(title)}">',
        '<script type="application/ld+json">',
        ld.replace("</", "<\\/"),
        "</script>",
        "<!-- /seo:head -->",
    ])
    text = replace(text, "seo:head", head, "")
    text = replace(text, "seo:list", list_block([g]), "")
    subs = [
        (r"<title>.*?</title>", f"<title>{e(title)} — скачать | Русификаторы с Клодом</title>"),
        (r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{e(short)}">'),
        (r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{e(title)}">'),
        (r'<meta property="og:description" content="[^"]*">',
         f'<meta property="og:description" content="{e(short)}">'),
        (r'<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="../">'),
        (r'<h1>.*?</h1>\s*<p>.*?</p>', f'<h1>{e(title)}</h1>\n      {INTRO}'),
    ]
    for pat, rep in subs:
        text, n = re.subn(pat, lambda m, rep=rep: rep, text, count=1, flags=re.S)
        if n != 1:
            raise SystemExit(f"страница {g['slug']}: не нашёл {pat!r}")
    return text


def main():
    catalog = load_catalog()
    games = released(catalog)
    page = DOCS / "index.html"
    text = page.read_text(encoding="utf-8")
    text = replace(text, "seo:head", head_block(games),
                   '<link rel="icon" type="image/png" href="assets/favicon.png">', keep=True)
    text = replace(text, "seo:list", list_block(games),
                   '    <p class="empty">Каталог загружается…</p>')
    text = stamp(text)
    page.write_text(text, encoding="utf-8", newline="\n")
    for g in games:
        out = DOCS / g["slug"]
        out.mkdir(exist_ok=True)
        (out / "index.html").write_text(game_page(text, g), encoding="utf-8", newline="\n")
    (DOCS / "sitemap.xml").write_text(sitemap(catalog, games), encoding="utf-8", newline="\n")
    print(f"seo: {len(games)} игр в разметке, у каждой своя страница")


if __name__ == "__main__":
    main()
