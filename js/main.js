// Public site: the "Plan your sound" journey (occasion → 3D stage → guests → recommended rig → inquiry),
// the localised catalogue and the inquiry form. No prices are shown anywhere; estimates come from inquiries.
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = window.escapeHtml;
  const t = I18N.t;
  const scrollTo = (el) => (window.ADScrollTo ? window.ADScrollTo(el) : el.scrollIntoView({ behavior: 'smooth' }));
  const fmtNum = (n) => Number(n).toLocaleString('en-IN');

  $('#year').textContent = new Date().getFullYear();
  // "30+ years" grows on its own as time passes (rounded down to a multiple of 5).
  const years = Math.floor((new Date().getFullYear() - AD.business.since) / 5) * 5;
  $('#yearsCount').dataset.count = years;
  $('#yearsCount').textContent = years + '+';

  const brandList = (list) => list.map((b) => `<span>${esc(b)}</span>`).join('');
  $('#speakerBrands').innerHTML = brandList(AD.brands.speakers);
  $('#mixerBrands').innerHTML = brandList(AD.brands.mixers);

  const ticks = (list) => `<ul class="tick-list">${list.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>`;
  const pills = (list) => list.map((b) => `<span class="pill">${esc(b)}</span>`).join('');

  // ---------- Occasions ----------
  // Each occasion picks a 3D scene, the event type sent with the inquiry and a typical crowd size.
  const OCCASIONS = {
    navratri: { scene: 'navratri', eventType: 'Garba / Navratri', guests: 1500, label: 'exp.garba.t' },
    wedding: { scene: 'banquet', eventType: 'Wedding / Sangeet', guests: 300, label: 'exp.wed.t' },
    concert: { scene: 'concert', eventType: 'Concert / Live Show', guests: 2000, label: 'exp.concert.t' },
    small: { scene: 'compact', eventType: 'Corporate Event', guests: 100, label: 'occ.small.t' },
  };
  const VISUAL_TO_OCCASION = { compact: 'small', banquet: 'wedding', concert: 'concert', navratri: 'navratri' };
  const SCENE_PACKAGE = { compact: 0, banquet: 1, concert: 2, navratri: 2 };
  let occasion = 'navratri';
  let guests = OCCASIONS.navratri.guests;

  const rigFor = (n) => AD.packages.find((p) => n <= p.maxGuests) || AD.packages[AD.packages.length - 1];

  // ---------- 3D stage ----------
  let viz = null;
  const hasWebGL = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  })();

  function sceneTitle(scene) {
    return scene === 'concert' || scene === 'navratri' ? t('viz.name.' + scene) : I18N.pkg(AD.packages[SCENE_PACKAGE[scene]]).name;
  }

  function renderStageText() {
    const scene = OCCASIONS[occasion].scene;
    $('#vizTitle').textContent = sceneTitle(scene);
    $('#vizNote').textContent = t('viz.note.' + scene);
  }

  function markView(key) {
    $$('#vizViews [data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  }

  function loadScene() {
    renderStageText();
    markView('audience');
    if (!viz) return;
    try {
      viz.load(OCCASIONS[occasion].scene);
    } catch (e) {
      console.error(e);
      $('#vizFallback').classList.remove('hidden');
    }
  }

  function setPlayLabel() {
    $('#vizPlay').textContent = t(!viz || viz.playing ? 'viz.pause' : 'viz.play');
  }

  // The scenes are heavy, so the WebGL viewer is only built when the planner approaches the viewport.
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
    loadScene();
    setPlayLabel();
  }
  if (window.IntersectionObserver) {
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        io.disconnect();
        startViz();
      }
    }, { rootMargin: '300px 0px' });
    io.observe($('.stage'));
  } else {
    startViz();
  }

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

  // ---------- Occasion + guests → recommendation ----------
  const range = $('#guestRange');

  function selectOccasion(key, { keepGuests } = {}) {
    occasion = key;
    $$('#occasions [data-occ]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.occ === key)));
    if (!keepGuests) setGuests(OCCASIONS[key].guests);
    loadScene();
    renderReco();
  }

  function setGuests(n) {
    guests = Math.max(Number(range.min), Math.min(Number(range.max), Math.round(n)));
    range.value = guests;
    range.style.setProperty('--fill', ((guests - range.min) / (range.max - range.min)) * 100 + '%');
    $('#guestOut').textContent = fmtNum(guests) + (guests >= Number(range.max) ? '+' : '');
    $$('#guestPresets [data-guests]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.guests) === guests)));
  }

  function renderReco() {
    const rig = I18N.pkg(rigFor(guests));
    $('#rigScale').innerHTML = AD.packages
      .map(I18N.pkg)
      .map((p) => `<li class="${p.id === rig.id ? 'is-on' : ''}"><b>${esc(p.name)}</b><span>${esc(p.capacityShort)}</span></li>`)
      .join('');
    $('#planReco').innerHTML = `
      <p class="eyebrow">${esc(t('plan.rig', { n: fmtNum(guests) }))}</p>
      <h3 class="display text-3xl sm:text-4xl mt-3">${esc(rig.name)}</h3>
      <p class="text-muted mt-1">${esc(rig.tagline)}</p>
      <span class="rig-cap">👥 ${esc(rig.capacity)}</span>
      <div class="mt-5">${ticks(rig.gear)}</div>
      <p class="text-sm text-muted mt-5">${esc(t('plan.note'))}</p>
      <button type="button" id="planGo" class="btn btn-sindoor btn-lg w-full sm:w-auto mt-6">${esc(t('plan.go'))}</button>`;
  }

  $('#occasions').addEventListener('click', (e) => {
    const b = e.target.closest('[data-occ]');
    if (b && b.dataset.occ !== occasion) selectOccasion(b.dataset.occ);
  });
  range.addEventListener('input', () => {
    setGuests(Number(range.value));
    renderReco();
  });
  $('#guestPresets').addEventListener('click', (e) => {
    const b = e.target.closest('[data-guests]');
    if (!b) return;
    setGuests(Number(b.dataset.guests));
    renderReco();
  });

  // ---------- Catalogue (re-rendered on language change) ----------
  function renderCatalog() {
    $('#packageGrid').innerHTML = AD.packages
      .map(I18N.pkg)
      .map(
        (p, i) => `
      <article class="rig ${p.featured ? 'rig-featured' : ''}">
        ${p.featured ? `<span class="rig-badge">${esc(t('pkg.most'))}</span>` : ''}
        <span class="rig-no">0${i + 1}</span>
        <h3 class="display text-2xl sm:text-3xl mt-3">${esc(p.name)}</h3>
        <p class="text-muted text-sm mt-1">${esc(p.tagline)}</p>
        <span class="rig-cap">👥 ${esc(p.capacity)}</span>
        <div class="rig-perf"></div>
        <div class="flex-1">${ticks(p.gear)}</div>
        <div class="flex flex-wrap gap-1.5 mt-5">${pills(p.brands)}</div>
        <div class="grid grid-cols-2 gap-2 mt-6">
          <button type="button" class="btn btn-outline" data-view3d="${p.visual}">${esc(t('pkg.view3d'))}</button>
          <button type="button" class="btn btn-sindoor" data-pick="${p.id}">${esc(t('pkg.cta'))}</button>
        </div>
      </article>`
      )
      .join('');

    $('#serviceGrid').innerHTML = AD.services
      .map(I18N.svc)
      .map(
        (s) => `
      <article class="svc reveal is-in">
        <span class="text-xs font-extrabold tracking-[0.2em] text-haldi">${esc(t('svc.label'))} ${esc(s.code)}</span>
        <h3 class="display text-2xl sm:text-3xl mt-2">${esc(s.name)}</h3>
        <div class="mt-5 flex-1">${ticks(s.points)}</div>
        <div class="flex flex-wrap gap-1.5 mt-5">${pills(s.brands)}</div>
        <button type="button" class="btn bg-haldi text-ink hover:bg-paper mt-6" data-pick="${s.id}">${esc(t('pkg.cta'))}</button>
      </article>`
      )
      .join('');

    $('#faqList').innerHTML = I18N.faqs()
      .map(
        ([q, a], i) => `
      <div class="faq-item">
        <button type="button" data-faq aria-expanded="false" aria-controls="faq${i}"><span>${esc(q)}</span><span class="faq-plus" aria-hidden="true">+</span></button>
        <div class="faq-body" id="faq${i}"><p>${esc(a)}</p></div>
      </div>`
      )
      .join('');
  }

  // ---------- Inquiry form ----------
  const form = $('#inquiryForm');
  const pkgSelect = $('#packageSelect');
  const typeSelect = $('#eventTypeSelect');
  const submitBtn = form.querySelector('button[type="submit"]');
  let planned = null; // what the visitor chose in the planner, shown above the form

  // Option values stay English (the admin panel and WhatsApp message read them); labels are localised.
  function renderSelects() {
    const keepPkg = pkgSelect.value;
    const keepType = typeSelect.value;
    pkgSelect.innerHTML =
      `<option value="">${esc(t('f.selectPkg'))}</option>` +
      `<optgroup label="${esc(t('f.optRental'))}">` +
      AD.packages.map(I18N.pkg).map((p) => `<option value="${p.id}">${esc(p.name)} — ${esc(p.capacity)}</option>`).join('') +
      `</optgroup><optgroup label="${esc(t('f.optIntl'))}">` +
      AD.services.map(I18N.svc).map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('') +
      `</optgroup><option value="custom">${esc(t('f.optCustom'))}</option>`;
    const labels = I18N.eventTypes();
    typeSelect.innerHTML = AD.eventTypes.map((v, i) => `<option value="${esc(v)}">${esc(labels[i] || v)}</option>`).join('');
    pkgSelect.value = keepPkg;
    if (keepType) typeSelect.value = keepType;
  }
  form.eventDate.min = todayISO();

  // Suggest a rig from the crowd size typed in the form (and pre-select it if a rental is chosen or nothing is).
  function recommend() {
    const n = parseInt(form.guests.value, 10);
    const hint = $('#recoHint');
    if (!n || n < 1) {
      hint.classList.add('hidden');
      return;
    }
    const base = rigFor(n);
    hint.textContent = '💡 ' + t('f.reco', { name: I18N.pkg(base).name });
    hint.classList.remove('hidden');
    if (!pkgSelect.value || AD.packages.some((p) => p.id === pkgSelect.value)) pkgSelect.value = base.id;
  }
  form.guests.addEventListener('input', recommend);

  function renderPlanSummary() {
    const tag = $('#planSummary');
    if (!planned) return tag.classList.add('hidden');
    tag.innerHTML = `<span>🧭</span><span>${esc(t('plan.summary', { occ: t(OCCASIONS[planned.occasion].label).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&'), n: fmtNum(planned.guests), rig: I18N.pkg(rigFor(planned.guests)).name }))}</span>`;
    tag.classList.remove('hidden');
  }

  function goToForm() {
    scrollTo($('#inquiry'));
    setTimeout(() => form.name.focus({ preventScroll: true }), 900);
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#planGo')) {
      planned = { occasion, guests };
      pkgSelect.value = rigFor(guests).id;
      typeSelect.value = OCCASIONS[occasion].eventType;
      form.guests.value = guests;
      recommend();
      renderPlanSummary();
      goToForm();
      return;
    }
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      pkgSelect.value = pick.dataset.pick;
      goToForm();
    }
    const v3d = e.target.closest('[data-view3d]');
    if (v3d) {
      const key = VISUAL_TO_OCCASION[v3d.dataset.view3d] || 'navratri';
      if (key !== occasion) selectOccasion(key);
      scrollTo($('#occasions'));
    }
  });

  form.addEventListener('submit', async (e) => {
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
    data.status = 'Pending';

    const label = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.textContent = t('f.sending');
    try {
      const saved = await ADCloud.inquiries.add(data);
      form.reset();
      form.days.value = 1;
      planned = null;
      renderPlanSummary();
      $('#recoHint').classList.add('hidden');
      showSuccess(saved);
    } catch (ex) {
      console.error(ex);
      err.textContent = t(ADCloud.isCloud ? 'err.network' : 'err.save');
      err.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = label;
    }
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
    renderStageText();
    renderReco();
    renderPlanSummary();
    setPlayLabel();
    recommend();
  }
  setGuests(guests);
  renderLocalised();
  I18N.onChange(renderLocalised);
})();
