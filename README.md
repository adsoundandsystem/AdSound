# AD Sound And System — Web Application

Single-page website + admin panel for **AD Sound And System** (Dilipbhai Dave & Aniket Dave · +91 8320330558 · adsoundandsystem@gmail.com).
100% client-side (HTML + Tailwind CDN + Three.js + jsPDF) — no build step, ready for GitHub Pages.

## Structure

```
index.html            Public site: brands, 3D visualizer, packages, international services, inquiry form
admin.html            Admin panel: login, inquiry dashboard, status tracking, quotation builder, PDF export
css/styles.css        Shared custom styles (dark theme on top of Tailwind)
js/data.js            ★ Business info, brands, packages, services, rates, terms, admin password hash
js/storage.js         localStorage inquiry store + helpers
js/i18n.js            English / ગુજરાતી / हिन्दी translations + language switcher
js/main.js            Public site rendering, instant estimator, FAQ, inquiry form
js/visualizer.js      Realistic Three.js scenes: 2-Panel Compact, 4-Panel Banquet, Line Array Concert, Line Array Navratri
js/hero.js            Hero particle sound-field (WebGL shader) + Web Audio demo beat ("Feel the sound")
js/fx.js              Preloader, Lenis smooth scroll, GSAP scroll reveals, counters, custom cursor, magnetic/tilt effects
js/admin.js           Admin dashboard + quotation builder
js/pdf.js             Branded estimation PDF engine (jsPDF + AutoTable)
js/logo-data.js       Logo embedded as base64 for the PDF (generated from assets/logo.png)
assets/               logo.png, logo-white.png, logo-mark-white.png, favicon.png
.nojekyll             Tells GitHub Pages to serve files as-is
```

## Run locally

Open `index.html` directly, or (recommended, matches GitHub Pages) serve the folder:

```
python -m http.server 8000
# then visit http://localhost:8000
```

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository (files at the repo root).
2. Repo **Settings → Pages → Build and deployment → Deploy from a branch**, choose `main` / `(root)`.
3. Site goes live at `https://<user>.github.io/<repo>/`; admin at `/admin.html`.

## Admin panel

- URL: `admin.html` (also linked in the site footer). Default password: **`adsound@2026`**.
- **Change the password:** open the site, press F12 → Console, run `await AD_sha256('your-new-password')`, and paste the result into `adminPasswordHash` in `js/data.js`.
- Features: inquiry table with search, status filter and counts (Pending / Confirmed / Completed / Cancelled), inline status updates, manual "+ New inquiry", JSON export/import, and a quotation builder (line items, qty, days, rates, add-ons, discount % or flat, GST/tax, notes, editable terms, INR / USD / CAD) that downloads or previews a branded PDF.

### Important limitations (by design of a client-side-only site)

- **Inquiries live in the browser's localStorage.** A customer submitting the form on *their* phone stores it on *their* phone. That is why, after submitting, the customer is prompted to **send the inquiry on WhatsApp or email** to the business. The admin then records it with **+ New inquiry** (or it is already there when the form was filled on the admin's own device). Use **Export/Import JSON** to back up or move data between devices.
- **The admin password is a client-side gate**, not real security: it keeps casual visitors out of the UI, but anyone technical can read the code. Don't store sensitive data. For true multi-device, secure storage, add a backend (e.g. Firebase/Supabase) later; `js/storage.js` is the only file that would need to change.
- jsPDF's built-in fonts have no ₹ glyph, so PDFs print INR amounts as **"Rs."**. Non-Latin text (e.g. Gujarati names) is stripped from the PDF; type names in English in the quotation builder.

## Languages

The public site is available in English, Gujarati and Hindi (EN / ગુ / हि switch in the header; the choice is remembered, and Gujarati/Hindi browsers get their language automatically).

- English text lives in `index.html`; Gujarati and Hindi live in `js/i18n.js` under the same `data-i18n` keys. To change a sentence, edit it in all three places.
- Package, service, FAQ and event-type translations are in the `D` section of `js/i18n.js`, keyed by the ids in `js/data.js`.
- Inquiries are always stored in English (with the visitor's language noted), so the admin panel and PDFs stay in English. PDFs can't print Gujarati/Hindi script with jsPDF's built-in fonts.

## Customising

Everything business-related is in **`js/data.js`**: contact details, brand lists, package gear lists, published price ranges, per-item default rates used to pre-fill quotations, international service rates (USD/CAD), add-on items, event types and terms & conditions. The default per-item rates are starting points that add up within each package's published range; adjust them to your actual pricing.

To regenerate the logo files from a new source image, replace `assets/logo.png` and update `js/logo-data.js` with its base64 PNG (`window.AD_LOGO = { dataUrl, width, height }`).
