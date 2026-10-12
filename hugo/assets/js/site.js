/* Light/dark toggle (the stored choice is applied in <head>), and the
   homepage's day-of-the-week panel. */
(function () {
  var root = document.documentElement;
  var btn = document.getElementById('theme-btn');
  if (btn) btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('ss-theme', next); } catch (e) {}
  });

  var days = document.querySelectorAll('.today[data-day]');
  if (days.length) {
    var d = String(new Date().getDay());
    days.forEach(function (el) { el.hidden = el.getAttribute('data-day') !== d; });
  }
})();
