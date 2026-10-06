/* ─────────────────────────────────────────────────────────────────────────────
   music-widget.js — плеер с музыкой автора в левом углу, под донатерами.

   Данные — window.CRH_MUSIC из music.js.

   Музыка не должна пугать: сама не играет (только по нажатию), громкость по
   умолчанию маленькая, а старт — плавный, с нуля. Громкость и последний трек
   запоминаются у посетителя в браузере.

   Широкий экран — карточка в левом нижнем углу, всегда видна. Уже — пилюля
   «♪» над пилюлей донатеров, раскрывается по нажатию.
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
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ volume: volume, track: cur })); } catch (e) { /* без памяти — тоже можно */ }
  }

  var saved = load();
  var volume = typeof saved.volume === 'number' ? Math.min(1, Math.max(0, saved.volume)) : VOLUME;
  var cur = saved.track >= 0 && saved.track < tracks.length ? saved.track : 0;

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
  function time(s) {
    if (!isFinite(s)) { return '0:00'; }
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  var audio = new Audio();
  audio.preload = 'none';                 /* не качать музыку, пока не попросили */

  /* ── разметка ── */
  var box = el('aside', 'music');
  box.setAttribute('aria-label', 'Музыка автора');

  var pill = button('music-pill', 'Музыка автора', null);
  pill.appendChild(el('span', 'music-note', '♪'));
  pill.appendChild(el('span', null, 'Музыка'));

  var panel = el('div', 'music-panel');

  var head = el('div', 'music-head');
  var cover = el('img', 'music-cover');
  cover.alt = '';
  cover.width = 56; cover.height = 56;
  var info = el('div', 'music-info');
  var title = el('div', 'music-title');
  var artist = el('div', 'music-artist', (data.artist || '') + ' · Suno');
  info.appendChild(title);
  info.appendChild(artist);
  var close = button('music-close', 'Свернуть', '×');
  head.appendChild(cover);
  head.appendChild(info);
  head.appendChild(close);

  var seek = el('input', 'music-seek');
  seek.type = 'range'; seek.min = 0; seek.max = 1000; seek.value = 0;
  seek.setAttribute('aria-label', 'Перемотка');
  var times = el('div', 'music-times');
  var tNow = el('span', null, '0:00');
  var tAll = el('span', null, '0:00');
  times.appendChild(tNow);
  times.appendChild(tAll);

  var ctrls = el('div', 'music-ctrls');
  var prev = button('music-btn ico-prev', 'Предыдущий трек', null);
  var play = button('music-btn music-play ico-play', 'Играть', null);
  var next = button('music-btn ico-next', 'Следующий трек', null);
  var vol = el('input', 'music-vol');
  vol.type = 'range'; vol.min = 0; vol.max = 100; vol.value = Math.round(volume * 100);
  vol.setAttribute('aria-label', 'Громкость');
  vol.title = 'Громкость';
  var listBtn = button('music-btn ico-list', 'Список треков', null);
  ctrls.appendChild(prev);
  ctrls.appendChild(play);
  ctrls.appendChild(next);
  ctrls.appendChild(el('span', 'music-vol-ico'));
  ctrls.appendChild(vol);
  ctrls.appendChild(listBtn);

  var list = el('ol', 'music-list');
  tracks.forEach(function (t, i) {
    var li = el('li');
    var b = button('music-item', t.title, null);
    b.appendChild(el('span', 'music-item-n', String(i + 1)));
    b.appendChild(el('span', 'music-item-t', t.title));
    b.addEventListener('click', function () { pick(i, true); });
    li.appendChild(b);
    list.appendChild(li);
  });

  panel.appendChild(head);
  panel.appendChild(seek);
  panel.appendChild(times);
  panel.appendChild(ctrls);
  panel.appendChild(list);
  box.appendChild(pill);
  box.appendChild(panel);

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
    title.title = t.title;
    cover.src = 'music/' + t.file + '.jpg';
    [].forEach.call(list.children, function (li, i) { li.classList.toggle('on', i === cur); });
  }

  function pick(i, start) {
    cur = (i + tracks.length) % tracks.length;
    audio.src = 'music/' + tracks[cur].file + '.mp3';
    seek.value = 0;
    tNow.textContent = '0:00';
    tAll.textContent = '0:00';
    show();
    save();
    if (start) { go(); }
  }

  function go() {
    if (!audio.src) { pick(cur, false); }
    fadeIn();
    var p = audio.play();
    if (p && p.catch) { p.catch(function () { /* браузер не дал — ждём следующего нажатия */ }); }
  }

  play.addEventListener('click', function () { audio.paused ? go() : audio.pause(); });
  prev.addEventListener('click', function () {
    /* как в обычных плеерах: дальше трёх секунд — к началу трека */
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    pick(cur - 1, !audio.paused);
  });
  next.addEventListener('click', function () { pick(cur + 1, !audio.paused); });
  audio.addEventListener('ended', function () { pick(cur + 1, true); });

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
  audio.addEventListener('loadedmetadata', function () { tAll.textContent = time(audio.duration); });

  var dragging = false;
  audio.addEventListener('timeupdate', function () {
    if (dragging || !audio.duration) { return; }
    seek.value = Math.round(1000 * audio.currentTime / audio.duration);
    tNow.textContent = time(audio.currentTime);
  });
  seek.addEventListener('input', function () {
    dragging = true;
    if (audio.duration) { tNow.textContent = time(audio.duration * seek.value / 1000); }
  });
  seek.addEventListener('change', function () {
    dragging = false;
    if (audio.duration) { audio.currentTime = audio.duration * seek.value / 1000; }
  });

  vol.addEventListener('input', function () {
    volume = vol.value / 100;
    clearInterval(fadeTimer);
    audio.volume = volume;
    save();
  });

  listBtn.addEventListener('click', function () {
    box.classList.toggle('list-open');
    listBtn.classList.toggle('on', box.classList.contains('list-open'));
  });

  /* ── раскрытие ── */
  function open(on) {
    box.classList.toggle('open', on);
    pill.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  pill.addEventListener('click', function () { open(true); });
  close.addEventListener('click', function () { open(false); });

  function fit() {
    box.classList.toggle('wide', WIDE.matches);
    open(WIDE.matches);
  }
  if (WIDE.addEventListener) { WIDE.addEventListener('change', fit); }
  else if (WIDE.addListener) { WIDE.addListener(fit); }

  show();
  document.body.appendChild(box);
  document.body.classList.add('has-music');
  fit();
})();
