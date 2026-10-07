/* ─────────────────────────────────────────────────────────────────────────────
   music-widget.js — плеер с музыкой автора в левом углу, под донатерами.

   Данные — window.CRH_MUSIC из music.js.

   Одна строка: обложка, название с громкостью под ним, справа «играть».
   Свёрнутый — только обложка и «играть»; нажатие на обложку разворачивает.
   Треки идут по кругу сами, переключать и перематывать нечем — так задумано.

   Музыка не должна пугать: сама не играет (только по нажатию), громкость по
   умолчанию маленькая, а старт — плавный, с нуля. Громкость и свёрнут ли
   плеер запоминаются у посетителя в браузере; трек при каждом открытии
   страницы — случайный. Название ведёт на страницу трека в Suno.

   Чем ниже по странице, тем медленнее идёт трек; «Скачать» (событие
   crh:download из thanks-widget.js) тормозит его до нуля.

   Музыка качается только по «играть»; следующий трек подкачивается заранее,
   за PREFETCH_S секунд до конца текущего, чтобы переход шёл без паузы.
   Фон страницы — обложка текущего трека, тёмная и сильно размытая; при смене
   трека она плавно перетекает в следующую.
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  var data = window.CRH_MUSIC || {};
  var tracks = data.tracks || [];
  if (!tracks.length) { return; }

  var FX = window.CRH_FX || { still: false, flat: false };   /* fx.js */
  var VOLUME = 0.15;       /* громкость по умолчанию — тихо, фоном */
  var FADE_MS = 1800;      /* плавный старт */
  var KEY = 'crh-music';
  var WIDE = window.matchMedia('(min-width: 1760px)');

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  var saved = load();
  var volume = typeof saved.volume === 'number' ? Math.min(1, Math.max(0, saved.volume)) : VOLUME;
  var cur = Math.floor(Math.random() * tracks.length);   /* каждый раз — случайный */
  var folded = typeof saved.folded === 'boolean' ? saved.folded : null;   /* null — по ширине экрана */

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ volume: volume, folded: folded }));
    } catch (e) { /* без памяти — тоже можно */ }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function button(cls, label, text) {
    var b = el('button', cls, text);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.title = label;
    return b;
  }

  var audio = new Audio();
  audio.preload = 'none';                 /* не качать музыку, пока не попросили */

  /* ── фон: размытая обложка, два слоя для перетекания ── */
  var bg = el('div', 'music-bg');
  bg.setAttribute('aria-hidden', 'true');
  var layers = [el('div', 'music-bg-layer'), el('div', 'music-bg-layer')];
  bg.appendChild(layers[0]);
  bg.appendChild(layers[1]);

  /* Как колонка статистики: наверху страницы виден верх обложки, внизу — низ.
     Только очень медленно: две ступени сглаживания по BG_TAU секунд, фон
     доплывает до места секунды через три после того, как прокрутка встала. */
  var BG_TAU = 0.9;
  var pan = 0, panMid = 0, panTarget = 0, panRaf = 0, panLast = 0;
  function scrollShare() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }
  function placeBg() {
    /* запас хода — всё, что выше экрана, кроме полей под края размытия сверху и снизу */
    var room = Math.max(0, layers[0].offsetHeight - window.innerHeight * 1.3);
    var t = 'translate3d(0,' + (-pan * room).toFixed(1) + 'px,0)';
    layers[0].style.transform = layers[1].style.transform = t;
  }
  function panTick(now) {
    var dt = panLast ? Math.min(0.1, (now - panLast) / 1000) : 1 / 60;
    panLast = now;
    var a = 1 - Math.exp(-dt / BG_TAU);
    panMid += (panTarget - panMid) * a;
    pan += (panMid - pan) * a;
    if (Math.abs(panTarget - pan) < 0.0005 && Math.abs(panTarget - panMid) < 0.0005) { pan = panMid = panTarget; }
    placeBg();
    if (pan === panTarget) { panRaf = 0; panLast = 0; } else { panRaf = requestAnimationFrame(panTick); }
  }
  function panTo() {
    panTarget = scrollShare();
    if (FX.still) { cancelAnimationFrame(panRaf); panRaf = 0; pan = panMid = panTarget; placeBg(); return; }
    if (!panRaf) { panLast = 0; panRaf = requestAnimationFrame(panTick); }
  }
  window.addEventListener('scroll', panTo, { passive: true });
  document.addEventListener('crh:fx', function () { setBg(cover.src); panTo(); });
  window.addEventListener('resize', function () { placeBg(); panTo(); });
  var front = 0, bgSrc = '';

  /* Размытие — заранее, на холсте, по разу на обложку. BLUR_SOFT и BLUR_SHARP —
     в пикселях экрана, как было у CSS-фильтра; на холсте обложка мельче, чем
     на экране, поэтому радиус пересчитывается в её масштаб. */
  var BLUR_SOFT = 90, BLUR_SHARP = 24, TONE = ' saturate(1.3) brightness(.55)';
  var canBlur = (function () {
    try {
      var c = document.createElement('canvas').getContext('2d');
      c.filter = 'blur(1px)';
      return c.filter === 'blur(1px)';
    } catch (e) { return false; }
  })();
  function blurred(img, screenPx, cls) {
    var n = img.naturalWidth || 256;
    var scale = n / Math.max(1, layers[0].offsetWidth);   /* пиксель обложки в пикселях экрана */
    var r = screenPx * scale;
    /* края гаснут в прозрачность так же, как гасли у CSS-фильтра, —
       они всё равно за экраном (слой шире экрана на 15 % с каждой стороны) */
    var c = document.createElement('canvas');
    c.width = c.height = n;
    c.className = cls;
    var ctx = c.getContext('2d');
    ctx.filter = 'blur(' + r.toFixed(2) + 'px)' + TONE;
    ctx.drawImage(img, 0, 0, n, n);
    return c;
  }

  /* без тяжёлых эффектов фон не рисуется вовсе — ни холстов, ни загрузки;
     включили обратно — появляется обложка текущего трека */
  function setBg(src) {
    if (FX.flat) { bgSrc = ''; return; }
    if (src === bgSrc) { return; }
    bgSrc = src;
    var img = new Image();
    img.onload = function () {               /* показываем, только когда уже скачалась */
      if (src !== bgSrc) { return; }
      var old = layers[front];
      front ^= 1;
      var l = layers[front];
      l.textContent = '';
      if (canBlur) {
        l.style.backgroundImage = '';
        l.appendChild(blurred(img, BLUR_SOFT, 'soft'));
        l.appendChild(blurred(img, BLUR_SHARP, 'sharp'));
      } else {
        l.classList.add('css-blur');
        l.style.backgroundImage = 'url("' + src + '")';
      }
      l.classList.add('on');
      old.classList.remove('on');
    };
    img.src = src;
  }

  /* ── разметка ── */
  var box = el('aside', 'music');
  box.setAttribute('aria-label', 'Музыка автора');

  var coverBtn = button('music-cover-btn', 'Развернуть плеер', null);
  var cover = el('img', 'music-cover');
  cover.alt = '';
  cover.width = 48; cover.height = 48;
  coverBtn.appendChild(cover);

  var info = el('div', 'music-info');
  var title = el('a', 'music-title');
  title.target = '_blank';
  title.rel = 'noopener';
  var artist = el('div', 'music-artist', (data.artist || '') + ' · Suno');
  var volRow = el('label', 'music-vol-row');
  volRow.title = 'Громкость';
  var vol = el('input', 'music-vol');
  vol.type = 'range'; vol.min = 0; vol.max = 100; vol.value = Math.round(volume * 100);
  vol.setAttribute('aria-label', 'Громкость');
  volRow.appendChild(el('span', 'music-vol-ico'));
  volRow.appendChild(vol);
  info.appendChild(title);
  info.appendChild(artist);
  info.appendChild(volRow);

  var play = button('music-play ico-play', 'Играть', null);
  var fold = button('music-fold', 'Свернуть', '×');

  box.appendChild(coverBtn);
  box.appendChild(info);
  box.appendChild(play);
  box.appendChild(fold);

  /* ── воспроизведение ── */
  var fadeTimer = null;
  /* fromHere — нарастать с текущей громкости, а не с нуля (разворот торможения) */
  function fadeIn(fromHere) {
    clearInterval(fadeTimer);
    var start = Date.now();
    var v0 = fromHere ? audio.volume : 0;
    audio.volume = v0;
    fadeTimer = setInterval(function () {
      var k = Math.min(1, (Date.now() - start) / FADE_MS);
      audio.volume = v0 + (volume - v0) * k;
      if (k >= 1) { clearInterval(fadeTimer); }
    }, 50);
  }

  function show() {
    var t = tracks[cur];
    title.textContent = t.title;
    if (t.suno) {
      title.href = 'https://suno.com/song/' + t.suno;
      title.title = t.title + ' — открыть в Suno';
    } else {
      title.removeAttribute('href');
      title.title = t.title;
    }
    cover.src = 'music/' + t.file + '.jpg';
    setBg(cover.src);
    coverBtn.title = t.title + ' — развернуть';
  }

  /* следующий трек качается целиком заранее, в blob: так он точно в памяти,
     а не «где-то в кэше», и переход идёт без паузы на загрузку */
  var PREFETCH_S = 30;
  var next = null, blobUrl = null;
  function prefetch() {
    var i = (cur + 1) % tracks.length;
    if (next && next.i === i) { return; }
    var n = next = { i: i, url: null };
    new Image().src = 'music/' + tracks[i].file + '.jpg';   /* и обложку для фона */
    if (!window.fetch || !window.URL || !URL.createObjectURL) { return; }
    fetch('music/' + tracks[i].file + '.mp3').then(function (r) {
      if (!r.ok) { throw new Error(r.status); }
      return r.blob();
    }).then(function (b) {
      if (next === n) { n.url = URL.createObjectURL(b); }
    }).catch(function () { /* не вышло — возьмём по сети в момент смены */ });
  }
  audio.addEventListener('timeupdate', function () {
    if (audio.duration && audio.duration - audio.currentTime < PREFETCH_S) { prefetch(); }
  });

  function pick(i) {
    cur = (i + tracks.length) % tracks.length;
    var url = next && next.i === cur && next.url ? next.url : 'music/' + tracks[cur].file + '.mp3';
    next = null;
    if (blobUrl && blobUrl !== url) { URL.revokeObjectURL(blobUrl); }
    blobUrl = url.indexOf('blob:') === 0 ? url : null;
    audio.src = url;
    show();
    save();
  }

  function go() {
    if (!audio.src) { pick(cur); }
    fadeIn();
    var p = audio.play();
    if (p && p.catch) { p.catch(function () { /* браузер не дал — ждём следующего нажатия */ }); }
  }

  play.addEventListener('click', function () {
    if (stopping) { return; }
    stoppedByDownload = false;              /* сам нажал — сам и решает */
    audio.paused ? go() : audio.pause();
  });
  audio.addEventListener('ended', function () { pick(cur + 1); go(); });

  audio.addEventListener('play', function () {
    play.classList.replace('ico-play', 'ico-pause');
    play.setAttribute('aria-label', 'Пауза'); play.title = 'Пауза';
    box.classList.add('playing');
    document.body.classList.add('music-playing');
  });
  audio.addEventListener('pause', function () {
    play.classList.replace('ico-pause', 'ico-play');
    play.setAttribute('aria-label', 'Играть'); play.title = 'Играть';
    box.classList.remove('playing');
    document.body.classList.remove('music-playing');
  });

  /* ── скорость: чем ниже по странице, тем медленнее; «Скачать» — стоп ──
     Наверху трек идёт как есть, в самом низу — на BOTTOM_RATE, между ними
     плавно по положению прокрутки. Высоту тона не сохраняем: так замедление
     звучит как притормозившая пластинка, а не как растянутый голос. */
  var BOTTOM_RATE = 0.88;  /* скорость в самом низу страницы */
  var MIN_RATE = 0.07;     /* ниже 0.0625 Chrome не пускает */
  audio.preservesPitch = false;
  audio.mozPreservesPitch = false;
  audio.webkitPreservesPitch = false;

  /* Скорость догоняет цель через промежуточную точку mid — два сглаживания
     подряд: так она трогается мягко, без рывка на первом кадре, и так же
     мягко садится. TAU — постоянная времени одной ступени, по часам, а не по
     кадрам: на 144 Гц и на 60 Гц звучит одинаково. */
  var TAU = 0.35;
  var rate = 1, mid = 1, target = 1, raf = 0, last = 0, stopping = false;
  var stoppedByDownload = false, resuming = false, stopRun = 0;
  function setRate(v) { rate = mid = v; audio.playbackRate = v; }
  function tick(now) {
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    var a = 1 - Math.exp(-dt / TAU);
    mid += (target - mid) * a;
    rate += (mid - rate) * a;
    if (Math.abs(target - rate) < 0.001 && Math.abs(target - mid) < 0.001) { rate = mid = target; }
    audio.playbackRate = rate;
    if (rate === target) { raf = 0; last = 0; } else { raf = requestAnimationFrame(tick); }
  }
  function glide(to) {
    target = to;
    if (!raf) { last = 0; raf = requestAnimationFrame(tick); }
  }

  /* скорость для текущего места на странице: 1 наверху, BOTTOM_RATE внизу */
  function depthRate() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var k = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    return 1 - (1 - BOTTOM_RATE) * k;
  }
  window.addEventListener('scroll', function () {
    if (!stopping) { glide(depthRate()); }
  }, { passive: true });
  /* смена трека сбрасывает скорость браузером — возвращаем её на место */
  audio.addEventListener('play', function () {
    if (resuming) {                       /* после «Скачать» — разгон с нуля */
      resuming = false;
      setRate(MIN_RATE);
      glide(depthRate());
      return;
    }
    cancelAnimationFrame(raf); raf = 0;
    target = depthRate();
    setRate(target);
  });

  /* «Скачать» — трек тормозит до нуля за секунду, как остановленная кассета */
  document.addEventListener('crh:download', function () {
    if (audio.paused || stopping) { return; }
    stopping = true;
    var run = ++stopRun;
    cancelAnimationFrame(raf); raf = 0;
    clearInterval(fadeTimer);
    var from = audio.playbackRate, v0 = audio.volume, t0 = Date.now(), DUR = 1000;
    (function step() {
      if (run !== stopRun) { return; }       /* плашку закрыли раньше, чем трек встал */
      var k = Math.min(1, (Date.now() - t0) / DUR);
      var e = k * k;                          /* сначала медленно, потом обрыв */
      audio.playbackRate = Math.max(MIN_RATE, from - (from - MIN_RATE) * e);
      audio.volume = v0 * (1 - Math.max(0, (k - 0.6) / 0.4));
      if (k < 1) { requestAnimationFrame(step); return; }
      audio.pause();
      target = depthRate();
      setRate(target);
      audio.volume = volume;
      stopping = false;
      stoppedByDownload = true;
    })();
  });

  /* Плашку закрыли — трек разгоняется обратно до скорости, положенной по
     месту на странице, как кассета после паузы. Если его не «Скачать»
     остановило (уже стоял, или его поставили на паузу сами), — не трогаем. */
  document.addEventListener('crh:thanks-closed', function () {
    if (stopping) {                         /* ещё тормозил — разворачиваем на ходу */
      stopRun++;
      stopping = false;
      setRate(audio.playbackRate);
      glide(depthRate());
      fadeIn(true);
      return;
    }
    if (!stoppedByDownload) { return; }
    stoppedByDownload = false;
    resuming = true;
    go();
  });
  audio.addEventListener('pause', function () { if (!stopping) { resuming = false; } });

  vol.addEventListener('input', function () {
    volume = vol.value / 100;
    clearInterval(fadeTimer);
    audio.volume = volume;
    save();
  });

  /* ── свёрнут / развёрнут ── */
  function apply() {
    var f = folded === null ? !WIDE.matches : folded;
    box.classList.toggle('folded', f);
    coverBtn.setAttribute('aria-expanded', f ? 'false' : 'true');
    coverBtn.setAttribute('aria-label', f ? 'Развернуть плеер' : 'Обложка');
  }
  coverBtn.addEventListener('click', function () {
    if (!box.classList.contains('folded')) { return; }
    folded = false; save(); apply();
  });
  fold.addEventListener('click', function () { folded = true; save(); apply(); });

  function fit() {
    box.classList.toggle('wide', WIDE.matches);
    apply();
  }
  if (WIDE.addEventListener) { WIDE.addEventListener('change', fit); }
  else if (WIDE.addListener) { WIDE.addListener(fit); }

  show();
  document.body.insertBefore(bg, document.body.firstChild);
  pan = panMid = panTarget = scrollShare();   /* открыли посреди страницы — фон сразу на месте */
  placeBg();
  document.body.appendChild(box);
  document.body.classList.add('has-music');
  fit();
})();
