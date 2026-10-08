/* ─────────────────────────────────────────────────────────────────────────────
   fox-stage-bg.js — живой фон сцены (fox-stage.js).

   Пока лисёнок на сцене, за ним — концертный свет, и всё ходит под музыку:
     · прожекторы сверху — качаются в такт (--viz-sway), вспыхивают на доле;
     · кольцо-эквалайзер вокруг лисёнка — 8 полос спектра, разложенных по
       кругу зеркально (бас внизу, верха сверху), медленно вращается;
     · волны от лисёнка — расходятся на каждой сильной доле;
     · неоновый пол — сетка в перспективе, едет навстречу тем быстрее, чем
       громче, и разгорается на басу.
   В сильных местах (CRH_PLAYER surge) цвета уходят от фиолетового в радугу.

   Данные — CRH_PLAYER.bands(): те же кадры .viz, что у столбиков плеера, так
   что фон ни на кадр не расходится с ними. Без движения (fx-still) фона нет.
   Холст в пол-разрешения: всё на нём мягкое, а заливка всего экрана на
   144 Гц иначе стоила бы дороже самого лисёнка.
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  var SCALE = 0.5;         /* разрешение холста от размера окна */
  var RAYS = 96;           /* лучей в кольце-эквалайзере */
  var BEAMS = 4;           /* прожекторов */

  var cv = null, ctx = null, raf = 0, last = 0;
  var spin = 0, floorPos = 0, prevBeat = 0, waves = [], hue = 0;
  var acc = [139, 92, 246], acc2 = [167, 139, 250];

  function player() { return window.CRH_PLAYER; }
  function still() { return (window.CRH_FX || {}).still; }

  function rgbOf(name, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var m = /^#([0-9a-f]{6})$/i.exec(v);
    if (!m) { return fb; }
    var x = parseInt(m[1], 16);
    return [x >> 16, x >> 8 & 255, x & 255];
  }
  /* цвет: акцент страницы, а в сильном месте — к радуге со сдвигом off */
  function col(base, off, surge, a) {
    var r = base[0], g = base[1], b = base[2];
    if (surge > 0.02) {
      var h = (hue + off) % 360 / 60, c = [0, 0, 0], i = Math.floor(h), f = h - i;
      var q = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][i % 6];
      for (var k = 0; k < 3; k++) { c[k] = 80 + 175 * q[k]; }
      var m = Math.min(1, surge * 1.2);
      r += (c[0] - r) * m; g += (c[1] - g) * m; b += (c[2] - b) * m;
    }
    return 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')';
  }

  function size() {
    cv.width = Math.max(1, Math.round(window.innerWidth * SCALE));
    cv.height = Math.max(1, Math.round(window.innerHeight * SCALE));
  }

  /* центр и размер лисёнка в координатах холста */
  function foxBox() {
    var fly = document.querySelector('.fox-stage-fly');
    if (!fly) { return { x: cv.width / 2, y: cv.height / 2, r: cv.height * 0.3, foot: cv.height * 0.8 }; }
    var b = fly.getBoundingClientRect();
    return {
      x: (b.left + b.width / 2) * SCALE, y: (b.top + b.height * 0.55) * SCALE,
      r: Math.max(b.width, b.height) * 0.5 * SCALE, foot: b.bottom * SCALE
    };
  }

  /* ── прожекторы ── */
  function beams(d, w, h) {
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < BEAMS; i++) {
      var side = i < BEAMS / 2 ? -1 : 1, k = i % (BEAMS / 2);
      var x0 = w * (0.5 + side * (0.22 + 0.2 * k));
      var swing = d.sway * 0.22 * (k ? -1 : 1) + Math.sin(spin * 0.6 + i * 1.7) * 0.08;
      var ang = Math.PI / 2 - side * (0.28 + 0.1 * k) + swing;    /* вниз и к центру */
      var len = h * 1.25, spread = 0.09 + 0.05 * d.level;
      var a = 0.05 + 0.16 * d.level + 0.28 * d.beat + 0.15 * d.surge;
      var g = ctx.createLinearGradient(x0, 0, x0 + Math.cos(ang) * len, Math.sin(ang) * len);
      g.addColorStop(0, col(k ? acc2 : acc, i * 90, d.surge, a));
      g.addColorStop(1, col(acc, i * 90, d.surge, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0, -4);
      ctx.lineTo(x0 + Math.cos(ang - spread) * len, Math.sin(ang - spread) * len);
      ctx.lineTo(x0 + Math.cos(ang + spread) * len, Math.sin(ang + spread) * len);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* ── неоновый пол ── */
  function floor(d, w, h, fox) {
    var top = Math.min(h * 0.9, fox.foot - fox.r * 0.25);     /* горизонт — чуть выше лап */
    var depth = h - top;
    if (depth < 10) { return; }
    var a = 0.1 + 0.25 * d.level + 0.35 * d.b[0];
    var fade = ctx.createLinearGradient(0, top, 0, h);
    fade.addColorStop(0, col(acc, 200, d.surge, 0));
    fade.addColorStop(1, col(acc, 200, d.surge, a));
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = fade;
    ctx.lineWidth = Math.max(1, 1.5 * SCALE * 2);
    ctx.beginPath();
    /* поперечные линии: равномерно по глубине мира, на экране сгущаются к горизонту */
    var N = 10;
    for (var i = 0; i < N; i++) {
      var z = ((i + floorPos) % N) / N;                       /* 0 — горизонт, 1 — у края */
      var y = top + depth * z * z;
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    /* продольные — к точке схода под лисёнком */
    for (var j = -12; j <= 12; j++) {
      ctx.moveTo(fox.x + j * w * 0.012, top);
      ctx.lineTo(fox.x + j * w * 0.16, h);
    }
    ctx.stroke();
  }

  /* ── кольцо-эквалайзер ── */
  function ring(d, fox) {
    var r0 = fox.r * 0.74, len = fox.r * 0.5;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, (2 * Math.PI * r0 / RAYS) * 0.45);
    for (var i = 0; i < RAYS; i++) {
      /* полоса по углу: бас внизу (0), верха сверху; правая половина — зеркало левой */
      var u = i / RAYS, m = u < 0.5 ? u * 2 : (1 - u) * 2;
      var p = m * 7, lo = Math.floor(p), t = p - lo;
      var v = d.b[lo] * (1 - t) + d.b[Math.min(7, lo + 1)] * t;
      var ang = Math.PI / 2 + u * 2 * Math.PI + spin * 0.15;
      var l = len * (0.05 + v * (0.8 + 0.4 * d.surge));
      var c = Math.cos(ang), s = Math.sin(ang);
      ctx.strokeStyle = col(m > 0.5 ? acc2 : acc, u * 360, d.surge, 0.18 + 0.5 * v);
      ctx.beginPath();
      ctx.moveTo(fox.x + c * r0, fox.y + s * r0);
      ctx.lineTo(fox.x + c * (r0 + l), fox.y + s * (r0 + l));
      ctx.stroke();
    }
  }

  /* ── волны на долю ── */
  function wavesDraw(d, dt, fox) {
    /* доля: вспышка резко пошла вверх — новая волна, сильнее в сильном месте */
    if (d.beat > 0.35 && d.beat - prevBeat > 0.12 && waves.length < 8) {
      waves.push({ r: fox.r * 0.6, a: 0.25 + 0.35 * d.beat + 0.3 * d.surge, off: hue });
    }
    prevBeat = d.beat;
    ctx.globalCompositeOperation = 'lighter';
    var maxR = Math.hypot(cv.width, cv.height);
    waves = waves.filter(function (wv) {
      wv.r += dt * maxR * 0.55;
      wv.a *= Math.exp(-dt * 1.6);
      if (wv.a < 0.01 || wv.r > maxR) { return false; }
      ctx.strokeStyle = col(acc, wv.off - hue + 120, d.surge, wv.a);
      ctx.lineWidth = 2 + 6 * wv.a;
      ctx.beginPath();
      ctx.arc(fox.x, fox.y, wv.r, 0, 2 * Math.PI);
      ctx.stroke();
      return true;
    });
  }

  function tick(now) {
    raf = 0;
    /* рисует, пока сцена в документе: уходя, она гаснет вместе с фоном (site.css) */
    var stage = document.querySelector('.fox-stage');
    if (!stage || still()) { if (cv && cv.parentNode) { cv.parentNode.removeChild(cv); } waves = []; return; }
    raf = requestAnimationFrame(tick);
    if (cv.parentNode !== stage) { stage.insertBefore(cv, stage.firstChild); size(); }
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;

    var d = player() && player().bands ? player().bands() : null;
    d = d || { b: [0, 0, 0, 0, 0, 0, 0, 0], level: 0, beat: 0, sway: 0, surge: 0 };
    spin += dt * (0.3 + 1.2 * d.level);
    floorPos += dt * (0.4 + 2.6 * d.level + 1.5 * d.surge);
    hue = (hue + dt * (40 + 120 * d.surge)) % 360;

    var w = cv.width, h = cv.height, fox = foxBox();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    /* мягкое пятно света за лисёнком — дышит на басу */
    var halo = ctx.createRadialGradient(fox.x, fox.y, 0, fox.x, fox.y, fox.r * (1.4 + 0.4 * d.b[0]));
    halo.addColorStop(0, col(acc, 300, d.surge, 0.12 + 0.25 * d.b[0] + 0.15 * d.surge));
    halo.addColorStop(1, col(acc, 300, d.surge, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    beams(d, w, h);
    floor(d, w, h, fox);
    wavesDraw(d, dt, fox);
    ring(d, fox);
  }

  function start() {
    if (still()) { return; }
    if (!cv) {
      cv = document.createElement('canvas');
      cv.className = 'fox-stage-bg';
      cv.setAttribute('aria-hidden', 'true');
      ctx = cv.getContext && cv.getContext('2d');
      if (!ctx) { cv = null; return; }
    }
    acc = rgbOf('--accent', acc);
    acc2 = rgbOf('--accent2', acc2);
    last = 0;
    if (!raf) { raf = requestAnimationFrame(tick); }
  }

  /* сцена открывается классом на body (fox-stage.js) */
  new MutationObserver(function () {
    if (document.body.classList.contains('fox-stage-on')) { start(); }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('resize', function () { if (cv && cv.parentNode) { size(); } });
})();
