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

/* Optional: pre-fill the email for each role card on the login screen.
   Leave blank to make users type their email. Roles are still read
   authoritatively from Firestore (users/{uid}.role) after sign-in. */
window.__APP_USERS = {
  admin:      "",   // e.g. "owner@shrigiriraj.app"
  supervisor: ""    // e.g. "supervisor@shrigiriraj.app"
};
