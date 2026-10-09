/* ─────────────────────────────────────────────────────────────────────────────
   music-widget.js — плеер с музыкой автора в левом углу, под донатерами.

   Данные — window.CRH_MUSIC из music.js (его пишет tools/suno_sync.py по
   плейлисту Suno). Звук — свой music/<имя>.mp3 (t.mp3); не открылся — тот же
   трек у Suno (t.audio, видео .mp4 — <audio> берёт из него звук). Обложки — свои.

   Одна строка: обложка, название с громкостью под ним, справа «играть».
   Свёрнутый — только обложка и «играть»; нажатие на обложку разворачивает.
   Треки идут по кругу сами, переключать и перематывать нечем — так задумано.

   Музыка не должна пугать: сама не играет (только по нажатию), громкость по
   умолчанию маленькая, а старт — плавный, с нуля. Громкость и свёрнут ли
   плеер запоминаются у посетителя в браузере; трек при каждом открытии
   страницы — случайный, дальше — по перемешанному кругу. Название ведёт на
   страницу трека в Suno; на сцене под ним — жанр и дата (t.genre, t.date).

   Чем ниже по странице, тем медленнее идёт трек, а если наверху крутят
   дальше вверх — разгоняется (crh:top-push из top-egg.js), но только после
   того, как вернулся к своему обычному темпу; «Скачать» (событие
   crh:download из thanks-widget.js) тормозит его до нуля. Чем медленнее
   трек, тем больше на нём ревёрба — сам, без настроек; на сцене
   (fox-stage.js) темп и ревёрб крутятся ручками, а под «Ещё» — бас и
   верха, длина и тон ревёрба, эхо и ширина стерео.

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
  /* порядок — перемешанный круг: «вперёд», «назад» и автопереход идут по нему,
     и пока не прозвучат все треки, ни один не повторится */
  var order = tracks.map(function (t, i) { return i; });
  for (var k = order.length - 1; k > 0; k--) {
    var r = Math.floor(Math.random() * (k + 1)), tmp = order[k]; order[k] = order[r]; order[r] = tmp;
  }
  var pos = 0;
  var cur = order[0];                                      /* каждый раз — случайный */
  function step(dir) { pos = (pos + dir + order.length) % order.length; return order[pos]; }
  function peek() { return order[(pos + 1) % order.length]; }
  var folded = typeof saved.folded === 'boolean' ? saved.folded : null;   /* null — по ширине экрана */

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ volume: volume, folded: folded, fx: fx }));
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
    /* звук идёт через Web Audio (ревёрб), а чужой поток без CORS там молчит;
       GitHub Pages и cdn1.suno.ai отдают Access-Control-Allow-Origin: * */
    a.crossOrigin = 'anonymous';
    return a;
  }
  var decks = [deck(), deck()];
  var audio = decks[0];

  /* звук трека: свой mp3, а поток Suno — запасной (и наоборот, если mp3 ещё нет) */
  function srcOf(t) { return t.mp3 || !t.audio ? 'music/' + t.file + '.mp3' : t.audio; }
  function altOf(t) { return t.mp3 && t.audio ? t.audio : null; }
  decks.forEach(function (d) {
    d.addEventListener('error', function () {
      var t = tracks.filter(function (x) { return x.file === d.file; })[0];
      var alt = t && altOf(t);
      if (!alt || d.fellBack) { return; }
      d.fellBack = true;                  /* свой не открылся — играем у Suno */
      var playing = !d.paused || d === audio;
      d.src = alt;
      if (playing) { var p = d.play(); if (p && p.catch) { p.catch(function () {}); } }
    });
  });
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
    /* на сцене (fox-stage.js) прокрутки нет — обложка встаёт серединой в середину экрана */
    if (staged) {
      var h = layers[0].offsetHeight, vh = window.innerHeight;
      var room = Math.max(0, h - vh * 1.3);
      return room > 0 ? Math.min(1, Math.max(0, (h / 2 - vh * 0.65) / room)) : 0;
    }
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
  var BLUR_SOFT = 90, BLUR_SHARP = 24, TONE = ' saturate(1.3) brightness(';

  /* Яркость фона — по самой обложке: тёмная обложка (ночной город, чёрный фон)
     под общим затемнением почти пропадала, поэтому её яркость подтягивается
     к средней светлой. Светлые не трогаются — им хватает .55. Мера — средняя
     яркость обложки 32×32: размытие среднее не меняет. */
  var BRIGHT = 0.55, LUM_TARGET = 0.32, LIFT_MAX = 3;
  function brightOf(img) {
    try {
      var c = document.createElement('canvas'), n = 32;
      c.width = c.height = n;
      var g = c.getContext('2d');
      g.drawImage(img, 0, 0, n, n);
      var d = g.getImageData(0, 0, n, n).data, sum = 0;
      for (var i = 0; i < d.length; i += 4) { sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; }
      var lum = sum / (n * n * 255);
      return BRIGHT * Math.min(LIFT_MAX, Math.max(1, LUM_TARGET / Math.max(0.01, lum)));
    } catch (e) { return BRIGHT; }
  }
  var canBlur = (function () {
    try {
      var c = document.createElement('canvas').getContext('2d');
      c.filter = 'blur(1px)';
      return c.filter === 'blur(1px)';
    } catch (e) { return false; }
  })();
  function blurred(img, screenPx, cls, bright) {
    var n = img.naturalWidth || 256;
    var scale = n / Math.max(1, layers[0].offsetWidth);   /* пиксель обложки в пикселях экрана */
    var r = screenPx * scale;
    /* края гаснут в прозрачность так же, как гасли у CSS-фильтра, —
       они всё равно за экраном (слой шире экрана на 15 % с каждой стороны) */
    var c = document.createElement('canvas');
    c.width = c.height = n;
    c.className = cls;
    var ctx = c.getContext('2d');
    ctx.filter = 'blur(' + r.toFixed(2) + 'px)' + TONE + bright.toFixed(3) + ')';
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
      var bright = brightOf(img);
      if (canBlur) {
        l.style.backgroundImage = '';
        l.appendChild(blurred(img, BLUR_SOFT, 'soft', bright));
        l.appendChild(blurred(img, BLUR_SHARP, 'sharp', bright));
      } else {
        l.style.setProperty('--bg-bright', bright.toFixed(3));
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
  box.setAttribute('data-viz', '');        /* обложка качается под музыку */

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
  var about = el('div', 'music-about');      /* жанр и дата — только на сцене */
  var volRow = el('label', 'music-vol-row');
  volRow.title = 'Громкость';
  var vol = el('input', 'music-vol');
  vol.type = 'range'; vol.min = 0; vol.max = 100; vol.value = Math.round(volume * 100);
  vol.setAttribute('aria-label', 'Громкость');
  volRow.appendChild(el('span', 'music-vol-ico'));
  volRow.appendChild(vol);
  info.appendChild(title);
  info.appendChild(artist);
  info.appendChild(about);
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

  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа',
                'сентября', 'октября', 'ноября', 'декабря'];
  function dateRu(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
    return m ? +m[3] + ' ' + MONTHS[+m[2] - 1] + ' ' + m[1] : '';
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
    about.textContent = [t.genre, dateRu(t.date)].filter(Boolean).join(' · ');
    coverBtn.title = t.title + ' — развернуть';
  }

  /* следующий трек качается целиком заранее, в blob: так он точно в памяти,
     а не «где-то в кэше», и переход идёт без паузы на загрузку */
  var PREFETCH_S = 30;
  var next = null;
  function prefetch() {
    var i = peek();
    if (next && next.i === i) { return; }
    var n = next = { i: i, url: null };
    new Image().src = 'music/' + tracks[i].file + '.jpg';   /* и обложку для фона */
    loadViz(tracks[i].file);                                  /* и кадры анимации */
    if (!window.fetch || !window.URL || !URL.createObjectURL) { return; }
    fetch(srcOf(tracks[i])).then(function (r) {
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
    var url = next && next.i === cur && next.url ? next.url : srcOf(tracks[cur]);
    next = null;
    if (audio.blob && audio.blob !== url) { URL.revokeObjectURL(audio.blob); }
    audio.blob = url.indexOf('blob:') === 0 ? url : null;
    audio.fellBack = false;
    audio.src = url;
    audio.file = tracks[cur].file;         /* по нему — кадры анимации */
    loadViz(audio.file);
    show();
    save();
  }

  function go() {
    wire();                                /* по нажатию: иначе браузер не даст звук */
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
    pick(step(1));
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
  on('ended', function () { if (!xf) { pick(step(1)); go(); } });

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
    syncVerb();
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
    if (staged) { return fx.tempo; }       /* на сцене темп — с ручки */
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
      syncVerb();
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

  /* ── звук через Web Audio: ревёрб, а на сцене — ручки ──
     Каждая дека идёт в Web Audio двумя путями: сухой — как есть, мокрый —
     через свёртку с искусственным залом (шум с затуханием). Мокрого тем
     больше, чем медленнее дека играет сейчас: на нормальной скорости его
     нет, к VERB_FULL — до WET_MAX. Поэтому гудит и низ страницы, и уходящий
     трек на переходе, и кассета, остановленная «Скачать». Разгон ревёрба не
     добавляет. Нет Web Audio — трек играет как раньше, без ревёрба.

     Дальше общая шина: эхо (задержка с обратной связью) → бас и верха
     (полочные фильтры) → ширина стерео (середина и бока) → ограничитель →
     колонки. Всё это — только на сцене, по ручкам (fx); на обычной странице
     эквалайзер ровный, эха нет, ширина как есть, ограничитель не жмёт.
     Ручки сцены запоминаются у посетителя вместе с громкостью. */
  var VERB_FULL = 0.5, WET_MAX = 0.75;
  var FX_DEF = { tempo: 1, verb: null, bass: 0, treble: 0, length: 3.2, tone: 20000,
                 echo: 0, echoTime: 0.35, width: 1 };
  var fx = {};
  Object.keys(FX_DEF).forEach(function (k) {
    var v = saved.fx && saved.fx[k];
    fx[k] = typeof v === 'number' ? v : FX_DEF[k];
  });
  var actx = null, wired = false, nodes = null;
  var knobs = null;

  /* зал: стерео-шум, затухающий за len секунд; по разу на длину */
  var irCache = {};
  function impulse(c, len) {
    var key = len.toFixed(1);
    if (irCache[key]) { return irCache[key]; }
    var n = Math.floor(c.sampleRate * len), pre = Math.floor(c.sampleRate * 0.02);
    var buf = c.createBuffer(2, n, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = pre; i < n; i++) {
        var t = (i - pre) / (n - pre);
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2);
      }
    }
    irCache[key] = buf;
    return buf;
  }

  function wire() {
    if (wired) { if (actx && actx.state === 'suspended') { actx.resume(); } return; }
    wired = true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { return; }
    try {
      actx = new AC();
      var c = actx, n = {};
      n.bus = c.createGain();
      n.verb = c.createConvolver();
      n.verbLen = 3.2;
      n.verb.buffer = impulse(c, n.verbLen);
      n.tone = c.createBiquadFilter();             /* тон ревёрба: срез верхов хвоста */
      n.tone.type = 'lowpass';
      n.verb.connect(n.tone); n.tone.connect(n.bus);
      decks.forEach(function (d) {
        var src = c.createMediaElementSource(d);
        d.dry = c.createGain();
        d.wet = c.createGain();
        d.wet.gain.value = 0;
        src.connect(d.dry); d.dry.connect(n.bus);
        src.connect(d.wet); d.wet.connect(n.verb);
      });
      n.bass = c.createBiquadFilter(); n.bass.type = 'lowshelf'; n.bass.frequency.value = 150;
      n.treble = c.createBiquadFilter(); n.treble.type = 'highshelf'; n.treble.frequency.value = 3500;
      /* эхо: из шины в задержку, задержка сама в себя и дальше в эквалайзер */
      n.send = c.createGain(); n.send.gain.value = 0;
      n.delay = c.createDelay(2);
      n.fb = c.createGain(); n.fb.gain.value = 0;
      n.bus.connect(n.bass);
      n.bus.connect(n.send); n.send.connect(n.delay);
      n.delay.connect(n.fb); n.fb.connect(n.delay);
      n.delay.connect(n.bass);
      n.bass.connect(n.treble);
      /* ширина: моно поднимается до стерео до разделителя, иначе правый канал пуст */
      n.up = c.createGain();
      n.up.channelCount = 2; n.up.channelCountMode = 'explicit'; n.up.channelInterpretation = 'speakers';
      n.split = c.createChannelSplitter(2);
      n.merge = c.createChannelMerger(2);
      n.ll = c.createGain(); n.rl = c.createGain(); n.rr = c.createGain(); n.lr = c.createGain();
      n.treble.connect(n.up); n.up.connect(n.split);
      n.split.connect(n.ll, 0); n.ll.connect(n.merge, 0, 0);
      n.split.connect(n.rl, 1); n.rl.connect(n.merge, 0, 0);
      n.split.connect(n.rr, 1); n.rr.connect(n.merge, 0, 1);
      n.split.connect(n.lr, 0); n.lr.connect(n.merge, 0, 1);
      /* ограничитель: подъём баса и широкое стерео не должны хрипеть */
      n.limit = c.createDynamicsCompressor();
      n.limit.knee.value = 0; n.limit.attack.value = 0.003; n.limit.release.value = 0.25;
      n.merge.connect(n.limit); n.limit.connect(c.destination);
      nodes = n;
      applyFx();
      syncVerb();
    } catch (e) { actx = null; nodes = null; }
  }

  /* ручки сцены → узлы; вне сцены всё ровно */
  var irTimer = 0;
  function applyFx() {
    if (!nodes) { return; }
    var n = nodes, t = actx.currentTime, on = staged;
    function to(p, v) { p.setTargetAtTime(v, t, 0.05); }
    to(n.bass.gain, on ? fx.bass : 0);
    to(n.treble.gain, on ? fx.treble : 0);
    to(n.tone.frequency, Math.min(on ? fx.tone : 20000, actx.sampleRate / 2 - 100));
    var e = on ? fx.echo : 0;
    to(n.send.gain, e * 0.9);
    to(n.fb.gain, e > 0 ? 0.15 + e * 0.6 : 0);
    to(n.delay.delayTime, on ? fx.echoTime : FX_DEF.echoTime);
    var w = on ? fx.width : 1, a = (1 + w) / 2, b = (1 - w) / 2;
    to(n.ll.gain, a); to(n.rr.gain, a); to(n.rl.gain, b); to(n.lr.gain, b);
    to(n.limit.threshold, on ? -3 : 0);
    to(n.limit.ratio, on ? 20 : 1);
    /* новый зал — не на каждый шаг ручки, а когда её отпустили */
    var len = on ? fx.length : FX_DEF.length;
    if (Math.abs(len - n.verbLen) > 0.05) {
      clearTimeout(irTimer);
      irTimer = setTimeout(function () { n.verbLen = len; n.verb.buffer = impulse(actx, len); }, 200);
    }
  }

  /* сколько ревёрба положено при такой скорости, 0…1 */
  function autoVerb(r) {
    var k = Math.min(1, Math.max(0, (1 - r) / (1 - VERB_FULL)));
    return Math.pow(k, 0.8);
  }
  /* 0…2: 1 — столько, сколько авто даёт на самом медленном; выше — гуще */
  function verbOf(d) { return staged && fx.verb !== null ? fx.verb : autoVerb(d.playbackRate); }
  function syncVerb() {
    if (knobs && staged) { knobs.paint(); }
    if (!actx) { return; }
    var t = actx.currentTime;
    decks.forEach(function (d) {
      if (!d.wet) { return; }
      var w = verbOf(d);
      /* мокрое прибавляется, сухое уступает — на слух громкость та же */
      d.wet.gain.setTargetAtTime(w * WET_MAX, t, 0.06);
      d.dry.gain.setTargetAtTime(Math.max(0.15, 1 - Math.min(w, 1) * 0.35 - Math.max(0, w - 1) * 0.4), t, 0.06);
    });
  }

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
     (fx-still) ничего этого нет. Нет .viz — плеер просто стоит, как раньше.

     Танец лисят ведут доли (формат v2): моменты долей и их сила записаны в
     .viz, и по currentTime известно, где трек внутри доли. Прыжок — на сам
     удар, качание из стороны в сторону — с крайними точками ровно на долях.
     Характер танца у каждого трека свой (tools/music_viz.py считает его из
     промта Suno и самого звука): жёсткий фонк — резкий прыжок на каждую долю
     и рывок из стороны в сторону, лоу-фай и грустное — мягкий кивок и
     качание раз в 2–4 доли. Сила доли и громкость в этом месте — сила
     движения: на тихом брейке лисёнок почти стоит. */
  var viz = {};            /* имя файла → кадры, null — нет и не будет, 'wait' — качается */
  function loadViz(file) {
    if (file in viz || !window.fetch || !window.DataView) { return; }
    viz[file] = 'wait';
    fetch('music/' + file + '.viz').then(function (r) {
      if (!r.ok) { throw new Error(r.status); }
      return r.arrayBuffer();
    }).then(function (buf) {
      var h = new DataView(buf);
      var ver = buf.byteLength >= 12 && h.getUint32(0) === 0x43524856 ? h.getUint8(4) : 0;
      if (ver < 1 || ver > 3) { throw new Error('format'); }
      var bands = h.getUint8(6), frames = h.getUint32(8, true), off = 12, nb = 0, prof = null;
      var stride = bands + (ver === 3 ? 3 : 2);   /* v3: ещё байт силы места */
      if (ver >= 2) {
        nb = h.getUint32(12, true);
        prof = { hop: h.getUint8(17) / 255, sharp: h.getUint8(18) / 255, squash: h.getUint8(19) / 255,
                 sway: h.getUint8(20) / 255, per: h.getUint8(21) || 1 };
        off = 24;
      }
      var size = frames * stride, at = off + size;
      var beats = new Float32Array(nb);
      for (var i = 0; i < nb; i++) { beats[i] = h.getFloat32(at + 4 * i, true); }
      var v = viz[file] = { fps: h.getUint8(5), bands: bands, stride: stride, frames: frames,
                            data: new Uint8Array(buf, off, size), beats: beats,
                            force: new Uint8Array(buf, at + 4 * nb, nb), prof: prof, drops: [] };
      if (ver === 3) {
        var d0 = at + 5 * nb, nd = h.getUint32(d0, true);
        for (i = 0; i < nd; i++) {
          v.drops.push({ t: h.getFloat32(d0 + 4 + 4 * i, true), force: h.getUint8(d0 + 4 + 4 * nd + i) / 255 });
        }
        v.surge = bands + 2;                     /* столбец силы в кадре */
      }
      startViz();
    }).catch(function () { viz[file] = null; });
  }

  /* ── сильные места и дропы — для сцены (fox-stage.js) ──
     Считает их tools/music_viz.py по самому звуку и пишет в .viz v3: в
     каждом кадре сила места трека (громкость, бас и верха в окне около
     секунды, верхняя треть шкалы самого трека), отдельно — моменты дропов.
     У старого .viz (v1, v2) их нет — и радуги с огоньками тоже. */
  /* сила в момент currentTime деки: сильное место, а сразу после дропа —
     вспышка, гаснущая за пару секунд */
  function surgeAt(d) {
    var v = d && d.file && viz[d.file];
    if (!v || typeof v !== 'object' || !v.surge) { return 0; }
    var t = d.currentTime, i = Math.min(v.frames - 1, Math.max(0, Math.round(t * v.fps)));
    var s = v.data[i * v.stride + v.surge] / 255 * 0.85;
    for (var k = 0; k < v.drops.length; k++) {
      var dt = t - v.drops[k].t;
      if (dt >= 0 && dt < 4) { s = Math.max(s, (0.6 + 0.4 * v.drops[k].force) * Math.exp(-dt / 1.6)); }
    }
    return s;
  }

  /* дроп, который трек только что прошёл, — для залпа огоньков; один раз */
  var dropSeen = { file: null, t: -1 }, dropCount = 0, dropForce = 0;
  function watchDrops(d) {
    var v = d && d.file && viz[d.file], t = d ? d.currentTime : 0;
    if (!v || typeof v !== 'object' || !v.drops) { return; }
    if (dropSeen.file === d.file && t > dropSeen.t && t - dropSeen.t < 1) {
      for (var k = 0; k < v.drops.length; k++) {
        if (v.drops[k].t > dropSeen.t && v.drops[k].t <= t) { dropCount++; dropForce = v.drops[k].force; }
      }
    }
    dropSeen.file = d.file; dropSeen.t = t;
  }

  /* Танец деки в момент её currentTime; w — её вес на переходе. Нет долей
     (старый .viz, брейк длиннее двух секунд, вступление до первой доли) —
     эта дека не танцует. */
  function dance(d, w, out) {
    var v = d && d.file && viz[d.file];
    if (!v || typeof v !== 'object' || !v.prof || !v.beats.length || w <= 0) { return; }
    var b = v.beats, n = b.length, t = d.currentTime;
    if (t < b[0] || t > b[n - 1] + 1.5) { return; }
    var lo = 0, hi = n - 1;
    while (lo < hi) { var m = (lo + hi + 1) >> 1; if (b[m] <= t) { lo = m; } else { hi = m - 1; } }
    var gap = lo + 1 < n ? b[lo + 1] - b[lo] : (lo > 0 ? b[lo] - b[lo - 1] : 0.5);
    if (gap > 2) { return; }
    var p = Math.min(1, (t - b[lo]) / gap), P = v.prof, force = v.force[lo] / 255;
    /* прыжок: жёсткий — сразу вверх и быстро вниз, мягкий — волна-кивок */
    var soft = 0.5 + 0.5 * Math.cos(2 * Math.PI * p), sharp = Math.pow(1 - p, 3);
    out.hop += w * P.hop * force * (soft + (sharp - soft) * P.sharp);
    /* качание: крайние точки — на долях; у жёсткого трека дольше стоит в
       крайних и рывком проскакивает середину */
    var c = Math.cos(Math.PI * (lo + p) / P.per);
    out.sway += w * P.sway * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), 1 - 0.6 * P.sharp);
    out.squash += w * P.squash;
    out.w += w;
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
    /* не чаще VIZ_HZ: кадров в данных 25 в секунду, а на мониторе 144 Гц
       каждая лишняя запись переменных — лишний пересчёт стилей */
    if (vizLast && now - vizLast < 1000 / VIZ_HZ - 2) { vizRaf = requestAnimationFrame(vizTick); return; }
    var dt = vizLast ? Math.min(0.1, (now - vizLast) / 1000) : 1 / 60;
    vizLast = now;
    if (now - vizScan > 1000) { vizScan = now; vizTargets = document.querySelectorAll('[data-viz]'); vizPut = {}; }
    var playing = !audio.paused;
    var acc = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var mv = { hop: 0, sway: 0, squash: 0, w: 0 };
    if (playing) {
      if (xf) {
        var sum = audio.volume + xf.from.volume || 1;
        sample(audio, audio.volume / sum, acc);
        sample(xf.from, xf.from.volume / sum, acc);
        dance(audio, audio.volume / sum, mv);
        dance(xf.from, xf.from.volume / sum, mv);
      } else { sample(audio, 1, acc); dance(audio, 1, mv); }
    }
    if (!shown) { shown = acc.slice(); }
    /* кадры уже с плавным спадом; здесь — только мягкий уход в ноль на паузе */
    var a = 1 - Math.exp(-dt / (playing ? 0.04 : 0.3)), quiet = true;
    for (var j = 0; j < acc.length; j++) {
      shown[j] += (acc[j] - shown[j]) * a;
      if (shown[j] > 0.004) { quiet = false; }
    }
    var lvl = shown[8], bass = (shown[0] + shown[1]) / 2;
    /* танец — по долям; без долей прыжок — по вспышке из кадров, качания нет.
       Пока доли идут, движение берётся как есть: его форма уже задана временем
       трека, а сглаживание запаздывало за долей на 100+ мс — глазу заметно.
       Сглаживается только то, что без него дёрнулось бы: спад прыжка на стыке
       долей разной силы, уход в ноль на паузе и на брейке без долей */
    var tHop = mv.w ? mv.hop : acc[9], tSway = mv.w ? mv.sway * (0.35 + 0.65 * lvl) : 0;
    var tSquash = mv.w ? mv.squash / mv.w : 1;
    var live = playing && mv.w > 0;
    var k = 1 - Math.exp(-dt / (live ? 0.03 : 0.3));
    hop = live && tHop > hop ? tHop : hop + (tHop - hop) * k;
    sway = live ? tSway : sway + (tSway - sway) * k;
    squash += (tSquash - squash) * k;
    if (Math.abs(sway) > 0.004 || hop > 0.004) { quiet = false; }
    setVar('--viz-bass', bass * squash);
    setVar('--viz-beat', hop);
    setVar('--viz-level', lvl);
    setVar('--viz-sway', sway);
    /* сила: вспыхивает быстро, гаснет медленно — свечение не мигает на каждой доле */
    var tSurge = playing ? surgeAt(audio) : 0;
    surge += (tSurge - surge) * (1 - Math.exp(-dt / (tSurge > surge ? 0.08 : 0.6)));
    if (surge > 0.004) { quiet = false; }
    setVar('--viz-surge', surge);
    if (playing) { watchDrops(audio); }
    bg.style.opacity = (0.8 + 0.2 * lvl).toFixed(3);
    drawViz(shown);
    if (playing || !quiet) { vizRaf = requestAnimationFrame(vizTick); } else { resetViz(); }
  }

  /* Переменные получает любой элемент с атрибутом data-viz — он и всё внутри него:
       --viz-bass   бас, 0…1            --viz-level  громкость, 0…1
       --viz-beat   вспышка на долю     --viz-sway   покачивание, −1…1
       --viz-surge  сильное место или только что прошедший дроп, 0…1
     Не на <html>: тогда при каждой записи браузер пересчитывал стили всей
     страницы — на 144 Гц это было 40 % времени главного потока. Помеченные
     элементы ищутся раз в секунду, так что появившиеся позже (сцена) тоже
     получают переменные. Пишутся, только когда изменились. Без музыки и без
     движения их нет, и var(--viz-…, 0) даёт ноль — всё стоит. */
  var VIZ_HZ = 60;
  var vizTargets = [], vizScan = 0, vizPut = {};
  var sway = 0, hop = 0, squash = 1, surge = 0;
  function setVar(name, v) {
    var s = v.toFixed(3);
    if (vizPut[name] === s) { return; }
    vizPut[name] = s;
    for (var i = 0; i < vizTargets.length; i++) { vizTargets[i].style.setProperty(name, s); }
  }

  function resetViz() {
    cancelAnimationFrame(vizRaf); vizRaf = 0; vizLast = 0;
    shown = null;
    sway = hop = surge = 0; squash = 1;
    var all = document.querySelectorAll('[data-viz]');
    for (var i = 0; i < all.length; i++) {
      for (var name in vizPut) { all[i].style.removeProperty(name); }
    }
    vizPut = {}; vizScan = 0;
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

  /* ручки на сцене. Тянуть вверх-вниз, колесо, стрелки; двойной щелчок —
     на место. Темп и ревёрб — на самой панели, остальное — под «Ещё» */
  function knob(label, get, set, text, reset) {
    var w = el('div', 'music-knob');
    var dial = el('div', 'music-knob-dial');
    dial.tabIndex = 0;
    dial.setAttribute('role', 'slider');
    dial.setAttribute('aria-label', label);
    dial.setAttribute('aria-valuemin', '0');
    dial.setAttribute('aria-valuemax', '100');
    dial.title = label + ': тянуть вверх-вниз или колесом, двойной щелчок — сброс';
    dial.appendChild(el('div', 'music-knob-cap'));
    var val = el('div', 'music-knob-val');
    w.appendChild(dial);
    w.appendChild(el('div', 'music-knob-name', label));
    w.appendChild(val);
    function to(v) { set(Math.min(1, Math.max(0, v))); }
    var y0 = null, v0 = 0;
    dial.addEventListener('pointerdown', function (e) {
      y0 = e.clientY; v0 = get();
      dial.setPointerCapture(e.pointerId);
      dial.classList.add('drag');
      e.preventDefault();
    });
    dial.addEventListener('pointermove', function (e) {
      if (y0 !== null) { to(v0 + (y0 - e.clientY) / 160); }
    });
    function up() { y0 = null; dial.classList.remove('drag'); }
    dial.addEventListener('pointerup', up);
    dial.addEventListener('pointercancel', up);
    dial.addEventListener('wheel', function (e) {
      e.preventDefault();
      to(get() + (e.deltaY < 0 ? 0.03 : -0.03));
    }, { passive: false });
    dial.addEventListener('keydown', function (e) {
      var k = { ArrowUp: 0.02, ArrowRight: 0.02, ArrowDown: -0.02, ArrowLeft: -0.02 }[e.key];
      if (!k) { return; }
      e.preventDefault();
      e.stopPropagation();                 /* стрелки на сцене иначе листают треки */
      to(get() + k);
    });
    dial.addEventListener('dblclick', reset);
    return {
      node: w,
      paint: function () {
        var v = get();
        dial.style.setProperty('--knob', (-135 + 270 * v).toFixed(1) + 'deg');
        dial.style.setProperty('--knob-fill', (v * 75).toFixed(1) + '%');
        dial.setAttribute('aria-valuenow', String(Math.round(v * 100)));
        val.textContent = text(v);
        dial.setAttribute('aria-valuetext', val.textContent);
      }
    };
  }

  /* шкалы ручек: положение 0…1 ↔ значение. mid — значение в середине хода
     (×1 у темпа, 0 дБ у эквалайзера), чтобы «как было» стояло по центру */
  function scale(lo, mid, hi, log) {
    function f(a, b, k) { return log ? a * Math.pow(b / a, k) : a + (b - a) * k; }
    function g(a, b, x) { return log ? Math.log(x / a) / Math.log(b / a) : (x - a) / (b - a); }
    return {
      v: function (x) { return x <= mid ? g(lo, mid, x) / 2 : 0.5 + g(mid, hi, x) / 2; },
      x: function (v) { return v <= 0.5 ? f(lo, mid, v * 2) : f(mid, hi, (v - 0.5) * 2); }
    };
  }
  function db(x) { return (x > 0 ? '+' : '') + Math.round(x) + ' дБ'; }
  function sec(x) { return x < 1 ? Math.round(x * 1000) + ' мс' : x.toFixed(1) + ' с'; }
  function pct(x) { return Math.round(x * 100) + '%'; }
  var PARAMS = {
    tempo:    { label: 'Темп',    s: scale(0.25, 1, 2, true),   fmt: function (x) { return '×' + x.toFixed(2); } },
    bass:     { label: 'Бас',     s: scale(-24, 0, 24),         fmt: db },
    treble:   { label: 'Верха',   s: scale(-24, 0, 24),         fmt: db },
    length:   { label: 'Длина',   s: scale(0.3, 3.2, 12, true), fmt: sec },
    tone:     { label: 'Тон',     s: scale(400, 4000, 20000, true),
                fmt: function (x) { return x >= 19500 ? 'открыт' : x < 1000 ? Math.round(x) + ' Гц' : (x / 1000).toFixed(1) + ' кГц'; } },
    echo:     { label: 'Сила',    s: scale(0, 0.5, 1),          fmt: pct },
    echoTime: { label: 'Время',   s: scale(0.04, 0.35, 1.5, true), fmt: sec },
    width:    { label: 'Ширина',  s: scale(0, 1, 3),            fmt: function (x) { return x < 0.02 ? 'моно' : pct(x); } }
  };
  function fxChanged() {
    applyFx();
    save();
    knobs.paint();
  }
  function param(key) {
    var p = PARAMS[key];
    return knob(p.label,
      function () { return p.s.v(fx[key]); },
      function (v) { fx[key] = p.s.x(v); if (key === 'tempo') { onTempo(); } fxChanged(); },
      function () { return p.fmt(fx[key]); },
      function () { fx[key] = FX_DEF[key]; if (key === 'tempo') { onTempo(); } fxChanged(); });
  }
  function onTempo() { if (!stopping) { glide(depthRate()); } }

  /* ревёрб: 0…200 %; 100 % — сколько авто даёт на самом медленном. Пока ручку
     не трогали — «авто», ревёрб сам идёт за темпом */
  function verbNow() { return fx.verb !== null ? fx.verb : autoVerb(audio.playbackRate); }
  var verbKnob = knob('Ревёрб',
    function () { return verbNow() / 2; },
    function (v) { fx.verb = v * 2; syncVerb(); save(); },
    function () { return pct(verbNow()) + (fx.verb === null ? ' · авто' : ''); },
    function () { fx.verb = null; syncVerb(); save(); });

  var all = [param('tempo'), verbKnob];
  var knobBox = el('div', 'music-knobs');
  all.forEach(function (k) { knobBox.appendChild(k.node); });

  /* «Ещё»: панель над плеером с остальными ручками */
  var moreBtn = button('music-more-btn ico-sliders', 'Ещё настройки звука', null);
  moreBtn.setAttribute('aria-expanded', 'false');
  knobBox.appendChild(moreBtn);
  var more = el('div', 'music-more');
  more.hidden = true;
  [['Эквалайзер', ['bass', 'treble']], ['Ревёрб', ['length', 'tone']],
   ['Эхо', ['echo', 'echoTime']], ['Стерео', ['width']]].forEach(function (g) {
    var grp = el('div', 'music-more-group');
    grp.appendChild(el('div', 'music-more-title', g[0]));
    var row = el('div', 'music-more-row');
    g[1].forEach(function (key) { var k = param(key); all.push(k); row.appendChild(k.node); });
    grp.appendChild(row);
    more.appendChild(grp);
  });
  var resetAll = button('music-more-reset', 'Вернуть все ручки на место', 'Сбросить всё');
  resetAll.addEventListener('click', function () {
    Object.keys(FX_DEF).forEach(function (k) { fx[k] = FX_DEF[k]; });
    onTempo();
    syncVerb();
    fxChanged();
  });
  more.appendChild(resetAll);
  function openMore(on) {
    more.hidden = !on;
    moreBtn.classList.toggle('on', on);
    moreBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  moreBtn.addEventListener('click', function () { openMore(more.hidden); });
  /* щелчок мимо панели и Esc закрывают её; Esc при открытой панели сцену не гасит */
  document.addEventListener('pointerdown', function (e) {
    if (!more.hidden && !more.contains(e.target) && !moreBtn.contains(e.target)) { openMore(false); }
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !more.hidden) { e.stopPropagation(); e.preventDefault(); openMore(false); }
  }, true);

  knobs = { paint: function () { all.forEach(function (k) { k.paint(); }); } };
  box.insertBefore(knobBox, prev);
  box.appendChild(more);
  knobs.paint();

  function skip(dir) {
    if (stopping) { return; }
    stoppedByDownload = false;
    settle();
    audio.pause();
    pick(step(dir));
    go();
  }
  prev.addEventListener('click', function () { skip(-1); });
  nextBtn.addEventListener('click', function () { skip(1); });
  box.addEventListener('transitionend', function (e) { if (e.target === box) { sizeViz(); } });

  window.CRH_PLAYER = {
    stage: function (on) {
      staged = !!on; box.classList.toggle('stage', staged); vizScan = 0; apply(); panTo();
      /* вошли — темп с ручки, ушли — снова по месту на странице */
      if (!stopping) { glide(depthRate()); }
      if (!staged) { openMore(false); }
      applyFx();
      syncVerb();
    },
    skip: skip,
    playing: function () { return !audio.paused; },
    /* сила сейчас и сколько дропов уже прошло — огоньки на сцене (fox-stage.js) */
    surge: function () { return { level: FX.still ? 0 : surge, drops: dropCount, force: dropForce }; },
    /* полосы спектра (8, от баса к верхам, 0…1) и танец — фон сцены (fox-stage-bg.js);
       null, пока ничего не играет и всё стоит */
    bands: function () {
      return shown && !FX.still ? { b: shown.slice(0, 8), level: shown[8], beat: hop, sway: sway, surge: surge } : null;
    },
    /* что играет главная дека и где она в записи — по нему слова на сцене (fox-lyrics.js) */
    now: function () { return { file: audio.file || null, t: audio.currentTime, paused: audio.paused }; },
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
