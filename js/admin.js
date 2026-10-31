// Admin panel: login gate, inquiry dashboard, status tracking, quotation builder and PDF export.
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = window.escapeHtml;
  const SESSION_KEY = 'adsound.admin.session';

  let filterStatus = 'All';
  let editing = null; // { id, quote }

  // ---------- Auth ----------
  // Client-side gate only: it hides the UI from casual visitors but is not real security.
  function isAuthed() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === AD.adminPasswordHash;
    } catch (e) {
      return false;
    }
  }

  function showApp() {
    $('#loginView').classList.add('hidden');
    $('#appView').classList.remove('hidden');
    renderFilters();
    render();
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    let hash = '';
    try {
      hash = await AD_sha256($('#password').value);
    } catch (err) {
      $('#loginError').textContent = 'This browser blocks secure hashing here. Open the admin page over https or localhost.';
      $('#loginError').classList.remove('hidden');
      return;
    }
    if (hash === AD.adminPasswordHash) {
      try {
        sessionStorage.setItem(SESSION_KEY, hash);
      } catch (err) {}
      showApp();
    } else {
      $('#loginError').textContent = 'Incorrect password.';
      $('#loginError').classList.remove('hidden');
      $('#password').select();
    }
  });

  $('#logoutBtn').addEventListener('click', () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    location.reload();
  });

  // ---------- Dashboard ----------
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  function fmtDate(iso, withTime) {
    if (!iso) return '-';
    const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d)) return iso;
    const opts = { day: '2-digit', month: 'short', year: 'numeric' };
    if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleString('en-GB', opts);
  }

  function renderFilters() {
    $('#statusFilter').innerHTML = ['All'].concat(AD.statuses)
      .map((s) => `<button class="btn btn-ghost btn-sm ${s === filterStatus ? '!border-accent !text-accent' : ''}" data-filter="${s}">${s}</button>`)
      .join('');
  }

  $('#statusFilter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    filterStatus = b.dataset.filter;
    renderFilters();
    render();
  });
  $('#search').addEventListener('input', render);

  function renderStats(all) {
    const count = (s) => all.filter((i) => i.status === s).length;
    const cards = [['Total', all.length, 'text-white']].concat(
      AD.statuses.map((s) => [s, count(s), { Pending: 'text-amber-400', Confirmed: 'text-blue-300', Completed: 'text-green-300', Cancelled: 'text-red-300' }[s]])
    );
    $('#stats').innerHTML = cards
      .map(([label, n, cls]) => `<div class="panel p-4"><p class="text-xs text-zinc-500">${label}</p><p class="font-display text-3xl ${cls}">${n}</p></div>`)
      .join('');
  }

  function render() {
    const all = Store.all();
    renderStats(all);
    const q = $('#search').value.trim().toLowerCase();
    const list = all.filter((i) => {
      if (filterStatus !== 'All' && i.status !== filterStatus) return false;
      if (!q) return true;
      return [i.id, i.name, i.phone, i.email, i.location, i.venue, i.packageName, i.eventType].join(' ').toLowerCase().includes(q);
    });

    const empty = $('#emptyState');
    if (!list.length) {
      empty.textContent = all.length ? 'No inquiries match this filter.' : 'No inquiries yet. Submissions from the website form (in this browser) appear here, or add one with “+ New inquiry”.';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
    }

    $('#inquiryBody').innerHTML = list
      .map((i) => {
        const quoteTotal = i.quote ? fmtMoney(QuotePDF.calc(i.quote).total, i.quote.currency) : '<span class="text-zinc-600">—</span>';
        const wa = String(i.phone || '').replace(/\D/g, '');
        return `
      <tr class="hover:bg-zinc-900/40 align-top">
        <td class="p-3"><div class="font-mono text-xs text-white">${esc(i.id)}</div><div class="text-xs text-zinc-500 mt-0.5">${fmtDate(i.createdAt, true)}</div></td>
        <td class="p-3"><div class="text-white font-medium">${esc(i.name)}</div><div class="text-xs text-zinc-400">${esc(i.phone)}</div><div class="text-xs text-zinc-500">${esc(i.location)}</div></td>
        <td class="p-3"><div class="text-zinc-200">${esc(i.packageName || '-')}</div>${i.guests ? `<div class="text-xs text-zinc-500">👥 ${esc(i.guests)} guests</div>` : ''}</td>
        <td class="p-3"><div class="text-zinc-200">${fmtDate(i.eventDate)}</div><div class="text-xs text-zinc-500">${esc(i.eventType || '')}${i.days > 1 ? ` · ${esc(i.days)} days` : ''}</div></td>
        <td class="p-3 whitespace-nowrap">${quoteTotal}</td>
        <td class="p-3">
          <span class="status status-${esc(i.status)}">${esc(i.status)}</span>
          <select data-status="${esc(i.id)}" class="field !py-1 !px-2 !text-xs mt-1.5 !w-auto" aria-label="Change status">
            ${AD.statuses.map((s) => `<option ${s === i.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td class="p-3">
          <div class="flex justify-end flex-wrap gap-1.5">
            <button class="btn btn-primary btn-sm" data-quote="${esc(i.id)}">Quote / PDF</button>
            ${wa ? `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://wa.me/${wa}">WhatsApp</a>` : ''}
            <button class="btn btn-danger btn-sm" data-delete="${esc(i.id)}" aria-label="Delete">✕</button>
          </div>
        </td>
      </tr>`;
      })
      .join('');
  }

  $('#inquiryBody').addEventListener('change', (e) => {
    const sel = e.target.closest('[data-status]');
    if (!sel) return;
    Store.update(sel.dataset.status, { status: sel.value });
    toast(`Status set to ${sel.value}`);
    render();
  });

  $('#inquiryBody').addEventListener('click', (e) => {
    const qb = e.target.closest('[data-quote]');
    if (qb) return openEditor(qb.dataset.quote);
    const del = e.target.closest('[data-delete]');
    if (del) {
      const inq = Store.get(del.dataset.delete);
      if (inq && confirm(`Delete inquiry ${inq.id} from ${inq.name}? This cannot be undone.`)) {
        Store.remove(inq.id);
        toast('Inquiry deleted');
        render();
      }
    }
  });

  $('#newInquiryBtn').addEventListener('click', () => {
    const inq = Store.add({
      name: '',
      phone: '',
      email: '',
      location: '',
      packageId: 'custom',
      packageName: 'Custom requirement',
      eventType: AD.eventTypes[0],
      eventDate: todayISO(),
      days: 1,
      guests: '',
      venue: '',
      message: '',
      source: 'admin',
    });
    render();
    openEditor(inq.id);
  });

  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(Store.all(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `adsound-inquiries-${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('#importInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const list = JSON.parse(await file.text());
      if (!Array.isArray(list)) throw new Error('Expected a JSON array');
      const valid = list.filter((i) => i && typeof i.id === 'string');
      Store.merge(valid);
      toast(`Imported ${valid.length} inquiries`);
      render();
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  });

  // ---------- Quotation builder ----------
  const CUSTOMER_FIELDS = ['name', 'phone', 'email', 'location', 'eventType', 'eventDate', 'days', 'guests', 'packageName', 'venue'];

  function guessCurrency(inq) {
    const offering = findOffering(inq.packageId);
    if (!offering || !offering.rates) return 'INR';
    return /canada|\bca\b|toronto|vancouver|calgary|montreal|ontario|brampton|mississauga/i.test(inq.location || '') ? 'CAD' : 'USD';
  }

  function templateItems(id, currency, days) {
    const pkg = AD.packages.find((p) => p.id === id);
    if (pkg) return pkg.items.map((it) => Object.assign({}, it, { days }));
    const svc = AD.services.find((s) => s.id === id);
    if (svc) {
      const rate = svc.rates[currency] != null ? svc.rates[currency] : svc.rates.USD;
      return [{ desc: svc.name, brand: svc.brands.join(' / '), qty: 1, days: svc.unit === 'day' ? days : 1, rate }];
    }
    return [{ desc: '', brand: '', qty: 1, days, rate: 0 }];
  }

  function defaultQuote(inq) {
    const currency = guessCurrency(inq);
    const days = Math.max(1, parseInt(inq.days, 10) || 1);
    const isService = !!AD.services.find((s) => s.id === inq.packageId);
    const customer = {};
    CUSTOMER_FIELDS.forEach((f) => (customer[f] = inq[f] == null ? '' : inq[f]));
    return {
      currency,
      customer,
      items: templateItems(inq.packageId, currency, days),
      discountType: 'percent',
      discountValue: 0,
      taxRate: AD.currencies[currency].defaultTax,
      quoteNo: 'Q-' + inq.id.replace(/^ADS-/, ''),
      quoteDate: todayISO(),
      validDays: 15,
      notes: '',
      terms: (isService ? AD.intlTerms : AD.terms).join('\n'),
    };
  }

  // Populate static selects once.
  $('#qEventType').innerHTML = AD.eventTypes.map((t) => `<option>${esc(t)}</option>`).join('');
  $('#qCurrency').innerHTML = Object.keys(AD.currencies).map((c) => `<option value="${c}">${c}</option>`).join('');
  $('#qTemplate').innerHTML +=
    '<optgroup label="Rental packages">' + AD.packages.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('') + '</optgroup>' +
    '<optgroup label="International services">' + AD.services.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('') + '</optgroup>';
  $('#addAddon').innerHTML = '<option value="">+ Add common item…</option>' + AD.addons.map((a, i) => `<option value="${i}">${esc(a.desc)}</option>`).join('');

  function openEditor(id) {
    const inq = Store.get(id);
    if (!inq) return;
    const quote = inq.quote ? JSON.parse(JSON.stringify(inq.quote)) : defaultQuote(inq);
    editing = { id, quote };

    $('#editorRef').textContent = `${inq.id} · received ${fmtDate(inq.createdAt, true)}${inq.source === 'admin' ? ' · added by admin' : ''}`;
    document.querySelectorAll('[data-c]').forEach((el) => (el.value = quote.customer[el.dataset.c] == null ? '' : quote.customer[el.dataset.c]));
    const msg = $('#customerMessage');
    msg.textContent = inq.message ? '💬 ' + inq.message : '';
    msg.classList.toggle('hidden', !inq.message);
    $('#qCurrency').value = quote.currency;
    $('#qDiscountType').value = quote.discountType;
    $('#qDiscount').value = quote.discountValue;
    $('#qTax').value = quote.taxRate;
    $('#qNo').value = quote.quoteNo;
    $('#qDate').value = quote.quoteDate;
    $('#qValid').value = quote.validDays;
    $('#qNotes').value = quote.notes;
    $('#qTerms').value = quote.terms;
    $('#qTemplate').value = '';
    renderItems();

    $('#editorOverlay').classList.remove('hidden');
    const ed = $('#editor');
    ed.classList.remove('translate-x-full');
    ed.setAttribute('aria-hidden', 'false');
    ed.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    setTimeout(() => (quote.customer.name ? $('#qDiscount') : $('[data-c="name"]')).focus({ preventScroll: true }), 260);
  }

  function closeEditor() {
    editing = null;
    $('#editorOverlay').classList.add('hidden');
    const ed = $('#editor');
    ed.classList.add('translate-x-full');
    ed.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  $('#editorClose').addEventListener('click', closeEditor);
  $('#editorOverlay').addEventListener('click', closeEditor);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && editing && closeEditor());

  function lineAmount(it) {
    return (Number(it.qty) || 0) * (Number(it.days) || 0) * (Number(it.rate) || 0);
  }

  function renderItems() {
    const q = editing.quote;
    $('#itemsBody').innerHTML = q.items
      .map(
        (it, i) => `
      <tr class="border-t border-zinc-800" data-row="${i}">
        <td class="p-1.5"><input data-f="desc" value="${esc(it.desc)}" placeholder="Item description" /></td>
        <td class="p-1.5"><input data-f="brand" value="${esc(it.brand)}" placeholder="—" /></td>
        <td class="p-1.5"><input data-f="qty" type="number" min="0" step="any" value="${esc(it.qty)}" /></td>
        <td class="p-1.5"><input data-f="days" type="number" min="0" step="any" value="${esc(it.days)}" /></td>
        <td class="p-1.5"><input data-f="rate" type="number" min="0" step="any" value="${esc(it.rate)}" /></td>
        <td class="p-1.5 text-right text-zinc-200 whitespace-nowrap" data-amount>${fmtMoney(lineAmount(it), q.currency)}</td>
        <td class="p-1.5 text-center"><button type="button" class="text-zinc-500 hover:text-red-400" data-remove="${i}" aria-label="Remove line">✕</button></td>
      </tr>`
      )
      .join('');
    renderTotals();
  }

  function renderTotals() {
    const q = editing.quote;
    const t = QuotePDF.calc(q);
    const cur = AD.currencies[q.currency];
    $('#qTaxLabel').textContent = cur.taxLabel;
    const row = (k, v, cls) => `<div class="flex justify-between gap-3 ${cls || ''}"><span class="text-zinc-400">${k}</span><span>${v}</span></div>`;
    $('#totals').innerHTML =
      row('Subtotal', fmtMoney(t.subtotal, q.currency)) +
      (t.discount ? row('Discount', '− ' + fmtMoney(t.discount, q.currency), 'text-red-300') : '') +
      (Number(q.taxRate) ? row(`${cur.taxLabel} (${Number(q.taxRate)}%)`, fmtMoney(t.tax, q.currency)) : '') +
      `<div class="border-t border-zinc-800 pt-2 mt-2 flex justify-between items-baseline"><span class="font-semibold text-white">Total</span><span class="font-display text-2xl text-accent">${fmtMoney(t.total, q.currency)}</span></div>` +
      `<p class="text-xs text-zinc-500">${q.items.length} line item${q.items.length === 1 ? '' : 's'} · ${cur.label}</p>`;
  }

  $('#itemsBody').addEventListener('input', (e) => {
    const input = e.target.closest('[data-f]');
    if (!input) return;
    const tr = input.closest('[data-row]');
    const it = editing.quote.items[Number(tr.dataset.row)];
    it[input.dataset.f] = input.value;
    $('[data-amount]', tr).textContent = fmtMoney(lineAmount(it), editing.quote.currency);
    renderTotals();
  });

  $('#itemsBody').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove]');
    if (!rm) return;
    editing.quote.items.splice(Number(rm.dataset.remove), 1);
    renderItems();
  });

  function eventDays() {
    return Math.max(1, parseInt($('[data-c="days"]').value, 10) || 1);
  }

  $('#addItem').addEventListener('click', () => {
    editing.quote.items.push({ desc: '', brand: '', qty: 1, days: eventDays(), rate: 0 });
    renderItems();
    const rows = document.querySelectorAll('#itemsBody [data-f="desc"]');
    rows[rows.length - 1].focus();
  });

  $('#addAddon').addEventListener('change', (e) => {
    if (e.target.value === '') return;
    editing.quote.items.push(Object.assign({}, AD.addons[Number(e.target.value)], { days: eventDays() }));
    e.target.value = '';
    renderItems();
  });

  $('#syncDays').addEventListener('click', () => {
    const d = eventDays();
    editing.quote.items.forEach((it) => (it.days = d));
    renderItems();
  });

  $('#qTemplate').addEventListener('change', (e) => {
    const id = e.target.value;
    if (!id) return;
    if (editing.quote.items.some((it) => it.desc) && !confirm('Replace the current line items with this template?')) {
      e.target.value = '';
      return;
    }
    const svc = AD.services.find((s) => s.id === id);
    if (svc && editing.quote.currency === 'INR') setCurrency('USD');
    if (!svc && editing.quote.currency !== 'INR') setCurrency('INR');
    editing.quote.items = templateItems(id, editing.quote.currency, eventDays());
    const offering = findOffering(id);
    $('[data-c="packageName"]').value = offering.name;
    $('#qTerms').value = (svc ? AD.intlTerms : AD.terms).join('\n');
    e.target.value = '';
    renderItems();
  });

  function setCurrency(c) {
    editing.quote.currency = c;
    editing.quote.taxRate = AD.currencies[c].defaultTax;
    $('#qCurrency').value = c;
    $('#qTax').value = editing.quote.taxRate;
  }

  $('#qCurrency').addEventListener('change', (e) => {
    setCurrency(e.target.value);
    renderItems();
    toast('Currency changed. Rates were not converted; review them.');
  });

  [['#qDiscountType', 'discountType'], ['#qDiscount', 'discountValue'], ['#qTax', 'taxRate']].forEach(([sel, key]) => {
    $(sel).addEventListener('input', (e) => {
      editing.quote[key] = e.target.value;
      renderTotals();
    });
  });

  $('#resetTerms').addEventListener('click', () => {
    const isIntl = editing.quote.currency !== 'INR';
    $('#qTerms').value = (isIntl ? AD.intlTerms : AD.terms).join('\n');
  });

  function collect() {
    const q = editing.quote;
    document.querySelectorAll('[data-c]').forEach((el) => (q.customer[el.dataset.c] = el.value.trim()));
    q.customer.days = Math.max(1, parseInt(q.customer.days, 10) || 1);
    q.items = q.items.map((it) => ({
      desc: String(it.desc || '').trim(),
      brand: String(it.brand || '').trim(),
      qty: Number(it.qty) || 0,
      days: Number(it.days) || 0,
      rate: Number(it.rate) || 0,
    }));
    q.discountType = $('#qDiscountType').value;
    q.discountValue = Number($('#qDiscount').value) || 0;
    q.taxRate = Number($('#qTax').value) || 0;
    q.quoteNo = $('#qNo').value.trim() || 'Q-' + editing.id;
    q.quoteDate = $('#qDate').value || todayISO();
    q.validDays = Math.max(1, parseInt($('#qValid').value, 10) || 15);
    q.notes = $('#qNotes').value.trim();
    q.terms = $('#qTerms').value;
    return q;
  }

  function save(silent) {
    const q = collect();
    if (!q.customer.name) {
      alert('Please enter the customer name.');
      $('[data-c="name"]').focus();
      return null;
    }
    if (!q.items.length || !q.items.some((it) => it.desc)) {
      alert('Add at least one line item with a description.');
      return null;
    }
    // Keep the inquiry record in sync with edits made to customer/event details.
    const inq = Store.update(editing.id, Object.assign({}, q.customer, { quote: JSON.parse(JSON.stringify(q)) }));
    render();
    if (!silent) toast('Quotation saved');
    return inq;
  }

  $('#saveQuote').addEventListener('click', () => save(false));

  function withPdf(fn) {
    if (!window.jspdf || !window.jspdf.jsPDF || !jspdf.jsPDF.API.autoTable) {
      alert('PDF library failed to load. Check your internet connection and reload.');
      return;
    }
    const inq = save(true);
    if (!inq) return;
    try {
      fn(inq, inq.quote);
    } catch (err) {
      console.error(err);
      alert('Could not generate PDF: ' + err.message);
    }
  }

  $('#downloadPdf').addEventListener('click', () => withPdf((inq, q) => { QuotePDF.download(inq, q); toast('PDF downloaded'); }));
  $('#previewPdf').addEventListener('click', () => withPdf((inq, q) => QuotePDF.preview(inq, q)));

  if (isAuthed()) showApp();
})();
