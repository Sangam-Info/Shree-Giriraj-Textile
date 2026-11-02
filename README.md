# Shri Giriraj Textile — Jobwork Management System

Production build of the approved jobwork prototype. Bilingual (Gujarati + English),
mobile-first, BigInt-exact accounting (money in paise, weight in grams).

**Stack (per Work Order)**
- **GitHub** — source of truth & version control (this repo).
- **Cloudflare Pages** — hosting/deploy of the static app in `public/` (no build step).
- **Firebase** — Authentication (role-based sign-in) + Firestore (persistent, cross-device data).

## Roles (two only, set at sign-in — no role-switcher)
- **Admin** — full access: ledger, billing, loans, upad, year-end, job-worker directory **and packaging**.
- **Supervisor** — gate job work sheet, niwar gate entry **and packaging** only. **No accounting or money figures.**

## Repository layout
```
public/                     the app (served as-is by Cloudflare Pages)
  index.html                shell + login + Firebase SDK
  assets/
    app.js                  all screens, calculations, PDF & WhatsApp exports
    styles.css              design system (logo-blue + gold)
    vortex.js               animated login backdrop
    giriraj-logo.png
    firebase-config.js      <-- paste your Firebase web config here
    auth.js                 Firebase Auth gate (email/password → role from Firestore)
    db.js                   Firestore data layer (scaffold; see docs/DATA-MODEL.md)
firestore.rules             role-based security rules
firestore.indexes.json
firebase.json               deploys rules + indexes
.firebaserc.example         -> copy to .firebaserc with your project id
wrangler.toml               Cloudflare Pages config
.github/workflows/deploy.yml  auto-deploy to Cloudflare Pages on push to main
docs/SETUP.md               full step-by-step runbook (do this first)
docs/DATA-MODEL.md          Firestore collections mapped from the prototype
```

## Demo vs Live
- **Demo mode** (default): `firebase-config.js` holds `REPLACE_ME`, so the app runs on
  in-memory sample data with the role-picker login. Good for review; data resets on reload.
- **Live mode**: paste a real Firebase web config → the login gains email + password,
  signs in with Firebase Auth, and reads the user's role from `users/{uid}`.

## Quick start (local)
```bash
npm install
npm run dev           # serves public/ at http://localhost:5173
```

## Deploy
Pushing to `main` auto-deploys to Cloudflare Pages via GitHub Actions
(needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo secrets).
Manual: `npm run deploy`. Firestore rules: `npm run firebase:rules`.

## Build status / roadmap
- [x] Phase 1 — repo scaffold, auth gate, security rules, CI/CD (this commit).
- [ ] Phase 2 — wire Workers / Gate sheets / Packaging to Firestore.
- [ ] Phase 3 — Billing, Loans, Upad, Niwar, Year-End persistence.
- [ ] Phase 4 — realtime sync + offline persistence + UAT.

See **docs/SETUP.md** to provision Firebase + Cloudflare and go live.
