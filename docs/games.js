/* ─────────────────────────────────────────────────────────────────────────────
   games.js — каталог переводов. Единственное место, куда вносятся игры:
   добавить объект в games[] — карточка на странице появится сама.
   status: released — готово и лежит в релизах | wip — в работе | planned — в планах

   release.tag_prefix — с чего начинаются теги релизов ИМЕННО ЭТОЙ игры
   (dragnwash-v1.0, dragnwash-v1.1, …). Страница спрашивает у GitHub API самый
   свежий релиз с таким префиксом и сама подставляет ссылку на файл, версию и
   размер. Поэтому после выпуска новой версии здесь ничего менять не нужно —
   достаточно назвать тег правильно. links.download остаётся запасным путём:
   на него страница откатывается, если API недоступен.

   Почему .js, а не .json: страницу удобно открыть двойным щелчком с диска,
   а fetch() по file:// браузер запрещает. Через <script src> данные приходят
   и локально, и на GitHub Pages одинаково.
   ───────────────────────────────────────────────────────────────────────── */

window.CATALOG = {
  "_comment": "Каталог переводов. Добавить игру — добавить объект в games[]. Страница строится отсюда, править index.html не нужно. status: released | wip | planned",
  "updated": "2026-09-28",
  "games": [
    {
      "slug": "dragnwash",
      "title": "Drag'n Wash",
      "banner": "assets/dragnwash.png",
      "status": "released",
      "version": "1.0",
      "adult": true,
      "tags": ["Unity", "Windows", "18+"],
      "summary": "Полный перевод: диалоги, интерфейс, меню настроек и рисованные таблички в игровом мире. Мат и взрослые шутки сохранены как в оригинале.",
      "scope": [
        { "label": "Диалоги", "value": "1839 реплик" },
        { "label": "Интерфейс", "value": "89 строк" },
        { "label": "Настройки", "value": "36 подписей" },
        { "label": "Текстуры", "value": "87 файлов" }
      ],
      "install_size": "138 МБ",
      "release": { "tag_prefix": "dragnwash-", "asset": "DragNWash-RU-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "steam": "https://store.steampowered.com/app/4739660/",
        "guide": ""
      },
      "note": "Проверено на версии игры под Unity 6000.3.14f1. Установщик сам находит игру в библиотеке Steam и умеет откатывать изменения."
    },
    {
      "slug": "protogen",
      "title": "My Furry Protogen",
      "banner": "assets/protogen.png",
      "status": "released",
      "version": "1.0",
      "adult": true,
      "tags": ["Ren'Py", "Windows", "18+"],
      "summary": "Полный перевод визуальной новеллы: 1821 реплика и весь интерфейс, ~34 тыс. слов. Мат и взрослые сцены переведены как в оригинале, без смягчения.",
      "scope": [
        { "label": "Диалоги", "value": "1821 реплика" },
        { "label": "Интерфейс", "value": "363 строки" },
        { "label": "Объём", "value": "~34 тыс. слов" }
      ],
      "install_size": "2 МБ",
      "release": { "tag_prefix": "protogen-", "asset": "MyFurryProtogen-RU-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "steam": "https://store.steampowered.com/app/2009010/",
        "guide": ""
      },
      "note": "Ren'Py переводится своим механизмом: перевод лежит отдельными файлами, оригиналы игры не трогаются вовсе. Удаление стирает добавленное — от русификатора не остаётся следа."
    },
    {
      "slug": "protogen2",
      "title": "My Furry Protogen 2",
      "banner": "assets/protogen2.png",
      "status": "released",
      "version": "1.0",
      "adult": true,
      "tags": ["Ren'Py", "Windows", "18+"],
      "summary": "Продолжение, вдвое длиннее первой части: 3217 реплик и весь интерфейс, ~52 тыс. слов. Имена, термины и легенда йерианцев сведены с первой частью.",
      "scope": [
        { "label": "Диалоги", "value": "3217 реплик" },
        { "label": "Интерфейс", "value": "368 строк" },
        { "label": "Объём", "value": "~52 тыс. слов" }
      ],
      "install_size": "3 МБ",
      "release": { "tag_prefix": "protogen2-", "asset": "MyFurryProtogen2-RU-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "steam": "https://store.steampowered.com/app/2591910/",
        "guide": ""
      },
      "note": "Ставится и удаляется так же, как первая часть. Оригинальные файлы игры не изменяются."
    },
    {
      "slug": "amorous",
      "title": "Amorous",
      "banner": "",
      "status": "wip",
      "version": "",
      "adult": true,
      "tags": ["FNA/MonoGame", "Windows", "18+"],
      "summary": "В работе. Игра большая: 13 142 реплики, 276 579 слов, а надписи интерфейса вшиты прямо в картинки — их придётся перерисовывать вместе со шрифтами.",
      "scope": [],
      "install_size": "",
      "links": { "download": "", "steam": "", "guide": "" },
      "note": ""
    }
  ]
}
;
