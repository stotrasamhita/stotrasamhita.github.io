/* Faceted filtering of the server-rendered stotra cards on /stotra/.
   Filters live in the URL (?deity=Śiva&form=Aṣṭakam&q=...), so filtered
   views can be linked to. Counts on each filter show how many stotras
   would match if it were added. A query may be typed in any of the
   site's scripts (ssScript.contains, in script-switcher.js). */
(function () {
  var grid = document.getElementById('cards');
  if (!grid) return;
  var GROUPS = [['deity', 'Deity'], ['form', 'Form'], ['composer', 'Composer'], ['metre', 'Metre'], ['len', 'Length'], ['coll', 'Collection']];
  var HINT = { len: { Short: '≤10', Medium: '11–40', Long: '40+' } };
  var norm = function (t) { return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var split = function (v) { return v ? v.split('|') : []; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var items = Array.prototype.map.call(grid.querySelectorAll('.card'), function (el, i) {
    var d = el.dataset;
    return { el: el, i: i, deity: split(d.deity), form: split(d.form), composer: split(d.composer), metre: split(d.metre),
      len: split(d.len), coll: split(d.coll), vc: +d.vc || 0, date: d.date || '', q: norm(d.q || ''), raw: d.q || '',
      t: el.querySelector('.t').textContent };
  });

  var F = {}, Q = '', SORT = 'title';
  GROUPS.forEach(function (g) { F[g[0]] = new Set(); });
  var params = new URLSearchParams(location.search);
  GROUPS.forEach(function (g) { params.getAll(g[0]).forEach(function (v) { F[g[0]].add(v); }); });
  Q = (params.get('q') || '').trim();
  SORT = params.get('sort') || 'title';

  var rail = document.getElementById('rail'), active = document.getElementById('active');
  var count = document.getElementById('count'), empty = document.getElementById('empty');
  var sortSel = document.getElementById('sort'), qTop = document.getElementById('q-top');
  if (qTop) qTop.value = Q;
  sortSel.value = SORT;

  function matches(s, skip) {
    for (var k = 0; k < GROUPS.length; k++) {
      var g = GROUPS[k][0];
      if (g === skip || !F[g].size) continue;
      if (!s[g].some(function (v) { return F[g].has(v); })) return false;
    }
    if (Q) { var q = norm(Q); if (s.raw.indexOf(Q) < 0 && s.q.indexOf(q) < 0 && !ssScript.contains(s.raw, Q)) return false; }
    return true;
  }

  var ORDER = {
    title: function (a, b) { return a.t.localeCompare(b.t, 'sa'); },
    recent: function (a, b) { return b.date.localeCompare(a.date) || a.i - b.i; },
    short: function (a, b) { return (a.vc || 9999) - (b.vc || 9999) || a.i - b.i; },
    long: function (a, b) { return b.vc - a.vc || a.i - b.i; }
  };

  function render() {
    var shown = 0;
    items.forEach(function (s) { var ok = matches(s); s.el.hidden = !ok; if (ok) shown++; });
    items.slice().sort(ORDER[SORT] || ORDER.title).forEach(function (s) { grid.appendChild(s.el); });
    count.textContent = shown === items.length ? items.length + ' stotras' : shown + ' of ' + items.length;
    empty.hidden = shown > 0;

    rail.innerHTML = GROUPS.map(function (g) {
      var k = g[0], counts = new Map();
      items.forEach(function (s) { if (matches(s, k)) s[k].forEach(function (v) { counts.set(v, (counts.get(v) || 0) + 1); }); });
      var list = Array.from(counts).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); });
      if (k === 'len') list = ['Short', 'Medium', 'Long'].map(function (v) { return [v, counts.get(v) || 0]; });
      F[k].forEach(function (v) { if (!list.some(function (x) { return x[0] === v; })) list.push([v, 0]); });
      if (!list.length) return '';
      var hint = HINT[k] || {};
      return '<div class="fgroup"><h5>' + g[1] + (F[k].size ? '<button type="button" data-clear="' + k + '">Clear</button>' : '') + '</h5><div class="pills">' +
        list.map(function (x) {
          var on = F[k].has(x[0]);
          return '<button type="button" class="pill" data-f="' + k + '" data-v="' + esc(x[0]) + '" aria-pressed="' + on + '"' + (!x[1] && !on ? ' disabled' : '') + '>' +
            esc(x[0]) + (hint[x[0]] ? '<span class="c">' + hint[x[0]] + '</span>' : '') + '<span class="c">' + x[1] + '</span></button>';
        }).join('') + '</div></div>';
    }).join('');

    var chips = [];
    GROUPS.forEach(function (g) { F[g[0]].forEach(function (v) { chips.push('<button type="button" data-f="' + g[0] + '" data-v="' + esc(v) + '" aria-label="Remove ' + esc(v) + '">' + esc(v) + ' ✕</button>'); }); });
    if (Q) chips.push('<button type="button" data-clearq="1" aria-label="Clear search">“' + esc(Q) + '” ✕</button>');
    active.innerHTML = chips.join('');

    var p = new URLSearchParams();
    GROUPS.forEach(function (g) { F[g[0]].forEach(function (v) { p.append(g[0], v); }); });
    if (Q) p.set('q', Q);
    if (SORT !== 'title') p.set('sort', SORT);
    var qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-f],[data-clear],[data-clearq],#ft');
    if (!t) return;
    if (t.id === 'ft') { var open = rail.classList.toggle('open'); t.setAttribute('aria-expanded', open); return; }
    if (t.dataset.clearq) { Q = ''; if (qTop) qTop.value = ''; }
    else if (t.dataset.clear) F[t.dataset.clear].clear();
    else { var s = F[t.dataset.f]; s.has(t.dataset.v) ? s.delete(t.dataset.v) : s.add(t.dataset.v); }
    render();
  });
  sortSel.addEventListener('change', function () { SORT = sortSel.value; render(); });
  if (qTop) {
    qTop.addEventListener('input', function () { Q = qTop.value.trim(); render(); });
    qTop.form.addEventListener('submit', function (e) { e.preventDefault(); });
  }
  render();
  ssScript.onReady(render);   // a query in Telugu etc. matches once Sanscript has loaded
})();
