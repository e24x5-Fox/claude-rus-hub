// Визитка Discord-сервера: значок и «в сети / участников» из публичного API приглашений.
// Ответ не пришёл — карточка остаётся как в HTML: «наш сервер в Discord» и значок каталога.
(function () {
  var card = document.getElementById('dcard');
  if (!card || !window.fetch) return;
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }
  fetch('https://discord.com/api/v9/invites/Hwceaquhbc?with_counts=true')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.guild) return;
      var g = d.guild, icon = document.getElementById('dcard-icon');
      if (g.icon && icon) {
        var img = new Image();
        img.onload = function () { icon.src = img.src; };
        img.src = 'https://cdn.discordapp.com/icons/' + g.id + '/' + g.icon + '.png?size=96';
      }
      var on = d.approximate_presence_count, all = d.approximate_member_count;
      if (typeof all !== 'number') return;
      var stat = document.getElementById('dcard-stat');
      stat.textContent = '';
      function part(cls, text) {
        var s = document.createElement('span');
        var dot = document.createElement('i'); dot.className = 'dot' + cls;
        s.appendChild(dot); s.appendChild(document.createTextNode(' ' + text));
        stat.appendChild(s);
      }
      if (typeof on === 'number') part('', on + ' в сети');
      part(' all', all + ' ' + plural(all, 'участник', 'участника', 'участников'));
    })
    .catch(function () {});
})();
