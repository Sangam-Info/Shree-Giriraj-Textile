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

  // role chosen in the login dropdown (Admin / Supervisor)
  function selectedRole() { var s = $("#loginRole"); return s && s.value === "supervisor" ? "supervisor" : "admin"; }

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
      // Sign in; the account's role in Firestore is authoritative (and enforced by
      // the security rules), so the dropdown is the user's declared intent only.
      setBusy(true, "Signing in…");
      var persist = remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
      auth.setPersistence(persist)
        .then(function () { return auth.signInWithEmailAndPassword(email, pass); })
        .then(function (cred) { return enterFor(cred.user); })
        .catch(function (err) { setBusy(false); showErr(mapErr(err)); });
    } else {
      // DEMO: no backend — the selected role opens that role's dashboard.
      var role = selectedRole();
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
  /* ---------- login-panel language switching (GU / EN) ---------- */
  var LOGIN_I18N = {
    en: {
      title: "Jobwork Management System", tagline: 'Manage <span>·</span> Track <span>·</span> Grow',
      welcome: 'Welcome <span>Back</span>', sub: "Sign in to continue to your account",
      roleAdmin: "Admin — Full access", roleSup: "Supervisor — Gate & Packaging",
      email: "Email", password: "Password", remember: "Remember Me", forgot: "Forgot Password?",
      login: "Log In", secure: "Secure Access", foot: 'Shri Giriraj Textile <span>·</span> Jobwork Management System'
    },
    gu: {
      title: "જોબવર્ક મેનેજમેન્ટ સિસ્ટમ", tagline: 'મેનેજ <span>·</span> ટ્રેક <span>·</span> ગ્રો',
      welcome: 'ફરી <span>આવકાર</span>', sub: "તમારા ખાતામાં ચાલુ રાખવા સાઇન ઇન કરો",
      roleAdmin: "એડમિન — સંપૂર્ણ એક્સેસ", roleSup: "સુપરવાઇઝર — ગેટ અને પેકેજિંગ",
      email: "ઈમેલ", password: "પાસવર્ડ", remember: "મને યાદ રાખો", forgot: "પાસવર્ડ ભૂલી ગયા?",
      login: "લોગિન", secure: "સુરક્ષિત એક્સેસ", foot: 'શ્રી ગિરિરાજ ટેક્ષટાઇલ <span>·</span> જોબવર્ક મેનેજમેન્ટ'
    }
  };
  function applyLoginLang(lang) {
    lang = lang === "gu" ? "gu" : "en";
    var t = LOGIN_I18N[lang], el;
    if ((el = $(".auth-title")))   el.innerHTML = t.title;
    if ((el = $(".auth-tagline"))) el.innerHTML = t.tagline;
    if ((el = $(".auth-welcome"))) el.innerHTML = t.welcome;
    if ((el = $(".auth-sub")))     el.textContent = t.sub;
    var ro = $("#loginRole"); if (ro && ro.options.length >= 2) { ro.options[0].text = t.roleAdmin; ro.options[1].text = t.roleSup; }
    if ((el = $("#authEmail"))) el.placeholder = t.email;
    if ((el = $("#authPass")))  el.placeholder = t.password;
    if ((el = $(".rm-txt")))    el.textContent = t.remember;
    if ((el = $("#forgotPw")))  el.textContent = t.forgot;
    defaultBtn = t.login; var bs = $("#enterBtn span"); if (bs && !$("#enterBtn").disabled) bs.textContent = t.login;
    if ((el = $(".sa-txt")))  el.textContent = t.secure;
    if ((el = $("#authFoot"))) el.innerHTML = t.foot;
    document.querySelectorAll("#authLang button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-lang") === lang); });
    try { localStorage.setItem("gj_lang", lang); } catch (e) {}
    document.documentElement.lang = lang;
  }

  function init() {
    wireToggle();
    restoreEmail();
    // language toggle (persists choice; the app opens in the same language)
    var storedLang = "en"; try { var s = localStorage.getItem("gj_lang"); if (s === "gu" || s === "en") storedLang = s; } catch (e) {}
    applyLoginLang(storedLang);
    document.querySelectorAll("#authLang button").forEach(function (b) {
      b.addEventListener("click", function () { applyLoginLang(b.getAttribute("data-lang")); });
    });
    var form = $("#loginForm");
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); doLogin(); });
    var btn = $("#enterBtn"); if (btn) btn.onclick = null;   // the form submit drives login
    var fp = $("#forgotPw"); if (fp) fp.addEventListener("click", doForgot);
    $("#authEmail") && $("#authEmail").addEventListener("input", clearErr);
    $("#authPass")  && $("#authPass").addEventListener("input", clearErr);
    // role dropdown → pre-fill that role's email when configured in __APP_USERS
    var sel = $("#loginRole");
    if (sel) sel.addEventListener("change", function () {
      clearErr();
      var em = USERS[selectedRole()], f = $("#authEmail");
      if (em && f) f.value = em;
    });

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
