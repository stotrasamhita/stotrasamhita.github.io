/* Shows the whole site (texts, titles, cards, menus, the search box's
   hint) in the reader's chosen script, with the vendored Sanscript.js.
   The choice is picked in the masthead (or in the bar above a text), kept
   in localStorage and applied on every page; <head> marks the page and
   starts loading Sanscript early so the switch happens before it shows.

   Every Devanagari text node and attribute is recorded with its original
   value and always transliterated from that, never from what is on screen,
   so repeated switches (Telugu -> Tamil -> Devanagari) don't compound
   errors. Nodes added later (the browse page's filters) are picked up as
   they appear. Elements marked data-notr (the script names themselves)
   are left alone.

   window.ssScript.contains(text, query) lets the search boxes match a
   query typed in Telugu, Tamil, Kannada, Malayalam or Grantha against the
   Devanagari titles. */
(function () {
  var TARGETS = [['devanagari', 'देवनागरी'], ['iast', 'IAST'], ['tamil', 'தமிழ்'], ['telugu', 'తెలుగు'],
    ['kannada', 'ಕನ್ನಡ'], ['malayalam', 'മലയാളം'], ['grantha', 'Grantha']];
  var KEY = 'stotra-script';
  var DEVA = /[ऀ-ॿ᳐-᳿꣠-ꣿ]/;
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var root = document.documentElement;
  var texts = [], attrs = [], seen = new WeakSet();
  var current = 'devanagari', waiting = [], loading = false;

  /* Sanscript is loaded only when a script other than Devanagari is wanted. */
  function ensure(cb) {
    if (window.Sanscript) return cb();
    waiting.push(cb);
    if (loading) return;
    loading = true;
    var el = document.getElementById('ss-sanscript');
    if (!el) {
      el = document.createElement('script');
      el.id = 'ss-sanscript';
      el.src = window.SS_SANSCRIPT;
      document.head.appendChild(el);
    }
    var done = function () { var w = waiting; waiting = []; loading = false; if (window.Sanscript) w.forEach(function (f) { f(); }); else reveal(); };
    el.addEventListener('load', done);
    el.addEventListener('error', done);
    if (window.Sanscript) done();
  }

  function skip(el) { return !el || el.closest('script,style,noscript,textarea,[data-notr]'); }

  function collect(node) {
    if (node.nodeType === 3) {
      if (!seen.has(node) && DEVA.test(node.nodeValue) && !skip(node.parentElement)) { seen.add(node); texts.push({ n: node, o: node.nodeValue }); return true; }
      return false;
    }
    if (node.nodeType !== 1 || skip(node)) return false;
    var added = false;
    var els = [node].concat(Array.prototype.slice.call(node.querySelectorAll('[placeholder],[title],[aria-label],[alt]')));
    els.forEach(function (el) {
      if (seen.has(el) || skip(el)) return;
      var any = false;
      ATTRS.forEach(function (a) { var v = el.getAttribute(a); if (v && DEVA.test(v)) { attrs.push({ el: el, a: a, o: v }); any = added = true; } });
      if (any) seen.add(el);
    });
    var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null), t;
    while ((t = walker.nextNode())) if (collect(t)) added = true;
    return added;
  }

  function conv(s) { return current === 'devanagari' ? s : Sanscript.t(s, 'devanagari', current); }

  function render() {
    texts = texts.filter(function (r) { return r.n.isConnected; });
    attrs = attrs.filter(function (r) { return r.el.isConnected; });
    texts.forEach(function (r) { var v = conv(r.o); if (r.n.nodeValue !== v) r.n.nodeValue = v; });
    attrs.forEach(function (r) { r.el.setAttribute(r.a, conv(r.o)); });
    document.querySelectorAll('.stotra-article').forEach(function (a) { a.classList.toggle('iast', current === 'iast'); });
  }

  function reveal() { root.classList.remove('ss-pending'); }

  function apply(target) {
    current = target;
    root.setAttribute('data-script', target);
    if (window.ssFont) window.ssFont(target);
    document.querySelectorAll('[data-script-pick]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-script-pick') === target); });
    var sel = document.getElementById('script-sel');
    if (sel) sel.value = target;
    if (target === 'devanagari') { render(); reveal(); } else ensure(function () { if (current === target) render(); reveal(); });
  }

  function choose(target) {
    apply(target);
    try { localStorage.setItem(KEY, target); } catch (e) {}
  }

  /* Query matching for the search boxes. */
  var RANGES = [['telugu', 0x0C00, 0x0C7F], ['tamil', 0x0B80, 0x0BFF], ['kannada', 0x0C80, 0x0CFF],
    ['malayalam', 0x0D00, 0x0D7F], ['grantha', 0x11300, 0x1137F]];
  function scriptOf(q) {
    for (var i = 0; i < q.length; i++) {
      var c = q.codePointAt(i);
      for (var k = 0; k < RANGES.length; k++) if (c >= RANGES[k][1] && c <= RANGES[k][2]) return RANGES[k][0];
    }
    return null;
  }
  /* Tamil has no letters for aspirates or voiced stops, which Sanscript
     marks with superscript digits; readers type the plain letter (and ன
     for ந). */
  function fold(s) { return s.replace(/[²³⁴‌‍]/g, '').replace(/ன/g, 'ந').toLowerCase(); }
  var cache = new Map(), readyFns = [];
  window.ssScript = {
    current: function () { return current; },
    contains: function (text, q) {
      var sc = scriptOf(q);
      if (!sc) return false;
      if (!window.Sanscript) { ensure(function () { readyFns.forEach(function (f) { f(); }); }); return false; }
      var key = sc + '\u0000' + text, v = cache.get(key);
      if (v === undefined) { v = fold(Sanscript.t(text, 'devanagari', sc)); cache.set(key, v); }
      return v.indexOf(fold(q)) >= 0;
    },
    /* Called again once Sanscript has loaded, so a search waiting on it can rerun. */
    onReady: function (f) { readyFns.push(f); }
  };

  function controls() {
    var sel = document.getElementById('script-sel');
    if (sel) {
      sel.innerHTML = TARGETS.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('');
      sel.closest('[hidden]') && (sel.closest('[hidden]').hidden = false);
      sel.addEventListener('change', function () { choose(sel.value); });
    }
    var bar = document.getElementById('scripts');
    if (bar) {
      bar.insertAdjacentHTML('beforeend', TARGETS.map(function (t) {
        return '<button type="button" class="pill" data-script-pick="' + t[0] + '" aria-pressed="false">' + t[1] + '</button>';
      }).join(''));
      bar.hidden = false;
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('[data-script-pick]');
        if (b) choose(b.getAttribute('data-script-pick'));
      });
    }
  }

  function init() {
    controls();
    collect(document.body);
    var saved = 'devanagari';
    try { saved = localStorage.getItem(KEY) || saved; } catch (e) {}
    if (!TARGETS.some(function (t) { return t[0] === saved; })) saved = 'devanagari';
    apply(saved);
    new MutationObserver(function (ms) {
      var added = false;
      ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (collect(n)) added = true; }); });
      if (added && current !== 'devanagari' && window.Sanscript) render();
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
