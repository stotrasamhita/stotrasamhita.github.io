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

/* Videos load the YouTube player only when played. */
document.querySelectorAll('.video[data-yt] button').forEach(function (b) {
  b.addEventListener('click', function () {
    var box = b.parentNode, f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + box.getAttribute('data-yt') + '?autoplay=1&rel=0';
    f.title = 'Chanting video';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    box.replaceChildren(f);
  });
});
