/* Lets a visitor re-render a stotra page's Devanagari text in another
   script, using the vendored Sanscript.js (indic-transliteration/sanscript.js).
   Always transliterates fresh from a cached pristine copy of the article's
   original HTML, never from whatever's currently displayed -- this is what
   keeps repeated switches (e.g. Telugu -> Tamil -> Devanagari) correct
   instead of compounding transliteration errors on already-transliterated
   text. */
(function () {
  var TARGETS = [
    { code: "devanagari", label: "Devanagari" },
    { code: "iast", label: "IAST" },
    { code: "telugu", label: "Telugu" },
    { code: "tamil", label: "Tamil" },
    { code: "kannada", label: "Kannada" },
    { code: "malayalam", label: "Malayalam" },
    { code: "grantha", label: "Grantha" },
  ];
  var STORAGE_KEY = "stotra-script";

  function transliterateTextNodes(root, target) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) {
      nodes.push(node);
    }
    nodes.forEach(function (n) {
      if (!n.nodeValue || !n.nodeValue.trim()) return;
      n.nodeValue = Sanscript.t(n.nodeValue, "devanagari", target);
    });
  }

  function init() {
    var article = document.querySelector(".stotra-article");
    if (!article || typeof Sanscript === "undefined") return;

    var originalHTML = article.innerHTML;

    var bar = document.createElement("div");
    bar.className = "script-switcher";

    var label = document.createElement("label");
    label.setAttribute("for", "script-switcher-select");
    label.textContent = "Script:";

    var select = document.createElement("select");
    select.id = "script-switcher-select";
    TARGETS.forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t.code;
      opt.textContent = t.label;
      select.appendChild(opt);
    });

    bar.appendChild(label);
    bar.appendChild(select);
    article.parentNode.insertBefore(bar, article);

    function apply(target) {
      article.innerHTML = originalHTML;
      if (target !== "devanagari") {
        transliterateTextNodes(article, target);
      }
    }

    var saved = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      /* localStorage unavailable (private browsing etc.) -- fall through to default */
    }
    if (saved && TARGETS.some(function (t) { return t.code === saved; })) {
      select.value = saved;
      apply(saved);
    }

    select.addEventListener("change", function () {
      apply(select.value);
      try {
        window.localStorage.setItem(STORAGE_KEY, select.value);
      } catch (e) {
        /* ignore */
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
