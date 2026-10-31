// Inquiry persistence (browser localStorage) and shared helpers.
(function () {
  const KEY = 'adsound.inquiries.v1';

  function read() {
    try {
      const list = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function write(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('Could not save inquiries', e);
      return false;
    }
  }

  function uid() {
    const d = new Date();
    const stamp = d.getFullYear().toString().slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    return 'ADS-' + stamp + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  window.Store = {
    all() {
      return read().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },
    get(id) {
      return read().find((i) => i.id === id) || null;
    },
    add(data) {
      const list = read();
      const inquiry = Object.assign({ status: 'Pending', quote: null }, data, {
        id: uid(),
        createdAt: new Date().toISOString(),
      });
      list.push(inquiry);
      return write(list) ? inquiry : null;
    },
    update(id, patch) {
      const list = read();
      const idx = list.findIndex((i) => i.id === id);
      if (idx < 0) return null;
      list[idx] = Object.assign({}, list[idx], patch, { updatedAt: new Date().toISOString() });
      write(list);
      return list[idx];
    },
    remove(id) {
      write(read().filter((i) => i.id !== id));
    },
    replaceAll(list) {
      return write(list);
    },
    // Merge imported inquiries; entries with an existing id are overwritten.
    merge(list) {
      const byId = new Map(read().map((i) => [i.id, i]));
      list.forEach((i) => i && i.id && byId.set(i.id, i));
      return write([...byId.values()]);
    },
  };

  window.AD_sha256 = async function (text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  window.fmtMoney = function (amount, currency, forPdf) {
    const c = AD.currencies[currency] || AD.currencies.INR;
    const n = Number(amount) || 0;
    const num = n.toLocaleString(c.locale, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
    return (forPdf ? c.pdfSymbol : c.symbol) + num;
  };

  // YYYY-MM-DD in the viewer's local timezone (toISOString would give the UTC date).
  window.todayISO = function () {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  window.escapeHtml = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  };

  window.findOffering = function (id) {
    return AD.packages.find((p) => p.id === id) || AD.services.find((s) => s.id === id) || null;
  };
})();
