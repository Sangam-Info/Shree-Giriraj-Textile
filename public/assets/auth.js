/* =====================================================================
   auth.js — Firebase Authentication gate for the Jobwork System
   ---------------------------------------------------------------------
   - DEMO mode  : when firebase-config.js is still "REPLACE_ME" (or the
                  Firebase SDK did not load), this file does nothing and
                  the app keeps the role-picker demo login.
   - LIVE mode  : with a real config, it injects email + password fields
                  into the login card, signs the user in with Firebase
                  Auth, reads their role from Firestore (users/{uid}.role),
                  and opens that role's dashboard via window.GJ.enter(role).
   No build step — uses the Firebase compat SDK loaded in index.html.
   ===================================================================== */
(function () {
  "use strict";

  var cfg = window.__FIREBASE_CONFIG || {};
  var LIVE = typeof firebase !== "undefined" && cfg.apiKey && cfg.apiKey !== "REPLACE_ME";

  window.GJAuth = { enabled: false };

  if (!LIVE) {
    // Demo mode — leave the app's role-picker login untouched.
    return;
  }

  firebase.initializeApp(cfg);
  var auth = firebase.auth();
  var db   = firebase.firestore();
  try { auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (e) {}
  window.GJAuth.enabled = true;
  window.GJAuth.auth = auth;
  window.GJAuth.db = db;

  var USERS = window.__APP_USERS || {};

  function $(s) { return document.querySelector(s); }

  /* Inject email + password fields above the Log In button. */
  function injectFields() {
    if ($("#authFields")) return;
    var btn = $("#enterBtn");
    if (!btn) return;
    var wrap = document.createElement("div");
    wrap.id = "authFields";
    wrap.style.cssText = "display:grid;gap:10px;margin:4px 0 16px;";
    wrap.innerHTML =
      '<label style="display:grid;gap:6px;color:#cdd3ef;font-size:12.5px;font-weight:600">ઈમેલ · Email' +
      '<input id="authEmail" type="email" autocomplete="username" placeholder="you@shrigiriraj.app" ' +
      'style="width:100%;padding:12px 13px;border-radius:12px;border:1.5px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#fff;font:inherit"></label>' +
      '<label style="display:grid;gap:6px;color:#cdd3ef;font-size:12.5px;font-weight:600">પાસવર્ડ · Password' +
      '<input id="authPass" type="password" autocomplete="current-password" placeholder="••••••••" ' +
      'style="width:100%;padding:12px 13px;border-radius:12px;border:1.5px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#fff;font:inherit"></label>' +
      '<div id="authErr" style="display:none;color:#ff9b9b;font-size:12px;font-weight:600"></div>';
    btn.parentNode.insertBefore(wrap, btn);

    // Enter key on password submits.
    $("#authPass").addEventListener("keydown", function (e) { if (e.key === "Enter") btn.click(); });

    // Role card → prefill email if a mapping exists.
    document.querySelectorAll("#rolePicker .role-card").forEach(function (c) {
      c.addEventListener("click", function () {
        var r = c.getAttribute("data-role") || "admin";
        var em = USERS[r];
        if (em && $("#authEmail") && !$("#authEmail").value) $("#authEmail").value = em;
      });
    });
    // Prefill for the pre-selected (admin) card.
    if (USERS.admin && $("#authEmail")) $("#authEmail").value = USERS.admin;
  }

  function showErr(msg) {
    var e = $("#authErr"); if (!e) return;
    e.textContent = msg; e.style.display = "block";
  }

  /* Resolve the signed-in user's role from Firestore, then open the app. */
  function enterFor(user) {
    return db.collection("users").doc(user.uid).get().then(function (snap) {
      var role = (snap.exists && snap.data().role) || "supervisor";
      if (snap.exists && snap.data().active === false) {
        return auth.signOut().then(function () { showErr("Account disabled. Contact the owner."); });
      }
      window.GJAuth.user = { uid: user.uid, email: user.email, role: role };
      window.GJ.enter(role); // authoritative role from the account record
    });
  }

  /* Called by the Log In button in LIVE mode. */
  window.GJAuth.attempt = function (pendingRole) {
    var email = ($("#authEmail") && $("#authEmail").value || "").trim();
    var pass  = ($("#authPass") && $("#authPass").value) || "";
    if (!email) { showErr("Enter your email."); return; }
    if (!pass)  { showErr("Enter your password."); return; }
    showErr(""); var e = $("#authErr"); if (e) e.style.display = "none";
    var btn = $("#enterBtn"); if (btn) { btn.disabled = true; btn.style.opacity = ".7"; }
    auth.signInWithEmailAndPassword(email, pass)
      .then(function (cred) { return enterFor(cred.user); })
      .catch(function (err) {
        var map = {
          "auth/invalid-email": "Invalid email address.",
          "auth/user-not-found": "No account for this email.",
          "auth/wrong-password": "Incorrect password.",
          "auth/invalid-credential": "Incorrect email or password.",
          "auth/too-many-requests": "Too many attempts. Try again later."
        };
        showErr(map[err && err.code] || "Sign-in failed. Try again.");
      })
      .then(function () { if (btn) { btn.disabled = false; btn.style.opacity = ""; } });
  };

  window.GJAuth.logout = function () { auth.signOut().then(function () { location.reload(); }); };

  /* On load: build fields, and auto-enter if a session already exists. */
  function init() {
    injectFields();
    auth.onAuthStateChanged(function (user) {
      if (user && !window.GJAuth.user) { enterFor(user); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
