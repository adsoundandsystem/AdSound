// Cloud setup (optional but recommended). See README → "Firebase setup".
//
// While this is null the site runs in "browser-only" mode: inquiries, estimates and prices are
// kept in the browser's localStorage and password reset e-mails are not available.
//
// Paste your Firebase web-app config here to switch on: real admin login, password-reset
// e-mails, and inquiries / estimates / price master shared across all devices.
//
// window.AD_FIREBASE = {
//   apiKey: '...',
//   authDomain: 'your-project.firebaseapp.com',
//   projectId: 'your-project',
//   storageBucket: 'your-project.appspot.com',
//   messagingSenderId: '...',
//   appId: '...',
// };
window.AD_FIREBASE = null;

// The only account allowed into the admin panel.
window.AD_ADMIN_EMAIL = 'adsoundandsystem@gmail.com';
