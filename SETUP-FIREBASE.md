# Firebase from the command line — Shree Girijaj Textile

This makes Firebase work the same way as GitHub + Cloudflare: **from cmd, no clicking around the console.**
You do a short one-time setup, then everything (rules, accounts, roles, data) is a single command.

Everything runs on **your machine** (like `git push` does) — Firebase won't let anyone in without your own key.

---

## One-time setup

### 0. Node.js (skip if `node -v` already prints a version)
```powershell
winget install OpenJS.NodeJS.LTS
```
Close and reopen PowerShell afterwards.

### 1. Get these files into the repo and push
Extract the zip into your repo folder, then:
```powershell
cd C:\Users\ZeroSupplyEnterprise\Shree-Giriraj-Textile
git add -A
git commit -m "Firebase CLI setup (rules deploy + account/role script)"
git push
```

### 2. Download your Firebase key (the "access")  ⚠ one time only
Firebase Console → **⚙ Project settings** → **Service accounts** tab → **Generate new private key** → **Generate key**.
Save the downloaded file as:
```
C:\Users\ZeroSupplyEnterprise\Shree-Giriraj-Textile\tools\serviceAccountKey.json
```
> 🔒 This file is a master key to your project. It is already git-ignored — **never commit or share it.**

### 3. Install the Firebase CLI and log in
```powershell
npm install -g firebase-tools
firebase login
```
`firebase login` opens your browser once — sign in with the Google account that owns the project.

---

## Deploy the security rules (from cmd)
```powershell
cd C:\Users\ZeroSupplyEnterprise\Shree-Giriraj-Textile
firebase deploy --only firestore:rules
```

## Create the login accounts + roles (from cmd)
```powershell
cd C:\Users\ZeroSupplyEnterprise\Shree-Giriraj-Textile\tools
copy accounts.example.json accounts.json
notepad accounts.json       # set real passwords, save, close
npm install
node setup-firebase.js
```
This creates (or updates) the admin + supervisor accounts, writes their role documents, and seeds settings.
It is safe to run again any time. When it prints **✔ Done**, you can sign in on the live site.

---

## Day-to-day — all three from cmd

| You changed…                    | Command                                                        |
|---------------------------------|---------------------------------------------------------------|
| App code                        | `git push`  → GitHub + Cloudflare auto-deploy                 |
| `firestore.rules`               | `firebase deploy --only firestore:rules`                      |
| A user, password, or role       | edit `tools\accounts.json` → `node tools\setup-firebase.js`   |

To add a **packaging** user later, add another entry to `accounts.json` with `"role": "packaging"` and re-run the script.

---

## Never commit these (already git-ignored in `tools/`)
- `tools/serviceAccountKey.json`
- `tools/accounts.json`
