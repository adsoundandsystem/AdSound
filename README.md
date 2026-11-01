# AD Sound And System — Website & Admin

Public website and a separate admin panel for **AD Sound And System** (since 1995 · 1,500+ events · Dilipbhai Dave & Aniket Dave · +91 8320330558 · adsoundandsystem@gmail.com).
Static files only (HTML + Tailwind CDN + Three.js + jsPDF), ready for GitHub Pages. Works on phones, tablets and desktops.

## Structure

```
index.html              Public website (English / ગુજરાતી / हिन्दी). No prices are shown.
css/styles.css          Public site styles (warm paper / indigo / sindoor / haldi theme)
js/data.js              Public catalogue: business info, packages, services, FAQs (no prices)
js/i18n.js              Gujarati & Hindi translations + language switcher
js/main.js              "Plan your sound" journey (occasion → 3D → guests → recommended rig), catalogue, inquiry form
js/visualizer.js        Three.js scenes: Compact, Banquet, Line Array Concert, Line Array Navratri
js/hero.js              Hero sound-field animation and demo beat
js/site.js              Header state, reveal-on-scroll, counters, FAQ accordion, mobile dock
js/config.js            ★ Firebase settings (optional, see below) and the admin e-mail
js/cloud.js             Data layer: Firebase Firestore when configured, otherwise browser storage
js/storage.js           Small shared helpers

admin/index.html        Admin panel (not linked from the website)
admin/js/auth.js        Sign-in, permanent password, forgot password
admin/js/admin.js       Dashboard, inquiries, estimations, Price Master, settings
admin/js/pdf.js         Branded estimation PDF (jsPDF)
admin/js/price-defaults.js  Starting Price Master (items & templates, all rates 0)
firestore.rules         Security rules to publish in Firebase
```

## Admin panel

- Open **`/admin/`** directly, e.g. `https://adsoundandsystem.github.io/AdSound/admin/`. There is no link to it on the website.
- First sign-in: **ID** `adsoundandsystem@gmail.com`, **temporary password** `ADSound`.
- You are then asked to set a **permanent password** (8+ characters, with a letter and a number). The temporary password stops working after that.
- **Forgot password?** sends a reset link to the admin e-mail (requires the Firebase setup below).
- Tabs:
  - **Dashboard** – inquiry counts and latest activity.
  - **Inquiries** – everything submitted from the website; change status (Pending / Confirmed / Completed / Cancelled); create an estimation from any inquiry.
  - **Estimations** – build an itemised estimate from the Price Master (or a package template), add discount and GST/tax, and download or preview the branded PDF. Status: Draft / Sent / Accepted / Rejected.
  - **Price Master** – your private rates (INR / USD / CAD) for every item, package templates, default tax rates, estimate validity and terms & conditions. **All rates start at 0 — enter your real rates and press Save.**
  - **Settings** – change password, download / restore a JSON backup.

## Firebase setup (recommended, ~10 minutes)

Without Firebase the site runs in **browser-only mode**: data is kept in one browser, so inquiries from customers' phones never reach the admin, and password-reset e-mails can't be sent. Firebase (free "Spark" plan) fixes both.

1. Go to https://console.firebase.google.com, sign in with the business Google account and **Add project** (e.g. `adsound`). Google Analytics is optional.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
3. Still in Authentication → **Users → Add user**: e-mail `adsoundandsystem@gmail.com`, password `ADSound`. (Creating it yourself means nobody else can claim the account first.) After the first sign-in the admin panel will ask for the permanent password.
4. **Authentication → Settings → Authorized domains → Add domain**: `adsoundandsystem.github.io`.
5. **Build → Firestore Database → Create database** (production mode, a region near India such as `asia-south1`).
6. Firestore → **Rules**: replace the contents with `firestore.rules` from this repository and **Publish**.
7. **Project settings (⚙) → Your apps → Web (`</>`)** → register an app → copy the `firebaseConfig` object.
8. Paste it into `js/config.js` as `window.AD_FIREBASE = { ... }` and publish the site again.

After that: website inquiries are stored online, the admin panel works from any device, and "Forgot password?" e-mails a reset link to adsoundandsystem@gmail.com. The Firebase web config is not a secret; access is controlled by the rules in step 6.

## Run locally

```
python -m http.server 8000
# site:  http://localhost:8000
# admin: http://localhost:8000/admin/
```

## Deploy (GitHub Pages)

Repository **Settings → Pages → Deploy from a branch → `main` / `(root)`**.

## Languages

English text lives in `index.html`; Gujarati and Hindi live in `js/i18n.js` under the same `data-i18n` keys (package, service, FAQ and event-type translations are in its `D` section). Inquiries are stored in English with the visitor's language noted, so the admin panel and PDFs stay in English (jsPDF's built-in fonts can't print Gujarati/Hindi script).

## Notes

- Browser-only mode: the admin password is stored hashed in that browser; anyone can open `/admin/` on their own device, but they see only their own (empty) browser data. Use Firebase for real multi-device security.
- PDFs print INR amounts as "Rs." because jsPDF's built-in fonts have no ₹ glyph.
