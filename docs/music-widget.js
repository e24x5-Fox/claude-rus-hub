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
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  var data = window.CRH_MUSIC || {};
  var tracks = data.tracks || [];
  if (!tracks.length) { return; }

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
  function fadeIn() {
    clearInterval(fadeTimer);
    var start = Date.now();
    audio.volume = 0;
    fadeTimer = setInterval(function () {
      var k = Math.min(1, (Date.now() - start) / FADE_MS);
      audio.volume = volume * k;
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
    coverBtn.title = t.title + ' — развернуть';
  }

  function pick(i) {
    cur = (i + tracks.length) % tracks.length;
    audio.src = 'music/' + tracks[cur].file + '.mp3';
    show();
    save();
  }

  function go() {
    if (!audio.src) { pick(cur); }
    fadeIn();
    var p = audio.play();
    if (p && p.catch) { p.catch(function () { /* браузер не дал — ждём следующего нажатия */ }); }
  }

  play.addEventListener('click', function () { audio.paused ? go() : audio.pause(); });
  audio.addEventListener('ended', function () { pick(cur + 1); go(); });

  audio.addEventListener('play', function () {
    play.classList.replace('ico-play', 'ico-pause');
    play.setAttribute('aria-label', 'Пауза'); play.title = 'Пауза';
    box.classList.add('playing');
  });
  audio.addEventListener('pause', function () {
    play.classList.replace('ico-pause', 'ico-play');
    play.setAttribute('aria-label', 'Играть'); play.title = 'Играть';
    box.classList.remove('playing');
  });

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
  document.body.appendChild(box);
  document.body.classList.add('has-music');
  fit();
})();
