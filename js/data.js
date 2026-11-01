// Public catalogue: business info, brands, packages, services, FAQs.
// No prices live here on purpose; rates are managed privately in the admin Price Master.
window.AD = {
  business: {
    name: 'AD Sound And System',
    contacts: ['Dilipbhai Dave', 'Aniket Dave'],
    phone: '+91 8320330558',
    phoneRaw: '918320330558',
    email: 'adsoundandsystem@gmail.com',
    location: 'Gujarat, India',
    since: 1995,
    eventsCompleted: 1500,
  },

  brands: {
    speakers: ['JBL', 'British Acoustics', 'FANE'],
    mixers: ['Midas', 'Yamaha', 'Soundcraft'],
  },

  // Physical rental packages (India inventory).
  packages: [
    {
      id: 'compact',
      visual: 'compact',
      name: '2-Panel Compact PA',
      tagline: 'Speeches, small parties & intimate functions',
      capacity: 'Up to 150 people',
      capacityShort: '< 150 People',
      maxGuests: 150,
      brands: ['JBL', 'British Acoustics', 'FANE', 'Yamaha', 'Soundcraft'],
      gear: [
        '2× 12"/15" Active/Passive Tops (JBL / British Acoustics / FANE)',
        '1× 6–8 Channel Console (Yamaha / Soundcraft)',
        '2× Wireless Microphones',
        'Heavy-duty speaker stands',
        'Full audio cabling',
      ],
    },
    {
      id: 'banquet',
      visual: 'banquet',
      name: '4-Panel Banquet & Wedding',
      tagline: 'Weddings, sangeet, receptions & corporate banquets',
      capacity: '200 to 500 people',
      capacityShort: '200 - 500 People',
      maxGuests: 500,
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
    },
    {
      id: 'linearray',
      visual: 'concert',
      name: 'Flying Line Array Mega Concert',
      tagline: 'Concerts, Garba / Navratri arenas & large outdoor events',
      capacity: '500 to 3,000+ people',
      capacityShort: '500 - 3,000+ People',
      maxGuests: 100000,
      brands: ['JBL', 'British Acoustics', 'FANE', 'Midas', 'Yamaha'],
      gear: [
        '8–16 Flown Line Array Modules (JBL / British Acoustics)',
        '4–8 Cardioid Ground-Stacked Dual 18"/21" Subwoofers (FANE / JBL)',
        '32-Channel Digital Console (Midas / Yamaha)',
        'Full stage monitor stacks',
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
      brands: ['Midas', 'Yamaha'],
      points: [
        'Real-time virtual soundcheck supervision via low-latency audio link',
        'Live console management',
        'Technical coordination for overseas local crews',
        'Multi-night festivals — e.g. 9-Nights Navratri arenas',
      ],
    },
  ],

  faqs: [
    ['How do I get a price?', 'Fill in the inquiry form with your date, venue and crowd size. We prepare an itemised estimate for your exact event and share it on WhatsApp or email.'],
    ['How early should I book?', 'For wedding season and Navratri, book 3–6 weeks ahead. Smaller events can often be arranged within a few days, subject to availability.'],
    ['Do you provide a sound engineer?', 'Yes. Every rig can be operated by our engineers, who have run events with us since 1995.'],
    ['Who arranges power / DG set?', 'A dedicated DG set of adequate capacity is arranged by the client unless we include it in the estimate. We advise the kVA required for your setup.'],
    ['Do you follow the sound curfew?', 'Always. We operate within local authority time limits (typically 10:00 PM) and permitted decibel levels.'],
    ['How does remote engineering work abroad?', 'We build your console show file in advance and join your soundcheck and shows over a low-latency audio link, guiding your local crew in real time.'],
  ],

  statuses: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],

  eventTypes: ['Wedding / Sangeet', 'Reception / Banquet', 'Garba / Navratri', 'Concert / Live Show', 'Corporate Event', 'Religious / Social Function', 'Birthday / Private Party', 'Other'],
};
