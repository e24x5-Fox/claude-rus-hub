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

   Чем ниже по странице, тем медленнее идёт трек, а если наверху крутят
   дальше вверх — разгоняется (crh:top-push из top-egg.js), но только после
   того, как вернулся к своему обычному темпу; «Скачать» (событие
   crh:download из thanks-widget.js) тормозит его до нуля.

   Плеер шевелится под музыку по заранее записанным кадрам (music/<имя>.viz,
   tools/music_viz.py), звук на странице не анализируется.

   Музыка качается только по «играть»; следующий трек подкачивается заранее,
   за PREFETCH_S секунд до конца текущего, чтобы переход шёл без паузы.
   Фон страницы — обложка текущего трека, тёмная и сильно размытая; при смене
   трека она плавно перетекает в следующую.

   Треки не обрываются в тишину, а заезжают друг на друга, как на пульте с
   двумя деками: за XF_S секунд до конца уходящий тормозит, как пластинка, и
   гаснет, а следующий в это же время трогается медленно, с IN_START,
   разгоняется до нормы и набирает громкость. Первый трек по «играть» тоже
   трогается с разгона.
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

  /* две деки: на переходе играют обе. audio — та, что сейчас главная */
  function deck() {
    var a = new Audio();
    a.preload = 'none';                   /* не качать музыку, пока не попросили */
    /* высоту тона не сохраняем: замедление звучит как притормозившая
       пластинка, а не как растянутый голос */
    a.preservesPitch = a.mozPreservesPitch = a.webkitPreservesPitch = false;
    return a;
  }
  var decks = [deck(), deck()];
  var audio = decks[0];
  /* события — только от главной деки: уходящая на переходе своё отыграла */
  function on(type, fn) {
    decks.forEach(function (d) {
      d.addEventListener(type, function (e) { if (e.target === audio) { fn(e); } });
    });
  }

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
  /* переключать треки можно только на сцене (fox-stage.js) — в углу их нет */
  var prev = button('music-skip ico-prev', 'Предыдущий трек', null);
  var nextBtn = button('music-skip ico-next', 'Следующий трек', null);

  /* столбики анимации — под всем остальным (см. «анимация плеера» ниже) */
  var vizCanvas = el('canvas', 'music-viz');
  vizCanvas.setAttribute('aria-hidden', 'true');

  box.appendChild(vizCanvas);
  box.appendChild(coverBtn);
  box.appendChild(info);
  box.appendChild(prev);
  box.appendChild(play);
  box.appendChild(nextBtn);
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
  var next = null;
  function prefetch() {
    var i = (cur + 1) % tracks.length;
    if (next && next.i === i) { return; }
    var n = next = { i: i, url: null };
    new Image().src = 'music/' + tracks[i].file + '.jpg';   /* и обложку для фона */
    loadViz(tracks[i].file);                                  /* и кадры анимации */
    if (!window.fetch || !window.URL || !URL.createObjectURL) { return; }
    fetch('music/' + tracks[i].file + '.mp3').then(function (r) {
      if (!r.ok) { throw new Error(r.status); }
      return r.blob();
    }).then(function (b) {
      if (next === n) { n.url = URL.createObjectURL(b); }
    }).catch(function () { /* не вышло — возьмём по сети в момент смены */ });
  }
  on('timeupdate', function () {
    if (audio.duration && audio.duration - audio.currentTime < PREFETCH_S) { prefetch(); }
    if (needXfade()) { startXfade(); }
  });

  /* blob держит та дека, что его играет: на переходе уходящая ещё читает свой */
  function pick(i) {
    cur = (i + tracks.length) % tracks.length;
    var url = next && next.i === cur && next.url ? next.url : 'music/' + tracks[cur].file + '.mp3';
    next = null;
    if (audio.blob && audio.blob !== url) { URL.revokeObjectURL(audio.blob); }
    audio.blob = url.indexOf('blob:') === 0 ? url : null;
    audio.src = url;
    audio.file = tracks[cur].file;         /* по нему — кадры анимации */
    loadViz(audio.file);
    show();
    save();
  }

  function go() {
    if (!audio.src) { pick(cur); }
    if (audio.currentTime < 0.3 && !resuming) { rampIn(false); }   /* с начала — с разгона */
    fadeIn();
    var p = audio.play();
    if (p && p.catch) { p.catch(function () { /* браузер не дал — ждём следующего нажатия */ }); }
  }

  /* ── переход между треками ──
     mult — множитель скорости главной деки поверх скорости по прокрутке;
     у уходящей свой, xf.mult. Уходящая тормозит сначала едва, потом всё
     круче (k²); входящая — наоборот, трогается быстро и мягко садится на
     норму. Громкости — по четверти синуса, чтобы общая не проваливалась
     посередине. Таймер, а не requestAnimationFrame: в фоновой вкладке кадров
     нет, а звук идёт, и переход застыл бы на полпути. */
  var XF_S = 6;            /* сколько секунд треки звучат вместе */
  var OUT_END = 0.5;       /* до какой скорости тормозит уходящий */
  var IN_START = 0.6;      /* с какой скорости трогается входящий */
  var mult = 1, xf = null, ramp = null, xfTimer = 0;

  /* уходящий за переход проиграет XF_S·(1 − (1 − OUT_END)/3) секунд записи —
     столько и должно оставаться, когда переход начинается */
  function needXfade() {
    if (xf || stopping || audio.paused || !(audio.duration > XF_S * 3)) { return false; }
    var left = audio.duration - audio.currentTime;
    return left <= rate * (XF_S * (1 - (1 - OUT_END) / 3) + 0.3);
  }

  function rampIn(withVolume) {
    ramp = { t0: Date.now(), vol: withVolume };
    mult = IN_START;
    applyRate();
    if (!xfTimer) { xfTimer = setInterval(xfTick, 40); }
  }

  function startXfade() {
    clearInterval(fadeTimer);
    var from = audio;
    xf = { from: from, t0: Date.now(), mult: mult };
    audio = from === decks[0] ? decks[1] : decks[0];
    audio.volume = 0;
    pick(cur + 1);
    rampIn(true);
    var p = audio.play();
    if (p && p.catch) { p.catch(function () {}); }
  }

  function dropOut() {
    if (!xf) { return; }
    var f = xf.from;
    xf = null;
    f.pause();
    if (f.blob) { URL.revokeObjectURL(f.blob); f.blob = null; }
    f.removeAttribute('src');
    f.file = null;
    f.load();
  }

  /* дотянуть переход разом: пауза, «Скачать» */
  function settle() {
    dropOut();
    clearInterval(xfTimer); xfTimer = 0;
    if (ramp) { ramp = null; mult = 1; audio.volume = volume; applyRate(); }
  }

  function xfTick() {
    var now = Date.now(), live = false;
    if (ramp) {
      var k = Math.min(1, (now - ramp.t0) / (XF_S * 1000));
      mult = IN_START + (1 - IN_START) * (1 - (1 - k) * (1 - k));
      if (ramp.vol) { audio.volume = volume * Math.sin(k * Math.PI / 2); }
      if (k >= 1) {
        ramp = null; mult = 1;
        if (boost > 0 && !stopping) { glide(depthRate()); }   /* тронулся — теперь и разгон */
      } else { live = true; }
    }
    if (xf) {
      var j = Math.min(1, (now - xf.t0) / (XF_S * 1000));
      xf.mult = 1 - (1 - OUT_END) * j * j;
      xf.from.volume = volume * Math.cos(j * Math.PI / 2);
      if (j >= 1 || xf.from.ended) { dropOut(); } else { live = true; }
    }
    applyRate();
    if (!live) { clearInterval(xfTimer); xfTimer = 0; }
  }

  play.addEventListener('click', function () {
    if (stopping) { return; }
    stoppedByDownload = false;              /* сам нажал — сам и решает */
    if (audio.paused) { go(); } else { settle(); audio.pause(); }
  });
  /* перехода не было (трек короткий или стоял на паузе у самого конца) */
  on('ended', function () { if (!xf) { pick(cur + 1); go(); } });

  on('play', function () {
    play.classList.replace('ico-play', 'ico-pause');
    play.setAttribute('aria-label', 'Пауза'); play.title = 'Пауза';
    box.classList.add('playing');
    document.body.classList.add('music-playing');
  });
  on('pause', function () {
    play.classList.replace('ico-pause', 'ico-play');
    play.setAttribute('aria-label', 'Играть'); play.title = 'Играть';
    box.classList.remove('playing');
    document.body.classList.remove('music-playing');
  });

  /* ── скорость: чем ниже по странице, тем медленнее; «Скачать» — стоп ──
     Наверху трек идёт как есть, в самом низу — на BOTTOM_RATE, между ними
     плавно по положению прокрутки. */
  var BOTTOM_RATE = 0.88;  /* скорость в самом низу страницы */
  var TOP_RATE = 1.4;      /* наверху крутят дальше вверх (top-egg.js) — разгон до неё */
  var boost = 0;           /* сила этого напора, 0…1 */
  var MIN_RATE = 0.07;     /* ниже 0.0625 Chrome не пускает */

  /* Скорость догоняет цель через промежуточную точку mid — два сглаживания
     подряд: так она трогается мягко, без рывка на первом кадре, и так же
     мягко садится. TAU — постоянная времени одной ступени, по часам, а не по
     кадрам: на 144 Гц и на 60 Гц звучит одинаково. */
  var TAU = 0.35;
  var rate = 1, mid = 1, target = 1, raf = 0, last = 0, stopping = false;
  var stoppedByDownload = false, resuming = false, stopRun = 0;
  function applyRate() {
    audio.playbackRate = Math.max(MIN_RATE, rate * mult);
    if (xf) { xf.from.playbackRate = Math.max(MIN_RATE, rate * xf.mult); }
  }
  function setRate(v) { rate = mid = v; applyRate(); }
  function tick(now) {
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    var a = 1 - Math.exp(-dt / TAU);
    mid += (target - mid) * a;
    rate += (mid - rate) * a;
    if (Math.abs(target - rate) < 0.001 && Math.abs(target - mid) < 0.001) { rate = mid = target; }
    applyRate();
    /* наверху давят, а трек как раз дошёл до нормы — цель сменяется на ходу,
       и он без остановки идёт дальше, в разгон */
    if (boost > 0 && !stopping) { target = depthRate(); }
    if (rate === target) { raf = 0; last = 0; } else { raf = requestAnimationFrame(tick); }
  }
  function glide(to) {
    target = to;
    if (!raf) { last = 0; raf = requestAnimationFrame(tick); }
  }

  /* скорость для текущего места на странице: 1 наверху, BOTTOM_RATE внизу,
     а если наверху упорно крутят вверх — до TOP_RATE. Разгон — только с нормы:
     пока трек ещё не вернулся к своему темпу (поднялись снизу, где он шёл
     медленнее, или он только трогается на переходе), напор копится, но
     цель — норма; дошёл до неё — дальше уже разгон (см. tick и xfTick). */
  function depthRate() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var k = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    var base = 1 - (1 - BOTTOM_RATE) * k;
    if (boost > 0 && (rate < base - 0.005 || mult < 1)) { return base; }
    return base * (1 + (TOP_RATE - 1) * boost);
  }
  window.addEventListener('scroll', function () {
    if (!stopping) { glide(depthRate()); }
  }, { passive: true });
  document.addEventListener('crh:top-push', function (e) {
    boost = e.detail || 0;
    if (!stopping) { glide(depthRate()); }
  });
  /* смена трека сбрасывает скорость браузером — возвращаем её на место */
  on('play', function () {
    if (xf) { applyRate(); return; }      /* входящая на переходе — скорость ведёт xfTick */
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
    settle();
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
  on('pause', function () { if (!stopping) { resuming = false; } });

  vol.addEventListener('input', function () {
    volume = vol.value / 100;
    clearInterval(fadeTimer);
    audio.volume = volume;
    save();
  });

  /* ── анимация плеера — заранее записанная ──
     Звук страница не слушает: у каждого трека есть music/<имя>.viz, кадры
     анимации, посчитанные tools/music_viz.py (8 полос спектра, громкость,
     вспышка на долю, 25 кадров в секунду). Здесь берётся кадр по
     currentTime деки — поэтому замедленный трек и анимируется медленнее,
     а разогнанный — быстрее. Полосы — столбиками по низу плеера, бас качает
     обложку, доля — подсветка вокруг неё, громкость — яркость фона.
     На переходе кадры обеих дек смешиваются по их громкости. Без движения
     (fx-still) ничего этого нет. Нет .viz — плеер просто стоит, как раньше. */
  var viz = {};            /* имя файла → кадры, null — нет и не будет, 'wait' — качается */
  function loadViz(file) {
    if (file in viz || !window.fetch || !window.DataView) { return; }
    viz[file] = 'wait';
    fetch('music/' + file + '.viz').then(function (r) {
      if (!r.ok) { throw new Error(r.status); }
      return r.arrayBuffer();
    }).then(function (buf) {
      var h = new DataView(buf);
      if (buf.byteLength < 12 || h.getUint32(0) !== 0x43524856 || h.getUint8(4) !== 1) { throw new Error('format'); }
      var bands = h.getUint8(6);
      viz[file] = { fps: h.getUint8(5), bands: bands, stride: bands + 2,
                    frames: h.getUint32(8, true), data: new Uint8Array(buf, 12) };
      startViz();
    }).catch(function () { viz[file] = null; });
  }

  var vctx = vizCanvas.getContext && vizCanvas.getContext('2d');
  var VBARS = 24;          /* столбиков на ширину плеера: 8 полос растянуты плавно */
  var shown = null, vizRaf = 0, vizLast = 0;

  /* кадр деки в момент её currentTime, с интерполяцией между кадрами; w — её вес */
  function sample(d, w, acc) {
    var v = d && d.file && viz[d.file];
    if (!v || typeof v !== 'object' || w <= 0) { return; }
    var f = d.currentTime * v.fps, i = Math.floor(f), t = f - i;
    if (i >= v.frames - 1) { i = v.frames - 2; t = 1; }
    if (i < 0) { return; }
    var a = i * v.stride, b = a + v.stride;
    for (var j = 0; j < v.stride && j < acc.length; j++) {
      acc[j] += w * (v.data[a + j] * (1 - t) + v.data[b + j] * t) / 255;
    }
  }

  function drawViz(vals) {
    var w = vizCanvas.width, h = vizCanvas.height;
    if (!vctx || !w) { return; }
    vctx.clearRect(0, 0, w, h);
    if (box.classList.contains('folded')) { return; }
    /* на сцене плеер во всю ширину — столбиков больше, а не толще */
    var bars = Math.max(VBARS, Math.round(w / (window.devicePixelRatio || 1) / 11));
    var n = vals.length - 2, gap = w / bars, bw = gap * 0.56;
    var beat = vals[n + 1];
    vctx.fillStyle = 'rgba(139,92,246,' + (0.2 + 0.18 * beat).toFixed(3) + ')';   /* --accent */
    for (var k = 0; k < bars; k++) {
      var p = k / (bars - 1) * (n - 1), i = Math.floor(p), t = p - i;
      var v = vals[i] * (1 - t) + vals[Math.min(n - 1, i + 1)] * t;
      var bh = Math.max(1, v * h * 0.48);         /* до ползунка громкости, не выше */
      vctx.fillRect(k * gap + (gap - bw) / 2, h - bh, bw, bh);
    }
  }

  function vizTick(now) {
    vizRaf = 0;
    var dt = vizLast ? Math.min(0.1, (now - vizLast) / 1000) : 1 / 60;
    vizLast = now;
    var playing = !audio.paused;
    var acc = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (playing) {
      if (xf) {
        var sum = audio.volume + xf.from.volume || 1;
        sample(audio, audio.volume / sum, acc);
        sample(xf.from, xf.from.volume / sum, acc);
      } else { sample(audio, 1, acc); }
    }
    if (!shown) { shown = acc.slice(); }
    /* кадры уже с плавным спадом; здесь — только мягкий уход в ноль на паузе */
    var a = 1 - Math.exp(-dt / (playing ? 0.04 : 0.3)), quiet = true;
    for (var j = 0; j < acc.length; j++) {
      shown[j] += (acc[j] - shown[j]) * a;
      if (shown[j] > 0.004) { quiet = false; }
    }
    var lvl = shown[8], beat = shown[9], bass = (shown[0] + shown[1]) / 2;
    /* покачивание: на каждой доле — в другую сторону, размах — по громкости */
    if (acc[9] > 0.6 && swayArmed) { swaySide = -swaySide; swayArmed = false; }
    else if (acc[9] < 0.3) { swayArmed = true; }
    sway += ((playing ? swaySide * Math.min(1, lvl * 1.2) : 0) - sway) * (1 - Math.exp(-dt / 0.18));
    if (Math.abs(sway) > 0.004) { quiet = false; }
    setVar('--viz-bass', bass);
    setVar('--viz-beat', beat);
    setVar('--viz-level', lvl);
    setVar('--viz-sway', sway);
    bg.style.opacity = (0.8 + 0.2 * lvl).toFixed(3);
    drawViz(shown);
    if (playing || !quiet) { vizRaf = requestAnimationFrame(vizTick); } else { resetViz(); }
  }

  /* Переменные — на <html>, их может взять любой элемент страницы:
       --viz-bass   бас, 0…1            --viz-level  громкость, 0…1
       --viz-beat   вспышка на долю     --viz-sway   покачивание, −1…1
     Пишутся, только когда изменились: каждая запись — пересчёт стилей. Без
     музыки и без движения их нет, и var(--viz-…, 0) даёт ноль — всё стоит. */
  var vizRoot = document.documentElement, vizPut = {};
  var sway = 0, swaySide = 1, swayArmed = true;
  function setVar(name, v) {
    var s = v.toFixed(3);
    if (vizPut[name] !== s) { vizRoot.style.setProperty(name, s); vizPut[name] = s; }
  }

  function resetViz() {
    cancelAnimationFrame(vizRaf); vizRaf = 0; vizLast = 0;
    shown = null;
    sway = 0;
    for (var name in vizPut) { vizRoot.style.removeProperty(name); }
    vizPut = {};
    bg.style.opacity = '';
    if (vctx) { vctx.clearRect(0, 0, vizCanvas.width, vizCanvas.height); }
  }

  /* запускается на «играть» и когда докачались кадры; на паузе цикл сам
     дорисовывает уход в ноль и встаёт */
  function startViz() {
    if (FX.still) { resetViz(); return; }
    if (!vizCanvas.width) { sizeViz(); }
    if (!vizRaf && !audio.paused) { vizLast = 0; vizRaf = requestAnimationFrame(vizTick); }
  }

  function sizeViz() {
    var r = window.devicePixelRatio || 1;
    vizCanvas.width = Math.round(box.offsetWidth * r);
    vizCanvas.height = Math.round(box.offsetHeight * r);
  }
  on('play', startViz);
  document.addEventListener('crh:fx', startViz);
  window.addEventListener('resize', sizeViz);

  /* ── сцена: плеер на весь низ экрана (fox-stage.js) ──
     Там он всегда развёрнут, а «назад» и «вперёд» переключают трек сразу:
     старый обрывается, новый трогается с разгона, как по «играть». */
  var staged = false;
  function skip(dir) {
    if (stopping) { return; }
    stoppedByDownload = false;
    settle();
    audio.pause();
    pick(cur + dir);
    go();
  }
  prev.addEventListener('click', function () { skip(-1); });
  nextBtn.addEventListener('click', function () { skip(1); });
  box.addEventListener('transitionend', function (e) { if (e.target === box) { sizeViz(); } });

  window.CRH_PLAYER = {
    stage: function (on) { staged = !!on; box.classList.toggle('stage', staged); apply(); },
    skip: skip,
    playing: function () { return !audio.paused; },
    play: function () { if (audio.paused && !stopping) { stoppedByDownload = false; go(); } }
  };

  /* ── свёрнут / развёрнут ── */
  function apply() {
    var f = staged ? false : folded === null ? !WIDE.matches : folded;
    box.classList.toggle('folded', f);
    coverBtn.setAttribute('aria-expanded', f ? 'false' : 'true');
    coverBtn.setAttribute('aria-label', f ? 'Развернуть плеер' : 'Обложка');
    sizeViz();
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
