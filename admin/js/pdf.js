// Branded estimation PDF engine (jsPDF + jsPDF-AutoTable).
// Note: jsPDF's built-in fonts have no ₹ glyph, so INR amounts print as "Rs.".
(function () {
  const ACCENT = [245, 158, 11];
  const DARK = [24, 24, 27];
  const MUTED = [113, 113, 122];
  const LINE = [228, 228, 231];

  function calc(quote) {
    const subtotal = quote.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.days) || 0) * (Number(it.rate) || 0), 0);
    const dv = Number(quote.discountValue) || 0;
    const discount = Math.min(subtotal, quote.discountType === 'flat' ? dv : (subtotal * dv) / 100);
    const taxable = subtotal - discount;
    const tax = (taxable * (Number(quote.taxRate) || 0)) / 100;
    return { subtotal, discount, taxable, tax, total: taxable + tax };
  }

  function fmtDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Strip characters the standard PDF fonts cannot render (keeps Latin-1).
  function safe(s) {
    return String(s == null ? '' : s)
      .replace(/₹/g, 'Rs.')
      .replace(/[–—]/g, '-')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[×]/g, 'x')
      .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
  }

  function build(inquiry, quote) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 14;
    const biz = AD.business;
    const money = (n) => fmtMoney(n, quote.currency, true);
    const totals = calc(quote);
    const cur = AD.currencies[quote.currency];

    // ---- Header ----
    doc.setFillColor(...ACCENT);
    doc.rect(0, 0, W, 3, 'F');
    const logoW = 42;
    const logoH = logoW * (AD_LOGO.height / AD_LOGO.width);
    doc.addImage(AD_LOGO.dataUrl, 'PNG', M, 9, logoW, logoH);

    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(biz.name.toUpperCase(), W - M, 15, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const contactLines = [
      'Proprietors: ' + biz.contacts.join(' & '),
      'Phone / WhatsApp: ' + biz.phone,
      'Email: ' + biz.email,
      biz.location,
    ];
    contactLines.forEach((l, i) => doc.text(l, W - M, 21 + i * 4.5, { align: 'right' }));

    let y = Math.max(9 + logoH, 21 + contactLines.length * 4.5) + 4;
    doc.setDrawColor(...LINE);
    doc.line(M, y, W - M, y);

    // ---- Title & meta ----
    y += 9;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...DARK);
    doc.text('ESTIMATION / QUOTATION', M, y);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    const validUntil = new Date(quote.quoteDate + 'T00:00:00');
    validUntil.setDate(validUntil.getDate() + (Number(quote.validDays) || 15));
    const meta = [
      ['Quote No.', quote.quoteNo],
      ['Date', fmtDate(quote.quoteDate)],
      ['Valid Until', fmtDate(validUntil.toISOString())],
      ['Inquiry Ref.', inquiry.id],
    ];
    meta.forEach(([k, v], i) => {
      doc.setTextColor(...MUTED);
      doc.text(k, W - M - 45, y - 6 + i * 4.5);
      doc.setTextColor(...DARK);
      doc.text(safe(v), W - M, y - 6 + i * 4.5, { align: 'right' });
    });
    y += 12;

    // ---- Brand showcase ----
    const bh = 19;
    doc.setFillColor(...DARK);
    doc.roundedRect(M, y, W - 2 * M, bh, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ACCENT);
    doc.text('PREMIUM INVENTORY BRANDS', M + 5, y + 5.5);
    const rows = [
      ['SPEAKERS', AD.brands.speakers],
      ['MIXERS', AD.brands.mixers],
    ];
    const colW = (W - 2 * M - 10) / 2;
    rows.forEach(([label, list], i) => {
      const x0 = M + 5 + i * colW;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(161, 161, 170);
      doc.text(label, x0, y + 11);
      let x = x0;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      list.forEach((b) => {
        const t = b.toUpperCase();
        const tw = doc.getTextWidth(t) + 5;
        doc.setDrawColor(82, 82, 91);
        doc.roundedRect(x, y + 12.5, tw, 5, 1, 1, 'S');
        doc.setTextColor(255, 255, 255);
        doc.text(t, x + 2.5, y + 16);
        x += tw + 2;
      });
    });
    y += bh + 7;

    // ---- Bill to / Event ----
    const half = (W - 2 * M - 6) / 2;
    const block = (x, title, lines) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...ACCENT);
      doc.text(title, x, y);
      doc.setFontSize(9.5);
      let ly = y + 5;
      lines.filter((l) => l && l[1]).forEach(([k, v], i) => {
        if (i === 0 && !k) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...DARK);
          doc.text(safe(v), x, ly);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...MUTED);
          doc.text(k, x, ly);
          doc.setTextColor(...DARK);
          const wrapped = doc.splitTextToSize(safe(v), half - 24);
          doc.text(wrapped, x + 22, ly);
          ly += (wrapped.length - 1) * 4.2;
        }
        ly += 4.8;
      });
      return ly;
    };
    const c = quote.customer;
    const yA = block(M, 'BILL TO', [['', c.name], ['Phone', c.phone], ['Email', c.email], ['Location', c.location]]);
    const yB = block(M + half + 6, 'EVENT DETAILS', [
      ['Event', c.eventType || '-'],
      ['Date', fmtDate(c.eventDate) + (c.days > 1 ? ` (${c.days} days)` : '')],
      ['Venue', c.venue],
      ['Guests', c.guests ? String(c.guests) : ''],
      ['Package', c.packageName],
    ]);
    y = Math.max(yA, yB) + 2;

    // ---- Items table ----
    doc.autoTable({
      startY: y,
      margin: { left: M, right: M, bottom: 22 },
      head: [['#', 'Description', 'Brand / Make', 'Qty', 'Days', 'Rate', 'Amount']],
      body: quote.items.map((it, i) => [
        i + 1,
        safe(it.desc),
        safe(it.brand) || '-',
        it.qty,
        it.days,
        money(it.rate),
        money((Number(it.qty) || 0) * (Number(it.days) || 0) * (Number(it.rate) || 0)),
      ]),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.2, lineColor: LINE, lineWidth: 0.2, textColor: DARK },
      headStyles: { fillColor: DARK, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 42, textColor: MUTED },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 13, halign: 'center' },
        5: { cellWidth: 24, halign: 'right' },
        6: { cellWidth: 27, halign: 'right', fontStyle: 'bold' },
      },
    });
    y = doc.lastAutoTable.finalY + 6;

    // ---- Totals ----
    const totalRows = [['Subtotal', money(totals.subtotal)]];
    if (totals.discount > 0) {
      const label = quote.discountType === 'percent' ? `Discount (${Number(quote.discountValue)}%)` : 'Discount';
      totalRows.push([label, '- ' + money(totals.discount)]);
    }
    if (Number(quote.taxRate) > 0) totalRows.push([`${cur.taxLabel} (${Number(quote.taxRate)}%)`, money(totals.tax)]);
    const boxW = 80;
    const boxH = totalRows.length * 6 + 12;
    if (y + boxH > H - 25) {
      doc.addPage();
      y = 20;
    }
    const bx = W - M - boxW;
    doc.setFontSize(9.5);
    totalRows.forEach(([k, v], i) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.text(k, bx + 3, y + i * 6);
      doc.setTextColor(...DARK);
      doc.text(v, W - M - 3, y + i * 6, { align: 'right' });
    });
    const ty = y + totalRows.length * 6 - 2;
    doc.setFillColor(...ACCENT);
    doc.roundedRect(bx, ty, boxW, 10, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(`TOTAL (${cur.label})`, bx + 3, ty + 6.7);
    doc.text(money(totals.total), W - M - 3, ty + 6.7, { align: 'right' });

    // Notes, left of totals
    if (quote.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...ACCENT);
      doc.text('NOTES', M, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      const n = doc.splitTextToSize(safe(quote.notes), W - 2 * M - boxW - 8);
      doc.text(n, M, y + 5);
      y = Math.max(y + 5 + n.length * 4, ty + 10);
    } else {
      y = ty + 10;
    }
    y += 8;

    // ---- Terms ----
    const terms = String(quote.terms || '')
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
    if (terms.length) {
      const ensure = (need) => {
        if (y + need > H - 25) {
          doc.addPage();
          y = 20;
        }
      };
      ensure(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text('TERMS & CONDITIONS', M, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      terms.forEach((t, i) => {
        const lines = doc.splitTextToSize(safe(t), W - 2 * M - 6);
        ensure(lines.length * 3.8 + 1);
        doc.setTextColor(...MUTED);
        doc.text(`${i + 1}.`, M, y);
        doc.setTextColor(63, 63, 70);
        doc.text(lines, M + 6, y);
        y += lines.length * 3.8 + 1.2;
      });
    }

    // ---- Signature ----
    if (y + 26 > H - 22) {
      doc.addPage();
      y = 20;
    }
    y += 10;
    doc.setDrawColor(...LINE);
    doc.line(W - M - 60, y + 10, W - M, y + 10);
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text('For ' + biz.name, W - M, y + 15, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text('Authorised Signatory', W - M, y + 19.5, { align: 'right' });
    doc.text('Customer Acceptance', M, y + 15);
    doc.line(M, y + 10, M + 60, y + 10);

    // ---- Footer on every page ----
    const pages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setDrawColor(...LINE);
      doc.line(M, H - 15, W - M, H - 15);
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(`${biz.name}  |  ${biz.contacts.join(' & ')}  |  ${biz.phone}  |  ${biz.email}`, M, H - 10);
      doc.text(`Page ${p} of ${pages}`, W - M, H - 10, { align: 'right' });
      doc.setFillColor(...ACCENT);
      doc.rect(0, H - 3, W, 3, 'F');
    }

    return doc;
  }

  window.QuotePDF = {
    calc,
    build,
    download(inquiry, quote) {
      const doc = build(inquiry, quote);
      const name = (quote.customer.name || 'Customer').replace(/[^\w]+/g, '_').slice(0, 30);
      doc.save(`AD_Sound_Estimate_${quote.quoteNo}_${name}.pdf`);
    },
    preview(inquiry, quote) {
      const url = build(inquiry, quote).output('bloburl');
      window.open(url, '_blank');
    },
  };
})();
