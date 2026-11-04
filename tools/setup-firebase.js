/* =====================================================================
   setup-firebase.js — one-command Firebase setup (run from cmd)
   ---------------------------------------------------------------------
   Creates / updates the login accounts and their role documents, and
   seeds the settings doc — all without touching the Firebase console.

   It is IDEMPOTENT: run it as many times as you like. Existing accounts
   are updated (password + role), missing ones are created.

   USAGE (from the repo root):
     cd tools
     npm install
     node setup-firebase.js

   REQUIRES (both git-ignored, never committed):
     tools/serviceAccountKey.json   ← Firebase Console → Project settings
                                       → Service accounts → Generate new
                                       private key
     tools/accounts.json            ← copy of accounts.example.json with
                                       real passwords
   ===================================================================== */
"use strict";

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const KEY = path.join(__dirname, "serviceAccountKey.json");
const ACCT = path.join(__dirname, "accounts.json");

function die(msg) { console.error("\n✖ " + msg + "\n"); process.exit(1); }

if (!fs.existsSync(KEY))
  die("Missing tools/serviceAccountKey.json\n  Download it: Firebase Console → ⚙ Project settings → Service accounts → Generate new private key → save as tools/serviceAccountKey.json");
if (!fs.existsSync(ACCT))
  die("Missing tools/accounts.json\n  Copy accounts.example.json to accounts.json and set real passwords.");

const serviceAccount = require(KEY);
const accounts = require(ACCT);

if (!accounts.users || !accounts.users.length) die("accounts.json has no users.");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const auth = admin.auth();
const db = admin.firestore();

const VALID_ROLES = ["admin", "supervisor", "packaging"];

async function ensureUser(acc) {
  if (!acc.email || !acc.password) die("Each user needs an email and password in accounts.json.");
  if (VALID_ROLES.indexOf(acc.role) < 0) die('Bad role "' + acc.role + '" for ' + acc.email + " — use admin, supervisor or packaging.");
  if (String(acc.password).length < 6) die("Password for " + acc.email + " must be at least 6 characters.");
  if (/CHANGE_ME/.test(acc.password)) die("You left a placeholder password for " + acc.email + " — edit tools/accounts.json.");

  let user;
  try {
    user = await auth.getUserByEmail(acc.email);
    await auth.updateUser(user.uid, { password: acc.password, displayName: acc.name || "" });
    console.log("  ↻ updated account   " + acc.email);
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      user = await auth.createUser({ email: acc.email, password: acc.password, displayName: acc.name || "" });
      console.log("  ✚ created account   " + acc.email);
    } else { throw e; }
  }

  await db.collection("users").doc(user.uid).set(
    { role: acc.role, active: true, name: acc.name || "" },
    { merge: true }
  );
  console.log("     role → " + acc.role + "   (users/" + user.uid + ")");
  return user.uid;
}

(async () => {
  console.log("\nFirebase setup — project: " + (serviceAccount.project_id || "unknown") + "\n");
  for (const acc of accounts.users) await ensureUser(acc);

  // seed the settings document (safe to re-run)
  await db.collection("meta").doc("settings").set(
    { company: "Shree Girijaj Textile Services", setupAt: new Date().toISOString() },
    { merge: true }
  );
  console.log("  • meta/settings seeded");

  console.log("\n✔ Done. Accounts, roles and settings are live. You can sign in on the site now.\n");
  process.exit(0);
})().catch((e) => { console.error("\n✖ Failed:", e.message || e); process.exit(1); });
