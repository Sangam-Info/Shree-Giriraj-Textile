/* =====================================================================
   auth.js — Firebase Authentication + role-based routing (clean login)
   ---------------------------------------------------------------------
   Drives the redesigned split-screen login form (#loginForm). Sign-in is
   email + password. The ROLE is read from Firestore users/{uid}.role and is
   authoritative — it decides the dashboard + navigation. Firestore rules
   enforce the same split server-side.
     • Admin      → full access, including packaging.
     • Supervisor → gate entry, niwar gate entry & packaging only (no accounting).

   Works in two modes:
     LIVE  — firebase-config.js has real values → Firebase Auth + Firestore.
     DEMO  — placeholder config / SDK absent → in-memory preview; the role is
             inferred from the email (contains "sup" ⇒ supervisor, else admin).
   No build step — uses the Firebase compat SDK loaded in index.html.
   ===================================================================== */
(function () {
  "use strict";

  var cfg  = window.__FIREBASE_CONFIG || {};
  var LIVE = typeof firebase !== "undefined" && cfg.apiKey && cfg.apiKey !== "REPLACE_ME";

  window.GJAuth = { enabled: LIVE };
  var auth = null, db = null;
  if (LIVE) {
    firebase.initializeApp(cfg);
    auth = firebase.auth();
    db   = firebase.firestore();
    window.GJAuth.auth = auth;
    window.GJAuth.db   = db;
  }

  var USERS = window.__APP_USERS || {};
  function $(s) { return document.querySelector(s); }

  /* ---------- small UI helpers ---------- */
  function showErr(m)  { var e = $("#authErr"); if (e) { e.textContent = m; e.style.color = ""; e.classList.add("show"); } }
  function showNote(m) { var e = $("#authErr"); if (e) { e.textContent = m; e.style.color = "#1f9d6b"; e.classList.add("show"); } }
  function clearErr()  { var e = $("#authErr"); if (e) { e.textContent = ""; e.style.color = ""; e.classList.remove("show"); } }

  var defaultBtn = "";
  function setBusy(b, label) {
    var btn = $("#enterBtn"); if (!btn) return;
    btn.disabled = b;
    var span = btn.querySelector("span");
    if (span) { if (!defaultBtn) defaultBtn = span.textContent; span.textContent = b ? (label || "…") : defaultBtn; }
  }

  function mapErr(err) {
    var m = {
      "auth/invalid-email": "Invalid email address.",
      "auth/user-disabled": "This account is disabled.",
      "auth/user-not-found": "No account for this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/missing-password": "Enter your password.",
      "auth/network-request-failed": "Network error. Check your connection.",
      "auth/too-many-requests": "Too many attempts. Try again in a few minutes."
    };
    return m[err && err.code] || "Sign-in failed. Please try again.";
  }

  /* ---------- show / hide password ---------- */
  function wireToggle() {
    var t = $("#pwToggle"), inp = $("#authPass");
    if (!t || !inp) return;
    t.addEventListener("click", function () {
      var show = inp.type === "password";
      inp.type = show ? "text" : "password";
      t.setAttribute("aria-pressed", show ? "true" : "false");
      t.setAttribute("aria-label", show ? "Hide password" : "Show password");
      var open = t.querySelector(".eye-open"), off = t.querySelector(".eye-off");
      if (open && off) { open.style.display = show ? "none" : ""; off.style.display = show ? "" : "none"; }
      inp.focus();
    });
  }

  /* ---------- remember-email convenience ---------- */
  function restoreEmail() {
    try {
      var e = localStorage.getItem("gj_email");
      if (e && $("#authEmail") && !$("#authEmail").value) $("#authEmail").value = e;
      if (!e && USERS.admin && $("#authEmail") && !$("#authEmail").value) $("#authEmail").value = USERS.admin;
    } catch (x) {}
  }
  function rememberEmail(email, on) {
    try { if (on) localStorage.setItem("gj_email", email); else localStorage.removeItem("gj_email"); } catch (x) {}
  }

  /* ---------- resolve role from Firestore, open the app ---------- */
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

  function roleFromEmail(email) { return /sup/i.test(email) ? "supervisor" : "admin"; }

  /* ---------- main sign-in ---------- */
  function doLogin() {
    var email = (($("#authEmail") || {}).value || "").trim();
    var pass  = (($("#authPass")  || {}).value || "");
    var remember = $("#rememberMe") ? $("#rememberMe").checked : true;
    if (!email) { showErr("Enter your email."); return; }
    if (LIVE && !pass) { showErr("Enter your password."); return; }
    clearErr();
    rememberEmail(email, remember);

    if (LIVE) {
      setBusy(true, "Signing in…");
      var persist = remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
      auth.setPersistence(persist)
        .then(function () { return auth.signInWithEmailAndPassword(email, pass); })
        .then(function (cred) { return enterFor(cred.user); })
        .catch(function (err) { setBusy(false); showErr(mapErr(err)); });
    } else {
      // DEMO: no backend — infer role from the email so the preview is usable.
      var role = roleFromEmail(email);
      window.GJAuth.user = { email: email, role: role, name: "" };
      window.GJ.enter(role);
      injectLogout();
    }
  }

  /* ---------- forgot password ---------- */
  function doForgot(e) {
    if (e) e.preventDefault();
    var email = (($("#authEmail") || {}).value || "").trim();
    if (!email) { showErr("Type your email above first, then tap Forgot Password."); return; }
    if (LIVE) {
      auth.sendPasswordResetEmail(email)
        .then(function () { showNote("Password reset link sent to " + email + "."); })
        .catch(function (err) { showErr(mapErr(err)); });
    } else {
      showNote("Password reset will be available once the system is live.");
    }
  }

  /* ---------- logout control in the app bar ---------- */
  window.GJAuth.logout = function () {
    if (LIVE && auth) { auth.signOut().then(function () { location.reload(); }); }
    else { location.reload(); }
  };
  function injectLogout() {
    if ($("#gjLogout")) return;
    var bar = $(".appbar"); if (!bar) return;
    var who = window.GJAuth.user || {};
    if (!$("#gjAuthStyle")) {
      var st = document.createElement("style"); st.id = "gjAuthStyle";
      st.textContent =
        "#gjLogout{display:inline-flex;align-items:center;gap:7px}" +
        "#gjUser{font-size:11.5px;color:var(--muted);font-weight:600;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}";
      document.head.appendChild(st);
    }
    var holder = document.createElement("div");
    holder.style.cssText = "display:flex;align-items:center;gap:10px;margin-left:8px";
    holder.innerHTML =
      '<span id="gjUser" title="' + (who.email || "") + '">' + (who.name || who.email || "") + '</span>' +
      '<button class="btn btn-sm btn-ghost" id="gjLogout" aria-label="Log out">' +
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
      '<span>Log out</span></button>';
    bar.appendChild(holder);
    $("#gjLogout").onclick = window.GJAuth.logout;
  }

  // kept for backward compatibility with app.js boot()
  window.GJAuth.attempt = function () { doLogin(); };

  /* ---------- init ---------- */
  function init() {
    wireToggle();
    restoreEmail();
    var form = $("#loginForm");
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); doLogin(); });
    var btn = $("#enterBtn"); if (btn) btn.onclick = null;   // the form submit drives login
    var fp = $("#forgotPw"); if (fp) fp.addEventListener("click", doForgot);
    $("#authEmail") && $("#authEmail").addEventListener("input", clearErr);
    $("#authPass")  && $("#authPass").addEventListener("input", clearErr);

    if (LIVE) {
      setBusy(true, "Checking…");
      var resolved = false;
      auth.onAuthStateChanged(function (user) {
        resolved = true;
        if (user && !window.GJAuth.user) { enterFor(user); }
        else if (!user) { setBusy(false); }
      });
      setTimeout(function () { if (!resolved) setBusy(false); }, 4000);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
