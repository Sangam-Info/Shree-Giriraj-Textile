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
  apiKey:            "REPLACE_ME",
  authDomain:        "REPLACE_ME.firebaseapp.com",
  projectId:         "REPLACE_ME",
  storageBucket:     "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId:             "REPLACE_ME"
};

/* Optional: pre-fill the email for each role card on the login screen.
   Leave blank to make users type their email. Roles are still read
   authoritatively from Firestore (users/{uid}.role) after sign-in. */
window.__APP_USERS = {
  admin:      "",   // e.g. "owner@shrigiriraj.app"
  supervisor: ""    // e.g. "supervisor@shrigiriraj.app"
};
