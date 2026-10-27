/* Макет нового каталога: шапка, подвал, плеер и помощники, общие для всех страниц.
   Данные — настоящие, из claude-rus-hub/docs (games.js, music.js, donors.js…),
   подключаются на каждой странице тегами <script> до этого файла. */
var D = '';
var DISCORD = 'https://discord.gg/wUsBpMdM2n';
var DONATE = 'https://dalink.to/e24x5';
var STICKERS = 'https://t.me/addstickers/foxkisser_rpc';
var REPO = 'https://github.com/e24x5-Fox/claude-rus-hub';

var ICON = {
  note: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 18V5l12-2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2.1 0 3.6 1.1 5 2.8 1.4-1.7 2.9-2.8 5-2.8 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>',
  discord: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18 18 0 0 0-5.6 0L8.6 3a19.6 19.6 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18.1a19.8 19.8 0 0 0 6 3l1.3-2a12.7 12.7 0 0 1-2-1l.5-.4a14 14 0 0 0 12.2 0l.5.4-2 1 1.3 2a19.7 19.7 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.7zM8.3 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm7.4 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 4v16l11-8zM17 4h2v16h-2z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 3v6c0 5-3.4 9.5-8 11-4.6-1.5-8-6-8-11V5z"/></svg>',
};

function $(s, root) { return (root || document).querySelector(s); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function num(n) { return Math.round(n).toLocaleString('ru-RU'); }
function plural(n, one, few, many) {
  var a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? few : many;
}

var GAMES = (window.CATALOG && CATALOG.games || []).filter(function (g) { return g.status === 'released'; });
function kindOf(g) { return g.kind === 'furry' ? 'furry' : g.kind === 'mod' ? 'mod' : 'ru'; }
var KINDS = [
  { id: 'ru', title: 'Переводы' },
  { id: 'furry', title: 'Фуривизаторы' },
  { id: 'mod', title: 'Моды' },
];

/* Скачивания: в downloads.js счёт нарастающим итогом по дням. */
var DL = (function () {
  var days = window.CRH_DOWNLOADS ? Object.keys(CRH_DOWNLOADS.days).sort() : [];
  var last = days.length ? CRH_DOWNLOADS.days[days[days.length - 1]] : {};
  var weekAgo = days.length > 7 ? CRH_DOWNLOADS.days[days[days.length - 8]] : {};
  var total = 0;
  Object.keys(last).forEach(function (k) { total += last[k]; });
  return {
    total: total,
    of: function (slug) { return last[slug] || 0; },
    week: function (slug) { return (last[slug] || 0) - (weekAgo[slug] || 0); },
  };
})();

function totals() {
  var lines = 0, words = 0, engines = {};
  GAMES.filter(function (g) { return kindOf(g) !== 'mod'; }).forEach(function (g) { lines += g.lines || 0; words += g.words || 0; if (g.engine) engines[g.engine] = 1; });
  return { games: GAMES.filter(function (g) { return kindOf(g) !== 'mod'; }).length, lines: lines, words: words, engines: Object.keys(engines) };
}

function gameUrl(g) { return 'v2-game.html?slug=' + encodeURIComponent(g.slug); }
/* Баннер игры — лёгкая копия WebP из assets/covers/ (в 12 раз меньше PNG: сетка из
   20 баннеров весила 2,9 МБ). Нет копии — onerror в coverImg() вернёт исходный PNG. */
function cover(g) { return D + 'assets/covers/' + g.banner.replace(/^.*\//, '').replace(/\.png$/i, '.webp'); }
function coverImg(g, eager) {
  return '<img src="' + cover(g) + '" width="512" height="192" alt="" decoding="async"'
    + (eager ? ' fetchpriority="high"' : ' loading="lazy"')
    + ' onload="this.classList.add(\'in\')" onerror="this.onerror=null;this.src=\'' + D + g.banner + '\'">';
}

/** Шапка: page — 'ru' | 'furry' | 'mod' | 'music' | 'support' | 'about' | null */
function renderNav(page) {
  var counts = {};
  GAMES.forEach(function (g) { var k = kindOf(g); counts[k] = (counts[k] || 0) + 1; });
  var kinds = KINDS.map(function (k) {
    return '<a href="v2.html#' + k.id + '"' + (page === k.id ? ' class="on"' : '') + '>' + k.title
      + ' <span class="n">' + (counts[k.id] || 0) + '</span></a>';
  }).join('');
  // при переходе без перезагрузки шапка рисуется заново — старую убрать
  document.querySelectorAll('.nav, .mock-tag').forEach(function (n) { n.remove(); });
  var nav = document.createElement('header');
  nav.className = 'nav';
  nav.innerHTML = '<div class="wrap nav-row">'
    + '<a class="brand" href="v2.html"><img src="' + D + 'assets/mascot-wave.png" alt=""><span>Русификаторы <b>с Клодом</b></span></a>'
    + '<nav class="kinds">' + kinds + '</nav>'
    + '<div class="me">'
    + '<a href="v2-music.html"' + (page === 'music' ? ' class="on"' : '') + '>' + ICON.note + '<span class="t">Музыка</span></a>'
    + '<a href="v2-support.html"' + (page === 'support' ? ' class="on"' : '') + '>' + ICON.heart + '<span class="t">Поддержать</span></a>'
    + '<a class="dc' + (page === 'discord' ? ' on' : '') + '" href="v2-discord.html">' + ICON.discord + '<span class="t">Discord</span><span class="live" id="dc-live"></span></a>'
    + fxMenu()
    + '</div></div>';
  document.body.insertBefore(nav, document.body.firstChild);
  fxWire(nav);
  var tag = document.createElement('a');
  tag.className = 'mock-tag';
  tag.href = DISCORD;
  tag.target = '_blank';
  tag.rel = 'noopener';
  tag.title = 'Это новая версия каталога. Расскажите в Discord, как она вам';
  tag.classList.add('beta');
  tag.innerHTML = '<b>бета</b>' + ICON.discord + '<span class="long">Как вам новый каталог? Напишите в Discord</span>'
    + '<span class="short">Отзыв в Discord</span>';
  document.body.appendChild(tag);
  discordLive();
}

/* Сервер Discord: в сети, участники, значок. Спрашиваем один раз на загрузку
   страницы — при переходах без перезагрузки v2-shared.js не выполняется заново,
   и шапка сразу рисует уже полученное, а не мигает пустой до нового ответа. */
var discordReq = null, discordData = null;
function discordInfo() {
  if (!discordReq) {
    discordReq = window.fetch
      ? fetch('https://discord.com/api/v9/invites/wUsBpMdM2n?with_counts=true')
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) { discordData = d; return d; }, function () { return null; })
      : Promise.resolve(null);
  }
  return discordReq;
}

/* ── «Эффекты» для слабых компьютеров ─────────────────────────────────────────
   Шестерёнка в шапке: тот же выбор, что в нынешнем каталоге (fx.js, CRH_FX):
   «Авто» — как просит Windows и как тянет компьютер, «Все», «Без» — ничего не
   движется и нет размытой обложки на фоне. Хранит fx.js (localStorage
   crh-fx) — настройка общая со старым каталогом. fx.js грузится после этого
   файла, поэтому CRH_FX спрашивается в момент нажатия. */
var FX_MODES = [['auto', 'Авто', 'Как просит Windows и как тянет компьютер'],
                ['full', 'Все', 'Всегда полностью'],
                ['off', 'Без', 'Ничего не движется, размытого фона нет']];
function fxMenu() {
  return '<div class="fx-menu"><button class="fx-btn" type="button" title="Эффекты страницы" aria-label="Эффекты страницы" aria-expanded="false">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">'
    + '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></svg>'
    + '</button><div class="fx-pop" role="group" aria-label="Эффекты страницы"><b>Эффекты</b>'
    + '<p class="fx-hint">Если страница тормозит — «Без»: лисёнок перестанет танцевать, фон станет простым.</p>'
    + '<div class="fx-row">' + FX_MODES.map(function (m) {
        return '<button type="button" data-fx="' + m[0] + '" title="' + m[2] + '">' + m[1] + '</button>';
      }).join('') + '</div><p class="fx-now"></p></div></div>';
}
function fxShow(root) {
  var fx = window.CRH_FX;
  if (!fx || !root) return;
  root.querySelectorAll('[data-fx]').forEach(function (b) {
    var on = b.getAttribute('data-fx') === fx.mode;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  var now = fx.still && fx.flat ? 'без движения и без размытого фона' : fx.still ? 'без движения'
          : fx.flat ? 'без размытого фона' : 'всё включено';
  root.querySelector('.fx-now').textContent = 'Сейчас: ' + now + (fx.mode === 'auto' && fx.why ? ' — ' + fx.why : '') + '.';
}
function fxWire(nav) {
  var menu = nav.querySelector('.fx-menu'), btn = menu.querySelector('.fx-btn');
  function open(on) { menu.classList.toggle('open', on); btn.setAttribute('aria-expanded', on ? 'true' : 'false'); if (on) fxShow(menu); }
  btn.addEventListener('click', function (e) { e.stopPropagation(); open(!menu.classList.contains('open')); });
  menu.querySelector('.fx-row').addEventListener('click', function (e) {
    var b = e.target.closest('[data-fx]');
    if (b && window.CRH_FX) { CRH_FX.set(b.getAttribute('data-fx')); fxShow(menu); }
  });
  document.addEventListener('click', function (e) { if (!menu.contains(e.target)) open(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') open(false); });
  document.addEventListener('crh:fx', function () { fxShow(menu); });
}

function discordLive() {
  function put(d) {
    var el = $('#dc-live');
    if (el && d && d.approximate_presence_count) el.textContent = '· ' + d.approximate_presence_count + ' в сети';
  }
  if (discordData) put(discordData);   // уже знаем — сразу, без ожидания
  else discordInfo().then(put);
}

function renderFoot() {
  document.querySelectorAll('.foot').forEach(function (n) { n.remove(); });
  var f = document.createElement('footer');
  f.className = 'foot';
  f.innerHTML = '<div class="wrap">'
    + '<span>Переводы бесплатные. Делает <a href="v2-about.html">икся</a> вместе с нейросетью Claude.</span>'
    + '<span class="sp"></span>'
    + '<a href="' + REPO + '" target="_blank" rel="noopener">GitHub</a>'
    + '<a href="' + REPO + '/releases" target="_blank" rel="noopener">Все релизы</a>'
    + '<a href="v2-about.html">Обо мне</a>'
    + mascot('mascot-calm.png')
    + '</div>';
  document.body.appendChild(f);
}

/* ── музыка и лисёнок — настоящие, из каталога ─────────────────────────────
   Плеер (music-widget.js), сцена по десяти нажатиям на лисёнка (fox-stage.js),
   слова, фон сцены и пасхалка сверху подключаются как есть; стили к ним —
   v2-widgets.css, его собирает serve.py из docs/site.css. Здесь только раскладка:
   плеер — полоса внизу, а не карточка в углу (.music в v2-shared.css). Трек не
   выбрать и не перемотать — так задумано; листать можно только на сцене. */
(function () {
  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'v2-widgets.css';
  document.head.insertBefore(css, document.head.querySelector('link[href="v2-shared.css"]'));
  markPage(document, document.body);
  var need = ['fx.js', window.CRH_MUSIC ? null : 'music.js', 'v2-music-widget.js', 'top-egg.js',
              'fox-stage.js', 'fox-lyrics.js', 'fox-stage-bg.js'];
  need.forEach(function (src) {
    if (!src) return;
    var s = document.createElement('script');
    s.src = src;
    s.async = false;                 /* по порядку: music.js раньше плеера */
    document.body.appendChild(s);
  });
})();

/* ── плеер виден не сразу ─────────────────────────────────────────────────────
   При первом заходе плеера нет. Он появляется, когда человек зашёл на «Музыку»
   (или включил музыку сам — на сцене у лисёнка), и дальше едет по страницам.
   Крестик на полосе останавливает музыку и убирает плеер до следующего захода
   на «Музыку». Помнится до закрытия вкладки (sessionStorage). */
var Radio = (function () {
  var KEY = 'mock-radio';
  function get() { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function set(on) {
    try { sessionStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
    document.body.classList.toggle('radio-on', on);
  }
  document.body.classList.toggle('radio-on', get());
  // крестик — в саму полосу плеера, как только music-widget.js её построил
  var wait = setInterval(function () {
    var box = document.querySelector('.music');
    if (!box) return;
    clearInterval(wait);
    var x = document.createElement('button');
    x.className = 'music-x';
    x.title = 'Убрать плеер';
    x.setAttribute('aria-label', 'Убрать плеер');
    x.innerHTML = ICON.x;
    x.addEventListener('click', function () {
      if (window.CRH_PLAYER && CRH_PLAYER.playing()) document.querySelector('.music-play').click();
      set(false);
    });
    box.appendChild(x);
  }, 100);
  /* Что играет — по CRH_PLAYER.now().file (адрес mp3 у нас или у Suno). */
  function current() {
    var now = window.CRH_PLAYER && CRH_PLAYER.now();
    if (!now || !now.file || !window.CRH_MUSIC) return null;
    return CRH_MUSIC.tracks.filter(function (t) {
      return now.file.indexOf('/' + t.file + '.') >= 0 || now.file.indexOf(t.suno) >= 0 || now.file === t.file;
    })[0] || null;
  }
  /* «Уже звучало»: трек попадает сюда, отыграв 20 секунд, — на любой странице.
     Помнится в браузере (localStorage); сколько треков всего, отсюда не узнать. */
  var HEARD = 'mock-heard', heardFor = null, heardSince = 0;
  function heard() {
    var files;
    try { files = JSON.parse(localStorage.getItem(HEARD) || '[]'); } catch (e) { files = []; }
    var byFile = {};
    ((window.CRH_MUSIC || {}).tracks || []).forEach(function (t) { byFile[t.file] = t; });
    return files.map(function (f) { return byFile[f]; }).filter(Boolean);
  }
  setInterval(function () {
    var p = window.CRH_PLAYER;
    var playing = !!(p && p.playing());
    // музыку включили без «Музыки» (сцена у лисёнка) — значит, плеер нужен
    if (playing && !get()) set(true);
    var t = playing ? current() : null;
    if (!t) { heardFor = null; return; }
    if (t !== heardFor) { heardFor = t; heardSince = Date.now(); return; }
    if (Date.now() - heardSince < 20000) return;
    var list = heard().map(function (x) { return x.file; });
    if (list.indexOf(t.file) < 0) {
      list.push(t.file);
      try { localStorage.setItem(HEARD, JSON.stringify(list)); } catch (e) {}
    }
  }, 1000);
  return { show: function () { set(true); }, hide: function () { set(false); }, current: current, heard: heard };
})();

/* ── переходы без перезагрузки ────────────────────────────────────────────────
   Иначе каждая страница заводила бы плеер заново: трек сначала и на паузе.
   Ссылка внутри макета — страница подгружается, её разметка и стили подменяют
   текущие (помечены data-page), её скрипты выполняются; шапка, плеер и сцена
   с лисёнком живут дальше. Так же можно сделать и на настоящем сайте. */
function markPage(doc, body) {
  [].forEach.call(body.children, function (n) { if (n.tagName !== 'SCRIPT') n.setAttribute('data-page', ''); });
  doc.querySelectorAll('head style').forEach(function (s) { s.setAttribute('data-page', ''); });
}

var Nav = (function () {
  var loaded = {};
  document.querySelectorAll('script[src]').forEach(function (s) { loaded[s.getAttribute('src')] = 1; });

  function loadScript(src) {
    return new Promise(function (ok) {
      if (loaded[src]) return ok();
      loaded[src] = 1;
      var s = document.createElement('script');
      s.src = src;
      s.onload = s.onerror = function () { ok(); };
      document.body.appendChild(s);
    });
  }

  function go(url, push) {
    return fetch(url).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      clearInterval(window.pageTimer);
      if (push) history.pushState(null, '', url);
      document.title = doc.title;
      document.querySelectorAll('[data-page]').forEach(function (n) { n.remove(); });
      doc.querySelectorAll('head style').forEach(function (st) {
        var n = document.createElement('style');
        n.setAttribute('data-page', '');
        n.textContent = st.textContent;
        document.head.appendChild(n);
      });
      var anchor = document.querySelector('.foot');
      [].slice.call(doc.body.children).forEach(function (n) {
        if (n.tagName === 'SCRIPT') return;
        n.setAttribute('data-page', '');
        document.body.insertBefore(document.importNode(n, true), anchor);
      });
      var chain = Promise.resolve();
      [].slice.call(doc.body.querySelectorAll('script')).forEach(function (s) {
        var src = s.getAttribute('src');
        if (src === 'v2-shared.js') return;
        chain = chain.then(function () {
          if (src) return loadScript(src);
          var n = document.createElement('script');
          n.textContent = s.textContent;
          document.body.appendChild(n);
          n.remove();
        });
      });
      return chain.then(function () {
        var id = location.hash.slice(1);
        var target = id && document.getElementById(id);
        if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
      });
    }).catch(function () { location.href = url; });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    var url = new URL(a.getAttribute('href'), location.href);
    if (url.origin !== location.origin || !/\.html$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.search === location.search) return;   // только якорь
    e.preventDefault();
    go(url.href, true);
  });
  window.addEventListener('popstate', function () { go(location.href, false); });
  return { go: go };
})();

/* ── «Правила донатов» перед донатом ─────────────────────────────────────────
   Как в нынешнем каталоге (donors-widget.js): любая ссылка на донат сначала
   открывает правила, на DonationAlerts ведёт только «Понятно — к донату» в окне.
   Текст дословно оттуда, числа — из donors.js (rules). Колёсико и Ctrl/Shift —
   сразу на донат: кто так открывает вкладку, знает, куда идёт. */
var donateDialog = null;
function donateRules() {
  if (donateDialog && document.body.contains(donateDialog)) { donateDialog.showModal(); return; }
  var R = (window.CRH_DONORS && CRH_DONORS.rules) || {};
  var BASE = R.base_days || 7, PER = R.rub_per_day || 10, MSG_MAX = R.msg_max || 200, NAME_MAX = R.name_max || 32;
  function days(rub) { return Math.round(BASE + rub / PER); }
  function section(title, items) {
    return '<h3>' + title + '</h3><ul>' + items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
  }
  donateDialog = document.createElement('dialog');
  donateDialog.className = 'rules-dlg';
  donateDialog.setAttribute('aria-label', 'Правила донатов');
  donateDialog.innerHTML = '<button class="rules-x" type="button" title="Закрыть">×</button><h2>Правила донатов</h2>'
    + section('Сколько ник висит в списке', [
        'Ник и сумма появляются здесь в течение шести часов: список обновляется по расписанию.',
        'Срок зависит от суммы: ' + BASE + ' дней плюс день за каждые ' + PER + ' ₽. '
          + '100 ₽ — ' + days(100) + ' дней, 500 ₽ — ' + days(500) + ', 1000 ₽ — ' + days(1000) + '.',
        'Донаты с одного ника складываются: новый донат продлевает срок с конца прежнего, а сумма в строке — общая.',
        'Выше в списке — бóльшая сумма. До какого дня висит строка, видно, если навести на неё мышь.'])
    + section('Что можно писать', [
        'Что угодно: спасибо, пожелание, какую игру перевести следующей.',
        'Сообщение видят все посетители каталога. Не пишите в нём личного — ни своего, ни чужого.',
        'Показывается последнее сообщение с ника, до ' + MSG_MAX + ' символов; длиннее — обрезается многоточием.'])
    + section('Что меняется в сообщении', [
        'Слова из списка запрещённых DonationAlerts заменяются звёздочками «***» — и в сообщении, и в нике. Донат при этом остаётся.',
        'Ссылки вырезаются, адрес почты заменяется на «[почта скрыта]».',
        'Переносы строк и невидимые символы, переворачивающие текст, убираются. Эмодзи остаются.',
        'Ник длиннее ' + NAME_MAX + ' символов обрезается, донат без ника подписывается «Аноним».'])
    + section('Когда сообщения не будет', [
        'Голосовое сообщение: текста у него нет — в списке останутся ник и сумма.',
        'Если автору придётся скрыть сообщения конкретного ника (за спам или оскорбления), ник и сумма тоже останутся — пропадёт только текст.',
        'Сам донат из-за содержания сообщения не скрывается никогда.'])
    + '<a class="btn primary rules-go" href="' + DONATE + '" target="_blank" rel="noopener">Понятно — к донату ♡</a>';
  donateDialog.querySelector('.rules-x').addEventListener('click', function () { donateDialog.close(); });
  donateDialog.querySelector('.rules-go').addEventListener('click', function () { donateDialog.close(); });
  donateDialog.addEventListener('click', function (e) { if (e.target === donateDialog) donateDialog.close(); });
  document.body.appendChild(donateDialog);
  donateDialog.showModal();
}
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href^="' + DONATE + '"], [data-rules]');
  if (!a || (donateDialog && donateDialog.contains(a))) return;
  if (a.tagName === 'A' && (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) return;
  e.preventDefault();
  donateRules();
}, true);

/** Лисёнок, который танцует под музыку (и улетает на сцену после десяти нажатий). */
function mascot(src, cls) {
  return '<div class="mascot' + (cls ? ' ' + cls : '') + '" data-viz><img src="assets/' + src + '" alt="Лисёнок-маскот"></div>';
}

/** Подарок со стикерами в элементе host. Лисята сидят внутри и выскакивают при
    наведении; крышку первое наведение срывает насовсем (CSS — «подарок» в v2-shared.css). */
function gift(host) {
  var fan = ['delight', 'cute', 'happy', 'wow', 'joy'].map(function (s, k) {
    return '<img src="' + D + 'assets/stickers/' + s + '.png" alt="" style="--i:' + (k - 2) + ';--a:' + Math.abs(k - 2)
      + ';z-index:' + (3 - Math.abs(k - 2)) + '">';
  }).join('');
  host.innerHTML = '<div class="gift"><a class="gift-fan" href="' + STICKERS + '" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">'
    + fan + '</a><div class="gift-lid"><i></i></div><div class="gift-box"><b>Стикеры с лисёнком</b>'
    + '<a href="' + STICKERS + '" target="_blank" rel="noopener">Добавить в Telegram</a></div></div>';
  var box = host.firstChild;
  // крышка сорвана — до перезагрузки страницы: переменная живёт, пока не перезагрузили
  // (переходы без перезагрузки v2-shared.js заново не выполняют), после F5 крышка снова на месте
  if (gift.lidGone) box.classList.add('lid-gone', 'lid-was');
  function rip() {
    if (box.classList.contains('lid-gone')) return;
    box.classList.add('lid-gone');
    gift.lidGone = true;
  }
  box.addEventListener('mouseenter', rip);
  // на телефоне наведения нет: нажатие срывает крышку и выпускает лисят, второе — прячет
  box.addEventListener('click', function (e) {
    if (e.target.closest('.gift-box a')) return;
    if (!matchMedia('(hover: none)').matches) return;
    e.preventDefault();
    rip();
    box.classList.toggle('force');
  });
  var open = function () { setTimeout(function () { box.classList.add('open'); }, 250); };
  if (!window.IntersectionObserver) return open();
  var io = new IntersectionObserver(function (e) {
    if (e[0].isIntersecting) { open(); io.disconnect(); }
  }, { threshold: .5 });
  io.observe(box);
}
