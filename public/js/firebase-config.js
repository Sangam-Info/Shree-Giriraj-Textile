/* =====================================================================
   Firebase web config — Shri Giriraj Textile · Jobwork System
   ---------------------------------------------------------------------
   Paste the config object from:
   Firebase Console → Project settings → General → Your apps → Web app (</>)

   The apiKey below is NOT a secret — it only identifies this project to Google.
   Account security comes from Firebase Authentication (passwords are never stored
   or seen by this app) and the role-based Firestore security rules.

   Roles are read per account from each user's own users/{uid} document, managed
   in the in-app User Management panel — there is no email list to maintain here.
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

/* Account recovery now works fully client-side (no Cloud Function needed):
   the Owner saves a recovery code in Profile, and on the login screen that code
   emails a Firebase password-reset link to the registered address. This legacy
   setting is unused and kept only for backward compatibility. */
window.__RECOVERY_URL = "";
