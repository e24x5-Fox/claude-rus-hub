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

   kind — вкладка каталога: "furry" — фуривизатор (шуточная переделка
   текста), без поля — обычный русификатор.

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
    },
    {
      "slug": "lucidcats",
      "engine": "Unity",
      "lines": 594,
      "words": 900,
      "title": "Lucid Cats",
      "aliases": ["Люсид кэтс", "Лусид кетс", "Осознанные коты", "Коты"],
      "banner": "assets/lucidcats.png",
      "status": "released",
      "version": "1.2",
      "adult": false,
      "tags": ["Unity", "Windows", "Мультиплеер", "Хоррор"],
      "summary": "Перевод кооперативного хоррора: меню, настройки, статистика, подсказки, магазин улучшений, задания на ночь, комнаты, ценности, ноутбук, итоги ночи, плакаты и вывески. Задания, достижения и игра с англоязычными игроками не ломаются.",
      "scope": [
        { "label": "Сцены и данные", "value": "515 мест" },
        { "label": "Код", "value": "72 места" },
        { "label": "Текстуры", "value": "7 надписей" },
        { "label": "Названия на экране", "value": "26" },
        { "label": "Объём", "value": "~900 слов" }
      ],
      "install_size": "131 МБ",
      "release": { "tag_prefix": "lucidcats-", "asset": "LucidCats-RU-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "steam": "https://store.steampowered.com/app/4778540/",
        "guide": ""
      },
      "note": "Собрано под версию игры 2.4 (обновление 08.10.2026: улучшения ноутбука — вспышка, приманка, интерком, трекер выхода). Названия ценностей в данных остаются английскими и переводятся только на экране — по ним игра засчитывает задания и выдаёт достижения. Меню, настройки, статистика и пауза проверены в игре; сами ночи вживую не проходились. Часть перевода вшита в код игры, поэтому после её обновления установщик эту часть не поставит, пока не выйдет новая версия русификатора."
        },
    {
      "slug": "kemopop",
      "engine": "Godot",
      "lines": 1826,
      "words": 13500,
      "title": "Kemopop!",
      "aliases": ["Кемопоп", "Кемопоп!", "Кемо поп"],
      "banner": "assets/kemopop.png",
      "status": "released",
      "version": "1.0",
      "adult": true,
      "tags": ["Godot", "Windows", "18+"],
      "summary": "Полный перевод головоломки-кафе с мальчиками-официантами: интерфейс, биографии, реплики, сценки, обучение и достижения, ~13,5 тыс. слов. Русский выбирается в настройках игры, со своим флагом. Кириллица дорисована прямо в фирменный шрифт игры.",
      "scope": [
        { "label": "Сценки", "value": "507 реплик" },
        { "label": "Реплики в игре", "value": "281" },
        { "label": "Биографии", "value": "77" },
        { "label": "Шрифт", "value": "52 буквы дорисовано" },
        { "label": "Объём", "value": "~13,5 тыс. слов" }
      ],
      "install_size": "68 МБ",
      "release": { "tag_prefix": "kemopop-", "asset": "Kemopop-RU-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "steam": "https://store.steampowered.com/app/3093590/",
        "guide": ""
      },
      "note": "Собрано под версию игры 2.3.0. Перевод дописывается в архив игры, оригинальные данные не меняются, удаление возвращает архив байт в байт. Если игра обновится и установщик откажется ставить перевод — дождитесь новой версии русификатора. Включая дополнения Boys in Hawaii! и Lucky Odyssey!."
    },
    {
      "slug": "meetcute",
      "engine": "Ren'Py",
      "lines": 871,
      "words": 6000,
      "title": "Meet Cute: Cafe",
      "aliases": ["Мит кьют кафе", "Мит Кьют: Кафе", "Милая встреча кафе"],
      "banner": "assets/meetcute.png",
      "status": "released",
      "version": "1.0",
      "adult": true,
      "tags": ["Ren'Py", "Windows", "18+"],
      "summary": "Полный перевод короткой новеллы от авторов My Furry Protogen: герой падает в лужу по дороге на встречу, и отстирать костюм ему помогает официантка Элис. Все диалоги и интерфейс, ~6 тыс. слов.",
      "scope": [
        { "label": "Диалоги", "value": "514 реплик" },
        { "label": "Интерфейс", "value": "357 строк" },
        { "label": "Объём", "value": "~6 тыс. слов" }
      ],
      "install_size": "68 МБ",
      "release": { "tag_prefix": "meetcute-", "asset": "MeetCuteCafe-RU-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "steam": "https://store.steampowered.com/app/1879190/",
        "guide": ""
      },
      "note": "Оригинальные файлы игры не изменяются: перевод лежит отдельными файлами, удаление стирает только их. Обновление игры в Steam перевод не ломает."
    },
    {
      "slug": "meetcute2",
      "engine": "Ren'Py",
      "lines": 944,
      "words": 8000,
      "title": "Meet Cute: Delivery",
      "aliases": ["Мит кьют деливери", "Мит Кьют: Доставка", "Милая встреча доставка"],
      "banner": "assets/meetcute2.png",
      "status": "released",
      "version": "1.0",
      "adult": true,
      "tags": ["Ren'Py", "Windows", "18+"],
      "summary": "Полный перевод второй новеллы серии Meet Cute: курьерша Лиллиан привозит герою телевизор и падает в обморок у его двери. Все диалоги и интерфейс, ~8 тыс. слов.",
      "scope": [
        { "label": "Диалоги", "value": "587 реплик" },
        { "label": "Интерфейс", "value": "357 строк" },
        { "label": "Объём", "value": "~8 тыс. слов" }
      ],
      "install_size": "68 МБ",
      "release": { "tag_prefix": "meetcute2-", "asset": "MeetCuteDelivery-RU-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "steam": "https://store.steampowered.com/app/1897960/",
        "guide": ""
      },
      "note": "Оригинальные файлы игры не изменяются: перевод лежит отдельными файлами, удаление стирает только их. Обновление игры в Steam перевод не ломает."
    },
    {
      "slug": "tailsandpines",
      "engine": "Ren'Py",
      "lines": 932,
      "words": 8600,
      "title": "Tails and Pines",
      "aliases": ["Тейлз энд Пайнс", "Хвосты и сосны", "Tails & Pines"],
      "banner": "assets/tailsandpines.png",
      "status": "released",
      "version": "1.0",
      "adult": true,
      "tags": ["Ren'Py", "Windows", "18+"],
      "summary": "Полный перевод новеллы о двух школьных подругах: официантка Эйприл бросает работу, а на пороге появляется Стейси — теперь знаменитая модель. Все диалоги и интерфейс, ~8,6 тыс. слов.",
      "scope": [
        { "label": "Диалоги", "value": "575 реплик" },
        { "label": "Интерфейс", "value": "357 строк" },
        { "label": "Объём", "value": "~8,6 тыс. слов" }
      ],
      "install_size": "68 МБ",
      "release": { "tag_prefix": "tailsandpines-", "asset": "TailsAndPines-RU-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "steam": "https://store.steampowered.com/app/1772810/",
        "guide": ""
      },
      "note": "Оригинальные файлы игры не изменяются: перевод лежит отдельными файлами, удаление стирает только их. В шрифте игры нет буквы «ё», поэтому в тексте везде «е»."
    },
    {
      "slug": "webfishing",
      "engine": "Godot 3",
      "lines": 2084,
      "words": 6500,
      "title": "WEBFISHING",
      "aliases": ["Вебфишинг", "Веб фишинг", "Webfishing", "веб-рыбалка"],
      "banner": "assets/webfishing.png",
      "status": "released",
      "version": "1.0",
      "adult": false,
      "tags": ["Godot", "Windows", "Мультиплеер"],
      "summary": "Перевод уютной сетевой рыбалки со зверями: рыбы и шутки при поимке, предметы, косметика и титулы, магазины, задания, настройки, лобби и весь интерфейс. Кириллица дорисована прямо в шрифт игры.",
      "scope": [
        { "label": "Строки", "value": "~2080" },
        { "label": "Объём", "value": "~6,5 тыс. слов" },
        { "label": "Косметика", "value": "~380 вещей и титулов" },
        { "label": "Шрифт", "value": "кириллица вшита" }
      ],
      "install_size": "69 МБ",
      "release": { "tag_prefix": "webfishing-", "asset": "WEBFISHING-RU-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "steam": "https://store.steampowered.com/app/3146520/",
        "guide": ""
      },
      "note": "Перевод дописывается в конец webfishing.exe, удаление возвращает файл побайтно. Обновление игры в Steam перезаписывает exe — перевод нужно поставить заново. Сообщения, которые игра рассылает всем в лобби, оставлены английскими. Надписи на текстурах не переведены."
    },
    {
      "slug": "feedthecups",
      "engine": "Godot 3",
      "lines": 2954,
      "words": 22300,
      "title": "Feed the Cups",
      "aliases": ["Фид зе капс", "Фид зэ капс", "Накорми стаканы", "Корми стаканчики", "лавка напитков", "бабл-ти"],
      "banner": "assets/feedthecups.png",
      "status": "released",
      "version": "1.0",
      "adult": false,
      "tags": ["Godot", "Windows", "Кооператив"],
      "summary": "Перевод кооперативного рогалика про лавку напитков: меню и настройки, обучение и подсказки, карточки способностей и демонических контрактов, напитки, оборудование, достижения и реплики. Русский встраивается в родную систему языков игры.",
      "scope": [
        { "label": "Строки", "value": "2954" },
        { "label": "Объём", "value": "~22 тыс. слов" },
        { "label": "Карточки", "value": "все" },
        { "label": "Архив игры", "value": "не меняется" }
      ],
      "install_size": "65 МБ",
      "release": { "tag_prefix": "feedthecups-", "asset": "FeedTheCups-RU-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "steam": "https://store.steampowered.com/app/2336220/",
        "guide": ""
      },
      "note": "Файл перевода кладётся в mods\\translations рядом с игрой, в списке языков включается «Русский»; удаление возвращает всё как было. Язык выбирается в Настройки → Игра → Язык. Названия-термины в описаниях карточек игра не склоняет, поэтому фразы построены вокруг них."
    },
    {
      "slug": "lockdown",
      "kind": "furry",
      "engine": "Unreal Engine 5",
      "lines": 920,
      "words": 2700,
      "title": "LOCKDOWN Protocol — Фуриный",
      "aliases": ["Локдаун протокол", "Локдаун", "Lockdown", "фуривизатор", "фуриный", "фурри"],
      "banner": "assets/lockdown.png",
      "status": "released",
      "version": "1.1",
      "adult": false,
      "tags": ["Unreal", "Windows", "Мультиплеер", "Шуточный"],
      "summary": "Не перевод, а фуривизатор: весь текст игры переписан ласковым фуриным диалектом — уменьшительные даже в меню: «Настроечки», «Назадик», «Лобби-норка». Сотрудники — пушистики, диссиденты — бяки, руки — лапки, в списке языков — «Фуриный». Замещает официальный русский и дополняет его 335 строками, которых там не было.",
      "scope": [
        { "label": "Записи", "value": "920" },
        { "label": "Объём", "value": "~2,7 тыс. слов" },
        { "label": "Язык в меню", "value": "«Фуриный»" },
        { "label": "Тон", "value": "ласково, но понятно" }
      ],
      "install_size": "72 МБ",
      "release": { "tag_prefix": "lockdown-", "asset": "LockdownProtocol-Furry-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "steam": "https://store.steampowered.com/app/2780980/",
        "guide": ""
      },
      "note": "Мод-архив кладётся в Paks\\~mods, слово «Русский» в списке языков заменяется на «Фуриный» прямо в архиве игры (с проверкой, той же длины); удаление возвращает всё. Перевод виден только вам. Игра предупреждает, что моды вне мод-лобби могут привести к бану — решайте сами."
    },
    {
      "slug": "easydelivery",
      "kind": "furry",
      "engine": "Unity",
      "lines": 803,
      "words": 8600,
      "title": "Easy Delivery Co. — Фуриный",
      "aliases": ["Изи деливери", "Easy Delivery", "Доставка", "фуривизатор", "фуриный", "фурри"],
      "banner": "assets/easydelivery.png",
      "status": "released",
      "version": "1.0.0",
      "adult": false,
      "tags": ["Unity", "Thunderstore", "BepInEx", "Шуточный"],
      "summary": "Не перевод, а фуривизатор: официальный русский уютной игры про доставку переписан ласково — посылочки, грузовичок, бензинчик, «Поиграться» и «Настроечки» в меню, в списке языков — «Фуриный». Тёплые и грустные моменты остались собой.",
      "scope": [
        { "label": "Строки", "value": "725 из 803" },
        { "label": "Язык в меню", "value": "«Фуриный»" },
        { "label": "Основа", "value": "официальный русский" },
        { "label": "Тон", "value": "ласково, но понятно" }
      ],
      "install_size": "72 МБ",
      "release": { "tag_prefix": "easydelivery-", "asset": "EasyDelivery-Furry-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "mod": "https://thunderstore.io/c/easy-delivery-co/p/ClaudeRusHub/EasyDeliveryFurryRU/",
        "steam": "https://store.steampowered.com/app/3293010/",
        "guide": ""
      },
      "note": "Два пути на выбор: мод на Thunderstore (r2modman или Thunderstore Mod Manager) или установщик — он поставит BepInEx и мод, а заодно сделает фуриной страницу игры в библиотеке Steam. В игре выберите язык «Фуриный». Файлы игры не меняются."
    },
    {
      "slug": "repo",
      "kind": "furry",
      "engine": "Unity",
      "lines": 1094,
      "words": 2600,
      "title": "R.E.P.O. — Фуриный",
      "aliases": ["Репо", "REPO", "R.E.P.O", "фуривизатор", "фуриный", "фурри"],
      "banner": "assets/repo.png",
      "status": "released",
      "version": "1.0.1",
      "adult": false,
      "tags": ["Unity", "Thunderstore", "BepInEx", "Мультиплеер", "Шуточный"],
      "summary": "Не перевод, а фуривизатор: у R.E.P.O. русского нет вовсе, и весь интерфейс сразу переведён ласковым фуриным диалектом. Роботы — пушистики, ценности — блестяшечки, сохранение — сохраняшка, «Стереть сохраняшку? Дя! / Неть...». Реплики роботов в чат тоже по-фуриному, а кириллицу в узком шрифте дорисовывает Oswald.",
      "scope": [
        { "label": "Интерфейс", "value": "603 строки" },
        { "label": "Наряды и надписи", "value": "491" },
        { "label": "Чат роботов", "value": "по-фуриному" },
        { "label": "Шрифт", "value": "Oswald под Teko" }
      ],
      "install_size": "72 МБ",
      "release": { "tag_prefix": "repo-", "asset": "REPO-Furry-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "mod": "https://thunderstore.io/c/repo/p/ClaudeRusHub/REPOFurryRU/",
        "steam": "https://store.steampowered.com/app/3241660/",
        "guide": ""
      },
      "note": "Два пути на выбор: мод на Thunderstore (r2modman или Thunderstore Mod Manager, кнопка «Install with Mod Manager») или установщик — он сам найдёт игру, поставит BepInEx и мод, а кнопкой «Удалить» снимет всё. Перевод виден при английском языке игры. Мод клиентский: остальным игрокам ставить не нужно."
    },
    {
      "slug": "lethalcompany",
      "kind": "furry",
      "engine": "Unity",
      "lines": 907,
      "words": 17000,
      "title": "Lethal Company — Фуриный",
      "aliases": ["Летал компани", "Леталка", "Летальная компания", "Пушистая компания", "фуривизатор", "фуриный", "фурри"],
      "banner": "assets/lethalcompany.png",
      "status": "released",
      "version": "1.0.3",
      "adult": false,
      "tags": ["Unity", "Thunderstore", "BepInEx", "Мультиплеер", "Шуточный"],
      "summary": "Не перевод, а фуривизатор: весь текст Lethal Company переписан умеренным фуриным диалектом. Сотрудники — пушистики, металлолом — блестяшки, квота — квота пушистости. Терминал понимает русские команды, Компания говорит новым голосом, 45 надписей перерисованы — от плакатов до логотипа «Пушистая компания».",
      "scope": [
        { "label": "Строки", "value": "907" },
        { "label": "Надписи", "value": "45" },
        { "label": "Терминал", "value": "русские команды" },
        { "label": "Версия игры", "value": "v81" }
      ],
      "install_size": "96 МБ",
      "release": { "tag_prefix": "lethalcompany-", "asset": "LethalCompany-Furry-Setup.exe" },
      "links": {
        "download": "https://github.com/e24x5-Fox/claude-rus-hub/releases",
        "mod": "https://thunderstore.io/c/lethal-company/p/ClaudeRusHub/LethalFurryRU/",
        "steam": "https://store.steampowered.com/app/1966720/",
        "guide": ""
      },
      "note": "Совместим с версией игры v81. Ставится через r2modman или Thunderstore Mod Manager, кнопкой «Install with Mod Manager» на странице мода. Мод клиентский: перевод видите только вы. С RTLC и другими русификаторами не совместим — обычный русский ведёт RTLC Team. Названия товаров и лун остаются английскими: их вводят в терминал. Без менеджера модов — установщик: он поставит BepInEx и мод, а заодно сделает фуриной страницу игры в библиотеке Steam (фон, обложка); прежние картинки вернутся при удалении."
    }
  ]
}
;
