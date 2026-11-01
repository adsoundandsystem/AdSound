// Small helpers shared by the public site and the admin panel.
(function () {
  window.AD_sha256 = async function (text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  window.escapeHtml = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  };

  // YYYY-MM-DD in the viewer's local timezone (toISOString would give the UTC date).
  window.todayISO = function () {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  window.findOffering = function (id) {
    return AD.packages.find((p) => p.id === id) || AD.services.find((s) => s.id === id) || null;
  };
})();
