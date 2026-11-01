// Admin panel: sign-in flow, dashboard, inquiries, estimations (with PDF) and the Price Master.
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = window.escapeHtml;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 8);

  const state = { inquiries: [], estimates: [], master: null, draft: null, dirty: false, tab: 'dashboard', filter: 'All', editing: null };
  const EST_STATUSES = ['Draft', 'Sent', 'Accepted', 'Rejected'];
  const TABS = ['dashboard', 'inquiries', 'estimates', 'master', 'settings'];

  const ERR = {
    bad: 'Incorrect ID or password.',
    locked: 'Too many attempts. Please wait a few minutes and try again.',
    short: 'Password must be at least 8 characters.',
    weak: 'Password must contain at least one letter and one number.',
    temp: 'Please choose a password different from the temporary one.',
    mismatch: 'The two passwords do not match.',
    relogin: 'For security, please sign in again and then change the password.',
    failed: 'Something went wrong. Please try again.',
  };
  const errText = (e) => ERR[e && e.code] || (e && e.message) || ERR.failed;

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  function fmtDate(iso, withTime) {
    if (!iso) return '-';
    const d = new Date(String(iso).length === 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d)) return iso;
    const o = { day: '2-digit', month: 'short', year: 'numeric' };
    if (withTime) Object.assign(o, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleString('en-GB', o);
  }

  function showMsg(el, text, ok) {
    el.textContent = text;
    el.className = ok ? 'ok text-sm' : 'err text-sm';
    el.hidden = !text;
  }

  // =====================================================================
  // Sign in / permanent password / forgot password
  // =====================================================================
  const AUTH_VIEWS = {
    loginForm: ['Admin sign in', 'Enter your admin ID and password.'],
    setPassForm: ['Set a permanent password', 'This replaces the temporary password.'],
    forgotForm: ['Reset password', 'We will e-mail you a secure reset link.'],
  };

  function showAuth(view) {
    $('#appView').hidden = true;
    $('#authView').hidden = false;
    Object.keys(AUTH_VIEWS).forEach((id) => ($('#' + id).hidden = id !== view));
    $('#authTitle').textContent = AUTH_VIEWS[view][0];
    $('#authSub').textContent = AUTH_VIEWS[view][1];
    const first = $('#' + view + ' input');
    if (first) setTimeout(() => first.focus(), 50);
  }

  $('#modeNote').textContent = ADAuth.mode === 'cloud' ? 'Secured with Firebase Authentication' : 'Browser-only mode · data stays in this browser';

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-toggle-pass]');
    if (!b) return;
    const input = $('#' + b.dataset.togglePass);
    input.type = input.type === 'password' ? 'text' : 'password';
    b.textContent = input.type === 'password' ? 'Show' : 'Hide';
  });

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#loginErr');
    err.hidden = true;
    const btn = e.submitter || $('#loginForm button[type="submit"]');
    btn.disabled = true;
    try {
      const res = await ADAuth.login($('#loginEmail').value, $('#loginPass').value);
      $('#loginPass').value = '';
      if (res.mustChange) showAuth('setPassForm');
      else enterApp(res.email);
    } catch (ex) {
      showMsg(err, errText(ex));
      $('#loginPass').select();
    } finally {
      btn.disabled = false;
    }
  });

  $('#setPassForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#setPassErr');
    const a = $('#newPass').value, b = $('#newPass2').value;
    if (a !== b) return showMsg(err, ERR.mismatch);
    try {
      await ADAuth.setPermanentPassword(a);
      $('#newPass').value = $('#newPass2').value = '';
      toast('Permanent password saved');
      enterApp(ADAuth.admin);
    } catch (ex) {
      if (ex.code === 'relogin') {
        await ADAuth.logout();
        showAuth('loginForm');
        showMsg($('#loginErr'), ERR.relogin);
        return;
      }
      showMsg(err, errText(ex));
    }
  });

  $('#showForgot').addEventListener('click', () => {
    $('#forgotEmail').value = $('#loginEmail').value;
    $('#forgotMsg').hidden = true;
    showAuth('forgotForm');
  });
  $('#backToLogin').addEventListener('click', () => showAuth('loginForm'));

  $('#forgotForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#forgotMsg');
    try {
      await ADAuth.forgot($('#forgotEmail').value);
      showMsg(msg, 'If this is the admin e-mail, a password-reset link has been sent. Please check the inbox (and the spam folder).', true);
    } catch (ex) {
      if (ex.code === 'noCloud') {
        showMsg(msg, 'Reset e-mails need the Firebase cloud setup (see README → "Firebase setup"). It is not configured yet, so an e-mail cannot be sent.');
      } else {
        showMsg(msg, errText(ex));
      }
    }
  });

  $('#logoutBtn').addEventListener('click', async () => {
    if (state.dirty && !confirm('You have unsaved Price Master changes. Sign out anyway?')) return;
    await ADAuth.logout();
    location.hash = '';
    location.reload();
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // =====================================================================
  // App shell
  // =====================================================================
  async function enterApp(email) {
    $('#authView').hidden = true;
    $('#appView').hidden = false;
    $('#userEmail').textContent = email;
    $('#modeBadge').textContent = ADAuth.mode === 'cloud' ? '☁ Cloud sync' : '💾 Browser-only';
    $('#modeBadge').classList.remove('hidden');
    setTab(TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard');
    await loadAll();
  }

  async function loadAll() {
    try {
      const [inq, est, master] = await Promise.all([ADCloud.inquiries.list(), ADCloud.estimates.list(), ADCloud.master.get()]);
      state.inquiries = inq;
      state.estimates = est;
      state.master = master && master.items ? master : clone(ADMIN_DEFAULT_MASTER);
      if (!state.dirty) state.draft = clone(state.master);
      state.loadError = false;
      $('#globalNotice').innerHTML = '';
    } catch (ex) {
      console.error(ex);
      state.loadError = true;
      $('#globalNotice').innerHTML = `<div class="notice mb-4">Could not load data: ${esc(ex.message || ex)}. If you just connected Firebase, make sure the Firestore security rules from <code>firestore.rules</code> are published.</div>`;
      state.master = state.master || clone(ADMIN_DEFAULT_MASTER);
      state.draft = state.draft || clone(state.master);
    }
    renderTab();
  }

  function setTab(tab) {
    state.tab = tab;
    $$('#tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    $$('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== tab));
    if (location.hash.slice(1) !== tab) history.replaceState(null, '', '#' + tab);
    renderTab();
  }
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) setTab(b.dataset.tab);
  });
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-goto]');
    if (g) setTab(g.dataset.goto);
  });

  function renderTab() {
    if (!state.master) return;
    // Dashboard shows its own notices; other tabs start clean (load errors re-add theirs).
    if (state.tab !== 'dashboard' && !state.loadError) $('#globalNotice').innerHTML = '';
    ({ dashboard: renderDashboard, inquiries: renderInquiries, estimates: renderEstimates, master: renderMaster, settings: renderSettings })[state.tab]();
  }

  const masterHasRates = () => state.master.items.some((i) => Object.values(i.rates || {}).some((v) => Number(v) > 0));

  // =====================================================================
  // Dashboard
  // =====================================================================
  function renderDashboard() {
    const inq = state.inquiries;
    const count = (s) => inq.filter((i) => i.status === s).length;
    const cards = [
      ['Total inquiries', inq.length, 'text-white'],
      ['Pending', count('Pending'), 'text-amber-400'],
      ['Confirmed', count('Confirmed'), 'text-blue-300'],
      ['Estimations', state.estimates.length, 'text-green-300'],
    ];
    $('#dashStats').innerHTML = cards.map(([l, n, c]) => `<div class="card p-4"><p class="text-xs" style="color:var(--muted)">${l}</p><p class="text-3xl font-bold ${c}">${n}</p></div>`).join('');
    let notes = '';
    if (state.loadError) return;
    if (!masterHasRates()) notes += `<div class="notice mb-3">Your Price Master rates are all 0. <button class="link" data-goto="master">Set your rates →</button></div>`;
    if (ADAuth.mode !== 'cloud') notes += `<div class="notice info mb-3">Browser-only mode: inquiries appear here only when submitted on this same browser, and password-reset e-mails are off. Connect Firebase (README → "Firebase setup") to receive inquiries from every visitor's device.</div>`;
    $('#globalNotice').innerHTML = notes;
    const row = (i) => `<div class="flex items-center justify-between gap-3 py-2 border-b" style="border-color:#1d1d23"><div class="min-w-0"><p class="text-white text-sm truncate">${esc(i.name || '—')}</p><p class="text-xs truncate" style="color:var(--muted)">${esc(i.packageName || '')} · ${fmtDate(i.eventDate)}</p></div><span class="status st-${esc(i.status)}">${esc(i.status)}</span></div>`;
    $('#dashInquiries').innerHTML = inq.slice(0, 6).map(row).join('') || `<p class="text-sm" style="color:var(--muted)">No inquiries yet.</p>`;
    $('#dashEstimates').innerHTML =
      state.estimates
        .slice(0, 6)
        .map((e) => `<div class="flex items-center justify-between gap-3 py-2 border-b" style="border-color:#1d1d23"><div class="min-w-0"><p class="text-white text-sm truncate">${esc(e.customer.name || '—')} <span style="color:var(--muted)">· ${esc(e.quoteNo)}</span></p><p class="text-xs" style="color:var(--muted)">${fmtMoney(QuotePDF.calc(e).total, e.currency)}</p></div><span class="status st-${esc(e.status)}">${esc(e.status)}</span></div>`)
        .join('') || `<p class="text-sm" style="color:var(--muted)">No estimations yet.</p>`;
  }

  // =====================================================================
  // Inquiries
  // =====================================================================
  function renderInquiries() {
    $('#inqFilter').innerHTML = ['All'].concat(AD.statuses).map((s) => `<button class="btn btn-ghost btn-sm ${s === state.filter ? '!border-amber-500 !text-amber-400' : ''}" data-filter="${s}">${s}</button>`).join('');
    const q = $('#inqSearch').value.trim().toLowerCase();
    const list = state.inquiries.filter((i) => (state.filter === 'All' || i.status === state.filter) && (!q || [i.id, i.name, i.phone, i.email, i.location, i.venue, i.packageName].join(' ').toLowerCase().includes(q)));
    const empty = $('#inqEmpty');
    empty.hidden = list.length > 0;
    empty.textContent = state.inquiries.length ? 'No inquiries match this filter.' : 'No inquiries yet. Website inquiries appear here, or add one with “+ New inquiry”.';
    $('#inqBody').innerHTML = list
      .map((i) => {
        const wa = String(i.phone || '').replace(/\D/g, '');
        const est = state.estimates.find((e) => e.inquiryId === i.id);
        return `<tr>
          <td data-label="Ref"><div class="font-mono text-xs text-white">${esc(i.id)}</div><div class="text-xs" style="color:var(--muted)">${fmtDate(i.createdAt, true)}</div></td>
          <td data-label="Customer"><div class="text-white font-medium">${esc(i.name || '—')}</div><div class="text-xs" style="color:#a1a1aa">${esc(i.phone || '')}</div><div class="text-xs" style="color:var(--muted)">${esc(i.location || '')}</div></td>
          <td data-label="Package"><div>${esc(i.packageName || '-')}</div>${i.guests ? `<div class="text-xs" style="color:var(--muted)">👥 ${esc(i.guests)} guests</div>` : ''}${i.message ? `<div class="text-xs mt-1" style="color:var(--muted)">💬 ${esc(String(i.message).slice(0, 80))}</div>` : ''}</td>
          <td data-label="Event"><div>${fmtDate(i.eventDate)}</div><div class="text-xs" style="color:var(--muted)">${esc(i.eventType || '')}${i.days > 1 ? ` · ${esc(i.days)} days` : ''}</div></td>
          <td data-label="Status"><span class="status st-${esc(i.status)}">${esc(i.status)}</span>
            <select data-status="${esc(i.id)}" class="field !py-1 !px-2 !text-xs mt-1.5 !w-auto">${AD.statuses.map((s) => `<option ${s === i.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
          <td data-label="Actions"><div class="flex sm:justify-end flex-wrap gap-1.5">
            <button class="btn btn-primary btn-sm" data-estimate="${esc(i.id)}">${est ? 'Open estimate' : 'Create estimate'}</button>
            ${wa ? `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://wa.me/${wa}">WhatsApp</a>` : ''}
            <button class="btn btn-danger btn-sm" data-del-inq="${esc(i.id)}" aria-label="Delete">✕</button>
          </div></td>
        </tr>`;
      })
      .join('');
  }

  $('#inqSearch').addEventListener('input', renderInquiries);
  $('#inqFilter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    state.filter = b.dataset.filter;
    renderInquiries();
  });
  $('#inqRefresh').addEventListener('click', async () => {
    await loadAll();
    toast('Refreshed');
  });

  $('#inqBody').addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-status]');
    if (!sel) return;
    const upd = await ADCloud.inquiries.update(sel.dataset.status, { status: sel.value });
    state.inquiries = state.inquiries.map((i) => (i.id === sel.dataset.status ? Object.assign({}, i, upd || { status: sel.value }) : i));
    toast('Status set to ' + sel.value);
    renderInquiries();
  });

  $('#inqBody').addEventListener('click', async (e) => {
    const eb = e.target.closest('[data-estimate]');
    if (eb) {
      const inq = state.inquiries.find((i) => i.id === eb.dataset.estimate);
      const existing = state.estimates.find((x) => x.inquiryId === inq.id);
      return openEditor(existing ? clone(existing) : newEstimate(inq));
    }
    const del = e.target.closest('[data-del-inq]');
    if (del) {
      const inq = state.inquiries.find((i) => i.id === del.dataset.delInq);
      if (!inq || !confirm(`Delete inquiry ${inq.id} from ${inq.name || 'unknown'}? This cannot be undone.`)) return;
      await ADCloud.inquiries.remove(inq.id);
      state.inquiries = state.inquiries.filter((i) => i.id !== inq.id);
      toast('Inquiry deleted');
      renderInquiries();
    }
  });

  $('#inqNew').addEventListener('click', async () => {
    const inq = await ADCloud.inquiries.add({ name: '', phone: '', email: '', location: '', packageId: 'custom', packageName: 'Custom requirement', eventType: AD.eventTypes[0], eventDate: todayISO(), days: 1, guests: '', venue: '', message: '', status: 'Pending', source: 'admin' });
    state.inquiries.unshift(inq);
    renderInquiries();
    openEditor(newEstimate(inq));
  });

  // =====================================================================
  // Estimations
  // =====================================================================
  const CUSTOMER_FIELDS = ['name', 'phone', 'email', 'location', 'eventType', 'eventDate', 'days', 'guests', 'packageName', 'venue'];

  function item(id) {
    return state.master.items.find((i) => i.id === id) || null;
  }
  function rateFor(id, currency) {
    const it = item(id);
    return it ? Number((it.rates || {})[currency]) || 0 : 0;
  }
  const perDayUnit = (u) => u === 'day' || u === 'night';

  function lineFromItem(id, qty, currency, days) {
    const it = item(id);
    return { item: id, desc: it ? it.name : '', brand: it ? it.brand : '', qty: qty || 1, days: it && perDayUnit(it.unit) ? days : 1, rate: rateFor(id, currency) };
  }

  function templateLines(tplId, currency, days) {
    const tpl = state.master.templates.find((x) => x.id === tplId);
    return tpl ? tpl.lines.filter((l) => item(l.item)).map((l) => lineFromItem(l.item, l.qty, currency, days)) : [];
  }

  function guessCurrency(inq) {
    const isService = AD.services.some((s) => s.id === inq.packageId);
    if (!isService) return 'INR';
    return /canada|\bca\b|toronto|vancouver|calgary|montreal|ontario|brampton|mississauga|edmonton|winnipeg/i.test(inq.location || '') ? 'CAD' : 'USD';
  }

  function quoteNo() {
    const d = new Date();
    return 'Q-' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function newEstimate(inq) {
    inq = inq || {};
    const currency = guessCurrency(inq);
    const days = Math.max(1, parseInt(inq.days, 10) || 1);
    const customer = {};
    CUSTOMER_FIELDS.forEach((f) => (customer[f] = inq[f] == null ? '' : inq[f]));
    if (!customer.eventType) customer.eventType = AD.eventTypes[0];
    if (!customer.days) customer.days = 1;
    const lines = templateLines(inq.packageId, currency, days);
    return {
      id: null,
      inquiryId: inq.id || null,
      status: 'Draft',
      currency,
      customer,
      items: lines.length ? lines : [{ item: null, desc: '', brand: '', qty: 1, days, rate: 0 }],
      discountType: 'percent',
      discountValue: 0,
      taxRate: Number(state.master.tax[currency]) || 0,
      quoteNo: quoteNo(),
      quoteDate: todayISO(),
      validDays: Number(state.master.validityDays) || 15,
      notes: '',
      terms: (currency === 'INR' ? state.master.terms.india : state.master.terms.intl).join('\n'),
    };
  }

  function renderEstimates() {
    const q = $('#estSearch').value.trim().toLowerCase();
    const list = state.estimates.filter((e) => !q || [e.quoteNo, e.customer.name, e.customer.phone, e.customer.venue].join(' ').toLowerCase().includes(q));
    const empty = $('#estEmpty');
    empty.hidden = list.length > 0;
    empty.textContent = state.estimates.length ? 'No estimations match.' : 'No estimations yet. Create one from an inquiry or with “+ New estimation”.';
    $('#estBody').innerHTML = list
      .map(
        (e) => `<tr>
        <td data-label="Quote"><div class="font-mono text-xs text-white">${esc(e.quoteNo)}</div><div class="text-xs" style="color:var(--muted)">${fmtDate(e.quoteDate)}</div></td>
        <td data-label="Customer"><div class="text-white font-medium">${esc(e.customer.name || '—')}</div><div class="text-xs" style="color:#a1a1aa">${esc(e.customer.phone || '')}</div></td>
        <td data-label="Event"><div>${fmtDate(e.customer.eventDate)}</div><div class="text-xs" style="color:var(--muted)">${esc(e.customer.packageName || '')}</div></td>
        <td data-label="Total" class="sm:text-right whitespace-nowrap font-semibold text-white">${fmtMoney(QuotePDF.calc(e).total, e.currency)}</td>
        <td data-label="Status"><span class="status st-${esc(e.status)}">${esc(e.status)}</span></td>
        <td data-label="Actions"><div class="flex sm:justify-end flex-wrap gap-1.5">
          <button class="btn btn-primary btn-sm" data-open-est="${esc(e.id)}">Open</button>
          <button class="btn btn-ghost btn-sm" data-pdf-est="${esc(e.id)}">PDF</button>
        </div></td>
      </tr>`
      )
      .join('');
  }
  $('#estSearch').addEventListener('input', renderEstimates);
  $('#estNew').addEventListener('click', () => openEditor(newEstimate(null)));
  $('#estBody').addEventListener('click', (e) => {
    const o = e.target.closest('[data-open-est]');
    if (o) return openEditor(clone(state.estimates.find((x) => x.id === o.dataset.openEst)));
    const p = e.target.closest('[data-pdf-est]');
    if (p) withPdf(state.estimates.find((x) => x.id === p.dataset.pdfEst), 'download');
  });

  // ---------- Editor ----------
  $('#eEventType').innerHTML = AD.eventTypes.map((t) => `<option>${esc(t)}</option>`).join('');
  $('#eCurrency').innerHTML = Object.keys(AD.currencies).map((c) => `<option value="${c}">${c}</option>`).join('');

  function fillEditorSelects() {
    $('#eTemplate').innerHTML = '<option value="">Load package template…</option>' + state.master.templates.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
    const cats = {};
    state.master.items.forEach((i) => (cats[i.category || 'Other'] = cats[i.category || 'Other'] || []).push(i));
    $('#eAddMaster').innerHTML =
      '<option value="">+ Add item from Price Master…</option>' +
      Object.keys(cats)
        .map((c) => `<optgroup label="${esc(c)}">${cats[c].map((i) => `<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('')}</optgroup>`)
        .join('');
  }

  function openEditor(est) {
    state.editing = est;
    fillEditorSelects();
    const inq = est.inquiryId ? state.inquiries.find((i) => i.id === est.inquiryId) : null;
    $('#editorRef').textContent = (est.id ? 'Saved' : 'New') + ' · ' + est.quoteNo + (inq ? ` · inquiry ${inq.id}` : '');
    $$('[data-c]').forEach((el) => (el.value = est.customer[el.dataset.c] == null ? '' : est.customer[el.dataset.c]));
    const msg = $('#eMessage');
    msg.textContent = inq && inq.message ? '💬 ' + inq.message : '';
    msg.hidden = !(inq && inq.message);
    $('#eCurrency').value = est.currency;
    $('#eDiscType').value = est.discountType;
    $('#eDiscount').value = est.discountValue;
    $('#eTax').value = est.taxRate;
    $('#eNo').value = est.quoteNo;
    $('#eDate').value = est.quoteDate;
    $('#eValid').value = est.validDays;
    $('#eStatus').value = est.status || 'Draft';
    $('#eNotes').value = est.notes || '';
    $('#eTerms').value = est.terms || '';
    $('#eDelete').hidden = !est.id;
    renderLines();
    $('#editorOverlay').hidden = false;
    const ed = $('#editor');
    ed.classList.add('open');
    ed.setAttribute('aria-hidden', 'false');
    ed.scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }

  function closeEditor() {
    state.editing = null;
    $('#editorOverlay').hidden = true;
    $('#editor').classList.remove('open');
    $('#editor').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  $('#editorClose').addEventListener('click', closeEditor);
  $('#editorOverlay').addEventListener('click', closeEditor);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && state.editing && closeEditor());

  const lineAmount = (l) => (Number(l.qty) || 0) * (Number(l.days) || 0) * (Number(l.rate) || 0);
  const eventDays = () => Math.max(1, parseInt($('[data-c="days"]').value, 10) || 1);

  function renderLines() {
    const est = state.editing;
    $('#eItems').innerHTML = est.items
      .map(
        (l, i) => `<tr data-row="${i}">
        <td><input data-f="desc" value="${esc(l.desc)}" placeholder="Item description" /></td>
        <td><input data-f="brand" value="${esc(l.brand)}" placeholder="—" /></td>
        <td><input data-f="qty" type="number" min="0" step="any" value="${esc(l.qty)}" /></td>
        <td><input data-f="days" type="number" min="0" step="any" value="${esc(l.days)}" /></td>
        <td><input data-f="rate" type="number" min="0" step="any" value="${esc(l.rate)}" /></td>
        <td class="text-right whitespace-nowrap" data-amount>${fmtMoney(lineAmount(l), est.currency)}</td>
        <td class="text-center"><button type="button" class="link" style="color:#71717a" data-remove="${i}" aria-label="Remove line">✕</button></td>
      </tr>`
      )
      .join('');
    renderTotals();
  }

  function renderTotals() {
    const est = state.editing;
    const t = QuotePDF.calc(est);
    const cur = AD.currencies[est.currency];
    $('#eTaxLabel').textContent = cur.taxLabel;
    const row = (k, v, cls) => `<div class="flex justify-between gap-3 ${cls || ''}"><span style="color:#a1a1aa">${k}</span><span>${v}</span></div>`;
    const zeroRates = est.items.some((l) => l.desc && !(Number(l.rate) > 0));
    $('#eTotals').innerHTML =
      row('Subtotal', fmtMoney(t.subtotal, est.currency)) +
      (t.discount ? row('Discount', '− ' + fmtMoney(t.discount, est.currency), 'text-red-300') : '') +
      (Number(est.taxRate) ? row(`${cur.taxLabel} (${Number(est.taxRate)}%)`, fmtMoney(t.tax, est.currency)) : '') +
      `<div class="border-t pt-2 mt-2 flex justify-between items-baseline" style="border-color:var(--line)"><span class="font-semibold text-white">Total</span><span class="text-2xl font-bold" style="color:var(--accent)">${fmtMoney(t.total, est.currency)}</span></div>` +
      `<p class="text-xs" style="color:var(--muted)">${est.items.length} line item${est.items.length === 1 ? '' : 's'} · ${cur.label}</p>` +
      (zeroRates ? `<p class="text-xs" style="color:#fbbf24">Some lines have a 0 rate. Set rates in Price Master or type them here.</p>` : '');
  }

  $('#eItems').addEventListener('input', (e) => {
    const input = e.target.closest('[data-f]');
    if (!input) return;
    const tr = input.closest('[data-row]');
    const l = state.editing.items[Number(tr.dataset.row)];
    l[input.dataset.f] = input.value;
    $('[data-amount]', tr).textContent = fmtMoney(lineAmount(l), state.editing.currency);
    renderTotals();
  });
  $('#eItems').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove]');
    if (!rm) return;
    state.editing.items.splice(Number(rm.dataset.remove), 1);
    renderLines();
  });
  $('#eAddLine').addEventListener('click', () => {
    state.editing.items.push({ item: null, desc: '', brand: '', qty: 1, days: eventDays(), rate: 0 });
    renderLines();
    const rows = $$('#eItems [data-f="desc"]');
    rows[rows.length - 1].focus();
  });
  $('#eAddMaster').addEventListener('change', (e) => {
    if (!e.target.value) return;
    state.editing.items.push(lineFromItem(e.target.value, 1, state.editing.currency, eventDays()));
    e.target.value = '';
    renderLines();
  });
  $('#eSyncDays').addEventListener('click', () => {
    const d = eventDays();
    state.editing.items.forEach((l) => {
      const it = l.item && item(l.item);
      if (!it || perDayUnit(it.unit)) l.days = d;
    });
    renderLines();
  });
  $('#eRefreshRates').addEventListener('click', () => {
    state.editing.items.forEach((l) => l.item && item(l.item) && (l.rate = rateFor(l.item, state.editing.currency)));
    renderLines();
    toast('Rates updated from Price Master');
  });
  $('#eTemplate').addEventListener('change', (e) => {
    const id = e.target.value;
    e.target.value = '';
    if (!id) return;
    if (state.editing.items.some((l) => l.desc) && !confirm('Replace the current line items with this template?')) return;
    const tpl = state.master.templates.find((x) => x.id === id);
    if (tpl.currency && tpl.currency !== state.editing.currency) setCurrency(tpl.currency);
    state.editing.items = templateLines(id, state.editing.currency, eventDays());
    $('[data-c="packageName"]').value = tpl.name;
    $('#eTerms').value = (state.editing.currency === 'INR' ? state.master.terms.india : state.master.terms.intl).join('\n');
    renderLines();
  });

  function setCurrency(c) {
    state.editing.currency = c;
    state.editing.taxRate = Number(state.master.tax[c]) || 0;
    $('#eCurrency').value = c;
    $('#eTax').value = state.editing.taxRate;
    state.editing.items.forEach((l) => l.item && item(l.item) && (l.rate = rateFor(l.item, c)));
  }
  $('#eCurrency').addEventListener('change', (e) => {
    setCurrency(e.target.value);
    renderLines();
    toast('Currency changed; Price Master rates applied for ' + e.target.value);
  });
  [['#eDiscType', 'discountType'], ['#eDiscount', 'discountValue'], ['#eTax', 'taxRate']].forEach(([sel, key]) =>
    $(sel).addEventListener('input', (e) => {
      state.editing[key] = e.target.value;
      renderTotals();
    })
  );

  function collect() {
    const est = state.editing;
    $$('[data-c]').forEach((el) => (est.customer[el.dataset.c] = el.value.trim()));
    est.customer.days = Math.max(1, parseInt(est.customer.days, 10) || 1);
    est.items = est.items.map((l) => ({ item: l.item || null, desc: String(l.desc || '').trim(), brand: String(l.brand || '').trim(), qty: Number(l.qty) || 0, days: Number(l.days) || 0, rate: Number(l.rate) || 0 }));
    est.discountType = $('#eDiscType').value;
    est.discountValue = Number($('#eDiscount').value) || 0;
    est.taxRate = Number($('#eTax').value) || 0;
    est.quoteNo = $('#eNo').value.trim() || quoteNo();
    est.quoteDate = $('#eDate').value || todayISO();
    est.validDays = Math.max(1, parseInt($('#eValid').value, 10) || 15);
    est.status = $('#eStatus').value;
    est.notes = $('#eNotes').value.trim();
    est.terms = $('#eTerms').value;
    return est;
  }

  async function saveEstimate(silent) {
    const est = collect();
    if (!est.customer.name) {
      alert('Please enter the customer name.');
      $('[data-c="name"]').focus();
      return null;
    }
    if (!est.items.some((l) => l.desc)) {
      alert('Add at least one line item with a description.');
      return null;
    }
    const data = clone(est);
    let saved;
    if (est.id) {
      saved = await ADCloud.estimates.update(est.id, data);
      state.estimates = state.estimates.map((x) => (x.id === est.id ? saved : x));
    } else {
      delete data.id;
      saved = await ADCloud.estimates.add(data);
      state.estimates.unshift(saved);
      est.id = saved.id;
      $('#eDelete').hidden = false;
    }
    // Keep the linked inquiry in sync with any customer/event edits.
    if (est.inquiryId) {
      const upd = await ADCloud.inquiries.update(est.inquiryId, Object.assign({}, est.customer, { estimateId: est.id }));
      if (upd) state.inquiries = state.inquiries.map((i) => (i.id === est.inquiryId ? upd : i));
    }
    $('#editorRef').textContent = 'Saved · ' + est.quoteNo;
    if (!silent) toast('Estimation saved');
    renderTab();
    return saved;
  }

  $('#eSave').addEventListener('click', () => saveEstimate(false).catch((ex) => alert('Could not save: ' + ex.message)));
  $('#eDelete').addEventListener('click', async () => {
    const est = state.editing;
    if (!est.id || !confirm(`Delete estimation ${est.quoteNo}? This cannot be undone.`)) return;
    await ADCloud.estimates.remove(est.id);
    state.estimates = state.estimates.filter((x) => x.id !== est.id);
    closeEditor();
    toast('Estimation deleted');
    renderTab();
  });

  function withPdf(est, how) {
    if (!window.jspdf || !window.jspdf.jsPDF || !jspdf.jsPDF.API.autoTable) {
      alert('PDF library failed to load. Check your internet connection and reload.');
      return;
    }
    try {
      if (how === 'preview') QuotePDF.preview({ id: est.inquiryId || '-' }, est);
      else {
        QuotePDF.download({ id: est.inquiryId || '-' }, est);
        toast('PDF downloaded');
      }
    } catch (ex) {
      console.error(ex);
      alert('Could not generate PDF: ' + ex.message);
    }
  }
  $('#eDownload').addEventListener('click', async () => {
    const saved = await saveEstimate(true).catch((ex) => alert('Could not save: ' + ex.message));
    if (saved) withPdf(saved, 'download');
  });
  $('#ePreview').addEventListener('click', async () => {
    const saved = await saveEstimate(true).catch((ex) => alert('Could not save: ' + ex.message));
    if (saved) withPdf(saved, 'preview');
  });

  // =====================================================================
  // Price Master
  // =====================================================================
  function markDirty(on) {
    state.dirty = on;
    $('#masterDirty').hidden = !on;
  }

  function renderMaster() {
    const m = state.draft;
    const q = $('#masterSearch').value.trim().toLowerCase();
    const unitOpts = (u) => ADMIN_UNITS.map((x) => `<option ${x === u ? 'selected' : ''}>${x}</option>`).join('');
    $('#masterItems').innerHTML = m.items
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => !q || [it.name, it.category, it.brand].join(' ').toLowerCase().includes(q))
      .map(
        ({ it, i }) => `<tr data-item="${i}">
        <td><input data-k="name" value="${esc(it.name)}" /></td>
        <td><input data-k="category" value="${esc(it.category)}" list="catList" /></td>
        <td><input data-k="brand" value="${esc(it.brand)}" /></td>
        <td><select data-k="unit">${unitOpts(it.unit)}</select></td>
        ${['INR', 'USD', 'CAD'].map((c) => `<td><input data-rate="${c}" type="number" min="0" step="any" value="${esc(it.rates[c])}" /></td>`).join('')}
        <td class="text-center"><button type="button" class="link" style="color:#71717a" data-del-item="${i}" aria-label="Delete item">✕</button></td>
      </tr>`
      )
      .join('');
    const cats = [...new Set(m.items.map((i) => i.category).filter(Boolean))];
    let dl = $('#catList');
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = 'catList';
      document.body.appendChild(dl);
    }
    dl.innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join('');

    const itemOpts = (sel) => m.items.map((it) => `<option value="${esc(it.id)}" ${it.id === sel ? 'selected' : ''}>${esc(it.name)}</option>`).join('');
    $('#masterTemplates').innerHTML = m.templates
      .map(
        (t, ti) => `<div class="card-2 p-3" data-tpl="${ti}">
        <div class="flex gap-2 items-center mb-2">
          <input data-tk="name" value="${esc(t.name)}" class="font-semibold" />
          <select data-tk="currency" class="!w-auto">${Object.keys(AD.currencies).map((c) => `<option ${c === t.currency ? 'selected' : ''}>${c}</option>`).join('')}</select>
          <button type="button" class="link" style="color:#71717a" data-del-tpl="${ti}" aria-label="Delete template">✕</button>
        </div>
        ${t.lines
          .map(
            (l, li) => `<div class="flex gap-2 items-center mb-1.5" data-line="${li}">
          <select data-lk="item">${itemOpts(l.item)}</select>
          <input data-lk="qty" type="number" min="0" step="any" value="${esc(l.qty)}" style="width:5rem" />
          <button type="button" class="link" style="color:#71717a" data-del-line="${li}" aria-label="Remove">✕</button>
        </div>`
          )
          .join('')}
        <button type="button" class="link text-sm mt-1" data-add-line>+ Add item</button>
      </div>`
      )
      .join('');

    $('#taxINR').value = m.tax.INR;
    $('#taxUSD').value = m.tax.USD;
    $('#taxCAD').value = m.tax.CAD;
    $('#validDays').value = m.validityDays;
    $('#termsIndia').value = m.terms.india.join('\n');
    $('#termsIntl').value = m.terms.intl.join('\n');
    markDirty(state.dirty);
  }

  $('#masterSearch').addEventListener('input', renderMaster);
  $('#masterItems').addEventListener('input', (e) => {
    const tr = e.target.closest('[data-item]');
    if (!tr) return;
    const it = state.draft.items[Number(tr.dataset.item)];
    if (e.target.dataset.k) it[e.target.dataset.k] = e.target.value;
    if (e.target.dataset.rate) it.rates[e.target.dataset.rate] = Number(e.target.value) || 0;
    markDirty(true);
  });
  $('#masterItems').addEventListener('click', (e) => {
    const d = e.target.closest('[data-del-item]');
    if (!d) return;
    const it = state.draft.items[Number(d.dataset.delItem)];
    const used = state.draft.templates.filter((t) => t.lines.some((l) => l.item === it.id)).map((t) => t.name);
    if (!confirm(`Delete "${it.name}"?${used.length ? '\nIt will also be removed from: ' + used.join(', ') : ''}`)) return;
    state.draft.items.splice(Number(d.dataset.delItem), 1);
    state.draft.templates.forEach((t) => (t.lines = t.lines.filter((l) => l.item !== it.id)));
    markDirty(true);
    renderMaster();
  });
  $('#masterAdd').addEventListener('click', () => {
    $('#masterSearch').value = '';
    state.draft.items.push({ id: uid('item'), category: 'Other', name: 'New item', brand: '', unit: 'day', rates: { INR: 0, USD: 0, CAD: 0 } });
    markDirty(true);
    renderMaster();
    const rows = $$('#masterItems [data-k="name"]');
    rows[rows.length - 1].select();
  });

  $('#masterTemplates').addEventListener('input', (e) => {
    const card = e.target.closest('[data-tpl]');
    if (!card) return;
    const t = state.draft.templates[Number(card.dataset.tpl)];
    if (e.target.dataset.tk) t[e.target.dataset.tk] = e.target.value;
    const line = e.target.closest('[data-line]');
    if (line && e.target.dataset.lk) t.lines[Number(line.dataset.line)][e.target.dataset.lk] = e.target.dataset.lk === 'qty' ? Number(e.target.value) || 0 : e.target.value;
    markDirty(true);
  });
  $('#masterTemplates').addEventListener('click', (e) => {
    const card = e.target.closest('[data-tpl]');
    if (!card) return;
    const ti = Number(card.dataset.tpl);
    const t = state.draft.templates[ti];
    if (e.target.closest('[data-add-line]')) t.lines.push({ item: state.draft.items[0] && state.draft.items[0].id, qty: 1 });
    else if (e.target.closest('[data-del-line]')) t.lines.splice(Number(e.target.closest('[data-del-line]').dataset.delLine), 1);
    else if (e.target.closest('[data-del-tpl]')) {
      if (!confirm(`Delete template "${t.name}"?`)) return;
      state.draft.templates.splice(ti, 1);
    } else return;
    markDirty(true);
    renderMaster();
  });
  $('#tplAdd').addEventListener('click', () => {
    state.draft.templates.push({ id: uid('tpl'), name: 'New template', currency: 'INR', lines: [] });
    markDirty(true);
    renderMaster();
  });

  [['#taxINR', (m, v) => (m.tax.INR = Number(v) || 0)], ['#taxUSD', (m, v) => (m.tax.USD = Number(v) || 0)], ['#taxCAD', (m, v) => (m.tax.CAD = Number(v) || 0)], ['#validDays', (m, v) => (m.validityDays = Math.max(1, parseInt(v, 10) || 15))], ['#termsIndia', (m, v) => (m.terms.india = v.split('\n').map((s) => s.trim()).filter(Boolean))], ['#termsIntl', (m, v) => (m.terms.intl = v.split('\n').map((s) => s.trim()).filter(Boolean))]].forEach(([sel, fn]) =>
    $(sel).addEventListener('input', (e) => {
      fn(state.draft, e.target.value);
      markDirty(true);
    })
  );

  $('#masterSave').addEventListener('click', async () => {
    try {
      const saved = await ADCloud.master.save(clone(state.draft));
      state.master = saved;
      state.draft = clone(saved);
      markDirty(false);
      toast('Price Master saved');
    } catch (ex) {
      alert('Could not save the Price Master: ' + ex.message);
    }
  });
  $('#masterReset').addEventListener('click', () => {
    if (state.dirty && !confirm('Discard all unsaved Price Master changes?')) return;
    state.draft = clone(state.master);
    markDirty(false);
    renderMaster();
  });

  // =====================================================================
  // Settings
  // =====================================================================
  function renderSettings() {
    $('#storageInfo').innerHTML =
      ADAuth.mode === 'cloud'
        ? '<p>☁ <strong class="text-white">Cloud sync is on.</strong> Inquiries, estimations and the Price Master are stored in Firebase and available on every device you sign in from.</p>'
        : '<p>💾 <strong class="text-white">Browser-only mode.</strong> Data is saved in this browser only. Website inquiries from other devices will not appear here, and password-reset e-mails are off.</p><p>Connect Firebase (README → “Firebase setup”) to fix both. Download a backup regularly until then.</p>';
  }

  $('#changePassForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#chgMsg');
    const a = $('#chgPass').value, b = $('#chgPass2').value;
    if (a !== b) return showMsg(msg, ERR.mismatch);
    try {
      await ADAuth.changePassword($('#curPass').value, a);
      $('#curPass').value = $('#chgPass').value = $('#chgPass2').value = '';
      showMsg(msg, 'Password updated.', true);
    } catch (ex) {
      showMsg(msg, ex.code === 'bad' ? 'Current password is incorrect.' : errText(ex));
    }
  });

  $('#backupExport').addEventListener('click', () => {
    const data = { exportedAt: new Date().toISOString(), inquiries: state.inquiries, estimates: state.estimates, master: state.master };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `adsound-backup-${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('#backupImport').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      // Accept both full backups and the older plain inquiries array.
      const inquiries = Array.isArray(data) ? data : data.inquiries || [];
      if (!confirm(`Restore ${inquiries.length} inquiries${data.estimates ? `, ${data.estimates.length} estimations` : ''}${data.master ? ' and the Price Master' : ''}? Entries with the same id are overwritten.`)) return;
      await ADCloud.inquiries.merge(inquiries);
      if (data.estimates) await ADCloud.estimates.merge(data.estimates);
      if (data.master && data.master.items) await ADCloud.master.save(data.master);
      markDirty(false);
      await loadAll();
      toast('Backup restored');
    } catch (ex) {
      alert('Restore failed: ' + ex.message);
    }
  });

  // =====================================================================
  // Start
  // =====================================================================
  (async function start() {
    try {
      const s = await ADAuth.restore();
      if (!s) return showAuth('loginForm');
      if (s.mustChange) return showAuth('setPassForm');
      enterApp(s.email);
    } catch (ex) {
      console.error(ex);
      showAuth('loginForm');
      showMsg($('#loginErr'), 'Could not reach the sign-in service. Check your internet connection.');
    }
  })();
})();
