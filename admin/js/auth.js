// Admin authentication.
// Cloud mode (Firebase configured): Firebase Auth — real accounts and password-reset e-mails.
// Browser-only mode: credentials stored hashed in this browser; reset e-mails are not possible.
// First sign-in uses the temporary password and must be followed by setting a permanent one.
window.ADAuth = (function () {
  const ADMIN = String(window.AD_ADMIN_EMAIL || '').toLowerCase();
  const TEMP_PASSWORD = 'ADSound';
  const CREDS_KEY = 'adsound.auth.v1';
  const SESSION_KEY = 'adsound.session.v1';
  const cloud = ADCloud.isCloud;

  const fail = (code) => Object.assign(new Error(code), { code });
  const hashFor = (email, pass) => AD_sha256(email.toLowerCase() + ':' + pass);

  async function localCreds() {
    try {
      const c = JSON.parse(localStorage.getItem(CREDS_KEY) || 'null');
      if (c && c.hash) return c;
    } catch (e) {}
    return { email: ADMIN, hash: await hashFor(ADMIN, TEMP_PASSWORD), temp: true };
  }

  function session(value) {
    try {
      if (value === undefined) return sessionStorage.getItem(SESSION_KEY);
      if (value === null) sessionStorage.removeItem(SESSION_KEY);
      else sessionStorage.setItem(SESSION_KEY, value);
    } catch (e) {}
    return null;
  }

  // At least 8 characters with a letter and a number, and not the temporary password.
  function checkStrength(pass) {
    if (!pass || pass.length < 8) return 'short';
    if (!/[A-Za-z]/.test(pass) || !/\d/.test(pass)) return 'weak';
    if (pass === TEMP_PASSWORD) return 'temp';
    return null;
  }

  async function auth() {
    await ADCloud.init({ auth: true });
    return firebase.auth();
  }

  return {
    mode: cloud ? 'cloud' : 'local',
    admin: ADMIN,
    checkStrength,

    // Returns { email, mustChange } when a session is already active, otherwise null.
    async restore() {
      if (cloud) {
        const a = await auth();
        const user = await new Promise((resolve) => {
          const off = a.onAuthStateChanged((u) => {
            off();
            resolve(u);
          });
        });
        if (!user) return null;
        if (String(user.email).toLowerCase() !== ADMIN) {
          await a.signOut();
          return null;
        }
        return { email: user.email, mustChange: session() === 'must-change' };
      }
      const c = await localCreds();
      const s = session();
      if (s === 'ok' && !c.temp) return { email: c.email, mustChange: false };
      if (s === 'must-change') return { email: c.email, mustChange: true };
      return null;
    },

    async login(email, pass) {
      email = String(email || '').trim().toLowerCase();
      if (email !== ADMIN) throw fail('bad');
      if (cloud) {
        const a = await auth();
        await a.setPersistence(firebase.auth.Auth.Persistence.SESSION);
        try {
          await a.signInWithEmailAndPassword(email, pass);
        } catch (e) {
          const unknown = ['auth/invalid-credential', 'auth/user-not-found', 'auth/invalid-login-credentials', 'auth/wrong-password'].includes(e.code);
          if (!unknown || pass !== TEMP_PASSWORD) throw fail(e.code === 'auth/too-many-requests' ? 'locked' : 'bad');
          // First ever sign-in: create the admin account with the temporary password.
          try {
            await a.createUserWithEmailAndPassword(email, pass);
          } catch (e2) {
            throw fail('bad');
          }
        }
        const mustChange = pass === TEMP_PASSWORD;
        session(mustChange ? 'must-change' : 'ok');
        return { email, mustChange };
      }
      const c = await localCreds();
      if (email !== c.email || (await hashFor(email, pass)) !== c.hash) throw fail('bad');
      session(c.temp ? 'must-change' : 'ok');
      return { email, mustChange: !!c.temp };
    },

    async setPermanentPassword(next) {
      const problem = checkStrength(next);
      if (problem) throw fail(problem);
      if (cloud) {
        const a = await auth();
        try {
          await a.currentUser.updatePassword(next);
        } catch (e) {
          throw fail(e.code === 'auth/requires-recent-login' ? 'relogin' : 'failed');
        }
      } else {
        localStorage.setItem(CREDS_KEY, JSON.stringify({ email: ADMIN, hash: await hashFor(ADMIN, next), temp: false }));
      }
      session('ok');
    },

    async changePassword(current, next) {
      const problem = checkStrength(next);
      if (problem) throw fail(problem);
      if (cloud) {
        const a = await auth();
        const user = a.currentUser;
        try {
          await user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email, current));
        } catch (e) {
          throw fail('bad');
        }
        await user.updatePassword(next);
        return;
      }
      const c = await localCreds();
      if ((await hashFor(ADMIN, current)) !== c.hash) throw fail('bad');
      localStorage.setItem(CREDS_KEY, JSON.stringify({ email: ADMIN, hash: await hashFor(ADMIN, next), temp: false }));
    },

    // Sends Firebase's password-reset e-mail. Not available in browser-only mode.
    async forgot(email) {
      if (!cloud) throw fail('noCloud');
      email = String(email || '').trim().toLowerCase();
      if (email !== ADMIN) return; // Same response either way; don't reveal which e-mails exist.
      const a = await auth();
      try {
        await a.sendPasswordResetEmail(email);
      } catch (e) {
        if (e.code !== 'auth/user-not-found') throw fail('failed');
      }
    },

    async logout() {
      session(null);
      if (cloud) await (await auth()).signOut();
    },
  };
})();
