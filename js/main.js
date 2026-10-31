// Public site: renders catalog from AD data (localised via I18N), drives the 3D visualizer, estimator and the inquiry form.
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = window.escapeHtml;
  const t = I18N.t;
  const scrollTo = (el) => (window.ADScrollTo ? window.ADScrollTo(el) : el.scrollIntoView({ behavior: 'smooth' }));

  $('#year').textContent = new Date().getFullYear();

  // Mobile menu
  const menuBtn = $('#menuBtn');
  const mobileMenu = $('#mobileMenu');
  menuBtn.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('hidden') === false;
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  mobileMenu.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') mobileMenu.classList.add('hidden');
  });

  // Brands never change with language: marquees (doubled for a seamless loop) + tiles.
  const marquee = (list) => {
    const items = list.concat(list, list).map((b) => `<span class="marquee-item">${esc(b)}</span>`).join('');
    return items + items;
  };
  $('#marqueeSpeakers').innerHTML = marquee(AD.brands.speakers);
  $('#marqueeMixers').innerHTML = marquee(AD.brands.mixers);
  const brandTile = (b) => `<div class="brand-tile panel !rounded-xl px-2 py-5 text-center text-sm sm:text-base">${esc(b)}</div>`;
  $('#speakerBrands').innerHTML = AD.brands.speakers.map(brandTile).join('');
  $('#mixerBrands').innerHTML = AD.brands.mixers.map(brandTile).join('');

  const tick = (g) => `<li class="flex gap-2"><span class="text-accent">▸</span><span>${esc(g)}</span></li>`;
  const priceRange = (p) => p.price.replace(' / day', '');

  // ---------- Catalogue (re-rendered on language change) ----------
  function renderCatalog() {
    $('#packageGrid').innerHTML = AD.packages
      .map(I18N.pkg)
      .map(
        (p, i) => `
      <article class="glow-card p-7 flex flex-col ${p.featured ? '!border-accent/60 shadow-[0_0_60px_-20px_rgba(245,158,11,0.45)]' : ''}" data-tilt>
        <div class="flex items-start justify-between gap-3">
          <span class="font-display text-5xl text-zinc-800">0${i + 1}</span>
          ${p.featured ? `<span class="badge !text-accent !border-accent/40">${esc(t('pkg.most'))}</span>` : ''}
        </div>
        <h3 class="font-display text-2xl sm:text-3xl text-white mt-2">${esc(p.name)}</h3>
        <p class="text-zinc-400 text-sm mt-1">${esc(p.tagline)}</p>
        <div class="mt-6 flex items-baseline gap-2 flex-wrap">
          <span class="font-display text-3xl text-accent">${esc(priceRange(p))}</span>
          <span class="text-zinc-500 text-sm">${esc(t('perDay'))}</span>
        </div>
        <p class="text-sm text-zinc-300 mt-1">👥 ${esc(p.capacity)}</p>
        <ul class="mt-6 space-y-2 text-sm text-zinc-300 flex-1">${p.gear.map(tick).join('')}</ul>
        <div class="flex flex-wrap gap-1.5 mt-6">${p.brands.map((b) => `<span class="badge">${esc(b)}</span>`).join('')}</div>
        <div class="mt-7 grid grid-cols-2 gap-2">
          <button class="btn btn-ghost btn-sm !rounded-full" data-view3d="${p.visual}">${esc(t('pkg.view3d'))}</button>
          <button class="btn btn-primary btn-sm !rounded-full" data-pick="${p.id}">${esc(t('pkg.quote'))}</button>
        </div>
      </article>`
      )
      .join('');

    $('#serviceGrid').innerHTML = AD.services
      .map(I18N.svc)
      .map(
        (s) => `
      <article class="glow-card p-7 flex flex-col" data-tilt>
        <span class="text-xs font-semibold text-accent tracking-widest">${esc(t('svc.label'))} ${esc(s.code)}</span>
        <h3 class="font-display text-2xl sm:text-3xl text-white mt-1">${esc(s.name)}</h3>
        <div class="mt-5 flex flex-wrap items-baseline gap-x-3">
          <span class="font-display text-3xl text-accent">$${s.rates.USD} USD</span>
          <span class="text-zinc-400">/ $${s.rates.CAD} CAD</span>
          <span class="text-zinc-500 text-sm">${esc(t(s.unit === 'day' ? 'unit.perDay' : 'unit.project'))}</span>
        </div>
        <ul class="mt-6 space-y-2 text-sm text-zinc-300 flex-1">${s.points.map(tick).join('')}</ul>
        <div class="flex flex-wrap gap-1.5 mt-6">${s.brands.map((b) => `<span class="badge">${esc(b)}</span>`).join('')}</div>
        <button class="btn btn-primary btn-sm !rounded-full mt-7" data-pick="${s.id}">${esc(t('svc.book'))}</button>
      </article>`
      )
      .join('');

    const summaryRows = AD.packages
      .map(I18N.pkg)
      .map((p) => [p.name, p.capacityShort, p.brands.slice(0, 4).join(' / '), `${priceRange(p)} ${t('perDay')}`])
      .concat(AD.services.map(I18N.svc).map((s) => [s.name, t('sum.global'), `${s.brands.join(' / ')} ${t('sum.showfiles')}`, `$${s.rates.USD} USD / $${s.rates.CAD} CAD ${t(s.unit === 'day' ? 'unit.perDay' : 'unit.project')}`]));
    $('#summaryBody').innerHTML = summaryRows
      .map((r) => `<tr class="hover:bg-zinc-900/40 transition-colors">${r.map((c, i) => `<td class="p-4 ${i === 0 ? 'text-white font-medium' : 'text-zinc-400'} ${i === 3 ? '!text-accent whitespace-nowrap' : ''}">${esc(c)}</td>`).join('')}</tr>`)
      .join('');

    $('#faqList').innerHTML = I18N.faqs()
      .map(
        ([q, a], i) => `
      <div class="faq-item">
        <button type="button" class="w-full flex items-center justify-between gap-6 py-5 text-left" data-faq aria-expanded="false" aria-controls="faq${i}">
          <span class="font-display text-lg sm:text-xl text-white">${esc(q)}</span>
          <span class="faq-plus text-2xl text-zinc-500 leading-none">+</span>
        </button>
        <div class="faq-body" id="faq${i}"><p class="pb-5 text-zinc-400 max-w-2xl">${esc(a)}</p></div>
      </div>`
      )
      .join('');
  }

  // ---------- 3D visualizer ----------
  const VIZ_PACKAGE = { compact: 0, banquet: 1, concert: 2, navratri: 2 };
  let viz = null;
  let current = 'compact';
  const hasWebGL = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  })();

  function renderVizInfo() {
    const p = I18N.pkg(AD.packages[VIZ_PACKAGE[current]]);
    const title = current === 'concert' || current === 'navratri' ? t('viz.name.' + current) : p.name;
    $('#vizInfo').innerHTML = `
      <p class="text-xs uppercase tracking-widest text-accent font-semibold">${esc(t('viz.now'))}</p>
      <h3 class="font-display text-2xl text-white mt-1">${esc(title)}</h3>
      <p class="text-sm text-zinc-400 mt-2">${esc(t('viz.note.' + current))}</p>
      <dl class="mt-5 space-y-3 text-sm">
        <div class="flex justify-between gap-4"><dt class="text-zinc-500">${esc(t('viz.capacity'))}</dt><dd class="text-white text-right">${esc(p.capacity)}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-zinc-500">${esc(t('viz.rate'))}</dt><dd class="text-accent text-right">${esc(priceRange(p))} ${esc(t('perDay'))}</dd></div>
      </dl>
      <ul class="mt-5 space-y-1.5 text-sm text-zinc-300">${p.gear.map(tick).join('')}</ul>
      <button class="btn btn-primary btn-sm !rounded-full w-full mt-6" data-pick="${p.id}">${esc(t('viz.quote'))}</button>`;
  }

  function markView(key) {
    $$('#vizViews [data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  }

  function showSetup(name) {
    current = name;
    $$('.viz-tab').forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.setup === name)));
    renderVizInfo();
    markView('audience');
    if (!viz) return;
    try {
      viz.load(name);
    } catch (e) {
      console.error(e);
      $('#vizFallback').classList.remove('hidden');
    }
  }

  function setPlayLabel() {
    $('#vizPlay').textContent = t(!viz || viz.playing ? 'viz.pause' : 'viz.play');
  }

  // Build the WebGL viewer only when the section approaches the viewport: the scenes are heavy,
  // and most visitors' first seconds are spent on the hero.
  let vizStarted = false;
  function startViz() {
    if (vizStarted) return;
    vizStarted = true;
    if (hasWebGL && window.THREE && THREE.OrbitControls) {
      try {
        viz = window.ADVisualizer($('#viz'));
      } catch (e) {
        console.error(e);
      }
    }
    if (!viz) $('#vizFallback').classList.remove('hidden');
    showSetup(current);
    setPlayLabel();
  }
  if (window.IntersectionObserver) {
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        io.disconnect();
        startViz();
      }
    }, { rootMargin: '400px 0px' });
    io.observe($('#visualizer'));
  } else {
    startViz();
  }
  showSetup('compact');
  setPlayLabel();

  $('#vizTabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-setup]');
    if (b && b.dataset.setup !== current) showSetup(b.dataset.setup);
  });
  $('#vizViews').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (!b || !viz) return;
    viz.setView(b.dataset.view);
    markView(b.dataset.view);
  });
  $('#vizPlay').addEventListener('click', (e) => {
    if (!viz) return;
    viz.playing = !viz.playing;
    e.currentTarget.setAttribute('aria-pressed', String(viz.playing));
    setPlayLabel();
  });
  $('#vizReset').addEventListener('click', () => {
    if (!viz) return;
    viz.setView('audience');
    markView('audience');
  });

  // ---------- Instant estimator ----------
  const est = { mode: 'india', addons: new Set(), services: new Set(['showfile', 'virtual']), currency: 'USD' };
  const ESTIMATOR_ADDONS = [0, 1, 2]; // indexes into AD.addons: transport, engineer, DG set

  function renderEstimatorChips() {
    $('#estAddons').innerHTML = ESTIMATOR_ADDONS.map((i) => `<button type="button" class="chip" data-addon="${i}" aria-pressed="${est.addons.has(i)}">+ ${esc(I18N.addon(i))}</button>`).join('');
    $('#estServices').innerHTML = AD.services.map(I18N.svc).map((s) => `<button type="button" class="chip" data-service="${s.id}" aria-pressed="${est.services.has(s.id)}">${esc(s.name)}</button>`).join('');
  }

  function setFill(input) {
    input.style.setProperty('--fill', ((input.value - input.min) / (input.max - input.min)) * 100 + '%');
  }
  const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
  const dayWord = (n) => t(n > 1 ? 'unit.days' : 'unit.day');

  function recommend(guests) {
    return AD.packages.find((p) => guests <= p.maxGuests) || AD.packages[AD.packages.length - 1];
  }

  function renderEstimate() {
    const out = { name: $('#estName'), sub: $('#estSub'), total: $('#estTotal'), list: $('#estBreakdown') };
    const row = (label, value) => `<li class="flex justify-between gap-3"><span>${esc(label)}</span><span class="text-zinc-400 whitespace-nowrap">${esc(value)}</span></li>`;
    if (est.mode === 'india') {
      const guests = Number($('#estGuests').value);
      const days = Number($('#estDays').value);
      $('#estGuestsOut').textContent = guests >= 3000 ? '3,000+' : guests.toLocaleString('en-IN');
      $('#estDaysOut').textContent = days;
      const base = recommend(guests);
      const p = I18N.pkg(base);
      // Within a package, scale toward the top of the range as the crowd grows.
      const prev = AD.packages[AD.packages.indexOf(base) - 1];
      const lo = prev ? prev.maxGuests : 0;
      const k = Math.min(1, Math.max(0, (guests - lo) / (p.maxGuests - lo)));
      const dayMin = p.priceMin + (p.priceMax - p.priceMin) * k * 0.5;
      const dayMax = p.priceMin + (p.priceMax - p.priceMin) * (0.5 + k * 0.5);
      let addTotal = 0;
      const lines = [row(`${p.name} × ${days} ${dayWord(days)}`, `${inr(dayMin * days)} – ${inr(dayMax * days)}`)];
      est.addons.forEach((i) => {
        const amt = AD.addons[i].rate * days;
        addTotal += amt;
        lines.push(row(I18N.addon(i), inr(amt)));
      });
      out.name.textContent = p.name;
      out.sub.textContent = `${p.capacity} · ${p.brands.slice(0, 3).join(' / ')}`;
      out.total.textContent = `${inr(dayMin * days + addTotal)} – ${inr(dayMax * days + addTotal)}`;
      out.list.innerHTML = lines.join('');
      est.pick = { packageId: p.id, days, guests };
    } else {
      const nights = Number($('#estNights').value);
      $('#estNightsOut').textContent = nights;
      const sym = est.currency === 'CAD' ? 'C$' : '$';
      let total = 0;
      const lines = [];
      const chosen = AD.services.filter((s) => est.services.has(s.id)).map(I18N.svc);
      chosen.forEach((s) => {
        const units = s.unit === 'day' ? nights : 1;
        const amt = s.rates[est.currency] * units;
        total += amt;
        lines.push(row(units > 1 ? `${s.name} × ${units} ${t('unit.nights')}` : s.name, `${sym}${amt.toLocaleString()}`));
      });
      out.name.textContent = chosen.length === 2 ? t('est.full') : chosen.length ? chosen[0].name : t('est.pick');
      out.sub.textContent = t('est.remoteSub');
      out.total.textContent = total ? `${sym}${total.toLocaleString()} ${est.currency}` : '-';
      out.list.innerHTML = lines.join('');
      est.pick = { packageId: chosen.length === 1 ? chosen[0].id : 'virtual', days: nights, guests: '' };
    }
    ['#estGuests', '#estDays', '#estNights'].forEach((s) => setFill($(s)));
  }

  ['#estGuests', '#estDays', '#estNights'].forEach((s) => $(s).addEventListener('input', renderEstimate));

  $('#estMode').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    est.mode = b.dataset.mode;
    $$('#estMode .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    $('#estIndia').classList.toggle('hidden', est.mode !== 'india');
    $('#estIntl').classList.toggle('hidden', est.mode !== 'intl');
    renderEstimate();
  });
  $('#estAddons').addEventListener('click', (e) => {
    const b = e.target.closest('[data-addon]');
    if (!b) return;
    const i = Number(b.dataset.addon);
    est.addons.has(i) ? est.addons.delete(i) : est.addons.add(i);
    b.setAttribute('aria-pressed', String(est.addons.has(i)));
    renderEstimate();
  });
  $('#estServices').addEventListener('click', (e) => {
    const b = e.target.closest('[data-service]');
    if (!b) return;
    const id = b.dataset.service;
    est.services.has(id) ? est.services.delete(id) : est.services.add(id);
    b.setAttribute('aria-pressed', String(est.services.has(id)));
    renderEstimate();
  });
  $('#estCurrency').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cur]');
    if (!b) return;
    est.currency = b.dataset.cur;
    $$('#estCurrency .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    renderEstimate();
  });

  // ---------- Inquiry form ----------
  const form = $('#inquiryForm');
  const pkgSelect = $('#packageSelect');
  const typeSelect = $('#eventTypeSelect');

  // Option values stay English (the admin panel and WhatsApp message read them); labels are localised.
  function renderSelects() {
    const keepPkg = pkgSelect.value;
    const keepType = typeSelect.value;
    pkgSelect.innerHTML =
      `<option value="">${esc(t('f.selectPkg'))}</option>` +
      `<optgroup label="${esc(t('f.optRental'))}">` +
      AD.packages.map(I18N.pkg).map((p) => `<option value="${p.id}">${esc(p.name)} — ${esc(priceRange(p))} ${esc(t('perDay'))}</option>`).join('') +
      `</optgroup><optgroup label="${esc(t('f.optIntl'))}">` +
      AD.services.map(I18N.svc).map((s) => `<option value="${s.id}">${esc(s.name)} — $${s.rates.USD} USD / $${s.rates.CAD} CAD</option>`).join('') +
      `</optgroup><option value="custom">${esc(t('f.optCustom'))}</option>`;
    const labels = I18N.eventTypes();
    typeSelect.innerHTML = AD.eventTypes.map((v, i) => `<option value="${esc(v)}">${esc(labels[i] || v)}</option>`).join('');
    pkgSelect.value = keepPkg;
    if (keepType) typeSelect.value = keepType;
  }
  form.eventDate.min = todayISO();

  function goToForm() {
    scrollTo($('#inquiry'));
    setTimeout(() => form.name.focus({ preventScroll: true }), 1100);
  }

  $('#estCta').addEventListener('click', () => {
    const p = est.pick;
    pkgSelect.value = p.packageId;
    form.days.value = p.days;
    form.guests.value = p.guests;
    if (est.mode === 'intl') {
      const names = AD.services.filter((s) => est.services.has(s.id)).map((s) => s.name);
      if (names.length > 1 && !form.message.value) form.message.value = 'Interested in: ' + names.join(' + ');
    }
    goToForm();
  });

  document.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      pkgSelect.value = pick.dataset.pick;
      goToForm();
    }
    const v3d = e.target.closest('[data-view3d]');
    if (v3d) {
      if (v3d.dataset.view3d !== current) showSetup(v3d.dataset.view3d);
      scrollTo($('#visualizer'));
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('#formError');
    const data = Object.fromEntries(new FormData(form).entries());
    Object.keys(data).forEach((k) => (data[k] = String(data[k]).trim()));

    const missing = [];
    if (!data.name) missing.push(t('err.name'));
    if (!data.phone || data.phone.replace(/\D/g, '').length < 7) missing.push(t('err.phone'));
    if (!data.location) missing.push(t('err.location'));
    if (!data.packageId) missing.push(t('err.package'));
    if (!data.eventDate) missing.push(t('err.date'));
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) missing.push(t('err.email'));
    if (missing.length) {
      err.textContent = t('err.provide', { list: missing.join(', ') });
      err.classList.remove('hidden');
      return;
    }
    err.classList.add('hidden');

    data.days = Math.max(1, parseInt(data.days, 10) || 1);
    data.guests = data.guests ? parseInt(data.guests, 10) : '';
    const offering = findOffering(data.packageId);
    data.packageName = offering ? offering.name : 'Custom requirement';
    data.language = I18N.lang;

    const saved = Store.add(data);
    if (!saved) {
      err.textContent = t('err.save');
      err.classList.remove('hidden');
      return;
    }
    form.reset();
    form.days.value = 1;
    showSuccess(saved);
  });

  function showSuccess(inq) {
    const text = [
      `New inquiry ${inq.id} — AD Sound And System`,
      `Name: ${inq.name}`,
      `Phone: ${inq.phone}`,
      inq.email && `Email: ${inq.email}`,
      `Location: ${inq.location}`,
      `Package: ${inq.packageName}`,
      `Event: ${inq.eventType} on ${inq.eventDate} (${inq.days} day/s)`,
      inq.guests && `Guests: ${inq.guests}`,
      inq.venue && `Venue: ${inq.venue}`,
      inq.message && `Message: ${inq.message}`,
    ]
      .filter(Boolean)
      .join('\n');
    $('#successRef').textContent = inq.id;
    $('#successWa').href = `https://wa.me/${AD.business.phoneRaw}?text=${encodeURIComponent(text)}`;
    $('#successMail').href = `mailto:${AD.business.email}?subject=${encodeURIComponent('Sound Inquiry ' + inq.id)}&body=${encodeURIComponent(text)}`;
    $('#successModal').classList.remove('hidden');
    $('#successWa').focus();
  }

  const closeModal = () => $('#successModal').classList.add('hidden');
  $('#successClose').addEventListener('click', closeModal);
  $('#successModal').addEventListener('click', (e) => e.target.id === 'successModal' && closeModal());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeModal());

  // ---------- Initial render + language switching ----------
  function renderLocalised() {
    renderCatalog();
    renderSelects();
    renderEstimatorChips();
    renderEstimate();
    renderVizInfo();
    setPlayLabel();
  }
  renderLocalised();
  I18N.onChange(renderLocalised);
})();
