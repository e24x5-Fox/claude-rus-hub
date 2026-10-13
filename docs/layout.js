/* ─────────────────────────────────────────────────────────────────────────────
   layout.js — переход между раскладками «три колонки» и «каталог + статистика».

   Порог — 1760px, тот же, что WIDE в donors-widget.js и music-widget.js. Шире
   него на <html> стоит класс trio: каталог по центру, боковые колонки до
   стенок окна. Класс ставит этот скрипт, а не @media, потому что для плавного
   перехода нужно поймать раскладку ДО смены: запоминаем, где стояли блоки,
   переключаем класс (виджеты в это же время сворачивают панель донатов и
   плеер своими обработчиками), измеряем новое место и ведём каждый блок от
   старого места к новому (FLIP). Каталог и статистика только едут — текст не
   растягивается. Панель донатов меняет ещё и размер, и её ничто не раздувает
   больше натуральной величины: прежний вид (копия) сжимается к новому месту
   и тает, а новый либо вырастает из маленького, либо проявляется на месте.
   Плеер копии не получает — он просто съезжает на новое место и проявляется.

   Анимация — свойствами translate и scale, а не transform: transform колонки
   статистики занят параллаксом (side.js). Подключается в <head> сразу после
   fx.js — класс должен стоять до первой отрисовки, иначе страница мигнёт
   узкой раскладкой.
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  var WIDE = window.matchMedia('(min-width: 1760px)');
  var root = document.documentElement;
  var MS = 420;
  var EASE = 'cubic-bezier(.2, .8, .2, 1)';

  root.classList.toggle('trio', WIDE.matches);

  /* что двигаем: колонки — только сдвигом, плавающие виджеты — и размером */
  var PARTS = [
    { sel: '.main-col' },
    { sel: '.side' },
    { sel: '.donors', resize: true },
    { sel: '.music', slide: true }
  ];

  function rect(el) {
    var r = el.getBoundingClientRect();
    return r.width || r.height ? r : null;
  }

  /* копия виджета в прежнем виде, на прежнем месте — она и сворачивается */
  function ghost(el, r) {
    var g = el.cloneNode(true);
    g.setAttribute('aria-hidden', 'true');
    g.removeAttribute('id');
    var st = g.style;
    st.position = 'fixed';
    st.left = r.left + 'px'; st.top = r.top + 'px';
    st.right = 'auto'; st.bottom = 'auto';
    st.width = r.width + 'px'; st.height = r.height + 'px';
    st.boxSizing = 'border-box';
    st.margin = '0';
    st.pointerEvents = 'none';
    st.transformOrigin = '0 0';
    document.body.appendChild(g);
    return g;
  }

  function change() {
    var fx = window.CRH_FX;
    var still = (fx && fx.still) || !document.body;
    var before = [];
    if (!still) {
      PARTS.forEach(function (p) {
        var el = document.querySelector(p.sel);
        if (!el) { return; }
        var r = rect(el);
        before.push({ el: el, p: p, r: r, g: p.resize && r ? ghost(el, r) : null });
      });
    }

    root.classList.toggle('trio', WIDE.matches);
    if (still) { return; }

    /* виджеты переключаются своими обработчиками того же события — они идут
       после этого; мерить новое место надо, когда отработают все, а до
       отрисовки кадра остаются только колбэки requestAnimationFrame */
    requestAnimationFrame(function () {
      dock();                       /* плеер — на место по новой раскладке до замера */
      var anims = [], ghosts = [];
      before.forEach(function (b) {
        var to = rect(b.el), from = b.r;
        if (b.g) { ghosts.push(b.g); }
        if (!from || !to) { if (b.g) { b.g.remove(); } return; }
        var dx = from.left - to.left, dy = from.top - to.top;

        if (b.p.slide) {
          /* плеер: без копии — две версии плеера рядом читаются как
             раздвоение. Он сам съезжает от прежнего места (по нижнему краю:
             к низу он и прижат) и проявляется */
          b.el.style.transformOrigin = '0 100%';
          anims.push(b.el.animate([
            { translate: dx + 'px ' + (from.bottom - to.bottom) + 'px', scale: '.92', opacity: 0 },
            { translate: '0px 0px', scale: '1', opacity: 1 }
          ], { duration: MS, easing: EASE }));
          return;
        }

        if (!b.p.resize) {
          if (!dx && !dy) { return; }
          anims.push(b.el.animate([{ translate: dx + 'px ' + dy + 'px' }, { translate: '0px 0px' }],
                                  { duration: MS, easing: EASE }));
          return;
        }

        var sx = to.width / from.width, sy = to.height / from.height;
        var grows = sx >= 1 && sy >= 1;
        /* копия: к новому месту; сжимается, если новое меньше, а большее
           место не догоняет — просто тает */
        anims.push(b.g.animate([
          { translate: '0px 0px', scale: '1 1', opacity: 1 },
          { translate: -dx + 'px ' + -dy + 'px',
            scale: grows ? '1 1' : Math.min(sx, 1) + ' ' + Math.min(sy, 1), opacity: 0 }
        ], { duration: grows ? MS * 0.5 : MS, easing: EASE }));
        b.el.style.transformOrigin = '0 0';
        if (grows) {
          /* разворачивается: растёт из прежнего, меньшего прямоугольника */
          anims.push(b.el.animate([
            { translate: dx + 'px ' + dy + 'px', scale: (1 / sx) + ' ' + (1 / sy), opacity: 0.2 },
            { translate: '0px 0px', scale: '1 1', opacity: 1 }
          ], { duration: MS, easing: EASE }));
        } else {
          /* сворачивается: новое, маленькое, проявляется на своём месте,
             пока копия к нему сжимается */
          b.el.style.transformOrigin = '0 100%';
          anims.push(b.el.animate([
            { scale: '.85', opacity: 0 }, { scale: '.85', opacity: 0, offset: 0.45 },
            { scale: '1', opacity: 1 }
          ], { duration: MS, easing: EASE }));
        }
      });
      if (!anims.length) { return; }
      /* пока блоки едут, они могут выйти за край окна — без мигающей
         горизонтальной прокрутки */
      root.style.overflowX = 'clip';
      Promise.all(anims.map(function (a) { return a.finished; })).then(done, done);
      function done() {
        root.style.overflowX = '';
        ghosts.forEach(function (g) { g.remove(); });
        before.forEach(function (b) { if (b.p.resize || b.p.slide) { b.el.style.transformOrigin = ''; } });
      }
    });
  }

  /* ── узкий экран: угол с пилюлей донатов, «Эффектами» и плеером ──
     Плеер стоит над тем, что открыто в углу: над пилюлей, над раскрытой
     панелью донатов или над карточкой «Эффектов» — иначе они ложатся на
     него. Панель донатов, со своей стороны, ниже на высоту плеера
     (--music-h в site.css), чтобы обоим хватало экрана. */
  var queued = false;
  function dock() {
    queued = false;
    var d = document.querySelector('.donors:not([aria-hidden])');
    var m = document.querySelector('.music:not([aria-hidden])');
    if (!d || !m) { return; }
    if (m.classList.contains('wide') || m.classList.contains('stage')) {
      m.style.bottom = '';
      root.style.removeProperty('--music-h');
      return;
    }
    root.style.setProperty('--music-h', m.offsetHeight + 'px');
    var top = d.getBoundingClientRect().top;
    var pick = d.querySelector('.fx-dock.open .fx-pick');
    if (pick) { top = Math.min(top, pick.getBoundingClientRect().top); }
    m.style.bottom = Math.max(16, Math.round(window.innerHeight - top + 8)) + 'px';
  }
  function soon() { if (!queued) { queued = true; requestAnimationFrame(dock); } }

  function watch() {
    var d = document.querySelector('.donors'), m = document.querySelector('.music');
    if (!d || !m) { return; }
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(soon);
      ro.observe(d); ro.observe(m);
      var pick = d.querySelector('.fx-pick');
      if (pick) { ro.observe(pick); }
    }
    var mo = new MutationObserver(soon);
    mo.observe(d, { attributes: true, attributeFilter: ['class'], subtree: true });
    mo.observe(m, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', soon);
    dock();
  }
  /* виджеты строятся скриптами в конце <body> */
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', watch); }
  else { watch(); }

  if (WIDE.addEventListener) { WIDE.addEventListener('change', change); }
  else if (WIDE.addListener) { WIDE.addListener(change); }
})();
