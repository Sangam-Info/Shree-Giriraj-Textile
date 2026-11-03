/* =====================================================================
   auth.js — Firebase Authentication + role-based routing
   ---------------------------------------------------------------------
   Login panel behaviour (two roles, assigned by account — no switcher):
     • Admin      → full access, including packaging.
     • Supervisor → gate entry, niwar gate entry & packaging only.
                    No accounting / money figures.
   Sign-in is email + password (Firebase Auth). The ROLE is read from
   Firestore users/{uid}.role and is authoritative — it, not the card the
   user clicked, decides which dashboard and navigation they get. Firestore
   security rules enforce the same split server-side, so a supervisor
   cannot read or write any accounting collection even by tampering.

   DEMO mode: if firebase-config.js is still "REPLACE_ME" (or the SDK did
   not load), this file does nothing and the role-picker demo login stays.
   No build step — uses the Firebase compat SDK loaded in index.html.
   ===================================================================== */
(function () {
  "use strict";

  var cfg  = window.__FIREBASE_CONFIG || {};
  var LIVE = typeof firebase !== "undefined" && cfg.apiKey && cfg.apiKey !== "REPLACE_ME";

  window.GJAuth = { enabled: false };
  if (!LIVE) return;                       // demo mode — leave role-picker login alone

  firebase.initializeApp(cfg);
  var auth = firebase.auth();
  var db   = firebase.firestore();
  try { auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (e) {}

  window.GJAuth.enabled = true;
  window.GJAuth.auth = auth;
  window.GJAuth.db   = db;

  var USERS = window.__APP_USERS || {};
  function $(s) { return document.querySelector(s); }

  /* ---- one-time styling for the auth fields + logout, matches the card ---- */
  function injectStyle() {
    if ($("#gjAuthStyle")) return;
    var st = document.createElement("style");
    st.id = "gjAuthStyle";
    st.textContent =
      "#authFields{display:grid;gap:11px;margin:2px 0 16px}" +
      "#authFields .gjf{display:grid;gap:6px}" +
      "#authFields label{color:#cdd3ef;font-size:12.5px;font-weight:600}" +
      "#authFields input{width:100%;padding:12px 13px;border-radius:12px;border:1.5px solid rgba(255,255,255,.14);" +
      "background:rgba(255,255,255,.05);color:#fff;font:inherit;transition:border-color .15s,box-shadow .15s}" +
      "#authFields input:focus{outline:none;border-color:#2160ae;box-shadow:0 0 0 3px rgba(33,96,174,.3)}" +
      "#authFields input::placeholder{color:#7b84b2}" +
      "#authErr{display:none;color:#ff9b9b;font-size:12px;font-weight:600;margin-top:2px}" +
      "#gjLogout{display:inline-flex;align-items:center;gap:7px}" +
      "#gjUser{font-size:11.5px;color:var(--muted);font-weight:600;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}";
    document.head.appendChild(st);
  }

  /* ---- email + password fields on the login card ---- */
  var defaultBtnLabel = "";
  function injectFields() {
    injectStyle();
    var btn = $("#enterBtn");
    if (!btn) return;
    defaultBtnLabel = btn.innerHTML;
    if (!$("#authFields")) {
      var wrap = document.createElement("div");
      wrap.id = "authFields";
      wrap.innerHTML =
        '<div class="gjf"><label for="authEmail">ઈમેલ · Email</label>' +
        '<input id="authEmail" type="email" autocomplete="username" placeholder="you@shrigiriraj.app"></div>' +
        '<div class="gjf"><label for="authPass">પાસવર્ડ · Password</label>' +
        '<input id="authPass" type="password" autocomplete="current-password" placeholder="••••••••"></div>' +
        '<div id="authErr"></div>';
      btn.parentNode.insertBefore(wrap, btn);
      $("#authPass").addEventListener("keydown", function (e) { if (e.key === "Enter") btn.click(); });
      $("#authEmail").addEventListener("input", clearErr);
      $("#authPass").addEventListener("input", clearErr);
    }
    document.querySelectorAll("#rolePicker .role-card").forEach(function (c) {
      c.addEventListener("click", function () {
        var em = USERS[c.getAttribute("data-role") || "admin"];
        var f = $("#authEmail");
        if (em && f) f.value = em;
      });
    });
    if (USERS.admin && $("#authEmail") && !$("#authEmail").value) $("#authEmail").value = USERS.admin;
  }

  function setBusy(b, label) {
    var btn = $("#enterBtn"); if (!btn) return;
    btn.disabled = b;
    btn.style.opacity = b ? ".7" : "";
    btn.style.pointerEvents = b ? "none" : "";
    btn.innerHTML = b ? (label || "…") : defaultBtnLabel;
  }
  function showErr(msg) { var e = $("#authErr"); if (e) { e.textContent = msg; e.style.display = "block"; } }
  function clearErr() { var e = $("#authErr"); if (e) { e.textContent = ""; e.style.display = "none"; } }

  /* ---- resolve role from Firestore, then open that role's app ---- */
  function enterFor(user) {
    return db.collection("users").doc(user.uid).get().then(function (snap) {
      var data = snap.exists ? snap.data() : null;
      if (data && data.active === false) {
        return auth.signOut().then(function () { setBusy(false); showErr("This account is disabled. Contact the owner."); });
      }
      var role = (data && data.role) || "supervisor";
      window.GJAuth.user = { uid: user.uid, email: user.email, role: role, name: (data && data.name) || "" };
      window.GJ.enter(role);
      injectLogout();
    }).catch(function () {
      return auth.signOut().then(function () { setBusy(false); showErr("Your account has no role assigned yet. Contact the owner."); });
    });
  }

  /* ---- Log In button handler (LIVE mode) ---- */
  window.GJAuth.attempt = function () {
    var email = (($("#authEmail") || {}).value || "").trim();
    var pass  = (($("#authPass")  || {}).value || "");
    if (!email) { showErr("Enter your email."); return; }
    if (!pass)  { showErr("Enter your password."); return; }
    clearErr();
    setBusy(true, "સાઇન ઇન… · Signing in…");
    auth.signInWithEmailAndPassword(email, pass)
      .then(function (cred) { return enterFor(cred.user); })
      .catch(function (err) {
        setBusy(false);
        var map = {
          "auth/invalid-email": "Invalid email address.",
          "auth/user-disabled": "This account is disabled.",
          "auth/user-not-found": "No account for this email.",
          "auth/wrong-password": "Incorrect password.",
          "auth/invalid-credential": "Incorrect email or password.",
          "auth/network-request-failed": "Network error. Check your connection.",
          "auth/too-many-requests": "Too many attempts. Try again in a few minutes."
        };
        showErr(map[err && err.code] || "Sign-in failed. Please try again.");
      });
  };

  window.GJAuth.logout = function () { auth.signOut().then(function () { location.reload(); }); };

  /* ---- logout control in the app bar (shown once signed in) ---- */
  function injectLogout() {
    if ($("#gjLogout")) return;
    var bar = $(".appbar"); if (!bar) return;
    var who = window.GJAuth.user || {};
    var holder = document.createElement("div");
    holder.style.cssText = "display:flex;align-items:center;gap:10px;margin-left:8px";
    holder.innerHTML =
      '<span id="gjUser" title="' + (who.email || "") + '">' + (who.name || who.email || "") + '</span>' +
      '<button class="btn btn-sm btn-ghost" id="gjLogout" aria-label="Log out">' +
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
      '<span>લોગઆઉટ</span></button>';
    bar.appendChild(holder);
    $("#gjLogout").onclick = window.GJAuth.logout;
  }

  /* ---- init: fields + session restore with a checking state ---- */
  function init() {
    injectFields();
    var resolved = false;
    setBusy(true, "તપાસી રહ્યું… · Checking…");
    auth.onAuthStateChanged(function (user) {
      resolved = true;
      if (user && !window.GJAuth.user) { enterFor(user); }
      else if (!user) { setBusy(false); }
    });
    setTimeout(function () { if (!resolved) setBusy(false); }, 4000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
