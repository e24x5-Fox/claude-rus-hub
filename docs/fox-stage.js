/* ─────────────────────────────────────────────────────────────────────────────
   fox-stage.js — пасхалка «сцена»: лисёнка нажали десять раз подряд.

   С каждым нажатием лисёнок чуть подрастает (пауза дольше GAP_MS — счёт
   заново). На десятом он вылетает со своего места в середину экрана и
   вырастает почти во весь рост, интерфейс за ним гаснет — остаются только он,
   размытая обложка на фоне и плеер, который растягивается на весь низ
   экрана и получает «назад» и «вперёд» (music-widget.js, CRH_PLAYER.stage).
   Если музыка стояла — включается: десять нажатий не бывают случайными.
   Лисёнок на сцене танцует по тем же --viz-… переменным, что и в шапке.

   Уйти со сцены — крестик в углу или Esc; лисёнок улетает обратно на своё
   место. Стрелки влево и вправо на сцене переключают трек.
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  var NEED = 10;           /* сколько нажатий подряд */
  var GAP_MS = 1500;       /* перерыв, после которого счёт начинается заново */
  var FLY_MS = 900;        /* полёт на сцену и обратно (как в site.css) */

  var count = 0, resetTimer = 0, home = null, layer = null, fly = null, img = null, closeBtn = null;
  var leaving = false;

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    return n;
  }
  function player() { return window.CRH_PLAYER; }
  function still() { return (window.CRH_FX || {}).still; }

  /* ── нажатия: лисёнок подрастает ── */
  document.addEventListener('click', function (e) {
    var m = e.target.closest && e.target.closest('.mascot');
    if (!m || home || !player()) { return; }
    count++;
    clearTimeout(resetTimer);
    if (count >= NEED) { count = 0; m.style.transform = ''; enter(m); return; }
    m.classList.add('fox-boop');
    m.style.transform = 'scale(' + (1 + count * 0.035).toFixed(3) + ')';
    resetTimer = setTimeout(function () { count = 0; m.style.transform = ''; }, GAP_MS);
  });

  /* ── сцена ── */
  function build(src) {
    layer = el('div', 'fox-stage');
    fly = el('div', 'fox-stage-fly');
    img = el('img', 'fox-stage-img');
    img.alt = '';
    img.src = src;
    fly.appendChild(img);
    closeBtn = el('button', 'fox-stage-close');
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.title = 'Вернуть страницу (Esc)';
    closeBtn.setAttribute('aria-label', 'Вернуть страницу');
    closeBtn.addEventListener('click', exit);
    layer.appendChild(fly);
    layer.appendChild(closeBtn);
    layer.setAttribute('aria-hidden', 'true');
  }

  /* сдвиг и масштаб, которые ставят лисёнка со сцены точно на место rect */
  function placeAt(rect) {
    fly.style.transition = 'none';
    fly.style.transform = '';
    var to = fly.getBoundingClientRect();
    var k = rect.width / Math.max(1, to.width);
    var dx = rect.left - to.left, dy = rect.top - to.top;
    return 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + k.toFixed(4) + ')';
  }

  function enter(m) {
    home = m;
    var pic = m.querySelector('img');
    var rect = m.getBoundingClientRect();
    if (!layer) { build(pic.src); } else { img.src = pic.src; }
    fly.style.aspectRatio = pic.naturalWidth && pic.naturalHeight
      ? pic.naturalWidth + ' / ' + pic.naturalHeight
      : rect.width + ' / ' + rect.height;
    document.body.appendChild(layer);

    var from = placeAt(rect);              /* стартует ровно с того места, где был */
    fly.style.transform = from;
    fly.offsetWidth;
    fly.style.transition = '';
    fly.style.transform = '';
    m.style.visibility = 'hidden';

    document.documentElement.classList.add('fox-stage-lock');
    document.body.classList.remove('fox-stage-back');
    document.body.classList.add('fox-stage-on');
    layer.classList.add('on');
    player().stage(true);
    player().play();
    setTimeout(function () { closeBtn.focus({ preventScroll: true }); }, 50);
  }

  function exit() {
    if (!home || leaving) { return; }
    leaving = true;
    var m = home;
    var to = placeAt(m.getBoundingClientRect());   /* с места на сцене — обратно домой */
    fly.style.transition = '';
    fly.style.transform = to;

    document.body.classList.remove('fox-stage-on');
    document.body.classList.add('fox-stage-back');
    layer.classList.remove('on');
    player().stage(false);

    setTimeout(function () {
      m.style.visibility = '';
      if (layer.parentNode) { layer.parentNode.removeChild(layer); }
      document.documentElement.classList.remove('fox-stage-lock');
      document.body.classList.remove('fox-stage-back');
      home = null;
      leaving = false;
    }, still() ? 0 : FLY_MS);
  }

  document.addEventListener('keydown', function (e) {
    if (!home || leaving) { return; }
    if (e.key === 'Escape') { exit(); }
    else if (e.key === 'ArrowRight') { player().skip(1); }
    else if (e.key === 'ArrowLeft') { player().skip(-1); }
  });
})();
