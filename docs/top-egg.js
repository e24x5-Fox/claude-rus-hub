/* ─────────────────────────────────────────────────────────────────────────────
   top-egg.js — пасхалка у верхнего края страницы.

   Страница уже наверху, а её всё крутят вверх (колесо, тачпад, стрелка или
   PageUp) — копится «напор». Пока давят, напор растёт; отпустили — за
   полсекунды-секунду стекает. Его сила (0…1) уходит событием crh:top-push,
   и плеер (music-widget.js) на ней разгоняет трек. Давят дольше EGG_MS без
   перерыва — сверху выезжает лисёнок: если музыка играет, про то, что трек и
   так шустрый, как он за переводом, если нет — что пасхалки тут есть.

   Пальцем не ловится: на телефоне это жест «потянуть, чтобы обновить», и
   вместо пасхалки страница бы перезагрузилась.
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  var FULL = 1400;         /* напор в пикселях прокрутки, при котором разгон полный */
  var TAU = 0.6;           /* за сколько секунд напор стекает примерно втрое */
  var GAP_MS = 600;        /* перерыв, после которого давят «заново» */
  var EGG_MS = 2200;       /* сколько давить без перерыва до пасхалки */
  var HIDE_MS = 8000;      /* сама уезжает, если не закрыли */

  var pressure = 0, start = 0, lastIn = 0, lastTick = 0, timer = 0;

  function emit() {
    var k = Math.min(1, pressure / FULL);
    try { document.dispatchEvent(new CustomEvent('crh:top-push', { detail: k })); } catch (e) { /* старый браузер */ }
  }

  function tick() {
    var now = Date.now();
    var dt = (now - lastTick) / 1000;
    lastTick = now;
    if (now - lastIn > 120) { pressure *= Math.exp(-dt / TAU); }   /* пока давят — не стекает */
    if (pressure < 5) {
      pressure = 0;
      clearInterval(timer); timer = 0;
    }
    emit();
  }

  function push(px) {
    var now = Date.now();
    if (now - lastIn > GAP_MS) { start = now; }
    lastIn = now;
    pressure = Math.min(FULL * 1.3, pressure + px);
    if (!timer) { lastTick = now; timer = setInterval(tick, 50); }
    emit();
    if (now - start > EGG_MS) { show(); }
  }

  function atTop() { return window.scrollY <= 0; }

  window.addEventListener('wheel', function (e) {
    if (e.deltaY >= 0 || e.ctrlKey || !atTop()) { return; }   /* ctrl+колесо — это масштаб */
    var px = -e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1);
    push(px);
  }, { passive: true });

  document.addEventListener('keydown', function (e) {
    if (!atTop() || e.altKey || e.ctrlKey || e.metaKey) { return; }
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) { return; }
    if (e.key === 'ArrowUp') { push(120); }
    else if (e.key === 'PageUp' || e.key === 'Home') { push(300); }
  });

  /* ── сама пасхалка ── */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text != null) { n.textContent = text; }
    return n;
  }
  var egg = null, msg = null, hideTimer = null;

  function build() {
    egg = el('div', 'top-egg');
    egg.setAttribute('role', 'status');
    egg.setAttribute('aria-live', 'polite');
    var img = el('img', 'top-egg-mascot');
    img.src = 'assets/mascot-wave.png';
    img.alt = '';
    msg = el('p', 'top-egg-text');
    var x = el('button', 'donors-close top-egg-close', '×');
    x.type = 'button';
    x.title = 'Закрыть';
    x.addEventListener('click', hide);
    egg.appendChild(img);
    egg.appendChild(msg);
    egg.appendChild(x);
    document.body.appendChild(egg);
    egg.offsetWidth;          /* чтобы выезд сверху сыграл с первого раза */
  }

  function show() {
    if (egg && egg.classList.contains('show')) { return; }
    if (!egg) { build(); }
    msg.textContent = document.body.classList.contains('music-playing')
      ? 'Куда быстрее? Трек и так шустрый, как лисёнок за переводом игр :3'
      : 'Лисёнок видит, что вы упорно ищете пасхалки. И они тут есть :3';
    egg.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, HIDE_MS);
  }

  function hide() {
    clearTimeout(hideTimer);
    if (egg) { egg.classList.remove('show'); }
    start = Date.now();       /* ещё одна — только за новый напор */
  }

  /* ушли вниз — пасхалка уезжает */
  window.addEventListener('scroll', function () {
    if (egg && egg.classList.contains('show') && window.scrollY > 200) { hide(); }
  }, { passive: true });
})();
