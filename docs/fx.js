/* ─────────────────────────────────────────────────────────────────────────────
   fx.js — сколько эффектов показывать: решает одно место на всю страницу.

   Два независимых флага на <html>:
     fx-still — без движения: строки донатеров, параллакс колонки, ход фона,
                вращение обложки, взмах лапой на плашке «Спасибо»;
     fx-flat  — без размытой обложки на фоне: самое тяжёлое, что есть на
                странице (холсты при каждой смене трека, а в старых браузерах —
                фильтр размытия на каждом кадре).

   Откуда флаги, в режиме «Авто»:
     fx-still — «Анимационные эффекты» выключены в Windows (браузер передаёт
                их как prefers-reduced-motion);
     fx-flat  — выключены «Эффекты прозрачности» (prefers-reduced-transparency,
                Chromium 118+), включена экономия трафика или машина слабая:
                не больше двух ядер или не больше 2 ГБ памяти.
   Кнопки «Авто / Все / Без» в левом углу, у донатеров, перекрывают это вручную, выбор
   запоминается в браузере. Переключили настройку Windows при открытой
   вкладке — страница подхватывает сразу, без перезагрузки.

   Скрипт стоит в <head> до стилей: флаги ставятся раньше первой отрисовки,
   и строки донатеров не успевают дёрнуться. Виджеты читают window.CRH_FX
   в момент действия, а о смене узнают по событию crh:fx на document.
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  var KEY = 'crh-fx';
  var root = document.documentElement;
  var mm = window.matchMedia ? function (q) { return window.matchMedia(q); } : null;
  var motion = mm && mm('(prefers-reduced-motion: reduce)');
  var glass = mm && mm('(prefers-reduced-transparency: reduce)');
  var nav = window.navigator || {};
  var conn = nav.connection || {};

  function weak() {
    var cores = nav.hardwareConcurrency, mem = nav.deviceMemory;
    return (cores > 0 && cores <= 2) || (mem > 0 && mem <= 2);
  }

  function load() {
    try {
      var m = localStorage.getItem(KEY);
      return m === 'full' || m === 'off' ? m : 'auto';
    } catch (e) { return 'auto'; }
  }

  var fx = window.CRH_FX = { mode: load(), still: false, flat: false, why: '' };

  function apply() {
    var still, flat, why = [];
    if (fx.mode === 'full') {
      still = flat = false;
    } else if (fx.mode === 'off') {
      still = flat = true;
    } else {
      still = !!(motion && motion.matches);
      var lowGlass = !!(glass && glass.matches);
      var lowData = !!conn.saveData;
      var lowBox = weak();
      flat = lowGlass || lowData || lowBox;
      if (still) { why.push('в Windows выключены анимации'); }
      if (lowGlass) { why.push('в Windows выключена прозрачность'); }
      if (lowData) { why.push('включена экономия трафика'); }
      if (lowBox) { why.push('слабый компьютер'); }
    }
    fx.still = still;
    fx.flat = flat;
    fx.why = why.join(', ');
    root.classList.toggle('fx-still', still);
    root.classList.toggle('fx-flat', flat);
  }

  function update() {
    apply();
    try { document.dispatchEvent(new CustomEvent('crh:fx', { detail: fx })); } catch (e) { /* старый браузер */ }
  }

  fx.set = function (mode) {
    fx.mode = mode === 'full' || mode === 'off' ? mode : 'auto';
    try {
      if (fx.mode === 'auto') { localStorage.removeItem(KEY); } else { localStorage.setItem(KEY, fx.mode); }
    } catch (e) { /* без памяти — до перезагрузки */ }
    update();
  };

  function watch(q) {
    if (!q) { return; }
    if (q.addEventListener) { q.addEventListener('change', update); }
    else if (q.addListener) { q.addListener(update); }
  }
  watch(motion);
  watch(glass);
  if (conn.addEventListener) { conn.addEventListener('change', update); }

  apply();

  /* ── «Эффекты: Авто / Все / Без» — блок для левого угла ──
     Строит fx.js, ставит donors-widget.js (CRH_FX.dock()): на узком экране —
     кружок с ползунками рядом с пилюлей «Поддержали», по нажатию над ним
     открывается карточка; на широком — строка внизу открытой панели донатеров.
     Под кнопками — что сейчас выбрало «Авто» и почему. */
  var dock = null;
  fx.dock = function () {
    if (dock) { return dock; }
    function el(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) { n.className = cls; }
      if (text != null) { n.textContent = text; }
      return n;
    }
    dock = el('div', 'fx-dock');
    var gear = el('button', 'fx-gear');
    gear.type = 'button';
    gear.title = 'Эффекты страницы';
    gear.setAttribute('aria-label', 'Эффекты страницы');
    gear.setAttribute('aria-expanded', 'false');
    gear.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/>' +
      '<circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></svg>';
    var card = el('div', 'fx-pick');
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', 'Эффекты страницы');
    card.appendChild(el('h2', 'side-title', 'Эффекты'));
    var row = el('div', 'fx-pick-row');
    [['auto', 'Авто', 'Как просит Windows и как тянет компьютер'],
     ['full', 'Все', 'Всегда полностью'],
     ['off', 'Без', 'Ничего не движется, размытого фона нет']].forEach(function (m) {
      var b = el('button', null, m[1]);
      b.type = 'button';
      b.title = m[2];
      b.setAttribute('data-fx', m[0]);
      row.appendChild(b);
    });
    card.appendChild(row);
    var note = el('p', 'fx-pick-note');
    card.appendChild(note);
    dock.appendChild(gear);
    dock.appendChild(card);

    function show() {
      var btns = row.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        var on = btns[i].getAttribute('data-fx') === fx.mode;
        btns[i].classList.toggle('on', on);
        btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
      var now = fx.still && fx.flat ? 'без движения и без размытого фона'
              : fx.still ? 'без движения'
              : fx.flat ? 'без размытого фона'
              : 'всё включено';
      note.textContent = 'Сейчас: ' + now + (fx.mode === 'auto' && fx.why ? ' — ' + fx.why : '') + '.';
    }
    function open(on) {
      dock.classList.toggle('open', on);
      gear.setAttribute('aria-expanded', on ? 'true' : 'false');
    }
    gear.addEventListener('click', function () { open(!dock.classList.contains('open')); });
    row.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button[data-fx]');
      if (b) { fx.set(b.getAttribute('data-fx')); }
    });
    document.addEventListener('click', function (e) {
      if (dock.classList.contains('open') && !dock.contains(e.target)) { open(false); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dock.classList.contains('open')) { open(false); gear.focus(); }
    });
    document.addEventListener('crh:fx', show);
    show();
    return dock;
  };
})();
