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

   engine, lines, words — для колонки статистики справа: из них считаются
   «сколько игр, реплик, слов и движков». lines — переведённые реплики
   диалогов, words — слова английского оригинала в них (у больших игр
   округлено). Движок пишется одинаково у игр одного движка — по нему
   считаются уникальные.

   aliases — как игру назовёт человек, который не помнит написание: по-русски,
   на слух, по сюжету. Поиск смотрит и сюда, поэтому «мойка дракона» находит
   Drag'n Wash. Опечатки и латиницу русскими буквами поиск ловит сам — их
   сюда писать не нужно.
   ───────────────────────────────────────────────────────────────────────── */

window.CATALOG = {
  "_comment": "Каталог переводов. Добавить игру — добавить объект в games[]. Страница строится отсюда, править index.html не нужно. status: released | wip | planned",
  "updated": "2026-09-30",
  "games": [
    {
      "slug": "dragnwash",
      "engine": "Unity",
      "lines": 1839,
      "words": 10333,
      "title": "Drag'n Wash",
      "aliases": ["Драг н Вош", "Драгн Ваш", "мойка дракона", "помыть дракона"],
      "banner": "assets/dragnwash.png",
      "status": "released",
      "version": "1.2.1",
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
      "engine": "Ren'Py",
      "lines": 2007,
      "words": 36000,
      "title": "My Furry Protogen",
      "aliases": ["Мой пушистый протоген", "Протоген"],
      "banner": "assets/protogen.png",
      "status": "released",
      "version": "1.1.1",
      "adult": true,
      "tags": ["Ren'Py", "Windows", "18+"],
      "summary": "Полный перевод визуальной новеллы: 2007 реплик и весь интерфейс, ~36 тыс. слов. Мат и взрослые сцены переведены как в оригинале, без смягчения.",
      "scope": [
        { "label": "Диалоги", "value": "2007 реплик" },
        { "label": "Интерфейс", "value": "373 строки" },
        { "label": "Объём", "value": "~36 тыс. слов" }
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
      "engine": "Ren'Py",
      "lines": 3722,
      "words": 60000,
      "title": "My Furry Protogen 2",
      "aliases": ["Мой пушистый протоген 2", "Протоген 2"],
      "banner": "assets/protogen2.png",
      "status": "released",
      "version": "1.1.1",
      "adult": true,
      "tags": ["Ren'Py", "Windows", "18+"],
      "summary": "Продолжение, вдвое длиннее первой части: 3722 реплики и весь интерфейс, ~60 тыс. слов. Имена, термины и легенда йерианцев сведены с первой частью.",
      "scope": [
        { "label": "Диалоги", "value": "3722 реплики" },
        { "label": "Интерфейс", "value": "389 строк" },
        { "label": "Объём", "value": "~60 тыс. слов" }
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
      "engine": "FNA/MonoGame",
      "lines": 12884,
      "words": 270000,
      "title": "Amorous",
      "aliases": ["Аморус", "Аморэс", "Эморес"],
      "banner": "assets/amorous.png",
      "status": "released",
      "version": "1.0.1",
      "adult": true,
      "tags": ["FNA/MonoGame", "Windows", "18+"],
      "summary": "Самая большая игра каталога: 12 884 реплики, ~270 тыс. слов. Переведены диалоги, интерфейс, титры и 18 картинок с надписями. Кириллицы в шрифтах игры не было ни одного символа — шесть атласов перепечены заново.",
      "scope": [
        { "label": "Диалоги", "value": "12 884 реплики" },
        { "label": "Формы по роду", "value": "3754 ветки" },
        { "label": "Интерфейс", "value": "171 строка" },
        { "label": "Шрифты", "value": "6 атласов" }
      ],
      "install_size": "75 МБ",
      "release": { "tag_prefix": "amorous-", "asset": "Amorous-RU-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "steam": "https://store.steampowered.com/app/778700/",
        "guide": ""
      },
      "note": "Переведено 98 % текста: романтическая линия со сводным братом (214 реплик) и вывески внутри игровых сцен оставлены на английском. Подписи интерфейса вшиты в обфусцированный код, поэтому эта часть привязана к версии игры — установщик сверяет отпечаток и чужую версию не трогает."
    },
    {
      "slug": "bodycam",
      "engine": "Unreal Engine 5",
      "lines": 0,
      "words": 15445,
      "title": "Bodycam",
      "aliases": ["Бодикам", "Боди кам", "нательная камера"],
      "banner": "assets/bodycam.png",
      "status": "released",
      "version": "1.0.1",
      "adult": false,
      "tags": ["Unreal Engine 5", "Windows", "Мультиплеер"],
      "summary": "Перевод интерфейса сетевого шутера: меню, настройки, снаряжение, режимы, серверы, подсказки и описания. Свой русский в игре покрывал меньше четверти строк, да и тот машинный — переведено всё заново.",
      "scope": [
        { "label": "Тексты", "value": "3674 строки" },
        { "label": "Объём", "value": "~15 тыс. слов" },
        { "label": "Таблицы", "value": "Game, MenuSystemPro" },
        { "label": "Из ассетов", "value": "виджеты, скины, предметы" }
      ],
      "install_size": "1 МБ",
      "release": { "tag_prefix": "bodycam-", "asset": "Bodycam-RU-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "steam": "https://store.steampowered.com/app/2406770/",
        "guide": ""
      },
      "note": "Файлы игры не изменяются: перевод — отдельный архив в Paks/~mods, удаление просто стирает его. Надписи на текстурах, видеоролики и новости с сервера остаются на английском. После обновления игры новые строки будут английскими до следующей версии русификатора."
    },
    {
      "slug": "oddremedy",
      "engine": "Unity",
      "lines": 0,
      "words": 5831,
      "title": "Odd Remedy",
      "aliases": ["Одд Ремеди", "Од ремеди", "Странное лекарство"],
      "banner": "assets/oddremedy.png",
      "status": "released",
      "version": "0.2.1",
      "adult": false,
      "tags": ["Unity", "Windows", "Мультиплеер", "Ранний доступ"],
      "summary": "Перевод кооперативной игры в раннем доступе: меню, настройки, управление, подсказки обучения, задания, телефон и надписи в уровнях. Игра стартует сразу по-русски, английский остаётся в списке языков.",
      "scope": [
        { "label": "Словарь игры", "value": "143 ключа" },
        { "label": "Сцены и данные", "value": "1092 строки" },
        { "label": "Код", "value": "514 мест" },
        { "label": "Объём", "value": "~6 тыс. слов" }
      ],
      "install_size": "138 МБ",
      "release": { "tag_prefix": "oddremedy-", "asset": "OddRemedy-RU-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "steam": "https://store.steampowered.com/app/1745680/",
        "guide": ""
      },
      "note": "Версия 0.2 — работает с обновлением игры от 1 октября 2026. Игра в раннем доступе. Меню, настройки и обучение проверены в игре; телефон, магазин и надписи на игровых автоматах глазами ещё не смотрелись. Часть перевода вшита в код игры, поэтому после её обновления установщик эту часть не поставит, пока не выйдет новая версия русификатора."
    },
    {
      "slug": "atlyss",
      "engine": "Unity",
      "lines": 3013,
      "words": 20000,
      "title": "ATLYSS",
      "aliases": ["Атлисс", "Атлис", "Атласс"],
      "banner": "assets/atlyss.png",
      "status": "released",
      "version": "1.0.3",
      "adult": false,
      "tags": ["Unity", "Windows", "Мультиплеер"],
      "summary": "Полный перевод сетевой action-RPG: диалоги всех NPC, задания, предметы, навыки, интерфейс и подсказки, ~20 тыс. слов. Сохранения и игра с англоязычными игроками не ломаются — названия переводятся только на экране.",
      "scope": [
        { "label": "Тексты и диалоги", "value": "1749 строк" },
        { "label": "Названия", "value": "753" },
        { "label": "Код", "value": "511 строк" },
        { "label": "Объём", "value": "~20 тыс. слов" }
      ],
      "install_size": "138 МБ",
      "release": { "tag_prefix": "atlyss-", "asset": "ATLYSS-RU-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "steam": "https://store.steampowered.com/app/2768430/",
        "guide": ""
      },
      "note": "Названия предметов, заданий и монстров в данных игры остаются английскими и переводятся только при показе — поэтому старые сохранения открываются, а в одном лобби можно играть с англоязычными игроками. Часть перевода вшита в код, после обновления игры её нужно будет пересобрать."
    }
  ]
}
;
