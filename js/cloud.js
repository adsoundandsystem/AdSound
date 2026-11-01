// Data layer shared by the public site and the admin panel.
// Firebase Firestore when js/config.js provides a config, otherwise browser localStorage.
(function () {
  const cfg = window.AD_FIREBASE;
  const isCloud = !!(cfg && cfg.apiKey && cfg.projectId);
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const KEYS = { inquiries: 'adsound.inquiries.v1', estimates: 'adsound.estimates.v1', master: 'adsound.master.v1' };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }

  let appReady = null;
  let authReady = null;
  // Loads the Firebase SDK on first use; the public page only pays for it when an inquiry is sent.
  function init(opts) {
    if (!isCloud) return Promise.resolve(null);
    if (!appReady) {
      appReady = loadScript(SDK + 'firebase-app-compat.js')
        .then(() => loadScript(SDK + 'firebase-firestore-compat.js'))
        .then(() => {
          if (!firebase.apps.length) firebase.initializeApp(cfg);
          return firebase;
        });
    }
    if (opts && opts.auth && !authReady) authReady = appReady.then(() => loadScript(SDK + 'firebase-auth-compat.js')).then(() => firebase);
    return opts && opts.auth ? authReady : appReady;
  }

  const db = () => firebase.firestore();

  function readLocal(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(KEYS[key]) || 'null');
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }
  function writeLocal(key, value) {
    localStorage.setItem(KEYS[key], JSON.stringify(value));
  }

  function refId(prefix) {
    const d = new Date();
    const stamp = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    return prefix + '-' + stamp + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  const byNewest = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));

  function collection(name, prefix) {
    return {
      async list() {
        if (isCloud) {
          await init();
          const snap = await db().collection(name).get();
          return snap.docs.map((d) => Object.assign({}, d.data(), { id: d.id })).sort(byNewest);
        }
        return readLocal(name, []).sort(byNewest);
      },
      async get(id) {
        if (isCloud) {
          await init();
          const d = await db().collection(name).doc(id).get();
          return d.exists ? Object.assign({}, d.data(), { id: d.id }) : null;
        }
        return readLocal(name, []).find((x) => x.id === id) || null;
      },
      async add(data) {
        const now = new Date().toISOString();
        const doc = Object.assign({}, data, { id: refId(prefix), createdAt: now, updatedAt: now });
        if (isCloud) {
          await init();
          const { id, ...fields } = doc;
          await db().collection(name).doc(id).set(fields);
        } else {
          const list = readLocal(name, []);
          list.push(doc);
          writeLocal(name, list);
        }
        return doc;
      },
      async update(id, patch) {
        const fields = Object.assign({}, patch, { updatedAt: new Date().toISOString() });
        delete fields.id;
        if (isCloud) {
          await init();
          await db().collection(name).doc(id).set(fields, { merge: true });
          return this.get(id);
        }
        const list = readLocal(name, []);
        const i = list.findIndex((x) => x.id === id);
        if (i < 0) return null;
        list[i] = Object.assign({}, list[i], fields);
        writeLocal(name, list);
        return list[i];
      },
      async remove(id) {
        if (isCloud) {
          await init();
          await db().collection(name).doc(id).delete();
          return;
        }
        writeLocal(name, readLocal(name, []).filter((x) => x.id !== id));
      },
      // Import: entries with an existing id are overwritten.
      async merge(items) {
        for (const it of items) {
          if (!it || !it.id) continue;
          if (isCloud) {
            await init();
            const { id, ...fields } = it;
            await db().collection(name).doc(id).set(fields);
          } else {
            const list = readLocal(name, []).filter((x) => x.id !== it.id);
            list.push(it);
            writeLocal(name, list);
          }
        }
      },
    };
  }

  window.ADCloud = {
    isCloud,
    init,
    inquiries: collection('inquiries', 'ADS'),
    estimates: collection('estimates', 'EST'),
    master: {
      async get() {
        if (isCloud) {
          await init();
          const d = await db().collection('settings').doc('priceMaster').get();
          return d.exists ? d.data() : null;
        }
        return readLocal('master', null);
      },
      async save(m) {
        const data = Object.assign({}, m, { updatedAt: new Date().toISOString() });
        if (isCloud) {
          await init();
          await db().collection('settings').doc('priceMaster').set(data);
        } else {
          writeLocal('master', data);
        }
        return data;
      },
    },
  };
})();
