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

Запускать после правки games.js (это делает и workflow «Разметка для
поисковиков»):  python tools/seo.py
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


def phrases(game):
    """Как ищут перевод люди: «русификатор X», «X на русском» и т. п."""
    names = [game["title"]] + list(game.get("aliases") or [])
    out = []
    for n in names[:3]:
        out += [f"русификатор {n}", f"{n} на русском", f"{n} русский язык"]
    out += [f"{game['title']} перевод", f"{game['title']} russian"]
    return out


def jsonld(games):
    items = []
    for i, g in enumerate(games, 1):
        app = {
            "@type": "SoftwareApplication",
            "name": f"Русификатор {g['title']}",
            "alternateName": [f"{a} русификатор" for a in g.get("aliases") or []],
            "description": g.get("summary", ""),
            "applicationCategory": "GameApplication",
            "operatingSystem": "Windows",
            "inLanguage": "ru",
            "url": f"{SITE}#{g['slug']}",
            "image": SITE + g["banner"] if g.get("banner") else None,
            "softwareVersion": g.get("version"),
            "fileSize": g.get("install_size"),
            "downloadUrl": f"{REPO}/releases",
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
        items.append({"@type": "ListItem", "position": i, "item": clean(app)})
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
        out.append(f'      <li id="{e(g["slug"])}"><h2>Русификатор {e(g["title"])}</h2>')
        if also:
            out.append(f"        <p>Ещё называют: {e(also)}.</p>")
        out.append(f'        <p>{e(g.get("summary", ""))}</p>')
        links = [f'<a href="{REPO}/releases">Скачать русификатор {e(g["title"])}</a>']
        if steam:
            links.append(f'<a href="{e(steam)}" rel="noopener">{e(g["title"])} в Steam</a>')
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


def sitemap(catalog):
    day = catalog.get("updated") or date.today().isoformat()
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f"  <url><loc>{SITE}</loc><lastmod>{day}</lastmod>"
            "<changefreq>weekly</changefreq></url>\n"
            "</urlset>\n")


def main():
    catalog = load_catalog()
    games = released(catalog)
    page = DOCS / "index.html"
    text = page.read_text(encoding="utf-8")
    text = replace(text, "seo:head", head_block(games),
                   '<link rel="icon" type="image/png" href="assets/favicon.png">', keep=True)
    text = replace(text, "seo:list", list_block(games),
                   '    <p class="empty">Каталог загружается…</p>')
    page.write_text(text, encoding="utf-8", newline="\n")
    (DOCS / "sitemap.xml").write_text(sitemap(catalog), encoding="utf-8", newline="\n")
    print(f"seo: {len(games)} игр в разметке")


if __name__ == "__main__":
    main()
