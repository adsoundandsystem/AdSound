// Single source of truth for business info, brands, packages, services and terms.
// Edit values here; the website, admin panel and PDF engine all read from this file.
window.AD = {
  business: {
    name: 'AD Sound And System',
    contacts: ['Dilipbhai Dave', 'Aniket Dave'],
    phone: '+91 8320330558',
    phoneRaw: '918320330558',
    email: 'adsoundandsystem@gmail.com',
    location: 'Gujarat, India',
  },

  // Admin password check is client-side only (see README). Default password: adsound@2026
  // To change: run `await AD_sha256('new-password')` in the browser console and paste the hash here.
  adminPasswordHash: '748a7d36e838e4e43d3482dac4ca4bc5b028bf98fe79247075cc825003ca0500',

  brands: {
    speakers: ['JBL', 'British Acoustics', 'FANE'],
    mixers: ['Midas', 'Yamaha', 'Soundcraft'],
  },

  currencies: {
    INR: { label: 'INR', symbol: '₹', pdfSymbol: 'Rs. ', locale: 'en-IN', defaultTax: 18, taxLabel: 'GST' },
    USD: { label: 'USD', symbol: '$', pdfSymbol: 'USD $', locale: 'en-US', defaultTax: 0, taxLabel: 'Tax' },
    CAD: { label: 'CAD', symbol: 'C$', pdfSymbol: 'CAD $', locale: 'en-CA', defaultTax: 0, taxLabel: 'Tax' },
  },

  // Physical rental packages (India inventory). `items` seed the admin quotation editor;
  // the per-item rates are starting points that add up within each package's published range.
  packages: [
    {
      id: 'compact',
      visual: 'compact',
      name: '2-Panel Compact PA',
      tagline: 'Speeches, small parties & intimate functions',
      capacity: 'Up to 150 people',
      capacityShort: '< 150 People',
      price: '₹3,500 – ₹5,000 / day',
      priceMin: 3500,
      priceMax: 5000,
      maxGuests: 150,
      currency: 'INR',
      brands: ['JBL', 'British Acoustics', 'FANE', 'Yamaha', 'Soundcraft'],
      gear: [
        '2× 12"/15" Active/Passive Tops (JBL / British Acoustics / FANE)',
        '1× 6–8 Channel Console (Yamaha / Soundcraft)',
        '2× Wireless Microphones',
        'Heavy-duty speaker stands',
        'Full audio cabling',
      ],
      items: [
        { desc: '12"/15" Active/Passive Top Speaker', brand: 'JBL / British Acoustics / FANE', qty: 2, days: 1, rate: 1200 },
        { desc: '6-8 Channel Mixing Console', brand: 'Yamaha / Soundcraft', qty: 1, days: 1, rate: 800 },
        { desc: 'Wireless Microphone', brand: '', qty: 2, days: 1, rate: 400 },
        { desc: 'Heavy-duty Stands & Audio Cabling', brand: '', qty: 1, days: 1, rate: 600 },
      ],
    },
    {
      id: 'banquet',
      visual: 'banquet',
      name: '4-Panel Banquet & Wedding',
      tagline: 'Weddings, sangeet, receptions & corporate banquets',
      capacity: '200 to 500 people',
      capacityShort: '200 - 500 People',
      price: '₹12,000 – ₹20,000 / day',
      priceMin: 12000,
      priceMax: 20000,
      maxGuests: 500,
      currency: 'INR',
      featured: true,
      brands: ['JBL', 'FANE', 'British Acoustics', 'Midas', 'Yamaha', 'Soundcraft'],
      gear: [
        '4× Dual 15" Horn Tops',
        '2× Dual 18" Heavy Subwoofers (JBL / FANE / British Acoustics)',
        'Class-D/TD Amplifier Rack',
        'DSP Management System',
        '12–16 Channel Digital Console (Yamaha / Midas / Soundcraft)',
        '2× Stage Wedge Monitors',
      ],
      items: [
        { desc: 'Dual 15" Horn Top', brand: 'JBL / FANE / British Acoustics', qty: 4, days: 1, rate: 1800 },
        { desc: 'Dual 18" Heavy Subwoofer', brand: 'JBL / FANE / British Acoustics', qty: 2, days: 1, rate: 2000 },
        { desc: 'Class-D/TD Amplifier Rack', brand: '', qty: 1, days: 1, rate: 1500 },
        { desc: 'DSP Management System', brand: '', qty: 1, days: 1, rate: 1000 },
        { desc: '12-16 Channel Digital Console', brand: 'Yamaha / Midas / Soundcraft', qty: 1, days: 1, rate: 2500 },
        { desc: 'Stage Wedge Monitor', brand: '', qty: 2, days: 1, rate: 600 },
      ],
    },
    {
      id: 'linearray',
      visual: 'concert',
      name: 'Flying Line Array Mega Concert',
      tagline: 'Concerts, Garba / Navratri arenas & large outdoor events',
      capacity: '500 to 3,000+ people',
      capacityShort: '500 - 3,000+ People',
      price: '₹40,000 – ₹90,000+ / day',
      priceMin: 40000,
      priceMax: 90000,
      maxGuests: 3000,
      currency: 'INR',
      brands: ['JBL', 'British Acoustics', 'FANE', 'Midas', 'Yamaha'],
      gear: [
        '8–16 Flown Line Array Modules (JBL / British Acoustics)',
        '4–8 Cardioid Ground-Stacked Dual 18"/21" Subwoofers (FANE / JBL)',
        '32-Channel Digital Console (Midas / Yamaha)',
        'Full stage monitor stacks',
      ],
      items: [
        { desc: 'Flown Line Array Module', brand: 'JBL / British Acoustics', qty: 12, days: 1, rate: 3000 },
        { desc: 'Cardioid Dual 18"/21" Subwoofer', brand: 'FANE / JBL', qty: 6, days: 1, rate: 2500 },
        { desc: '32-Channel Digital Console', brand: 'Midas / Yamaha', qty: 1, days: 1, rate: 6000 },
        { desc: 'Stage Monitor Stack', brand: '', qty: 1, days: 1, rate: 5000 },
        { desc: 'Rigging, Truss & Flying Hardware', brand: '', qty: 1, days: 1, rate: 6000 },
        { desc: 'Sound Engineer & Crew', brand: '', qty: 1, days: 1, rate: 4000 },
      ],
    },
  ],

  // International remote sound engineering services.
  services: [
    {
      id: 'showfile',
      code: 'A',
      name: 'Digital Show File & DSP Tuning',
      unit: 'project',
      rates: { USD: 300, CAD: 400 },
      price: '$300 USD / $400 CAD per project',
      brands: ['Midas', 'Yamaha', 'Behringer'],
      points: [
        'Pre-programmed digital console show files (Midas, Yamaha, Behringer)',
        'Acoustic venue alignment',
        'Custom live instrument EQ profiles — Dhol, Dholak, Tabla, Vocals',
      ],
    },
    {
      id: 'virtual',
      code: 'B',
      name: 'Virtual Live Mixing & Sound Supervision',
      unit: 'day',
      rates: { USD: 200, CAD: 250 },
      price: '$200 USD / $250 CAD per day',
      brands: ['Midas', 'Yamaha'],
      points: [
        'Real-time virtual soundcheck supervision via low-latency audio link',
        'Live console management',
        'Technical coordination for overseas local crews',
        'Multi-night festivals — e.g. 9-Nights Navratri arenas',
      ],
    },
  ],

  // Optional add-ons offered in the quotation editor.
  addons: [
    { desc: 'Transport & Logistics', brand: '', qty: 1, days: 1, rate: 1500 },
    { desc: 'Sound Engineer (Operator)', brand: '', qty: 1, days: 1, rate: 1500 },
    { desc: 'DG Set (Generator) - client arranged unless quoted', brand: '', qty: 1, days: 1, rate: 3500 },
    { desc: 'Additional Wireless Microphone', brand: '', qty: 1, days: 1, rate: 400 },
    { desc: 'Stage Wedge Monitor', brand: '', qty: 1, days: 1, rate: 600 },
  ],

  faqs: [
    ['How early should I book?', 'For wedding season and Navratri, book 3–6 weeks ahead. Smaller events can often be arranged within a few days, subject to availability.'],
    ['Do you provide a sound engineer?', 'Yes. Banquet and Line Array packages include an operator; for the Compact PA an engineer can be added to the quote.'],
    ['Who arranges power / DG set?', 'A dedicated DG set of adequate capacity is arranged by the client unless we include it in the quotation. We advise the kVA required for your package.'],
    ['Do you follow the sound curfew?', 'Always. We operate within local authority time limits (typically 10:00 PM) and permitted decibel levels.'],
    ['How does remote engineering work abroad?', 'We build your console show file in advance and join your soundcheck and shows over a low-latency audio link, guiding your local crew in real time.'],
    ['What advance is required?', '50% advance confirms an India rental booking; international show-file projects are paid 100% in advance.'],
  ],

  statuses: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],

  eventTypes: ['Wedding / Sangeet', 'Reception / Banquet', 'Garba / Navratri', 'Concert / Live Show', 'Corporate Event', 'Religious / Social Function', 'Birthday / Private Party', 'Other'],

  terms: [
    'Advance Deposit: 50% advance is required to confirm the booking. Balance is payable on the event day before setup.',
    'DG Set Policy: Uninterrupted power (dedicated DG set of adequate kVA) is to be arranged by the client unless included in this quotation. AD Sound And System is not liable for damage caused by power fluctuations.',
    'Sound Curfew Compliance: Sound will be operated within local authority time limits (typically 10:00 PM) and permitted decibel levels. Any permissions/licences are the client\'s responsibility.',
    'Equipment Safety: Any damage to equipment caused by guests, weather exposure or mishandling will be charged at repair/replacement cost.',
    'Weather Protection: Covered, level, dry space for equipment must be provided for outdoor events.',
    'Cancellation: Advance is non-refundable for cancellations made within 7 days of the event date.',
    'Validity: This estimate is valid for 15 days from the date of issue. Rates are subject to availability on the event date.',
  ],

  intlTerms: [
    'Payment: 100% advance for show file projects; daily supervision billed in advance per block of days.',
    'Deliverables: Show files are delivered for the console model and firmware confirmed by the client.',
    'Local Crew: On-site equipment, power and crew remain the responsibility of the local organiser.',
    'Connectivity: Client to provide a stable internet connection for low-latency audio links during virtual sessions.',
  ],
};
