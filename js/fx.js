// Motion & interaction layer: preloader, smooth scroll, scroll reveals, counters, cursor, magnetic buttons, tilt.
// Everything degrades gracefully: content is visible by default and only animated when the libraries load.
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // ---------- Smooth scroll ----------
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothTouch: false });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) {
        lenis.raf(t);
        requestAnimationFrame(raf);
      })();
    }
  }

  window.ADScrollTo = function (el) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -72 });
    else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    window.ADScrollTo(el);
  });

  // ---------- Scroll progress & nav state ----------
  const bar = $('#scrollProgress');
  const header = $('#siteHeader');
  let lastY = 0;
  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (header) {
      header.classList.toggle('is-scrolled', y > 40);
      header.classList.toggle('is-hidden', y > 600 && y > lastY + 4);
      if (y < lastY - 4) header.classList.remove('is-hidden');
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Preloader ----------
  const pre = $('#preloader');
  const preCount = $('#preCount');
  let introPlayed = false;
  function finishPreloader() {
    if (introPlayed) return;
    introPlayed = true;
    if (!pre) return heroIntro();
    if (hasGsap && !reduceMotion) {
      gsap.timeline()
        .to(preCount, { innerText: 100, duration: 0.35, snap: { innerText: 1 } })
        .to(pre, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' })
        .add(heroIntro, '-=0.45')
        .set(pre, { display: 'none' });
    } else {
      pre.style.display = 'none';
      heroIntro();
    }
  }
  if (pre && hasGsap && !reduceMotion) {
    const counter = { v: 0 };
    gsap.to(counter, { v: 90, duration: 1.6, ease: 'power2.out', onUpdate: () => (preCount.textContent = Math.round(counter.v)) });
  }
  window.addEventListener('load', () => setTimeout(finishPreloader, 400));
  setTimeout(finishPreloader, 3500);

  // ---------- Hero intro: split headline into words ----------
  const title = $('#heroTitle');
  if (title && hasGsap && !reduceMotion) {
    title.innerHTML = title.textContent
      .trim()
      .split(/\s+/)
      .map((w) => `<span class="word-mask"><span class="word">${w}</span></span>`)
      .join(' ');
    gsap.set('#heroTitle .word', { yPercent: 110 });
    gsap.set('[data-hero]', { autoAlpha: 0, y: 24 });
  }
  function heroIntro() {
    if (!hasGsap || reduceMotion) return;
    gsap.timeline()
      .to('#heroTitle .word', { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06 })
      .to('[data-hero]', { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1 }, '-=0.8');
  }

  // ---------- Scroll reveals ----------
  if (hasGsap && !reduceMotion) {
    $$('[data-reveal]').forEach((el) => {
      const kind = el.dataset.reveal;
      const from = kind === 'left' ? { x: -50 } : kind === 'right' ? { x: 50 } : kind === 'scale' ? { scale: 0.92 } : { y: 50 };
      gsap.from(el, Object.assign({ autoAlpha: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }, from));
    });
    $$('[data-stagger]').forEach((group) => {
      gsap.from(group.children, {
        autoAlpha: 0,
        y: 40,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: { trigger: group, start: 'top 85%', once: true },
      });
    });

    // Process timeline: draw the line as you scroll.
    const line = $('#processLine');
    if (line) {
      gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#process', start: 'top 70%', end: 'bottom 60%', scrub: true } });
    }

    // Giant footer word drifts in.
    const big = $('#bigWord');
    if (big) gsap.fromTo(big, { xPercent: 8 }, { xPercent: -8, ease: 'none', scrollTrigger: { trigger: big, start: 'top bottom', end: 'bottom top', scrub: true } });

    // Hero parallax out.
    gsap.to('#heroContent', { yPercent: -18, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  // ---------- Counters ----------
  function runCounter(el) {
    const end = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (!hasGsap || reduceMotion) return (el.textContent = end.toLocaleString('en-IN') + suffix);
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 2, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString('en-IN') + suffix) });
  }
  $$('[data-count]').forEach((el) => {
    if (hasGsap) ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => runCounter(el) });
    else runCounter(el);
  });

  // ---------- Custom cursor (desktop) ----------
  if (finePointer && !reduceMotion) {
    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    document.body.append(dot, ring);
    document.documentElement.classList.add('has-cursor');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
    });
    (function follow() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(follow);
    })();
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('a, button, select, input, textarea, label, [data-tilt]');
      ring.classList.toggle('is-hover', !!t);
      ring.classList.toggle('is-text', !!(t && t.matches('input, textarea')));
    });
    document.addEventListener('pointerdown', () => ring.classList.add('is-down'));
    document.addEventListener('pointerup', () => ring.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => ring.classList.add('is-gone'));
    document.addEventListener('mouseenter', () => ring.classList.remove('is-gone'));
  }

  // ---------- Magnetic buttons & tilt cards (delegated, so dynamic content works) ----------
  if (finePointer && !reduceMotion) {
    document.addEventListener('pointermove', (e) => {
      const m = e.target.closest('.magnetic');
      $$('.magnetic.is-pulled').forEach((el) => {
        if (el !== m) {
          el.classList.remove('is-pulled');
          el.style.transform = '';
        }
      });
      if (m) {
        const r = m.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        m.classList.add('is-pulled');
        m.style.transform = `translate(${x}px, ${y}px)`;
      }

      const card = e.target.closest('[data-tilt]');
      $$('[data-tilt].is-tilting').forEach((el) => {
        if (el !== card) {
          el.classList.remove('is-tilting');
          el.style.transform = '';
        }
      });
      if (card) {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.classList.add('is-tilting');
        card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 9}deg) translateY(-4px)`;
        card.style.setProperty('--gx', px * 100 + '%');
        card.style.setProperty('--gy', py * 100 + '%');
      }
    });
    document.addEventListener('pointerleave', () => $$('.is-pulled, .is-tilting').forEach((el) => (el.style.transform = '')));
  }

  // ---------- Audio demo button & reactive EQ ----------
  const soundBtns = $$('[data-sound-toggle]');
  const eqBars = $$('.eq-live span');
  if (window.ADAudio) {
    soundBtns.forEach((b) =>
      b.addEventListener('click', () => {
        if (!ADAudio.toggle() && !ADAudio.active && !ADAudio.ctx) b.textContent = 'Audio unavailable';
      })
    );
    const t = window.I18N ? I18N.t : (k) => (k === 'sound.off' ? 'Mute the beat' : 'Feel the sound');
    const syncLabels = () => {
      const on = ADAudio.active;
      document.documentElement.classList.toggle('sound-on', on);
      soundBtns.forEach((b) => {
        b.setAttribute('aria-pressed', String(on));
        const label = b.querySelector('[data-sound-label]');
        if (label) label.textContent = t(on ? 'sound.off' : 'sound.on');
      });
    };
    ADAudio.onChange(syncLabels);
    if (window.I18N) I18N.onChange(syncLabels);
    (function eq() {
      requestAnimationFrame(eq);
      if (!ADAudio.active || !ADAudio.data) return;
      const d = ADAudio.data;
      eqBars.forEach((s, i) => (s.style.height = 4 + (d[2 + i * 5] / 255) * 20 + 'px'));
    })();
  }

  // ---------- Accordion (FAQ) ----------
  document.addEventListener('click', (e) => {
    const q = e.target.closest('[data-faq]');
    if (!q) return;
    const item = q.parentElement;
    const open = item.classList.toggle('is-open');
    q.setAttribute('aria-expanded', String(open));
    const body = item.querySelector('.faq-body');
    body.style.maxHeight = open ? body.scrollHeight + 'px' : '0px';
  });

  window.addEventListener('load', () => hasGsap && ScrollTrigger.refresh());
})();
