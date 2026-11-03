# Setup runbook — Firebase · Cloudflare · GitHub

Do these once to take the app from demo mode to a live, persistent, deployed system.
Steps marked **[you]** need your own account logins and cannot be automated from here.

---

## 0. Get the code onto GitHub
Target repo: `https://github.com/Sangam-Info/Shree-Giriraj-Textile`

Either:
- **Link GitHub to this Claude session** (claude.ai → Settings → Connectors → GitHub), then
  Claude pushes this scaffold to `main` for you; **or**
- Push the delivered bundle yourself:
  ```bash
  cd shree-giriraj-textile
  git init && git add . && git commit -m "Phase 1: scaffold, auth, rules, CI"
  git branch -M main
  git remote add origin https://github.com/Sangam-Info/Shree-Giriraj-Textile.git
  git push -u origin main
  ```

---

## 1. Firebase — Authentication + Firestore  **[you]**
1. https://console.firebase.google.com → **Add project** (e.g. `shree-giriraj-textile`). Disable Analytics if you like.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
3. **Authentication → Users → Add user** — create the two accounts:
   - owner (Admin): e.g. `owner@shrigiriraj.app` + a password
   - supervisor: e.g. `supervisor@shrigiriraj.app` + a password
   - Copy each user's **UID**.
4. **Build → Firestore Database → Create database → Production mode →** pick region `asia-south1` (Mumbai).
5. Create the `users` collection with one document per account, **document ID = the UID**:
   ```
   users/{adminUID}      { name: "Meet / Owner", role: "admin",      active: true }
   users/{supervisorUID} { name: "Supervisor",   role: "supervisor", active: true }
   ```
6. **Project settings → General → Your apps → Web app (</>)** → register → copy the `firebaseConfig`.
7. Paste it into `public/assets/firebase-config.js` (replace every `REPLACE_ME`).
   Optionally set `window.__APP_USERS` emails so the role cards pre-fill them.
8. Deploy the security rules (installs `firestore.rules`):
   ```bash
   npm i -g firebase-tools
   firebase login
   cp .firebaserc.example .firebaserc   # then put your project id in it
   npm run firebase:rules
   ```

---

## 2. Cloudflare — Pages hosting  **[you]**
1. https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git** →
   pick `Sangam-Info/Shree-Giriraj-Textile`.
2. Build settings: **Framework preset = None**, **Build command = (empty)**, **Build output directory = `public`**.
3. Save & Deploy. Note the generated `*.pages.dev` URL (point the client's domain here later).
   - Firebase Auth: **Authentication → Settings → Authorized domains → Add** your `*.pages.dev`
     (and the custom domain) so sign-in works there.

(The included GitHub Action also deploys on every push once the secrets below are set — use it
instead of, or alongside, the dashboard Git integration.)

---

## 3. GitHub — Actions secrets  **[you]**
Repo → **Settings → Secrets and variables → Actions → New repository secret**:
- `CLOUDFLARE_API_TOKEN` — Cloudflare → My Profile → API Tokens → *Edit Cloudflare Workers* (or a token with **Pages: Edit**).
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare dashboard → account ID.

Push to `main` → the app deploys automatically.

---

## 4. Verify
- Open the `*.pages.dev` URL → login card shows **email + password**.
- Sign in as the supervisor → only gate, packaging, niwar, dashboard, help (no accounting).
- Sign in as admin → all modules.
- Create a gate sheet → reload → it persists (once Phase 2 Firestore wiring is merged).

---

## What stays in demo mode until later phases
`firebase-config.js` real values switch on **auth** immediately. **Data persistence** is wired
collection-by-collection in Phases 2–3 (see `docs/DATA-MODEL.md` and the README roadmap);
until a store is migrated it uses the in-memory sample data.
