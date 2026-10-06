/* ─────────────────────────────────────────────────────────────────────────────
   thanks-widget.js — плашка «спасибо, что скачали» после нажатия «Скачать».

   Кнопки скачивания в карточках помечены data-download (их строит index.html).
   Скачивание не задерживаем: ссылка отрабатывает как обычно, плашка просто
   появляется поверх страницы. Заодно шлём события для плеера
   (music-widget.js): crh:download — он резко тормозит трек,
   crh:thanks-closed — плашку закрыли, трек разгоняется обратно.
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  var HIDE_MS = 9000;      /* сама исчезает, если не закрыли */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var wrap = el('div', 'thanks');
  wrap.setAttribute('role', 'status');
  wrap.setAttribute('aria-live', 'polite');
  var card = el('div', 'thanks-card');
  var img = el('img', 'thanks-mascot');
  img.src = 'assets/mascot-wave.png';
  img.alt = '';
  var text = el('div', 'thanks-text');
  text.appendChild(el('div', 'thanks-title', 'Спасибо, что скачали русификатор!'));
  text.appendChild(el('p', 'thanks-sub',
    'И спасибо, что доверяете лису :3 Он старался, чтобы всё встало с первого раза.'));
  var ok = el('button', 'btn btn-primary thanks-ok', 'Пожалуйста ♡');
  ok.type = 'button';
  text.appendChild(ok);
  card.appendChild(img);
  card.appendChild(text);
  wrap.appendChild(card);

  var timer = null;
  function hide() {
    clearTimeout(timer);
    if (!wrap.classList.contains('show')) { return; }
    wrap.classList.remove('show');
    /* плеер разгоняет трек обратно, если его остановило «Скачать» */
    document.dispatchEvent(new CustomEvent('crh:thanks-closed'));
  }
  function show() {
    if (!wrap.parentNode) { document.body.appendChild(wrap); }
    void wrap.offsetWidth;                 /* чтобы анимация появления сработала */
    wrap.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(hide, HIDE_MS);
  }

  ok.addEventListener('click', hide);
  wrap.addEventListener('click', function (e) { if (e.target === wrap) { hide(); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { hide(); } });

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-download]');
    if (!a) { return; }
    /* без { detail } — плееру важен сам факт */
    document.dispatchEvent(new CustomEvent('crh:download'));
    show();
  });
})();
