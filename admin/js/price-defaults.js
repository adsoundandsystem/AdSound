// Admin-only defaults: currencies, money formatting and the starting Price Master.
// Rates start at 0 on purpose: no amounts are published in the site's files.
// Enter real rates in Admin → Price Master; they are then saved privately (browser or Firebase).
AD.currencies = {
  INR: { label: 'INR', symbol: '₹', pdfSymbol: 'Rs. ', locale: 'en-IN', taxLabel: 'GST' },
  USD: { label: 'USD', symbol: '$', pdfSymbol: 'USD $', locale: 'en-US', taxLabel: 'Tax' },
  CAD: { label: 'CAD', symbol: 'C$', pdfSymbol: 'CAD $', locale: 'en-CA', taxLabel: 'Tax' },
};

window.fmtMoney = function (amount, currency, forPdf) {
  const c = AD.currencies[currency] || AD.currencies.INR;
  const n = Number(amount) || 0;
  const num = n.toLocaleString(c.locale, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return (forPdf ? c.pdfSymbol : c.symbol) + num;
};

const zero = () => ({ INR: 0, USD: 0, CAD: 0 });
const item = (id, category, name, brand, unit) => ({ id, category, name, brand: brand || '', unit: unit || 'day', rates: zero() });

window.ADMIN_UNITS = ['day', 'night', 'project', 'unit', 'trip'];

window.ADMIN_DEFAULT_MASTER = {
  items: [
    item('top12', 'Speakers', '12"/15" Active/Passive Top Speaker', 'JBL / British Acoustics / FANE'),
    item('top215', 'Speakers', 'Dual 15" Horn Top', 'JBL / FANE / British Acoustics'),
    item('sub218', 'Speakers', 'Dual 18" Heavy Subwoofer', 'JBL / FANE / British Acoustics'),
    item('la', 'Speakers', 'Flown Line Array Module', 'JBL / British Acoustics'),
    item('subcard', 'Speakers', 'Cardioid Dual 18"/21" Subwoofer', 'FANE / JBL'),
    item('wedge', 'Speakers', 'Stage Wedge Monitor'),
    item('monstack', 'Speakers', 'Stage Monitor Stack'),
    item('mix8', 'Consoles', '6-8 Channel Mixing Console', 'Yamaha / Soundcraft'),
    item('mix16', 'Consoles', '12-16 Channel Digital Console', 'Yamaha / Midas / Soundcraft'),
    item('mix32', 'Consoles', '32-Channel Digital Console', 'Midas / Yamaha'),
    item('wlmic', 'Microphones', 'Wireless Microphone'),
    item('amprack', 'Power & Processing', 'Class-D/TD Amplifier Rack'),
    item('dsp', 'Power & Processing', 'DSP Management System'),
    item('stands', 'Rigging & Cabling', 'Heavy-duty Stands & Audio Cabling'),
    item('rigging', 'Rigging & Cabling', 'Rigging, Truss & Flying Hardware'),
    item('crew', 'Crew & Logistics', 'Sound Engineer & Crew'),
    item('engineer', 'Crew & Logistics', 'Sound Engineer (Operator)'),
    item('transport', 'Crew & Logistics', 'Transport & Logistics', '', 'trip'),
    item('dg', 'Crew & Logistics', 'DG Set (Generator)'),
    item('showfile', 'International', 'Digital Show File & DSP Tuning', 'Midas / Yamaha / Behringer', 'project'),
    item('virtual', 'International', 'Virtual Live Mixing & Sound Supervision', 'Midas / Yamaha', 'night'),
  ],
  templates: [
    { id: 'compact', name: '2-Panel Compact PA', currency: 'INR', lines: [{ item: 'top12', qty: 2 }, { item: 'mix8', qty: 1 }, { item: 'wlmic', qty: 2 }, { item: 'stands', qty: 1 }] },
    { id: 'banquet', name: '4-Panel Banquet & Wedding', currency: 'INR', lines: [{ item: 'top215', qty: 4 }, { item: 'sub218', qty: 2 }, { item: 'amprack', qty: 1 }, { item: 'dsp', qty: 1 }, { item: 'mix16', qty: 1 }, { item: 'wedge', qty: 2 }] },
    { id: 'linearray', name: 'Flying Line Array Mega Concert', currency: 'INR', lines: [{ item: 'la', qty: 12 }, { item: 'subcard', qty: 6 }, { item: 'mix32', qty: 1 }, { item: 'monstack', qty: 1 }, { item: 'rigging', qty: 1 }, { item: 'crew', qty: 1 }] },
    { id: 'showfile', name: 'Digital Show File & DSP Tuning', currency: 'USD', lines: [{ item: 'showfile', qty: 1 }] },
    { id: 'virtual', name: 'Virtual Live Mixing & Sound Supervision', currency: 'USD', lines: [{ item: 'virtual', qty: 1 }] },
  ],
  tax: { INR: 18, USD: 0, CAD: 0 },
  validityDays: 15,
  terms: {
    india: [
      'Advance Deposit: 50% advance is required to confirm the booking. Balance is payable on the event day before setup.',
      'DG Set Policy: Uninterrupted power (dedicated DG set of adequate kVA) is to be arranged by the client unless included in this estimate. AD Sound And System is not liable for damage caused by power fluctuations.',
      "Sound Curfew Compliance: Sound will be operated within local authority time limits (typically 10:00 PM) and permitted decibel levels. Any permissions/licences are the client's responsibility.",
      'Equipment Safety: Any damage to equipment caused by guests, weather exposure or mishandling will be charged at repair/replacement cost.',
      'Weather Protection: Covered, level, dry space for equipment must be provided for outdoor events.',
      'Cancellation: Advance is non-refundable for cancellations made within 7 days of the event date.',
      'Validity: This estimate is valid for the period stated above. Rates are subject to availability on the event date.',
    ],
    intl: [
      'Payment: 100% advance for show file projects; daily supervision billed in advance per block of days.',
      'Deliverables: Show files are delivered for the console model and firmware confirmed by the client.',
      'Local Crew: On-site equipment, power and crew remain the responsibility of the local organiser.',
      'Connectivity: Client to provide a stable internet connection for low-latency audio links during virtual sessions.',
    ],
  },
};
