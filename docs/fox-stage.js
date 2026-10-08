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

   В сильных местах трека вокруг контура лисёнка разгорается радуга, а снизу
   экрана летят фиолетовые огоньки; на дропе — залпом. Силу и дропы считает
   плеер из кадров .viz (CRH_PLAYER.surge(), --viz-surge). Радуга — слой
   под картинкой с маской по её же силуэту, размытый наружу; огоньки — на
   canvas за лисёнком, пока сцена открыта. Фон сцены — прожекторы, кольцо
   спектра, волны на долю и пол — в fox-stage-bg.js, слова — в fox-lyrics.js.
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  var NEED = 10;           /* сколько нажатий подряд */
  var GAP_MS = 1500;       /* перерыв, после которого счёт начинается заново */
  var FLY_MS = 900;        /* полёт на сцену и обратно (как в site.css) */

  var count = 0, resetTimer = 0, home = null, layer = null, fly = null, img = null, closeBtn = null;
  var leaving = false;
  var glow = null, rainbow = null, sparks = null;

  function setSrc(src) {
    img.src = src;
    var url = 'url("' + src.replace(/"/g, '%22') + '")';
    rainbow.style.webkitMaskImage = rainbow.style.maskImage = url;
  }

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
    fly.setAttribute('data-viz', '');      /* танцует по --viz-… (music-widget.js) */
    glow = el('div', 'fox-stage-glow');    /* радуга по контуру: размытие снаружи, */
    rainbow = el('div', 'fox-stage-rainbow');   /* маска по силуэту внутри */
    glow.appendChild(rainbow);
    fly.appendChild(glow);
    img = el('img', 'fox-stage-img');
    img.alt = '';
    setSrc(src);
    fly.appendChild(img);
    sparks = el('canvas', 'fox-stage-sparks');
    closeBtn = el('button', 'fox-stage-close');
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.title = 'Вернуть страницу (Esc)';
    closeBtn.setAttribute('aria-label', 'Вернуть страницу');
    closeBtn.addEventListener('click', exit);
    layer.appendChild(sparks);
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
    if (!layer) { build(pic.src); } else { setSrc(pic.src); }
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
    startSparks();
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

  /* ── огоньки снизу ──
     Частота — по силе (квадрат: в спокойных местах почти ничего, в сильных —
     густо), на дропе — залп. Цвет — акцент страницы (--accent, --accent2);
     рисуются готовым размытым кружком с наложением 'lighter', чтобы рядом
     летящие светились ярче, а не перекрывали друг друга. */
  var RATE = 70;           /* огоньков в секунду на полной силе */
  var BURST = 70;          /* залп на дропе, при силе дропа 1 — вдвое больше */
  var ctx = null, parts = [], sparkRaf = 0, sparkLast = 0, dropsSeen = -1, sprites = null, spawnAcc = 0;

  function sprite(color) {
    var c = document.createElement('canvas'), n = 64;
    c.width = c.height = n;
    var g = c.getContext('2d'), r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.18, color);
    r.addColorStop(0.45, color.replace(/rgb\(([^)]+)\)/, 'rgba($1,.35)'));
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, n, n);
    return c;
  }
  function rgbOf(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    var m = /^#([0-9a-f]{6})$/i.exec(v);
    if (!m) { return 'rgb(139,92,246)'; }
    var x = parseInt(m[1], 16);
    return 'rgb(' + (x >> 16) + ',' + (x >> 8 & 255) + ',' + (x & 255) + ')';
  }

  function sizeSparks() {
    var r = Math.min(2, window.devicePixelRatio || 1);
    sparks.width = Math.round(window.innerWidth * r);
    sparks.height = Math.round(window.innerHeight * r);
  }

  function spawn(n, k) {
    var w = sparks.width, h = sparks.height, r = sparks.width / window.innerWidth;
    for (var i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * w, y: h + 10 * r,
        vx: (Math.random() - 0.5) * 40 * r,
        vy: -(160 + Math.random() * 320) * (0.75 + 0.5 * k) * r,
        size: (6 + Math.random() * 12) * r,
        life: 0, ttl: 1.8 + Math.random() * 2.2,
        wob: Math.random() * 6.28, sp: sprites[Math.random() < 0.65 ? 0 : 1]
      });
    }
  }

  function sparkTick(now) {
    sparkRaf = 0;
    var dt = sparkLast ? Math.min(0.05, (now - sparkLast) / 1000) : 1 / 60;
    sparkLast = now;
    var on = layer && layer.classList.contains('on') && !still();
    var s = on && player().surge ? player().surge() : { level: 0, drops: dropsSeen, force: 0 };
    if (dropsSeen < 0) { dropsSeen = s.drops; }
    if (on && s.drops !== dropsSeen) {
      spawn(Math.round(BURST * (1 + s.force)), 1);
    }
    dropsSeen = s.drops;
    if (on && parts.length < 600) {
      spawnAcc += RATE * s.level * s.level * dt;
      var n = Math.floor(spawnAcc);
      spawnAcc -= n;
      if (n) { spawn(n, s.level); }
    }

    ctx.clearRect(0, 0, sparks.width, sparks.height);
    ctx.globalCompositeOperation = 'lighter';
    var h = sparks.height;
    parts = parts.filter(function (p) {
      p.life += dt;
      if (p.life > p.ttl || p.y < -40) { return false; }
      p.wob += dt * 3;
      p.x += (p.vx + Math.sin(p.wob) * 18) * dt;
      p.y += p.vy * dt;
      p.vy *= 1 - 0.25 * dt;                    /* к верху притормаживают */
      var a = Math.min(1, p.life / 0.25) * (1 - p.life / p.ttl) * Math.min(1, p.y / (h * 0.25));
      if (a <= 0) { return true; }
      ctx.globalAlpha = a;
      var sz = p.size * (0.7 + 0.3 * (1 - p.life / p.ttl));
      ctx.drawImage(p.sp, p.x - sz, p.y - sz, sz * 2, sz * 2);
      return true;
    });
    ctx.globalAlpha = 1;
    if (on || parts.length) { sparkRaf = requestAnimationFrame(sparkTick); }
    else { ctx.clearRect(0, 0, sparks.width, sparks.height); sparkLast = 0; }
  }

  function startSparks() {
    if (!sparks.getContext) { return; }
    ctx = ctx || sparks.getContext('2d');
    sprites = sprites || [sprite(rgbOf('--accent', '#8b5cf6')), sprite(rgbOf('--accent2', '#a78bfa'))];
    sizeSparks();
    dropsSeen = -1;
    if (!sparkRaf) { sparkLast = 0; sparkRaf = requestAnimationFrame(sparkTick); }
  }
  window.addEventListener('resize', function () { if (home && sparks) { sizeSparks(); } });

  document.addEventListener('keydown', function (e) {
    if (!home || leaving) { return; }
    if (e.key === 'Escape') { exit(); }
    else if (e.key === 'ArrowRight') { player().skip(1); }
    else if (e.key === 'ArrowLeft') { player().skip(-1); }
  });
})();
