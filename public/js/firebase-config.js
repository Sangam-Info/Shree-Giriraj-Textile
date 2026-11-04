/* =====================================================================
   Firebase web config — Shri Giriraj Textile · Jobwork System
   ---------------------------------------------------------------------
   Paste the config object from:
   Firebase Console → Project settings → General → Your apps → Web app (</>)

   While these stay as "REPLACE_ME", the app runs in DEMO mode:
   in-memory data + role-picker login (no password). The moment a real
   apiKey is present, auth.js switches on Firebase Authentication and
   Firestore persistence.
   ===================================================================== */
window.__FIREBASE_CONFIG = {
  apiKey:            "AIzaSyC0O7-rSbV7pAgwvVCOWX7_svYxFWjm4n8",
  authDomain:        "shree-giriraj-textile.firebaseapp.com",
  projectId:         "shree-giriraj-textile",
  storageBucket:     "shree-giriraj-textile.firebasestorage.app",
  messagingSenderId: "307408604244",
  appId:             "1:307408604244:web:7b9abb5f52432ad3d871c1",
  measurementId:     "G-S0KFZR33CB"
};

/* ROLE ASSIGNMENT — by sign-in email.
   The address a person signs in with decides their role and dashboard.
   This is the single place to manage who is Admin vs Supervisor.
   • Add more people by comma-separating emails (e.g. "a@x.com, b@x.com").
   • These MUST match the email whitelist in firestore.rules.
   Because roles follow the EMAIL (not the account's UID), re-creating an
   account never breaks access — only the email has to stay the same. */
window.__APP_USERS = {
  admin:      "admin@gmail.com",       // → Admin Dashboard, full access
  supervisor: "superwiser@gmail.com"   // → Supervisor Dashboard, gate + packaging
};
