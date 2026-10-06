/* ─────────────────────────────────────────────────────────────────────────────
   donors-widget.js — список донатеров в левом углу.

   Данные — window.CRH_DONORS из donors.js (пишет tools/donors_snapshot.py).
   Ник и общая сумма; при открытии страницы строки выходят по одной, от
   самой крупной суммы к меньшей.

   На широком экране слева от каталога есть пустое поле — там панель открыта
   сразу. Уже него она свёрнута в пилюлю в левом нижнем углу и открывается
   по нажатию: закрывать ею каталог нельзя.

   Под кнопкой «Поддержать» — «Правила донатов»: окно с тем, сколько донат
   висит в списке, что в сообщении показывается и что вырезается. Числа
   правил — из donors.js (rules), их пишет тот же скрипт, что их применяет.
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  var DONATE = 'https://dalink.to/e24x5';
  var SHOW = 10;          /* строк сразу, остальные — по «ещё» */
  var STEP_MS = 140;      /* пауза между появлением строк */
  var WIDE = window.matchMedia('(min-width: 1760px)');

  var data = window.CRH_DONORS || {};
  var donors = (data.donors || []).slice().sort(function (a, b) {
    return (b.amount || 0) - (a.amount || 0);
  });

  var CUR = { RUB: '₽', USD: '$', EUR: '€', UAH: '₴', KZT: '₸', BYN: 'Br' };

  function money(n, cur) {
    var s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return s + ' ' + (CUR[cur] || cur || '₽');
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* Благодарность меняется от того, сколько людей уже поддержало. */
  function thanks(n) {
    if (!n) { return 'Тут пока пусто. Первый донат — и ваш ник окажется здесь первым, честное пушистое :3'; }
    if (n === 1) { return 'Спасибо! Лисёнок обнимает вас хвостом и переводит дальше :3'; }
    if (n < 5) { return 'Спасибо, пушистые! Каждый донат — почесушки за ушком и ещё одна переведённая игра :3'; }
    return 'Целая стая! Лисёнок виляет хвостом так, что сдувает бумаги со стола. Спасибо каждому :3';
  }

  var box = el('aside', 'donors');
  box.setAttribute('aria-label', 'Поддержавшие');

  var toggle = el('button', 'donors-pill');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.appendChild(el('span', 'donors-heart', '♡'));
  toggle.appendChild(el('span', null, donors.length ? 'Поддержали: ' + donors.length : 'Поддержать'));

  var panel = el('div', 'donors-panel');
  var head = el('div', 'donors-head');
  var img = el('img', 'donors-mascot');
  img.src = 'assets/mascot-calm.png';
  img.alt = '';
  head.appendChild(img);
  var ht = el('div');
  ht.appendChild(el('h2', 'side-title', 'Поддержали'));
  ht.appendChild(el('p', 'donors-thanks', thanks(donors.length)));
  head.appendChild(ht);
  var close = el('button', 'donors-close', '×');
  close.type = 'button';
  close.title = 'Свернуть';
  head.appendChild(close);
  panel.appendChild(head);

  var list = el('ol', 'donors-list');
  panel.appendChild(list);

  var more = null;
  if (donors.length > SHOW) {
    more = el('button', 'more-btn donors-more', 'ещё ' + (donors.length - SHOW));
    more.type = 'button';
    more.addEventListener('click', function () {
      more.remove();
      reveal(SHOW, donors.length);
    });
    panel.appendChild(more);
  }

  var btn = el('a', 'btn btn-primary donors-btn', 'Поддержать ♡');
  btn.href = DONATE;
  btn.rel = 'noopener';
  btn.target = '_blank';
  panel.appendChild(btn);

  var rulesBtn = el('button', 'donors-rules-btn', 'Правила донатов');
  rulesBtn.type = 'button';
  panel.appendChild(rulesBtn);

  box.appendChild(toggle);
  box.appendChild(panel);

  function row(d, i) {
    var li = el('li', 'donors-row' + (i < 3 ? ' top' + (i + 1) : ''));
    li.appendChild(el('span', 'donors-name', d.name));
    li.appendChild(el('span', 'donors-sum', money(d.amount || 0, d.currency)));
    li.title = d.name + ' — ' + money(d.amount || 0, d.currency) + (d.until ? ', в списке до ' + day(d.until) : '');
    /* Сообщение — в две строки; длинное раскрывается по нажатию.
       Только textContent: текст пишет донатер, разметке из него не место. */
    if (d.message) {
      var m = el('p', 'donors-msg', d.message);
      m.title = 'Нажмите, чтобы прочитать целиком';
      m.addEventListener('click', function () { m.classList.toggle('full'); });
      li.appendChild(m);
    }
    return li;
  }

  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля',
                'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  function day(iso) {                     /* 2026-10-20 → 20 октября */
    var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso || '');
    return m ? +m[3] + ' ' + MONTHS[+m[2] - 1] : iso;
  }

  /* ── окно «Правила донатов» ──
     Текст — про то, что на самом деле делает tools/donors_snapshot.py.
     Поменялись правила там — поменять и здесь. */
  var R = data.rules || {};
  var BASE = R.base_days || 7, PER = R.rub_per_day || 10;
  var MSG_MAX = R.msg_max || 200, NAME_MAX = R.name_max || 32;
  function days(rub) { return Math.round(BASE + rub / PER); }

  var dialog = null;
  function rules() {
    if (dialog) { dialog.showModal(); return; }
    dialog = el('dialog', 'donors-rules');
    dialog.setAttribute('aria-label', 'Правила донатов');
    var x = el('button', 'donors-close', '×');
    x.type = 'button'; x.title = 'Закрыть';
    x.addEventListener('click', function () { dialog.close(); });
    dialog.appendChild(x);
    dialog.appendChild(el('h2', 'side-title', 'Правила донатов'));

    function section(title, items) {
      dialog.appendChild(el('h3', null, title));
      var ul = el('ul');
      items.forEach(function (t) { ul.appendChild(el('li', null, t)); });
      dialog.appendChild(ul);
    }
    section('Сколько ник висит в списке', [
      'Ник и сумма появляются здесь в течение шести часов: список обновляется по расписанию.',
      'Срок зависит от суммы: ' + BASE + ' дней плюс день за каждые ' + PER + ' ₽. '
        + '100 ₽ — ' + days(100) + ' дней, 500 ₽ — ' + days(500) + ', 1000 ₽ — ' + days(1000) + '.',
      'Донаты с одного ника складываются: новый донат продлевает срок с конца прежнего, а сумма в строке — общая.',
      'Выше в списке — бóльшая сумма. До какого дня висит строка, видно, если навести на неё мышь.'
    ]);
    section('Что можно писать', [
      'Что угодно: спасибо, пожелание, какую игру перевести следующей.',
      'Сообщение видят все посетители каталога. Не пишите в нём личного — ни своего, ни чужого.',
      'Показывается последнее сообщение с ника, до ' + MSG_MAX + ' символов; длиннее — обрезается многоточием.'
    ]);
    section('Что меняется в сообщении', [
      'Слова из списка запрещённых DonationAlerts заменяются звёздочками «***» — и в сообщении, и в нике. Донат при этом остаётся.',
      'Ссылки вырезаются, адрес почты заменяется на «[почта скрыта]».',
      'Переносы строк и невидимые символы, переворачивающие текст, убираются. Эмодзи остаются.',
      'Ник длиннее ' + NAME_MAX + ' символов обрезается, донат без ника подписывается «Аноним».'
    ]);
    section('Когда сообщения не будет', [
      'Голосовое сообщение: текста у него нет — в списке останутся ник и сумма.',
      'Если автору придётся скрыть сообщения конкретного ника (за спам или оскорбления), ник и сумма тоже останутся — пропадёт только текст.',
      'Сам донат из-за содержания сообщения не скрывается никогда.'
    ]);
    dialog.addEventListener('click', function (e) { if (e.target === dialog) { dialog.close(); } });
    document.body.appendChild(dialog);
    dialog.showModal();
  }
  rulesBtn.addEventListener('click', rules);

  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Строки по одной: сверху самая крупная сумма, дальше по убыванию. */
  function reveal(from, to) {
    donors.slice(from, to).forEach(function (d, k) {
      var li = row(d, from + k);
      list.appendChild(li);
      if (still) { li.classList.add('in'); return; }
      setTimeout(function () { li.classList.add('in'); }, 60 + k * STEP_MS);
    });
  }

  var shown = false;
  function open(on) {
    box.classList.toggle('open', on);
    toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (on && !shown) { shown = true; reveal(0, SHOW); }
  }

  toggle.addEventListener('click', function () { open(true); });
  close.addEventListener('click', function () { open(false); });
  document.addEventListener('keydown', function (e) {
    if (dialog && dialog.open) { return; }   /* Esc закрывает окно правил, панель не трогаем */
    if (e.key === 'Escape' && !WIDE.matches) { open(false); }
  });

  /* Широкий экран — открыта сама; сузили окно — сворачивается. */
  function fit() {
    box.classList.toggle('wide', WIDE.matches);
    open(WIDE.matches);
  }
  if (WIDE.addEventListener) { WIDE.addEventListener('change', fit); }
  else if (WIDE.addListener) { WIDE.addListener(fit); }

  document.body.appendChild(box);
  fit();
})();
