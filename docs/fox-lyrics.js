/* ─────────────────────────────────────────────────────────────────────────────
   fox-lyrics.js — слова песни на сцене (fox-stage.js).

   Пока лисёнок на сцене, слова трека появляются в тот момент, когда их поют:
   первое слева от лисёнка, второе справа, третье снова слева — по очереди.
   Новое слово встаёт наверх своей колонки, а те, что уже там, плавно
   съезжают на строку вниз, освобождая ему место, и по пути гаснут. Слово,
   которое поют прямо сейчас, подсвечено.

   Время — из самого плеера (CRH_PLAYER.now(), currentTime главной деки), а не
   по часам: пауза останавливает слова, а замедленный прокруткой или
   разогнанный трек ведёт их в своём темпе. Слова и тайминг — music/<имя>.lyr,
   их собирает tools/music_lyrics.py из Suno; у трека без .lyr слов нет.

   Места по бокам мало (телефон, узкое окно) — колонки встают над лисёнком.
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  var LEAD = 0.06;         /* слово появляется чуть раньше, чем звучит: глаз медленнее уха */
  var FADE_AFTER = 6;      /* секунд записи после конца слова — и оно гаснет само */
  var MAX_SLOTS = 7;       /* сколько строк в колонке, не больше */
  var GONE_MS = 700;       /* сколько гаснет убранное слово (как в site.css) */

  var lyrics = {};         /* файл → {w: […]} | null (нет слов) | 'wait' */
  var box = null, cols = null, raf = 0;
  var file = null, idx = 0, lastT = -1, side = 0;
  var live = [];           /* слова на экране: {el, col, slot, end} */

  function player() { return window.CRH_PLAYER; }
  function still() { return (window.CRH_FX || {}).still; }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text != null) { n.textContent = text; }
    return n;
  }

  function get(name) {
    if (lyrics[name] !== undefined) { return lyrics[name]; }
    lyrics[name] = 'wait';
    fetch('music/' + name + '.lyr').then(function (r) {
      if (!r.ok) { throw new Error(r.status); }
      return r.json();
    }).then(function (d) {
      lyrics[name] = d && d.w && d.w.length ? d : null;
    }).catch(function () { lyrics[name] = null; });
    return 'wait';
  }

  /* ── раскладка: колонки по бокам лисёнка или над ним ── */
  function layout() {
    var fly = document.querySelector('.fox-stage-fly');
    var vw = window.innerWidth, vh = window.innerHeight;
    /* место на сцене, а не в полёте: offset* не видят transform, которым он летит */
    var r = fly ? { left: fly.offsetLeft, top: fly.offsetTop } : { left: vw / 2, top: vh / 2 };
    var gap = Math.max(16, vw * 0.02);
    var room = r.left - gap - 16;                    /* ширина колонки сбоку */
    var aside = room >= 170;
    box.classList.toggle('aside', aside);
    var top = Math.max(72, vh * 0.12);
    var bottom = aside ? vh - 170 : r.top - 12;      /* сбоку — до плеера, сверху — до лисёнка */
    cols[0].style.cssText = cols[1].style.cssText = '';
    if (aside) {
      cols[0].style.left = '16px';
      cols[0].style.width = room + 'px';
      cols[1].style.right = '16px';
      cols[1].style.width = room + 'px';
    }
    cols.forEach(function (c) { c.style.top = top + 'px'; });
    var step = parseFloat(getComputedStyle(cols[0]).fontSize) * 1.35;
    box.style.setProperty('--lyric-step', step + 'px');
    slots = Math.max(2, Math.min(MAX_SLOTS, Math.floor((bottom - top) / step)));
  }
  var slots = MAX_SLOTS;

  function build() {
    box = el('div', 'fox-lyrics');
    box.setAttribute('aria-hidden', 'true');
    cols = [el('div', 'fox-lyrics-col left'), el('div', 'fox-lyrics-col right')];
    box.appendChild(cols[0]);
    box.appendChild(cols[1]);
  }

  /* ── слова ── */
  function place(w) {
    w.el.style.transform = 'translateY(calc(' + w.slot + ' * var(--lyric-step)))';
    /* чем ниже, тем бледнее; последняя строка — уже почти ничего */
    w.el.style.opacity = w.gone ? 0 : Math.max(0, 1 - w.slot / slots).toFixed(3);
  }

  function drop(w) {
    if (w.gone) { return; }
    w.gone = true;
    place(w);
    setTimeout(function () { if (w.el.parentNode) { w.el.parentNode.removeChild(w.el); } }, still() ? 0 : GONE_MS);
  }

  function add(word) {
    var col = side;
    side = 1 - side;
    live.forEach(function (w) {
      if (w.col !== col || w.gone) { return; }
      w.slot++;
      if (w.slot >= slots) { drop(w); } else { place(w); }
    });
    var n = el('div', 'fox-lyric', null);
    n.appendChild(el('span', 'fox-lyric-in', word[2]));
    var w = { el: n, col: col, slot: 0, start: word[0], end: word[1], gone: false };
    place(w);
    cols[col].appendChild(n);
    live.push(w);
  }

  function clear() {
    live.forEach(drop);
    live = [];
    side = 0;
  }

  /* первое слово, которое ещё не началось к моменту t */
  function seek(words, t) {
    var lo = 0, hi = words.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (words[mid][0] + LEAD <= t) { lo = mid + 1; } else { hi = mid; }
    }
    return lo;
  }

  function tick() {
    raf = 0;
    var stage = document.querySelector('.fox-stage.on');
    if (!stage || !player() || !player().now) { clear(); return; }
    raf = requestAnimationFrame(tick);
    if (box.parentNode !== stage) { stage.insertBefore(box, stage.firstChild); layout(); }

    var now = player().now();
    var d = now.file ? get(now.file) : null;
    if (now.file !== file) {                    /* сменился трек */
      clear();
      file = now.file;
      lastT = -1;
    }
    if (!d || d === 'wait') { return; }
    var words = d.w, t = now.t;

    /* перемотка или трек начался заново — слова с нового места, без лавины
       пропущенных; 1.5 с вперёд за кадр — это уже не обычный ход времени */
    if (lastT < 0 || t < lastT - 0.25 || t > lastT + 1.5) {
      if (lastT >= 0) { clear(); }
      idx = seek(words, t);
    }
    lastT = t;

    while (idx < words.length && words[idx][0] - LEAD <= t) { add(words[idx]); idx++; }

    live = live.filter(function (w) {
      if (w.gone) { return false; }
      w.el.classList.toggle('now', t >= w.start - LEAD && t < Math.max(w.end, w.start + 0.25));
      if (t > w.end + FADE_AFTER) { drop(w); return false; }
      return true;
    });
  }

  function start() {
    if (!box) { build(); }
    if (!raf) { raf = requestAnimationFrame(tick); }
  }

  /* сцена открывается классом на body (fox-stage.js) */
  new MutationObserver(function () {
    if (document.body.classList.contains('fox-stage-on')) { start(); }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('resize', function () { if (box && box.parentNode) { layout(); live.forEach(place); } });
})();
