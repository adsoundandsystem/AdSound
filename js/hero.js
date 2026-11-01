// Hero: GPU particle "sound field" that ripples with the mouse and reacts to a synthesized demo beat.
(function () {
  // ---------- Audio engine (Web Audio, no files needed) ----------
  const ADAudio = {
    active: false,
    ctx: null,
    analyser: null,
    data: null,
    _timer: null,
    _step: 0,
    _next: 0,
    listeners: [],

    _init() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.75;
      this.data = new Uint8Array(this.analyser.frequencyBinCount);
      this.master.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.25;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      return true;
    },

    _kick(t) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
      g.gain.setValueAtTime(1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 0.5);
    },

    _hat(t, open) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.noise;
      const f = this.ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 7000;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(open ? 0.22 : 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.18 : 0.05));
      s.connect(f).connect(g).connect(this.master);
      s.start(t);
      s.stop(t + 0.2);
    },

    _clap(t) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.noise;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1500;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      s.connect(f).connect(g).connect(this.master);
      s.start(t);
      s.stop(t + 0.2);
    },

    _bass(t, freq) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(180, t + 0.2);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.28, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      o.connect(f).connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 0.26);
    },

    // 16-step pattern at 118 BPM, scheduled slightly ahead for tight timing.
    _schedule() {
      const stepDur = 60 / 118 / 4;
      const bassline = [55, 0, 0, 55, 0, 0, 65.4, 0, 49, 0, 0, 49, 0, 0, 73.4, 0];
      while (this._next < this.ctx.currentTime + 0.12) {
        const s = this._step % 16;
        const t = this._next;
        if (s % 4 === 0) this._kick(t);
        if (s === 4 || s === 12) this._clap(t);
        if (s % 2 === 1) this._hat(t, s === 7 || s === 15);
        if (bassline[s]) this._bass(t, bassline[s]);
        this._next += stepDur;
        this._step++;
      }
    },

    start() {
      if (!this.ctx && !this._init()) return false;
      this.ctx.resume();
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(0.55, this.ctx.currentTime, 0.05);
      this._next = this.ctx.currentTime + 0.05;
      this._step = 0;
      this._timer = setInterval(() => this._schedule(), 25);
      this.active = true;
      this.listeners.forEach((fn) => fn(true));
      return true;
    },

    stop() {
      if (!this.ctx) return;
      clearInterval(this._timer);
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      this.active = false;
      this.listeners.forEach((fn) => fn(false));
    },

    toggle() {
      return this.active ? (this.stop(), false) : this.start();
    },

    // 0..1 bass energy and overall energy.
    levels() {
      if (!this.active || !this.analyser) return { bass: 0, all: 0 };
      this.analyser.getByteFrequencyData(this.data);
      let b = 0, a = 0;
      for (let i = 0; i < 6; i++) b += this.data[i];
      for (let i = 0; i < this.data.length; i++) a += this.data[i];
      return { bass: b / (6 * 255), all: a / (this.data.length * 255) };
    },

    onChange(fn) {
      this.listeners.push(fn);
    },
  };
  window.ADAudio = ADAudio;

  // ---------- Particle sound field ----------
  const container = document.getElementById('heroCanvas');
  if (!container || !window.THREE) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 3.2, 9);
  camera.lookAt(0, 0, -2);

  const isSmall = window.innerWidth < 700;
  const COLS = isSmall ? 110 : 200;
  const ROWS = isSmall ? 60 : 90;
  const W = 26, D = 16;
  const pos = new Float32Array(COLS * ROWS * 3);
  let k = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      pos[k++] = (c / (COLS - 1) - 0.5) * W;
      pos[k++] = 0;
      pos[k++] = (r / (ROWS - 1) - 0.5) * D - 3;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const uniforms = {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uEnergy: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uRipple: { value: 0 },
    uPixel: { value: renderer.getPixelRatio() },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime, uBass, uEnergy, uRipple, uPixel;
      uniform vec2 uMouse;
      varying float vH;
      varying float vFade;
      void main() {
        vec3 p = position;
        float d = length(p.xz - vec2(0.0, -2.0));
        // Travelling sound waves radiating from the "stage" plus cross waves.
        float h = sin(d * 1.15 - uTime * 2.2) * (0.22 + uBass * 1.1) / (1.0 + d * 0.12);
        h += sin(p.x * 0.55 + uTime * 0.9) * 0.18 + cos(p.z * 0.7 - uTime * 0.7) * 0.14;
        // Mouse ripple.
        float md = length(p.xz - uMouse);
        h += sin(md * 3.0 - uTime * 6.0) * exp(-md * 0.55) * (0.35 + uRipple);
        h += uEnergy * sin(p.x * 2.0 + uTime * 8.0) * 0.12;
        p.y += h;
        vH = h;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.0 + uBass * 2.5) * uPixel * (7.0 / -mv.z);
        vFade = smoothstep(13.0, 4.0, abs(p.x)) * smoothstep(-12.0, -6.0, p.z);
      }`,
    fragmentShader: `
      varying float vH;
      varying float vFade;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.1, length(c));
        vec3 amber = vec3(0.95, 0.66, 0.12);
        vec3 blue = vec3(0.86, 0.24, 0.24);
        vec3 col = mix(blue, amber, clamp(vH * 1.4 + 0.45, 0.0, 1.0));
        gl_FragColor = vec4(col, a * vFade * 0.9);
      }`,
  });
  scene.add(new THREE.Points(geo, mat));

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 1 ? 12 : 9;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Map pointer to the field's xz plane.
  const target = new THREE.Vector2(0, -2);
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  window.addEventListener('pointermove', (e) => {
    const rect = container.getBoundingClientRect();
    if (e.clientY > rect.bottom) return;
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera({ x: nx, y: ny }, camera);
    if (ray.ray.intersectPlane(plane, hit)) target.set(hit.x, hit.z);
  });
  container.parentElement.addEventListener('pointerdown', () => (uniforms.uRipple.value = 1.2));

  let visible = true;
  if (window.IntersectionObserver) new IntersectionObserver((en) => (visible = en[0].isIntersecting)).observe(container);

  const clock = new THREE.Clock();
  let bass = 0, energy = 0;
  (function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const lv = ADAudio.levels();
    bass += (lv.bass - bass) * 0.35;
    energy += (lv.all - energy) * 0.2;
    uniforms.uTime.value += reduceMotion ? dt * 0.2 : dt;
    uniforms.uBass.value = bass;
    uniforms.uEnergy.value = energy;
    uniforms.uMouse.value.lerp(target, 0.06);
    uniforms.uRipple.value *= 0.95;
    camera.position.x += ((target.x * 0.06) - camera.position.x) * 0.03;
    camera.lookAt(0, 0, -2);
    renderer.render(scene, camera);
  })();
})();
