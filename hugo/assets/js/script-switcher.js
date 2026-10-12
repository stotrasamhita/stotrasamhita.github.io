/* Re-renders a page's Devanagari text in another script with the vendored
   Sanscript.js. Always transliterates from a pristine copy of the original
   HTML, never from what is on screen, so repeated switches (Telugu ->
   Tamil -> Devanagari) don't compound errors. */
(function () {
  var TARGETS = [['devanagari', 'देवनागरी'], ['iast', 'IAST'], ['tamil', 'தமிழ்'], ['telugu', 'తెలుగు'],
    ['kannada', 'ಕನ್ನಡ'], ['malayalam', 'മലയാളം'], ['grantha', 'Grantha']];
  var KEY = 'stotra-script';

  function transliterate(root, target) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (n) { if (n.nodeValue.trim()) n.nodeValue = Sanscript.t(n.nodeValue, 'devanagari', target); });
  }

  function init() {
    var articles = document.querySelectorAll('.stotra-article');
    var bar = document.getElementById('scripts');
    if (!articles.length || !bar || typeof Sanscript === 'undefined') return;
    var originals = Array.prototype.map.call(articles, function (a) { return a.innerHTML; });

    bar.insertAdjacentHTML('beforeend', TARGETS.map(function (t) {
      return '<button type="button" class="pill" data-script="' + t[0] + '" aria-pressed="false">' + t[1] + '</button>';
    }).join(''));
    bar.hidden = false;

    function apply(target) {
      articles.forEach(function (a, i) {
        a.innerHTML = originals[i];
        a.classList.toggle('iast', target === 'iast');
        if (target !== 'devanagari') transliterate(a, target);
      });
      bar.querySelectorAll('[data-script]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.script === target); });
    }

    var saved = 'devanagari';
    try { saved = localStorage.getItem(KEY) || saved; } catch (e) {}
    if (!TARGETS.some(function (t) { return t[0] === saved; })) saved = 'devanagari';
    apply(saved);

    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-script]');
      if (!b) return;
      apply(b.dataset.script);
      try { localStorage.setItem(KEY, b.dataset.script); } catch (e2) {}
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
