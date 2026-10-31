// Three.js interactive 3D visualizer: realistic rigs for the Compact, Banquet, Line Array Concert and Navratri Garba setups.
(function () {
  const UP = new THREE.Vector3(0, 1, 0);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const DEG = Math.PI / 180;
  const geoCache = {};
  const texCache = {};
  const matCache = {};
  const isSmall = window.innerWidth < 760;

  function memo(store, key, fn) {
    if (!store[key]) {
      store[key] = fn();
      store[key].userData = Object.assign(store[key].userData || {}, { cached: true });
    }
    return store[key];
  }

  // Deterministic random so scenes look the same on every load.
  function rng(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Procedural textures ----------
  function canvasTex(key, w, h, draw, opts) {
    opts = opts || {};
    return memo(texCache, key, () => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c);
      if (opts.color !== false) t.encoding = THREE.sRGBEncoding;
      if (opts.repeat) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(opts.repeat, opts.repeat);
      }
      t.anisotropy = 8;
      return t;
    });
  }

  function speckle(g, w, h, n, size, alpha, light, dark) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = Math.random() < 0.5 ? `rgba(${light},${alpha * Math.random()})` : `rgba(${dark},${alpha * Math.random()})`;
      const s = size * (0.5 + Math.random());
      g.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
  }

  const TEX = {
    noise: () =>
      canvasTex('noise', 128, 128, (g, w, h) => {
        const d = g.createImageData(w, h);
        for (let i = 0; i < d.data.length; i += 4) {
          const v = 128 + (Math.random() - 0.5) * 110;
          d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
          d.data[i + 3] = 255;
        }
        g.putImageData(d, 0, 0);
      }, { color: false, repeat: 3 }),
    // Staggered perforated-metal pattern; white = solid, black = hole.
    grille: () =>
      canvasTex('grille', 32, 32, (g) => {
        g.fillStyle = '#fff';
        g.fillRect(0, 0, 32, 32);
        g.fillStyle = '#000';
        [[8, 8], [24, 24], [24, -8], [-8, 24], [40, 24], [24, 40]].forEach(([x, y]) => {
          g.beginPath();
          g.arc(x, y, 5.6, 0, Math.PI * 2);
          g.fill();
        });
      }, { color: false, repeat: 1 }),
    dust: (rep) =>
      canvasTex('dust' + rep, 512, 512, (g, w, h) => {
        g.fillStyle = '#6b5843';
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 40; i++) {
          g.fillStyle = `rgba(${Math.random() < 0.5 ? '40,30,20' : '150,130,100'},0.05)`;
          g.beginPath();
          g.arc(Math.random() * w, Math.random() * h, 30 + Math.random() * 90, 0, Math.PI * 2);
          g.fill();
        }
        speckle(g, w, h, 9000, 2, 0.35, '190,170,140', '30,22,15');
      }, { repeat: rep }),
    grass: (rep) =>
      canvasTex('grass' + rep, 512, 512, (g, w, h) => {
        g.fillStyle = '#1a2414';
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 14000; i++) {
          g.strokeStyle = `rgba(${Math.random() < 0.5 ? '70,95,45' : '10,18,8'},${0.5 * Math.random()})`;
          const x = Math.random() * w, y = Math.random() * h;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + (Math.random() - 0.5) * 3, y - 2 - Math.random() * 5);
          g.stroke();
        }
      }, { repeat: rep }),
    marble: (rep) =>
      canvasTex('marble' + rep, 512, 512, (g, w, h) => {
        g.fillStyle = '#b9ae9c';
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 26; i++) {
          g.strokeStyle = `rgba(120,110,100,${0.08 + Math.random() * 0.15})`;
          g.lineWidth = 0.5 + Math.random() * 2;
          g.beginPath();
          let x = Math.random() * w, y = Math.random() * h;
          g.moveTo(x, y);
          for (let k = 0; k < 6; k++) {
            x += (Math.random() - 0.3) * 120;
            y += (Math.random() - 0.5) * 120;
            g.quadraticCurveTo(x - 30, y + 20, x, y);
          }
          g.stroke();
        }
        g.strokeStyle = 'rgba(80,70,60,0.35)';
        g.lineWidth = 2;
        [0, 256].forEach((p) => {
          g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke();
          g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke();
        });
      }, { repeat: rep }),
    planks: () =>
      canvasTex('planks', 256, 256, (g, w, h) => {
        for (let y = 0; y < h; y += 32) {
          const v = 30 + Math.random() * 14;
          g.fillStyle = `rgb(${v + 8},${v},${v - 6})`;
          g.fillRect(0, y, w, 32);
          g.fillStyle = 'rgba(0,0,0,0.6)';
          g.fillRect(0, y, w, 2);
          g.fillRect(Math.random() * w, y, 2, 32);
        }
        speckle(g, w, h, 2500, 2, 0.15, '120,100,80', '0,0,0');
      }, { repeat: 4 }),
    drape: () =>
      canvasTex('drape', 512, 64, (g, w, h) => {
        for (let x = 0; x < w; x++) {
          const s = 0.55 + 0.45 * Math.pow(Math.sin((x / w) * Math.PI * 16), 2);
          g.fillStyle = `rgb(${Math.round(120 * s)},${Math.round(22 * s)},${Math.round(36 * s)})`;
          g.fillRect(x, 0, 1, h);
        }
      }),
    floral: () =>
      canvasTex('floral', 1024, 480, (g, w, h) => {
        const bg = g.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#5a0f1c');
        bg.addColorStop(1, '#2a0710');
        g.fillStyle = bg;
        g.fillRect(0, 0, w, h);
        const glow = g.createRadialGradient(w / 2, h * 0.45, 20, w / 2, h * 0.45, h * 0.6);
        glow.addColorStop(0, 'rgba(255,200,120,0.55)');
        glow.addColorStop(1, 'rgba(255,200,120,0)');
        g.fillStyle = glow;
        g.fillRect(0, 0, w, h);
        const flower = (x, y, r, c) => {
          g.fillStyle = c;
          g.beginPath();
          g.arc(x, y, r, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = 'rgba(0,0,0,0.18)';
          g.beginPath();
          g.arc(x + r * 0.2, y + r * 0.2, r * 0.5, 0, Math.PI * 2);
          g.fill();
        };
        const cols = ['#f59e0b', '#fbbf24', '#ea580c', '#fff7ed', '#fda4af', '#f97316'];
        for (let i = 0; i < 2600; i++) {
          const edge = Math.random();
          let x, y;
          if (edge < 0.5) { x = Math.random() * w; y = Math.random() < 0.5 ? Math.random() * 70 : h - Math.random() * 60; }
          else if (edge < 0.8) { x = Math.random() < 0.5 ? Math.random() * 110 : w - Math.random() * 110; y = Math.random() * h; }
          else { const a = Math.random() * Math.PI; x = w / 2 + Math.cos(a) * 300 + (Math.random() - 0.5) * 40; y = h * 0.95 - Math.sin(a) * 330 + (Math.random() - 0.5) * 40; }
          flower(x, y, 5 + Math.random() * 7, cols[(Math.random() * cols.length) | 0]);
        }
        // Hanging marigold strings
        for (let x = 140; x < w - 140; x += 26) {
          const len = 60 + Math.random() * 120;
          for (let y = 70; y < 70 + len; y += 10) flower(x, y, 5, Math.random() < 0.7 ? '#f59e0b' : '#fff7ed');
        }
      }),
    banner: () =>
      canvasTex('banner', 1024, 440, (g, w, h) => {
        const bg = g.createLinearGradient(0, 0, w, h);
        bg.addColorStop(0, '#111827');
        bg.addColorStop(1, '#4c0519');
        g.fillStyle = bg;
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#d4a017';
        g.lineWidth = 10;
        g.strokeRect(22, 22, w - 44, h - 44);
        g.fillStyle = '#fbbf24';
        g.textAlign = 'center';
        g.font = 'bold 120px Oswald, "Arial Narrow", Arial, sans-serif';
        g.fillText('WELCOME', w / 2, h * 0.5);
        g.fillStyle = '#e5e7eb';
        g.font = '600 52px Oswald, "Arial Narrow", Arial, sans-serif';
        g.fillText('AD SOUND & SYSTEM', w / 2, h * 0.75);
      }),
    ledText: (text, sub) =>
      canvasTex('led' + text + sub, 1024, 448, (g, w, h) => {
        g.fillStyle = '#000';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        // Shrink each line until it fits inside the screen with a margin.
        const fit = (str, size, weight, y) => {
          do g.font = `${weight} ${size--}px Oswald, "Arial Narrow", Arial, sans-serif`;
          while (g.measureText(str).width > w * 0.86 && size > 10);
          g.fillText(str, w / 2, y);
        };
        fit(text, 150, 'bold', h * 0.42);
        fit(sub, 56, '600', h * 0.75);
      }, { color: false }),
    mataji: () =>
      canvasTex('mataji', 256, 320, (g, w, h) => {
        const gr = g.createRadialGradient(w / 2, h * 0.42, 10, w / 2, h * 0.42, h * 0.6);
        gr.addColorStop(0, '#fff3c4');
        gr.addColorStop(0.35, '#f59e0b');
        gr.addColorStop(1, '#7f1d1d');
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#facc15';
        g.lineWidth = 14;
        g.strokeRect(8, 8, w - 16, h - 16);
        g.fillStyle = 'rgba(127,29,29,0.9)';
        g.beginPath();
        g.arc(w / 2, h * 0.4, 46, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#7f1d1d';
        g.textAlign = 'center';
        g.font = 'bold 34px "Nirmala UI", "Noto Sans Gujarati", "Shruti", sans-serif';
        g.fillText('જય માતાજી', w / 2, h * 0.85);
      }),
    label: (text) =>
      canvasTex('lbl' + text, 256, 64, (g) => {
        g.fillStyle = '#d4d4d8';
        g.font = 'bold 34px Oswald, "Arial Narrow", Arial, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(text.toUpperCase(), 128, 34);
      }),
  };

  // ---------- Materials ----------
  // Colours are authored in sRGB; convert so the sRGB output doesn't wash them out.
  const std = (o) => {
    const m = new THREE.MeshStandardMaterial(o);
    m.color.convertSRGBToLinear();
    m.emissive.convertSRGBToLinear();
    return m;
  };
  const MATS = {
    cab: () => std({ color: 0x151517, roughness: 0.9, metalness: 0.05, bumpMap: TEX.noise(), bumpScale: 0.006, envMapIntensity: 0.4 }),
    baffle: () => std({ color: 0x0a0a0b, roughness: 1, side: THREE.DoubleSide }),
    grille: () => std({ color: 0x25262a, roughness: 0.45, metalness: 0.75, alphaMap: TEX.grille(), alphaTest: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.7 }),
    cone: () => std({ color: 0x19191b, roughness: 0.95, side: THREE.DoubleSide }),
    surround: () => std({ color: 0x0d0d0e, roughness: 0.6 }),
    dust: () => std({ color: 0x34343a, metalness: 0.4, roughness: 0.35 }),
    alu: () => std({ color: 0xd2d6db, metalness: 1, roughness: 0.32, envMapIntensity: 1 }),
    steel: () => std({ color: 0x2c2e33, metalness: 0.7, roughness: 0.5, envMapIntensity: 0.5 }),
    black: () => std({ color: 0x0c0c0d, roughness: 0.85 }),
    skirt: () => std({ color: 0x060607, roughness: 1 }),
    deck: () => std({ map: TEX.planks(), roughness: 0.75 }),
    person: () => std({ color: 0xffffff, roughness: 0.9, envMapIntensity: 0.3 }),
    skin: () => std({ color: 0xffffff, roughness: 0.65, envMapIntensity: 0.3 }),
    cloth: () => std({ color: 0xf3efe6, roughness: 0.95 }),
    gold: () => std({ color: 0xc9a227, metalness: 0.9, roughness: 0.35, envMapIntensity: 1 }),
    chairGold: () => std({ color: 0xb48a2c, metalness: 0.6, roughness: 0.45 }),
    plastic: () => std({ color: 0xd9dadc, roughness: 0.55 }),
    roof: () => std({ color: 0x1b1c1f, roughness: 0.95, side: THREE.DoubleSide, envMapIntensity: 0.15 }),
    wood: () => std({ color: 0x4a3322, roughness: 0.65 }),
    red: () => std({ color: 0x9b1020, roughness: 0.7 }),
    maroon: () => std({ color: 0x5c0b16, roughness: 0.8 }),
    garbo: () => std({ color: 0xb4562d, roughness: 0.8, emissive: 0xff7a1a, emissiveIntensity: 0.9 }),
    drum: () => std({ color: 0x8a1c1c, roughness: 0.4, metalness: 0.3 }),
    cymbal: () => std({ color: 0xc9a34a, metalness: 1, roughness: 0.25 }),
    screen: () => new THREE.MeshBasicMaterial({ color: 0x1d4ed8 }),
    led: () => new THREE.MeshBasicMaterial({ color: 0xf59e0b, toneMapped: false }),
    ledGreen: () => new THREE.MeshBasicMaterial({ color: 0x22c55e, toneMapped: false }),
    lens: () => new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    bulb: () => new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    wire: () => new THREE.LineBasicMaterial({ color: 0x111111 }),
    drapeWall: () => std({ map: TEX.drape(), roughness: 0.95 }),
    floral: () => std({ map: TEX.floral(), emissive: 0xffffff, emissiveMap: TEX.floral(), emissiveIntensity: 0.35, roughness: 0.9 }),
    banner: () => std({ map: TEX.banner(), emissive: 0xffffff, emissiveMap: TEX.banner(), emissiveIntensity: 0.3, roughness: 0.9 }),
    mataji: () => std({ map: TEX.mataji(), emissive: 0xffffff, emissiveMap: TEX.mataji(), emissiveIntensity: 0.6 }),
  };
  const mat = (name) => memo(matCache, name, MATS[name]);
  const labelMat = (text) => memo(matCache, 'lbl' + text, () => new THREE.MeshBasicMaterial({ map: TEX.label(text), transparent: true }));
  const floorMat = (kind, rep) => memo(matCache, 'floor' + kind + rep, () => std({ map: TEX[kind](rep), roughness: kind === 'marble' ? 0.25 : 0.95, envMapIntensity: kind === 'marble' ? 0.6 : 0.2 }));

  // ---------- Geometry helpers ----------
  function roundedBoxGeo(w, h, d, r) {
    return memo(geoCache, `rb${w}_${h}_${d}_${r}`, () => {
      const b = r * 0.5;
      const sw = w - 2 * b, sh = h - 2 * b, rr = r * 0.5;
      const s = new THREE.Shape();
      s.moveTo(-sw / 2 + rr, -sh / 2);
      s.lineTo(sw / 2 - rr, -sh / 2);
      s.quadraticCurveTo(sw / 2, -sh / 2, sw / 2, -sh / 2 + rr);
      s.lineTo(sw / 2, sh / 2 - rr);
      s.quadraticCurveTo(sw / 2, sh / 2, sw / 2 - rr, sh / 2);
      s.lineTo(-sw / 2 + rr, sh / 2);
      s.quadraticCurveTo(-sw / 2, sh / 2, -sw / 2, sh / 2 - rr);
      s.lineTo(-sw / 2, -sh / 2 + rr);
      s.quadraticCurveTo(-sw / 2, -sh / 2, -sw / 2 + rr, -sh / 2);
      const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 3 });
      g.center();
      return g;
    });
  }

  // Trapezoid line-array cabinet: vertical front at +z, narrower back.
  function lineCabGeo(w, hF, hB, d) {
    return memo(geoCache, `lc${w}_${hF}_${hB}_${d}`, () => {
      const s = new THREE.Shape();
      s.moveTo(0, -hB / 2);
      s.lineTo(d, -hF / 2);
      s.lineTo(d, hF / 2);
      s.lineTo(0, hB / 2);
      s.lineTo(0, -hB / 2);
      const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1 });
      g.rotateY(-Math.PI / 2);
      g.center();
      return g;
    });
  }

  // Plane whose UVs repeat the perforation at a fixed physical pitch.
  function grilleGeo(w, h) {
    return memo(geoCache, `gr${w}_${h}`, () => {
      const g = new THREE.PlaneGeometry(w, h);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 0.028, (uv.getY(i) * h) / 0.028);
      return g;
    });
  }

  const boxGeo = (w, h, d) => memo(geoCache, `b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d));
  const cylGeo = (rt, rb, h, seg) => memo(geoCache, `c${rt}_${rb}_${h}_${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg || 16));
  const planeGeo = (w, h) => memo(geoCache, `p${w}_${h}`, () => new THREE.PlaneGeometry(w, h));

  function mesh(geo, m, shadow) {
    const o = new THREE.Mesh(geo, typeof m === 'string' ? mat(m) : m);
    if (shadow !== false) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
    return o;
  }
  const box = (w, h, d, m, shadow) => mesh(boxGeo(w, h, d), m, shadow);
  const cyl = (rt, rb, h, m, seg) => mesh(cylGeo(rt, rb, h, seg), m);
  function place(parent, obj, x, y, z, ry, rx) {
    obj.position.set(x, y, z);
    if (ry) obj.rotation.y = ry;
    if (rx) obj.rotation.x = rx;
    parent.add(obj);
    return obj;
  }

  // People: one lathe silhouette for trousers/kurta, one with a flared ghagra, plus a separate head for skin tone.
  const bodyGeo = () =>
    memo(geoCache, 'body', () => {
      const pts = [[0, 0], [0.1, 0], [0.11, 0.08], [0.12, 0.5], [0.14, 0.82], [0.17, 0.96], [0.19, 1.2], [0.2, 1.36], [0.15, 1.44], [0.06, 1.49], [0.05, 1.55], [0, 1.56]].map(([x, y]) => new THREE.Vector2(x, y));
      return new THREE.LatheGeometry(pts, 9).scale(1, 1, 0.68);
    });
  const skirtGeo = () =>
    memo(geoCache, 'skirt', () => {
      const pts = [[0, 0.02], [0.36, 0.02], [0.33, 0.12], [0.24, 0.5], [0.15, 0.86], [0.15, 0.96], [0.17, 1.18], [0.18, 1.34], [0.14, 1.42], [0.06, 1.48], [0.05, 1.54], [0, 1.55]].map(([x, y]) => new THREE.Vector2(x, y));
      return new THREE.LatheGeometry(pts, 12).scale(1, 1, 0.8);
    });
  const headGeo = () => memo(geoCache, 'head', () => new THREE.SphereGeometry(0.105, 10, 8).scale(0.92, 1.08, 1).translate(0, 1.67, 0));

  const PALETTE = {
    casual: ['#1f2937', '#374151', '#1e3a8a', '#7f1d1d', '#e5e7eb', '#065f46', '#78350f', '#4b5563', '#f8fafc'],
    formal: ['#f5f0e6', '#7f1d1d', '#a16207', '#1e3a8a', '#111827', '#be185d', '#065f46', '#d4af37', '#581c87'],
    concert: ['#0f0f10', '#1c1c1f', '#27272a', '#1e293b', '#3f3f46', '#7f1d1d', '#e5e5e5', '#1e3a8a', '#52525b'],
    garbaW: ['#dc2626', '#be123c', '#db2777', '#ea580c', '#f59e0b', '#16a34a', '#2563eb', '#9333ea', '#facc15', '#e11d48', '#0d9488'],
    garbaM: ['#f8fafc', '#fde68a', '#fb923c', '#38bdf8', '#fef3c7', '#a3e635', '#f472b6', '#fbbf24'],
    stage: ['#111111', '#7f1d1d', '#f8fafc', '#1e3a8a'],
  };
  const SKIN = ['#8d5524', '#a0623a', '#c68642', '#b5784e', '#7c4a2b', '#d6a072'];

  function crowd(ctx, people, opts) {
    opts = opts || {};
    const r = ctx.rand;
    const pick = (a) => a[(r() * a.length) | 0];
    const groups = [[], []];
    people.forEach((p) => {
      if (p.kind == null) p.kind = r() < (opts.women || 0) ? 1 : 0;
      p.idx = groups[p.kind].length;
      groups[p.kind].push(p);
      p.s = p.s || 0.9 + r() * 0.2;
      p.sy = p.seated ? 0.72 : 1;
      p.phase = r() * Math.PI * 2;
      p.energy = 0.3 + r() * 0.7;
      if (p.ry == null) p.ry = (opts.face || 0) + (r() - 0.5) * 0.6;
      p.ry0 = p.ry;
      p.px = p.x;
      p.py = p.y || 0;
      p.pz = p.z;
    });
    const col = new THREE.Color();
    const meshes = [bodyGeo(), skirtGeo()].map((geo, k) => {
      if (!groups[k].length) return null;
      const m = new THREE.InstancedMesh(geo, mat('person'), groups[k].length);
      const pal = PALETTE[k ? opts.paletteW || opts.palette || 'casual' : opts.palette || 'casual'];
      groups[k].forEach((p) => m.setColorAt(p.idx, col.set(p.color || pick(pal)).convertSRGBToLinear()));
      m.castShadow = true;
      m.frustumCulled = false;
      ctx.scene.add(m);
      return m;
    });
    const heads = new THREE.InstancedMesh(headGeo(), mat('skin'), people.length);
    people.forEach((p, i) => heads.setColorAt(i, col.set(pick(SKIN)).convertSRGBToLinear()));
    heads.castShadow = true;
    heads.frustumCulled = false;
    ctx.scene.add(heads);

    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
    function write() {
      for (let i = 0; i < people.length; i++) {
        const p = people[i];
        q.setFromAxisAngle(UP, p.ry);
        sc.set(p.s, p.s * p.sy, p.s);
        pos.set(p.px, p.py, p.pz);
        m4.compose(pos, q, sc);
        meshes[p.kind].setMatrixAt(p.idx, m4);
        heads.setMatrixAt(i, m4);
      }
      meshes.forEach((m) => m && (m.instanceMatrix.needsUpdate = true));
      heads.instanceMatrix.needsUpdate = true;
    }
    write();
    if (opts.move) {
      ctx.animators.push((t, beat) => {
        for (let i = 0; i < people.length; i++) opts.move(people[i], t, beat);
        write();
      });
    }
    return people;
  }

  // Generic instancer for repeated props (chairs, tables, barricades) sharing transforms.
  function instances(ctx, parts, list) {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = V3(1, 1, 1), pos = new THREE.Vector3();
    parts.forEach(([geo, m, offsets]) => {
      offsets = offsets || [[0, 0, 0]];
      const im = new THREE.InstancedMesh(geo, typeof m === 'string' ? mat(m) : m, list.length * offsets.length);
      let k = 0;
      list.forEach((it) => {
        q.setFromAxisAngle(UP, it.ry || 0);
        offsets.forEach((o) => {
          pos.set(o[0], o[1], o[2]).applyQuaternion(q).add(V3(it.x, it.y || 0, it.z));
          m4.compose(pos, q, one);
          im.setMatrixAt(k++, m4);
        });
      });
      im.castShadow = true;
      im.receiveShadow = true;
      im.frustumCulled = false;
      ctx.scene.add(im);
    });
  }

  const chairParts = (m) => [
    [memo(geoCache, 'chairSeat', () => new THREE.BoxGeometry(0.44, 0.06, 0.44).translate(0, 0.46, 0)), m],
    [memo(geoCache, 'chairBack', () => new THREE.BoxGeometry(0.44, 0.48, 0.04).translate(0, 0.74, -0.2)), m],
    [memo(geoCache, 'chairLeg', () => new THREE.BoxGeometry(0.03, 0.44, 0.03).translate(0, 0.22, 0)), m, [[-0.19, 0, -0.19], [0.19, 0, -0.19], [-0.19, 0, 0.19], [0.19, 0, 0.19]]],
  ];

  // ---------- Truss (instanced tubes) ----------
  function Truss(ctx) {
    const chords = [], lace = [];
    return {
      box(a, b, s) {
        s = s || 0.29;
        const dir = b.clone().sub(a);
        const len = dir.length();
        dir.normalize();
        const ref = Math.abs(dir.y) > 0.9 ? V3(1, 0, 0) : V3(0, 1, 0);
        const u = new THREE.Vector3().crossVectors(dir, ref).normalize().multiplyScalar(s / 2);
        const v = new THREE.Vector3().crossVectors(dir, u).normalize().multiplyScalar(s / 2);
        const corners = [u.clone().add(v), u.clone().sub(v), u.clone().negate().sub(v), u.clone().negate().add(v)];
        corners.forEach((c) => chords.push(a.clone().add(c), b.clone().add(c)));
        const n = Math.max(1, Math.round(len / s));
        for (let i = 0; i < n; i++) {
          const p0 = a.clone().addScaledVector(dir, (len * i) / n);
          const p1 = a.clone().addScaledVector(dir, (len * (i + 1)) / n);
          for (let k = 0; k < 4; k++) {
            const c0 = corners[k], c1 = corners[(k + 1) % 4];
            lace.push(p0.clone().add(i % 2 ? c0 : c1), p1.clone().add(i % 2 ? c1 : c0));
          }
        }
      },
      tower(x, z, h) {
        this.box(V3(x, 0.05, z), V3(x, h, z));
        place(ctx.scene, box(0.9, 0.05, 0.9, 'steel'), x, 0.025, z);
      },
      done() {
        [[chords, 0.024], [lace, 0.009]].forEach(([segs, r]) => {
          if (!segs.length) return;
          const n = segs.length / 2;
          const geo = memo(geoCache, 'tube' + r, () => new THREE.CylinderGeometry(r, r, 1, 6, 1).translate(0, 0.5, 0));
          const im = new THREE.InstancedMesh(geo, mat('alu'), n);
          const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), d = new THREE.Vector3(), sc = new THREE.Vector3();
          for (let i = 0; i < n; i++) {
            const a = segs[i * 2], b = segs[i * 2 + 1];
            d.subVectors(b, a);
            const len = d.length();
            q.setFromUnitVectors(UP, d.normalize());
            m4.compose(a, q, sc.set(1, len, 1));
            im.setMatrixAt(i, m4);
          }
          im.castShadow = true;
          im.frustumCulled = false;
          ctx.scene.add(im);
        });
      },
    };
  }

  // ---------- Loudspeakers ----------
  function driver(ctx, r, still) {
    const g = new THREE.Group();
    g.add(mesh(memo(geoCache, 'ring' + r, () => new THREE.RingGeometry(r * 0.86, r, 28)), 'steel', false));
    g.add(mesh(memo(geoCache, 'sur' + r, () => new THREE.TorusGeometry(r * 0.8, r * 0.07, 6, 28)), 'surround', false));
    const membrane = new THREE.Group();
    membrane.add(mesh(memo(geoCache, 'cone' + r, () => new THREE.ConeGeometry(r * 0.76, r * 0.42, 28, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -r * 0.21)), 'cone', false));
    const cap = mesh(memo(geoCache, 'cap' + r, () => new THREE.SphereGeometry(r * 0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2)), 'dust', false);
    cap.position.z = -r * 0.14;
    membrane.add(cap);
    g.add(membrane);
    if (!still) ctx.pulsing.push(membrane);
    return g;
  }

  function horn(w, h, depth) {
    const m = mesh(memo(geoCache, 'horn', () => new THREE.CylinderGeometry(0.5 * Math.SQRT2, 0.12, 1, 4, 1, true).rotateY(Math.PI / 4).rotateX(Math.PI / 2)), 'baffle', false);
    m.scale.set(w, h, depth);
    return m;
  }

  function badge(parent, brand, w, x, y, z) {
    const b = new THREE.Mesh(planeGeo(w, w / 4), labelMat(brand));
    b.position.set(x, y, z);
    parent.add(b);
  }

  function topSpeaker(ctx, o) {
    o = o || {};
    const w = 0.52, h = o.dual ? 1.18 : 0.78, d = 0.46, f = d / 2;
    const g = new THREE.Group();
    place(g, mesh(roundedBoxGeo(w, h, d, 0.035), 'cab'), 0, h / 2, 0);
    place(g, mesh(planeGeo(w - 0.04, h - 0.04), 'baffle', false), 0, h / 2, f + 0.002);
    (o.dual ? [0.28, 0.67] : [0.29]).forEach((y) => place(g, driver(ctx, 0.19), 0, y, f + 0.005));
    place(g, horn(0.42, 0.15, 0.1), 0, h - 0.14, f - 0.045);
    place(g, mesh(grilleGeo(w - 0.03, h - 0.03), 'grille', false), 0, h / 2, f + 0.024);
    badge(g, o.brand || 'JBL', 0.17, w / 2 - 0.12, h - 0.045, f + 0.027);
    [-1, 1].forEach((s) => place(g, box(0.025, 0.14, 0.05, 'steel'), s * (w / 2 + 0.012), h * 0.62, 0));
    return g;
  }

  function subwoofer(ctx, o) {
    o = o || {};
    const w = 1.1, h = 0.6, d = 0.8, f = d / 2;
    const g = new THREE.Group();
    place(g, mesh(roundedBoxGeo(w, h, d, 0.04), 'cab'), 0, h / 2, 0);
    place(g, mesh(planeGeo(w - 0.05, h - 0.05), 'baffle', false), 0, h / 2, f + 0.002);
    [-0.26, 0.26].forEach((x) => place(g, driver(ctx, 0.235), x, h / 2, f + 0.005));
    place(g, mesh(grilleGeo(w - 0.04, h - 0.04), 'grille', false), 0, h / 2, f + 0.024);
    badge(g, o.brand || 'FANE', 0.2, w / 2 - 0.15, h - 0.05, f + 0.027);
    [-1, 1].forEach((s) => place(g, box(0.025, 0.16, 0.06, 'steel'), s * (w / 2 + 0.012), h * 0.55, 0));
    return g;
  }

  function wedge(ctx) {
    const g = new THREE.Group();
    const cab = new THREE.Group();
    place(cab, mesh(roundedBoxGeo(0.6, 0.36, 0.48, 0.03), 'cab'), 0, 0, 0);
    place(cab, driver(ctx, 0.13), -0.08, 0, 0.245);
    place(cab, horn(0.14, 0.12, 0.06), 0.18, 0, 0.215);
    place(cab, mesh(grilleGeo(0.56, 0.32), 'grille', false), 0, 0, 0.26);
    cab.rotation.x = -0.6;
    cab.position.y = 0.24;
    g.add(cab);
    return g;
  }

  function lineModule(ctx, brand, first) {
    const w = 1.1, hF = 0.36, hB = 0.27, d = 0.55;
    const g = new THREE.Group();
    place(g, mesh(lineCabGeo(w, hF, hB, d), 'cab'), 0, -hF / 2, -d / 2);
    place(g, mesh(planeGeo(w - 0.04, hF - 0.04), 'baffle', false), 0, -hF / 2, 0.003);
    [-0.33, 0.33].forEach((x) => place(g, driver(ctx, 0.14, true), x, -hF / 2, 0.006));
    place(g, box(0.34, 0.05, 0.06, 'baffle', false), 0, -hF / 2, -0.02);
    place(g, mesh(grilleGeo(w - 0.02, hF - 0.02), 'grille', false), 0, -hF / 2, 0.02);
    [-1, 1].forEach((s) => {
      place(g, box(0.02, hF * 0.9, 0.1, 'steel'), s * (w / 2 + 0.012), -hF / 2, -0.07);
      place(g, box(0.02, hB * 0.8, 0.1, 'steel'), s * (w / 2 + 0.012), -hF / 2, -d + 0.08);
    });
    if (first) badge(g, brand, 0.2, w / 2 - 0.16, -0.045, 0.024);
    return g;
  }

  // Flown line array with bumper, chain motor and a progressive J-curve.
  function lineArray(ctx, n, brand, opts) {
    opts = opts || {};
    const g = new THREE.Group();
    place(g, box(1.25, 0.06, 0.06, 'alu'), 0, 0, 0.22);
    place(g, box(1.25, 0.06, 0.06, 'alu'), 0, 0, -0.26);
    [-0.62, 0.62].forEach((x) => place(g, box(0.06, 0.06, 0.55, 'alu'), x, 0, -0.02));
    place(g, box(0.24, 0.34, 0.24, 'black'), 0, 0.85, 0);
    const chain = opts.chain || 1.2;
    place(g, cyl(0.012, 0.012, 0.66, 'steel', 5), 0, 0.36, 0);
    place(g, cyl(0.012, 0.012, chain, 'steel', 5), 0, 1.02 + chain / 2, 0);
    const splay = opts.splay || [0, 0.5, 1, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 10];
    let parent = new THREE.Group();
    parent.position.set(0, -0.04, 0.27);
    parent.rotation.x = (opts.tilt || 2) * DEG;
    g.add(parent);
    for (let i = 0; i < n; i++) {
      parent.add(lineModule(ctx, brand, i === 0));
      if (i < n - 1) {
        const next = new THREE.Group();
        next.position.set(0, -0.36, 0);
        next.rotation.x = splay[Math.min(i + 1, splay.length - 1)] * DEG;
        parent.add(next);
        parent = next;
      }
    }
    return g;
  }

  function tripod(height) {
    const g = new THREE.Group();
    place(g, cyl(0.022, 0.028, height, 'alu', 10), 0, height / 2, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = cyl(0.014, 0.014, 0.8, 'alu', 6);
      leg.position.set(Math.cos(a) * 0.24, 0.3, Math.sin(a) * 0.24);
      leg.rotation.set(Math.sin(a) * 0.62, 0, -Math.cos(a) * 0.62);
      g.add(leg);
    }
    return g;
  }

  function mixer(ctx, o) {
    o = o || {};
    const ch = o.channels || 8;
    const g = new THREE.Group();
    const width = 0.35 + ch * 0.04;
    place(g, box(width + 0.6, 0.05, 0.9, 'black'), 0, 0.78, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => place(g, box(0.04, 0.78, 0.04, 'steel'), sx * (width / 2 + 0.24), 0.39, sz * 0.38));
    const desk = new THREE.Group();
    desk.add(mesh(roundedBoxGeo(width, 0.08, 0.62, 0.02), 'cab'));
    for (let i = 0; i < ch; i++) {
      const x = -width / 2 + 0.17 + i * 0.04;
      place(desk, box(0.016, 0.025, 0.03, i % 4 === 0 ? 'led' : 'alu', false), x, 0.05, 0.13 + Math.sin(i * 1.7) * 0.05);
      const led = place(desk, box(0.01, 0.01, 0.01, i % 3 ? 'ledGreen' : 'led', false), x, 0.046, -0.12);
      ctx.meters.push({ mesh: led, phase: i * 0.7 });
    }
    if (ch >= 16) {
      const scr = place(desk, box(0.42, 0.24, 0.02, 'screen', false), width / 2 - 0.32, 0.17, -0.24);
      scr.rotation.x = -0.35;
    }
    const lbl = new THREE.Mesh(planeGeo(0.3, 0.075), labelMat(o.brand || 'Yamaha'));
    lbl.rotation.x = -Math.PI / 2;
    lbl.position.set(0, 0.042, 0.26);
    desk.add(lbl);
    desk.position.y = 0.85;
    desk.rotation.x = 0.12;
    g.add(desk);
    return g;
  }

  function ampRack(ctx) {
    const g = new THREE.Group();
    place(g, mesh(roundedBoxGeo(0.62, 1.1, 0.62, 0.03), 'cab'), 0, 0.55, 0);
    for (let i = 0; i < 5; i++) {
      place(g, box(0.5, 0.14, 0.02, 'black', false), 0, 0.2 + i * 0.18, 0.31);
      const led = place(g, box(0.02, 0.02, 0.01, i === 4 ? 'led' : 'ledGreen', false), 0.19, 0.2 + i * 0.18, 0.322);
      ctx.meters.push({ mesh: led, phase: i * 1.3 });
    }
    return g;
  }

  // ---------- Stage, lights, screens ----------
  function stage(ctx, w, d, h, x, z) {
    place(ctx.scene, box(w, h - 0.05, d, 'skirt'), x, (h - 0.05) / 2, z);
    place(ctx.scene, box(w, 0.05, d, 'deck'), x, h - 0.025, z);
    place(ctx.scene, box(w, 0.015, 0.02, 'led', false), x, h - 0.06, z + d / 2 + 0.01);
    const steps = Math.max(2, Math.round(h / 0.2));
    for (let i = 0; i < steps; i++) place(ctx.scene, box(1.2, h * ((i + 1) / steps), 0.3, 'black'), x + w / 2 - 1, (h * ((i + 1) / steps)) / 2, z + d / 2 + 0.15 + (steps - 1 - i) * 0.3);
  }

  function beamMaterial(color) {
    return new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uIntensity: { value: 0.6 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uColor; uniform float uIntensity; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); float a = pow(vY, 2.4) * edge * uIntensity; gl_FragColor = vec4(uColor * a, a); }',
    });
  }

  // Hanging moving-head fixture with a volumetric beam.
  function movingHead(ctx, color, opts) {
    opts = opts || {};
    const g = new THREE.Group();
    place(g, box(0.36, 0.16, 0.3, 'black'), 0, -0.08, 0);
    const pan = new THREE.Group();
    pan.position.y = -0.16;
    g.add(pan);
    [-0.17, 0.17].forEach((x) => place(pan, box(0.04, 0.3, 0.12, 'black'), x, -0.15, 0));
    const tilt = new THREE.Group();
    tilt.position.y = -0.27;
    pan.add(tilt);
    tilt.add(cyl(0.13, 0.11, 0.3, 'black', 14));
    place(tilt, mesh(cylGeo(0.1, 0.1, 0.01, 14), 'lens', false), 0, -0.155, 0);
    const len = opts.length || 14;
    const beamGeo = memo(geoCache, 'beam' + len, () => new THREE.ConeGeometry(len * 0.085, len, 24, 1, true).translate(0, -len / 2, 0));
    const bm = beamMaterial(color);
    const beam = new THREE.Mesh(beamGeo, bm);
    beam.position.y = -0.16;
    beam.frustumCulled = false;
    beam.renderOrder = 2;
    tilt.add(beam);
    ctx.movers.push({ pan, tilt, mat: bm, phase: ctx.rand() * 6.28, base: opts.base || 0, aim: opts.aim || 0.45, palette: opts.palette });
    return g;
  }

  function spot(ctx, color, intensity, pos, target, angle) {
    const s = new THREE.SpotLight(color, intensity, 60, angle || 0.5, 0.6, 1.5);
    s.position.set(pos[0], pos[1], pos[2]);
    s.target.position.set(target[0], target[1], target[2]);
    ctx.scene.add(s, s.target);
    return s;
  }

  function point(ctx, color, intensity, dist, x, y, z) {
    const p = new THREE.PointLight(color, intensity, dist, 2);
    p.position.set(x, y, z);
    ctx.scene.add(p);
    return p;
  }

  const LED_FRAG = `
    uniform float uTime, uBeat; uniform sampler2D uText; uniform vec2 uRes; uniform vec3 uTint; varying vec2 vUv;
    vec3 pal(float t){ return 0.5 + 0.5 * cos(6.2831 * (t + vec3(0.0, 0.18, 0.42))); }
    void main(){
      vec2 uv = vUv;
      float w = sin(uv.x * 7.0 + uTime * 1.3) + sin(uv.y * 5.0 - uTime * 0.9) + sin((uv.x + uv.y) * 4.0 + uTime * 0.6);
      vec3 col = mix(pal(w * 0.12 + uTime * 0.04), uTint, 0.35);
      float txt = texture2D(uText, uv).r;
      col = mix(col * 0.5, vec3(1.0), txt);
      vec2 g = fract(uv * uRes);
      float px = smoothstep(0.0, 0.25, g.x) * smoothstep(1.0, 0.75, g.x) * smoothstep(0.0, 0.25, g.y) * smoothstep(1.0, 0.75, g.y);
      col *= mix(1.0, px, 0.55) * (0.8 + uBeat * 0.5);
      gl_FragColor = vec4(col, 1.0);
    }`;
  const UV_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

  function ledWall(ctx, w, h, text, sub, tint) {
    const g = new THREE.Group();
    place(g, box(w + 0.2, h + 0.2, 0.25, 'black'), 0, 0, -0.14);
    const u = { uTime: { value: 0 }, uBeat: { value: 0 }, uText: { value: TEX.ledText(text, sub) }, uRes: { value: new THREE.Vector2(w * 10, h * 10) }, uTint: { value: new THREE.Color(tint || 0xf59e0b) } };
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({ uniforms: u, vertexShader: UV_VERT, fragmentShader: LED_FRAG }));
    g.add(scr);
    ctx.shaders.push(u);
    const glow = point(ctx, tint || 0xf59e0b, 1.2, h * 4, 0, 0, 2);
    g.add(glow);
    ctx.flicker.push((t, beat) => (glow.intensity = 0.8 + beat * 0.9));
    return g;
  }

  // ---------- World ----------
  function world(ctx, o) {
    const s = ctx.scene;
    s.background = new THREE.Color(o.bg);
    s.fog = new THREE.FogExp2(o.bg, o.fog);
    s.environment = ctx.env;
    s.add(new THREE.HemisphereLight(o.sky, o.ground, o.hemi));
    const key = new THREE.DirectionalLight(o.keyColor, o.key);
    key.position.set(o.keyPos[0], o.keyPos[1], o.keyPos[2]);
    key.castShadow = true;
    key.shadow.mapSize.set(ctx.shadowRes, ctx.shadowRes);
    const sc = key.shadow.camera;
    sc.left = sc.bottom = -o.shadow;
    sc.right = sc.top = o.shadow;
    sc.near = 1;
    sc.far = 260;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.04;
    const tgt = o.keyTarget || [0, 0, 0];
    key.target.position.set(tgt[0], tgt[1], tgt[2]);
    s.add(key, key.target);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(o.floorSize, o.floorSize), o.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);
  }

  const scale = (n) => Math.round(n * (isSmall ? 0.55 : 1));
  const bounce = (p, t, beat) => {
    p.py = Math.max(0, Math.sin(t * Math.PI * 4 + p.phase)) * 0.1 * p.energy + beat * 0.12 * p.energy;
    p.ry = p.ry0 + Math.sin(t * 0.8 + p.phase) * 0.18;
  };

  // ---------- Scenes ----------
  const SETUPS = {
    compact(ctx) {
      world(ctx, { bg: 0x0a0d16, fog: 0.022, sky: 0x8a9bc4, ground: 0x1d2a14, hemi: 0.7, keyColor: 0xd6deff, key: 0.7, keyPos: [8, 16, 12], shadow: 14, floorSize: 200, floorMat: floorMat('grass', 60) });
      const s = ctx.scene;
      stage(ctx, 6, 3, 0.45, 0, 0);
      place(s, box(6.3, 2.8, 0.08, 'black'), 0, 1.95, -1.46);
      place(s, mesh(planeGeo(6, 2.55), 'banner', false), 0, 1.95, -1.41);
      place(s, box(0.6, 1.1, 0.45, 'wood'), 1.3, 1.0, 0.25);
      place(s, cyl(0.006, 0.006, 0.35, 'black', 5), 1.3, 1.72, 0.4, 0, -0.5);
      [-3.6, 3.6].forEach((x, i) => {
        place(s, tripod(1.55), x, 0, 1.7);
        place(s, topSpeaker(ctx, { brand: i ? 'British Acoustics' : 'JBL' }), x, 1.55, 1.7, -Math.sign(x) * 0.18);
      });
      place(s, mixer(ctx, { channels: 8, brand: 'Soundcraft' }), 0, 0, 11.2, Math.PI);
      const chairs = [], people = [];
      for (let r = 0; r < 8; r++) {
        for (let x = -5.1; x <= 5.11; x += 0.85) {
          if (Math.abs(x) < 0.5) continue;
          const z = 3.6 + r * 0.95;
          chairs.push({ x, z, ry: Math.PI });
          if (ctx.rand() < 0.8) people.push({ x, z: z - 0.05, seated: true, ry: Math.PI });
        }
      }
      instances(ctx, chairParts('plastic'), chairs);
      crowd(ctx, people, { palette: 'formal', women: 0.35 });
      crowd(ctx, [{ x: 1.3, z: -0.05, y: 0.45, ry: 0 }, { x: 0, z: 11.85, ry: Math.PI }], { palette: 'stage' });
      [-1, 1].forEach((sx) => spot(ctx, 0xffe2b0, 3, [sx * 6, 7, 8], [0, 1, 0], 0.5));
      [-8, 8].forEach((x) => {
        place(s, cyl(0.05, 0.07, 4, 'steel', 8), x, 2, 6);
        place(s, mesh(memo(geoCache, 'lamp', () => new THREE.SphereGeometry(0.2, 12, 8)), 'lens', false), x, 4.1, 6);
        point(ctx, 0xffc98a, 1.2, 16, x, 4, 6);
      });
      return { views: { audience: [[3.2, 3.4, 16], [0, 1.4, 0]], stage: [[0, 2.3, -0.4], [0, 1.2, 9]], aerial: [[11, 12, 16], [0, 0.5, 4]] }, maxDist: 45 };
    },

    banquet(ctx) {
      world(ctx, { bg: 0x120c08, fog: 0.012, sky: 0xffe2c0, ground: 0x3a2a1c, hemi: 0.32, keyColor: 0xfff1dc, key: 0.45, keyPos: [6, 18, 16], keyTarget: [0, 0, 6], shadow: 22, floorSize: 60, floorMat: floorMat('marble', 14) });
      const s = ctx.scene;
      // Hall walls with drapes
      place(s, mesh(new THREE.PlaneGeometry(30, 7), 'drapeWall'), 0, 3.5, -6.5);
      [-15, 15].forEach((x) => place(s, mesh(new THREE.PlaneGeometry(30, 7), 'drapeWall'), x, 3.5, 8.5, x < 0 ? Math.PI / 2 : -Math.PI / 2));
      // Chandeliers
      [[-6, 4], [6, 4], [-6, 13], [6, 13], [0, 8.5]].forEach(([x, z], i) => {
        const c = new THREE.Group();
        c.add(mesh(memo(geoCache, 'chand', () => new THREE.IcosahedronGeometry(0.55, 1)), 'gold', false));
        c.add(mesh(memo(geoCache, 'chandGlow', () => new THREE.SphereGeometry(0.4, 14, 10)), 'lens', false));
        place(c, cyl(0.01, 0.01, 1.5, 'gold', 4), 0, 1, 0);
        place(s, c, x, 5.6, z);
        if (i % 2 === 0) point(ctx, 0xffd9a0, 1.4, 18, x, 5.2, z);
      });
      // Stage with floral backdrop
      stage(ctx, 10, 4, 0.6, 0, -4.2);
      place(s, mesh(planeGeo(10, 4.6), 'floral', false), 0, 2.9, -6.15);
      place(s, mesh(roundedBoxGeo(2.4, 0.5, 0.9, 0.1), 'maroon'), 0, 0.85, -5.2);
      place(s, mesh(roundedBoxGeo(2.4, 0.8, 0.2, 0.08), 'gold'), 0, 1.3, -5.6);
      crowd(ctx, [{ x: -0.45, z: -5.1, y: 0.42, seated: true, kind: 1, color: '#b91c1c' }, { x: 0.45, z: -5.1, y: 0.42, seated: true, color: '#f5e6c8' }], {});
      // PA: sub + two dual-15 tops each side
      [-5.7, 5.7].forEach((x, i) => {
        const yaw = -Math.sign(x) * 0.2;
        place(s, subwoofer(ctx, { brand: i ? 'JBL' : 'FANE' }), x, 0, -1.2, yaw);
        [-0.28, 0.28].forEach((dx, j) => place(s, topSpeaker(ctx, { dual: true, brand: j ? 'British Acoustics' : 'JBL' }), x + dx, 0.6, -1.15, yaw));
      });
      [-1.6, 1.6].forEach((x) => place(s, wedge(ctx), x, 0.6, -2.5, Math.PI));
      place(s, ampRack(ctx), -7.2, 0, -3.2, 0.4);
      // LED dance floor
      const du = { uTime: { value: 0 }, uBeat: { value: 0 } };
      const dance = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.ShaderMaterial({
        uniforms: du,
        vertexShader: UV_VERT,
        fragmentShader: 'uniform float uTime, uBeat; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); } vec3 pal(float t){ return 0.5 + 0.5 * cos(6.2831 * (t + vec3(0.0, 0.2, 0.45))); } void main(){ vec2 g = vUv * vec2(10.0, 7.5); vec2 id = floor(g); vec2 f = fract(g); float n = h(id); float on = step(0.45, fract(n * 7.0 + uTime * 0.9)); vec3 c = pal(n + uTime * 0.15) * (0.12 + on * (0.5 + uBeat * 0.6)); float edge = smoothstep(0.0, 0.06, f.x) * smoothstep(1.0, 0.94, f.x) * smoothstep(0.0, 0.06, f.y) * smoothstep(1.0, 0.94, f.y); gl_FragColor = vec4(c * edge + 0.02, 1.0); }',
      }));
      dance.rotation.x = -Math.PI / 2;
      dance.position.set(0, 0.012, 2.2);
      s.add(dance);
      ctx.shaders.push(du);
      const dancers = [];
      for (let i = 0; i < scale(46); i++) dancers.push({ x: (ctx.rand() - 0.5) * 7.4, z: 2.2 + (ctx.rand() - 0.5) * 5.4, ry: ctx.rand() * 6.28 });
      crowd(ctx, dancers, { palette: 'formal', women: 0.5, paletteW: 'garbaW', move: bounce });
      // Round tables and seated guests
      const tables = [], chairs = [], seated = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
          const x = -10 + col * 5 + (row % 2 ? 2.5 : 0);
          const z = 8 + row * 4;
          if (x > 11) continue;
          tables.push({ x, z });
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2;
            const cx = x + Math.cos(a) * 1.35, cz = z + Math.sin(a) * 1.35;
            const ry = Math.atan2(x - cx, z - cz);
            chairs.push({ x: cx, z: cz, ry });
            if (ctx.rand() < 0.7) seated.push({ x: cx, z: cz, seated: true, ry });
          }
        }
      }
      instances(ctx, [[memo(geoCache, 'tableCloth', () => new THREE.CylinderGeometry(0.95, 1.08, 0.76, 24).translate(0, 0.38, 0)), 'cloth'], [memo(geoCache, 'centre', () => new THREE.SphereGeometry(0.16, 10, 8).translate(0, 0.9, 0)), 'red']], tables);
      instances(ctx, chairParts('chairGold'), chairs);
      crowd(ctx, seated, { palette: 'formal', women: 0.45, paletteW: 'garbaW' });
      place(s, mixer(ctx, { channels: 16, brand: 'Midas' }), 0, 0, 20.5, Math.PI);
      crowd(ctx, [{ x: 0, z: 21.2, ry: Math.PI }], { palette: 'stage' });
      spot(ctx, 0xfff0d6, 3.5, [0, 8, 6], [0, 0.6, -4.5], 0.55);
      const c1 = spot(ctx, 0xff3d8b, 2, [-6, 6, 3], [0, 0, 2.2], 0.45);
      const c2 = spot(ctx, 0x3db5ff, 2, [6, 6, 3], [0, 0, 2.2], 0.45);
      ctx.flicker.push((t, beat) => {
        c1.intensity = 1.2 + beat * 2.2;
        c2.intensity = 1.2 + (1 - beat) * 1.6;
      });
      return { views: { audience: [[0, 3.6, 25], [0, 1.4, 0]], stage: [[0, 2.4, -2.2], [0, 1, 12]], aerial: [[17, 16, 24], [0, 0, 6]] }, maxDist: 45 };
    },

    concert(ctx) {
      world(ctx, { bg: 0x04050a, fog: 0.011, sky: 0x5a6a9a, ground: 0x0b0f08, hemi: 0.35, keyColor: 0xaab8ff, key: 0.45, keyPos: [-20, 40, 50], keyTarget: [0, 0, 8], shadow: 48, floorSize: 400, floorMat: floorMat('grass', 110) });
      const s = ctx.scene;
      const tr = Truss(ctx);
      stage(ctx, 22, 12, 1.8, 0, -6);
      // Roof system: four towers, perimeter grid, arched roof
      const H = 13;
      [[-11.5, -11.8], [11.5, -11.8], [-11.5, 0.2], [11.5, 0.2]].forEach(([x, z]) => tr.tower(x, z, H));
      tr.box(V3(-11.5, H, 0.2), V3(11.5, H, 0.2));
      tr.box(V3(-11.5, H, -11.8), V3(11.5, H, -11.8));
      tr.box(V3(-11.5, H, -11.8), V3(-11.5, H, 0.2));
      tr.box(V3(11.5, H, -11.8), V3(11.5, H, 0.2));
      tr.box(V3(-11.5, 11.2, -0.6), V3(11.5, 11.2, -0.6));
      tr.box(V3(-11.5, 11.2, -6), V3(11.5, 11.2, -6));
      // PA wings
      tr.box(V3(-11.5, H, 0.2), V3(-17.2, H, 0.2));
      tr.box(V3(11.5, H, 0.2), V3(17.2, H, 0.2));
      const roofGeo = new THREE.PlaneGeometry(25, 13.5, 24, 1);
      const rp = roofGeo.attributes.position;
      for (let i = 0; i < rp.count; i++) rp.setZ(i, Math.cos((rp.getX(i) / 12.5) * (Math.PI / 2)) * 1.6);
      roofGeo.computeVertexNormals();
      const roof = new THREE.Mesh(roofGeo, mat('roof'));
      roof.rotation.x = -Math.PI / 2;
      roof.position.set(0, H + 0.2, -5.8);
      roof.castShadow = true;
      s.add(roof);
      // Main + side hangs
      [-1, 1].forEach((sx, i) => {
        place(s, lineArray(ctx, 12, i ? 'British Acoustics' : 'JBL', { chain: 0.6, tilt: 3 }), sx * 13.3, H - 2.3, 0.1, -sx * 0.06);
        place(s, lineArray(ctx, 8, 'JBL', { chain: 0.6, tilt: 4, splay: [0, 1, 2, 3, 4, 5, 6, 7] }), sx * 16.3, H - 2.3, 0.1, -sx * 0.45);
      });
      // Cardioid sub arc
      for (let i = 0; i < 7; i++) {
        [-1, 1].forEach((sx) => {
          const x = sx * (2.4 + i * 1.15);
          const z = 1.6 - Math.pow(i / 6, 2) * 0.8;
          place(s, subwoofer(ctx, { brand: i % 2 ? 'JBL' : 'FANE' }), x, 0, z, -sx * i * 0.025);
          place(s, subwoofer(ctx, { brand: i % 2 ? 'FANE' : 'JBL' }), x, 0.6, z, -sx * i * 0.025);
        });
      }
      [-6, -2, 2, 6].forEach((x) => place(s, topSpeaker(ctx, { brand: 'JBL' }), x, 1.8, -0.4, -x * 0.03));
      // LED wall + IMAG screens on their own towers
      place(s, ledWall(ctx, 16, 6.5, 'AD SOUND & SYSTEM', 'LIVE IN CONCERT', 0x7c3aed), 0, 1.8 + 0.6 + 3.25, -11.4);
      [-1, 1].forEach((sx) => {
        tr.tower(sx * 20, -1, 9);
        place(s, ledWall(ctx, 5.2, 3, 'LIVE', 'AD SOUND & SYSTEM', 0x2563eb), sx * 20, 7.2, -0.75, -sx * 0.25);
      });
      // Moving heads
      for (let i = 0; i < 10; i++) place(s, movingHead(ctx, 0xffffff, { length: 16, base: (i - 4.5) * 0.08, palette: 'concert' }), -9 + i * 2, 10.95, -0.6);
      for (let i = 0; i < 7; i++) place(s, movingHead(ctx, 0xffffff, { length: 14, aim: 0.25, palette: 'concert' }), -9 + i * 3, 10.95, -6);
      // Band
      place(s, box(3.4, 0.5, 2.6, 'skirt'), 0, 2.05, -8.6);
      const kit = new THREE.Group();
      place(kit, cyl(0.28, 0.28, 0.4, 'drum', 18), 0, 0.3, 0.4, 0, Math.PI / 2);
      [[-0.45, 0.65, 0.2], [0.45, 0.65, 0.2], [0.7, 0.45, -0.1]].forEach(([x, y, z]) => place(kit, cyl(0.16, 0.16, 0.22, 'drum', 14), x, y, z));
      [[-0.8, 1.1, 0.1], [0.85, 1.15, 0.1], [0, 1.25, -0.4]].forEach(([x, y, z]) => {
        place(kit, cyl(0.007, 0.007, y, 'steel', 4), x, y / 2, z);
        place(kit, cyl(0.24, 0.24, 0.01, 'cymbal', 20), x, y, z);
      });
      place(s, kit, 0, 2.3, -8.2, Math.PI);
      place(s, box(1.1, 0.08, 0.35, 'black'), -5, 2.8, -5);
      place(s, box(0.04, 0.95, 0.04, 'steel'), -5, 2.27, -5);
      [-7.5, -6.6, 6.6, 7.5].forEach((x) => place(s, mesh(roundedBoxGeo(0.7, 0.6, 0.35, 0.03), 'cab'), x, 2.1, -9.5));
      place(s, cyl(0.008, 0.012, 1.5, 'steel', 6), 0, 2.55, -2.1);
      [-4.5, -1.5, 1.5, 4.5].forEach((x) => place(s, wedge(ctx), x, 1.8, -1.2, Math.PI));
      crowd(ctx, [{ x: 0, z: -2.5, y: 1.8, ry: 0 }, { x: -5, z: -5.6, y: 1.8 }, { x: 5, z: -5, y: 1.8 }, { x: 0, z: -8.9, y: 2.3, seated: true }, { x: -3, z: -7, y: 1.8 }], { palette: 'stage' });
      // Stage wash lights
      const washes = [[-6, 0xff2e63], [-2, 0xffb000], [2, 0x00c2ff], [6, 0xa855f7]].map(([x, c]) => spot(ctx, c, 3, [x, 10.8, -0.6], [x * 0.6, 1.8, -5], 0.5));
      ctx.flicker.push((t, beat) => washes.forEach((w, i) => (w.intensity = 1.8 + beat * 2.5 * ((i % 2) ? 1 : 0.6))));
      // Barricade
      const bars = [];
      for (let x = -15; x <= 15; x += 1.05) bars.push({ x, z: 3.6 });
      instances(ctx, [[boxGeo(1, 1.15, 0.05).clone().translate(0, 0.62, 0), 'steel'], [boxGeo(1, 0.03, 0.7).clone().translate(0, 0.02, 0.3), 'steel']], bars);
      // FOH tent
      const fz = 32;
      [[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2]].forEach(([x, z]) => place(s, cyl(0.04, 0.04, 2.8, 'steel', 6), x, 1.4, fz + z));
      place(s, box(5.6, 0.12, 4.6, 'roof'), 0, 2.86, fz);
      place(s, mixer(ctx, { channels: 32, brand: 'Midas' }), 0, 0, fz, Math.PI);
      crowd(ctx, [{ x: -0.5, z: fz + 0.7, ry: Math.PI }, { x: 0.6, z: fz + 0.8, ry: Math.PI }], { palette: 'stage' });
      // Delay towers for the back field
      [-1, 1].forEach((sx) => {
        tr.tower(sx * 14, 42, 8.5);
        tr.box(V3(sx * 14, 8.5, 42), V3(sx * 14, 8.5, 41.2));
        place(s, lineArray(ctx, 6, 'JBL', { chain: 0.3, tilt: 4 }), sx * 14, 7.4, 41.4, sx * 0.08);
      });
      tr.done();
      // Audience
      const people = [];
      const n = scale(1500);
      for (let i = 0; i < n; i++) {
        const z = 4.6 + Math.pow(ctx.rand(), 1.35) * 46;
        const spread = 15 + (z - 4) * 0.35;
        const x = (ctx.rand() - 0.5) * 2 * spread;
        if (Math.abs(x) < 4 && z > 28.5 && z < 35.5) continue;
        people.push({ x, z, ry: Math.PI + (ctx.rand() - 0.5) * 0.5 });
      }
      crowd(ctx, people, { palette: 'concert', women: 0.12, paletteW: 'concert', move: bounce });
      return { views: { audience: [[8, 4.6, 31], [0, 5.5, -4]], stage: [[3.5, 5.6, -8.5], [0, 2, 22]], aerial: [[42, 30, 52], [0, 3, 10]] }, maxDist: 110 };
    },

    navratri(ctx) {
      world(ctx, { bg: 0x08050d, fog: 0.009, sky: 0x8a6aa8, ground: 0x2a2014, hemi: 0.42, keyColor: 0xc8c0ff, key: 0.45, keyPos: [-30, 45, 30], keyTarget: [0, 0, -4], shadow: 46, floorSize: 400, floorMat: floorMat('dust', 90) });
      const s = ctx.scene;
      const tr = Truss(ctx);
      // Arena markings
      [8, 14, 20].forEach((r) => {
        const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.06, r + 0.06, 96), new THREE.MeshBasicMaterial({ color: 0xe8d9b8, transparent: true, opacity: 0.25 }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.01;
        s.add(ring);
      });
      // Central mandvi with garbo
      place(s, cyl(3, 3.25, 0.6, 'maroon', 8), 0, 0.3, 0);
      place(s, cyl(2.2, 2.4, 0.3, 'red', 8), 0, 0.75, 0);
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        place(s, cyl(0.11, 0.13, 3.4, 'gold', 10), Math.cos(a) * 1.9, 2.6, Math.sin(a) * 1.9);
      }
      place(s, mesh(memo(geoCache, 'canopy', () => new THREE.ConeGeometry(3.1, 2.1, 8)), 'red'), 0, 5.35, 0, Math.PI / 8);
      place(s, cyl(3.15, 3.15, 0.18, 'gold', 8), 0, 4.32, 0);
      place(s, mesh(memo(geoCache, 'kalash', () => new THREE.SphereGeometry(0.28, 14, 10)), 'gold'), 0, 6.55, 0);
      place(s, cyl(0.25, 0.35, 0.6, 'gold', 10), 0, 1.2, 0);
      place(s, mesh(memo(geoCache, 'garbo', () => new THREE.SphereGeometry(0.42, 18, 12)), 'garbo'), 0, 1.85, 0);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        place(s, mesh(planeGeo(0.9, 1.15), 'mataji', false), Math.cos(a) * 1.05, 1.9, Math.sin(a) * 1.05, Math.PI / 2 - a);
      }
      const garboLight = point(ctx, 0xff8a2a, 3.5, 14, 0, 2.2, 0);
      ctx.flicker.push((t) => (garboLight.intensity = 3 + Math.sin(t * 13) * 0.3 + Math.sin(t * 29) * 0.2));
      // String lights from canopy to perimeter poles
      const poles = 18, R = 23.5;
      const bulbPos = [];
      const top = V3(0, 6.3, 0);
      for (let i = 0; i < poles; i++) {
        const a = (i / poles) * Math.PI * 2;
        const px = Math.cos(a) * R, pz = Math.sin(a) * R;
        place(s, cyl(0.07, 0.1, 6.4, 'steel', 8), px, 3.2, pz);
        const end = V3(px, 6.3, pz);
        const curve = new THREE.QuadraticBezierCurve3(top, top.clone().lerp(end, 0.5).add(V3(0, -2.2, 0)), end);
        const pts = curve.getPoints(34);
        s.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat('wire')));
        pts.forEach((p, k) => k > 2 && k % 1 === 0 && bulbPos.push(p));
        const next = ((i + 1) / poles) * Math.PI * 2;
        const end2 = V3(Math.cos(next) * R, 6.3, Math.sin(next) * R);
        const c2 = new THREE.QuadraticBezierCurve3(end, end.clone().lerp(end2, 0.5).add(V3(0, -0.9, 0)), end2);
        const p2 = c2.getPoints(10);
        s.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p2), mat('wire')));
        p2.forEach((p) => bulbPos.push(p));
      }
      const bulbs = new THREE.InstancedMesh(memo(geoCache, 'bulb', () => new THREE.SphereGeometry(0.07, 6, 5)), mat('bulb'), bulbPos.length);
      const bulbCols = ['#ff3b3b', '#ffd23f', '#3bff6e', '#3bb8ff', '#ff4fd8', '#ffffff', '#ff9a1f'].map((c) => new THREE.Color(c));
      const m4 = new THREE.Matrix4();
      bulbPos.forEach((p, i) => {
        bulbs.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z));
        bulbs.setColorAt(i, bulbCols[i % bulbCols.length]);
      });
      bulbs.frustumCulled = false;
      s.add(bulbs);
      let twinkle = 0;
      ctx.flicker.push((t) => {
        if (++twinkle % 4) return;
        const c = new THREE.Color();
        for (let i = twinkle % 7; i < bulbPos.length; i += 7) {
          const base = bulbCols[(i + Math.floor(t * 2)) % bulbCols.length];
          bulbs.setColorAt(i, c.copy(base).multiplyScalar(0.55 + 0.45 * Math.sin(t * 6 + i)));
        }
        bulbs.instanceColor.needsUpdate = true;
      });
      // Main stage
      const sz = -31;
      stage(ctx, 18, 8, 1.6, 0, sz);
      tr.tower(-9.6, sz - 3.6, 10);
      tr.tower(9.6, sz - 3.6, 10);
      tr.tower(-9.6, sz + 3.6, 10);
      tr.tower(9.6, sz + 3.6, 10);
      tr.box(V3(-9.6, 10, sz + 3.6), V3(9.6, 10, sz + 3.6));
      tr.box(V3(-9.6, 10, sz - 3.6), V3(9.6, 10, sz - 3.6));
      tr.box(V3(-9.6, 10, sz + 3.6), V3(-13, 10, sz + 3.6));
      tr.box(V3(9.6, 10, sz + 3.6), V3(13, 10, sz + 3.6));
      place(s, ledWall(ctx, 14, 5, 'NAVRATRI MAHOTSAV', 'AD SOUND & SYSTEM', 0xdb2777), 0, 1.6 + 0.4 + 2.5, sz - 3.3);
      [-1, 1].forEach((sx, i) => place(s, lineArray(ctx, 10, i ? 'British Acoustics' : 'JBL', { chain: 0.5, tilt: 2 }), sx * 11.6, 8.3, sz + 3.7, -sx * 0.04));
      for (let i = 0; i < 5; i++) {
        [-1, 1].forEach((sx) => {
          place(s, subwoofer(ctx, { brand: i % 2 ? 'JBL' : 'FANE' }), sx * (2 + i * 1.15), 0, sz + 5);
          place(s, subwoofer(ctx, { brand: i % 2 ? 'FANE' : 'JBL' }), sx * (2 + i * 1.15), 0.6, sz + 5);
        });
      }
      for (let i = 0; i < 8; i++) place(s, movingHead(ctx, 0xffffff, { length: 22, aim: 0.75, base: (i - 3.5) * 0.06, palette: 'navratri' }), -8 + i * (16 / 7), 9.75, sz + 3.6);
      // Orchestra: singers, dhol players, keyboard
      [-3.5, 3.5].forEach((x) => place(s, cyl(0.008, 0.012, 1.5, 'steel', 6), x, 2.35, sz + 2.6));
      [[-2.2, 0.6], [2.2, 0.6]].forEach(([x, z]) => place(s, cyl(0.24, 0.24, 0.55, 'drum', 16), x, 2.55, sz + z, 0, Math.PI / 2));
      place(s, box(1.2, 0.08, 0.38, 'black'), 5.5, 2.5, sz);
      place(s, box(0.05, 0.85, 0.05, 'steel'), 5.5, 2.05, sz);
      crowd(ctx, [
        { x: -3.5, z: sz + 2.2, y: 1.6, kind: 1, color: '#be123c', ry: 0 },
        { x: 3.5, z: sz + 2.2, y: 1.6, color: '#fde68a', ry: 0 },
        { x: -2.2, z: sz + 0.1, y: 1.6, color: '#f8fafc', ry: 0 },
        { x: 2.2, z: sz + 0.1, y: 1.6, color: '#fb923c', ry: 0 },
        { x: 5.5, z: sz - 0.5, y: 1.6, color: '#38bdf8', ry: 0 },
        { x: -5.5, z: sz - 1, y: 1.6, color: '#f8fafc', ry: 0, seated: true },
      ], { palette: 'garbaM', move: (p, t, beat) => (p.py = 1.6 + beat * 0.03) });
      place(s, wedge(ctx), -3.5, 1.6, sz + 3.2, Math.PI);
      place(s, wedge(ctx), 3.5, 1.6, sz + 3.2, Math.PI);
      // Delay towers aimed at the arena centre
      [35, 145, 215, 325].forEach((deg) => {
        const a = deg * DEG;
        const x = Math.cos(a) * 26.5, z = Math.sin(a) * 26.5;
        tr.tower(x, z, 9);
        const yaw = Math.atan2(-x, -z);
        place(s, lineArray(ctx, 6, 'JBL', { chain: 0.3, tilt: 5, splay: [0, 1, 2, 3, 5, 7] }), x + Math.sin(yaw) * 0.5, 8, z + Math.cos(yaw) * 0.5, yaw);
        place(s, movingHead(ctx, 0xffffff, { length: 20, aim: 0.9, palette: 'navratri' }), x, 9.3, z);
      });
      place(s, mixer(ctx, { channels: 32, brand: 'Midas' }), 0, 0, 27, Math.PI);
      crowd(ctx, [{ x: -0.4, z: 27.7, ry: Math.PI }, { x: 0.6, z: 27.8, ry: Math.PI }], { palette: 'garbaM' });
      tr.done();
      // Garba rings: dancers circling the mandvi counter-clockwise
      const dancers = [];
      for (let rad = 4.4; rad < 20.5; rad += 1.6) {
        const count = scale(Math.floor((Math.PI * 2 * rad) / 0.9));
        const a0 = ctx.rand() * 6.28;
        for (let k = 0; k < count; k++) dancers.push({ x: 0, z: 0, rad: rad + (ctx.rand() - 0.5) * 0.3, a0: a0 + (k / count) * Math.PI * 2, speed: 0.95 + ctx.rand() * 0.15 });
      }
      crowd(ctx, dancers, {
        palette: 'garbaM',
        paletteW: 'garbaW',
        women: 0.6,
        move(p, t, beat) {
          const a = p.a0 + (t * 0.9 * p.speed) / p.rad;
          const step = Math.sin(t * Math.PI * 2 + p.phase);
          const rr = p.rad + step * 0.12;
          p.px = Math.cos(a) * rr;
          p.pz = Math.sin(a) * rr;
          // Face the direction of travel, swaying into each clap; an occasional full twirl.
          const cycle = (t * 0.12 + p.phase) % 1;
          const twirl = cycle > 0.92 ? ((cycle - 0.92) / 0.08) * Math.PI * 2 : 0;
          p.ry = -a + step * 0.55 + twirl;
          p.py = Math.abs(Math.sin(t * Math.PI * 2 + p.phase)) * 0.06 + beat * 0.05;
        },
      });
      return { views: { audience: [[15, 5.2, 21], [0, 2, -6]], stage: [[0, 6.5, -25], [0, 0, 6]], aerial: [[34, 30, 36], [0, 0, -6]] }, maxDist: 110 };
    },
  };

  const MOVER_PALETTES = {
    concert: [0xffffff, 0x7c3aed, 0x00c2ff, 0xff2e63, 0xffb000],
    navratri: [0xff2e63, 0xffb000, 0xff4fd8, 0x22c55e, 0xffffff, 0x00c2ff],
  };

  // ---------- Viewer ----------
  function Visualizer(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.5 : 2));
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    if (THREE.RoomEnvironment) {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.env = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    }
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.04;
    this.controls.minDistance = 2;
    this.controls.autoRotateSpeed = 0.35;
    this.renderer.domElement.addEventListener('pointerdown', () => {
      this.controls.autoRotate = false;
      this.tween = null;
    });
    this.clock = new THREE.Clock();
    this.t = 0;
    this.playing = true;
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    if (window.ResizeObserver) new ResizeObserver(this.resize).observe(container);
    this.resize();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  function disposeScene(scene) {
    scene.traverse((o) => {
      if (o.geometry && !(o.geometry.userData && o.geometry.userData.cached)) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      ms.forEach((m) => !(m.userData && m.userData.cached) && m.dispose());
    });
  }

  // Merge every static mesh per material into one draw call (cuts ~1,000 calls to a few dozen).
  function bakeStatic(ctx) {
    const utils = THREE.BufferGeometryUtils;
    if (!utils || !utils.mergeBufferGeometries) return;
    const dynamic = new Set();
    const mark = (o) => o.traverse((c) => dynamic.add(c));
    ctx.pulsing.forEach(mark);
    ctx.meters.forEach((m) => mark(m.mesh));
    ctx.movers.forEach((m) => mark(m.pan));
    ctx.scene.updateMatrixWorld(true);
    const buckets = new Map();
    const baked = [];
    ctx.scene.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || dynamic.has(o) || Array.isArray(o.material) || o.material.isShaderMaterial || o.material.transparent || o.children.length) return;
      let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      if (g.index) g = g.toNonIndexed();
      Object.keys(g.attributes).forEach((n) => n !== 'position' && n !== 'normal' && n !== 'uv' && g.deleteAttribute(n));
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      const key = o.material.uuid + (o.castShadow ? 's' : '');
      if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, geos: [] });
      buckets.get(key).geos.push(g);
      baked.push(o);
    });
    baked.forEach((o) => o.parent.remove(o));
    buckets.forEach((b) => {
      const merged = utils.mergeBufferGeometries(b.geos);
      b.geos.forEach((g) => g.dispose());
      if (!merged) return;
      const m = new THREE.Mesh(merged, b.mat);
      m.castShadow = b.cast;
      m.receiveShadow = true;
      ctx.scene.add(m);
    });
  }

  Visualizer.prototype.load = function (name) {
    if (this.scene) disposeScene(this.scene);
    const scene = new THREE.Scene();
    const ctx = { scene, env: this.env, shadowRes: isSmall ? 1024 : 2048, rand: rng(name.length * 7919 + 13), pulsing: [], meters: [], movers: [], shaders: [], flicker: [], animators: [] };
    const info = SETUPS[name](ctx);
    bakeStatic(ctx);
    this.scene = scene;
    this.ctx = ctx;
    this.views = info.views;
    this.controls.maxDistance = info.maxDist;
    const v = info.views.audience;
    this.camera.position.set(v[0][0], v[0][1], v[0][2]);
    this.controls.target.set(v[1][0], v[1][1], v[1][2]);
    this.controls.autoRotate = true;
    this.tween = null;
    this.view = 'audience';
    this.controls.update();
  };

  Visualizer.prototype.setView = function (key) {
    const v = this.views && this.views[key];
    if (!v) return;
    this.view = key;
    this.controls.autoRotate = false;
    this.tween = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: V3(v[0][0], v[0][1], v[0][2]), t1: V3(v[1][0], v[1][1], v[1][2]), k: 0 };
  };

  Visualizer.prototype.resize = function () {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  Visualizer.prototype.loop = function () {
    requestAnimationFrame(this.loop);
    if (!this.scene || !this.visible) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const ctx = this.ctx;
    if (this.playing) {
      this.t += dt;
      const t = this.t;
      // Follow the real demo beat when it's playing; otherwise fake a kick at ~120 BPM.
      const audio = window.ADAudio && window.ADAudio.active ? window.ADAudio.levels() : null;
      const beat = audio ? Math.min(1, audio.bass * 1.6) : Math.pow(Math.max(0, Math.sin(t * Math.PI * 4)), 8);
      ctx.pulsing.forEach((m, i) => (m.position.z = beat * 0.022 + Math.sin(t * 20 + i) * 0.002));
      ctx.meters.forEach((m) => m.mesh.scale.setScalar(0.6 + Math.abs(Math.sin(t * 6 + m.phase)) * 1.2));
      ctx.shaders.forEach((u) => {
        u.uTime.value = t;
        u.uBeat.value = beat;
      });
      ctx.movers.forEach((m, i) => {
        m.pan.rotation.y = m.base + Math.sin(t * 0.45 + m.phase) * 0.9;
        m.tilt.rotation.x = m.aim + Math.sin(t * 0.7 + m.phase * 1.3) * 0.35;
        const pal = MOVER_PALETTES[m.palette] || MOVER_PALETTES.concert;
        m.mat.uniforms.uColor.value.setHex(pal[(Math.floor(t / 4) + (i % 2)) % pal.length]);
        m.mat.uniforms.uIntensity.value = 0.35 + beat * 0.55;
      });
      ctx.flicker.forEach((fn) => fn(t, beat));
      ctx.animators.forEach((fn) => fn(t, beat));
    }
    if (this.tween) {
      const tw = this.tween;
      tw.k = Math.min(1, tw.k + dt / 1.6);
      const e = tw.k < 0.5 ? 4 * tw.k * tw.k * tw.k : 1 - Math.pow(-2 * tw.k + 2, 3) / 2;
      this.camera.position.lerpVectors(tw.p0, tw.p1, e);
      this.controls.target.lerpVectors(tw.t0, tw.t1, e);
      if (tw.k >= 1) this.tween = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  window.ADVisualizer = function (container) {
    const v = new Visualizer(container);
    v.visible = true;
    if (window.IntersectionObserver) {
      new IntersectionObserver((entries) => (v.visible = entries[0].isIntersecting)).observe(container);
    }
    return v;
  };
})();
