/* ─────────────────────────────────────────────────────────────────────────────
   side.js — колонка справа: скачивания, посещения и сводка по каталогу.

   Скачивания берутся из того же ответа GitHub API, что и ссылки на релизы:
   у каждого файла релиза есть download_count. Главная страница вызывает
   CRH_SIDE.downloads(releases), как только ответ пришёл.

   Рубежи — степени двойки: 2, 4, 8, 16… На каждый взятый рубеж своя
   благодарность. Текстов двадцать (до 1 048 576), дальше — общий.

   Посещения считает Abacus (abacus.jasoncameron.dev): у GitHub Pages своего
   сервера нет, записать число некуда. Два счётчика:
     views    — заходы в каталог; перезагрузка вкладки заходом не считается;
     visitors — разные посетители: +1, только если этот браузер тут впервые;
     pleased  — сколько раз ответили лису «Пожалуйста ♡» на плашке после
                скачивания (thanks-widget.js зовёт CRH_SIDE.please(игра)):
                с одного браузера — раз на игру и её версию: вышла новая — снова можно.
   Аккаунтов у посетителей нет, поэтому «разные» — это разные браузеры:
   человек с телефона и с компьютера посчитается дважды. С file:// и с
   локального сервера счётчики только читаются — проверками число не накрутишь.

   На странице игры (…/<слаг>/, window.CRH_FOCUS — пишет tools/seo.py) колонка
   про эту игру: её скачивания и прирост за неделю, заходы именно на эту
   страницу (свои ключи views-<слаг>, visitors-<слаг>, pleased-<слаг>; общие
   при этом тоже растут) и сводка перевода вместо сводки каталога.
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  var COUNTER = 'https://abacus.jasoncameron.dev';
  var NS = 'e24x5-claude-rus-hub';
  var WORDS_PER_MIN = 150;   /* чтение вслух, спокойным темпом */

  var THANKS = {
    2:       'Два скачивания. Кто-то, кроме нас, нажал на кнопку — спасибо :3',
    4:       'Четыре. Это уже компания — можно садиться за настолку. Спасибо!',
    8:       'Восемь скачиваний. Уши торчком, хвост виляет сам по себе. Спасибо!',
    16:      'Шестнадцать человек читают игры по-русски. Приятно до мурашек :3',
    32:      'Тридцать два — больше, чем школьный класс. Спасибо каждому за парту!',
    64:      'Шестьдесят четыре, как клеток на шахматной доске. Ваш ход :3',
    128:     'Сто двадцать восемь. Каталог уже не секрет — спасибо, что делитесь им.',
    256:     'Двести пятьдесят шесть — ровно столько кириллических букв нашлось в шрифте Drag\'n Wash. Совпадение? Спасибо!',
    512:     'Пятьсот двенадцать. Лисёнок сделал круг почёта по комнате :3',
    1024:    'Килобайт скачиваний! Программисты поймут. Огромное спасибо.',
    2048:    '2048 — ровно столько пикселей в стороне текстуры, где прятался пропущенный слой граффити. Теперь его видели все :3',
    4096:    'Четыре тысячи. Небольшой городок, который играет по-русски. Спасибо!',
    8192:    'Восемь тысяч сто девяносто два. Смущённо прячем нос в хвост :3',
    16384:   'Шестнадцать тысяч — больше, чем реплик в самой длинной игре каталога. Спасибо!',
    32768:   '32 768 — предел знакового short. Благодарность только что переполнилась.',
    65536:   '65 536 — столько цветов умели старые видеокарты. Спасибо каждым из них :3',
    131072:  'Сто тридцать одна тысяча. А начиналось всё с одного дракона на автомойке. Спасибо!',
    262144:  'Четверть миллиона. Лисёнок расписывается лапой на каждом установщике :3',
    524288:  'Полмиллиона — больше, чем слов во всех наших переводах вместе. Спасибо!',
    1048576: 'Мегаскачивание: 1 048 576. Слов не осталось, только одно — спасибо :3'
  };

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* 12884 → «12 884»: неразрывный узкий пробел, как в типографике */
  function num(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /* plural(5, 'скачивание', 'скачивания', 'скачиваний') → «скачиваний» */
  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) { return many; }
    if (b > 1 && b < 5) { return few; }
    if (b === 1) { return one; }
    return many;
  }

  /* Игра страницы или null на главной */
  var FOCUS = (function () {
    var want = window.CRH_FOCUS, data = window.CATALOG;
    if (!want || !data || !data.games) { return null; }
    return data.games.filter(function (g) { return g.slug === want; })[0] || null;
  })();

  function thanksFor(m) {
    return THANKS[m] || ('Ещё одно удвоение — ' + num(m) + '. Спасибо, что вы с нами :3');
  }

  function stat(box, value, label, hint) {
    var row = el('div', 'side-stat');
    row.appendChild(el('span', 'v', value));
    row.appendChild(el('span', 'k', label));
    if (hint) { row.title = hint; }
    box.appendChild(row);
    return row;
  }

  /* ── Сводка по каталогу: всё из games.js, сеть не нужна ───────────────── */

  function gameSummary(box, g) {
    var title = box.parentNode.querySelector('.side-title');
    if (title) { title.textContent = 'Этот перевод'; }
    if (g.lines) { stat(box, num(g.lines), plural(g.lines, 'реплика', 'реплики', 'реплик') + ' диалогов'); }
    if (g.words) {
      stat(box, '~' + num(Math.max(1, Math.round(g.words / 1000))) + ' тыс.', 'слов оригинала',
           'Английские слова в переведённых репликах. Интерфейс и надписи не считаются.');
      var mins = Math.round(g.words / WORDS_PER_MIN);
      stat(box, mins >= 90 ? '~' + num(Math.round(mins / 60)) + ' ч' : '~' + num(mins) + ' мин',
           'чтобы прочитать всё вслух', 'Если читать без остановки, по ' + WORDS_PER_MIN + ' слов в минуту.');
    }
    if (g.engine) { stat(box, g.engine, 'движок игры'); }
    if (g.version) { stat(box, 'v' + g.version, 'версия перевода'); }
  }

  function summary(data) {
    var box = $('side-summary');
    if (!box || !data || !data.games) { return; }
    box.innerHTML = '';
    if (FOCUS) { gameSummary(box, FOCUS); return; }

    /* моды (kind: "mod") ничего не переводят — в счёт переводов не идут */
    var done = data.games.filter(function (g) { return g.status === 'released' && g.kind !== 'mod'; });
    var lines = 0, words = 0, engines = {};
    done.forEach(function (g) {
      lines += g.lines || 0;
      words += g.words || 0;
      if (g.engine) { engines[g.engine] = 1; }
    });
    var engineNames = Object.keys(engines);
    var hours = Math.round(words / WORDS_PER_MIN / 60);

    stat(box, num(done.length), plural(done.length, 'игра переведена', 'игры переведено', 'игр переведено'));
    stat(box, num(lines), plural(lines, 'реплика', 'реплики', 'реплик') + ' диалогов');
    stat(box, '~' + num(Math.round(words / 1000)) + ' тыс.', 'слов оригинала',
         'Английские слова в переведённых репликах. Интерфейс и надписи не считаются.');
    stat(box, num(engineNames.length), plural(engineNames.length, 'движок', 'движка', 'движков') + ': ' + engineNames.join(', '));
    if (hours) {
      stat(box, '~' + num(hours) + ' ч', 'чтобы прочитать всё вслух',
           'Если читать без остановки, по ' + WORDS_PER_MIN + ' слов в минуту.');
    }
  }

  /* ── Скачивания и рубежи ──────────────────────────────────────────────── */

  function downloads(releases) {
    var box = $('side-downloads');
    if (!box || !Array.isArray(releases)) { return; }

    var total = 0, first = null;
    var prefix = FOCUS && FOCUS.release && FOCUS.release.tag_prefix;
    releases.forEach(function (r) {
      if (r.draft) { return; }
      if (FOCUS && !(prefix && r.tag_name && r.tag_name.indexOf(prefix) === 0)) { return; }
      (r.assets || []).forEach(function (a) { total += a.download_count || 0; });
      var when = new Date(r.published_at || r.created_at);
      if (!isNaN(when) && (!first || when < first)) { first = when; }
    });
    /* моды Thunderstore: их скачивания GitHub не видит, они в снимке downloads.js */
    var ts = (window.CRH_DOWNLOADS || {}).thunderstore || {};
    Object.keys(ts).forEach(function (slug) {
      if (!FOCUS || slug === FOCUS.slug) { total += ts[slug].downloads || 0; }
    });

    box.innerHTML = '';
    var big = el('div', 'side-big');
    big.appendChild(el('span', 'v', num(total)));
    big.appendChild(el('span', 'k', plural(total, 'скачивание', 'скачивания', 'скачиваний')));
    box.appendChild(big);
    if (FOCUS) { weekGain(box, total); }

    /* Взятые рубежи: 2, 4, 8… не больше total */
    var reached = [];
    for (var m = 2; m <= total; m *= 2) { reached.push(m); }
    var next = reached.length ? reached[reached.length - 1] * 2 : 2;
    var prev = reached.length ? reached[reached.length - 1] : 0;

    var bar = el('div', 'side-bar');
    var fill = el('span');
    fill.style.width = Math.max(4, Math.round((total - prev) / (next - prev) * 100)) + '%';
    bar.appendChild(fill);
    box.appendChild(bar);
    box.appendChild(el('p', 'side-next', 'до следующего рубежа — ' + num(next - total)
      + ' (цель ' + num(next) + ')'));

    if (reached.length) {
      var last = reached[reached.length - 1];
      var q = el('blockquote', 'side-thanks');
      q.appendChild(el('span', 'm', num(last)));
      q.appendChild(document.createTextNode(thanksFor(last)));
      box.appendChild(q);
    } else {
      box.appendChild(el('p', 'side-next', 'Первый рубеж — два скачивания. Здесь появится благодарность.'));
    }

    var since = $('side-since');
    if (since && first) {
      var days = Math.floor((Date.now() - first) / 86400000);
      since.textContent = (FOCUS ? 'Вышел ' : 'Первый релиз — ') + num(days) + ' '
        + plural(days, 'день', 'дня', 'дней') + ' назад';
    }
  }

  /* Прирост за неделю: живой счёт минус снимок недельной давности (downloads.js) */
  function weekGain(box, total) {
    var hist = (window.CRH_DOWNLOADS && window.CRH_DOWNLOADS.days) || {};
    var base = null;
    Object.keys(hist).sort().forEach(function (d) {
      if ((Date.now() - Date.parse(d + 'T00:00:00Z')) / 864e5 >= 7) { base = d; }
    });
    if (!base || hist[base][FOCUS.slug] == null) { return; }
    var gain = Math.max(0, total - hist[base][FOCUS.slug]);
    box.appendChild(el('p', 'side-next', '+' + num(gain) + ' за неделю'));
  }

  /* ── Посещения ────────────────────────────────────────────────────────── */

  /* Страница с диска или с локального сервера (проверки перед заливкой) —
     счётчики только читаются. 06.10.2026 локальные проверки с 127.0.0.1
     успели накрутить заходы и «пожалуйста», отсюда проверка не только file:. */
  function isLocal() {
    return location.protocol === 'file:'
      || /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(location.hostname);
  }

  function counter(key, bump) {
    return fetch(COUNTER + '/' + (bump ? 'hit' : 'get') + '/' + NS + '/' + key)
      .then(function (r) { return r.ok ? r.json() : (r.status === 404 ? { value: 0 } : Promise.reject(r.status)); })
      .then(function (j) { return typeof j.value === 'number' ? j.value : Promise.reject('value'); });
  }

  function flag(store, key) {
    try {
      if (store.getItem(key)) { return true; }
      store.setItem(key, '1');
    } catch (e) { return true; }   /* хранилище закрыто — лучше не посчитать, чем посчитать дважды */
    return false;
  }

  function visits() {
    var box = $('side-visits');
    if (!box) { return; }
    var local = isLocal();
    var newView = !local && !flag(sessionStorage, 'crh-counted');
    var newVisitor = !local && !flag(localStorage, 'crh-visitor');
    var own = FOCUS ? '-' + FOCUS.slug : '';
    if (FOCUS) {
      /* общие счётчики растут и со страниц игр, а показываются свои */
      if (newView) { counter('views', true).catch(function () {}); }
      if (newVisitor) { counter('visitors', true).catch(function () {}); }
      newView = !local && !flag(sessionStorage, 'crh-counted' + own);
      newVisitor = !local && !flag(localStorage, 'crh-visitor' + own);
    }

    Promise.all([counter('views' + own, newView), counter('visitors' + own, newVisitor),
                 counter(PLEASE_KEY + own, false).catch(function () { return null; })])
      .then(function (v) {
        box.innerHTML = '';
        pleases = v[2];
        stat(box, num(v[0]), plural(v[0], 'заход', 'захода', 'заходов') + (FOCUS ? ' на страницу' : ' в каталог'),
             'Каждое открытие страницы. Перезагрузка вкладки не считается.');
        stat(box, num(v[1]), plural(v[1], 'посетитель', 'посетителя', 'посетителей') + ' без повторов',
             'Разные браузеры: вернувшийся посетитель второй раз не считается. '
             + 'Один человек с телефона и с компьютера — два посетителя.');
        if (pleases !== null) {
          pleaseRow = stat(box, '', '', 'Нажатия «Пожалуйста ♡» на плашке, которая благодарит за скачивание.');
          drawPlease();
        }
      })
      .catch(function () {
        box.innerHTML = '';
        box.appendChild(el('p', 'side-next', 'Счётчик посещений сейчас не отвечает.'));
      });
  }

  /* ── Параллакс колонки ──────────────────────────────────────────────────
     Своей прокрутки у колонки нет. Пока листают страницу, она сдвигается
     вниз на ту же долю своего запаса хода, какую долю страницы уже
     пролистали: наверху стоит у шапки, внизу — ровно у конца каталога.
     Короче каталога — едет медленнее страницы, отсюда параллакс. Сдвиг
     догоняется плавно; кто просил меньше движения — без плавности. */

  function parallax() {
    var side = document.querySelector('.side');
    var layout = side && side.parentElement;
    if (!side || !layout) { return; }
    var shown = 0, target = 0, ticking = false;

    function measure() {
      if (window.innerWidth < 1100) { target = 0; return; }
      var top = parseFloat(getComputedStyle(side).marginTop) || 0;
      var room = layout.offsetHeight - side.offsetHeight - top;
      var scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (room <= 0 || scrollable <= 0) { target = 0; return; }
      var p = Math.min(1, Math.max(0, window.scrollY / scrollable));
      target = Math.round(p * room);
    }

    function frame() {
      ticking = false;
      measure();
      var d = target - shown;
      var calm = window.CRH_FX && CRH_FX.still;
      shown = (calm || Math.abs(d) < 0.5) ? target : shown + d * 0.18;
      side.style.transform = shown ? 'translateY(' + shown.toFixed(1) + 'px)' : '';
      if (shown !== target) { kick(); }
    }

    function kick() {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    document.addEventListener('crh:fx', kick);   /* выключили движение на ходу — колонка встаёт сразу */
    /* высота меняется сама: «Показать ещё», поиск, догрузившиеся картинки */
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(kick);
      ro.observe(layout);
      ro.observe(side);
    }
    kick();
  }

  /* ── «Пожалуйста ♡» на плашке после скачивания ── */

  /* Ключ новый, а не pleases: тот накрутили проверки, а обнулить ключ
     Abacus без админ-ключа нельзя. */
  var PLEASE_KEY = 'pleased';
  var pleases = null, pleaseRow = null;

  function drawPlease() {
    if (!pleaseRow || pleases === null) { return; }
    pleaseRow.querySelector('.v').textContent = num(pleases);
    pleaseRow.querySelector('.k').textContent =
      plural(pleases, 'раз', 'раза', 'раз') + ' лису ответили «пожалуйста»';
  }

  /* Раз на игру с одного браузера: иначе «Скачать» → «Пожалуйста» по кругу
     накручивает счётчик. Список игр, за которые уже сказали, — в localStorage;
     хранилище закрыто — не считаем вовсе, как и с посетителями. */
  function firstPlease(game) {
    var KEY = 'crh-pleased', done;
    try {
      done = JSON.parse(localStorage.getItem(KEY)) || [];
      if (!Array.isArray(done)) { done = []; }
      if (done.indexOf(game) >= 0) { return false; }
      done.push(game);
      localStorage.setItem(KEY, JSON.stringify(done));
    } catch (e) { return false; }
    return true;
  }

  function please(game) {
    if (isLocal() || !firstPlease(String(game || ''))) { return; }
    if (pleases !== null) { pleases += 1; drawPlease(); }   /* сразу, не дожидаясь сети */
    /* у каждой игры и свой счёт: слаг - до «@версия» */
    var mine = counter(PLEASE_KEY, true);
    var slug = String(game || '').split('@')[0];
    var own = slug ? counter(PLEASE_KEY + '-' + slug, true) : mine;
    (FOCUS ? own : mine).then(function (v) { pleases = v; drawPlease(); }, function () {});
  }

  window.CRH_SIDE = { downloads: downloads, please: please };
  parallax();

  summary(window.CATALOG);
  visits();
})();
