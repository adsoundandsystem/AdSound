// Page behaviour: header state, reveal-on-scroll, counters, FAQ accordion, active nav/dock, sound toggle.
// Content is visible without this file; it only adds motion and state.
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.ADScrollTo = function (el) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  // ---------- Header ----------
  const header = $('#siteHeader');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Reveal & counters ----------
  function runCounter(el) {
    const end = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const fmt = (v) => Math.round(v).toLocaleString('en-IN') + suffix;
    if (reduceMotion) return (el.textContent = fmt(end));
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - t0) / 1600);
      el.textContent = fmt(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  if (window.IntersectionObserver) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          if (en.target.dataset.count) runCounter(en.target);
          else en.target.classList.add('is-in');
        }),
      { rootMargin: '0px 0px -8% 0px' }
    );
    $$('.reveal, [data-count]').forEach((el) => io.observe(el));

    // Highlight the section in view in the desktop nav and the mobile dock.
    const links = $$('.nav-link, [data-dock]');
    const spy = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const id = en.target.id === 'hero' ? 'top' : en.target.id;
          links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
        }),
      { rootMargin: '-45% 0px -50% 0px' }
    );
    ['hero', 'plan', 'rigs', 'story', 'abroad', 'faq', 'inquiry'].forEach((id) => $('#' + id) && spy.observe($('#' + id)));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('is-in'));
  }

  // ---------- FAQ accordion ----------
  document.addEventListener('click', (e) => {
    const q = e.target.closest('[data-faq]');
    if (!q) return;
    const item = q.parentElement;
    const open = item.classList.toggle('is-open');
    q.setAttribute('aria-expanded', String(open));
    const body = item.querySelector('.faq-body');
    body.style.maxHeight = open ? body.scrollHeight + 'px' : '0px';
  });

  // ---------- Demo beat toggle ----------
  const soundBtns = $$('[data-sound-toggle]');
  if (window.ADAudio) {
    soundBtns.forEach((b) => b.addEventListener('click', () => ADAudio.toggle()));
    const syncLabels = () => {
      const on = ADAudio.active;
      document.documentElement.classList.toggle('sound-on', on);
      soundBtns.forEach((b) => {
        b.setAttribute('aria-pressed', String(on));
        const label = b.querySelector('[data-sound-label]');
        if (label) label.textContent = I18N.t(on ? 'sound.off' : 'sound.on');
      });
    };
    ADAudio.onChange(syncLabels);
    I18N.onChange(syncLabels);

    // Hero equaliser follows the beat while it plays.
    const bars = $$('.eq i');
    (function eq() {
      requestAnimationFrame(eq);
      if (!ADAudio.active || !ADAudio.data) return;
      bars.forEach((s, i) => (s.style.height = 4 + (ADAudio.data[2 + i * 5] / 255) * 18 + 'px'));
    })();
  } else {
    soundBtns.forEach((b) => (b.hidden = true));
  }
})();
