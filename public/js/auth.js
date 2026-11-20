/* =====================================================================
   auth.js — Firebase Authentication + role-based routing (hardened)
   ---------------------------------------------------------------------
   Drives the split-screen login (#loginForm). Sign-in is email + password,
   and the ROLE selected in the dropdown must match the account's role in
   Firestore (users/{uid}.role) — that role is authoritative and is also
   enforced server-side by the Firestore security rules.

   Security features:
     • Role + email + password validated together; mismatches rejected.
     • Input validation (email format, password present).
     • Client-side rate limiting / brute-force lockout (escalating).
     • Session management via Firebase persistence (Remember Me).
     • Session restore on refresh; protected app entry.
     • Secure logout (signOut + state cleared + reload).
     • Email + last role pre-filled on the login screen.

   Works LIVE (real Firebase config) or DEMO (placeholder config).
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

  function $(s) { return document.querySelector(s); }

  // Clear the boot splash (bug 1): reveals whatever is underneath — the app (if a
  // session restored) or the login form (if none). Safe to call more than once.
  function endBoot() { try { document.documentElement.classList.remove("gj-booting"); } catch (e) {} }

  /* ---- mandatory sign-in for every NEW browser session (bug 1) ----
     A refresh within the same session keeps the user in; a freshly opened
     browser session must go through the login panel again. sessionStorage is
     per-session and is cleared when the browser session ends, so its absence
     marks a brand-new session. (An auto-refresh on a new build is the same
     session, so it never forces a re-login.) */
  function isFreshSession() { try { return !sessionStorage.getItem("gj_sess_live"); } catch (e) { return false; } }
  function markSessionLive() { try { sessionStorage.setItem("gj_sess_live", "1"); } catch (e) {} }

  /* ---------- language helper for messages ---------- */
  function curLang() { try { var s = localStorage.getItem("gj_lang"); return s === "gu" ? "gu" : "en"; } catch (e) { return "en"; } }
  function tr(en, gu) { return curLang() === "gu" ? gu : en; }

  /* ---------- small UI helpers ---------- */
  function showErr(m)  { var e = $("#authErr"); if (e) { e.textContent = m; e.style.color = ""; e.classList.add("show"); } }
  function showNote(m) { var e = $("#authErr"); if (e) { e.textContent = m; e.style.color = "#1f9d6b"; e.classList.add("show"); } }
  function clearErr()  { var e = $("#authErr"); if (e && !lockTimer) { e.textContent = ""; e.style.color = ""; e.classList.remove("show"); } }

  var defaultBtn = "";
  function setBusy(b, label) {
    var btn = $("#enterBtn"); if (!btn) return;
    btn.disabled = b;
    var span = btn.querySelector("span");
    if (span) { if (!defaultBtn) defaultBtn = span.textContent; span.textContent = b ? (label || "…") : defaultBtn; }
  }

  function mapErr(err) {
    var code = err && err.code;
    var m = {
      "auth/invalid-email": tr("Invalid email address.", "અમાન્ય ઈમેલ સરનામું."),
      "auth/user-disabled": tr("This account is disabled.", "આ ખાતું બંધ છે."),
      "auth/user-not-found": tr("Incorrect email or password.", "ખોટો ઈમેલ અથવા પાસવર્ડ."),
      "auth/wrong-password": tr("Incorrect email or password.", "ખોટો ઈમેલ અથવા પાસવર્ડ."),
      "auth/invalid-credential": tr("Incorrect email or password.", "ખોટો ઈમેલ અથવા પાસવર્ડ."),
      "auth/missing-password": tr("Enter your password.", "તમારો પાસવર્ડ દાખલ કરો."),
      "auth/network-request-failed": tr("Network error. Check your connection.", "નેટવર્ક ભૂલ. કનેક્શન તપાસો."),
      "auth/too-many-requests": tr("Too many attempts. Try again later.", "ઘણા પ્રયાસો. થોડીવાર પછી પ્રયાસ કરો.")
    };
    return m[code] || tr("Sign-in failed. Please try again.", "સાઇન ઇન નિષ્ફળ. ફરી પ્રયાસ કરો.");
  }

  /* ---------- input validation ---------- */
  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
  function roleLabel(r) { return r === "supervisor" ? tr("Supervisor", "સુપરવાઇઝર") : (r === "packaging" ? tr("Packaging", "પેકેજિંગ") : tr("Admin", "એડમિન")); }

  /* ---------- rate limiting / brute-force lockout ---------- */
  var MAX_FREE = 5;     // failed attempts before a lockout starts
  var LOCK_BASE = 30;   // seconds for the first lockout
  var LOCK_CAP  = 900;  // 15-minute ceiling
  var lockTimer = null;

  function failsAll() { try { return JSON.parse(localStorage.getItem("gj_fails") || "{}"); } catch (e) { return {}; } }
  function failsSave(o) { try { localStorage.setItem("gj_fails", JSON.stringify(o)); } catch (e) {} }
  function keyFor(email) { return (email || "").toLowerCase(); }
  function lockRemaining(email) {
    var r = failsAll()[keyFor(email)];
    if (!r || !r.lockUntil) return 0;
    var s = Math.ceil((r.lockUntil - Date.now()) / 1000);
    return s > 0 ? s : 0;
  }
  function recordFail(email) {
    var o = failsAll(), k = keyFor(email), r = o[k] || { n: 0 };
    r.n = (r.n || 0) + 1; r.ts = Date.now();
    if (r.n >= MAX_FREE) {
      var over = r.n - MAX_FREE;
      var secs = Math.min(LOCK_CAP, LOCK_BASE * Math.pow(2, over));
      r.lockUntil = Date.now() + secs * 1000;
    }
    o[k] = r; failsSave(o);
  }
  function clearFails(email) { var o = failsAll(); delete o[keyFor(email)]; failsSave(o); }

  function lockUI(email) {
    if (lockTimer) { clearInterval(lockTimer); lockTimer = null; }
    var btn = $("#enterBtn");
    function tick() {
      var s = lockRemaining(email);
      if (s <= 0) {
        clearInterval(lockTimer); lockTimer = null;
        if (btn) btn.disabled = false;
        var e = $("#authErr"); if (e) { e.textContent = ""; e.classList.remove("show"); }
        return;
      }
      if (btn) btn.disabled = true;
      var e = $("#authErr");
      if (e) { e.style.color = ""; e.classList.add("show"); e.textContent = tr("Too many attempts — try again in " + s + "s.", "ઘણા પ્રયાસો — " + s + " સેકન્ડ પછી ફરી પ્રયાસ કરો."); }
    }
    tick();
    lockTimer = setInterval(tick, 1000);
  }

  /* ---------- remember last role only (email is never pre-filled) ---------- */
  function rememberLast(email, role) {
    try { if (role) localStorage.setItem("gj_last_role", role); } catch (x) {}
  }
  function setDropdown(role) {
    var s = $("#loginRole"); if (!s) return;
    if (role === "admin" || role === "supervisor") s.value = role;
  }
  function restoreLast() {
    try {
      // Email is NEVER pre-filled: purge any previously saved email and keep the field blank.
      localStorage.removeItem("gj_last_email");
      localStorage.removeItem("gj_email");
      try { sessionStorage.removeItem("gj_last_email"); sessionStorage.removeItem("gj_email"); } catch (e) {}
      var f = $("#authEmail"); if (f) f.value = "";
      // role selection is still remembered (UI/functionality unchanged)
      var r = localStorage.getItem("gj_last_role");
      if (r) setDropdown(r);
    } catch (x) {}
  }

  // role chosen in the login dropdown (Admin / Supervisor)
  function selectedRole() { var s = $("#loginRole"); return s && s.value === "supervisor" ? "supervisor" : "admin"; }

  /* ---------- resolve role from Firestore, validate, open the app ----------
     wantRole: the role the user selected (enforced on an explicit sign-in),
     or null on a silent session restore (no selection to check against). */
  function resolveAndEnter(user, wantRole, email) {
    var who = email || user.email;
    return db.collection("users").doc(user.uid).get().then(function (snap) {
      var data = snap.exists ? snap.data() : null;

      if (!data || !data.role) {
        return auth.signOut().then(function () { setBusy(false); showErr(tr("This account has no role assigned. Contact the owner.", "આ ખાતાને કોઈ ભૂમિકા સોંપાઈ નથી. માલિકનો સંપર્ક કરો.")); });
      }
      if (data.active === false) {
        return auth.signOut().then(function () { setBusy(false); showErr(tr("This account is disabled. Contact the owner.", "આ ખાતું બંધ છે. માલિકનો સંપર્ક કરો.")); });
      }

      // The account's own role (from Firestore) is authoritative — the login
      // dropdown is only a hint and grants no access of its own. So we never
      // reject a valid sign-in over a role mismatch; we log the user in with
      // their real role and quietly sync the dropdown to it. (wantRole is kept
      // for signature compatibility but no longer blocks login.)
      var actual = data.role;

      // success
      void wantRole;
      clearFails(who);
      window.GJAuth.user = { uid: user.uid, email: user.email, role: actual, name: (data.name || ""), perms: (data.perms || null) };
      rememberLast(user.email, actual);
      setDropdown(actual);
      markSessionLive();
      window.GJ.enter(actual);
      injectLogout();
    }).catch(function () {
      return auth.signOut().then(function () { setBusy(false); showErr(tr("Could not verify your account. Try again.", "ખાતું ચકાસી શકાયું નહીં. ફરી પ્રયાસ કરો.")); });
    });
  }

  /* ---------- main sign-in ---------- */
  function doLogin() {
    var email = (($("#authEmail") || {}).value || "").trim();
    var pass  = (($("#authPass")  || {}).value || "");
    var remember = $("#rememberMe") ? $("#rememberMe").checked : true;
    var role = selectedRole();
    clearErr();

    // input validation
    if (!email) { showErr(tr("Enter your email.", "તમારો ઈમેલ દાખલ કરો.")); return; }
    if (!validEmail(email)) { showErr(tr("Enter a valid email address.", "માન્ય ઈમેલ દાખલ કરો.")); return; }
    if (LIVE && !pass) { showErr(tr("Enter your password.", "તમારો પાસવર્ડ દાખલ કરો.")); return; }

    // brute-force lockout
    if (lockRemaining(email) > 0) { lockUI(email); return; }

    rememberLast(email, role);   // stores the role only

    if (LIVE) {
      setBusy(true, tr("Signing in…", "સાઇન ઇન…"));
      var persist = remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
      auth.setPersistence(persist)
        .then(function () { return auth.signInWithEmailAndPassword(email, pass); })
        .then(function (cred) { return resolveAndEnter(cred.user, role, email); })
        .catch(function (err) {
          recordFail(email);          // only wrong email/password counts toward lockout
          setBusy(false);
          if (lockRemaining(email) > 0) { lockUI(email); }
          else { showErr(mapErr(err)); }
        });
    } else {
      // DEMO: no backend — the selected role opens that role's dashboard.
      window.GJAuth.user = { email: email, role: role, name: "" };
      markSessionLive();
      window.GJ.enter(role);
      injectLogout();
    }
  }

  /* ---------- forgot password ---------- */
  function doForgot(e) {
    if (e) e.preventDefault();
    var email = (($("#authEmail") || {}).value || "").trim();
    if (!email || !validEmail(email)) { showErr(tr("Type your email above first, then tap Forgot Password.", "પહેલાં ઉપર ઈમેલ લખો, પછી પાસવર્ડ ભૂલી ગયા દબાવો.")); return; }
    if (LIVE) {
      auth.sendPasswordResetEmail(email)
        .then(function () { showNote(tr("Password reset link sent to " + email + ".", "પાસવર્ડ રીસેટ લિંક " + email + " પર મોકલી.")); })
        .catch(function (err) { showErr(mapErr(err)); });
    } else {
      showNote(tr("Password reset will be available once the system is live.", "સિસ્ટમ લાઇવ થયા પછી પાસવર્ડ રીસેટ ઉપલબ્ધ થશે."));
    }
  }

  /* ---------- admin account recovery (Cloud Function) ----------
     Shown only when a recovery endpoint is configured. Lets a locked-out
     Owner set a new email + password by proving a saved recovery code. The
     code is verified server-side; nothing sensitive is exposed here. */
  function recoveryEnabled() { return !!(window.__RECOVERY_URL && /^https:\/\//.test(window.__RECOVERY_URL)); }
  function recMsg(m, ok) { var el = $("#recMsg"); if (el) { el.textContent = m; el.style.color = ok ? "#1f9d6b" : "#b4231f"; } }
  function recErr(code) {
    var m = {
      "wrong-code": tr("Incorrect recovery code.", "ખોટો રિકવરી કોડ."),
      "locked": tr("Too many attempts. Try again in 15 minutes.", "ઘણા પ્રયાસો. 15 મિનિટ પછી પ્રયાસ કરો."),
      "not-configured": tr("Recovery isn't set up yet. Set it up from Profile while signed in.", "રિકવરી સેટઅપ નથી. સાઇન-ઇન હોય ત્યારે પ્રોફાઇલમાંથી સેટ કરો."),
      "email-in-use": tr("That email is already used by another account.", "આ ઈમેલ બીજા ખાતામાં વપરાયેલ છે."),
      "bad-email": tr("Enter a valid email.", "માન્ય ઈમેલ દાખલ કરો."),
      "weak-password": tr("Password must be at least 6 characters.", "પાસવર્ડ ઓછામાં ઓછા 6 અક્ષર.")
    };
    return m[code] || tr("Recovery failed. Please try again.", "રિકવરી નિષ્ફળ. ફરી પ્રયાસ કરો.");
  }
  function openRecovery(e) {
    if (e) e.preventDefault();
    if (!recoveryEnabled()) return;
    var ex = $("#gjRecBack"); if (ex) { ex.style.display = "flex"; return; }
    var inpCss = "width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #d9e0ea;border-radius:10px;font-size:14px;margin-bottom:9px";
    var wrap = document.createElement("div");
    wrap.id = "gjRecBack";
    wrap.style.cssText = "position:fixed;inset:0;background:rgba(16,28,54,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px";
    wrap.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:400px;width:100%;padding:22px;box-shadow:0 24px 60px rgba(16,28,54,.3);font-family:inherit">' +
        '<h3 style="margin:0 0 4px;font-size:18px;color:#16233b">' + tr("Account recovery", "ખાતું રિકવરી") + '</h3>' +
        '<p style="margin:0 0 14px;font-size:13px;color:#64748b;line-height:1.5">' + tr("Enter the recovery code you saved, then set a new email and password for the Owner account.", "તમે સાચવેલો રિકવરી કોડ દાખલ કરો, પછી માલિક ખાતા માટે નવો ઈમેલ અને પાસવર્ડ સેટ કરો.") + '</p>' +
        '<input id="recCode" type="text" autocomplete="off" placeholder="' + tr("Recovery code", "રિકવરી કોડ") + '" style="' + inpCss + ';letter-spacing:1px;text-transform:uppercase">' +
        '<input id="recEmail" type="email" autocomplete="off" placeholder="' + tr("New sign-in email", "નવો સાઇન-ઇન ઈમેલ") + '" style="' + inpCss + '">' +
        '<input id="recPass" type="password" autocomplete="new-password" placeholder="' + tr("New password (min 6)", "નવો પાસવર્ડ (ઓછામાં ઓછા 6)") + '" style="' + inpCss + '">' +
        '<input id="recPass2" type="password" autocomplete="new-password" placeholder="' + tr("Confirm new password", "નવો પાસવર્ડ ફરી") + '" style="' + inpCss + ';margin-bottom:6px">' +
        '<div id="recMsg" style="font-size:12.5px;min-height:18px;margin-bottom:8px"></div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end">' +
          '<button id="recCancel" type="button" style="padding:10px 16px;border:1px solid #d9e0ea;background:#fff;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">' + tr("Cancel", "રદ") + '</button>' +
          '<button id="recGo" type="button" style="padding:10px 18px;border:none;background:#2b5cff;color:#fff;border-radius:10px;font-weight:800;cursor:pointer;font-family:inherit">' + tr("Reset account", "ખાતું રીસેટ કરો") + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    $("#recCancel").onclick = function () { wrap.style.display = "none"; };
    wrap.addEventListener("click", function (ev) { if (ev.target === wrap) wrap.style.display = "none"; });
    $("#recGo").onclick = submitRecovery;
  }
  function submitRecovery() {
    var code = ($("#recCode").value || "").trim();
    var email = ($("#recEmail").value || "").trim();
    var p1 = $("#recPass").value || "", p2 = $("#recPass2").value || "";
    if (!code) { recMsg(tr("Enter your recovery code.", "રિકવરી કોડ દાખલ કરો.")); return; }
    if (!validEmail(email)) { recMsg(tr("Enter a valid email.", "માન્ય ઈમેલ દાખલ કરો.")); return; }
    if (p1.length < 6) { recMsg(tr("Password must be at least 6 characters.", "પાસવર્ડ ઓછામાં ઓછા 6 અક્ષર.")); return; }
    if (p1 !== p2) { recMsg(tr("Passwords do not match.", "પાસવર્ડ મેળ ખાતા નથી.")); return; }
    var btn = $("#recGo"); if (btn) { btn.disabled = true; btn.textContent = tr("Resetting…", "રીસેટ…"); }
    recMsg(tr("Verifying…", "ચકાસી રહ્યું છે…"), true);
    fetch(window.__RECOVERY_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code, newEmail: email, newPassword: p1 }) })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }, function () { return { status: r.status, j: null }; }); })
      .then(function (res) {
        if (btn) { btn.disabled = false; btn.textContent = tr("Reset account", "ખાતું રીસેટ કરો"); }
        if (res.j && res.j.ok) {
          recMsg(tr("Done! Sign in with your new email and password.", "થઈ ગયું! નવા ઈમેલ અને પાસવર્ડથી સાઇન ઇન કરો."), true);
          var emEl = $("#authEmail"); if (emEl) emEl.value = email;
          setTimeout(function () { var w = $("#gjRecBack"); if (w) w.style.display = "none"; }, 2500);
          return;
        }
        recMsg(recErr(res.j && res.j.error));
      })
      .catch(function () { if (btn) { btn.disabled = false; btn.textContent = tr("Reset account", "ખાતું રીસેટ કરો"); } recMsg(tr("Could not reach the recovery service. Check your internet.", "રિકવરી સેવા સુધી પહોંચી શકાયું નહીં. ઇન્ટરનેટ તપાસો.")); });
  }

  /* ---------- secure logout ---------- */
  window.GJAuth.logout = function () {
    try { if (window.GJ && window.GJ.releaseLock) window.GJ.releaseLock(); } catch (e) {}   // free any sheet I was editing
    try { window.GJAuth.user = null; } catch (e) {}
    try { sessionStorage.removeItem("gj_sess_live"); } catch (e) {}   // next open starts clean (bug 1)
    try { location.hash = ""; } catch (e) {}
    if (LIVE && auth) { auth.signOut().then(function () { location.reload(); }).catch(function () { location.reload(); }); }
    else { location.reload(); }
  };

  function escA(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function roleLabel(role) {
    if (role === "admin") return tr("Admin", "એડમિન");
    if (role === "supervisor") return tr("Supervisor", "સુપરવાઇઝર");
    return role ? escA(role) : tr("User", "યુઝર");
  }

  function profileStyle() {
    if ($("#gjAuthStyle")) return;
    var st = document.createElement("style"); st.id = "gjAuthStyle";
    st.textContent =
      ".gj-profile{position:relative;margin-left:8px;flex:0 0 auto}" +
      ".gj-pf-btn{display:inline-flex;align-items:center;justify-content:center;padding:4px;border:1px solid var(--line);background:var(--surface);border-radius:50%;cursor:pointer;font-family:inherit;transition:background .14s ease,border-color .14s ease}" +
      ".gj-pf-btn:hover{background:var(--surface-2);border-color:var(--brand)}" +
      ".gj-pf-av{width:32px;height:32px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;color:#fff;font-weight:800;font-size:12.5px;background:var(--brand);letter-spacing:.3px}" +
      ".gj-pf-meta{display:flex;flex-direction:column;align-items:flex-start;line-height:1.15;max-width:150px}" +
      ".gj-pf-name{font-size:13px;font-weight:800;color:var(--ink);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".gj-pf-role{font-size:11px;font-weight:600;color:var(--muted)}" +
      ".gj-pf-cvt{color:var(--muted);flex:0 0 auto;transition:transform .16s ease}" +
      ".gj-profile.open .gj-pf-cvt{transform:rotate(180deg)}" +
      ".gj-pf-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:244px;max-width:calc(100vw - 24px);background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 44px rgba(28,46,82,.20),0 3px 10px rgba(28,46,82,.10);padding:6px;z-index:120;display:none;animation:gjpf .14s ease}" +
      ".gj-profile.open .gj-pf-menu{display:block}" +
      "@keyframes gjpf{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}" +
      ".gj-pf-card{display:flex;align-items:center;gap:11px;padding:10px 10px 12px}" +
      ".gj-pf-card .gj-pf-av{width:40px;height:40px;font-size:15px}" +
      ".gj-pf-info{min-width:0}" +
      ".gj-pf-fn{font-size:14px;font-weight:800;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:168px}" +
      ".gj-pf-em{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:168px}" +
      ".gj-pf-badge{display:inline-block;margin-top:5px;font-size:10.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:var(--brand);background:color-mix(in srgb,var(--brand) 12%,transparent);border-radius:999px;padding:2px 9px}" +
      ".gj-pf-div{height:1px;background:var(--line);margin:4px 6px}" +
      ".gj-pf-item{display:flex;align-items:center;gap:10px;width:100%;padding:10px 10px;border:none;background:none;border-radius:9px;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:700;color:var(--ink);text-align:left}" +
      ".gj-pf-item:hover{background:var(--surface-2)}" +
      ".gj-pf-item.danger{color:var(--upad)}" +
      ".gj-pf-item svg{width:17px;height:17px;flex:0 0 auto}" +
      "@media (max-width:560px){.gj-pf-meta{display:none}.gj-pf-cvt{display:none}.gj-pf-btn{padding:4px}}";
    document.head.appendChild(st);
  }

  // Build (or rebuild) the appbar profile chip. Clicking it opens the full
  // Profile page (viewProfile in app.js) — there is no dropdown popup anymore.
  function injectLogout() {
    var bar = $(".appbar"); if (!bar) return;
    profileStyle();
    var who = window.GJAuth.user || {};
    var name = who.name || who.email || tr("User", "યુઝર");
    var ini = (who.name || who.email || "?").trim().slice(0, 2).toUpperCase();
    var holder = $("#gjProfile");
    if (!holder) { holder = document.createElement("div"); holder.id = "gjProfile"; holder.className = "gj-profile"; bar.appendChild(holder); }
    holder.classList.remove("open");
    holder.innerHTML =
      '<button type="button" class="gj-pf-btn" id="gjPfBtn" title="' + escA(name) + '" aria-label="' + escA(tr("Open profile", "પ્રોફાઇલ ખોલો")) + '">' +
        '<span class="gj-pf-av">' + escA(ini) + '</span>' +
      '</button>';
    // close any open nav drawer, then route to the profile page
    $("#gjPfBtn").onclick = function () {
      try { if (window.__gjCloseNav) window.__gjCloseNav(); } catch (e) {}
      if (window.GJ && window.GJ.go) window.GJ.go("profile");
    };
  }
  // back-compat no-op: older callers may still ask to "close the profile popup"
  window.__gjClosePf = window.__gjClosePf || function () {};
  // let app.js refresh the chip (e.g. after a language switch) without a reload
  window.GJAuth.renderProfile = function () { if (window.GJAuth.user) injectLogout(); };

  // kept for backward compatibility with app.js boot()
  window.GJAuth.attempt = function () { doLogin(); };

  /* ---------- login-panel language switching (GU / EN) ---------- */
  var LOGIN_I18N = {
    en: {
      title: "Jobwork Management System", tagline: 'Manage <span>·</span> Track <span>·</span> Grow',
      welcome: 'Welcome <span>Back</span>', sub: "Sign in to continue to your account",
      roleAdmin: "Admin — Full access", roleSup: "Supervisor — Gate & Packaging",
      email: "Email Address", password: "Password", remember: "Remember Me", forgot: "Forgot Password?",
      login: "Log In", secure: "Secure Access", recover: "Locked out? Reset with recovery code", foot: 'Shri Giriraj Textile <span>·</span> Jobwork Management System'
    },
    gu: {
      title: "જોબવર્ક મેનેજમેન્ટ સિસ્ટમ", tagline: 'મેનેજ <span>·</span> ટ્રેક <span>·</span> ગ્રો',
      welcome: 'ફરી <span>આવકાર</span>', sub: "તમારા ખાતામાં ચાલુ રાખવા સાઇન ઇન કરો",
      roleAdmin: "એડમિન — સંપૂર્ણ એક્સેસ", roleSup: "સુપરવાઇઝર — ગેટ અને પેકેજિંગ",
      email: "ઈમેલ સરનામું", password: "પાસવર્ડ", remember: "મને યાદ રાખો", forgot: "પાસવર્ડ ભૂલી ગયા?",
      login: "લોગિન", secure: "સુરક્ષિત એક્સેસ", recover: "લોગિન નથી થતું? રિકવરી કોડથી રીસેટ કરો", foot: 'શ્રી ગિરિરાજ ટેક્ષટાઇલ <span>·</span> જોબવર્ક મેનેજમેન્ટ'
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
    if ((el = $("#recoverLink"))) el.textContent = t.recover;
    defaultBtn = t.login; var bs = $("#enterBtn span"); if (bs && !$("#enterBtn").disabled) bs.textContent = t.login;
    if ((el = $(".sa-txt")))  el.textContent = t.secure;
    if ((el = $("#authFoot"))) el.innerHTML = t.foot;
    document.querySelectorAll("#authLang button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-lang") === lang); });
    try { localStorage.setItem("gj_lang", lang); } catch (e) {}
    document.documentElement.lang = lang;
  }

  function init() {
    wireToggle();
    restoreLast();
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
    var rl = $("#recoverLink"); if (rl && recoveryEnabled()) { rl.style.display = "block"; rl.addEventListener("click", openRecovery); }
    $("#authEmail") && $("#authEmail").addEventListener("input", clearErr);
    $("#authPass")  && $("#authPass").addEventListener("input", clearErr);
    // role dropdown → remember the choice; the email field is never auto-populated
    var sel = $("#loginRole");
    if (sel) sel.addEventListener("change", function () {
      clearErr();
      try { localStorage.setItem("gj_last_role", selectedRole()); } catch (e) {}
      // email is never auto-populated from the role selection
    });

    if (LIVE) {
      setBusy(true, tr("Checking…", "તપાસી રહ્યું છે…"));
      var resolved = false;
      auth.onAuthStateChanged(function (user) {
        resolved = true;
        if (user && !window.GJAuth.user && !isFreshSession()) {
          // same session, already signed in this session — restore without re-login.
          // Keep the splash up until the app shell is shown, so no login flash appears.
          resolveAndEnter(user, null, user.email).then(endBoot, endBoot);
        } else if (user && isFreshSession()) {
          // NEW browser session → require an explicit sign-in (mandatory login panel, bug 1).
          setBusy(false); endBoot();
        } else if (!user) { setBusy(false); endBoot(); }   // no session → reveal the login form
        else { endBoot(); }
      });
      setTimeout(function () { if (!resolved) { setBusy(false); endBoot(); } }, 4000);
    } else {
      endBoot();   // DEMO mode has no auth check — show the login immediately
    }
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

  // expose a tiny surface for automated tests
  if (typeof window !== "undefined" && window.__TEST) {
    window.__AUTH_TEST = { doLogin: doLogin, lockRemaining: lockRemaining, validEmail: validEmail, resolveAndEnter: resolveAndEnter, selectedRole: selectedRole };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
