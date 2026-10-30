/* The /search/ page: full-text search over the Pagefind index that
   pages.yml builds after Hugo (texts and tables of contents only; see
   baseof.html). A query typed in IAST, ITRANS or another of the site's
   scripts is also searched in Devanagari, and the two result lists are
   merged. Pagefind matches whole words, and the last word as a prefix. */
(function () {
  var input = document.getElementById('sq');
  if (!input) return;
  var list = document.getElementById('sres'), count = document.getElementById('scount'), more = document.getElementById('smore');
  var qTop = document.getElementById('q-top');
  var BLOCKS = [[/[஀-௿]/, 'tamil'], [/[ఀ-౿]/, 'telugu'], [/[ಀ-೿]/, 'kannada'],
    [/[ഀ-ൿ]/, 'malayalam'], [/[\uD804][\uDF00-\uDF7F]/, 'grantha']];
  var IAST = /[āīūṛṝḷḹṅñṭḍṇśṣṃḥ]/i;
  var PAGE = 20, pf = null, shown = [], seq = 0, timer = 0;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function sanscript() {
    if (window.Sanscript) return Promise.resolve();
    return new Promise(function (ok) {
      var el = document.getElementById('ss-sanscript');
      if (!el) { el = document.createElement('script'); el.id = 'ss-sanscript'; el.src = window.SS_SANSCRIPT; document.head.appendChild(el); }
      el.addEventListener('load', function () { ok(); });
      el.addEventListener('error', function () { ok(); });
    });
  }

  /* The query as typed, plus its Devanagari form when it is in another script. */
  function terms(q) {
    if (/[ऀ-ॿ]/.test(q)) return Promise.resolve([q]);
    var from = null;
    BLOCKS.forEach(function (b) { if (!from && b[0].test(q)) from = b[1]; });
    if (!from && /[a-z]/i.test(q)) from = IAST.test(q) ? 'iast' : 'itrans';
    if (!from) return Promise.resolve([q]);
    return sanscript().then(function () {
      if (!window.Sanscript) return [q];
      var src = from === 'iast' ? q.toLowerCase() : q;
      var d = Sanscript.t(src, from, 'devanagari');
      return d && d !== q ? [q, d] : [q];
    });
  }

  function load() {
    if (pf) return Promise.resolve(pf);
    return import('/pagefind/pagefind.js').then(function (m) { pf = m; return m.options({ excerptLength: 24 }).then(function () { return m; }); });
  }

  function run(q) {
    var me = ++seq;
    history.replaceState(null, '', location.pathname + (q ? '?q=' + encodeURIComponent(q) : ''));
    if (!q) { list.innerHTML = ''; count.textContent = ''; more.hidden = true; return; }
    count.textContent = 'Searching…';
    Promise.all([load(), terms(q)]).then(function (r) {
      return Promise.all(r[1].map(function (t) { return r[0].search(t); }));
    }).then(function (all) {
      if (me !== seq) return;
      var best = new Map();
      all.forEach(function (s) { (s && s.results || []).forEach(function (x) {
        var o = best.get(x.id); if (!o || x.score > o.score) best.set(x.id, x);
      }); });
      shown = Array.from(best.values()).sort(function (a, b) { return b.score - a.score; });
      list.innerHTML = '';
      count.textContent = shown.length ? shown.length + (shown.length === 1 ? ' page' : ' pages') : 'Nothing found. Try a shorter word: the last word matches as a prefix.';
      page(me);
    }).catch(function () {
      if (me === seq) count.textContent = 'Search is not available here (the index is built when the site is deployed).';
    });
  }

  function page(me) {
    var from = list.children.length, part = shown.slice(from, from + PAGE);
    more.hidden = from + PAGE >= shown.length;
    Promise.all(part.map(function (x) { return x.data(); })).then(function (ds) {
      if (me !== seq) return;
      list.insertAdjacentHTML('beforeend', ds.map(function (d) {
        var m = d.meta || {};
        return '<li><a href="' + esc(d.url) + '">' + (m['in'] ? '<span class="kicker">' + esc(m['in']) + '</span>' : '') +
          '<span class="t">' + esc(m.title || d.url) + '</span><span class="x">' + d.excerpt + '</span></a></li>';
      }).join(''));
    });
  }

  more.addEventListener('click', function () { page(seq); });
  input.form.addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(timer); run(input.value.trim()); });
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { run(input.value.trim()); }, 250); });
  if (qTop) qTop.form.addEventListener('submit', function (e) { e.preventDefault(); input.value = qTop.value; run(qTop.value.trim()); });
  var q0 = (new URLSearchParams(location.search).get('q') || '').trim();
  input.value = q0; if (qTop) qTop.value = q0;
  if (q0) run(q0); else input.focus();
})();
