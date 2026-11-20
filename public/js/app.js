/* =====================================================================
   Shree Girijaj Textile Services — Jobwork Management System
   Prototype / Demo.  Vanilla JS, no framework, no backend.

   FLOW (single source of truth = the gate's Job Work Sheet)
   - Step 1 · GATE (Supervisor): fills a JOB WORK SHEET per tempo —
       header (Job Worker, Date, Quality), a grid of up to 8 "step"
       columns × up to 45 metre rows (auto Total per step, manual KG per
       step), and Parat ni Yadi (Kokdi + Color sent to the job worker).
   - Each saved sheet becomes ONE entry in that worker's JOBWORK LEDGER:
       roll = filled entries, mtr = total metre, kapad = total KG,
       kokdi/color = Parat totals.  (No Upad on the sheet — advances are
       handled entirely in the LOANS section.)
   - BILLING (Admin): month gross = total metre × rate, + transport,
       − owner-decided loan deduction, with opening balance (carry-forward)
       and amount paid → carry-forward to next month.
   - LOANS (Admin): give / top-up / repay, running balance, monthly report.
   - YEAR-END (Diwali): loan remaining + ghati reconciliation (3% vs actual
       average) + carry-forward → net settlement.

   Precision: money in paise, weight in grams, all BigInt — exact totals.
   Data is in memory (resets on reload); the full version saves centrally.
   ===================================================================== */
(function () {
  "use strict";

  var CO = {
    name: "Shri Giriraj Textile Services",
    nameGuj: "શ્રી ગિરિરાજ ટેક્ષટાઇલ",
    tag: "Jobwork & Cloth Processing",
    place: "Bhavnagar, Gujarat",
    phone: "+91 88661 51512"
  };
  var VENDOR = "Shri Giriraj Textile";
  var MAX_ROWS = 45, MAX_STEPS = 15;

  /* ---------------------------------------------------------------- BIGINT */
  function rupToP(r) { return BigInt(Math.round(Number(r) * 100)); }
  function kgToG(k) { return BigInt(Math.round(Number(k) * 1000)); }
  function B(n) { return BigInt(Math.round(Number(n))); }
  function groupIN(s) { s = String(s); var neg = s[0] === "-"; if (neg) s = s.slice(1); if (s.length <= 3) return (neg ? "-" : "") + s; var l3 = s.slice(-3), rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ","); return (neg ? "-" : "") + rest + "," + l3; }
  function scaleStr(valBig, baseBig, dec) { var neg = valBig < 0n; if (neg) valBig = -valBig; var whole = valBig / baseBig, rem = valBig % baseBig, p = 10n ** BigInt(dec), frac = (rem * p + baseBig / 2n) / baseBig; if (frac >= p) { whole += 1n; frac -= p; } var s = groupIN(whole.toString()); if (dec > 0) { var f = frac.toString(); while (f.length < dec) f = "0" + f; s += "." + f; } return (neg ? "-" : "") + s; }
  function moneyP(p) { var neg = p < 0n; if (neg) p = -p; var r = p / 100n, c = p % 100n; var s = "₹" + groupIN(r.toString()); if (c !== 0n) s += "." + (c < 10n ? "0" : "") + c.toString(); return (neg ? "-" : "") + s; }
  function moneyPw(p) { var neg = p < 0n; if (neg) p = -p; return (neg ? "-" : "") + "₹" + groupIN(((p + 50n) / 100n).toString()); }
  function rateStr(rp) { return moneyP(rp); }
  function kgStr(g, dec) { return scaleStr(g, 1000n, dec == null ? 1 : dec); }
  function numI(n) { return groupIN(Math.round(Number(n)).toString()); }

  /* ---------------------------------------------------------------- ICONS */
  var I = {
    dash:'<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>',
    ledger:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    bill:'<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    help:'<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    sheet:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    send:'<path d="M3 3h5l2 4 11 2v6l-11 2-2 4H3z"/><path d="M14 9v6"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/>',
    plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
    check:'<path d="M20 6 9 17l-5-5"/>', chevR:'<path d="M9 18l6-6-6-6"/>', chevL:'<path d="M15 18l-6-6 6-6"/>',
    spark:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
    info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    box:'<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    rupee:'<path d="M6 3h12M6 8h12M9.5 13H6l7 8M6 13h6c3.5 0 4-10-1-10"/>',
    scale:'<path d="M12 3v18M7 7l-4 7h8zM17 7l-4 7h8z"/><path d="M7 7l5-2 5 2"/><path d="M3 21h18"/>',
    roll:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 4v16"/>',
    ruler:'<path d="M3 15 15 3l6 6L9 21zM7 11l2 2M10 8l2 2M13 5l2 2"/>',
    trash:'<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
    wallet:'<path d="M20 12V8H6a2 2 0 0 1-2-2 2 2 0 0 1 2-2h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    week:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4M8 15h3"/>',
    back:'<path d="M19 12H5M12 19l-7-7 7-7"/>', dl:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    wa:'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    key:'<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2M16 7l3 3M14 9l3 3"/>',
    database:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>',
    upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
    save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'
  };
  function svg(n, c) { return '<svg class="' + (c || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (I[n] || "") + '</svg>'; }

  /* ---------------------------------------------------------------- UTIL */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function L(gu, en) { return STATE.lang === "en" ? en : gu; }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var RID = 0; function rid() { return "s" + Date.now().toString(36) + "_" + (++RID).toString(36); }
  function numOrNull(v) { if (v === "" || v == null) return null; var n = parseFloat(v); return isNaN(n) ? null : n; }

  /* ---- input validation helpers (bug 3) ----------------------------
     Weight / money fields accept only a non-negative decimal. cleanDecimal
     keeps digits and a single dot (live-sanitising the field as typed); it
     also caps very large junk entries so one stray keystroke can't poison a
     total. kgOrNull returns a clamped number (>= 0) or null when empty. */
  function cleanDecimal(str, maxInt, maxDec) {
    str = String(str == null ? "" : str).replace(/[^\d.]/g, "");       // digits + dots only
    var i = str.indexOf(".");
    if (i !== -1) str = str.slice(0, i + 1) + str.slice(i + 1).replace(/\./g, "");  // one dot only
    var parts = str.split(".");
    if (parts[0].length > (maxInt || 6)) parts[0] = parts[0].slice(0, maxInt || 6);
    if (parts.length > 1) parts[1] = parts[1].slice(0, maxDec == null ? 3 : maxDec);
    return parts.length > 1 ? parts[0] + "." + parts[1] : parts[0];
  }
  function kgOrNull(v) { var n = numOrNull(v); if (n == null) return null; if (n < 0) n = 0; return n; }
  // Sanitise a decimal field in place and return the clamped value (or null).
  // maxVal (optional) hard-caps the numeric value (e.g. 1,00,000 per kg/mtr — bug 8).
  function sanitizeDecimalField(el, maxInt, maxDec, maxVal, onMax) {
    var c = cleanDecimal(el.value, maxInt, maxDec);
    var n = kgOrNull(c);
    if (maxVal != null && n != null && n > maxVal) { n = maxVal; c = String(maxVal); if (onMax) { try { onMax(maxVal); } catch (e) {} } }
    if (c !== el.value) el.value = c;
    return n;
  }
  // KG fields: generous ceiling so real weights (incl. > 99,999) compute correctly;
  // only a truly out-of-range value is clamped, and then with a visible message. (bug 20)
  var KG_MAX = 9999999;                 // 99,99,999 kg — effectively unlimited for real use
  function kgMaxMsg() { toast(L("વધુમાં વધુ 99,99,999 KG", "Maximum 99,99,999 KG"), "info"); }
  // Worker form validation (bugs 18 & 19)
  var WRATE_MAX = 10000;                 // ₹/metre sane ceiling
  function cleanPhoneField(el) {
    var v = (el.value || "").replace(/[^\d+\s-]/g, "");   // drop letters & invalid specials
    v = v.replace(/(?!^)\+/g, "");                          // keep only a single leading +
    if (v.length > 16) v = v.slice(0, 16);
    if (v !== el.value) el.value = v;
  }
  function normIndMobile(phone) { var d = (phone || "").replace(/\D/g, ""); if (d.length === 12 && d.slice(0, 2) === "91") d = d.slice(2); else if (d.length === 11 && d.charAt(0) === "0") d = d.slice(1); return d; }
  function validIndMobile(phone) { return /^[6-9]\d{9}$/.test(normIndMobile(phone)); }
  // Field-specific money caps (bug 21) — each matched to its real business purpose,
  // NOT one common limit. ₹/metre & ₹/kg rates are small; charges/advances larger;
  // loans up to ₹1 crore; percentages ≤ 100.
  var CAP = { pkRate: 10000, pkCharge: 1000000, pkTax: 1000000, loan: 10000000, upad: 1000000, tempo: 100000, paid: 10000000, ghatiRate: 10000, ghatiPct: 100 };
  function inrN(n) { try { return Number(n).toLocaleString("en-IN"); } catch (e) { return String(n); } }
  function capMsg(mx) { toast(L("મહત્તમ ₹" + inrN(mx), "Maximum ₹" + inrN(mx)), "info"); }
  function clampNum(v, mx, onMax) { var n = Math.max(0, parseFloat(v) || 0); if (n > mx) { n = mx; if (onMax) onMax(mx); } return n; }

  /* ---------------------------------------------------------------- DATA */
  var MONTHS = [
    { id: "2026-08", g: "ઓગસ્ટ 2026", e: "August 2026", mm: 8, yy: 26 },
    { id: "2026-09", g: "સપ્ટેમ્બર 2026", e: "September 2026", mm: 9, yy: 26 },
    { id: "2026-10", g: "ઓક્ટોબર 2026", e: "October 2026", mm: 10, yy: 26 }
  ];
  var AV = ["#30397e", "#bd7c16", "#2f74c0", "#1f9d6b", "#8a4fb0", "#c75a3a", "#3a7d7b", "#b03a63"];
  var WORKERS = [];                                  // starts empty — the admin adds real job workers
  WORKERS.forEach(function (w, i) { w.color = AV[i % AV.length]; w.idx = i; });
  // Demo/sample data is OFF for production — the system starts completely empty.
  // (Flip to true only for local prototype previews; never ships enabled.)
  var SEED_DEMO = false;
  var GHATI_RATE = { v: 120 };
  function worker() { var w = WORKERS.filter(function (x) { return x.id === STATE.worker; })[0]; if (!w && WORKERS[0]) { STATE.worker = WORKERS[0].id; w = WORKERS[0]; } return w; }
  // Empty-state card shown when a list has no data yet (e.g. no job workers added).
  function emptyState(ic, title, sub, btnLabel, btnAttr) {
    return '<div class="empty-state"><div class="empty-ic">' + svg(ic || "inbox") + '</div><div class="empty-title">' + title + '</div>' +
      (sub ? '<div class="empty-sub">' + sub + '</div>' : '') +
      (btnLabel ? '<button class="btn btn-primary" ' + (btnAttr || "") + '>' + svg("plus") + ' ' + btnLabel + '</button>' : '') + '</div>';
  }
  // Guard views that need at least one job worker / niwar party.
  function noWorkersView(g, e) {
    return '<div class="page-head"><h2>' + L(g, e) + '</h2></div>' +
      emptyState("users", L("હજી કોઈ જોબ વર્કર નથી", "No job workers yet"), L("પહેલા જોબ વર્કર ઉમેરો — પછી આ વિભાગ ભરાશે.", "Add a job worker first — this section fills in from there."), L("જોબ વર્કર ઉમેરો", "Add Job Worker"), 'data-addworker="1"');
  }
  function noPartiesView(g, e) {
    return '<div class="page-head"><h2>' + L(g, e) + '</h2></div>' +
      emptyState("roll", L("હજી કોઈ નિવાર પાર્ટી નથી", "No niwar parties yet"), L("પહેલા નિવાર પાર્ટી ઉમેરો — પછી નિવાર ગેટ એન્ટ્રી કરો.", "Add a niwar party first — then record niwar gate entries."), L("નિવાર પાર્ટી ઉમેરો", "Add Niwar Party"), 'data-addnparty="1"');
  }
  function workerById(id) { return WORKERS.filter(function (w) { return w.id === id; })[0]; }
  // Language-aware display name for a worker / niwar party (both versions are stored).
  function wNm(w) { return w ? (STATE.lang === "en" ? (w.en || w.name) : (w.name || w.en)) : ""; }
  function monthObj() { return MONTHS.filter(function (m) { return m.id === STATE.month; })[0]; }
  function monthName() { var m = monthObj(); return L(m.g, m.e); }

  function blankSheet(wid, date) {
    var meters = [], kg = [];
    for (var s = 0; s < MAX_STEPS; s++) { meters.push(new Array(MAX_ROWS).fill(null)); kg.push(null); }
    return { id: rid(), workerId: wid, date: date, quality: workerById(wid) ? workerById(wid).cloth : "", nSteps: 1, meters: meters, kg: kg, parat: [{ kokdi: null, color: null }] };
  }

  /* SHEETS = the single source of truth (one per gate event) */
  var SHEETS = [];
  (function seedSheets() { if (!SEED_DEMO) return;
    WORKERS.forEach(function (w) {
      MONTHS.forEach(function (m, mi) {
        var rnd = mulberry32(w.idx * 131 + mi * 17 + 7);
        var cnt = 2 + Math.floor(rnd() * 2);
        var days = [6, 14, 22, 28];
        for (var k = 0; k < cnt; k++) {
          var nSteps = 2 + Math.floor(rnd() * 2);
          var sh = blankSheet(w.id, m.id + "-" + pad(days[k] || (5 + k * 7)));
          sh.nSteps = nSteps;
          for (var s = 0; s < nSteps; s++) {
            var rows = 7 + Math.floor(rnd() * 6);
            for (var r = 0; r < rows; r++) sh.meters[s][r] = 20 + Math.floor(rnd() * 79); /* 2-digit metres */
            sh.kg[s] = Math.round(rows * (8 + rnd() * 3) * 10) / 10;
          }
          sh.parat = [{ kokdi: Math.round((40 + rnd() * 25) * 10) / 10, color: Math.round((240 + rnd() * 70) * 10) / 10 }];
          SHEETS.push(sh);
        }
      });
    });
  })();
  function sheetById(id) { return SHEETS.filter(function (s) { return s.id === id; })[0]; }

  /* sheet aggregates */
  function stepTotalMt(sh, s) { var t = 0; for (var r = 0; r < MAX_ROWS; r++) if (sh.meters[s][r] != null) t += sh.meters[s][r]; return t; }
  function sheetMt(sh) { var t = 0; for (var s = 0; s < sh.nSteps; s++) t += stepTotalMt(sh, s); return t; }
  function sheetRolls(sh) { var c = 0; for (var s = 0; s < sh.nSteps; s++) for (var r = 0; r < MAX_ROWS; r++) if (sh.meters[s][r] != null) c++; return c; }
  function sheetKgG(sh) { var g = 0; for (var s = 0; s < sh.nSteps; s++) if (sh.kg[s] != null) g += Math.round(sh.kg[s] * 1000); return g; }
  function sheetKokdiG(sh) { var g = 0; sh.parat.forEach(function (p) { if (p.kokdi != null) g += Math.round(p.kokdi * 1000); }); return g; }
  function sheetColorG(sh) { var g = 0; sh.parat.forEach(function (p) { if (p.color != null) g += Math.round(p.color * 1000); }); return g; }

  /* ledger derived from sheets */
  function sheetsFor(wid, mid) { return SHEETS.filter(function (s) { return s.workerId === wid && s.date.slice(0, 7) === mid; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }); }
  function ledgerRows(wid, mid) {
    return sheetsFor(wid, mid).map(function (sh) {
      return { id: sh.id, date: sh.date, roll: sheetRolls(sh), mtr: sheetMt(sh), kapadG: sheetKgG(sh), kokdiG: sheetKokdiG(sh), colorG: sheetColorG(sh) };
    });
  }

  /* per worker-month owner billing params */
  var BILL = {};
  WORKERS.forEach(function (w) { BILL[w.id] = {}; MONTHS.forEach(function (m) { BILL[w.id][m.id] = { rate: w.rate, ghati: 3, tempo: 0, loanDeductP: null, paidP: null, openingSeed: 0n, openingWseedG: 0n }; }); });

  function billMonth(wid, mid) {
    var rows = ledgerRows(wid, mid);
    var mtr = 0, kapadG = 0, kokdiG = 0, colorG = 0, roll = 0;
    rows.forEach(function (r) { mtr += r.mtr; kapadG += r.kapadG; kokdiG += r.kokdiG; colorG += r.colorG; roll += r.roll; });
    var b = BILL[wid][mid];
    var ratePaise = rupToP(b.rate);
    var grossP = B(mtr) * ratePaise;
    var ghatiG = B(kapadG) * B(b.ghati) / 100n;
    var tempoP = rupToP(b.tempo);
    return { rows: rows, n: rows.length, mtr: mtr, roll: roll, kapadG: B(kapadG), kokdiG: B(kokdiG), colorG: B(colorG), sentG: B(kokdiG + colorG),
      ratePaise: ratePaise, grossP: grossP, ghatiG: ghatiG, clothG: B(kapadG) + ghatiG, tempoP: tempoP, EP: grossP + tempoP };
  }

  /* loans */
  var LOANS = {};
  (function seedLoans() { if (!SEED_DEMO) return;
    WORKERS.forEach(function (w) { LOANS[w.id] = []; });
    LOANS.w0 = [{ id: rid(), d: "2026-07-20", type: "loan", amt: 50000, note: "મશીન રિપેર / Machine repair" }, { id: rid(), d: "2026-08-05", type: "topup", amt: 10000, note: "એડવાન્સ / Advance" }, { id: rid(), d: "2026-08-31", type: "repay", amt: 3000, note: "ઓગસ્ટ બિલ સામે / Against Aug bill" }];
    LOANS.w1 = [{ id: rid(), d: "2026-08-10", type: "loan", amt: 25000, note: "કાચો માલ / Raw material" }, { id: rid(), d: "2026-09-30", type: "repay", amt: 8000, note: "સપ્ટે. બિલ સામે / Against Sep bill" }];
    LOANS.w4 = [{ id: rid(), d: "2026-09-02", type: "loan", amt: 40000, note: "નવું મશીન / New machine" }];
  })();
  function loanBalanceP(wid) { var b = 0n; (LOANS[wid] || []).forEach(function (t) { var a = rupToP(t.amt); b += (t.type === "repay") ? -a : a; }); return b; }
  function loanOpeningBalanceP(wid, mid) { var b = 0n; (LOANS[wid] || []).forEach(function (t) { var a = rupToP(t.amt); if (t.type === "repay") { if (t.d < mid + "-01") b -= a; } else { if (t.d.slice(0, 7) <= mid) b += a; } }); return b; }
  function monthRepaySeedP(wid, mid) { var s = 0n; (LOANS[wid] || []).forEach(function (t) { if (t.type === "repay" && t.d.indexOf(mid) === 0) s += rupToP(t.amt); }); return s; }
  function recoveredThisYear(wid) { var s = 0n; (LOANS[wid] || []).forEach(function (t) { if (t.type === "repay") s += rupToP(t.amt); }); return s; }

  /* -------------------------------------------------------------- UPAD (weekly advances)
     Separate from Loans. Admin enters the weekly advance a worker takes (e.g. every
     Saturday). Each entry belongs to the MONTH of its date. At month-end billing the
     month's upad total is fetched automatically and deducted from that worker's bill.
     Upad never carries across months on its own — only the resulting bill balance does. */
  var UPAD = {};
  (function seedUpad() { if (!SEED_DEMO) return;
    WORKERS.forEach(function (w) { UPAD[w.id] = []; });
    /* weekly Saturday advances (same pattern as the client's niwar sheet: 15/8, 22/8) */
    UPAD.w0 = [
      { id: rid(), d: "2026-08-15", amt: 2000, note: "અઠવાડિક ઉપડ / Weekly advance" },
      { id: rid(), d: "2026-08-22", amt: 2500, note: "અઠવાડિક ઉપડ / Weekly advance" }
    ];
    UPAD.w1 = [{ id: rid(), d: "2026-08-16", amt: 2000, note: "અઠવાડિક ઉપડ / Weekly advance" }];
  })();
  function upadEntries(wid, mid) { return (UPAD[wid] || []).filter(function (t) { return t.d.slice(0, 7) === mid; }).sort(function (a, b) { return a.d < b.d ? -1 : 1; }); }
  function upadMP(wid, mid) { var s = 0n; upadEntries(wid, mid).forEach(function (t) { s += rupToP(t.amt); }); return s; }

  /* ============================================================================
     NIWAR JOBWORK  —  a separate, kg-based jobwork ledger, entered GATE-STYLE
     (one sheet per delivery, like the textile gate sheet) but for niwar.

     Each niwar sheet (one delivery) holds:
       • one or more PRODUCTS — a niwar size (0.5"–12") with several weight lots
       • YARN lots (the yarn the client gives OUT to the party)
       • PARAT (sent) — one weight, entered by hand (recorded only, not in money math)
     Sheets accumulate into the monthly niwar ledger per party → the bill.

     Bill (all exact BigInt paise):
       jobwork = Σ over sizes ( size's total kg × that size's rate )   (per-size rates)
       − upad (this month, from the niwar upad section)
       − ghat = round(TOTAL niwar received kg × ghat%) × yarn price (₹/kg)
       − TDS  (admin enters the amount; 1% of jobwork shown as a suggestion)
       − loan deduction (owner-decided)
       + opening money balance (carry-forward)  = payable − paid = carry forward
     Yarn balance = (opening yarn + Σ yarn out) − Σ niwar received  → next month opening.
     ============================================================================ */
  var NIWAR_SIZES = ["0.5", "0.75", "1", "1.25", "1.5", "2", "2.5", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]; /* inches */
  var NWORKERS = [];                                 // starts empty — the admin adds real niwar parties
  function nwById(id) { return NWORKERS.filter(function (p) { return p.id === id; })[0]; }
  function niwarParty() { return nwById(STATE.niwarParty) || NWORKERS[0]; }
  function kgToG(kg) { return BigInt(Math.round(Number(kg) * 1000)); }
  var NSEQ = { v: 4 };
  function nextNiwarNo() { return ++NSEQ.v; }

  /* gate-style niwar sheets (one per delivery) */
  var NSHEETS = [];
  var NL_ROWS = 5; /* max weight lots per size (one grid column) */
  function blankNSheet(partyId, date) {
    return { id: rid(), partyId: partyId, date: date, products: [{ size: "1", lots: [] }], paratG: 0n };
  }
  function nSheetById(id) { return NSHEETS.filter(function (s) { return s.id === id; })[0]; }

  /* per party-month bill params (rates, carry seed) */
  var NPARAM = {};
  function nParam(pid, mid) {
    NPARAM[pid] = NPARAM[pid] || {};
    if (!NPARAM[pid][mid]) NPARAM[pid][mid] = { sizeRates: {}, yarnPrice: 65, ghatPct: 2, tdsP: null, loanDeductP: null, paidP: null, openingMatSeedG: 0n };
    return NPARAM[pid][mid];
  }
  function nSizeRate(pid, mid, size) { var pr = nParam(pid, mid); return pr.sizeRates[size] != null ? pr.sizeRates[size] : 14.50; }

  (function seedNiwar() { if (!SEED_DEMO) return;
    /* n0 Guru Govind, August — 0.75" niwar in whole-kg lots (678+885+500+439 = 2502),
       Parat (sent) 2216 → closing 286 kg. Bill still reconciles: 2502×14.50 − 17000 − 3250 − 300 = ₹15,729 */
    var a = blankNSheet("n0", "2026-08-22");
    a.products = [{ size: "0.75", lots: [kgToG(678), kgToG(885), kgToG(500), kgToG(439)] }];
    a.paratG = kgToG(2216); NSHEETS.push(a);
    var pa = nParam("n0", "2026-08"); pa.sizeRates = { "0.75": 14.50 }; pa.yarnPrice = 65; pa.ghatPct = 2; pa.tdsP = rupToP(300);

    /* n3 Rameshbhai, October — multiple sizes in one sheet: 1" (216+202+200=618), 0.5" (150+140=290),
       total niwar 908, Parat (sent) 500 → closing 408 kg */
    var b = blankNSheet("n3", "2026-10-24");
    b.products = [
      { size: "1", lots: [kgToG(216), kgToG(202), kgToG(200)] },
      { size: "0.5", lots: [kgToG(150), kgToG(140)] }
    ];
    b.paratG = kgToG(500); NSHEETS.push(b);
    var pb = nParam("n3", "2026-10"); pb.sizeRates = { "1": 14.50, "0.5": 16 }; pb.yarnPrice = 65; pb.ghatPct = 2;
  })();
  function niwarMonthIdx(mid) { return MONTHS.map(function (m) { return m.id; }).indexOf(mid); }
  function nMonthSheets(pid, mid) { return NSHEETS.filter(function (s) { return s.partyId === pid && s.date.slice(0, 7) === mid; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }); }

  /* physical aggregates (grams) */
  function nProductG(prod) { var g = 0n; (prod.lots || []).forEach(function (x) { g += x || 0n; }); return g; }
  function nSheetNiwarG(s) { var g = 0n; (s.products || []).forEach(function (p) { g += nProductG(p); }); return g; }
  function nSizeTotalsG(pid, mid) { var m = {}; nMonthSheets(pid, mid).forEach(function (s) { (s.products || []).forEach(function (p) { m[p.size] = (m[p.size] || 0n) + nProductG(p); }); }); return m; }
  function nRecvG(pid, mid) { var m = nSizeTotalsG(pid, mid), g = 0n; for (var k in m) if (m.hasOwnProperty(k)) g += m[k]; return g; }
  function nParatG(pid, mid) { var g = 0n; nMonthSheets(pid, mid).forEach(function (s) { g += s.paratG || 0n; }); return g; }
  /* opening material balance for a month = previous month's closing, else the month-param seed */
  function nOpeningMatG(pid, mid) {
    var mi = niwarMonthIdx(mid);
    if (mi > 0) return niwarSettle(pid, mi - 1).matClose;
    return nParam(pid, mid).openingMatSeedG || 0n;
  }

  /* niwar upad — separate store, same mechanics as textile upad */
  var NUPAD = {};
  (function seedNUpad() { if (!SEED_DEMO) return;
    NWORKERS.forEach(function (p) { NUPAD[p.id] = []; });
    /* the client's August upad on the niwar sheet: 7000 (15/8) + 10000 (22/8) = 17000 */
    NUPAD.n0 = [
      { id: rid(), d: "2026-08-15", amt: 7000, note: "અઠવાડિક ઉપડ / Weekly advance" },
      { id: rid(), d: "2026-08-22", amt: 10000, note: "અઠવાડિક ઉપડ / Weekly advance" }
    ];
    NUPAD.n1 = [{ id: rid(), d: "2026-08-12", amt: 4000, note: "અઠવાડિક ઉપડ / Weekly advance" }];
  })();
  function nUpadEntries(pid, mid) { return (NUPAD[pid] || []).filter(function (t) { return t.d.slice(0, 7) === mid; }).sort(function (a, b) { return a.d < b.d ? -1 : 1; }); }
  function nUpadMP(pid, mid) { var s = 0n; nUpadEntries(pid, mid).forEach(function (t) { s += rupToP(t.amt); }); return s; }

  /* niwar loans — separate store */
  var NLOANS = {};
  (function seedNLoans() { if (!SEED_DEMO) return;
    NWORKERS.forEach(function (p) { NLOANS[p.id] = []; });
    /* ₹95,000 outstanding, nothing recovered this month (as on the client's sheet) */
    NLOANS.n0 = [{ id: rid(), d: "2026-07-18", type: "loan", amt: 95000, note: "લોન / Loan" }];
    NLOANS.n1 = [{ id: rid(), d: "2026-08-02", type: "loan", amt: 20000, note: "લોન / Loan" }];
  })();
  function nLoanBalanceP(pid) { var b = 0n; (NLOANS[pid] || []).forEach(function (t) { var a = rupToP(t.amt); b += (t.type === "repay") ? -a : a; }); return b; }
  function nLoanOpeningP(pid, mid) { var b = 0n; (NLOANS[pid] || []).forEach(function (t) { var a = rupToP(t.amt); if (t.type === "repay") { if (t.d < mid + "-01") b -= a; } else { if (t.d.slice(0, 7) <= mid) b += a; } }); return b; }
  function nMonthRepaySeedP(pid, mid) { var s = 0n; (NLOANS[pid] || []).forEach(function (t) { if (t.type === "repay" && t.d.indexOf(mid) === 0) s += rupToP(t.amt); }); return s; }
  function nLoanDeductMP(pr, pid, mid) { return (pr && pr.loanDeductP != null) ? pr.loanDeductP : nMonthRepaySeedP(pid, mid); }
  /* niwar monthly settlement — per-size jobwork, material WEIGHT carry-forward (no money carry).
     Material balance: closing = opening + total niwar − parat (sent)  → next month's opening. */
  function niwarSettle(pid, mi) {
    var mid = MONTHS[mi].id, pr = nParam(pid, mid);
    var sizeTot = nSizeTotalsG(pid, mid);
    var recvG = nRecvG(pid, mid);
    var paratMonthG = nParatG(pid, mid);
    var yarnPriceP = rupToP(pr.yarnPrice), ghatPct = pr.ghatPct;
    /* per-size jobwork breakdown */
    var bySize = [], jobworkP = 0n, order = NIWAR_SIZES.slice();
    Object.keys(sizeTot).sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); }).forEach(function (sz) {
      var g = sizeTot[sz], rp = rupToP(nSizeRate(pid, mid, sz)), amt = g * rp / 1000n;
      jobworkP += amt; bySize.push({ size: sz, g: g, rateP: rp, amtP: amt });
    });
    var upadP = nUpadMP(pid, mid);
    var ghatKg = (recvG * B(ghatPct) / 100n + 500n) / 1000n;         /* round(total recv kg × ghat%) → whole kg */
    var ghatP = ghatKg * yarnPriceP;
    var tdsP = (pr.tdsP != null) ? pr.tdsP : (jobworkP / 100n);      /* default suggestion = 1% of jobwork */
    var deductP = nLoanDeductMP(pr, pid, mid);
    /* material weight balance (kg) carries forward — money settles each month */
    var matOpen = (mi <= 0) ? (pr.openingMatSeedG || 0n) : niwarSettle(pid, mi - 1).matClose;
    var matClose = matOpen + recvG - paratMonthG;
    var payableP = jobworkP - upadP - ghatP - tdsP - deductP;
    var paidP = (pr.paidP != null) ? pr.paidP : payableP;
    return { pr: pr, bySize: bySize, sizeTot: sizeTot, recvG: recvG, paratG: paratMonthG,
      matOpen: matOpen, matClose: matClose, yarnPriceP: yarnPriceP, ghatPct: ghatPct, ghatKg: ghatKg,
      jobworkP: jobworkP, upadP: upadP, ghatP: ghatP, tdsP: tdsP, deductP: deductP,
      payable: payableP, paid: paidP, carry: 0n };
  }

  /* interlinked monthly settlement */
  function monthIndexOf(id) { return MONTHS.map(function (m) { return m.id; }).indexOf(id); }
  function loanDeductMP(wid, mid) { var b = BILL[wid][mid]; return b.loanDeductP != null ? b.loanDeductP : monthRepaySeedP(wid, mid); }
  function openingMP(wid, mi) { if (mi <= 0) return BILL[STATE_W(wid)][MONTHS[0].id].openingSeed || 0n; return settleM(wid, mi - 1).carry; }
  function STATE_W(wid) { return wid; }
  function settleM(wid, mi) {
    var mid = MONTHS[mi].id, b = BILL[wid][mid];
    var E = billMonth(wid, mid).EP;
    var upad = upadMP(wid, mid);
    var deduct = loanDeductMP(wid, mid);
    /* money settles each month — no money carry-forward (the carry-forward is a WEIGHT balance, see matBalance) */
    var payable = E - upad - deduct;
    var paid = (b.paidP != null) ? b.paidP : payable;
    return { E: E, opening: 0n, upad: upad, deduct: deduct, payable: payable, paid: paid, carry: 0n };
  }

  /* material (weight) balance — the carry-forward the client wants, in kg (grams):
     closing = opening + (Kokdi+Color sent)  −  (cloth weight + 3% ghati)  → next month's opening */
  function matBalance(wid, mi) {
    var mid = MONTHS[mi].id, b = billMonth(wid, mid);
    var clubbedG = b.sentG, clothGhatiG = b.clothG;
    var opening = (mi <= 0) ? (BILL[wid][MONTHS[0].id].openingWseedG || 0n) : matBalance(wid, mi - 1).closing;
    var closing = opening + clubbedG - clothGhatiG;
    return { opening: opening, clubbedG: clubbedG, clothGhatiG: clothGhatiG, closing: closing };
  }

  /* ghati reconciliation + year-end */
  function yearKapadG(wid) { var g = 0n; MONTHS.forEach(function (m) { g += billMonth(wid, m.id).kapadG; }); return g; }
  function ghatiRecon(wid) {
    var w = workerById(wid); var annual = yearKapadG(wid);
    var givenBP = 300, actualBP = Math.round((w.actualGhati || 3) * 100);
    var givenG = annual * BigInt(givenBP) / 10000n, actualG = annual * BigInt(actualBP) / 10000n;
    var diffG = givenG - actualG, rateP = rupToP(GHATI_RATE.v), settleP = diffG * rateP / 1000n;
    return { annual: annual, givenBP: givenBP, actualBP: actualBP, givenG: givenG, actualG: actualG, diffG: diffG, rateP: rateP, settleP: settleP };
  }
  function yearEnd(wid) {
    var g = ghatiRecon(wid), loanRem = loanBalanceP(wid), matClose = matBalance(wid, MONTHS.length - 1).closing;
    /* money no longer carries forward; the year-end net = ghati settlement − loan remaining. matClose = year-end material balance (kg). */
    return { carryLast: 0n, ghati: g, loanRem: loanRem, matClose: matClose, netToWorker: g.settleP - loanRem };
  }

  /* ---------------------------------------------------------------- STATE / NAV */
  var STATE = { role: "admin", view: "dashboard", worker: null, month: "2026-08", lang: "gu", sheetId: null, packingId: null, niwarParty: null, niwarSheetId: null, lock: null };
  var NAV = [
    { id: "dashboard", g: "ડેશબોર્ડ", e: "Dashboard", ic: "dash", roles: ["admin", "supervisor"] },
    { id: "gate", g: "ગેટ · જોબ વર્ક શીટ", e: "Gate · Job Work Sheet", ic: "sheet", roles: ["admin", "supervisor"] },
    { id: "packing", g: "પેકેજિંગ", e: "Packaging", ic: "box", roles: ["admin", "supervisor"] },
    { id: "ledger", g: "જોબવર્ક ખાતાવહી", e: "Jobwork Ledger", ic: "ledger", roles: ["admin", "supervisor"] },
    { id: "niwar", g: "નિવાર જોબવર્ક", e: "Niwar Jobwork", ic: "roll", roles: ["admin", "supervisor"] },
    { id: "upad", g: "ઉપડ (એડવાન્સ)", e: "Upad (Advances)", ic: "wallet", roles: ["admin", "supervisor"] },
    { id: "billing", g: "બિલિંગ અને PDF", e: "Billing & PDF", ic: "bill", roles: ["admin", "supervisor"] },
    { id: "loans", g: "લોન ખાતા", e: "Loan Accounts", ic: "rupee", roles: ["admin", "supervisor"] },
    { id: "yearend", g: "વર્ષાંત (દિવાળી)", e: "Year-End (Diwali)", ic: "spark", roles: ["admin", "supervisor"] },
    { id: "workers", g: "જોબ વર્કર્સ", e: "Job Workers", ic: "users", roles: ["admin", "supervisor"] },
    { id: "usermgmt", g: "યુઝર મેનેજમેન્ટ", e: "User Management", ic: "shield", roles: ["admin"] },
    { id: "backup", g: "બેકઅપ અને રિસ્ટોર", e: "Backup & Restore", ic: "database", roles: ["admin"] },
    { id: "help", g: "માહિતી", e: "How it works", ic: "help", roles: ["admin", "supervisor"] }
  ];
  /* ---- per-user module permissions ----------------------------------
     Modules shown in the permission grid. A supervisor (normal user) can be
     granted the "staff-functional" ones; the rest need the Admin role (their
     data is admin-only server-side, so they stay locked for supervisors).
     Dashboard is always on so every user has a landing page. */
  var PERM_MODULES = ["dashboard", "gate", "packing", "ledger", "niwar", "upad", "billing", "loans", "yearend", "workers"];
  // Default modules switched ON for a brand-new supervisor. The Owner can then
  // grant or revoke ANY module per user — every module is grantable.
  var STAFF_DEFAULT = ["dashboard", "gate", "packing", "niwar"];
  var PERM_ALWAYS = ["dashboard", "help"];                            // never hidden
  // Every real module can be granted to any user; dashboard stays always-on.
  function moduleGrantable(id) { return PERM_MODULES.indexOf(id) > -1; }
  function myPerms() { return (window.GJAuth && window.GJAuth.user && window.GJAuth.user.perms) || null; }
  // Is a module permitted for the signed-in user? Admin: always. Supervisor: only
  // when their perms map explicitly grants it (dashboard/help are always allowed).
  function modulePermitted(id) {
    if (STATE.role === "admin") return true;
    if (PERM_ALWAYS.indexOf(id) > -1) return true;
    var p = myPerms();
    if (!p) return STAFF_DEFAULT.indexOf(id) > -1;   // legacy account without a perms map
    return p[id] === true;
  }
  function navForRole() { return NAV.filter(function (n) { return n.roles.indexOf(STATE.role) > -1 && modulePermitted(n.id); }); }
  function viewAllowed(v) {
    if (v === "profile") return !!(window.GJAuth && window.GJAuth.user);   // own profile page — any signed-in role
    if (v === "gatesheet") return viewAllowed("gate"); if (v === "packingsheet") return viewAllowed("packing"); if (v === "niwarsheet") return viewAllowed("niwar");
    var n = NAV.filter(function (x) { return x.id === v; })[0];
    return !!(n && n.roles.indexOf(STATE.role) > -1 && modulePermitted(v));
  }

  /* ---------------------------------------------------------------- SHARED UI */
  function demoStrip() {
    return '<div class="demo-strip">' + svg("info") + '<span>' +
      L('<b>ગેટ જોબ વર્ક શીટ</b> આખી સિસ્ટમનો આધાર છે — શીટ ભરો → ખાતાવહી, બિલિંગ, લોન અને વર્ષાંત આપમેળે અપડેટ થાય.',
        '<b>The gate Job Work Sheet</b> is the single source of truth — fill a sheet → ledger, billing, loans & year-end update automatically.') + '</span></div>';
  }
  // Worker + month selectors — same controls/ids as before, now shown on the
  // dashboard (between the info strip and the title) instead of the top bar.
  function switcherBar() {
    return '<div class="dash-switchers">' +
      '<div class="worker-switch"><span class="lbl" id="workerLbl">' + L("જોબ વર્કર", "Job Worker") + '</span>' +
        '<select id="workerSelect" aria-label="Select job worker"></select></div>' +
      '<div class="month-switch">' +
        '<button class="btn btn-sm btn-ghost" id="monthPrev" aria-label="Previous month" style="min-height:34px;padding:0 8px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>' +
        '<select id="monthSelect" class="mlabel" aria-label="Select month"></select>' +
        '<button class="btn btn-sm btn-ghost" id="monthNext" aria-label="Next month" style="min-height:34px;padding:0 8px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>' +
      '</div>' +
    '</div>';
  }
  function stat(tint, ic, k, v, vs, d) {
    return '<div class="stat"><div class="ico ' + tint + '">' + svg(ic) + '</div><div class="k">' + k + '</div><div class="v num">' + v + (vs ? ' <small>' + vs + '</small>' : '') + '</div>' + (d ? '<div class="d">' + d + '</div>' : '') + '</div>';
  }
  function dmy(iso) { var p = iso.split("-"); return p[2] + "/" + p[1] + "/" + p[0].slice(-2); }

  /* ---------------------------------------------------------------- DASHBOARD */
  function viewDashboard() {
    if (STATE.role === "supervisor") return dashSupervisor();
    if (!WORKERS.length) {
      return '<div class="page-head"><h2>' + L("ડેશબોર્ડ", "Dashboard") + '</h2><div class="sub">' + monthName() + '</div></div>' +
        emptyState("users", L("હજી કોઈ જોબ વર્કર નથી", "No job workers yet"), L("શરૂ કરવા પહેલો જોબ વર્કર ઉમેરો — પછી ડેશબોર્ડ, ખાતાવહી અને બિલિંગ ભરાશે.", "Add your first job worker to get started — the dashboard, ledger and billing fill in from there."), L("જોબ વર્કર ઉમેરો", "Add Job Worker"), 'data-go="workers"');
    }
    var w = worker(); var b = billMonth(w.id, STATE.month);
    var ranks = WORKERS.map(function (ww) { return { w: ww, mtr: billMonth(ww.id, STATE.month).mtr }; }).sort(function (a, z) { return z.mtr - a.mtr; }).slice(0, 5);
    var maxMtr = ranks[0].mtr || 1;
    var monthSheets = SHEETS.filter(function (s) { return s.date.slice(0, 7) === STATE.month; });
    var loanTot = WORKERS.reduce(function (a, ww) { return a + loanBalanceP(ww.id); }, 0n);
    var upadTot = WORKERS.reduce(function (a, ww) { return a + upadMP(ww.id, STATE.month); }, 0n);

    var html = demoStrip() + switcherBar();
    html += '<div class="page-head"><h2>' + L("ડેશબોર્ડ", "Dashboard") + '</h2><div class="sub">' + wNm(w) + ' · ' + monthName() + '</div></div>';
    html += '<div class="stat-grid">' +
      stat("tint-brand", "sheet", L("આ મહિને શીટ", "Sheets this month"), monthSheets.length, "", L("બધા વર્કર", "all workers")) +
      stat("tint-in", "box", L("આ મહિને મીટર", "Meters this month"), numI(b.mtr), "mtr", wNm(w)) +
      stat("tint-out", "send", L("કોકડી+કલર", "Kokdi+Color"), kgStr(b.sentG), "", L("મોકલ્યું", "sent")) +
      stat("tint-upad", "wallet", L("આ મહિને ઉપડ", "Upad this month"), moneyPw(upadTot), "", L("બધા વર્કર", "all workers")) +
      stat("tint-out", "rupee", L("કુલ લોન બાકી", "Loan outstanding"), moneyPw(loanTot), "", L("બધા વર્કર", "all workers")) +
      '</div>';
    html += '<div class="grid-2">';
    html += '<div class="card"><div class="card-head"><div class="ico tint-ok">' + svg("bill") + '</div><div><h3>' + wNm(w) + ' <span class="en">' + monthName() + '</span></h3></div></div><div class="card-pad">' +
      '<div class="bill-line"><span class="lab">' + L("કુલ મીટર", "Total meters") + ' <small>' + numI(b.mtr) + ' × ' + rateStr(b.ratePaise) + '</small></span><span class="val num">' + moneyP(b.grossP) + '</span></div>' +
      '<div class="bill-line"><span class="lab">' + L("કાપડ વજન (KG)", "Cloth weight (KG)") + '</span><span class="val num">' + kgStr(b.kapadG) + '</span></div>' +
      '<div class="bill-total"><span class="lab"><b>' + L("માસિક નેટ", "Month net") + '</b></span><span class="val num">' + moneyP(b.EP) + '</span></div>' +
      '<div class="page-actions"><button class="btn btn-soft btn-sm" data-go="ledger">' + svg("ledger") + ' ' + L("ખાતાવહી", "Ledger") + '</button><button class="btn btn-gold btn-sm" data-go="billing">' + svg("file") + ' PDF</button></div></div></div>';
    html += '<div class="card"><div class="card-head"><div class="ico tint-in">' + svg("dash") + '</div><div><h3>' + L("ટોપ જોબ વર્કર્સ", "Top job workers") + '</h3></div></div><div class="card-pad">';
    ranks.forEach(function (rk) { var pc = Math.max(6, Math.round(rk.mtr / maxMtr * 100)); html += '<div style="margin-bottom:13px"><div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:5px"><b>' + wNm(rk.w) + '</b><span class="num" style="color:var(--muted)">' + numI(rk.mtr) + ' mtr</span></div><div style="height:9px;background:var(--bg-2);border-radius:999px;overflow:hidden"><div style="height:100%;width:' + pc + '%;background:linear-gradient(90deg,var(--brand),var(--brand-600));border-radius:999px"></div></div></div>'; });
    html += '</div></div></div>';
    html += '<div class="card mt"><div class="card-head"><div class="ico tint-brand">' + svg("inbox") + '</div><div><h3>' + L("તાજેતરની શીટ", "Recent sheets") + '</h3></div><div class="spacer"></div><button class="btn btn-ghost btn-sm" data-go="gate">' + svg("chevR") + ' ' + L("ગેટ", "Gate") + '</button></div>' + sheetMiniTable(monthSheets.slice(0, 6)) + '</div>';
    return html;
  }
  function dashSupervisor() {
    var monthSheets = SHEETS.filter(function (s) { return s.date.slice(0, 7) === STATE.month; });
    var totMt = monthSheets.reduce(function (a, s) { return a + sheetMt(s); }, 0);
    var totKg = monthSheets.reduce(function (a, s) { return a + sheetKgG(s); }, 0);
    var html = demoStrip();
    html += '<div class="page-head row-between"><div><h2>' + L("સુપરવાઇઝર ડેશબોર્ડ", "Supervisor Dashboard") + '</h2><div class="sub">' + monthName() + ' — ' + L("ગેટ જોબ વર્ક શીટ + નિવાર ગેટ એન્ટ્રી", "gate job work sheets + niwar gate entry") + '</div></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" data-newsheet="1">' + svg("plus") + ' ' + L("નવી શીટ", "New Sheet") + '</button></div></div>';
    // Two primary clickable entry cards (bug 2)
    var nMonth = NSHEETS.filter(function (s) { return s.date.slice(0, 7) === STATE.month; });
    html += '<div class="dash-entry-grid">' +
      '<button type="button" class="entry-card" data-go="gate">' +
        '<span class="ec-ico tint-brand">' + svg("sheet") + '</span>' +
        '<span class="ec-body"><span class="ec-title">' + L("ગેટ · જોબ વર્ક શીટ", "Gate · Job Work Sheet") + '</span>' +
        '<span class="ec-sub">' + L("ટેમ્પો ગેટ એન્ટ્રી · મીટર, KG, પરત", "Tempo gate entry · metres, KG, parat") + '</span>' +
        '<span class="ec-meta">' + monthSheets.length + ' ' + L("શીટ આ મહિને", "sheets this month") + '</span></span>' +
        '<span class="ec-arrow">' + svg("chevR") + '</span>' +
      '</button>' +
      '<button type="button" class="entry-card" data-go="niwar">' +
        '<span class="ec-ico tint-in">' + svg("roll") + '</span>' +
        '<span class="ec-body"><span class="ec-title">' + L("નિવાર જોબવર્ક શીટ", "Niwar Jobwork Sheet") + '</span>' +
        '<span class="ec-sub">' + L("નિવાર ગેટ એન્ટ્રી · વજન", "Niwar gate entry · weights") + '</span>' +
        '<span class="ec-meta">' + nMonth.length + ' ' + L("શીટ આ મહિને", "sheets this month") + '</span></span>' +
        '<span class="ec-arrow">' + svg("chevR") + '</span>' +
      '</button></div>';
    html += '<div class="stat-grid">' +
      stat("tint-brand", "sheet", L("આ મહિને શીટ", "Sheets this month"), monthSheets.length, "", "") +
      stat("tint-in", "ruler", L("કુલ મીટર", "Total metre"), numI(totMt), "mtr", "") +
      stat("tint-out", "scale", L("કુલ KG", "Total KG"), kgStr(B(totKg)), "", "") +
      stat("tint-ok", "roll", L("કુલ રોલ", "Total rolls"), monthSheets.reduce(function (a, s) { return a + sheetRolls(s); }, 0), "", "") +
      '</div>';
    html += '<div class="card"><div class="card-head"><div class="ico tint-brand">' + svg("sheet") + '</div><div><h3>' + L("આ મહિનાની શીટ", "This month's sheets") + '</h3></div><div class="spacer"></div><button class="btn btn-gold btn-sm" data-go="gate">' + svg("chevR") + ' ' + L("બધી", "All") + '</button></div>' + sheetMiniTable(monthSheets.slice(0, 8)) + '</div>';
    return html;
  }
  function sheetMiniTable(list) {
    var h = '<div class="table-scroll"><table class="data"><thead><tr><th>' + L("તારીખ", "Date") + '</th><th>' + L("જોબ વર્કર", "Job Worker") + '</th><th style="text-align:right">' + L("રોલ", "Roll") + '</th><th style="text-align:right">' + L("મીટર", "Mtr") + '</th><th style="text-align:right">KG</th><th></th></tr></thead><tbody>';
    if (!list.length) h += '<tr><td colspan="6" style="text-align:center;color:var(--muted)">' + L("કોઈ શીટ નથી.", "No sheets.") + '</td></tr>';
    list.forEach(function (s) { var w = workerById(s.workerId); h += '<tr><td>' + dmy(s.date) + '</td><td><b>' + (STATE.lang === "en" ? w.en : w.name) + '</b></td><td style="text-align:right" class="num">' + sheetRolls(s) + '</td><td style="text-align:right" class="num">' + numI(sheetMt(s)) + '</td><td style="text-align:right" class="num">' + kgStr(B(sheetKgG(s))) + '</td><td style="text-align:right"><button class="btn btn-soft btn-sm" data-opensheet="' + s.id + '">' + svg("edit") + ' ' + L("ખોલો", "Open") + '</button></td></tr>'; });
    h += '</tbody></table></div>';
    return h;
  }

  /* ---------------------------------------------------------------- GATE (sheet list) */
  function viewGate() {
    // Supervisor does gate entry for every worker — list shows ALL workers' sheets.
    // Admin has FULL ACCESS to the same shared data: all workers' sheets by default,
    // with a worker filter to narrow when needed. Both roles read the same Firestore
    // 'sheets' store, so each sees what the other saves (live).
    var isSup = STATE.role === "supervisor";
    if (STATE.gateFilter == null) STATE.gateFilter = "all";
    var filterWid = isSup ? "all" : STATE.gateFilter;              // admin can filter; supervisor sees all
    var monthList = SHEETS.filter(function (s) { return s.date.slice(0, 7) === STATE.month; });
    var list = (filterWid === "all" ? monthList : monthList.filter(function (s) { return s.workerId === filterWid; }))
      .slice().sort(function (a, b) { var au = a.updatedAt || 0, bu = b.updatedAt || 0; if (au !== bu) return bu - au; return a.date < b.date ? 1 : -1; });   /* bug 24: most recently updated first */
    var showWorkerCol = (filterWid === "all");
    var filterName = (filterWid === "all") ? L("બધા વર્કર", "all workers") : (function () { var ww = workerById(filterWid); return ww ? (STATE.lang === "en" ? ww.en : ww.name) : L("બધા વર્કર", "all workers"); })();

    var html = demoStrip();
    html += '<div class="page-head row-between"><div><h2>' + L("ગેટ · જોબ વર્ક શીટ", "Gate · Job Work Sheet") + '</h2>' +
      '<div class="sub">' + L("ટેમ્પો આવે ત્યારે ગેટ પર આ શીટ ભરાય. ", "Filled at the gate when a tempo arrives. ") + filterName + ' · ' + monthName() + '</div></div>' +
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
      (isSup ? "" : '<select id="gateFilter" class="gate-filter"><option value="all"' + (filterWid === "all" ? " selected" : "") + '>' + L("બધા વર્કર", "All workers") + '</option>' + WORKERS.map(function (ww) { return '<option value="' + ww.id + '"' + (filterWid === ww.id ? " selected" : "") + '>' + esc(STATE.lang === "en" ? ww.en : ww.name) + '</option>'; }).join("") + '</select>') +
      '<button class="btn btn-primary" data-newsheet="1">' + svg("plus") + ' ' + L("નવી શીટ", "New Sheet") + '</button></div></div>';
    html += '<div class="card"><div class="table-scroll"><table class="data"><thead><tr>' +
      '<th>' + L("તારીખ", "Date") + '</th>' + (showWorkerCol ? '<th>' + L("જોબ વર્કર", "Job Worker") + '</th>' : '') + '<th>' + L("ક્વોલિટી", "Quality") + '</th><th style="text-align:right">' + L("રોલ", "Roll") + '</th><th style="text-align:right">' + L("કુલ મીટર", "Total Mtr") + '</th><th style="text-align:right">KG</th><th style="text-align:right">' + L("કોકડી+કલર", "Kokdi+Color") + '</th><th></th></tr></thead><tbody>';
    if (!list.length) html += '<tr><td colspan="' + (showWorkerCol ? 8 : 7) + '" style="text-align:center;color:var(--muted);padding:22px">' + L("આ મહિને કોઈ શીટ નથી. “નવી શીટ” દબાવો.", "No sheets this month. Press “New Sheet”.") + '</td></tr>';
    list.forEach(function (s) {
      var sw = workerById(s.workerId);
      html += '<tr><td><b>' + dmy(s.date) + '</b></td>' + (showWorkerCol ? '<td><b>' + esc(sw ? (STATE.lang === "en" ? sw.en : sw.name) : "—") + '</b></td>' : '') + '<td>' + esc(qLabel(s.quality)) + '</td>' +
        '<td style="text-align:right" class="num">' + sheetRolls(s) + '</td><td style="text-align:right" class="num">' + numI(sheetMt(s)) + '</td>' +
        '<td style="text-align:right" class="num">' + kgStr(B(sheetKgG(s))) + '</td><td style="text-align:right" class="num">' + kgStr(B(sheetKokdiG(s) + sheetColorG(s))) + '</td>' +
        '<td style="text-align:right;white-space:nowrap"><button class="btn btn-soft btn-sm" data-opensheet="' + s.id + '">' + svg("edit") + ' ' + L("ખોલો", "Open") + '</button>' +
        (isSup ? "" : ' <button class="btn btn-soft btn-sm" data-delsheet="' + s.id + '" title="' + L("શીટ કાઢો", "Delete sheet") + '">' + svg("trash") + '</button>') + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
    html += '<div class="hint mt">' + L("💡 દરેક શીટ = ખાતાવહીની એક એન્ટ્રી. શીટ ભરતાં જ બિલિંગ/લોન/વર્ષાંત અપડેટ થાય. એડમિન બધા વર્કરની શીટ જોઈ અને મેનેજ કરી શકે.", "💡 Each sheet = one ledger entry. Filling a sheet updates billing / loans / year-end automatically. Admin can view and manage every worker's sheet.") + '</div>';
    return html;
  }

  /* ---------------------------------------------------------------- GATE SHEET EDITOR */
  function viewGateSheet() {
    var sh = sheetById(STATE.sheetId);
    if (!sh) { STATE.view = "gate"; return viewGate(); }
    var html = '';
    html += '<div class="page-head row-between"><div style="display:flex;align-items:center;gap:12px">' +
      '<div><h2 style="margin:0">' + L("જોબ વર્ક શીટ", "Job Work Sheet") + '</h2></div></div>' +
      '<div class="page-actions"><button class="btn btn-wa btn-sm" data-sheetwa="1">' + svg("wa") + ' ' + L("WhatsApp", "WhatsApp") + '</button>' +
      '<button class="btn btn-gold btn-sm" data-sheetpdf="worker">' + svg("send") + ' ' + L("વર્કર કોપી PDF", "Worker PDF") + '</button>' +
      '<button class="btn btn-primary btn-sm" data-sheetpdf="company">' + svg("file") + ' ' + L("કંપની કોપી PDF", "Company PDF") + '</button></div></div>';

    /* header fields */
    var wopts = WORKERS.map(function (w) { return '<option value="' + w.id + '"' + (w.id === sh.workerId ? " selected" : "") + '>' + (STATE.lang === "en" ? w.en : w.name) + '</option>'; }).join("");
    html += '<div class="jws-head"><div class="jws-hfields">' +
      '<label class="jws-hf"><span>' + L("જોબ વર્કર (નામ)", "Job Worker (Name)") + '</span><select data-sh="workerId">' + wopts + '</select></label>' +
      '<label class="jws-hf"><span>' + L("તારીખ", "Date") + '</span><input type="date" data-sh="date" value="' + esc(sh.date) + '"' + dateAttrs() + '></label>' +
      '<label class="jws-hf"><span>' + L("ક્વોલિટી", "Quality") + '</span><input type="text" data-sh="quality" value="' + esc(sh.quality) + '"></label>' +
      '</div></div>';

    /* toolbar */
    html += '<div class="jws-toolbar"><div class="steps-ctrl"><span class="lbl">' + L("સ્ટેપ (કૉલમ)", "Steps (columns)") + '</span>' +
      '<button class="icon-btn" id="stepMinus"' + (sh.nSteps <= 1 ? " disabled" : "") + '>' + svg("minus") + '</button><b id="stepCount">' + sh.nSteps + '</b>' +
      '<button class="icon-btn" id="stepPlus"' + (sh.nSteps >= MAX_STEPS ? " disabled" : "") + '>' + svg("plus") + '</button></div></div>';

    /* layout: grid + side */
    html += '<div class="jws-layout"><div class="card jws-gridcard"><div class="jws-scroll"><table class="jws"><thead><tr><th class="sr-col">' + L("ક્રમ", "Sr.") + '</th>';
    for (var s = 0; s < sh.nSteps; s++) html += '<th>' + L("સ્ટેપ", "Step") + ' ' + (s + 1) + '<span class="en">' + L("મીટર", "metre") + '</span></th>';
    html += '</tr></thead><tbody>';
    for (var r = 0; r < MAX_ROWS; r++) {
      html += '<tr><td class="sr-col">' + (r + 1) + '</td>';
      for (var s2 = 0; s2 < sh.nSteps; s2++) { var v = sh.meters[s2][r]; html += '<td><input class="cell" type="text" inputmode="numeric" maxlength="2" data-mt="' + s2 + '_' + r + '" value="' + (v == null ? "" : v) + '"></td>'; }
      html += '</tr>';
    }
    html += '</tbody><tfoot><tr class="ft-total"><td class="sr-col">' + L("કુલ", "Total") + '</td>';
    for (var s3 = 0; s3 < sh.nSteps; s3++) html += '<td class="num" id="stot_' + s3 + '">' + numI(stepTotalMt(sh, s3)) + '</td>';
    html += '</tr><tr class="ft-kg"><td class="sr-col">KG</td>';
    for (var s4 = 0; s4 < sh.nSteps; s4++) { var kgLock = stepTotalMt(sh, s4) <= 0; html += '<td><input class="cell kgcell' + (kgLock ? ' kg-locked' : '') + '" inputmode="decimal" data-kg="' + s4 + '"' + (kgLock ? ' disabled title="' + L("પહેલાં આ સ્ટેપમાં મીટર ભરો", "Enter metres in this step first") + '"' : '') + ' value="' + (sh.kg[s4] == null ? "" : sh.kg[s4]) + '"></td>'; }
    html += '</tr></tfoot></table></div><div class="hint" style="padding:10px 14px 0">' + L("ખાલી ખાના છોડી શકાય. બાજુમાં સ્ક્રોલ કરીને બધા સ્ટેપ જુઓ.", "Blanks are fine. Scroll sideways for all steps.") + '</div></div>';
    html += '<div class="jws-side">' +
      sideStat("roll", L("રોલ", "Roll"), '<span id="sumRoll">' + numI(sheetRolls(sh)) + '</span>', L("કુલ એન્ટ્રી", "total entries"), "tint-in") +
      sideStat("ruler", L("કુલ મીટર", "Total Metre"), '<span id="sumMt">' + numI(sheetMt(sh)) + '</span>', L("બધા સ્ટેપ", "all steps"), "tint-brand") +
      sideStat("scale", "KG", '<span id="sumKg">' + kgStr(B(sheetKgG(sh))) + '</span>', L("કુલ કિલો", "total KG"), "tint-out") +
      '</div></div>';

    /* parat */
    html += '<div class="card mt jws-parat"><div class="card-head"><div class="ico tint-out">' + svg("send") + '</div><div><h3>' + L("પરત ની યાદી", "Parat ni Yadi") + ' <span class="en">' + L("જોબ વર્કરને મોકલ્યું", "sent to job worker") + '</span></h3></div><div class="spacer"></div><button class="btn btn-ghost btn-sm" id="paratAdd"' + (sh.parat.length >= 5 ? " disabled" : "") + '>' + svg("plus") + ' ' + L("લાઇન", "Add line") + '</button></div>';
    html += '<div class="table-scroll"><table class="jws-parat-tbl"><thead><tr><th>#</th><th>' + L("કોકડી (kg)", "Kokdi (kg)") + '</th><th>' + L("કલર (kg)", "Color (kg)") + '</th><th></th></tr></thead><tbody>';
    sh.parat.forEach(function (p, i) {
      html += '<tr><td class="sr-col">' + (i + 1) + '</td><td><input class="cell" inputmode="decimal" data-pk="' + i + '" value="' + (p.kokdi == null ? "" : p.kokdi) + '"></td><td><input class="cell" inputmode="decimal" data-pc="' + i + '" value="' + (p.color == null ? "" : p.color) + '"></td><td class="act">' + (sh.parat.length > 1 ? '<button class="icon-btn sm" data-pdel="' + i + '">' + svg("minus") + '</button>' : '') + '</td></tr>';
    });
    html += '</tbody><tfoot><tr><td class="sr-col">' + L("કુલ", "Total") + '</td><td class="num" id="pkTot">' + kgStr(B(sheetKokdiG(sh))) + '</td><td class="num" id="pcTot">' + kgStr(B(sheetColorG(sh))) + '</td><td class="act"></td></tr>' +
      '<tr class="grand"><td class="sr-col">' + L("કોકડી+કલર", "Kokdi+Color") + '</td><td colspan="2" class="num" id="pBoth">' + kgStr(B(sheetKokdiG(sh) + sheetColorG(sh))) + '</td><td></td></tr></tfoot></table></div></div>';

    html += '<div class="card mt"><div class="card-pad" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><div class="free-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + I.check + '</svg>' + L("“થઈ ગયું” અથવા “સેવ” થી ખાતાવહીમાં દેખાશે", "Saved to the ledger on Done / Save") + '</div><div class="spacer"></div>' +
      '<button class="btn btn-ghost btn-sm" data-delsheet="' + sh.id + '">' + svg("trash") + ' ' + L("શીટ કાઢો", "Delete sheet") + '</button>' +
      '<button class="btn btn-primary" data-go="gate">' + svg("check") + ' ' + L("થઈ ગયું", "Done") + '</button></div></div>';
    return html;
  }
  function sideStat(ic, k, v, d, tint) { return '<div class="stat"><div class="ico ' + tint + '">' + svg(ic) + '</div><div class="k">' + k + '</div><div class="v num">' + v + '</div><div class="d">' + d + '</div></div>'; }

  /* ---------------------------------------------------------------- LEDGER (from sheets) */
  function viewLedger() {
    if (!WORKERS.length) return noWorkersView("ખાતાવહી", "Jobwork Ledger");
    var w = worker(); var rows = ledgerRows(w.id, STATE.month);
    var t = { roll: 0, mtr: 0, kapadG: 0n, kokdiG: 0n, colorG: 0n };
    rows.forEach(function (r) { t.roll += r.roll; t.mtr += r.mtr; t.kapadG += B(r.kapadG); t.kokdiG += B(r.kokdiG); t.colorG += B(r.colorG); });
    var html = demoStrip();
    html += '<div class="page-head row-between"><div><h2>' + L("જોબવર્ક ખાતાવહી", "Jobwork Ledger") + '</h2>' +
      '<div class="sub">' + wNm(w) + ' · ' + monthName() + ' — ' + L("ગેટ શીટમાંથી આપમેળે", "auto from gate sheets") + '</div></div>' +
      '<div class="page-actions"><button class="btn btn-ghost" data-go="gate">' + svg("sheet") + ' ' + L("ગેટ શીટ", "Gate sheets") + '</button><button class="btn btn-gold" data-go="billing">' + svg("file") + ' ' + L("બિલ & PDF", "Bill & PDF") + '</button></div></div>';
    html += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px"><span class="section-tag badge-in">' + svg("box") + ' ' + L("આવક", "IN") + '</span><span class="section-tag badge-out">' + svg("send") + ' ' + L("કોકડી+કલર મોકલ્યું", "Kokdi+Color sent") + '</span></div>';
    html += '<div class="card table-wrap"><div class="table-scroll"><table class="ledger"><thead><tr>' +
      '<th class="l sticky-col">' + L("તારીખ (શીટ)", "Date (sheet)") + '</th>' +
      '<th class="hd-in">' + L("રોલ", "Roll") + '</th><th class="hd-in">' + L("મીટર", "Mtr") + '</th><th class="hd-in">' + L("કાપડ વજન", "Cloth Wt") + '</th>' +
      '<th class="hd-out">' + L("કોકડી", "Kokdi") + '</th><th class="hd-out">' + L("કલર", "Color") + '</th><th class="hd-out">' + L("કોકડી+કલર", "Clubbed") + '</th><th class="act"></th></tr></thead><tbody>';
    if (!rows.length) html += '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:20px">' + L("આ મહિને કોઈ ગેટ શીટ નથી.", "No gate sheets this month.") + '</td></tr>';
    rows.forEach(function (r) {
      html += '<tr><td class="l sticky-col">' + dmy(r.date) + '</td>' +
        '<td class="col-in num">' + r.roll + '</td><td class="col-in num">' + numI(r.mtr) + '</td><td class="col-in num">' + kgStr(B(r.kapadG)) + '</td>' +
        '<td class="col-out num">' + kgStr(B(r.kokdiG)) + '</td><td class="col-out num">' + kgStr(B(r.colorG)) + '</td><td class="col-out num" style="font-weight:700">' + kgStr(B(r.kokdiG + r.colorG)) + '</td>' +
        '<td class="act"><button class="icon-btn" data-opensheet="' + r.id + '" title="' + L("શીટ ખોલો", "Open sheet") + '">' + svg("edit") + '</button></td></tr>';
    });
    html += '</tbody><tfoot><tr><td class="l sticky-col">' + L("કુલ", "Total") + ' (' + rows.length + ')</td>' +
      '<td class="num">' + t.roll + '</td><td class="num">' + numI(t.mtr) + '</td><td class="num">' + kgStr(t.kapadG) + '</td>' +
      '<td class="num">' + kgStr(t.kokdiG) + '</td><td class="num">' + kgStr(t.colorG) + '</td><td class="num">' + kgStr(t.kokdiG + t.colorG) + '</td><td class="act"></td></tr></tfoot></table></div></div>';
    html += '<div class="hint mt">' + L("💡 દરેક લાઇન એક ગેટ શીટ છે. પેન્સિલ પર ક્લિક કરી શીટ ખોલો/બદલો.", "💡 Each line is one gate sheet. Click the pencil to open/edit the sheet.") + '</div>';
    return html;
  }

  /* ---------------------------------------------------------------- BILLING */
  /* ---------------------------------------------------------------- NIWAR JOBWORK */
  function niwarPartySelect() {
    return '<div class="worker-switch" style="background:var(--bg-2);padding:6px 10px;border-radius:var(--r-md)"><span class="lbl">' + L("નિવાર પાર્ટી", "Niwar party") + '</span><select id="niwarPartySel" aria-label="Niwar party">' +
      NWORKERS.map(function (p) { return '<option value="' + p.id + '"' + (p.id === STATE.niwarParty ? " selected" : "") + '>' + (STATE.lang === "en" ? p.en : p.name) + '</option>'; }).join("") + '</select></div>';
  }
  function nProdSummary(s) { return (s.products || []).map(function (pr) { return pr.size + '" ' + kgStr(nProductG(pr)); }).join(" · ") || "—"; }
  function viewNiwar() {
    if (!NWORKERS.length) return noPartiesView("નિવાર જોબવર્ક", "Niwar Jobwork");
    var p = niwarParty(); var mid = STATE.month; var mi = niwarMonthIdx(mid);
    var sheets = nMonthSheets(p.id, mid);
    var pname = (STATE.lang === "en" ? p.en : p.name);
    var isAdmin = STATE.role === "admin";
    var html = '<div class="demo-strip">' + svg("info") + '<span>' +
      L('<b>નિવાર જોબવર્ક</b> — ગેટ-સ્ટાઇલ અલગ ખાતાવહી (kg). ગેટ પર <b>સુપરવાઇઝર</b> સાઇઝ પ્રમાણે વજન + પરાત ભરે; <b>એડમિન</b> રેટ, ઘટ, TDS, લોન અને બિલ કરે. બાકી માલ (વજન) આવતા મહિને કેરી ફોરવર્ડ થાય.',
        '<b>Niwar Jobwork</b> — a separate gate-style ledger (kg). At the gate the <b>Supervisor</b> records weights by size + parat; the <b>Admin</b> does rates, ghat, TDS, loan and the bill. The material balance (weight) carries forward.') + '</span></div>';
    html += '<div class="page-head row-between"><div><h2>' + (isAdmin ? L("નિવાર જોબવર્ક", "Niwar Jobwork") : L("નિવાર ગેટ એન્ટ્રી", "Niwar Gate Entry")) + '</h2>' +
      '<div class="sub">' + pname + ' · ' + monthName() + ' — ' + (isAdmin ? L("ખાતાવહી + બિલ", "ledger + bill") : L("ગેટ પર માલ ઇન/આઉટ (kg)", "material in/out at the gate (kg)")) + '</div></div>' +
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' + niwarPartySelect() + (isAdmin ? '<button class="btn btn-soft" data-addnparty="1" title="' + L("નવી પાર્ટી", "Add party") + '">' + svg("plus") + ' ' + L("પાર્ટી", "Party") + '</button><button class="btn btn-soft" data-editnparty="' + p.id + '" title="' + L("પાર્ટી ફેરફાર", "Edit party") + '">' + svg("edit") + '</button>' : '') + '<button class="btn btn-primary" data-newnsheet="1">' + svg("plus") + ' ' + L("નવી નિવાર શીટ", "New niwar sheet") + '</button></div></div>';

    var st = niwarSettle(p.id, mi);
    var jobHint = moneyP(st.jobworkP / 100n);
    var upN = nUpadEntries(p.id, mid).length;
    var loanOpen = nLoanOpeningP(p.id, mid), loanClosing = loanOpen - st.deductP;

    html += '<div class="stat-grid">' +
      stat("tint-out", "send", L("નિવાર (બધી સાઇઝ)", "Niwar (all sizes)"), kgStr(st.recvG) + ' kg', "", monthName()) +
      stat("tint-in", "roll", L("પરાત (મોકલ્યું)", "Parat (sent)"), kgStr(st.paratG) + ' kg', "", pname) +
      stat("tint-upad", "scale", L("બાકી માલ → કેરી", "Material balance → carry"), kgStr(st.matClose) + ' kg', "", L("આવતા મહિને ઓપનિંગ", "next month opening")) +
      (isAdmin
        ? stat("tint-ok", "bill", L("ચૂકવવાપાત્ર", "Payable"), moneyP(st.payable), "", L("બિલ", "the bill"))
        : stat("tint-ok", "sheet", L("આ મહિને શીટ", "Sheets this month"), sheets.length, "", L("ગેટ એન્ટ્રી", "gate entries"))) +
      '</div>';

    /* ledger — the delivery sheets this month */
    html += '<div class="card"><div class="card-head"><div class="ico tint-brand">' + svg("ledger") + '</div><div><h3>' + L("નિવાર શીટ્સ (ખાતાવહી)", "Niwar sheets (ledger)") + ' <span class="en">' + monthName() + '</span></h3></div></div><div class="table-scroll"><table class="data"><thead><tr><th>' + L("તારીખ", "Date") + '</th><th>' + L("પ્રોડક્ટ (સાઇઝ × kg)", "Products (size × kg)") + '</th><th style="text-align:right">' + L("પરાત (મોકલ્યું)", "Parat (sent)") + '</th><th style="text-align:right">' + L("કુલ નિવાર", "Total niwar") + '</th><th style="width:84px"></th></tr></thead><tbody>';
    sheets.forEach(function (s) {
      html += '<tr><td>' + dmy(s.date) + '</td><td>' + nProdSummary(s) + '</td><td style="text-align:right" class="num">' + kgStr(s.paratG || 0n) + '</td><td style="text-align:right;font-weight:700" class="num">' + kgStr(nSheetNiwarG(s)) + '</td><td style="text-align:right;white-space:nowrap"><button class="icon-btn" data-opennsheet="' + s.id + '" title="' + L("ખોલો", "Open") + '">' + svg("edit") + '</button> <button class="icon-btn" data-delnsheet="' + s.id + '">' + svg("trash") + '</button></td></tr>';
    });
    if (!sheets.length) html += '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:18px">' + L("આ મહિને નિવાર શીટ નથી — 'નવી નિવાર શીટ' દબાવો.", "No niwar sheets this month — press 'New niwar sheet'.") + '</td></tr>';
    html += '</tbody><tfoot><tr class="tot"><td class="l" colspan="2">' + L("કુલ (આ મહિને)", "Total (this month)") + '</td><td style="text-align:right" class="num">' + kgStr(st.paratG) + '</td><td style="text-align:right" class="num">' + kgStr(st.recvG) + '</td><td></td></tr></tfoot></table></div>';
    html += '<div class="card-pad" style="padding-top:0"><div class="hint">' + L("ઓપનિંગ માલ (ગયા મહિનેથી): ", "Opening material (b/f): ") + '<b>' + kgStr(st.matOpen) + ' kg</b> + ' + L("નિવાર ", "niwar ") + kgStr(st.recvG) + ' − ' + L("પરાત ", "parat ") + kgStr(st.paratG) + ' = ' + L("બાકી ", "closing ") + '<b>' + kgStr(st.matClose) + ' kg</b> → ' + L("આવતા મહિને", "next month") + '</div></div></div>';

    /* -- below here is the accounting: ADMIN only. The supervisor only does gate entry. -- */
    if (!isAdmin) {
      html += '<div class="hint mt">' + L("💡 રેટ, ઘટ, TDS, લોન અને બિલ એડમિન કરે. તમે શીટ ખોલી/ઉમેરી માલ ઇન/આઉટ ભરો.", "💡 Rates, ghat, TDS, loan and the bill are handled by the Admin. You open/add sheets and record material in/out.") + '</div>';
      return html;
    }

    html += '<div class="bill-grid">';
    /* LEFT — bill statement + per-size report */
    html += '<div class="card"><div class="card-head"><div class="ico tint-ok">' + svg("bill") + '</div><div><h3>' + L("નિવાર બિલ", "Niwar Bill") + '</h3></div></div><div class="card-pad">';
    /* per-size jobwork breakdown (separate-product report) */
    html += '<div class="statement" style="margin-bottom:12px"><div class="settle-h">' + svg("roll") + ' ' + L("સાઇઝ પ્રમાણે જોબવર્ક", "Jobwork by size") + '</div>';
    if (st.bySize.length) st.bySize.forEach(function (b) { html += stLine('<b>' + b.size + '"</b> ' + kgStr(b.g) + ' kg × ' + rateStr(b.rateP) + '/kg', "+ " + moneyP(b.amtP), "plus", ""); });
    else html += '<div class="hint">' + L("કોઈ પ્રોડક્ટ નથી.", "No products yet.") + '</div>';
    html += '<div class="bill-total"><span class="lab"><b>' + L("કુલ જોબવર્ક", "Total jobwork") + '</b></span><span class="val num">' + moneyP(st.jobworkP) + '</span></div></div>';
    /* material (weight) balance — carries forward */
    html += '<div class="statement" style="margin-bottom:12px"><div class="settle-h">' + svg("scale") + ' ' + L("માલ બેલેન્સ (વજન, kg)", "Material balance (weight, kg)") + '</div>';
    html += stLine(L("ઓપનિંગ (ગયા મહિનેથી)", "Opening (b/f)"), kgStr(st.matOpen) + ' kg', st.matOpen < 0n ? "minus" : "", "");
    html += stLine(L("કુલ નિવાર (બધી સાઇઝ)", "Total niwar (all sizes)"), "+ " + kgStr(st.recvG) + ' kg', "plus", "");
    html += stLine(L("પરાત (મોકલ્યું)", "Parat (sent)"), "− " + kgStr(st.paratG) + ' kg', "minus", "");
    html += '<div class="carry-row"><span class="lab">' + svg("chevR") + ' ' + L("બાકી → આવતા મહિને ઓપનિંગ", "Closing → next month opening") + '</span><span class="val num">' + kgStr(st.matClose) + ' kg</span></div></div>';
    /* money settlement — settles this month, no money carry */
    html += '<div class="statement"><div class="settle-h">' + svg("bill") + ' ' + L("ચુકવણી (રૂપિયા)", "Payment (money)") + '</div>';
    html += stLine(L("જોબવર્ક (બધી સાઇઝ)", "Jobwork (all sizes)"), "+ " + moneyP(st.jobworkP), "plus", kgStr(st.recvG) + ' kg');
    html += stLine(L("ઉપડ (આ મહિને, આપમેળે)", "Upad (this month, auto)"), "− " + moneyP(st.upadP), "minus", L("એન્ટ્રી: ", "entries: ") + upN);
    html += stLine(L("ઘટ", "Ghat"), "− " + moneyP(st.ghatP), "minus", kgStr(st.ghatKg * 1000n, 0) + ' kg (' + st.ghatPct + '%) × ' + rateStr(st.yarnPriceP) + '/kg');
    html += stLine(L("TDS (માલિક દાખલ કરે)", "TDS (owner-entered)"), "− " + moneyP(st.tdsP), "minus", L("સૂચન 1%: ", "1% suggestion: ") + jobHint);
    html += stLine(L("લોન કપાત (માલિક નક્કી કરે)", "Loan deduction (owner-decided)"), "− " + moneyP(st.deductP), "minus", L("બાકી લોન પછી: ", "loan left after: ") + moneyP(loanClosing > 0n ? loanClosing : 0n));
    html += '<div class="bill-total"><span class="lab"><b>' + L("ચૂકવવાપાત્ર", "Net Payable") + '</b></span><span class="val num">' + moneyP(st.payable) + '</span></div>';
    html += stLine(L("ચૂકવ્યું (આ મહિને)", "Paid now"), "− " + moneyP(st.paid), "minus", "") + '</div>';
    html += '</div></div>';

    /* RIGHT — controls (per-size rates + yarn price + ghat + tds + loan + paid) */
    html += '<div class="card"><div class="card-head"><div class="ico tint-out">' + svg("spark") + '</div><div><h3>' + L("માલિક નિયંત્રણ & PDF", "Owner controls & PDF") + '</h3></div></div><div class="card-pad">';
    html += '<h4 style="font-size:13px;margin-bottom:8px">' + L("સાઇઝ પ્રમાણે રેટ (₹/kg)", "Rate per size (₹/kg)") + '</h4>';
    if (st.bySize.length) st.bySize.forEach(function (b) {
      html += '<div class="ctrl"><label>' + b.size + '" <span class="v" id="nr-' + b.size.replace(".", "_") + 'V">' + rateStr(b.rateP) + '</span> <small style="color:var(--muted)">' + kgStr(b.g) + ' kg</small></label><div class="field"><span class="pre">₹</span><input type="number" data-nsize="' + b.size + '" value="' + nSizeRate(p.id, mid, b.size) + '" min="0" step="0.5"><span class="suf">/kg</span></div></div>';
    });
    else html += '<div class="hint">' + L("પ્રોડક્ટ ઉમેરો (શીટમાં) પછી રેટ દેખાશે.", "Add products in a sheet, then rates appear here.") + '</div>';
    html += '<div class="nav-sep"></div>';
    html += '<div class="ctrl"><label>' + L("યાર્ન ભાવ (ઘટ માટે)", "Yarn price (for ghat)") + ' <span class="v" id="nYarnV">' + rateStr(st.yarnPriceP) + '</span></label><div class="field"><span class="pre">₹</span><input type="number" id="nYarn" value="' + st.pr.yarnPrice + '" min="0" step="1"><span class="suf">/kg</span></div></div>';
    html += '<div class="ctrl"><label>' + L("ઘટ %", "Ghat %") + ' <span class="v" id="nGhatV">' + st.ghatPct + '%</span></label><div class="field"><input type="number" id="nGhat" value="' + st.pr.ghatPct + '" min="0" step="0.5"><span class="suf">%</span></div><div class="hint">' + L("ઘટ = round(કુલ નિવાર × ઘટ%) પૂર્ણ kg × યાર્ન ભાવ", "Ghat = round(total niwar × ghat%) whole kg × yarn price") + '</div></div>';
    html += '<div class="ctrl"><label>' + L("TDS (₹, માલિક દાખલ કરે)", "TDS (₹, owner-entered)") + ' <span class="v" id="nTdsV">' + moneyP(st.tdsP) + '</span></label><div class="field"><span class="pre">₹</span><input type="number" id="nTds" value="' + Number(st.tdsP / 100n) + '" min="0" step="10"></div><div class="hint">' + L("1% સૂચન: ", "1% suggestion: ") + jobHint + '</div></div>';
    html += '<div class="ctrl"><label>' + L("લોન કપાત (આ મહિને)", "Loan deduction (this month)") + ' <span class="v" id="nDeductV">' + moneyP(st.deductP) + '</span></label><div class="field"><span class="pre">₹</span><input type="number" id="nDeduct" value="' + Number(st.deductP / 100n) + '" min="0" step="100"></div><div class="hint">' + L("લોન બાકી (ઓપનિંગ): ", "Loan outstanding (opening): ") + moneyP(loanOpen) + '</div></div>';
    html += '<div class="ctrl"><label>' + L("ચૂકવ્યું (આ મહિને)", "Paid this month") + ' <span class="v" id="nPaidV">' + moneyP(st.paid) + '</span></label><div class="field"><span class="pre">₹</span><input type="number" id="nPaid" value="' + Number(st.paid / 100n) + '" min="0" step="100"></div><div class="hint">' + L("બાકી રકમ કેરી ફોરવર્ડ.", "Remainder carries forward.") + '</div></div>';
    html += '<div class="nav-sep"></div><div style="display:grid;gap:10px"><button class="btn btn-wa btn-block" id="nWa">' + svg("wa") + ' ' + L("WhatsApp પર મોકલો", "Send on WhatsApp") + '</button><button class="btn btn-primary btn-block" id="nPdfCompany">' + svg("file") + ' ' + L("કંપની કોપી (PDF)", "Company Copy (PDF)") + '</button><button class="btn btn-gold btn-block" id="nPdfWorker">' + svg("send") + ' ' + L("પાર્ટી કોપી (PDF)", "Party Copy (PDF)") + '</button></div>';
    html += '</div></div></div>';

    /* niwar upad + loan (separate for this party) */
    html += '<div class="grid-2 mt">';
    html += '<div class="card"><div class="card-head"><div class="ico tint-upad">' + svg("wallet") + '</div><div><h3>' + L("નિવાર ઉપડ", "Niwar Upad") + ' <span class="en">' + monthName() + '</span></h3></div><div class="spacer"></div><button class="btn btn-primary btn-sm" data-nupadnew="1">' + svg("plus") + ' ' + L("ઉપડ", "Upad") + '</button></div><div class="table-scroll"><table class="data"><thead><tr><th>' + L("તારીખ", "Date") + '</th><th>' + L("નોંધ", "Note") + '</th><th style="text-align:right">' + L("રકમ", "Amount") + '</th><th style="width:84px"></th></tr></thead><tbody>';
    var nue = nUpadEntries(p.id, mid);
    nue.forEach(function (t) { html += '<tr><td>' + dmy(t.d) + '</td><td style="color:var(--ink-soft)">' + esc(t.note) + '</td><td style="text-align:right" class="num loan-give">+ ' + moneyP(rupToP(t.amt)) + '</td><td style="text-align:right;white-space:nowrap"><button class="icon-btn" data-nupadedit="' + t.id + '">' + svg("edit") + '</button> <button class="icon-btn" data-nupaddel="' + t.id + '">' + svg("trash") + '</button></td></tr>'; });
    if (!nue.length) html += '<tr><td colspan="4" style="text-align:center;color:var(--muted)">' + L("આ મહિને ઉપડ નથી.", "No upad this month.") + '</td></tr>';
    html += '</tbody><tfoot><tr class="tot"><td class="l" colspan="2">' + L("કુલ ઉપડ", "Total upad") + '</td><td style="text-align:right" class="num">' + moneyP(st.upadP) + '</td><td></td></tr></tfoot></table></div></div>';
    var nbal = nLoanBalanceP(p.id);
    html += '<div class="card"><div class="card-head"><div class="ico tint-out">' + svg("rupee") + '</div><div><h3>' + L("નિવાર લોન", "Niwar Loan") + '</h3></div><div class="spacer"></div><button class="btn btn-primary btn-sm" data-nloannew="1">' + svg("plus") + ' ' + L("લોન", "Loan") + '</button></div><div class="card-pad"><div class="bill-line"><span class="lab">' + L("બાકી લોન", "Loan outstanding") + '</span><span class="val num">' + moneyP(nbal) + '</span></div><div class="table-scroll" style="margin-top:8px"><table class="data"><thead><tr><th>' + L("તારીખ", "Date") + '</th><th>' + L("પ્રકાર", "Type") + '</th><th style="text-align:right">' + L("રકમ", "Amount") + '</th><th style="text-align:right">' + L("બાકી", "Balance") + '</th></tr></thead><tbody>';
    var nrun = 0n; (NLOANS[p.id] || []).slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; }).forEach(function (t) { var a = rupToP(t.amt); nrun += (t.type === "repay" ? -a : a); var typ = t.type === "loan" ? L("લોન આપી", "Loan given") : t.type === "topup" ? L("ટોપ-અપ", "Top-up") : L("વસૂલ", "Repayment"); html += '<tr><td>' + dmy(t.d) + '</td><td><span class="badge ' + (t.type === "repay" ? "badge-ok" : "badge-upad") + '">' + typ + '</span></td><td style="text-align:right" class="num ' + (t.type === "repay" ? "loan-repay" : "loan-give") + '">' + (t.type === "repay" ? "− " : "+ ") + moneyP(a) + '</td><td style="text-align:right;font-weight:700" class="num">' + moneyP(nrun) + '</td></tr>'; });
    if (!(NLOANS[p.id] || []).length) html += '<tr><td colspan="4" style="text-align:center;color:var(--muted)">' + L("કોઈ લોન નથી.", "No loan activity.") + '</td></tr>';
    html += '</tbody></table></div><div class="hint mt">' + L("લોન આ નિવાર પાર્ટી માટે અલગ છે; બિલમાંથી માલિક નક્કી કરે એટલી વસૂલ.", "Loan is separate for this niwar party; recovered from the bill as the owner decides.") + '</div></div></div>';
    html += '</div>';

    return html;
  }

  /* ---- Niwar gate-style sheet editor (multi-product + yarn + parat) ---- */
  function viewNiwarSheet() {
    var s = nSheetById(STATE.niwarSheetId);
    if (!s) { STATE.view = "niwar"; return viewNiwar(); }
    var p = nwById(s.partyId); var pname = (STATE.lang === "en" ? p.en : p.name);
    var mid = s.date.slice(0, 7);
    var sizeOpts = function (sel) { return NIWAR_SIZES.map(function (z) { return '<option value="' + z + '"' + (z === sel ? " selected" : "") + '>' + z + '"</option>'; }).join(""); };
    var html = '<div class="page-head row-between"><div class="row-left" style="display:flex;align-items:center;gap:10px"><div><h2>' + L("નિવાર ગેટ એન્ટ્રી", "Niwar Gate Entry") + '</h2><div class="sub">' + pname + ' · ' + dmy(s.date) + '</div></div></div>' +
      '<div style="display:flex;gap:8px"><button class="btn btn-ghost btn-sm" data-delnsheet="' + s.id + '">' + svg("trash") + ' ' + L("કાઢો", "Delete") + '</button><button class="btn btn-gold btn-sm" data-nsheetpdf="' + s.id + '">' + svg("file") + ' PDF</button></div></div>';

    /* header: party / date */
    html += '<div class="card"><div class="card-pad"><div class="form-grid">' +
      '<div class="fg"><label>' + L("પાર્ટી", "Party") + '</label><div class="field"><input value="' + esc(pname) + '" disabled></div></div>' +
      '<div class="fg"><label>' + L("તારીખ", "Date") + '</label><div class="field"><input type="date" data-nh="date" value="' + s.date + '"' + dateAttrs() + '></div></div>' +
      '</div></div></div>';

    /* product blocks — jobwork-style 3-digit grid, max 5 lines per size */
    html += '<div class="page-head" style="margin-bottom:10px"><div><h3 style="font-size:16px">' + L("પ્રોડક્ટ (નિવાર સાઇઝ)", "Products (niwar sizes)") + '</h3><div class="sub">' + L("સાઇઝ પસંદ કરો, પછી વજન ભરો — 3 આંકડા પછી આપમેળે આગળની લાઇને (વધુમાં વધુ 5 લાઇન).", "Pick a size, then enter weights — 3 digits auto-advance to the next line (max 5 lines).") + '</div></div><button class="btn btn-primary btn-sm" data-np-addprod="1">' + svg("plus") + ' ' + L("પ્રોડક્ટ ઉમેરો", "Add product") + '</button></div>';
    html += '<div class="grid-2">';
    (s.products || []).forEach(function (prod, pi) {
      html += '<div class="card"><div class="card-head"><div class="ico tint-brand">' + svg("roll") + '</div><div><h3 style="font-size:15px">' + L("સાઇઝ", "Size") + '</h3></div><div class="spacer"></div><div class="field" style="width:120px;margin:0"><select data-np-size="' + pi + '">' + sizeOpts(prod.size) + '</select></div><button class="icon-btn" data-np-delprod="' + pi + '" title="' + L("પ્રોડક્ટ કાઢો", "Remove product") + '" style="margin-left:8px">' + svg("trash") + '</button></div><div class="card-pad">';
      html += '<table class="data np-wtbl"><thead><tr><th style="width:30px">#</th><th style="text-align:right">' + L("વજન (kg, 3 આંકડા)", "Weight (kg, 3-digit)") + '</th></tr></thead><tbody>';
      for (var ri = 0; ri < NL_ROWS; ri++) {
        var v = (prod.lots[ri] != null) ? String(Number(prod.lots[ri] / 1000n)) : "";
        html += '<tr><td style="color:var(--muted)">' + (ri + 1) + '</td><td style="text-align:right"><input type="text" inputmode="numeric" maxlength="3" data-np-cell="' + pi + '-' + ri + '" value="' + v + '" class="num" style="width:110px;text-align:right"></td></tr>';
      }
      html += '</tbody><tfoot><tr class="tot"><td class="l">' + L("કુલ", "Total") + '</td><td style="text-align:right" class="num" id="npt-' + pi + '">' + kgStr(nProductG(prod)) + ' kg</td></tr></tfoot></table>';
      html += '</div></div>';
    });
    html += '</div>';

    /* parat (sent) + totals — yarn is clubbed into parat; closing = total niwar − parat */
    var sheetNiwar = nSheetNiwarG(s), sheetNet = sheetNiwar - (s.paratG || 0n);
    html += '<div class="card mt"><div class="card-head"><div class="ico tint-out">' + svg("send") + '</div><div><h3 style="font-size:15px">' + L("પરાત (મોકલ્યું) + કુલ", "Parat (sent) + totals") + '</h3></div></div><div class="card-pad">';
    html += '<div class="ctrl"><label>' + L("પરાત / મોકલ્યું (kg) — મેન્યુઅલ (યાર્ન સહિત બધું)", "Parat / sent (kg) — manual (everything incl. yarn)") + ' <span class="v" id="npar">' + kgStr(s.paratG || 0n) + ' kg</span></label><div class="field"><input type="number" class="num" style="text-align:right" data-np-parat="1" value="' + (Number(s.paratG || 0n) / 1000) + '" min="0" max="100000000" step="1"><span class="suf">kg</span></div><div class="hint">' + L("કુલ નિવાર − પરાત = આ શીટનું બેલેન્સ (વજન કેરી ફોરવર્ડ).", "Total niwar − parat = this sheet's balance (weight carried forward).") + '</div></div>';
    html += '<div class="weigh" style="margin-top:8px"><div class="wbox"><div class="k">' + L("કુલ નિવાર", "Total niwar") + '</div><div class="v num" id="nsn">' + kgStr(sheetNiwar) + '</div></div><div class="wbox ghati"><div class="k">' + L("પરાત (મોકલ્યું)", "Parat (sent)") + '</div><div class="v num" id="nsp">' + kgStr(s.paratG || 0n) + '</div></div><div class="wbox total"><div class="k">' + L("બેલેન્સ (નિવાર−પરાત)", "Balance (niwar−parat)") + '</div><div class="v num" id="nsnet">' + kgStr(sheetNet) + '</div></div></div>';
    html += '<div class="page-actions" style="margin-top:14px"><button class="btn btn-primary" data-go="niwar">' + svg("check") + ' ' + L("થઈ ગયું", "Done") + '</button></div>';
    html += '</div></div>';

    return html;
  }

  /* ---------------------------------------------------------------- UPAD (advances) */
  function viewUpad() {
    if (!WORKERS.length) return noWorkersView("ઉપડ", "Upad (Advances)");
    var w = worker(); var mid = STATE.month; var mi = monthIndexOf(mid);
    var rows = upadEntries(w.id, mid);
    var upTot = upadMP(w.id, mid);
    var earnP = billMonth(w.id, mid).EP;
    var s = settleM(w.id, mi);
    var allUpad = WORKERS.reduce(function (a, ww) { return a + upadMP(ww.id, mid); }, 0n);
    var html = demoStrip();
    html += '<div class="page-head row-between"><div><h2>' + L("ઉપડ (એડવાન્સ)", "Upad (Advances)") + '</h2><div class="sub">' + wNm(w) + ' · ' + monthName() + ' — ' + L("અઠવાડિક ઉપડ — બિલમાં આપમેળે કપાય", "weekly advances — auto-deducted in the bill") + '</div></div>' +
      '<button class="btn btn-primary" data-upadnew="1">' + svg("plus") + ' ' + L("ઉપડ એન્ટ્રી", "Add Upad Entry") + '</button></div>';
    html += '<div class="stat-grid">' +
      stat("tint-upad", "wallet", L("આ મહિનાનું ઉપડ", "Upad this month"), moneyP(upTot), "", wNm(w)) +
      stat("tint-in", "box", L("આ મહિનાની કમાણી", "Earnings this month"), moneyPw(earnP), "", L("મીટર×રેટ + ટેમ્પો", "metre×rate + transport")) +
      stat("tint-ok", "bill", L("ઉપડ પછી ચૂકવવાપાત્ર", "Payable after upad"), moneyP(s.payable), "", L("ઓપનિંગ સહિત", "incl. opening")) +
      stat("tint-brand", "users", L("બધા વર્કર ઉપડ", "All workers upad"), moneyPw(allUpad), "", L("આ મહિને કુલ", "this month total")) +
      '</div>';
    html += '<div class="card"><div class="card-head"><div class="ico tint-upad">' + svg("wallet") + '</div><div><h3>' + L("ઉપડ એન્ટ્રી", "Upad entries") + ' <span class="en">' + monthName() + '</span></h3></div><div class="spacer"></div><button class="btn btn-gold btn-sm" id="upadReport">' + svg("file") + ' ' + L("માસિક ઉપડ રિપોર્ટ PDF", "Monthly Upad Report PDF") + '</button></div>';
    html += '<div class="table-scroll"><table class="data"><thead><tr><th>' + L("તારીખ", "Date") + '</th><th>' + L("નોંધ", "Note") + '</th><th style="text-align:right">' + L("રકમ", "Amount") + '</th><th style="text-align:right">' + L("ચાલુ કુલ", "Running total") + '</th><th style="width:96px"></th></tr></thead><tbody>';
    var run = 0n;
    rows.forEach(function (t) { var a = rupToP(t.amt); run += a; html += '<tr><td>' + dmy(t.d) + '</td><td style="color:var(--ink-soft)">' + esc(t.note) + '</td><td style="text-align:right" class="num loan-give">+ ' + moneyP(a) + '</td><td style="text-align:right;font-weight:700" class="num">' + moneyP(run) + '</td><td style="text-align:right;white-space:nowrap"><button class="icon-btn" data-upadedit="' + t.id + '" title="' + L("ફેરફાર", "Edit") + '">' + svg("edit") + '</button> <button class="icon-btn" data-upaddel="' + t.id + '" title="' + L("કાઢો", "Delete") + '">' + svg("trash") + '</button></td></tr>'; });
    if (!rows.length) html += '<tr><td colspan="5" style="text-align:center;color:var(--muted)">' + L("આ મહિને કોઈ ઉપડ નથી.", "No upad this month.") + '</td></tr>';
    html += '</tbody>' + (rows.length ? '<tfoot><tr class="tot"><td class="l" colspan="2">' + L("કુલ ઉપડ (આ મહિને)", "Total upad (this month)") + '</td><td style="text-align:right" class="num">' + moneyP(upTot) + '</td><td colspan="2"></td></tr></tfoot>' : '') + '</table></div></div>';
    html += '<div class="hint mt">' + L("💡 ઉપડ હંમેશા ચાલુ મહિનાનું જ હોય. મહિનાના અંતે બિલિંગમાં આ કુલ ઉપડ આપમેળે કપાય; બાકી રકમ કેરી ફોરવર્ડ થાય. લોન અલગ છે.", "💡 Upad always belongs to the current month. At month-end it is auto-deducted in Billing; any remainder carries forward. Loans are kept separate.") + '</div>';
    return html;
  }

  function viewBilling() {
    if (!WORKERS.length) return noWorkersView("બિલિંગ", "Billing");
    var w = worker(); var mid = STATE.month; var mi = monthIndexOf(mid);
    var b = billMonth(w.id, mid); var bl = BILL[w.id][mid]; var s = settleM(w.id, mi);
    var loanOpen = loanOpeningBalanceP(w.id, mid), loanClosing = loanOpen - s.deduct;
    var html = demoStrip();
    html += '<div class="page-head"><h2>' + L("બિલિંગ અને PDF", "Billing & PDF") + '</h2>' +
      '<div class="sub">' + wNm(w) + ' · ' + monthName() + ' — ' + L("માલ બેલેન્સ (વજન) કેરી ફોરવર્ડ + આ મહિનાની ચુકવણી", "material (weight) balance carry-forward + this month's payment") + '</div></div>';
    html += '<div class="bill-grid">';
    /* left: ledger summary + statement */
    html += '<div class="card"><div class="card-head"><div class="ico tint-brand">' + svg("week") + '</div><div><h3>' + L("માસિક સ્ટેટમેન્ટ", "Monthly Statement") + '</h3></div></div><div class="card-pad">';
    html += '<div class="bill-line"><span class="lab">' + L("ગેટ શીટ (એન્ટ્રી)", "Gate sheets (entries)") + '</span><span class="val num">' + b.n + '</span></div>';
    html += '<div class="bill-line"><span class="lab">' + L("કુલ મીટર × રેટ", "Total metre × rate") + ' <small>' + numI(b.mtr) + ' × ' + rateStr(b.ratePaise) + '</small></span><span class="val num">' + moneyP(b.grossP) + '</span></div>';
    html += '<div class="bill-line plus"><span class="lab">' + L("ટેમ્પો / ભાડું (+)", "Transport (+)") + '</span><span class="val num">+ ' + moneyP(b.tempoP) + '</span></div>';
    var mat = matBalance(w.id, mi);
    /* MATERIAL (WEIGHT) BALANCE — carries forward in kg */
    html += '<div class="statement" style="margin-top:14px"><div class="settle-h">' + svg("scale") + ' ' + L("માલ બેલેન્સ (વજન, kg) — કેરી ફોરવર્ડ", "Material balance (weight, kg) — carry-forward") + '</div>';
    html += stLine(L("ઓપનિંગ બેલેન્સ (ગયા મહિનેથી)", "Opening balance (b/f)"), kgStr(mat.opening, 2) + ' kg', mat.opening < 0n ? "minus" : "", "");
    html += stLine(L("કોકડી + કલર (ક્લબ, મોકલ્યું)", "Kokdi + Color (clubbed, sent)"), "+ " + kgStr(mat.clubbedG, 2) + ' kg', "plus", "");
    html += stLine(L("કાપડ + ઘટ 3% (પાછું)", "Cloth + Ghati 3% (returned)"), "− " + kgStr(mat.clothGhatiG, 2) + ' kg', "minus", kgStr(b.kapadG) + ' + ' + kgStr(b.ghatiG, 2));
    html += '<div class="carry-row"><span class="lab">' + svg("chevR") + ' ' + L("બાકી બેલેન્સ → આવતા મહિને ઓપનિંગ", "Closing balance → next month opening") + '</span><span class="val num">' + kgStr(mat.closing, 2) + ' kg</span></div></div>';
    /* MONEY — settles this month (no money carry-forward) */
    html += '<div class="statement" style="margin-top:14px"><div class="settle-h">' + svg("bill") + ' ' + L("આ મહિનાની ચુકવણી (રૂપિયા)", "This month's payment (money)") + '</div>';
    html += stLine(L("આ મહિનાનું નેટ", "This month net"), "+ " + moneyP(s.E), "plus", L("મીટર×રેટ + ટેમ્પો", "metre×rate + transport"));
    html += stLine(L("ઉપડ (આ મહિને, આપમેળે)", "Upad (this month, auto)"), "− " + moneyP(s.upad), "minus", L("એન્ટ્રી: ", "entries: ") + upadEntries(w.id, mid).length + ' · <a href="#upad" class="lnk">' + L("ઉપડ સેક્શન", "Upad section") + '</a>');
    html += stLine(L("લોન કપાત (માલિક નક્કી કરે)", "Loan deduction (owner-decided)"), "− " + moneyP(s.deduct), "minus", L("બાકી લોન પછી: ", "loan left after: ") + moneyP(loanClosing > 0n ? loanClosing : 0n));
    html += '<div class="bill-total"><span class="lab"><b>' + L("ચૂકવવાપાત્ર", "Net Payable") + '</b></span><span class="val num">' + moneyP(s.payable) + '</span></div>';
    html += stLine(L("ચૂકવ્યું (આ મહિને)", "Paid now"), "− " + moneyP(s.paid), "minus", "");
    html += '<div class="page-actions"><button class="btn btn-soft btn-sm" data-go="loans">' + svg("rupee") + ' ' + L("લોન ખાતું", "Loan account") + '</button><button class="btn btn-soft btn-sm" data-go="yearend">' + svg("spark") + ' ' + L("વર્ષાંત", "Year-End") + '</button></div></div></div></div>';
    /* right: controls */
    html += '<div class="card"><div class="card-head"><div class="ico tint-out">' + svg("spark") + '</div><div><h3>' + L("માલિક નિયંત્રણ & PDF", "Owner controls & PDF") + '</h3></div></div><div class="card-pad">';
    html += '<div class="ctrl"><label>' + L("મીટર રેટ", "Rate / meter") + ' <span class="v" id="rateV">' + rateStr(b.ratePaise) + '</span></label><input type="range" id="rate" min="2" max="6" step="0.05" value="' + bl.rate + '"><div class="hint">₹2.00 – ₹6.00</div></div>';
    html += '<div class="ctrl"><label>' + L("ટેમ્પો / ભાડું", "Transport") + ' <span class="v" id="tempoV">' + moneyP(b.tempoP) + '</span></label><div class="field"><span class="pre">₹</span><input type="number" id="tempo" value="' + bl.tempo + '" min="0" step="10"></div></div>';
    html += '<div class="ctrl"><label>' + L("ઘટ", "Ghati") + ' <span class="v">' + bl.ghati + '%</span></label><div class="field"><input type="number" value="' + bl.ghati + '" disabled><span class="suf">' + L("ફિક્સ", "fixed") + '</span></div></div>';
    html += '<div class="weigh" style="margin-bottom:14px"><div class="wbox"><div class="k">' + L("કાપડ વજન", "Cloth Wt") + '</div><div class="v num">' + kgStr(b.kapadG) + '</div></div><div class="wbox ghati"><div class="k">' + L("ઘટ 3%", "Ghati 3%") + '</div><div class="v num">+' + kgStr(b.ghatiG, 2) + '</div></div><div class="wbox total"><div class="k">' + L("કુલ વજન", "Total Wt") + '</div><div class="v num">' + kgStr(b.clothG, 2) + '</div></div></div>';
    html += '<div class="nav-sep"></div>';
    html += '<div class="ctrl"><label>' + L("ઉપડ (આ મહિને, આપમેળે)", "Upad (this month, auto)") + ' <span class="v">' + moneyP(s.upad) + '</span></label><div class="field"><span class="pre">₹</span><input type="number" value="' + Number(s.upad / 100n) + '" disabled><span class="suf">' + L("ઉપડ સેક્શન", "Upad section") + '</span></div><div class="hint">' + L("ઉપડ એન્ટ્રી ", "Managed in the ") + '<a href="#upad" class="lnk">' + L("ઉપડ સેક્શનમાં", "Upad section") + '</a>' + L(" મેનેજ થાય — અહીં આપમેળે કપાય.", " — deducted here automatically.") + '</div></div>';
    html += '<div class="ctrl"><label>' + L("લોન કપાત (આ મહિને)", "Loan deduction (this month)") + ' <span class="v" id="deductV">' + moneyP(s.deduct) + '</span></label><div class="field"><span class="pre">₹</span><input type="number" id="deduct" value="' + Number(s.deduct / 100n) + '" min="0" step="100"></div><div class="hint">' + L("લોન બાકી (ઓપનિંગ): ", "Loan outstanding (opening): ") + moneyP(loanOpen) + '</div></div>';
    html += '<div class="ctrl"><label>' + L("ચૂકવ્યું (આ મહિને)", "Paid this month") + ' <span class="v" id="paidV">' + moneyP(s.paid) + '</span></label><div class="field"><span class="pre">₹</span><input type="number" id="paid" value="' + Number(s.paid / 100n) + '" min="0" step="100"></div><div class="hint">' + L("બાકી રકમ કેરી ફોરવર્ડ થશે.", "Remainder carries forward.") + '</div></div>';
    html += '<div class="nav-sep"></div><h4 style="font-size:14px;margin-bottom:4px">' + L("PDF અને શેર", "PDF & Share") + '</h4><p class="hint" style="margin-bottom:14px">' + L("PDF ડાઉનલોડ કરો અથવા WhatsApp પર સારાંશ મોકલો.", "Download a PDF or send a summary on WhatsApp.") + '</p>';
    html += '<div style="display:grid;gap:10px"><button class="btn btn-wa btn-block" id="waBill">' + svg("wa") + ' ' + L("WhatsApp પર મોકલો", "Send on WhatsApp") + '</button><button class="btn btn-primary btn-block" id="pdfCompany">' + svg("file") + ' ' + L("કંપની કોપી (PDF)", "Company Copy (PDF)") + '</button><button class="btn btn-gold btn-block" id="pdfWorker">' + svg("send") + ' ' + L("જોબ વર્કર કોપી (PDF)", "Worker Copy (PDF)") + '</button><button class="btn btn-ghost btn-block" id="pdfBoth">' + svg("dl") + ' ' + L("બંને કોપી", "Both copies") + '</button></div>';
    html += '</div></div></div>';
    return html;
  }
  function stLine(lab, val, cls, sub) { return '<div class="bill-line ' + (cls || "") + '"><span class="lab">' + lab + (sub ? ' <small>' + sub + '</small>' : '') + '</span><span class="val num">' + val + '</span></div>'; }

  /* ---------------------------------------------------------------- LOANS */
  function viewLoans() {
    if (!WORKERS.length) return noWorkersView("લોન એકાઉન્ટ", "Loan Accounts");
    var w = worker(); var txns = (LOANS[w.id] || []).slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    var bal = loanBalanceP(w.id), totalOut = WORKERS.reduce(function (a, ww) { return a + loanBalanceP(ww.id); }, 0n);
    var givenP = 0n, repaidP = 0n; (LOANS[w.id] || []).forEach(function (t) { if (t.type === "repay") repaidP += rupToP(t.amt); else givenP += rupToP(t.amt); });
    var html = demoStrip();
    html += '<div class="page-head row-between"><div><h2>' + L("લોન ખાતા", "Loan Accounts") + '</h2><div class="sub">' + wNm(w) + ' — ' + L("લોન આપો / વસૂલો, ટોપ-અપ, માસિક રિપોર્ટ", "give / recover, top-up, monthly report") + '</div></div>' +
      '<button class="btn btn-primary" data-loannew="1">' + svg("plus") + ' ' + L("લોન એન્ટ્રી", "Add Loan Entry") + '</button></div>';
    html += '<div class="stat-grid">' +
      stat("tint-upad", "rupee", L("વર્કરની બાકી લોન", "Worker outstanding"), moneyP(bal), "", wNm(w)) +
      stat("tint-in", "dl", L("કુલ આપ્યું", "Total given"), moneyPw(givenP), "", L("લોન + ટોપ-અપ", "loan + top-up")) +
      stat("tint-ok", "check", L("કુલ વસૂલ", "Total recovered"), moneyPw(repaidP), "", L("રિપેમેન્ટ", "repayments")) +
      stat("tint-brand", "users", L("બધા વર્કર્સ બાકી", "All workers"), moneyPw(totalOut), "", L("કંપની કુલ", "company total")) +
      '</div>';
    html += '<div class="card"><div class="card-head"><div class="ico tint-upad">' + svg("rupee") + '</div><div><h3>' + L("લોન વ્યવહાર", "Loan transactions") + '</h3></div><div class="spacer"></div><button class="btn btn-gold btn-sm" id="loanReport">' + svg("file") + ' ' + L("માસિક રિપોર્ટ PDF", "Monthly Report PDF") + '</button></div>';
    var canDelLoan = STATE.role === "admin";
    html += '<div class="table-scroll"><table class="data"><thead><tr><th>' + L("તારીખ", "Date") + '</th><th>' + L("પ્રકાર", "Type") + '</th><th>' + L("નોંધ", "Note") + '</th><th style="text-align:right">' + L("રકમ", "Amount") + '</th><th style="text-align:right">' + L("બાકી", "Balance") + '</th>' + (canDelLoan ? '<th class="act"></th>' : '') + '</tr></thead><tbody>';
    var run = 0n;
    txns.forEach(function (t) { var a = rupToP(t.amt); run += (t.type === "repay" ? -a : a); var typ = t.type === "loan" ? L("લોન આપી", "Loan given") : t.type === "topup" ? L("ટોપ-અપ", "Top-up") : L("વસૂલ", "Repayment"); html += '<tr><td>' + t.d.split("-").reverse().join("/") + '</td><td><span class="badge ' + (t.type === "repay" ? "badge-ok" : "badge-upad") + '">' + typ + '</span></td><td style="color:var(--ink-soft)">' + esc(t.note) + '</td><td style="text-align:right" class="num ' + (t.type === "repay" ? "loan-repay" : "loan-give") + '">' + (t.type === "repay" ? "− " : "+ ") + moneyP(a) + '</td><td style="text-align:right;font-weight:700" class="num">' + moneyP(run) + '</td>' + (canDelLoan ? '<td class="act"><button class="icon-btn" data-delloan="' + t.id + '" title="' + L("કાઢો", "Delete") + '">' + svg("trash") + '</button></td>' : '') + '</tr>'; });
    if (!txns.length) html += '<tr><td colspan="' + (canDelLoan ? 6 : 5) + '" style="text-align:center;color:var(--muted)">' + L("કોઈ લોન નથી.", "No loan activity.") + '</td></tr>';
    html += '</tbody></table></div></div>';
    html += '<div class="hint mt">' + L("💡 લોન બાકી માસિક બિલમાંથી (બિલિંગ સ્ક્રીન) માલિક નક્કી કરે એટલી વસૂલ થાય.", "💡 Loan is recovered from the monthly bill by the amount the owner sets on the Billing screen.") + '</div>';
    return html;
  }

  /* ---------------------------------------------------------------- YEAR-END */
  function viewYearEnd() {
    if (!WORKERS.length) return noWorkersView("વર્ષાંત", "Year-End");
    var w = worker(); var ye = yearEnd(w.id); var g = ye.ghati; var actualPct = (g.actualBP / 100).toFixed(2);
    var html = demoStrip();
    html += '<div class="page-head"><h2>' + L("વર્ષાંત સેટલમેન્ટ (દિવાળી)", "Year-End Settlement (Diwali)") + '</h2><div class="sub">' + wNm(w) + ' — ' + L("લોન + ઘટ + કેરી ફોરવર્ડ એકસાથે.", "loan + ghati + carry-forward, together.") + '</div></div>';
    html += '<div class="demo-strip" style="background:linear-gradient(90deg,var(--brand-050),#fff);border-color:#cdd3f0;border-left-color:var(--brand)">' + svg("info") + '<span>' + L("<b>નોંધ:</b> અહીં 3 મહિનાનો ડેટા બતાવ્યો છે. પૂરું વર્ષ દિવાળીથી દિવાળી 12 મહિના ચાલે.", "<b>Note:</b> 3 months of data are shown here. A full year runs 12 months, Diwali to Diwali.") + '</span></div>';
    html += '<div class="grid-2">';
    html += '<div class="card"><div class="card-head"><div class="ico tint-upad">' + svg("rupee") + '</div><div><h3>' + L("1. લોન સેટલમેન્ટ", "1. Loan settlement") + '</h3></div></div><div class="card-pad">' +
      stLine(L("વર્ષ દરમિયાન વસૂલ", "Recovered during year"), moneyP(recoveredThisYear(w.id)), "", "") +
      '<div class="bill-total"><span class="lab"><b>' + L("બાકી લોન", "Loan remaining") + '</b></span><span class="val num">' + moneyP(ye.loanRem) + '</span></div>' +
      '<div class="hint">' + (ye.loanRem > 0n ? L("દિવાળીએ વસૂલ અથવા આગળ વધારે.", "At Diwali: recover or carry on.") : L("લોન ભરાઈ ગઈ.", "Loan cleared.")) + '</div></div></div>';
    html += '<div class="card"><div class="card-head"><div class="ico tint-out">' + svg("scale") + '</div><div><h3>' + L("2. ઘટ રિકન્સિલિએશન", "2. Ghati reconciliation") + '</h3></div></div><div class="card-pad">' +
      '<div class="weigh" style="margin-bottom:12px"><div class="wbox"><div class="k">' + L("અપાયેલ", "Given") + '</div><div class="v num">3.00%</div></div><div class="wbox ghati"><div class="k">' + L("ખરેખર સરેરાશ", "Actual avg") + '</div><div class="v num">' + actualPct + '%</div></div><div class="wbox total"><div class="k">' + L("તફાવત", "Diff") + '</div><div class="v num">' + ((300 - g.actualBP) / 100).toFixed(2) + '%</div></div></div>' +
      stLine(L("વાર્ષિક કાપડ વજન", "Annual cloth weight"), kgStr(g.annual, 1) + " kg", "", "") +
      stLine(L("ઘટ તફાવત વજન", "Ghati difference"), kgStr(g.diffG, 2) + " kg", "", "× " + moneyP(g.rateP) + "/kg") +
      '<div class="bill-total"><span class="lab"><b>' + (g.settleP >= 0n ? L("માલિક વર્કરને આપે", "Owner pays worker") : L("માલિક વસૂલ કરે", "Owner recovers")) + '</b></span><span class="val num">' + moneyP(g.settleP < 0n ? -g.settleP : g.settleP) + '</span></div>' +
      '<div class="ctrl" style="margin-top:12px"><label>' + L("ખરેખર સરેરાશ ઘટ %", "Actual average ghati %") + ' <span class="v" id="agV">' + actualPct + '%</span></label><div class="field"><input type="number" id="ag" value="' + actualPct + '" min="0" max="5" step="0.05"><span class="suf">%</span></div></div>' +
      '<div class="ctrl"><label>' + L("ઘટ દર (₹/kg)", "Ghati rate (₹/kg)") + ' <span class="v" id="grV">' + moneyP(g.rateP) + '</span></label><div class="field"><span class="pre">₹</span><input type="number" id="gr" value="' + GHATI_RATE.v + '" min="0" step="5"></div></div></div></div>';
    html += '</div>';
    html += '<div class="card mt"><div class="card-head"><div class="ico tint-brand">' + svg("bill") + '</div><div><h3>' + L("3. આખરી દિવાળી સેટલમેન્ટ", "3. Final Diwali settlement") + '</h3></div></div><div class="card-pad">' +
      stLine(L("ઘટ સેટલમેન્ટ", "Ghati settlement"), (g.settleP >= 0n ? "+ " : "− ") + moneyP(g.settleP < 0n ? -g.settleP : g.settleP), g.settleP >= 0n ? "plus" : "minus", "") +
      stLine(L("બાકી લોન", "Loan remaining"), "− " + moneyP(ye.loanRem), "minus", "") +
      stLine(L("માલ બેલેન્સ (વજન — માહિતી)", "Material balance (weight — info)"), kgStr(ye.matClose, 2) + ' kg', "", L("વર્ષાંતે બાકી માલ", "material still out at year-end")) +
      '<div class="bill-total" style="background:linear-gradient(100deg,var(--brand-700),var(--brand));color:#fff;padding:16px 18px;border-radius:var(--r-md);margin-top:8px"><span class="lab" style="opacity:.9">' + (ye.netToWorker >= 0n ? L("માલિક વર્કરને ચૂકવે", "Owner PAYS worker") : L("માલિક વસૂલ કરે", "Owner RECOVERS")) + '</span><span class="val num" style="font-size:26px">' + moneyP(ye.netToWorker < 0n ? -ye.netToWorker : ye.netToWorker) + '</span></div>' +
      '<div class="page-actions"><button class="btn btn-gold" id="yePdf">' + svg("file") + ' ' + L("સેટલમેન્ટ PDF", "Settlement PDF") + '</button></div></div></div>';
    html += '<div class="card mt"><div class="card-head"><div class="ico tint-ok">' + svg("users") + '</div><div><h3>' + L("બધા વર્કર્સ — વર્ષાંત", "All workers — year-end") + '</h3></div></div><div class="table-scroll"><table class="data"><thead><tr><th>' + L("જોબ વર્કર", "Job Worker") + '</th><th style="text-align:right">' + L("બાકી લોન", "Loan") + '</th><th style="text-align:right">' + L("ઘટ", "Ghati") + '</th><th style="text-align:right">' + L("માલ (kg)", "Material (kg)") + '</th><th style="text-align:right">' + L("ચોખ્ખું", "Net") + '</th></tr></thead><tbody>';
    WORKERS.forEach(function (ww) { var y = yearEnd(ww.id); html += '<tr><td><b>' + (STATE.lang === "en" ? ww.en : ww.name) + '</b></td><td style="text-align:right" class="num">' + moneyPw(y.loanRem) + '</td><td style="text-align:right" class="num ' + (y.ghati.settleP >= 0n ? "loan-repay" : "loan-give") + '">' + (y.ghati.settleP >= 0n ? "+" : "−") + moneyPw(y.ghati.settleP < 0n ? -y.ghati.settleP : y.ghati.settleP) + '</td><td style="text-align:right" class="num">' + kgStr(y.matClose, 1) + '</td><td style="text-align:right;font-weight:800" class="num" style="color:' + (y.netToWorker >= 0n ? "var(--ok)" : "var(--upad)") + '">' + (y.netToWorker >= 0n ? "" : "−") + moneyPw(y.netToWorker < 0n ? -y.netToWorker : y.netToWorker) + '</td></tr>'; });
    html += '</tbody></table></div></div>';
    html += '<div class="hint mt">' + L("💡 ચોખ્ખું = કેરી ફોરવર્ડ + ઘટ − બાકી લોન. લીલું = માલિક ચૂકવે, લાલ = વસૂલ કરે.", "💡 Net = carry-forward + ghati − loan. Green = owner pays, red = owner recovers.") + '</div>';
    return html;
  }

  /* ---------------------------------------------------------------- WORKERS */
  function viewWorkers() {
    var html = demoStrip();
    html += '<div class="page-head row-between"><div><h2>' + L("જોબ વર્કર્સ", "Job Workers") + '</h2><div class="sub">' + L("જોબ વર્કરની યાદી અને રેટ.", "Job worker list and rates.") + '</div></div><button class="btn btn-primary" data-addworker="1">' + svg("plus") + ' ' + L("જોબ વર્કર ઉમેરો", "Add Job Worker") + '</button></div>';
    html += '<div class="card"><div class="tbl-toolbar"><span class="tbl-search-wrap">' + svg("search") + '<input id="workerSearch" class="tbl-search" type="search" autocomplete="off" placeholder="' + L("નામ, ફોન કે કાપડ શોધો…", "Search name, phone or cloth…") + '"></span><span class="tbl-count" id="workerCount">' + WORKERS.length + ' ' + L("વર્કર", "workers") + '</span></div><div class="table-scroll"><table class="data"><thead><tr><th>' + L("જોબ વર્કર", "Job Worker") + '</th><th>' + L("કાપડ", "Cloth") + '</th><th>' + L("ફોન", "Phone") + '</th><th style="text-align:right">' + L("રેટ", "Rate") + '</th><th style="text-align:right">' + monthName() + ' ' + L("મીટર", "Mtr") + '</th><th style="text-align:right">' + L("લોન બાકી", "Loan") + '</th><th></th></tr></thead><tbody>';
    WORKERS.forEach(function (w) { var ini = w.en.split(" ").map(function (x) { return x[0]; }).slice(0, 2).join(""); var mt = billMonth(w.id, STATE.month).mtr; html += '<tr data-wsearch="' + esc(((w.en || "") + " " + (w.name || "") + " " + (w.phone || "") + " " + (w.cloth || "")).toLowerCase()) + '"><td><div style="display:flex;align-items:center;gap:11px"><span class="avatar" style="background:' + w.color + '">' + ini + '</span><div><b>' + (STATE.lang === "en" ? w.en : w.name) + '</b></div></div></td><td>' + w.cloth + '</td><td class="num" style="color:var(--ink-soft)">' + w.phone + '</td><td style="text-align:right" class="num">' + rateStr(rupToP(w.rate)) + '</td><td style="text-align:right" class="num">' + numI(mt) + '</td><td style="text-align:right" class="num">' + moneyPw(loanBalanceP(w.id)) + '</td><td style="text-align:right;white-space:nowrap"><button class="btn btn-soft btn-sm" data-editworker="' + w.id + '">' + svg("edit") + '</button> <button class="btn btn-soft btn-sm" data-delworker="' + w.id + '">' + svg("trash") + '</button> <button class="btn btn-soft btn-sm" data-openworker="' + w.id + '">' + svg("chevR") + ' ' + L("ખોલો", "Open") + '</button></td></tr>'; });
    html += '<tr id="wNoMatch" style="display:none"><td colspan="7" style="text-align:center;color:var(--muted);padding:18px">' + L("કોઈ મેળ ખાતો વર્કર નથી.", "No matching worker.") + '</td></tr>';
    html += '</tbody></table></div></div>';
    return html;
  }

  /* ================================================================
     USER MANAGEMENT  —  admin-only. Manages the login accounts and their
     roles in the Firestore `users/{uid}` documents (the same docs the
     security rules read). A new account is created on a SECONDARY Firebase
     app so the signed-in admin's own session is never disturbed. Enabling
     /disabling, role changes and "remove access" only touch the role doc;
     the Firebase Auth login itself is managed in the Firebase console.
     ================================================================ */
  var UM = { users: null, loading: false, err: "", maxUsers: 10, sel: null };
  var UM_DEFAULT_MAX = 10;
  function umDb()   { return (window.GJAuth && window.GJAuth.enabled && window.GJAuth.db) ? window.GJAuth.db : null; }
  function umAuth() { return (window.GJAuth && window.GJAuth.enabled && window.GJAuth.auth) ? window.GJAuth.auth : null; }
  function umLive() { return !!umDb(); }
  function umSelf(uid) { return !!(window.GJAuth && window.GJAuth.user && window.GJAuth.user.uid === uid); }

  /* Live watch on the signed-in user's own account doc: if the admin disables or
     removes them, they are signed out at once; role/permission changes apply live
     (sidebar + access update without a reload). First snapshot is the baseline. */
  var _selfUnsub = null, _selfKicked = false;
  function startSelfWatch() {
    if (_selfUnsub || !umDb() || !(window.GJAuth && window.GJAuth.user && window.GJAuth.user.uid)) return;
    var uid = window.GJAuth.user.uid, first = true;
    try {
      _selfUnsub = umDb().collection("users").doc(uid).onSnapshot(function (snap) {
        var d = snap.exists ? (snap.data() || {}) : null;
        if (first) { first = false; return; }               // baseline — already applied at login
        if (!d || d.active === false || !d.role) {           // disabled or access removed → sign out
          if (_selfKicked) return; _selfKicked = true;
          toast(L("તમારી એક્સેસ બદલાઈ — ફરી સાઇન ઇન કરો", "Your access changed — please sign in again"), "info");
          setTimeout(function () { try { window.GJAuth.logout(); } catch (e) {} }, 1400);
          return;
        }
        var roleChanged = d.role !== window.GJAuth.user.role;
        window.GJAuth.user.perms = d.perms || null;
        window.GJAuth.user.role = d.role;
        if (roleChanged) STATE.role = d.role;
        if (!viewAllowed(STATE.view)) STATE.view = (STATE.role === "supervisor" ? "gate" : "dashboard");
        buildShell(); try { if (window.GJAuth && window.GJAuth.renderProfile) window.GJAuth.renderProfile(); } catch (e) {} render();
      }, function () {});
    } catch (e) {}
  }
  function stopSelfWatch() { if (_selfUnsub) { try { _selfUnsub(); } catch (e) {} _selfUnsub = null; } }
  function umFind(uid) { return (UM.users || []).filter(function (u) { return u.uid === uid; })[0]; }

  function loadUsers() {
    var db = umDb(); if (!db) return;
    UM.loading = true; UM.err = "";
    // read the user-limit config (meta/appconfig) alongside the user list
    db.collection("meta").doc("appconfig").get().then(function (snap) {
      var c = snap.exists ? (snap.data() || {}) : null;
      UM.maxUsers = (c && typeof c.maxUsers === "number" && c.maxUsers > 0) ? c.maxUsers : UM_DEFAULT_MAX;
    }).catch(function () { UM.maxUsers = UM_DEFAULT_MAX; });
    db.collection("users").get().then(function (snap) {
      var arr = [];
      snap.forEach(function (d) { var v = d.data() || {}; arr.push({ uid: d.id, email: v.email || "", role: v.role || "", name: v.name || "", active: v.active !== false, perms: v.perms || null }); });
      arr.sort(function (a, b) { return (a.name || a.email || a.uid).localeCompare(b.name || b.email || b.uid); });
      UM.users = arr; UM.loading = false;
      if (STATE.view === "usermgmt") render();
    }).catch(function (e) {
      UM.loading = false; UM.err = (e && (e.code || e.message)) || "load failed";
      if (STATE.view === "usermgmt") render();
    });
  }
  // How many modules a supervisor currently has (for the row summary).
  function umGrantedCount(u) {
    if (u.role === "admin") return PERM_MODULES.length;
    var p = u.perms, n = 0;
    PERM_MODULES.forEach(function (id) {
      if (id === "dashboard") { n++; return; }                       // always on
      if (p ? p[id] === true : STAFF_DEFAULT.indexOf(id) > -1) n++;
    });
    return n;
  }
  function umStaffGrantableCount() { return PERM_MODULES.length; }

  function umNonAdminCount() { return UM.users ? UM.users.filter(function (u) { return u.role !== "admin"; }).length : 0; }

  // left column — one selectable user row
  function umUserListRow(u) {
    var on = (UM.sel === u.uid);
    var ini = esc((u.name || u.email || "?").trim().slice(0, 2).toUpperCase());
    var sub = u.role === "admin" ? L("બધું", "Everything") : (umGrantedCount(u) + "/" + umStaffGrantableCount() + " " + L("મોડ્યુલ", "modules") + (u.active ? "" : " · " + L("બંધ", "Disabled")));
    var tag = u.role === "admin" ? L("એડમિન", "Admin") : L("યુઝર", "User");
    return '<button type="button" class="um-user' + (on ? " on" : "") + (u.active ? "" : " um-user-off") + '" data-umsel="' + u.uid + '">' +
      '<span class="avatar" style="background:var(--brand)">' + ini + '</span>' +
      '<span class="um-user-meta"><span class="um-user-name">' + esc(u.name || "—") + (umSelf(u.uid) ? ' <span class="um-you">(' + L("તમે", "you") + ')</span>' : "") + '</span><span class="um-user-sub">' + sub + '</span></span>' +
      '<span class="um-user-tag' + (u.role === "admin" ? " um-tag-admin" : "") + '">' + tag + '</span></button>';
  }

  // right column — bottom action footer for the selected user (ref: Screenshot 2)
  // Text links on the left (Edit · Reset · Delete), an Active toggle on the right.
  function umAccessFoot(u) {
    var self = umSelf(u.uid);
    var links = '<button type="button" class="um-link" data-umedit="' + u.uid + '">' + svg("edit") + '<span>' + L("વિગતો ફેરફાર", "Edit details") + '</span></button>' +
      '<span class="um-link-sep" aria-hidden="true">·</span>' +
      '<button type="button" class="um-link" data-umreset="' + u.uid + '">' + svg("key") + '<span>' + L("પાસવર્ડ રીસેટ લિંક", "Send password reset") + '</span></button>';
    if (!self) links += '<span class="um-link-sep" aria-hidden="true">·</span>' +
      '<button type="button" class="um-link um-link-danger" data-umremove="' + u.uid + '">' + svg("trash") + '<span>' + L("યુઝર કાઢો", "Delete user") + '</span></button>';
    var active = self ? '<span class="um-active um-active-self">' + svg("shield") + ' ' + L("તમારું એકાઉન્ટ", "Your account") + '</span>'
      : '<label class="um-active"><span class="um-active-lbl">' + L("સક્રિય", "Active") + '</span>' +
        '<span class="switch"><input type="checkbox" data-umactive="' + u.uid + '"' + (u.active ? " checked" : "") + '><span class="slider"></span></span></label>';
    return '<div class="um-foot-bar"><div class="um-foot-links">' + links + '</div>' + active + '</div>';
  }

  // right column — inline module toggles for the selected user
  function umAccessPanel(u) {
    if (!u) return '<div class="card um-access"><div class="card-pad"><div class="hint">' + L("ડાબી બાજુથી યુઝર પસંદ કરો.", "Select a user on the left.") + '</div></div></div>';
    var adminFull = (u.role === "admin");
    var head = '<div class="um-access-head"><div class="um-access-h"><div class="um-access-title">' + L("એક્સેસ — ", "Access for ") + esc(u.name || u.email) + ' <span class="um-dot">·</span> ' + (adminFull ? L("એડમિન", "Admin") : L("સુપરવાઇઝર", "Supervisor")) + '</div>' +
      '<div class="um-access-sub">' + (adminFull ? L("આ યુઝર પાસે દરેક મોડ્યુલ છે.", "Every module is on for this user.") : L("આ યુઝર માટે મોડ્યુલ ચાલુ/બંધ કરો.", "Turn modules on or off for this user.")) + '</div></div></div>';
    var rows = PERM_MODULES.map(function (id) {
      var n = NAV.filter(function (x) { return x.id === id; })[0]; if (!n) return "";
      var locked = (id === "dashboard");
      var on = adminFull ? true : (locked ? true : (u.perms ? u.perms[id] === true : STAFF_DEFAULT.indexOf(id) > -1));
      var dis = adminFull || locked;   // admin = everything on; dashboard always on; all others toggleable
      var subtxt = (adminFull || !locked) ? "" : '<span class="um-mod-sub">' + L("હંમેશા ચાલુ", "Always on") + '</span>';
      return '<div class="um-mod' + (dis && !adminFull ? " um-mod-dis" : "") + '"><span class="um-mod-ic tint-ok">' + svg(n.ic) + '</span>' +
        '<span class="um-mod-name">' + (STATE.lang === "en" ? n.e : n.g) + subtxt + '</span>' +
        '<label class="switch"><input type="checkbox" data-ptoggle="' + id + '" data-puser="' + u.uid + '"' + (on ? " checked" : "") + (dis ? " disabled" : "") + '><span class="slider"></span></label></div>';
    }).join("");
    return '<div class="card um-access"><div class="card-pad">' + head + '<div class="um-mod-list">' + rows + '</div>' + umAccessFoot(u) + '</div></div>';
  }

  // flip one module for a supervisor and save immediately
  function umTogglePerm(uid, id, on) {
    var u = umFind(uid); if (!u || u.role === "admin" || id === "dashboard") return;
    var perms = {};
    PERM_MODULES.forEach(function (m) {
      if (m === "dashboard") { perms[m] = true; return; }
      perms[m] = u.perms ? (u.perms[m] === true) : (STAFF_DEFAULT.indexOf(m) > -1);
    });
    perms[id] = !!on;
    u.perms = perms;                        // optimistic
    render();
    umDb().collection("users").doc(uid).set({ role: u.role, active: u.active, name: u.name, email: u.email, perms: perms })
      .then(function () { toast(L("સેવ થયું", "Saved"), "ok"); })
      .catch(function (e) { toast((e && (e.code || e.message)) || L("સેવ નિષ્ફળ", "Save failed"), "info"); loadUsers(); });
  }

  function viewUserMgmt() {
    var html = '<div class="page-head row-between"><div><h2>' + L("યુઝર મેનેજમેન્ટ", "User Management") + '</h2><div class="sub">' + L("એકાઉન્ટ, ભૂમિકા અને મોડ્યુલ પરમિશન.", "Accounts, roles and module permissions.") + '</div></div>' +
      (umLive() ? '<div style="display:flex;gap:10px"><button class="btn btn-primary" data-umadd="1">' + svg("plus") + ' ' + L("યુઝર ઉમેરો", "Add user") + '</button></div>' : '') + '</div>';
    if (!umLive()) { html += '<div class="card"><div class="card-pad"><div class="hint">' + L("યુઝર મેનેજમેન્ટ લાઇવ મોડમાં (Firebase સાઇન-ઇન) ઉપલબ્ધ છે.", "User management is available in live mode (signed in to Firebase).") + '</div></div></div>'; return html; }
    if (UM.loading || UM.users === null) { html += '<div class="card"><div class="card-pad"><div class="hint">' + L("લોડ થઈ રહ્યું છે…", "Loading…") + '</div></div></div>'; return html; }
    if (UM.err) { html += '<div class="card"><div class="card-pad"><div class="hint" style="color:var(--upad)">' + L("લોડ ન થયું: ", "Couldn't load: ") + esc(UM.err) + '</div></div></div>'; return html; }

    // pick the selected user: keep current, else self, else first
    var sel = (UM.sel && umFind(UM.sel)) || umFind((window.GJAuth.user || {}).uid) || UM.users[0];
    if (sel) UM.sel = sel.uid;

    html += '<h2 class="um-h2">' + L("યુઝર અને એક્સેસ", "Users & access") + '</h2>';

    html += '<div class="um-split">';
    html += '<div class="card um-users"><div class="card-head"><b>' + L("યુઝર", "Users") + '</b></div><div class="um-user-list">' + UM.users.map(umUserListRow).join("") + '</div></div>';
    html += umAccessPanel(sel);
    html += '</div>';
    return html;
  }

  /* ---- user-limit editing (meta/appconfig) ---- */
  function umEditLimit() {
    var body = fRow(L("કુલ અનુમત નોન-એડમિન યુઝર", "Allowed (non-admin) users"), fInput("umMax", UM.maxUsers, 'type="number" min="1" max="100" step="1" inputmode="numeric"')) +
      '<div class="msg" style="margin:-7px 0 2px">' + L("અત્યારે વપરાયા: ", "Currently used: ") + umNonAdminCount() + '</div>';
    showModal("users", L("યુઝર મર્યાદા", "User limit"), L("કેટલા (નોન-એડમિન) યુઝર અનુમત છે.", "How many (non-admin) users are allowed."), body, umSaveLimit);
  }
  function umSaveLimit() {
    var n = parseInt(fVal("#umMax"), 10);
    if (isNaN(n) || n < 1) { toast(L("માન્ય સંખ્યા દાખલ કરો", "Enter a valid number"), "info"); return; }
    if (n < umNonAdminCount()) { toast(L("મર્યાદા હાલના યુઝર કરતાં ઓછી ન હોય", "Limit can't be below the current user count"), "info"); return; }
    closeModal();
    umDb().collection("meta").doc("appconfig").set({ maxUsers: n }, { merge: true }).then(function () { UM.maxUsers = n; toast(L("મર્યાદા સેવ થઈ", "Limit saved"), "ok"); render(); })
      .catch(function (e) {
        var code = e && e.code;
        var msg = code === "permission-denied"
          ? L("સેવ બ્લોક થઈ — Firestore રૂલ્સ પબ્લિશ કરો", "Save blocked — publish the Firestore rules in the Firebase console")
          : ((e && (e.code || e.message)) || L("સેવ નિષ્ફળ", "Save failed"));
        toast(msg, "info");
      });
  }

  function umAddForm() {
    var body =
      fRow(L("નામ", "Name"), fInput("umName", "", 'placeholder="' + L("પૂરું નામ", "Full name") + '"')) +
      fRow(L("ઈમેલ", "Email"), fInput("umEmail", "", 'type="email" autocomplete="off" placeholder="name@example.com"')) +
      fRow(L("પાસવર્ડ", "Password"), fInput("umPass", "", 'type="text" autocomplete="off" placeholder="' + L("ઓછામાં ઓછા 6 અક્ષર", "At least 6 characters") + '"')) +
      '<div class="fg fg-full"><label>' + L("ભૂમિકા", "Role") + '</label><div class="field"><select id="umRole"><option value="supervisor">' + L("સુપરવાઇઝર — ગેટ અને પેકેજિંગ", "Supervisor — Gate & Packaging") + '</option><option value="admin">' + L("એડમિન — સંપૂર્ણ એક્સેસ", "Admin — Full access") + '</option></select></div></div>';
    showModal("shield", L("યુઝર ઉમેરો", "Add User"), L("નવું લોગિન એકાઉન્ટ અને ભૂમિકા.", "New login account and role."), body, umCreate);
  }

  function umCreate() {
    var email = fVal("#umEmail").trim().toLowerCase(), pass = fVal("#umPass"), name = fVal("#umName").trim(), role = fVal("#umRole") === "admin" ? "admin" : "supervisor";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast(L("માન્ય ઈમેલ દાખલ કરો", "Enter a valid email"), "info"); return; }
    if (!pass || pass.length < 6) { toast(L("પાસવર્ડ ઓછામાં ઓછા 6 અક્ષર", "Password must be at least 6 characters"), "info"); return; }
    // new supervisors start with all staff modules granted; admins get full access
    var perms = null;
    if (role === "supervisor") { perms = {}; PERM_MODULES.forEach(function (id) { perms[id] = STAFF_DEFAULT.indexOf(id) > -1; }); }
    var cfg = window.__FIREBASE_CONFIG || {};
    var secApp;
    try { secApp = (firebase.apps || []).filter(function (a) { return a.name === "userCreator"; })[0] || firebase.initializeApp(cfg, "userCreator"); }
    catch (e) { try { secApp = firebase.app("userCreator"); } catch (e2) { toast(L("બન્યું નહીં", "Couldn't start"), "info"); return; } }
    var secAuth = secApp.auth();
    closeModal(); toast(L("યુઝર બની રહ્યો છે…", "Creating user…"), "info");
    secAuth.createUserWithEmailAndPassword(email, pass).then(function (cred) {
      var uid = cred.user.uid;
      var doc = { role: role, active: true, name: name || email, email: email };
      if (perms) doc.perms = perms;
      return umDb().collection("users").doc(uid).set(doc);
    }).then(function () { return secAuth.signOut(); }).then(function () {
      toast(L("યુઝર ઉમેરાયો", "User added"), "ok"); loadUsers();
    }).catch(function (e) {
      var code = e && e.code;
      var msg = code === "auth/email-already-in-use" ? L("આ ઈમેલ પહેલેથી વપરાય છે", "This email is already in use")
        : code === "auth/weak-password" ? L("પાસવર્ડ નબળો છે", "Password is too weak")
        : code === "auth/invalid-email" ? L("અમાન્ય ઈમેલ", "Invalid email")
        : code === "permission-denied" ? L("ભૂમિકા સેવ બ્લોક થઈ — Firestore રૂલ્સ પબ્લિશ કરો", "Role write blocked — publish the Firestore rules")
        : ((e && e.message) || L("યુઝર બન્યો નહીં", "Couldn't create user"));
      toast(msg, "info");
      try { secAuth.signOut(); } catch (x) {}
    });
  }

  function umEditForm(uid) {
    var u = umFind(uid); if (!u) return; var self = umSelf(uid);
    var body =
      fRow(L("નામ", "Name"), fInput("umEName", u.name, "")) +
      // registered login email — read-only, fetched from the account; it can't be
      // changed here because it is the Firebase sign-in identity.
      '<div class="fg fg-full"><label>' + L("લોગિન ઈમેલ", "Login email") + '</label><div class="field"><input id="umEEmail" type="email" value="' + esc(u.email || "") + '" readonly disabled></div>' +
      '<div class="msg" style="margin-top:6px">' + L("રજિસ્ટર્ડ લોગિન ઈમેલ — પાસવર્ડ રીસેટ લિંક આના પર જ જાય છે.", "Registered login email — password-reset links go here.") + '</div></div>' +
      '<div class="fg fg-full"><label>' + L("ભૂમિકા", "Role") + '</label><div class="field"><select id="umERole"' + (self ? " disabled" : "") + '><option value="supervisor"' + (u.role === "supervisor" ? " selected" : "") + '>' + L("સુપરવાઇઝર", "Supervisor") + '</option><option value="admin"' + (u.role === "admin" ? " selected" : "") + '>' + L("એડમિન", "Admin") + '</option></select></div>' + (self ? '<div class="msg">' + L("તમે તમારી પોતાની ભૂમિકા બદલી ન શકો", "You can't change your own role") + '</div>' : "") + '</div>';
    showModal("shield", L("યુઝર ફેરફાર", "Edit User"), u.email || u.name, body, function () { umSave(uid); });
  }

  function umSave(uid) {
    var u = umFind(uid); if (!u) return; var self = umSelf(uid);
    var name = fVal("#umEName").trim();
    var email = u.email || "";   // registered login email — never editable here
    var role = self ? u.role : (fVal("#umERole") === "admin" ? "admin" : "supervisor");
    var doc = { role: role, active: u.active, name: name || email || u.name, email: email };
    // keep existing permissions; seed defaults when a user becomes a supervisor with none
    if (role === "supervisor") {
      if (u.perms) doc.perms = u.perms;
      else { var p = {}; PERM_MODULES.forEach(function (id) { p[id] = STAFF_DEFAULT.indexOf(id) > -1; }); doc.perms = p; }
    } else if (u.perms) { doc.perms = u.perms; }   // harmless to keep; ignored for admins
    closeModal();
    umDb().collection("users").doc(uid).set(doc).then(function () {
      toast(L("સેવ થયું", "Saved"), "ok"); loadUsers();
    }).catch(function (e) { toast((e && (e.code || e.message)) || L("સેવ નિષ્ફળ", "Save failed"), "info"); });
  }

  function umToggleActive(uid) {
    var u = umFind(uid); if (!u) return;
    if (umSelf(uid)) { toast(L("તમે તમારું પોતાનું એકાઉન્ટ બંધ ન કરી શકો", "You can't disable your own account"), "info"); return; }
    var next = !u.active;
    var doc = { role: u.role, active: next, name: u.name, email: u.email }; if (u.perms) doc.perms = u.perms;
    umDb().collection("users").doc(uid).set(doc).then(function () {
      toast(next ? L("એકાઉન્ટ સક્રિય", "Account enabled") : L("એકાઉન્ટ બંધ", "Account disabled"), "ok"); loadUsers();
    }).catch(function (e) { toast((e && (e.code || e.message)) || L("નિષ્ફળ", "Failed"), "info"); });
  }

  function umResetPw(uid) {
    var u = umFind(uid); if (!u || !u.email) { toast(L("આ એકાઉન્ટનો ઈમેલ નથી", "No email on this account"), "info"); return; }
    var a = umAuth(); if (!a) return;
    a.sendPasswordResetEmail(u.email).then(function () { toast(L("રીસેટ લિંક મોકલી: ", "Reset link sent to ") + u.email, "ok"); })
      .catch(function (e) { toast((e && (e.code || e.message)) || L("મોકલી શકાયું નહીં", "Couldn't send"), "info"); });
  }

  function umRemove(uid) {
    var u = umFind(uid); if (!u) return;
    if (umSelf(uid)) { toast(L("તમે તમારું પોતાનું એકાઉન્ટ કાઢી ન શકો", "You can't remove your own account"), "info"); return; }
    infoModalConfirm(L("યુઝર એક્સેસ કાઢવું?", "Remove user access?"),
      L("આ એકાઉન્ટની એપ એક્સેસ કાઢશે. લોગિન એકાઉન્ટ Firebase કન્સોલમાં રહેશે.", "This removes the account's access to the app. The login itself remains in the Firebase console."),
      function () {
        umDb().collection("users").doc(uid).delete().then(function () { toast(L("એક્સેસ કાઢ્યું", "Access removed"), "ok"); loadUsers(); })
          .catch(function (e) { toast((e && (e.code || e.message)) || L("નિષ્ફળ", "Failed"), "info"); });
      });
  }

  /* ================================================================
     PACKAGING  —  fully independent panel (no dependencies at all).
     The Packaging role fills it; Admin views and downloads. Pure data
     entry + calculation + its own PDF.  50 rows per step.
     Amount = (Total Metre × Rate) + Packing Charge + Tax   (all BigInt).
     ================================================================ */
  var PK_ROWS = 25, PK_STEPS = 25;   /* packaging grid: max 25 rows per step, up to 25 step columns */
  function todayISO() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  /* ---- date bounds & validation (prevents 6-digit / absurd years) ---- */
  function dateMin() { return "2015-01-01"; }
  function dateMax() { return (new Date().getFullYear() + 1) + "-12-31"; }   // through end of next year (covers the fiscal year)
  function dateAttrs() { return ' min="' + dateMin() + '" max="' + dateMax() + '"'; }
  // Return a valid ISO date within [min,max]; otherwise the fallback (previous value or today).
  function clampDate(iso, fallback) {
    fallback = fallback || todayISO();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return fallback;    // rejects empty + 5/6-digit years
    if (iso < dateMin() || iso > dateMax()) return fallback;
    var d = new Date(iso + "T00:00:00"); if (isNaN(d.getTime())) return fallback;
    return iso;
  }
  /* ---- month-bounded dates ----------------------------------------
     A gate/niwar sheet is filed under the month it is created in. If its date
     could fall in a month the switcher doesn't list (e.g. Jan while only Aug–Oct
     exist), the sheet would be saved but invisible. These keep every sheet date
     inside its own month so a saved sheet always shows up. */
  function monthLastDay(mid) { return new Date(+mid.slice(0, 4), +mid.slice(5, 7), 0).getDate(); }
  function monthDateAttrs(mid) { return ' min="' + mid + '-01" max="' + mid + '-' + pad(monthLastDay(mid)) + '"'; }
  function clampDateToMonth(iso, mid, fallback) {
    var lo = mid + "-01", hi = mid + "-" + pad(monthLastDay(mid));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return (fallback && fallback.slice(0, 7) === mid) ? fallback : lo;
    if (iso < lo) return lo;
    if (iso > hi) return hi;
    return iso;
  }
  // Rescue any already-saved sheet whose date fell outside the listed months,
  // snapping it into the nearest valid month so it becomes visible again.
  function nearestMonthId(ym) {
    var ids = MONTHS.map(function (m) { return m.id; });
    if (ym < ids[0]) return ids[0];
    if (ym > ids[ids.length - 1]) return ids[ids.length - 1];
    return ids[0];
  }
  function healOrphanDates() {
    var valid = {}; MONTHS.forEach(function (m) { valid[m.id] = 1; });
    var changed = false;
    function fix(rec) {
      if (!rec || !rec.date) return;
      var ym = rec.date.slice(0, 7);
      if (valid[ym]) return;
      var mid = nearestMonthId(ym);
      rec.date = clampDateToMonth(rec.date, mid, mid + "-01");
      changed = true;
    }
    SHEETS.forEach(fix); NSHEETS.forEach(fix);
    return changed;
  }
  function blankPacking() {
    var meters = [], kg = [];
    for (var s = 0; s < PK_STEPS; s++) { meters.push(new Array(PK_ROWS).fill(null)); kg.push(null); }
    return { id: rid(), name: "", date: todayISO(), quality: "", city: "", transport: "", nSteps: 1, meters: meters, kg: kg, rate: 0, packing: 0, tax: 0, basis: "mtr" };
  }
  var PACKING = [];
  (function seedPacking() { if (!SEED_DEMO) return;
    var p = blankPacking();
    p.name = "Guru Govind"; p.date = "2026-10-28"; p.quality = "80 Khadi"; p.city = ""; p.transport = "Inland X"; p.nSteps = 7;
    var data = [
      [59, 59, 63, 60, 58, 64, 63], [53, 56, 67, 59, 59, 63, 59], [65, 59, 64, 70, 58, 59, 53],
      [60, 55, 54, 59, 51, 66, 57], [62, 62, 50, 53, 64, 62, 63], [61, 62, 58, 63, 62, 61, 52],
      [62, 62, 57, 56, 63, 63, 66], [59, 62, 62, 56, 55, 59, 62], [61, 59, 63, 64, 57, 65, 62],
      [60, 59, 59, 58, 59, 64, 63], [56, 63, 55, 56, 65, 55, 63], [61, 58, 55, 53, 60, 60, 63]
    ];
    data.forEach(function (row, r) { row.forEach(function (v, s) { p.meters[s][r] = v; }); });
    [91, 90.5, 92, 93, 90, 94, 91.5].forEach(function (k, s) { p.kg[s] = k; });
    p.rate = 3.55; p.packing = 500; p.tax = 250;
    PACKING.push(p);
  })();
  function packingById(id) { return PACKING.filter(function (p) { return p.id === id; })[0]; }
  function pkStepTotal(p, s) { var t = 0; for (var r = 0; r < PK_ROWS; r++) if (p.meters[s][r] != null) t += p.meters[s][r]; return t; }
  function pkMt(p) { var t = 0; for (var s = 0; s < p.nSteps; s++) t += pkStepTotal(p, s); return t; }
  function pkRolls(p) { var c = 0; for (var s = 0; s < p.nSteps; s++) for (var r = 0; r < PK_ROWS; r++) if (p.meters[s][r] != null) c++; return c; }
  function pkKgG(p) { var g = 0; for (var s = 0; s < p.nSteps; s++) if (p.kg[s] != null) g += Math.round(p.kg[s] * 1000); return g; }
  function pkAmount(p) {
    var mt = pkMt(p), kgG = pkKgG(p), basis = p.basis || "mtr", rateP = rupToP(p.rate || 0);
    /* rate applies to metre OR to kg, whichever basis is selected */
    var grossP = (basis === "kg") ? (B(kgG) * rateP / 1000n) : (B(mt) * rateP);
    var packP = rupToP(p.packing || 0), taxP = rupToP(p.tax || 0);
    return { mt: mt, kgG: kgG, basis: basis, qtyStr: (basis === "kg") ? (kgStr(B(kgG)) + " kg") : (numI(mt) + " mtr"), rateUnit: (basis === "kg") ? "/kg" : "/mtr", grossP: grossP, packP: packP, taxP: taxP, amountP: grossP + packP + taxP };
  }
  function canEditPacking() { return STATE.role === "admin" || STATE.role === "supervisor"; }

  /* ---- Packing list (list view) ---- */
  function viewPacking() {
    var isSup = canEditPacking();
    var html = '<div class="demo-strip">' + svg("info") + '<span>' +
      L('<b>પેકેજિંગ</b> — આ પેનલ સંપૂર્ણ અલગ છે (કોઈ ડિપેન્ડન્સી નહીં). એડમિન અને સુપરવાઇઝર બંને ભરે/બદલે અને PDF ડાઉનલોડ કરે.',
      '<b>Packaging</b> — a fully separate panel (no dependencies). Both Admin and Supervisor can fill/edit and download the PDF.') + '</span></div>';
    html += '<div class="page-head row-between"><div><h2>' + L("પેકેજિંગ", "Packaging") + '</h2>' +
      '<div class="sub">' + L("પેકિંગ લિસ્ટ — મીટર, KG, રેટ, પેકિંગ ચાર્જ, ટેક્ષ, રકમ.", "Packing list — metre, KG, rate, packing charge, tax, amount.") + '</div></div>' +
      (isSup ? '<button class="btn btn-primary" data-newpacking="1">' + svg("plus") + ' ' + L("નવું પેકિંગ લિસ્ટ", "New Packing List") + '</button>' :
        '<span class="free-badge none">' + svg("info") + L("ફક્ત જોવા માટે (એડમિન)", "View only (Admin)") + '</span>') + '</div>';
    html += '<div class="card"><div class="table-scroll"><table class="data"><thead><tr>' +
      '<th>' + L("તારીખ", "Date") + '</th><th>' + L("નામ", "Name") + '</th><th>' + L("ક્વોલિટી", "Quality") + '</th><th>' + L("ટ્રાન્સપોર્ટ", "Transport") + '</th>' +
      '<th style="text-align:right">' + L("રોલ", "Roll") + '</th><th style="text-align:right">' + L("કુલ મીટર", "Total Mtr") + '</th><th style="text-align:right">' + L("રકમ", "Amount") + '</th><th></th></tr></thead><tbody>';
    if (!PACKING.length) html += '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:20px">' + L("કોઈ પેકિંગ લિસ્ટ નથી.", "No packing lists.") + '</td></tr>';
    PACKING.forEach(function (p) {
      html += '<tr><td><b>' + dmy(p.date) + '</b></td><td>' + esc(p.name || "—") + '</td><td>' + esc(p.quality ? qLabel(p.quality) : "—") + '</td><td>' + esc(p.transport || "—") + '</td>' +
        '<td style="text-align:right" class="num">' + pkRolls(p) + '</td><td style="text-align:right" class="num">' + numI(pkMt(p)) + '</td><td style="text-align:right" class="num" style="font-weight:700">' + moneyP(pkAmount(p).amountP) + '</td>' +
        '<td style="text-align:right"><button class="btn btn-soft btn-sm" data-openpacking="' + p.id + '">' + svg(isSup ? "edit" : "chevR") + ' ' + L("ખોલો", "Open") + '</button></td></tr>';
    });
    html += '</tbody></table></div></div>';
    html += '<div class="hint mt">' + L("💡 આ વિભાગ સંપૂર્ણ અલગ છે — તેનો ડેટા જોબવર્ક/બિલિંગ પર અસર કરતો નથી.", "💡 This section is fully independent — its data does not affect jobwork/billing.") + '</div>';
    return html;
  }

  /* ---- Packing list editor ---- */
  function viewPackingSheet() {
    var p = packingById(STATE.packingId);
    if (!p) { STATE.view = "packing"; return viewPacking(); }
    var dis = canEditPacking() ? "" : " disabled";
    var am = pkAmount(p);
    var html = '<div class="page-head row-between"><div style="display:flex;align-items:center;gap:12px"><div><h2 style="margin:0">' + L("પેકિંગ લિસ્ટ", "Packing List") + '</h2></div></div>' +
      '<div class="page-actions"><button class="btn btn-gold btn-sm" data-packpdf="1">' + svg("dl") + ' ' + L("PDF ડાઉનલોડ", "Download PDF") + '</button></div></div>';
    if (!canEditPacking()) html += '<div class="demo-strip">' + svg("info") + '<span>' + L("ફક્ત જોવા માટે — ફેરફાર પેકેજિંગ પેનલ કરે. તમે PDF ડાઉનલોડ કરી શકો.", "View only — editing is done by the Packaging panel. You can download the PDF.") + '</span></div>';

    /* header fields */
    html += '<div class="jws-head"><div class="jws-hfields" style="grid-template-columns:repeat(3,1fr)">' +
      '<label class="jws-hf"><span>' + L("નામ", "Name") + '</span><input type="text" data-ph="name" maxlength="25" value="' + esc(p.name) + '"' + dis + '></label>' +
      '<label class="jws-hf"><span>' + L("તારીખ", "Date") + '</span><input type="date" data-ph="date" value="' + esc(p.date) + '"' + dateAttrs() + dis + '></label>' +
      '<label class="jws-hf"><span>' + L("ક્વોલિટી", "Quality") + '</span><input type="text" data-ph="quality" maxlength="25" value="' + esc(p.quality) + '"' + dis + '></label>' +
      '<label class="jws-hf"><span>' + L("સિટી", "City") + '</span><input type="text" data-ph="city" maxlength="25" value="' + esc(p.city) + '"' + dis + '></label>' +
      '<label class="jws-hf"><span>' + L("ટ્રાન્સપોર્ટ", "Transport") + '</span><input type="text" data-ph="transport" maxlength="25" value="' + esc(p.transport) + '"' + dis + '></label>' +
      '</div></div>';

    if (canEditPacking()) html += '<div class="jws-toolbar"><div class="steps-ctrl"><span class="lbl">' + L("સ્ટેપ (કૉલમ)", "Steps (columns)") + '</span><button class="icon-btn" id="pStepMinus"' + (p.nSteps <= 1 ? " disabled" : "") + '>' + svg("minus") + '</button><b id="pStepCount">' + p.nSteps + '</b><button class="icon-btn" id="pStepPlus"' + (p.nSteps >= PK_STEPS ? " disabled" : "") + '>' + svg("plus") + '</button></div></div>';

    /* layout: grid + side */
    html += '<div class="jws-layout"><div class="card jws-gridcard"><div class="jws-scroll"><table class="jws"><thead><tr><th class="sr-col">' + L("ક્રમ", "Sr.") + '</th>';
    for (var s = 0; s < p.nSteps; s++) html += '<th>Mtr.<span class="en">' + (s + 1) + '</span></th>';
    html += '</tr></thead><tbody>';
    for (var r = 0; r < PK_ROWS; r++) {
      html += '<tr><td class="sr-col">' + (r + 1) + '</td>';
      for (var s2 = 0; s2 < p.nSteps; s2++) { var v = p.meters[s2][r]; html += '<td><input class="cell" type="text" inputmode="numeric" maxlength="2" data-pmt="' + s2 + '_' + r + '" value="' + (v == null ? "" : v) + '"' + dis + '></td>'; }
      html += '</tr>';
    }
    html += '</tbody><tfoot><tr class="ft-total"><td class="sr-col">' + L("કુલ", "Total") + '</td>';
    for (var s3 = 0; s3 < p.nSteps; s3++) html += '<td class="num" id="pstot_' + s3 + '">' + numI(pkStepTotal(p, s3)) + '</td>';
    html += '</tr><tr class="ft-kg"><td class="sr-col">KG</td>';
    for (var s4 = 0; s4 < p.nSteps; s4++) { var pkgLock = pkStepTotal(p, s4) <= 0; html += '<td><input class="cell kgcell' + (pkgLock ? ' kg-locked' : '') + '" inputmode="decimal" data-pkg="' + s4 + '"' + (pkgLock ? ' disabled title="' + L("પહેલાં આ સ્ટેપમાં મીટર ભરો", "Enter metres in this step first") + '"' : '') + ' value="' + (p.kg[s4] == null ? "" : p.kg[s4]) + '"' + dis + '></td>'; }
    html += '</tr></tfoot></table></div><div class="hint" style="padding:10px 14px 0">' + L("એક સ્ટેપમાં " + PK_ROWS + " લાઇન. મીટરમાં 2 આંકડા — પછી આપમેળે આગળની લાઇને.", PK_ROWS + " lines per step. Metres are 2 digits — then it auto-jumps to the next line.") + '</div></div>';

    /* side: stats + amount */
    html += '<div class="jws-side">' +
      sideStat("roll", L("રોલ", "Roll"), '<span id="pSumRoll">' + numI(pkRolls(p)) + '</span>', L("કુલ એન્ટ્રી", "total entries"), "tint-in") +
      sideStat("ruler", L("કુલ મીટર", "Total Metre"), '<span id="pSumMt">' + numI(pkMt(p)) + '</span>', L("બધા સ્ટેપ", "all steps"), "tint-brand") +
      sideStat("scale", L("KG ટોટલ", "KG Total"), '<span id="pSumKg">' + kgStr(B(pkKgG(p))) + '</span>', L("કુલ કિલો", "total KG"), "tint-out") +
      '<div class="card"><div class="card-pad">' +
      '<div class="ctrl"><label>' + L("ગણતરી — મીટર કે કિલો", "Calculate by — metre or kg") + '</label><div style="display:flex;gap:6px">' +
        '<button class="btn btn-sm ' + (am.basis === "mtr" ? "btn-primary" : "btn-soft") + '" data-pbasis="mtr"' + dis + '>' + L("મીટર", "Metre") + '</button>' +
        '<button class="btn btn-sm ' + (am.basis === "kg" ? "btn-primary" : "btn-soft") + '" data-pbasis="kg"' + dis + '>' + L("કિલો (KG)", "KG") + '</button></div></div>' +
      '<div class="ctrl"><label>' + L("રેટ (₹", "Rate (₹") + am.rateUnit + ')' + '</label><div class="field"><span class="pre">₹</span><input type="number" data-pf="rate" value="' + p.rate + '" min="0" max="10000" step="0.05"' + dis + '><span class="suf">' + am.rateUnit + '</span></div></div>' +
      '<div class="ctrl"><label>' + L("પેકિંગ ચાર્જ (₹)", "Packing Charge (₹)") + '</label><div class="field"><span class="pre">₹</span><input type="number" data-pf="packing" value="' + p.packing + '" min="0" max="1000000" step="10"' + dis + '></div></div>' +
      '<div class="ctrl"><label>' + L("ટેક્ષ (₹)", "Tax (₹)") + '</label><div class="field"><span class="pre">₹</span><input type="number" data-pf="tax" value="' + p.tax + '" min="0" max="1000000" step="10"' + dis + '></div></div>' +
      '<div class="bill-line"><span class="lab">' + L("જથ્થો × રેટ", "Qty × Rate") + ' <small id="pGrossSub">' + am.qtyStr + ' × ' + rateStr(rupToP(p.rate || 0)) + am.rateUnit + '</small></span><span class="val num" id="pGross">' + moneyP(am.grossP) + '</span></div>' +
      '<div class="pk-amount"><span class="k">' + L("રકમ · Amount", "Amount") + '</span><span class="v num" id="pAmt">' + moneyP(am.amountP) + '</span></div>' +
      '<div class="hint" id="pAmtHint">' + L("રકમ = કુલ " + (am.basis === "kg" ? "કિલો" : "મીટર") + " × રેટ + પેકિંગ ચાર્જ + ટેક્ષ", "Amount = Total " + (am.basis === "kg" ? "KG" : "Metre") + " × Rate + Packing Charge + Tax") + '</div>' +
      '</div></div></div>';
    html += '</div>';

    if (canEditPacking()) html += '<div class="card mt"><div class="card-pad" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><div class="free-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + I.check + '</svg>' + L("“થઈ ગયું” અથવા “સેવ” થી સેવ થશે", "Saved on Done / Save") + '</div><div class="spacer"></div><button class="btn btn-ghost btn-sm" data-delpacking="' + p.id + '">' + svg("trash") + ' ' + L("કાઢો", "Delete") + '</button><button class="btn btn-primary" data-go="packing">' + svg("check") + ' ' + L("થઈ ગયું", "Done") + '</button></div></div>';
    return html;
  }

  /* packing editor live wiring (no full re-render; 2-digit auto-advance on metres) */
  function wirePackingEditor() {
    var p = packingById(STATE.packingId); if (!p || STATE.view !== "packingsheet") return;
    function refreshPk() { setTxt("#pSumRoll", numI(pkRolls(p))); setTxt("#pSumMt", numI(pkMt(p))); setTxt("#pSumKg", kgStr(B(pkKgG(p)))); var am = pkAmount(p); setTxt("#pGross", moneyP(am.grossP)); setTxt("#pGrossSub", am.qtyStr + " × " + rateStr(rupToP(p.rate || 0)) + am.rateUnit); setTxt("#pAmt", moneyP(am.amountP)); }
    document.querySelectorAll("[data-ph]").forEach(function (el) { el.onchange = function () { var k = el.getAttribute("data-ph"); if (k === "date") { var v = clampDate(el.value, p.date); if (v !== el.value) { el.value = v; toast(L("માન્ય તારીખ દાખલ કરો", "Enter a valid date"), "info"); } p.date = v; schedulePersist(); return; } var val = el.value; if (el.hasAttribute("maxlength") && val.length > 25) { val = val.slice(0, 25); el.value = val; }  /* enforce the 25-char cap even on paste/programmatic input */ p[k] = val; schedulePersist(); }; });
    document.querySelectorAll("[data-pbasis]").forEach(function (el) { el.onclick = function () { if (!canEditPacking()) return; p.basis = el.getAttribute("data-pbasis"); render(); }; });
    document.querySelectorAll("[data-pmt]").forEach(function (el) {
      el.oninput = function () {
        var d = el.value.replace(/\D/g, "").slice(0, 2); if (d !== el.value) el.value = d;
        var q = el.getAttribute("data-pmt").split("_"); var s = +q[0], r = +q[1];
        p.meters[s][r] = d === "" ? null : parseInt(d, 10);
        setTxt("#pstot_" + s, numI(pkStepTotal(p, s))); syncPkKgLock(p, s); refreshPk(); schedulePersist();
        if (d.length === 2) { var nx = document.querySelector('[data-pmt="' + s + '_' + (r + 1) + '"]'); if (nx) { nx.focus(); if (nx.select) nx.select(); } }
      };
    });
    document.querySelectorAll("[data-pkg]").forEach(function (el) { el.oninput = function () { p.kg[+el.getAttribute("data-pkg")] = sanitizeDecimalField(el, 8, 3, KG_MAX, kgMaxMsg); setTxt("#pSumKg", kgStr(B(pkKgG(p)))); refreshPk(); schedulePersist(); }; });   /* bug 20: values > 99,999 compute correctly */
    document.querySelectorAll("[data-pf]").forEach(function (el) { el.oninput = function () { var k = el.getAttribute("data-pf"); var mx = k === "rate" ? CAP.pkRate : k === "packing" ? CAP.pkCharge : CAP.pkTax; var n = clampNum(el.value, mx, capMsg); if (String(n) !== el.value && n === mx) el.value = String(mx); p[k] = n; refreshPk(); schedulePersist(); }; });   /* bug 21: field-specific caps */
    var sp = $("#pStepPlus"); if (sp) sp.onclick = function () { if (p.nSteps < PK_STEPS) { p.nSteps++; render(); } };
    var sm = $("#pStepMinus"); if (sm) sm.onclick = function () { if (p.nSteps > 1) { p.nSteps--; render(); } };
  }
  function newPacking() { var p = blankPacking(); PACKING.unshift(p); STATE.packingId = p.id; STATE.view = "packingsheet"; _pendingEdit = false; render(); acquireEditorLock(); toast(L("નવું પેકિંગ લિસ્ટ", "New packing list"), "ok"); }
  function openPacking(id) { STATE.packingId = id; STATE.view = "packingsheet"; _pendingEdit = false; render(); acquireEditorLock(); }
  function delPacking(id) { infoModalConfirm(L("પેકિંગ લિસ્ટ કાઢવું?", "Delete packing list?"), L("આ પેકિંગ લિસ્ટ કાઢી નાખશે.", "This removes the packing list."), function () { PACKING = PACKING.filter(function (p) { return p.id !== id; }); STATE.view = "packing"; render(); flushPersistNow(); toast(L("કાઢ્યું", "Deleted"), "ok"); }); }

  /* packing PDF (separate format, paginated) */
  function packingPages(id) {
    var p = packingById(id); var am = pkAmount(p);
    var lastRow = 1; for (var s = 0; s < p.nSteps; s++) for (var r = 0; r < PK_ROWS; r++) if (p.meters[s][r] != null) lastRow = Math.max(lastRow, r + 1);
    var head = ''; for (var s2 = 0; s2 < p.nSteps; s2++) head += '<th>Mtr.<br>' + (s2 + 1) + '</th>';
    var totalPages = Math.max(1, Math.ceil(lastRow / PDF_ROWS_PER_PAGE));
    var party = '<div class="sh-party"><div class="pb"><div class="k">નામ · Name</div><div class="vv">' + esc(p.name || "—") + '</div></div><div class="pb"><div class="k">તારીખ · Date</div><div class="vv">' + dmy(p.date) + '</div></div><div class="pb"><div class="k">ક્વોલિટી · Quality</div><div class="vv">' + esc(p.quality || "—") + '</div></div><div class="pb"><div class="k">સિટી · City</div><div class="vv">' + esc(p.city || "—") + '</div></div><div class="pb"><div class="k">ટ્રાન્સપોર્ટ · Transport</div><div class="vv">' + esc(p.transport || "—") + '</div></div></div>';
    var pages = [];
    for (var pg = 0; pg < totalPages; pg++) {
      var start = pg * PDF_ROWS_PER_PAGE, end = Math.min(lastRow, start + PDF_ROWS_PER_PAGE), isLast = pg === totalPages - 1;
      var body = '';
      for (var r2 = start; r2 < end; r2++) { body += '<tr><td class="l">' + (r2 + 1) + '</td>'; for (var s3 = 0; s3 < p.nSteps; s3++) { var v = p.meters[s3][r2]; body += '<td>' + (v == null ? "" : numI(v)) + '</td>'; } body += '</tr>'; }
      var tfoot = '';
      if (isLast) {
        tfoot = '<tfoot><tr class="tot"><td class="l">Mtr · Total</td>';
        for (var s4 = 0; s4 < p.nSteps; s4++) tfoot += '<td>' + numI(pkStepTotal(p, s4)) + '</td>';
        tfoot += '</tr><tr class="tot"><td class="l">KG</td>';
        for (var s5 = 0; s5 < p.nSteps; s5++) tfoot += '<td>' + (p.kg[s5] == null ? "" : kgStr(B(Math.round(p.kg[s5] * 1000)))) + '</td>';
        tfoot += '</tr></tfoot>';
      }
      var pland = true, ppkw = (p.nSteps || 1) > 16;   // Packing List is always landscape (readable with up to 25 cols); tighter for 17–35
      var h = '<div class="sheet' + (pland ? ' land' : '') + (ppkw ? ' pkw' : '') + '">' + sheetTop('<span class="copy-chip copy-company">પેકિંગ લિસ્ટ · PACKING LIST</span>', "પેકિંગ લિસ્ટ<br>Packing List" + (totalPages > 1 ? ' <span style="font-size:11px">(' + (pg + 1) + '/' + totalPages + ')</span>' : '')) + party +
        '<h4 class="sh-h">મીટર · Metres' + (totalPages > 1 ? ' — Sr. ' + (start + 1) + '–' + end : '') + '</h4>' +
        '<table class="pt jws-pt"><thead><tr><th class="l">Sr.</th>' + head + '</tr></thead><tbody>' + body + '</tbody>' + tfoot + '</table>';
      if (isLast) {
        h += '<div class="two-col" style="margin-top:18px;align-items:flex-start">' +
          '<div style="flex:1"><h4 class="sh-h">સારાંશ · Summary</h4><table class="pt"><tbody>' +
          '<tr><td class="l">રોલ · Roll</td><td>' + numI(pkRolls(p)) + '</td></tr>' +
          '<tr><td class="l">કુલ મીટર · Total Metre</td><td>' + numI(am.mt) + '</td></tr>' +
          '<tr class="tot"><td class="l">KG · Total</td><td>' + kgStr(B(pkKgG(p))) + '</td></tr></table></div>' +
          '<div style="flex:1"><h4 class="sh-h">બિલ · Billing</h4><table class="pt"><tbody>' +
          '<tr><td class="l">રેટ · Rate</td><td>' + rateStr(rupToP(p.rate || 0)) + am.rateUnit + '</td></tr>' +
          '<tr><td class="l">' + (am.basis === "kg" ? "કિલો × રેટ · KG × Rate" : "મીટર × રેટ · Metre × Rate") + '</td><td>' + am.qtyStr + ' × ' + rateStr(rupToP(p.rate || 0)) + ' = ' + moneyP(am.grossP) + '</td></tr>' +
          '<tr><td class="l">પેકિંગ ચાર્જ · Packing Charge</td><td>+ ' + moneyP(am.packP) + '</td></tr>' +
          '<tr><td class="l">ટેક્ષ · Tax</td><td>+ ' + moneyP(am.taxP) + '</td></tr>' +
          '<tr class="tot"><td class="l">રકમ · Amount</td><td>' + moneyP(am.amountP) + '</td></tr></table></div></div>' +
          '<div class="pay-row"><div>કુલ રકમ · Total Amount</div><div class="pv">' + moneyP(am.amountP) + '</div></div>' +
          '<div class="sig"><div class="s">પેકેજિંગ · Packaging</div><div class="s">' + CO.name + '</div></div>';
      }
      h += sheetFoot() + '</div>';
      pages.push(h);
    }
    return pages;
  }
  function makePackingPDF(id) { var p = packingById(id); var orient = "l"; /* Packing List always downloads in landscape for readable columns */ toast(L("PDF તૈયાર…", "Generating…"), "info"); renderPages(packingPages(id), "Girijaj_PackingList_" + slug(p.name) + "_" + p.date + ".pdf", orient).then(pdfDone).catch(pdfFail); }

  /* ---------------------------------------------------------------- HELP */
  function viewHelp() {
    var html = '<div class="page-head"><h2>' + L("આ સિસ્ટમ કેવી રીતે કામ કરે?", "How the system works") + '</h2><div class="sub">' + L("ગેટની શીટ ભરો — બાકી બધું આપમેળે.", "Fill the gate sheet — everything else is automatic.") + '</div></div>';
    html += '<div class="card card-pad"><h3 style="margin-bottom:14px;font-size:16px">' + L("પ્રક્રિયા", "The process") + '</h3><div class="flow">' +
      fnode(1, L("ગેટ જોબ વર્ક શીટ", "Gate Job Work Sheet"), L("સ્ટેપ, મીટર, KG, કોકડી+કલર", "steps, metre, KG, Kokdi+Color")) +
      fnode(2, L("ખાતાવહી", "Ledger"), L("દરેક શીટ = એક એન્ટ્રી", "each sheet = one entry")) +
      fnode(3, L("બિલિંગ", "Billing"), L("મીટર×રેટ − ઉપડ − લોન", "metre×rate − upad − loan")) +
      fnode(4, L("લોન", "Loans"), L("એડવાન્સ — બિલમાંથી વસૂલ", "advances, recovered from bill")) +
      fnode(5, L("વર્ષાંત (દિવાળી)", "Year-End"), L("લોન + ઘટ + કેરી", "loan + ghati + carry")) +
      '</div></div>';
    html += '<div class="grid-2 mt"><div class="card card-pad"><h3 style="font-size:16px;margin-bottom:12px">' + L("યુઝર રોલ", "User roles") + '</h3><ul class="feat-list">' +
      feat('<b>' + L("એડમિન", "Admin") + '</b> — ' + L("સંપૂર્ણ એક્સેસ: ખાતાવહી, બિલિંગ, લોન, વર્ષાંત અને પેકેજિંગ.", "full access — ledger, billing, loans, year-end & packaging.")) +
      feat('<b>' + L("સુપરવાઇઝર", "Supervisor") + '</b> — ' + L("ગેટ જોબ વર્ક શીટ, નિવાર ગેટ એન્ટ્રી અને પેકેજિંગ. કોઈ એકાઉન્ટિંગ નહીં.", "gate job work sheet, niwar gate entry & packaging. No accounting.")) +
      feat('<b>' + L("પેકેજિંગ", "Packaging") + '</b> — ' + L("અલગ પેનલ (કોઈ ડિપેન્ડન્સી નહીં) — એડમિન અને સુપરવાઇઝર બંનેને એક્સેસ.", "a separate panel (no dependencies) — both Admin and Supervisor have access.")) +
      feat(L("લોગિન સ્ક્રીન પર રોલ પસંદ કરો; તે પ્રમાણે ડેશબોર્ડ ખૂલે.", "Pick your role on the login screen; the matching dashboard opens.")) + '</ul></div>' +
      '<div class="card card-pad"><h3 style="font-size:16px;margin-bottom:12px">' + L("મુખ્ય મુદ્દા", "Key points") + '</h3><ul class="feat-list">' +
      feat(L("ગેટ શીટ = આખી સિસ્ટમનો આધાર (એક સોર્સ)", "The gate sheet is the single source of truth")) +
      feat(L("નિવાર જોબવર્ક — ગેટ-સ્ટાઇલ kg ખાતાવહી: એક શીટમાં અનેક સાઇઝ (સાઇઝ પ્રમાણે રેટ), યાર્ન, પરાત → પોતાનું બિલ", "Niwar Jobwork — gate-style kg ledger: many sizes per sheet (per-size rates), yarn, parat → its own bill")) +
      feat(L("ઉપડ — અઠવાડિક એડવાન્સ, બિલમાં આપમેળે કપાય (ચાલુ મહિનો)", "Upad — weekly advances, auto-deducted in the bill (current month)")) +
      feat(L("લોન અલગ ખાતું — માલિક બિલમાંથી નક્કી કરે એટલું વસૂલ", "Loans are a separate account — recovered from the bill as the owner decides")) +
      feat(L("કેરી ફોરવર્ડ — બાકી રકમ આવતા મહિને", "Carry-forward — remainder to next month")) +
      feat(L("બધી રકમ અને વજન બિલકુલ ચોક્કસ — કોઈ રાઉન્ડિંગ ભૂલ નહીં", "All money & weight are exact — no rounding errors")) + '</ul></div></div>';
    return html;
  }
  function fnode(n, t, s) { return '<div class="node"><div class="n">' + n + '</div><b>' + t + '</b><span>' + s + '</span></div>'; }
  function feat(t) { return '<li>' + svg("check") + '<span>' + t + '</span></li>'; }

  /* ---------------------------------------------------------------- PROFILE PAGE */
  function viewProfile() {
    var u = (window.GJAuth && window.GJAuth.user) || {};
    var name = u.name || u.email || L("યુઝર", "User");
    var ini = (u.name || u.email || "?").trim().slice(0, 2).toUpperCase();
    var email = u.email || "—";
    var roleTxt = u.role === "admin" ? L("એડમિન (માલિક)", "Admin (Owner)") : L("સુપરવાઇઝર", "Supervisor");
    var html = '<div class="page-head row-between"><div><h2>' + L("પ્રોફાઇલ", "Profile") + '</h2><div class="sub">' + L("તમારું એકાઉન્ટ", "Your account") + '</div></div>' +
      (u.role === "admin" ? '<div class="page-actions"><button class="btn btn-primary" data-editprofile>' + svg("edit") + ' ' + L("પ્રોફાઇલ ફેરફાર", "Edit profile") + '</button></div>' : '') + '</div>';
    html += '<div class="prof-wrap">';
    html += '<div class="card card-pad prof-id">' +
        '<div class="prof-av">' + esc(ini) + '</div>' +
        '<div class="prof-idmeta"><div class="prof-name">' + esc(name) + '</div>' +
        '<div class="prof-em" title="' + esc(email) + '">' + esc(email) + '</div>' +
        '<span class="prof-badge">' + svg("shield") + roleTxt + '</span></div></div>';
    html += '<div class="prof-grid">';
    html += '<div class="card card-pad prof-det"><h3 class="prof-h">' + L("એકાઉન્ટ વિગત", "Account details") + '</h3>' +
        prow("users", L("નામ", "Name"), esc(name)) +
        prow("inbox", L("ઈમેલ", "Email"), esc(email)) +
        prow("shield", L("રોલ", "Role"), roleTxt) +
        prow("check", L("સ્થિતિ", "Status"), '<span class="prof-on">' + L("સક્રિય", "Active") + '</span>') +
        '</div>';
    html += '<div class="card card-pad prof-out">' +
        '<div class="prof-outtxt"><b>' + L("લોગ આઉટ", "Log out") + '</b><span>' + L("આ ઉપકરણમાંથી સુરક્ષિત સાઇન આઉટ.", "Securely sign out of this device.") + '</span></div>' +
        '<button type="button" class="prof-logout" data-logout>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
        '<span>' + L("લોગ આઉટ", "Log out") + '</span></button></div>';
    html += '</div>';   // .prof-grid
    html += '</div>';   // .prof-wrap
    return html;
  }
  function prow(ic, k, v) { return '<div class="prof-row"><span class="prof-k">' + svg(ic) + '<span>' + k + '</span></span><span class="prof-v">' + v + '</span></div>'; }

  /* --- Edit Profile (bug 16): update Name and sign-in Email ---
     Name is saved to the user's Firestore account doc. Email is the Firebase
     sign-in identity, so changing it reauthenticates with the current password
     (never stored/shown) and, where the project requires it, sends a
     verification link before the login email switches. Admin-only, matching
     the database rules that let only the Owner write account docs. */
  function profileEditForm() {
    var u = (window.GJAuth && window.GJAuth.user) || {};
    var body =
      '<div class="fg fg-full"><label>' + L("નામ", "Name") + '</label><div class="field"><input id="pfName" type="text" maxlength="60" value="' + esc(u.name || "") + '" placeholder="' + L("તમારું નામ", "Your name") + '"></div></div>' +
      '<div class="fg fg-full"><label>' + L("ઈમેલ (સાઇન-ઇન)", "Email (sign-in)") + '</label><div class="field"><input id="pfEmail" type="email" value="' + esc(u.email || "") + '" placeholder="name@example.com"></div></div>' +
      '<div class="fg fg-full"><label>' + L("વર્તમાન પાસવર્ડ", "Current password") + '</label><div class="field"><input id="pfPass" type="password" autocomplete="current-password" placeholder="' + L("ઈમેલ બદલવા માટે જ જરૂરી", "only needed to change the email") + '"></div><div class="msg">' + L("ઈમેલ એ તમારું લોગિન છે — બદલવા સુરક્ષા માટે પાસવર્ડ જોઈએ.", "Email is your sign-in — changing it needs your current password for security.") + '</div></div>';
    showModal("users", L("પ્રોફાઇલ ફેરફાર", "Edit Profile"), u.email || "", body, saveProfileForm);
  }
  function saveProfileForm() {
    var u = (window.GJAuth && window.GJAuth.user) || {};
    var newName = fVal("#pfName").trim(), newEmail = fVal("#pfEmail").trim(), pw = fVal("#pfPass");
    var nameChanged = newName !== (u.name || ""), emailChanged = !!newEmail && newEmail.toLowerCase() !== String(u.email || "").toLowerCase();
    if (!newName) { toast(L("નામ ખાલી ન રાખો", "Name can't be empty"), "info"); return; }
    if (!nameChanged && !emailChanged) { closeModal(); return; }
    if (emailChanged && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) { toast(L("માન્ય ઈમેલ દાખલ કરો", "Enter a valid email"), "info"); return; }
    if (emailChanged && !pw) { toast(L("ઈમેલ બદલવા વર્તમાન પાસવર્ડ દાખલ કરો", "Enter your current password to change the email"), "info"); return; }
    var auth = window.GJAuth && window.GJAuth.auth, db = window.GJAuth && window.GJAuth.db, uid = u.uid;
    closeModal();
    // DEMO / offline — update the signed-in profile locally
    if (!db || !uid) { if (window.GJAuth && window.GJAuth.user) { window.GJAuth.user.name = newName; if (emailChanged) window.GJAuth.user.email = newEmail; } render(); toast(L("પ્રોફાઇલ અપડેટ થઈ", "Profile updated"), "ok"); return; }
    function fail(e) {
      var code = (e && (e.code || e.message)) || "";
      if (/wrong-password|invalid-credential|invalid-login/i.test(code)) toast(L("પાસવર્ડ ખોટો છે.", "The password is incorrect."), "error");
      else if (/requires-recent-login/i.test(code)) toast(L("સુરક્ષા માટે ફરી લોગિન કરી, પછી ઈમેલ બદલો.", "For security, log out and back in, then change the email."), "error");
      else if (/email-already-in-use/i.test(code)) toast(L("આ ઈમેલ પહેલેથી વપરાયેલ છે.", "That email is already in use."), "error");
      else if (/permission/i.test(code)) toast(L("સેવ બ્લોક — ડેટાબેઝ નિયમો પબ્લિશ કરો.", "Save blocked — publish the database rules."), "error");
      else toast(L("અપડેટ નિષ્ફળ.", "Update failed."), "error");
    }
    // 1) save the name first (if changed)
    var step = Promise.resolve();
    if (nameChanged) step = step.then(function () { return db.collection("users").doc(uid).set({ name: newName }, { merge: true }).then(function () { window.GJAuth.user.name = newName; }); });
    step.then(function () {
      if (!emailChanged) { render(); toast(L("પ્રોફાઇલ અપડેટ થઈ", "Profile updated"), "ok"); return; }
      var cu = auth && auth.currentUser;
      if (!cu || !cu.updateEmail) { render(); toast(L("નામ અપડેટ થયું. આ બિલ્ડમાં ઈમેલ બદલી શકાતું નથી.", "Name updated. Email can't be changed in this build."), "info"); return; }
      var EP = window.firebase && firebase.auth && firebase.auth.EmailAuthProvider;
      var reauth = (EP && cu.reauthenticateWithCredential) ? cu.reauthenticateWithCredential(EP.credential(u.email, pw)) : Promise.resolve();
      toast(L("ઈમેલ અપડેટ થઈ રહ્યું છે…", "Updating email…"), "info");
      return reauth.then(function () {
        if (cu.verifyBeforeUpdateEmail) return cu.verifyBeforeUpdateEmail(newEmail).then(function () { return "verify"; });
        return cu.updateEmail(newEmail).then(function () { return "done"; });
      }).then(function (mode) {
        if (mode === "verify") { render(); toast(L("ચકાસણી લિંક નવા ઈમેલ પર મોકલી — પુષ્ટિ પછી લોગિન ઈમેલ બદલાશે.", "A verification link was sent to the new email — the sign-in email changes after you confirm it."), "ok"); return; }
        return db.collection("users").doc(uid).set({ email: newEmail }, { merge: true }).then(function () { window.GJAuth.user.email = newEmail; render(); toast(L("પ્રોફાઇલ અપડેટ થઈ", "Profile updated"), "ok"); });
      });
    }).catch(fail);
  }

  /* ---------------------------------------------------------------- RENDER */
  function render() {
    if (!viewAllowed(STATE.view)) STATE.view = (STATE.role === "supervisor" ? "gate" : "dashboard");
    var map = { dashboard: viewDashboard, gate: viewGate, gatesheet: viewGateSheet, packing: viewPacking, packingsheet: viewPackingSheet, ledger: viewLedger, niwar: viewNiwar, niwarsheet: viewNiwarSheet, upad: viewUpad, billing: viewBilling, loans: viewLoans, yearend: viewYearEnd, workers: viewWorkers, usermgmt: viewUserMgmt, backup: viewBackup, help: viewHelp, profile: viewProfile };
    _inRender = true;
    $("#view").innerHTML = (map[STATE.view] || viewDashboard)();
    document.querySelectorAll("[data-nav]").forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-nav") === (STATE.view === "gatesheet" ? "gate" : STATE.view)); });
    wire();
    buildSwitchers();                 // populate + wire the worker/month selectors (dashboard only)
    decorateEditor();                 // editing banner + view-only enforcement for sheet editors
    updateBackFab();
    if (window.scrollTo) window.scrollTo(0, 0);
    schedulePersist();
    syncRoute();                      // keep the URL hash + saved route in step with the current page
    _inRender = false;
  }

  /* ---------------- Route persistence (survive a browser refresh) ----------------
     The app is a hash-routed SPA: the current module is mirrored into location.hash
     (so refresh / direct URL / back-forward all land on the same page) and the
     selected worker + month are saved locally. Language already persists separately. */
  function routeId() {
    var ed = { gatesheet: "gate", niwarsheet: "niwar", packingsheet: "packing" };   // editors map to their list
    if (ed[STATE.view]) return ed[STATE.view];
    return NAV.some(function (n) { return n.id === STATE.view; }) ? STATE.view : "dashboard";
  }
  var _lastRouteHash = null;
  function syncRoute() {
    var id = routeId();
    if (id !== _lastRouteHash) { _lastRouteHash = id; try { history.replaceState(null, "", "#" + id); } catch (e) {} }
    try { localStorage.setItem("gj_route", JSON.stringify({ view: id, worker: STATE.worker, month: STATE.month })); } catch (e) {}
  }
  function restoreRoute() {
    var route = null; try { route = JSON.parse(localStorage.getItem("gj_route") || "null"); } catch (e) {}
    var h = (location.hash || "").replace("#", "");
    var view = "dashboard";
    if (h && NAV.some(function (n) { return n.id === h; })) view = h;                         // URL hash wins (direct access / refresh)
    else if (route && route.view && NAV.some(function (n) { return n.id === route.view; })) view = route.view;
    if (route) {
      if (route.worker) STATE.worker = route.worker;                                           // validated later against loaded data
      if (route.month && MONTHS.some(function (m) { return m.id === route.month; })) STATE.month = route.month;
    }
    STATE.view = view;   // render() re-checks viewAllowed() for the role and falls back if needed
  }
  // Global Back button — editor screens step back to their list; any other screen
  // returns to the dashboard; the dashboard itself (home) hides it.
  function backTarget() {
    var m = { gatesheet: "gate", niwarsheet: "niwar", packingsheet: "packing" };
    if (m[STATE.view]) return m[STATE.view];
    if (STATE.view === "dashboard") return null;
    return "dashboard";
  }
  function updateBackFab() {
    var fab = $("#backFab"); if (!fab) return;
    var t = backTarget();
    if (!t || !viewAllowed(t)) { fab.classList.remove("show"); fab.onclick = null; return; }
    var txt = fab.querySelector(".bf-txt"); if (txt) txt.textContent = L("પાછળ", "Back");
    fab.setAttribute("aria-label", L("પાછળ", "Back"));
    fab.onclick = function () { go(t); };
    fab.classList.add("show");
  }
  function go(v) {
    if (!viewAllowed(v)) return;
    try { if (window.__gjCloseNav) window.__gjCloseNav(); } catch (e) {}
    try { if (window.__gjClosePf) window.__gjClosePf(); } catch (e) {}
    var wasEditor = /sheet$/.test(STATE.view);
    var wasEditable = wasEditor && editableEditorNow();
    if (wasEditable) mergePendingRemoteBeforeSave();    // fold in others' saves before I push mine
    if (wasEditable) touchEditItem();                   // bug 24: stamp update time before leaving the editor
    if (wasEditor) releaseEditorLock();                 // let other users edit this sheet now
    STATE.view = v; _pendingEdit = false;
    render();
    if (wasEditable) flushPersistNow();                 // Done/Back = save → everyone sees it
  }
  function openSheet(id) { STATE.sheetId = id; STATE.view = "gatesheet"; _pendingEdit = false; render(); acquireEditorLock(); }
  function isEmptySheet(sh) {
    if (!sh) return false;
    if (sheetRolls(sh) > 0 || sheetKgG(sh) > 0) return false;
    for (var i = 0; i < (sh.parat || []).length; i++) { if (sh.parat[i].kokdi != null || sh.parat[i].color != null) return false; }
    return true;
  }
  function newSheet() {
    var m = monthObj(); var date = m.id + "-" + pad(Math.min(28, new Date().getDate()));
    // Guard against a duplicate blank sheet from a double-tap/double submit: if an empty
    // sheet for this worker already exists this month, reuse it instead of stacking another.
    var existing = SHEETS.filter(function (s) { return s.workerId === STATE.worker && s.date.slice(0, 7) === STATE.month && isEmptySheet(s); });
    if (existing.length) { openSheet(existing[existing.length - 1].id); return; }
    var sh = blankSheet(STATE.worker, date); sh.updatedAt = Date.now(); SHEETS.push(sh); openSheet(sh.id);   /* bug 24 */
    toast(L("નવી શીટ બની", "New sheet created"), "ok");
  }

  function wire() {
    document.querySelectorAll("[data-go]").forEach(function (b) { b.onclick = function () { go(b.getAttribute("data-go")); }; });
    document.querySelectorAll("[data-logout]").forEach(function (b) { b.onclick = function () { try { if (window.GJAuth && window.GJAuth.logout) window.GJAuth.logout(); } catch (e) {} }; });
    document.querySelectorAll("[data-opensheet]").forEach(function (b) { b.onclick = function () { openSheet(b.getAttribute("data-opensheet")); }; });
    var gf = $("#gateFilter"); if (gf) gf.onchange = function () { STATE.gateFilter = gf.value; render(); };
    document.querySelectorAll("[data-newsheet]").forEach(function (b) { b.onclick = function () { newSheet(); }; });
    document.querySelectorAll("[data-openworker]").forEach(function (b) { b.onclick = function () { STATE.worker = b.getAttribute("data-openworker"); syncSwitchers(); go("ledger"); }; });
    document.querySelectorAll("[data-lock]").forEach(function (b) { b.onclick = function () { infoModal(b.getAttribute("data-lock"), L("જોબ વર્કર ઉમેરવા/બદલવાનું લાઇવ બિલ્ડમાં સક્ષમ થશે.", "Adding or editing job workers will be enabled in the live build.")); }; });
    document.querySelectorAll("[data-addworker]").forEach(function (b) { b.onclick = function () { workerForm(null); }; });
    // ---- Backup & Restore (admin only) ----
    var bkc = document.querySelector("[data-bk-create]"); if (bkc) bkc.onclick = function () { gjDownloadBackup(); };
    var bkf = $("#bkFile"), bkp = document.querySelector("[data-bk-pick]");
    if (bkp && bkf) bkp.onclick = function () { bkf.click(); };
    if (bkf) bkf.onchange = function () { var f = bkf.files && bkf.files[0]; bkf.value = ""; gjHandleRestoreFile(f); };
    var bkd = $("#bkDrop");
    if (bkd) {
      bkd.ondragover = function (e) { e.preventDefault(); bkd.classList.add("drag"); };
      bkd.ondragleave = function () { bkd.classList.remove("drag"); };
      bkd.ondrop = function (e) { e.preventDefault(); bkd.classList.remove("drag"); gjHandleRestoreFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); };
    }
    var fg = document.querySelector("[data-fin-generate]");
    if (fg) fg.onclick = function () { gjGenerateFinancialBackup(+fg.getAttribute("data-fin-generate"), false).then(function (r) { toast(r.ok ? L("નાણાકીય બેકઅપ ડાઉનલોડ થયું.", "Financial backup downloaded.") : L("નાણાકીય બેકઅપ નિષ્ફળ.", "Financial backup failed."), r.ok ? "ok" : "error"); if (STATE.view === "backup") render(); }); };
    var fr = document.querySelector("[data-fin-retry]");
    if (fr) fr.onclick = function () { gjGenerateFinancialBackup(+fr.getAttribute("data-fin-retry"), false).then(function (r) { toast(r.ok ? L("નાણાકીય બેકઅપ ડાઉનલોડ થયું.", "Financial backup downloaded.") : L("નાણાકીય બેકઅપ નિષ્ફળ.", "Financial backup failed."), r.ok ? "ok" : "error"); if (STATE.view === "backup") render(); }); };
    document.querySelectorAll("[data-fin-dl]").forEach(function (b) { b.onclick = function () { gjRedownloadFin(+b.getAttribute("data-fin-dl")); }; });
    var epf = document.querySelector("[data-editprofile]"); if (epf) epf.onclick = function () { profileEditForm(); };
    document.querySelectorAll("[data-editworker]").forEach(function (b) { b.onclick = function () { workerForm(b.getAttribute("data-editworker")); }; });
    document.querySelectorAll("[data-delworker]").forEach(function (b) { b.onclick = function () { delWorker(b.getAttribute("data-delworker")); }; });
    var wsearch = $("#workerSearch");
    if (wsearch) wsearch.oninput = function () {
      var q = wsearch.value.trim().toLowerCase(), rows = document.querySelectorAll("#view tr[data-wsearch]"), shown = 0;
      rows.forEach(function (r) { var m = !q || r.getAttribute("data-wsearch").indexOf(q) > -1; r.style.display = m ? "" : "none"; if (m) shown++; });
      var nm = $("#wNoMatch"); if (nm) nm.style.display = shown ? "none" : "";
      var c = $("#workerCount"); if (c) c.textContent = shown + " " + L("વર્કર", "workers");
    };
    // ---- User Management ----
    if (STATE.view === "usermgmt" && umLive() && UM.users === null && !UM.loading) loadUsers();
    document.querySelectorAll("[data-umadd]").forEach(function (b) { b.onclick = function () { umAddForm(); }; });
    document.querySelectorAll("[data-umreload]").forEach(function (b) { b.onclick = function () { UM.users = null; loadUsers(); render(); }; });
    document.querySelectorAll("[data-umedit]").forEach(function (b) { b.onclick = function () { umEditForm(b.getAttribute("data-umedit")); }; });
    document.querySelectorAll("[data-umtoggle]").forEach(function (b) { b.onclick = function () { umToggleActive(b.getAttribute("data-umtoggle")); }; });
    document.querySelectorAll("[data-umreset]").forEach(function (b) { b.onclick = function () { umResetPw(b.getAttribute("data-umreset")); }; });
    document.querySelectorAll("[data-umremove]").forEach(function (b) { b.onclick = function () { umRemove(b.getAttribute("data-umremove")); }; });
    document.querySelectorAll("[data-umsel]").forEach(function (b) { b.onclick = function () { UM.sel = b.getAttribute("data-umsel"); render(); }; });
    document.querySelectorAll("[data-ptoggle]").forEach(function (el) { el.onchange = function () { umTogglePerm(el.getAttribute("data-puser"), el.getAttribute("data-ptoggle"), el.checked); }; });
    document.querySelectorAll("[data-umactive]").forEach(function (el) { el.onchange = function () { umToggleActive(el.getAttribute("data-umactive")); }; });
    document.querySelectorAll("[data-umlimit]").forEach(function (b) { b.onclick = function () { umEditLimit(); }; });
    document.querySelectorAll("[data-addnparty]").forEach(function (b) { b.onclick = function () { nPartyForm(null); }; });
    document.querySelectorAll("[data-editnparty]").forEach(function (b) { b.onclick = function () { nPartyForm(b.getAttribute("data-editnparty")); }; });
    document.querySelectorAll("[data-delnparty]").forEach(function (b) { b.onclick = function () { delNParty(b.getAttribute("data-delnparty")); }; });
    document.querySelectorAll("[data-loannew]").forEach(function (b) { b.onclick = function () { openLoan(); }; });
    document.querySelectorAll("[data-upadnew]").forEach(function (b) { b.onclick = function () { openUpad(null); }; });
    document.querySelectorAll("[data-upadedit]").forEach(function (b) { b.onclick = function () { openUpad(b.getAttribute("data-upadedit")); }; });
    document.querySelectorAll("[data-upaddel]").forEach(function (b) { b.onclick = function () { delUpad(b.getAttribute("data-upaddel")); }; });
    document.querySelectorAll("[data-newnsheet]").forEach(function (b) { b.onclick = function () { newNSheet(); }; });
    document.querySelectorAll("[data-opennsheet]").forEach(function (b) { b.onclick = function () { openNSheet(b.getAttribute("data-opennsheet")); }; });
    document.querySelectorAll("[data-delnsheet]").forEach(function (b) { b.onclick = function () { delNSheet(b.getAttribute("data-delnsheet")); }; });
    document.querySelectorAll("[data-nupadnew]").forEach(function (b) { b.onclick = function () { openNUpad(null); }; });
    document.querySelectorAll("[data-nupadedit]").forEach(function (b) { b.onclick = function () { openNUpad(b.getAttribute("data-nupadedit")); }; });
    document.querySelectorAll("[data-nupaddel]").forEach(function (b) { b.onclick = function () { delNUpad(b.getAttribute("data-nupaddel")); }; });
    document.querySelectorAll("[data-nloannew]").forEach(function (b) { b.onclick = function () { openNLoan(); }; });
    document.querySelectorAll("[data-delsheet]").forEach(function (b) { b.onclick = function () { delSheet(b.getAttribute("data-delsheet")); }; });
    document.querySelectorAll("[data-sheetpdf]").forEach(function (b) { b.onclick = function () { makeSheetPDF(STATE.sheetId, b.getAttribute("data-sheetpdf")); }; });
    document.querySelectorAll("[data-sheetwa]").forEach(function (b) { b.onclick = function () { var sh = sheetById(STATE.sheetId); if (sh) waShare(sheetWaText(sh), waDigits(workerById(sh.workerId).phone)); }; });
    var wb = $("#waBill"); if (wb) wb.onclick = function () { waShare(billWaText(), waDigits(worker().phone)); };

    document.querySelectorAll("[data-openpacking]").forEach(function (b) { b.onclick = function () { openPacking(b.getAttribute("data-openpacking")); }; });
    document.querySelectorAll("[data-newpacking]").forEach(function (b) { b.onclick = function () { newPacking(); }; });
    document.querySelectorAll("[data-delpacking]").forEach(function (b) { b.onclick = function () { delPacking(b.getAttribute("data-delpacking")); }; });
    document.querySelectorAll("[data-packpdf]").forEach(function (b) { b.onclick = function () { makePackingPDF(STATE.packingId); }; });

    wireSheetEditor();
    wirePackingEditor();
    wireBilling();
    wireNiwar();
    wireNiwarSheet();
    wireGridNav();   // bug 17: ↑/↓/←/→ + Enter navigation across all data-entry grids
    var lr = $("#loanReport"); if (lr) lr.onclick = makeLoanPDF;
    document.querySelectorAll("[data-delloan]").forEach(function (b) { b.onclick = function () { delLoanTxn(b.getAttribute("data-delloan")); }; });   /* bug 23 */
    var ur = $("#upadReport"); if (ur) ur.onclick = makeUpadPDF;
    var yp = $("#yePdf"); if (yp) yp.onclick = makeYearEndPDF;
    var ag = $("#ag"); if (ag) { ag.oninput = function () { setTxt("#agV", (parseFloat(ag.value || 0) || 0).toFixed(2) + "%"); }; ag.onchange = function () { var v = Math.max(0, parseFloat(ag.value || 0) || 0); if (v > CAP.ghatiPct) { v = CAP.ghatiPct; toast(L("મહત્તમ 100%", "Maximum 100%"), "info"); } worker().actualGhati = v; render(); }; }   /* bug 21: % ≤ 100 */
    var gr = $("#gr"); if (gr) { gr.oninput = function () { setTxt("#grV", moneyP(rupToP(Math.max(0, parseFloat(gr.value || 0))))); }; gr.onchange = function () { GHATI_RATE.v = clampNum(gr.value, CAP.ghatiRate, capMsg); render(); }; }   /* bug 21 */
    var pc = $("#pdfCompany"); if (pc) pc.onclick = function () { makeBillPDF("company"); };
    var pw = $("#pdfWorker"); if (pw) pw.onclick = function () { makeBillPDF("worker"); };
    var pb = $("#pdfBoth"); if (pb) pb.onclick = function () { makeBillPDF("company", true); };
  }
  function setTxt(id, t) { var el = $(id); if (el) el.textContent = t; }

  // bug 24: stamp the sheet being edited so the listing can float it to the top
  function touchEditItem() {
    var now = Date.now();
    if (STATE.view === "gatesheet") { var s = sheetById(STATE.sheetId); if (s) s.updatedAt = now; }
    else if (STATE.view === "packingsheet") { var p = PACKING.filter(function (x) { return x.id === STATE.packingId; })[0]; if (p) p.updatedAt = now; }
    else if (STATE.view === "niwarsheet") { var n = nSheetById(STATE.niwarSheetId); if (n) n.updatedAt = now; }
  }

  /* --- Arrow-key grid navigation for sheet data-entry cells (bug 17) ---
     ↓ / Enter move to the cell below, ↑ to the cell above, and ← / → move
     between columns but ONLY when the caret sits at the edge of the text,
     so they never interfere with editing a value mid-string. Works for
     every grid: gate metres (data-mt), packing metres (data-pmt), niwar
     lots (data-np-cell). Single-row KG strips (data-kg/data-pkg) get ← / →. */
  function gjCellNav(attr, sep) {
    document.querySelectorAll("[" + attr + "]").forEach(function (el) {
      el.addEventListener("keydown", function (e) {
        var k = e.key;
        if (k !== "ArrowUp" && k !== "ArrowDown" && k !== "ArrowLeft" && k !== "ArrowRight" && k !== "Enter") return;
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
        var p = (el.getAttribute(attr) || "").split(sep), c = +p[0], r = +p[1], len = (el.value || "").length;
        var atStart = el.selectionStart === 0 && el.selectionEnd === 0;
        var atEnd = el.selectionStart === len && el.selectionEnd === len;
        function at(cc, rr) { return document.querySelector('[' + attr + '="' + cc + sep + rr + '"]'); }
        var t = null;
        if (k === "ArrowDown" || k === "Enter") t = at(c, r + 1);
        else if (k === "ArrowUp") t = at(c, r - 1);
        else if (k === "ArrowLeft") { if (!atStart) return; t = at(c - 1, r); }
        else if (k === "ArrowRight") { if (!atEnd) return; t = at(c + 1, r); }
        if (t && !t.disabled) { e.preventDefault(); t.focus(); if (t.select) t.select(); }
      });
    });
  }
  function gjRowNav(attr) {
    document.querySelectorAll("[" + attr + "]").forEach(function (el) {
      el.addEventListener("keydown", function (e) {
        var k = e.key; if (k !== "ArrowLeft" && k !== "ArrowRight") return;
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
        var c = +el.getAttribute(attr), len = (el.value || "").length;
        var atStart = el.selectionStart === 0 && el.selectionEnd === 0;
        var atEnd = el.selectionStart === len && el.selectionEnd === len;
        var t = null;
        if (k === "ArrowLeft") { if (!atStart) return; t = document.querySelector('[' + attr + '="' + (c - 1) + '"]'); }
        else { if (!atEnd) return; t = document.querySelector('[' + attr + '="' + (c + 1) + '"]'); }
        if (t && !t.disabled) { e.preventDefault(); t.focus(); if (t.select) t.select(); }
      });
    });
  }
  function wireGridNav() {
    gjCellNav("data-mt", "_"); gjCellNav("data-pmt", "_"); gjCellNav("data-np-cell", "-");
    gjRowNav("data-kg"); gjRowNav("data-pkg");
  }

  /* --- sheet editor live wiring (no full re-render) --- */
  function wireSheetEditor() {
    var sh = sheetById(STATE.sheetId); if (!sh || STATE.view !== "gatesheet") return;
    document.querySelectorAll("[data-sh]").forEach(function (el) {
      el.onchange = function () {
        var k = el.getAttribute("data-sh");
        if (k === "date") {
          var v = el.value;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { el.value = sh.date; return; }   // ignore a cleared/invalid value
          sh.date = v;
          var nm = v.slice(0, 7);
          if (nm !== STATE.month) { STATE.month = nm; render(); }               // follow the picked date's month so the sheet's data loads for it
          else schedulePersist();
          return;
        }
        sh[k] = el.value; if (k === "workerId") render(); else schedulePersist();
      };
    });
    document.querySelectorAll("[data-mt]").forEach(function (el) {
      el.oninput = function () {
        var d = el.value.replace(/\D/g, "").slice(0, 2);     /* digits only, max 2 */
        if (d !== el.value) el.value = d;
        var p = el.getAttribute("data-mt").split("_"); var s = +p[0], r = +p[1];
        sh.meters[s][r] = d === "" ? null : parseInt(d, 10);
        setTxt("#stot_" + s, numI(stepTotalMt(sh, s)));
        syncKgLock(sh, s);                                    /* bug 3: KG editable only when this step has a metre entry */
        setTxt("#sumRoll", numI(sheetRolls(sh)));
        setTxt("#sumMt", numI(sheetMt(sh)));
        schedulePersist();                                    /* auto-save typed rolls (debounced) */
        if (d.length === 2) {                                 /* 2 digits → jump to next row, same step */
          var next = document.querySelector('[data-mt="' + s + '_' + (r + 1) + '"]');
          if (next) { next.focus(); if (next.select) next.select(); }
        }
      };
    });
    document.querySelectorAll("[data-kg]").forEach(function (el) { el.oninput = function () { var s = +el.getAttribute("data-kg"); if (stepTotalMt(sh, s) <= 0) { el.value = ""; sh.kg[s] = null; toast(L("પહેલાં આ સ્ટેપમાં મીટર ભરો", "Enter metres in this step first"), "info"); setTxt("#sumKg", kgStr(B(sheetKgG(sh)))); return; } sh.kg[s] = sanitizeDecimalField(el, 8, 3, KG_MAX, kgMaxMsg); setTxt("#sumKg", kgStr(B(sheetKgG(sh)))); schedulePersist(); }; });   /* bug 3 + bug 20 (values > 99,999 compute correctly) */
    document.querySelectorAll("[data-pk]").forEach(function (el) { el.oninput = function () { sh.parat[+el.getAttribute("data-pk")].kokdi = sanitizeDecimalField(el, 7, 3); refreshParat(sh); schedulePersist(); }; });   /* bug 4: accept lakh values */
    document.querySelectorAll("[data-pc]").forEach(function (el) { el.oninput = function () { sh.parat[+el.getAttribute("data-pc")].color = sanitizeDecimalField(el, 7, 3); refreshParat(sh); schedulePersist(); }; });   /* bug 4: accept lakh values */
    document.querySelectorAll("[data-pdel]").forEach(function (el) { el.onclick = function () { sh.parat.splice(+el.getAttribute("data-pdel"), 1); render(); }; });
    var pa = $("#paratAdd"); if (pa) pa.onclick = function () { if (sh.parat.length >= 5) { toast(L("વધુમાં વધુ 5 લાઇન", "Maximum 5 lines"), "info"); return; } sh.parat.push({ kokdi: null, color: null }); render(); };   /* bug 4: max 5 lines */
    var sp = $("#stepPlus"); if (sp) sp.onclick = function () { if (sh.nSteps < MAX_STEPS) { sh.nSteps++; render(); } };
    var sm = $("#stepMinus"); if (sm) sm.onclick = function () { if (sh.nSteps > 1) { sh.nSteps--; render(); } };
  }
  function refreshParat(sh) { setTxt("#pkTot", kgStr(B(sheetKokdiG(sh)))); setTxt("#pcTot", kgStr(B(sheetColorG(sh)))); setTxt("#pBoth", kgStr(B(sheetKokdiG(sh) + sheetColorG(sh)))); }
  // Packing: a step's KG box is usable only once that step has at least one metre entry
  // (mirrors the gate sheet). Called live as metres are typed, so focus is preserved.
  function syncPkKgLock(p, s) {
    var kgEl = document.querySelector('[data-pkg="' + s + '"]'); if (!kgEl) return;
    var has = pkStepTotal(p, s) > 0;
    kgEl.disabled = !has;
    kgEl.classList.toggle("kg-locked", !has);
    if (has) { kgEl.removeAttribute("title"); }
    else { kgEl.title = L("પહેલાં આ સ્ટેપમાં મીટર ભરો", "Enter metres in this step first"); if (p.kg[s] != null) { p.kg[s] = null; kgEl.value = ""; setTxt("#pSumKg", kgStr(B(pkKgG(p)))); refreshPk(); schedulePersist(); } }
  }
  // bug 3: a step's KG box is enabled only once that step has at least one metre entry.
  // Called live as metres are typed (no full re-render), so focus is preserved.
  function syncKgLock(sh, s) {
    var kgEl = document.querySelector('[data-kg="' + s + '"]'); if (!kgEl) return;
    var has = stepTotalMt(sh, s) > 0;
    kgEl.disabled = !has;
    kgEl.classList.toggle("kg-locked", !has);
    if (has) { kgEl.removeAttribute("title"); }
    else { kgEl.title = L("પહેલાં આ સ્ટેપમાં મીટર ભરો", "Enter metres in this step first"); if (sh.kg[s] != null) { sh.kg[s] = null; kgEl.value = ""; setTxt("#sumKg", kgStr(B(sheetKgG(sh)))); schedulePersist(); } }
  }
  function delSheet(id) {
    infoModalConfirm(L("શીટ કાઢવી?", "Delete sheet?"), L("આ શીટ અને તેની ખાતાવહી એન્ટ્રી કાઢી નાખશે.", "This removes the sheet and its ledger entry."), function () { SHEETS = SHEETS.filter(function (s) { return s.id !== id; }); STATE.view = "gate"; render(); flushPersistNow(); toast(L("શીટ કાઢી", "Sheet deleted"), "ok"); });
  }

  /* --- billing live wiring --- */
  function wireBilling() {
    if (STATE.view !== "billing") return;
    if (!WORKERS.length) return;         // empty state shown — nothing to wire
    var w = worker(), mid = STATE.month, bl = BILL[w.id][mid];
    function pf(v) { v = parseFloat(v); return isNaN(v) ? 0 : Math.max(0, v); }
    var rate = $("#rate"); if (rate) { rate.oninput = function () { setTxt("#rateV", rateStr(rupToP(pf(rate.value)))); }; rate.onchange = function () { bl.rate = pf(rate.value); render(); }; }
    var tempo = $("#tempo"); if (tempo) { tempo.oninput = function () { setTxt("#tempoV", moneyP(rupToP(pf(tempo.value)))); }; tempo.onchange = function () { bl.tempo = clampNum(tempo.value, CAP.tempo, capMsg); render(); }; }   /* bug 21 */
    var deduct = $("#deduct"); if (deduct) { deduct.oninput = function () { setTxt("#deductV", moneyP(rupToP(pf(deduct.value)))); }; deduct.onchange = function () { bl.loanDeductP = rupToP(clampNum(deduct.value, CAP.paid, capMsg)); bl.paidP = null; render(); }; }   /* bug 21 */
    var paid = $("#paid"); if (paid) { paid.oninput = function () { setTxt("#paidV", moneyP(rupToP(pf(paid.value)))); }; paid.onchange = function () { bl.paidP = rupToP(clampNum(paid.value, CAP.paid, capMsg)); render(); }; }   /* bug 21 */
  }

  /* ---------------------------------------------------------------- LOAN modal */
  function openLoan() {
    var w = worker();
    var body = '<div class="form-grid"><div class="fg fg-full"><label>' + L("પ્રકાર", "Type") + '</label><div class="field"><select data-l="type"><option value="loan">' + L("લોન આપી (+)", "Loan given (+)") + '</option><option value="topup">' + L("ટોપ-અપ (+)", "Top-up (+)") + '</option><option value="repay">' + L("વસૂલ (−)", "Repayment (−)") + '</option></select></div></div>' +
      '<div class="fg" data-fg="lamt"><label>' + L("રકમ (₹)", "Amount (₹)") + '</label><div class="field"><span class="pre">₹</span><input type="number" data-l="amt" min="1" max="10000000" value="10000"></div><div class="msg">' + L("માન્ય રકમ", "Enter amount") + '</div></div>' +
      '<div class="fg"><label>' + L("તારીખ (દિવસ)", "Date (day)") + '</label><div class="field"><input type="number" data-l="day" min="1" max="31" value="18"></div></div>' +
      '<div class="fg fg-full"><label>' + L("નોંધ", "Note") + '</label><div class="field"><input data-l="note" value=""></div></div></div><div class="hint">' + wNm(w) + ' · ' + monthName() + '</div>';
    showModal("rupee", L("લોન એન્ટ્રી", "Loan entry"), wNm(w), body, saveLoan);
  }
  // Delete a single loan transaction (bug 23). Totals (Given / Recovered /
  // Outstanding) are derived live from LOANS, so render() recalculates them.
  function delLoanTxn(id) {
    if (STATE.role !== "admin") return;
    var w = worker(), list = LOANS[w.id] || [], t = list.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    var typ = t.type === "loan" ? L("લોન આપી", "Loan given") : t.type === "topup" ? L("ટોપ-અપ", "Top-up") : L("વસૂલ", "Repayment");
    infoModalConfirm(L("લોન એન્ટ્રી કાઢવી?", "Delete loan entry?"),
      typ + " · ₹" + inrN(t.amt) + " · " + dmy(t.d) + " — " + L("આ વ્યવહાર કાયમ માટે કાઢી નાખશે; કુલ આપ્યું, વસૂલ અને બાકી ફરી ગણાશે.", "this permanently deletes the transaction; Total given, recovered and outstanding are recalculated."),
      function () { LOANS[w.id] = (LOANS[w.id] || []).filter(function (x) { return x.id !== id; }); render(); flushPersistNow(); toast(L("લોન એન્ટ્રી કાઢી", "Loan entry deleted"), "ok"); });
  }
  function saveLoan() {
    function val(k) { var el = document.querySelector('[data-l="' + k + '"]'); return el ? el.value : ""; }
    var amt = parseFloat(val("amt")), day = parseInt(val("day"), 10);
    var ok = !(isNaN(amt) || amt < 1 || amt > CAP.loan || isNaN(day) || day < 1 || day > 31);
    var fg = document.querySelector('[data-fg="lamt"]'); if (fg) fg.classList.toggle("err", !ok); if (!ok) { if (!isNaN(amt) && amt > CAP.loan) capMsg(CAP.loan); return; }
    var m = monthObj(); var d = "2026-" + pad(m.mm) + "-" + pad(day);
    (LOANS[STATE.worker] = LOANS[STATE.worker] || []).push({ id: rid(), d: d, type: val("type"), amt: Math.round(amt), note: val("note") || (val("type") === "repay" ? L("વસૂલ", "Repayment") : L("લોન", "Loan")) });
    closeModal(); render(); toast(L("લોન એન્ટ્રી ઉમેરાઈ", "Loan entry added"), "ok");
  }

  /* ---------------------------------------------------------------- UPAD modal */
  var upadEditId = null;
  function openUpad(editId) {
    var w = worker(); var m = monthObj();
    upadEditId = editId || null;
    var ex = editId ? (UPAD[w.id] || []).filter(function (t) { return t.id === editId; })[0] : null;
    var defDay = ex ? parseInt(ex.d.slice(8), 10) : Math.min(28, new Date().getDate());
    var lastDay = new Date(2026, m.mm, 0).getDate();
    var body = '<div class="form-grid">' +
      '<div class="fg" data-fg="uamt"><label>' + L("રકમ (₹)", "Amount (₹)") + '</label><div class="field"><span class="pre">₹</span><input type="number" data-u="amt" min="1" max="1000000" step="100" value="' + (ex ? ex.amt : 2000) + '"></div><div class="msg">' + L("માન્ય રકમ દાખલ કરો", "Enter a valid amount") + '</div></div>' +
      '<div class="fg" data-fg="uday"><label>' + L("તારીખ (દિવસ)", "Date (day)") + '</label><div class="field"><input type="number" data-u="day" min="1" max="' + lastDay + '" value="' + defDay + '"></div><div class="msg">1–' + lastDay + '</div></div>' +
      '<div class="fg fg-full"><label>' + L("નોંધ", "Note") + '</label><div class="field"><input data-u="note" value="' + (ex ? esc(ex.note) : L("અઠવાડિક ઉપડ", "Weekly advance")) + '"></div></div></div>' +
      '<div class="hint">' + wNm(w) + ' · ' + monthName() + ' — ' + L("ઉપડ ફક્ત આ મહિનામાં નોંધાય.", "upad is recorded within this month only.") + '</div>';
    showModal("wallet", editId ? L("ઉપડ ફેરફાર", "Edit upad") : L("ઉપડ એન્ટ્રી", "Upad entry"), wNm(w) + " · " + monthName(), body, saveUpad);
  }
  function saveUpad() {
    var w = worker(); var m = monthObj(); var lastDay = new Date(2026, m.mm, 0).getDate();
    function val(k) { var el = document.querySelector('[data-u="' + k + '"]'); return el ? el.value : ""; }
    var amt = parseFloat(val("amt")), day = parseInt(val("day"), 10);
    var okA = !(isNaN(amt) || amt < 1 || amt > CAP.upad), okD = !(isNaN(day) || day < 1 || day > lastDay);
    if (!isNaN(amt) && amt > CAP.upad) capMsg(CAP.upad);
    var fa = document.querySelector('[data-fg="uamt"]'); if (fa) fa.classList.toggle("err", !okA);
    var fd = document.querySelector('[data-fg="uday"]'); if (fd) fd.classList.toggle("err", !okD);
    if (!okA || !okD) return;
    var d = "2026-" + pad(m.mm) + "-" + pad(day);
    var note = val("note") || L("અઠવાડિક ઉપડ", "Weekly advance");
    UPAD[w.id] = UPAD[w.id] || [];
    if (upadEditId) {
      var ex = UPAD[w.id].filter(function (t) { return t.id === upadEditId; })[0];
      if (ex) { ex.d = d; ex.amt = Math.round(amt); ex.note = note; }
    } else {
      UPAD[w.id].push({ id: rid(), d: d, amt: Math.round(amt), note: note });
    }
    /* editing the month's upad re-opens the settlement default so the bill reflects it */
    var bl = BILL[w.id][m.id]; if (bl) bl.paidP = null;
    upadEditId = null; closeModal(); render(); toast(L("ઉપડ સેવ થયું", "Upad saved"), "ok");
  }
  function delUpad(id) {
    var w = worker();
    infoModalConfirm(L("ઉપડ કાઢવું?", "Delete upad?"), L("આ ઉપડ એન્ટ્રી કાઢી નાખશે; બિલ ફરી ગણાશે.", "This removes the upad entry; the bill will recompute."), function () {
      UPAD[w.id] = (UPAD[w.id] || []).filter(function (t) { return t.id !== id; });
      var bl = BILL[w.id][STATE.month]; if (bl) bl.paidP = null;
      render(); toast(L("ઉપડ કાઢ્યું", "Upad deleted"), "ok");
    });
  }

  /* ---------------------------------------------------------------- NIWAR actions */
  function newNSheet() {
    if (!NWORKERS.length) { toast(L("પહેલા નિવાર પાર્ટી ઉમેરો", "Add a niwar party first"), "info"); return; }
    var p = niwarParty(), mid = STATE.month;
    var sh = blankNSheet(p.id, mid + "-" + pad(Math.min(28, new Date().getDate())));
    NSHEETS.push(sh); STATE.niwarSheetId = sh.id; STATE.view = "niwarsheet"; _pendingEdit = false; render(); acquireEditorLock(); toast(L("નિવાર શીટ બની", "Niwar sheet created"), "ok");
  }
  function openNSheet(id) { STATE.niwarSheetId = id; STATE.view = "niwarsheet"; _pendingEdit = false; render(); acquireEditorLock(); }
  function delNSheet(id) {
    infoModalConfirm(L("નિવાર શીટ કાઢવી?", "Delete niwar sheet?"), L("આ ડિલિવરી શીટ કાઢી નાખશે; ખાતાવહી/બિલ ફરી ગણાશે.", "This removes the delivery sheet; the ledger/bill recomputes."), function () {
      NSHEETS = NSHEETS.filter(function (s) { return s.id !== id; }); STATE.view = "niwar"; render(); flushPersistNow(); toast(L("કાઢ્યું", "Deleted"), "ok");
    });
  }
  function curNSheet() { return nSheetById(STATE.niwarSheetId); }
  function nRecalc() { var s = curNSheet(); if (s) { var pr = NPARAM[s.partyId] && NPARAM[s.partyId][s.date.slice(0, 7)]; if (pr) pr.paidP = null; } }
  function addNProduct() { var s = curNSheet(); if (!s) return; s.products.push({ size: "1", lots: [] }); nRecalc(); render(); }
  function delNProduct(pi) { var s = curNSheet(); if (!s) return; s.products.splice(pi, 1); if (!s.products.length) s.products.push({ size: "1", lots: [] }); nRecalc(); render(); }
  function nRefreshSheetTotals() {
    var s = curNSheet(); if (!s) return;
    (s.products || []).forEach(function (prod, pi) { setTxt("#npt-" + pi, kgStr(nProductG(prod)) + " kg"); });
    var niwar = nSheetNiwarG(s); setTxt("#nsn", kgStr(niwar)); setTxt("#nsp", kgStr(s.paratG || 0n)); setTxt("#nsnet", kgStr(niwar - (s.paratG || 0n)));
  }
  function wireNiwarSheet() {
    if (STATE.view !== "niwarsheet") return;
    var s = curNSheet(); if (!s) return;
    function pf(v) { v = parseFloat(v); return isNaN(v) ? 0 : Math.max(0, v); }
    document.querySelectorAll("[data-nh]").forEach(function (el) {
      el.onchange = function () {
        var k = el.getAttribute("data-nh");
        if (k === "date") {
          var v = el.value;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { el.value = s.date; return; }   // ignore a cleared/invalid value
          s.date = v;
          var nm = v.slice(0, 7);
          if (nm !== STATE.month) { STATE.month = nm; nRecalc(); render(); }   // month changed → re-render in the new month context
          else schedulePersist();                                             // same month → no jarring full re-render / scroll jump
          return;
        }
        s[k] = el.value; nRecalc(); render();
      };
    });
    document.querySelectorAll("[data-np-size]").forEach(function (el) { el.onchange = function () { var pi = +el.getAttribute("data-np-size"); if (s.products[pi]) { s.products[pi].size = el.value; nRecalc(); render(); } }; });
    /* 3-digit weight cells: strip to digits, cap 3, store whole kg, auto-advance to next line on the 3rd digit */
    var cells = document.querySelectorAll("[data-np-cell]");
    cells.forEach(function (el) {
      el.oninput = function () {
        var a = el.getAttribute("data-np-cell").split("-"), pi = +a[0], ri = +a[1];
        var d = (el.value || "").replace(/\D/g, "").slice(0, 3); el.value = d;
        if (s.products[pi]) { if (d === "") s.products[pi].lots[ri] = null; else s.products[pi].lots[ri] = kgToG(parseInt(d, 10)); }
        nRecalc(); nRefreshSheetTotals(); schedulePersist();
        if (d.length === 3 && ri < NL_ROWS - 1) { var nx = document.querySelector('[data-np-cell="' + pi + '-' + (ri + 1) + '"]'); if (nx) { nx.focus(); nx.select && nx.select(); } }
      };
    });
    document.querySelectorAll("[data-np-delprod]").forEach(function (el) { el.onclick = function () { delNProduct(+el.getAttribute("data-np-delprod")); }; });
    document.querySelectorAll("[data-np-addprod]").forEach(function (el) { el.onclick = function () { addNProduct(); }; });
    var par = document.querySelector("[data-np-parat]"); if (par) { var NMAXKG = 100000000; var rdPar = function () { var n = pf(par.value); if (n > NMAXKG) { n = NMAXKG; par.value = String(NMAXKG); } return n; }; par.oninput = function () { s.paratG = kgToG(rdPar()); nRecalc(); setTxt("#npar", kgStr(s.paratG) + " kg"); nRefreshSheetTotals(); schedulePersist(); }; par.onchange = function () { s.paratG = kgToG(rdPar()); render(); }; }
    document.querySelectorAll("[data-nsheetpdf]").forEach(function (el) { el.onclick = function () { makeNiwarSheetPDF(el.getAttribute("data-nsheetpdf")); }; });
  }
  function wireNiwar() {
    if (STATE.view !== "niwar") return;
    if (!NWORKERS.length) return;        // empty state shown — nothing to wire
    var p = niwarParty(), mid = STATE.month, pr = nParam(p.id, mid);
    var sel = $("#niwarPartySel"); if (sel) sel.onchange = function () { STATE.niwarParty = sel.value; render(); };
    function pf(v) { v = parseFloat(v); return isNaN(v) ? 0 : Math.max(0, v); }
    document.querySelectorAll("[data-nsize]").forEach(function (el) { el.onchange = function () { pr.sizeRates[el.getAttribute("data-nsize")] = pf(el.value); pr.paidP = null; render(); }; });
    var nYarn = $("#nYarn"); if (nYarn) { nYarn.oninput = function () { setTxt("#nYarnV", rateStr(rupToP(pf(nYarn.value)))); }; nYarn.onchange = function () { pr.yarnPrice = pf(nYarn.value); pr.paidP = null; render(); }; }
    var nGhat = $("#nGhat"); if (nGhat) { nGhat.oninput = function () { setTxt("#nGhatV", pf(nGhat.value) + "%"); }; nGhat.onchange = function () { pr.ghatPct = pf(nGhat.value); pr.paidP = null; render(); }; }
    var nTds = $("#nTds"); if (nTds) { nTds.oninput = function () { setTxt("#nTdsV", moneyP(rupToP(pf(nTds.value)))); }; nTds.onchange = function () { pr.tdsP = rupToP(pf(nTds.value)); pr.paidP = null; render(); }; }
    var nDeduct = $("#nDeduct"); if (nDeduct) { nDeduct.oninput = function () { setTxt("#nDeductV", moneyP(rupToP(pf(nDeduct.value)))); }; nDeduct.onchange = function () { pr.loanDeductP = rupToP(pf(nDeduct.value)); pr.paidP = null; render(); }; }
    var nPaid = $("#nPaid"); if (nPaid) { nPaid.oninput = function () { setTxt("#nPaidV", moneyP(rupToP(pf(nPaid.value)))); }; nPaid.onchange = function () { pr.paidP = rupToP(pf(nPaid.value)); render(); }; }
    var nWa = $("#nWa"); if (nWa) nWa.onclick = function () { waShare(niwarWaText(), waDigits(niwarParty().phone)); };
    var nc = $("#nPdfCompany"); if (nc) nc.onclick = function () { makeNiwarPDF("company"); };
    var nw = $("#nPdfWorker"); if (nw) nw.onclick = function () { makeNiwarPDF("worker"); };
  }

  /* niwar upad modal (separate store, same mechanics as textile upad) */
  var nUpadEditId = null;
  function openNUpad(editId) {
    var p = niwarParty(), m = monthObj();
    nUpadEditId = editId || null;
    var ex = editId ? (NUPAD[p.id] || []).filter(function (t) { return t.id === editId; })[0] : null;
    var lastDay = new Date(2026, m.mm, 0).getDate();
    var body = '<div class="form-grid">' +
      '<div class="fg" data-fg="nuamt"><label>' + L("રકમ (₹)", "Amount (₹)") + '</label><div class="field"><span class="pre">₹</span><input type="number" data-nu="amt" min="1" step="100" value="' + (ex ? ex.amt : 2000) + '"></div><div class="msg">' + L("માન્ય રકમ", "Enter a valid amount") + '</div></div>' +
      '<div class="fg" data-fg="nuday"><label>' + L("તારીખ (દિવસ)", "Date (day)") + '</label><div class="field"><input type="number" data-nu="day" min="1" max="' + lastDay + '" value="' + (ex ? parseInt(ex.d.slice(8), 10) : Math.min(28, new Date().getDate())) + '"></div><div class="msg">1–' + lastDay + '</div></div>' +
      '<div class="fg fg-full"><label>' + L("નોંધ", "Note") + '</label><div class="field"><input data-nu="note" value="' + (ex ? esc(ex.note) : L("અઠવાડિક ઉપડ", "Weekly advance")) + '"></div></div></div><div class="hint">' + (STATE.lang === "en" ? p.en : p.name) + ' · ' + monthName() + '</div>';
    showModal("wallet", editId ? L("ઉપડ ફેરફાર", "Edit upad") : L("નિવાર ઉપડ", "Niwar upad"), (STATE.lang === "en" ? p.en : p.name), body, saveNUpad);
  }
  function saveNUpad() {
    var p = niwarParty(), m = monthObj(), lastDay = new Date(2026, m.mm, 0).getDate();
    function val(k) { var el = document.querySelector('[data-nu="' + k + '"]'); return el ? el.value : ""; }
    var amt = parseFloat(val("amt")), day = parseInt(val("day"), 10);
    var okA = !(isNaN(amt) || amt < 1 || amt > CAP.upad), okD = !(isNaN(day) || day < 1 || day > lastDay);
    if (!isNaN(amt) && amt > CAP.upad) capMsg(CAP.upad);
    var fa = document.querySelector('[data-fg="nuamt"]'); if (fa) fa.classList.toggle("err", !okA);
    var fd = document.querySelector('[data-fg="nuday"]'); if (fd) fd.classList.toggle("err", !okD);
    if (!okA || !okD) return;
    var d = "2026-" + pad(m.mm) + "-" + pad(day), note = val("note") || L("અઠવાડિક ઉપડ", "Weekly advance");
    NUPAD[p.id] = NUPAD[p.id] || [];
    if (nUpadEditId) { var ex = NUPAD[p.id].filter(function (t) { return t.id === nUpadEditId; })[0]; if (ex) { ex.d = d; ex.amt = Math.round(amt); ex.note = note; } }
    else NUPAD[p.id].push({ id: rid(), d: d, amt: Math.round(amt), note: note });
    var pr = nParam(p.id, m.id); if (pr) pr.paidP = null;   /* bug 25: reopen the paid default so Net Payable recomputes */
    nUpadEditId = null; closeModal(); render(); flushPersistNow(); toast(L("ઉપડ સેવ થયું", "Upad saved"), "ok");
  }
  function delNUpad(id) {
    var p = niwarParty();
    infoModalConfirm(L("ઉપડ કાઢવું?", "Delete upad?"), L("આ ઉપડ એન્ટ્રી કાઢી નાખશે; બિલ ફરી ગણાશે.", "This removes the upad entry; the bill recomputes."), function () {
      NUPAD[p.id] = (NUPAD[p.id] || []).filter(function (t) { return t.id !== id; });
      var pr = nParam(p.id, monthObj().id); if (pr) pr.paidP = null; render(); flushPersistNow(); toast(L("કાઢ્યું", "Deleted"), "ok");   /* bug 25 */
    });
  }
  /* niwar loan modal */
  function openNLoan() {
    var p = niwarParty();
    var body = '<div class="form-grid"><div class="fg fg-full"><label>' + L("પ્રકાર", "Type") + '</label><div class="field"><select data-nl="type"><option value="loan">' + L("લોન આપી (+)", "Loan given (+)") + '</option><option value="topup">' + L("ટોપ-અપ (+)", "Top-up (+)") + '</option><option value="repay">' + L("વસૂલ (−)", "Repayment (−)") + '</option></select></div></div>' +
      '<div class="fg" data-fg="nlamt"><label>' + L("રકમ (₹)", "Amount (₹)") + '</label><div class="field"><span class="pre">₹</span><input type="number" data-nl="amt" min="1" value="10000"></div><div class="msg">' + L("માન્ય રકમ", "Enter amount") + '</div></div>' +
      '<div class="fg"><label>' + L("તારીખ (દિવસ)", "Date (day)") + '</label><div class="field"><input type="number" data-nl="day" min="1" max="31" value="18"></div></div>' +
      '<div class="fg fg-full"><label>' + L("નોંધ", "Note") + '</label><div class="field"><input data-nl="note" value=""></div></div></div><div class="hint">' + (STATE.lang === "en" ? p.en : p.name) + ' · ' + monthName() + '</div>';
    showModal("rupee", L("નિવાર લોન એન્ટ્રી", "Niwar loan entry"), (STATE.lang === "en" ? p.en : p.name), body, saveNLoan);
  }
  function saveNLoan() {
    var p = niwarParty();
    function val(k) { var el = document.querySelector('[data-nl="' + k + '"]'); return el ? el.value : ""; }
    var amt = parseFloat(val("amt")), day = parseInt(val("day"), 10);
    var ok = !(isNaN(amt) || amt < 1 || isNaN(day) || day < 1 || day > 31);
    var fg = document.querySelector('[data-fg="nlamt"]'); if (fg) fg.classList.toggle("err", !ok); if (!ok) return;
    var m = monthObj(), d = "2026-" + pad(m.mm) + "-" + pad(day);
    (NLOANS[p.id] = NLOANS[p.id] || []).push({ id: rid(), d: d, type: val("type"), amt: Math.round(amt), note: val("note") || (val("type") === "repay" ? L("વસૂલ", "Repayment") : L("લોન", "Loan")) });
    closeModal(); render(); toast(L("લોન એન્ટ્રી ઉમેરાઈ", "Loan entry added"), "ok");
  }

  /* ---------------------------------------------------------------- SWITCHERS / ROLE / LANG */
  function buildSwitchers() {
    // The switchers now live inside the dashboard view (rebuilt each render),
    // so these are no-ops on any other screen where the controls aren't present.
    var ws = $("#workerSelect"); if (!ws) return;
    var wl = $("#workerLbl"); if (wl) wl.textContent = L("જોબ વર્કર", "Job Worker");
    ws.innerHTML = WORKERS.map(function (w) { return '<option value="' + w.id + '">' + esc(STATE.lang === "en" ? (w.en || w.name) : (w.name || w.en)) + '</option>'; }).join(""); ws.value = STATE.worker; ws.onchange = function () { STATE.worker = ws.value; render(); };
    var ms = $("#monthSelect"); if (ms) { refreshMonthOptions(); ms.onchange = function () { STATE.month = $("#monthSelect").value; render(); }; }
    var mp = $("#monthPrev"); if (mp) mp.onclick = function () { stepMonth(-1); };
    var mn = $("#monthNext"); if (mn) mn.onclick = function () { stepMonth(1); };
  }
  function refreshMonthOptions() { var ms = $("#monthSelect"); if (!ms) return; ms.innerHTML = MONTHS.map(function (m) { return '<option value="' + m.id + '">' + L(m.g, m.e) + '</option>'; }).join(""); ms.value = STATE.month; }
  function stepMonth(dir) { var idx = MONTHS.map(function (m) { return m.id; }).indexOf(STATE.month); idx = Math.min(MONTHS.length - 1, Math.max(0, idx + dir)); STATE.month = MONTHS[idx].id; render(); }
  function syncSwitchers() { var ws = $("#workerSelect"); if (ws) ws.value = STATE.worker; var ms = $("#monthSelect"); if (ms) ms.value = STATE.month; }
  function setLang(lang) { STATE.lang = lang; try { document.documentElement.lang = lang === "en" ? "en" : "gu"; localStorage.setItem("gj_lang", lang); } catch (e) {} $("#langGu").classList.toggle("on", lang === "gu"); $("#langEn").classList.toggle("on", lang === "en"); buildShell(); buildSwitchers(); try { if (window.GJAuth && window.GJAuth.renderProfile) window.GJAuth.renderProfile(); } catch (e) {} render(); }
  function setRole(role) { STATE.role = role; if (!viewAllowed(STATE.view)) STATE.view = "dashboard"; buildShell(); render(); }
  function login(role) { STATE.role = (role === "supervisor" ? "supervisor" : "admin"); restoreRoute(); buildShell(); startApp(); }

  /* ---------------------------------------------------------------- MODAL / TOAST */
  function showModal(ic, title, sub, bodyHtml, onSave) {
    var mb = $("#modalBack");
    mb.innerHTML = '<div class="modal wide"><div class="mh"><div class="ico tint-brand">' + svg(ic) + '</div><div><h3>' + title + '</h3><p>' + sub + '</p></div></div><div class="mb">' + bodyHtml + '</div><div class="mf"><button class="btn btn-ghost" id="mCancel">' + L("રદ", "Cancel") + '</button><button class="btn btn-primary" id="mSave">' + svg("check") + ' ' + L("સેવ", "Save") + '</button></div></div>';
    mb.classList.add("show"); mb.onclick = function (e) { if (e.target === mb) closeModal(); }; $("#mCancel").onclick = closeModal; $("#mSave").onclick = onSave;
  }
  function infoModal(title, msg) {
    var mb = $("#modalBack"); mb.innerHTML = '<div class="modal"><div class="mh"><div class="ico tint-out">' + svg("info") + '</div><div><h3>' + title + '</h3><p>' + msg + '</p></div></div><div class="mf"><button class="btn btn-primary" id="mOk">' + L("સમજ્યા", "Got it") + '</button></div></div>';
    mb.classList.add("show"); $("#mOk").onclick = closeModal; mb.onclick = function (e) { if (e.target === mb) closeModal(); };
  }
  function infoModalConfirm(title, msg, onYes) {
    var mb = $("#modalBack"); mb.innerHTML = '<div class="modal"><div class="mh"><div class="ico tint-out">' + svg("trash") + '</div><div><h3>' + title + '</h3><p>' + msg + '</p></div></div><div class="mf"><button class="btn btn-ghost" id="mNo">' + L("રદ", "Cancel") + '</button><button class="btn btn-primary" id="mYes">' + L("હા", "Yes") + '</button></div></div>';
    mb.classList.add("show"); mb.onclick = function (e) { if (e.target === mb) closeModal(); }; $("#mNo").onclick = closeModal; $("#mYes").onclick = function () { closeModal(); onYes(); };
  }
  function closeModal() { $("#modalBack").classList.remove("show"); $("#modalBack").innerHTML = ""; }

  /* ================= BACKUP & RESTORE (admin only) =================
     A full-system backup is exactly the snapshot the app already loads and
     saves every day: enc(buildSnapshot()) is the COMPLETE dataset — every
     store (job workers, niwar parties, gate sheets, packing lists, niwar
     sheets, billing, loans, advances, niwar advances/loans, parameters),
     BigInt-exact via the same enc/dec the live engine uses. Nothing is
     skipped; PDFs are regenerated from this data on demand and the app
     stores no other binary files. Restore validates the file, keeps a
     safety copy of the current data (also auto-downloaded), applies it with
     hydrate(), then persists through the normal batched Firestore write; any
     failure rolls back to the safety copy so data is never partially lost. */
  var BK = { restore: { state: "", msg: "" } };
  function gjHash(str) { var h = 0x811c9dc5 >>> 0; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ("0000000" + h.toString(16)).slice(-8); }
  function gjFmtBytes(n) { n = n || 0; if (n < 1024) return n + " B"; if (n < 1048576) return (n / 1024).toFixed(1) + " KB"; return (n / 1048576).toFixed(2) + " MB"; }
  function gjCounts(data) {
    data = data || {};
    function len(a) { return (a && a.length != null) ? a.length : 0; }
    function keys(o) { var c = 0; if (o && typeof o === "object") for (var k in o) if (o.hasOwnProperty(k)) c += (o[k] && o[k].length != null) ? o[k].length : 1; return c; }
    return {
      workers: len(data.workers), niwarParties: len(data.nworkers),
      gateSheets: len(data.sheets), packingLists: len(data.packing),
      niwarSheets: (data.nsheets && data.nsheets.list) ? data.nsheets.list.length : 0,
      loans: keys(data.loans), advances: keys(data.upad),
      niwarAdvances: keys(data.nupad), niwarLoans: keys(data.nloans)
    };
  }
  function gjTotal(c) { var t = 0; if (c) for (var k in c) if (c.hasOwnProperty(k)) t += c[k]; return t; }
  function gjStamp() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "_" + pad(d.getHours()) + pad(d.getMinutes()); }
  function gjEnvelope(data, note) {
    var now = new Date();
    var env = { format: "giriraj-jobwork-backup", schema: 1, app: (window.__BUILD || ""), company: "Shri Giriraj Textile", createdAt: now.toISOString(), createdAtLocal: now.toLocaleString("en-IN"), counts: gjCounts(data), checksum: gjHash(JSON.stringify(data)), data: data };
    if (note) env.note = note;
    return env;
  }
  function gjBackupObject() { return gjEnvelope(window.GJDB.enc(buildSnapshot())); }
  function gjTriggerDownload(json, fname) {
    var blob = new Blob([json], { type: "application/json" }), url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = fname; document.body.appendChild(a); a.click();
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} a.remove(); }, 800);
  }
  function gjLastBackup() { try { return JSON.parse(localStorage.getItem("gj_last_backup") || "null"); } catch (e) { return null; } }
  function gjDownloadBackup() {
    if (STATE.role !== "admin") return;
    var obj = gjBackupObject(), json = JSON.stringify(obj), fname = "Giriraj-Backup_" + gjStamp() + ".json";
    gjTriggerDownload(json, fname);
    try { localStorage.setItem("gj_last_backup", JSON.stringify({ at: obj.createdAt, atLocal: obj.createdAtLocal, size: json.length, total: gjTotal(obj.counts), file: fname })); } catch (e) {}
    toast(L("બેકઅપ ડાઉનલોડ થયું — ફાઇલ સુરક્ષિત જગ્યાએ રાખો.", "Backup downloaded — keep the file somewhere safe."), "ok");
    if (STATE.view === "backup") render();
  }
  function gjValidateBackup(obj) {
    if (!obj || typeof obj !== "object") return { ok: false, err: L("આ માન્ય બેકઅપ ફાઇલ નથી.", "This is not a valid backup file.") };
    if (obj.format !== "giriraj-jobwork-backup") return { ok: false, err: L("આ ગિરિરાજ બેકઅપ ફાઇલ નથી.", "This file is not a Giriraj backup.") };
    if (!obj.data || typeof obj.data !== "object") return { ok: false, err: L("બેકઅપમાં કોઈ ડેટા નથી.", "The backup contains no data.") };
    var need = ["workers", "nworkers", "sheets", "packing", "nsheets", "bills"];
    for (var i = 0; i < need.length; i++) if (!(need[i] in obj.data)) return { ok: false, err: L("બેકઅપ અધૂરું છે — ", "Backup is incomplete — missing '") + need[i] + "'." };
    if (obj.checksum && gjHash(JSON.stringify(obj.data)) !== obj.checksum) return { ok: false, err: L("બેકઅપ ફાઇલ બગડેલી છે (ચેકસમ મેળ ખાતો નથી). રિસ્ટોર રદ.", "Backup file is corrupted (checksum mismatch). Restore cancelled.") };
    return { ok: true, obj: obj };
  }
  function gjSetRestoreStatus(state, msg) {
    BK.restore = { state: state || "", msg: msg || "" };
    var el = $("#gjRestoreStatus"); if (!el) return;
    el.className = "bk-status " + BK.restore.state; el.style.display = BK.restore.msg ? "" : "none";
    el.innerHTML = BK.restore.msg ? ((BK.restore.state === "done" ? svg("check") : svg("info")) + "<span>" + esc(BK.restore.msg) + "</span>") : "";
  }
  function gjRestoreFromObject(obj, statusCb) {
    return new Promise(function (resolve) {
      var safety;
      try { safety = window.GJDB.enc(buildSnapshot()); }
      catch (e) { resolve({ ok: false, err: L("વર્તમાન ડેટાની સલામતી કૉપિ બની નહીં. રિસ્ટોર રદ.", "Could not snapshot current data. Restore cancelled.") }); return; }
      statusCb && statusCb(L("વર્તમાન ડેટાની સલામતી કૉપિ બની રહી છે…", "Saving a safety copy of current data…"));
      try { gjTriggerDownload(JSON.stringify(gjEnvelope(safety, "auto pre-restore safety backup")), "Giriraj-Pre-Restore_" + gjStamp() + ".json"); } catch (e) {}
      setTimeout(function () {
        statusCb && statusCb(L("રેકોર્ડ્સ રિસ્ટોર થઈ રહ્યા છે…", "Restoring records…"));
        try { hydrate(window.GJDB.dec(obj.data)); }
        catch (e) { try { hydrate(window.GJDB.dec(safety)); } catch (_) {} resolve({ ok: false, err: L("બેકઅપમાંથી રેકોર્ડ્સ વાંચી શકાયા નહીં. જૂનો ડેટા યથાવત્ છે.", "Could not read records from the backup. Your previous data is unchanged.") }); return; }
        if (STATE.view === "backup") render();
        statusCb && statusCb(L("ડેટાબેઝમાં સેવ થઈ રહ્યું છે…", "Saving to the database…"));
        Promise.resolve(flushPersistNow()).then(function (res) {
          if (!(window.GJDB && window.GJDB.ready)) { resolve({ ok: true, offline: true }); return; }
          if (res && res.ok) { resolve({ ok: true }); return; }
          try { hydrate(window.GJDB.dec(safety)); if (STATE.view === "backup") render(); } catch (_) {}
          if (res && res.denied) resolve({ ok: false, err: L("રિસ્ટોર બ્લોક થયું — ડેટાબેઝ નિયમો પબ્લિશ કરવા જરૂરી. કશું બદલાયું નથી.", "Restore blocked — the database rules must be published. Nothing was changed.") });
          else resolve({ ok: false, err: L("રિસ્ટોર કરેલો ડેટા ડેટાબેઝમાં સેવ ન થયો. તમારો જૂનો ડેટા યથાવત્ છે.", "Could not save the restored data to the database. Your previous data is unchanged.") });
        });
      }, 400);
    });
  }
  function gjHandleRestoreFile(file) {
    if (STATE.role !== "admin") return;
    if (!file) { gjSetRestoreStatus("error", L("કોઈ ફાઇલ પસંદ કરી નથી.", "No file selected.")); return; }
    if (!/\.json$/i.test(file.name || "")) { gjSetRestoreStatus("error", L("કૃપા કરી .json બેકઅપ ફાઇલ પસંદ કરો.", "Please choose a .json backup file.")); return; }
    gjSetRestoreStatus("working", L("ફાઇલ વંચાઈ રહી છે…", "Reading the backup file…"));
    var reader = new FileReader();
    reader.onerror = function () { gjSetRestoreStatus("error", L("ફાઇલ વાંચી શકાઈ નહીં.", "Could not read the file.")); };
    reader.onload = function () {
      var obj; try { obj = JSON.parse(reader.result); } catch (e) { gjSetRestoreStatus("error", L("ફાઇલ માન્ય JSON નથી.", "The file is not valid JSON.")); return; }
      var v = gjValidateBackup(obj); if (!v.ok) { gjSetRestoreStatus("error", v.err); return; }
      var c = obj.counts || gjCounts(obj.data), when = obj.createdAtLocal || obj.createdAt || "?";
      gjSetRestoreStatus("", "");
      infoModalConfirm(L("રિસ્ટોર કરીએ?", "Restore this backup?"),
        L("આ બેકઅપ (" + when + ") માંથી કુલ " + gjTotal(c) + " રેકોર્ડ રિસ્ટોર થશે અને વર્તમાન તમામ ડેટા બદલાઈ જશે. પહેલાં વર્તમાન ડેટાની સલામતી કૉપિ ડાઉનલોડ થશે.",
          "This replaces ALL current data with the backup from " + when + " (" + gjTotal(c) + " records). A safety copy of your current data is downloaded first."),
        function () {
          gjSetRestoreStatus("working", L("રિસ્ટોર શરૂ…", "Starting restore…"));
          gjRestoreFromObject(obj, function (m) { gjSetRestoreStatus("working", m); }).then(function (r) {
            if (r.ok) gjSetRestoreStatus("done", r.offline
              ? L("આ ડિવાઇસ પર રિસ્ટોર થયું. ડેટાબેઝ ઓનલાઇન સાથે સાઇન ઇન કરતાં સિંક થશે.", "Restored on this device. It will sync when signed in with the database online.")
              : L("રિસ્ટોર પૂર્ણ — બધો ડેટા સફળતાપૂર્વક રિસ્ટોર થયો.", "Restore complete — all data was restored successfully."));
            else gjSetRestoreStatus("error", r.err);
          });
        });
    };
    reader.readAsText(file);
  }
  /* ---------- Yearly Financial Backup (auto · 30 November, IST) ----------
     A financial-scope ZIP (billing, loans, advances, niwar financials, job
     work & niwar transactions, plus workers/parties for relationships),
     named Financial_Backup_YYYY-11-30.zip. It auto-generates the first time
     the Owner opens the app on or after 30 Nov each year — once per year
     (no duplicates), keeping a history (date, time, size, status) that stays
     re-downloadable. True unattended midnight-on-the-server runs need a
     separate Cloudflare Worker cron; this needs no extra infrastructure. */
  var FIN_STORES = ["workers", "nworkers", "sheets", "nsheets", "bills", "nparam", "loans", "upad", "nupad", "nloans"];
  function istNow() { var d = new Date(); return new Date(d.getTime() + (d.getTimezoneOffset() + 330) * 60000); }
  function gjFinancialData() { var full = window.GJDB.enc(buildSnapshot()), out = {}; FIN_STORES.forEach(function (k) { if (k in full) out[k] = full[k]; }); return out; }
  // ---- minimal store-only ZIP writer (valid .zip, no dependencies) ----
  function gjUtf8(s) { return new TextEncoder().encode(s); }
  function gjCrc32(u8) { var crc = -1; for (var i = 0; i < u8.length; i++) { var c = (crc ^ u8[i]) & 0xff; for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); crc = (crc >>> 8) ^ c; } return (crc ^ -1) >>> 0; }
  function zipStore(files) {
    function u16(n) { return [n & 0xff, (n >>> 8) & 0xff]; }
    function u32(n) { n >>>= 0; return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]; }
    var enc = files.map(function (f) { var data = gjUtf8(f.str), name = gjUtf8(f.name); return { name: name, data: data, crc: gjCrc32(data) }; });
    var local = [], central = [], offset = 0;
    enc.forEach(function (f) {
      var lh = [0x50, 0x4b, 0x03, 0x04].concat(u16(20), u16(0), u16(0), u16(0), u16(0), u32(f.crc), u32(f.data.length), u32(f.data.length), u16(f.name.length), u16(0));
      local.push(new Uint8Array(lh), f.name, f.data);
      var ch = [0x50, 0x4b, 0x01, 0x02].concat(u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(f.crc), u32(f.data.length), u32(f.data.length), u16(f.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset));
      central.push(new Uint8Array(ch), f.name);
      offset += lh.length + f.name.length + f.data.length;
    });
    var cdSize = central.reduce(function (s, a) { return s + a.length; }, 0);
    var eocd = new Uint8Array([0x50, 0x4b, 0x05, 0x06].concat(u16(0), u16(0), u16(enc.length), u16(enc.length), u32(cdSize), u32(offset), u16(0)));
    var parts = local.concat(central, [eocd]), total = parts.reduce(function (s, a) { return s + a.length; }, 0);
    var out = new Uint8Array(total), p = 0; parts.forEach(function (a) { out.set(a, p); p += a.length; });
    return out;
  }
  function gjTriggerZipDownload(bytes, fname) {
    var blob = new Blob([bytes], { type: "application/zip" }), url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = fname; document.body.appendChild(a); a.click();
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} a.remove(); }, 800);
  }
  function gjFinAll() { try { return JSON.parse(localStorage.getItem("gj_fin_backups") || "{}"); } catch (e) { return {}; } }
  function gjSaveFinRec(rec) {
    var all = gjFinAll(); all[rec.year] = rec;
    try { localStorage.setItem("gj_fin_backups", JSON.stringify(all)); }
    catch (e) { for (var y in all) if (all[y]) { delete all[y].env; all[y].dataKept = false; } try { localStorage.setItem("gj_fin_backups", JSON.stringify(all)); } catch (_) {} }
  }
  function gjFinZipBytes(env) {
    var y = env.year;
    var readme = "Shri Giriraj Textile — Yearly Financial Backup\r\nYear: " + y + "\r\nGenerated: " + env.createdAtLocal + "\r\nScope: financial (billing, loans, advances/upad, niwar financials, job work & niwar transactions, plus job workers & parties for relationships).\r\nRestore: Backup & Restore panel. Checksum: " + env.checksum + "\r\n";
    return zipStore([{ name: "Financial_Backup_" + y + "-11-30.json", str: JSON.stringify(env) }, { name: "README.txt", str: readme }]);
  }
  function gjGenerateFinancialBackup(year, isAuto) {
    if (STATE.role !== "admin") return Promise.resolve({ ok: false, err: "not admin" });
    year = year || istNow().getFullYear();
    try {
      var data = gjFinancialData(), now = new Date();
      var env = { format: "giriraj-financial-backup", schema: 1, app: (window.__BUILD || ""), company: "Shri Giriraj Textile", scope: "financial", year: year, createdAt: now.toISOString(), createdAtLocal: now.toLocaleString("en-IN"), counts: gjCounts(data), checksum: gjHash(JSON.stringify(data)), data: data };
      var bytes = gjFinZipBytes(env), fname = "Financial_Backup_" + year + "-11-30.zip";
      var rec = { year: year, at: env.createdAt, atLocal: env.createdAtLocal, size: bytes.length, status: "success", counts: env.counts, file: fname, auto: !!isAuto, dataKept: true, env: env };
      gjSaveFinRec(rec);
      gjTriggerZipDownload(bytes, fname);
      return Promise.resolve({ ok: true, rec: rec });
    } catch (e) {
      var erec = { year: year, at: new Date().toISOString(), atLocal: new Date().toLocaleString("en-IN"), size: 0, status: "error", err: (e && e.message) || "error", file: "Financial_Backup_" + year + "-11-30.zip", auto: !!isAuto };
      gjSaveFinRec(erec);
      return Promise.resolve({ ok: false, err: erec.err });
    }
  }
  function gjRedownloadFin(year) {
    var rec = gjFinAll()[year];
    if (!rec || rec.status !== "success") return;
    if (!rec.env) { toast(L("આ ફાઇલ આ ડિવાઇસ પર સંગ્રહિત નથી — ફરી બનાવો.", "This file isn't stored on this device — generate it again."), "info"); return; }
    gjTriggerZipDownload(gjFinZipBytes(rec.env), rec.file || ("Financial_Backup_" + year + "-11-30.zip"));
  }
  function gjMaybeYearlyFinancialBackup() {
    try {
      if (STATE.role !== "admin" || !(window.GJDB && window.GJDB.ready)) return;
      var n = istNow(), y = n.getFullYear();
      var past = (n.getMonth() > 10) || (n.getMonth() === 10 && n.getDate() >= 30);   // on/after 30 Nov (IST)
      if (!past) return;
      var all = gjFinAll();
      if (all[y] && all[y].status === "success") return;                              // already done this year — no duplicate
      gjGenerateFinancialBackup(y, true).then(function (r) {
        if (r.ok) toast(L("વાર્ષિક નાણાકીય બેકઅપ તૈયાર (" + y + ") — ડાઉનલોડ થયું.", "Yearly financial backup ready (" + y + ") — downloaded."), "ok");
        else toast(L("વાર્ષિક નાણાકીય બેકઅપ નિષ્ફળ — પેનલમાંથી ફરી પ્રયાસ કરો.", "Yearly financial backup failed — retry from the Backup panel."), "error");
        if (STATE.view === "backup") render();
      });
    } catch (e) {}
  }
  function gjFinCardHTML() {
    var all = gjFinAll(), years = Object.keys(all).sort(function (a, b) { return b - a; });
    var lastOk = null, lastErr = null;
    years.forEach(function (y) { var r = all[y]; if (r.status === "success" && (!lastOk || r.at > lastOk.at)) lastOk = r; if (r.status === "error") lastErr = r; });
    var cy = istNow().getFullYear();
    var html = '<div class="card mt"><div class="card-head"><div class="ico tint-out">' + svg("spark") + '</div><div><h3>' + L("વાર્ષિક નાણાકીય બેકઅપ", "Yearly Financial Backup") + '</h3><p class="mini">' + L("દર વર્ષે 30 નવેમ્બરે આપમેળે · ફક્ત નાણાકીય ડેટા", "Automatic every 30 November · financial data only") + '</p></div></div><div class="card-pad">';
    html += '<div class="bk-last' + (lastOk ? '' : ' muted') + '">' + svg(lastOk ? "check" : "info") + '<span>' + (lastOk ? (L("છેલ્લું સફળ નાણાકીય બેકઅપ: ", "Last successful financial backup: ") + esc(lastOk.atLocal) + ' · ' + gjFmtBytes(lastOk.size)) : L("હજી કોઈ વાર્ષિક નાણાકીય બેકઅપ નથી.", "No yearly financial backup yet.")) + '</span></div>';
    html += '<p class="bk-p" style="margin-top:12px">' + L("સમાવિષ્ટ: બિલિંગ, લોન, ઉપડ (એડવાન્સ), નિવાર નાણાકીય, જોબવર્ક અને નિવાર ટ્રાન્ઝેક્શન, પેમેન્ટ/બાકી — અને સંબંધ જાળવવા જોબ વર્કર તથા પાર્ટી.", "Includes: billing, loans, advances (upad), niwar financials, job work & niwar transactions, payments / outstanding — plus workers & parties to keep relationships intact.") + '</p>';
    html += '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" data-fin-generate="' + cy + '">' + svg("dl") + ' ' + L("અત્યારે નાણાકીય બેકઅપ બનાવો (" + cy + ")", "Generate financial backup now (" + cy + ")") + '</button>';
    if (lastErr) html += '<button class="btn btn-soft" data-fin-retry="' + lastErr.year + '">' + svg("info") + ' ' + L("ફરી પ્રયાસ", "Retry backup") + '</button>';
    html += '</div>';
    if (years.length) {
      html += '<div class="bk-hist-wrap"><table class="bk-hist"><thead><tr><th>' + L("વર્ષ", "Year") + '</th><th>' + L("તારીખ અને સમય", "Date & time") + '</th><th>' + L("કદ", "Size") + '</th><th>' + L("સ્થિતિ", "Status") + '</th><th></th></tr></thead><tbody>';
      years.forEach(function (y) {
        var r = all[y];
        html += '<tr><td><b>' + esc(y) + '</b></td><td>' + esc(r.atLocal || "—") + '</td><td>' + (r.size ? gjFmtBytes(r.size) : "—") + '</td><td>' + (r.status === "success" ? '<span class="fin-ok">' + svg("check") + ' ' + L("સફળ", "Success") + '</span>' : '<span class="fin-err">' + svg("info") + ' ' + L("નિષ્ફળ", "Failed") + '</span>') + '</td><td class="r">' + ((r.status === "success" && r.env) ? '<button class="btn btn-ghost btn-sm" data-fin-dl="' + y + '">' + svg("dl") + ' ' + L("ડાઉનલોડ", "Download") + '</button>' : '') + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '<div class="bk-safe" style="margin-top:14px">' + svg("info") + '<div>' + L("આ એપ બ્રાઉઝરમાં ચાલે છે, તેથી 30 નવેમ્બરે કે પછી માલિક પહેલીવાર એપ ખોલે ત્યારે બેકઅપ આપમેળે બને છે (વર્ષે એક જ વાર — ડુપ્લિકેટ નહીં). કોઈ લોગિન વગર, બરાબર મધ્યરાત્રિએ, સર્વર પર ચલાવવા અલગ Cloudflare Worker cron સેટઅપ જોઈએ.", "This app runs in the browser, so the backup is generated automatically the first time the Owner opens the app on or after 30 November each year (once per year — no duplicates). Running it with nobody logged in, at exactly midnight on the server, needs a separate Cloudflare Worker cron.") + '</div></div>';
    html += '</div></div>';
    return html;
  }
  function bkChip(ic, v, k) { return '<div class="bk-chip"><div class="bk-chip-ic">' + ic + '</div><div><div class="bk-chip-v">' + esc(String(v)) + '</div><div class="bk-chip-k">' + k + '</div></div></div>'; }
  function bkItem(label, n) { return '<div class="bk-li">' + svg("check") + '<span>' + label + '</span><b>' + n + '</b></div>'; }
  function viewBackup() {
    if (STATE.role !== "admin") return '<div class="card"><div class="card-pad"><h2>' + L("પ્રવેશ નથી", "Access denied") + '</h2><p class="sub">' + L("બેકઅપ અને રિસ્ટોર ફક્ત માલિક / એડમિન માટે છે.", "Backup & Restore is available to the Owner / Admin only.") + '</p></div></div>';
    var last = gjLastBackup(), c = gjCounts(window.GJDB.enc(buildSnapshot())), tot = gjTotal(c);
    var html = '<div class="page-head"><div><h2>' + L("બેકઅપ અને રિસ્ટોર", "Backup & Restore") + '</h2><div class="sub">' + L("આખી સિસ્ટમનો ડેટા સુરક્ષિત કરો અને જરૂર પડ્યે પાછો લાવો", "Protect your entire system data and bring it back when needed") + '</div></div></div>';
    html += '<div class="bk-sum">' +
      bkChip(svg("database"), tot, L("કુલ રેકોર્ડ અત્યારે", "records right now")) +
      bkChip(svg("save"), last ? gjFmtBytes(last.size) : "—", L("છેલ્લું બેકઅપ કદ", "last backup size")) +
      bkChip(svg("spark"), last ? esc(last.atLocal) : L("ક્યારેય નહીં", "never"), L("છેલ્લું બેકઅપ", "last backup")) + '</div>';
    html += '<div class="grid-2 mt">';
    html += '<div class="card"><div class="card-head"><div class="ico tint-brand">' + svg("database") + '</div><div><h3>' + L("બેકઅપ બનાવો અને ડાઉનલોડ કરો", "Create & Download Backup") + '</h3><p class="mini">' + L("એક ફાઇલમાં આખી સિસ્ટમ", "The whole system in one file") + '</p></div></div><div class="card-pad">';
    html += '<p class="bk-p">' + L("નીચેનો બધો ડેટા એક ટાઇમસ્ટૅમ્પ ફાઇલમાં સેવ થાય છે:", "Everything below is saved into one timestamped file:") + '</p>';
    html += '<div class="bk-list">' + bkItem(L("જોબ વર્કર્સ અને નિવાર પાર્ટી", "Job workers & niwar parties"), c.workers + c.niwarParties) + bkItem(L("ગેટ જોબ વર્ક શીટ", "Gate job work sheets"), c.gateSheets) + bkItem(L("પેકિંગ લિસ્ટ", "Packing lists"), c.packingLists) + bkItem(L("નિવાર ગેટ એન્ટ્રી", "Niwar gate sheets"), c.niwarSheets) + bkItem(L("બિલિંગ · લોન · ઉપડ · પેરામીટર", "Billing · loans · advances · parameters"), c.loans + c.advances + c.niwarAdvances + c.niwarLoans) + '</div>';
    html += '<p class="bk-note">' + L("PDF આ જ ડેટામાંથી બને છે, તેથી અલગ ફાઇલ રાખવાની જરૂર નથી. લોગિન પાસવર્ડ સુરક્ષા કારણસર બેકઅપમાં સમાવાતા નથી.", "PDFs are generated from this data, so no separate file is needed. Login passwords are not included, for security.") + '</p>';
    html += '<button class="btn btn-primary btn-block" data-bk-create>' + svg("dl") + ' ' + L("બેકઅપ બનાવો અને ડાઉનલોડ કરો", "Create & Download Backup") + '</button>';
    if (last) html += '<div class="bk-last">' + svg("check") + '<span>' + L("છેલ્લું બેકઅપ: ", "Last backup: ") + esc(last.atLocal) + ' · ' + gjFmtBytes(last.size) + ' · ' + last.total + ' ' + L("રેકોર્ડ", "records") + '</span></div>';
    html += '</div></div>';
    html += '<div class="card"><div class="card-head"><div class="ico tint-out">' + svg("upload") + '</div><div><h3>' + L("બેકઅપ અપલોડ કરો અને રિસ્ટોર કરો", "Upload & Restore Backup") + '</h3><p class="mini">' + L("અગાઉની બેકઅપ ફાઇલમાંથી પાછું લાવો", "Bring data back from a backup file") + '</p></div></div><div class="card-pad">';
    html += '<div class="bk-drop" id="bkDrop"><div class="bk-drop-ic">' + svg("upload") + '</div><div class="bk-drop-t">' + L("બેકઅપ .json ફાઇલ અહીં મૂકો, અથવા પસંદ કરો", "Drop a backup .json file here, or choose one") + '</div><button class="btn btn-soft btn-sm" data-bk-pick>' + svg("file") + ' ' + L("ફાઇલ પસંદ કરો", "Choose backup file") + '</button><input type="file" id="bkFile" accept=".json,application/json" style="display:none"></div>';
    html += '<div id="gjRestoreStatus" class="bk-status ' + (BK.restore.state || "") + '"' + (BK.restore.msg ? '' : ' style="display:none"') + '>' + (BK.restore.msg ? ((BK.restore.state === "done" ? svg("check") : svg("info")) + '<span>' + esc(BK.restore.msg) + '</span>') : '') + '</div>';
    html += '<div class="bk-safe">' + svg("shield") + '<div><b>' + L("સલામતી", "Safety") + '</b> — ' + L("રિસ્ટોર પહેલાં વર્તમાન ડેટાની કૉપિ આપમેળે ડાઉનલોડ થાય છે. અધૂરી કે બગડેલી ફાઇલ ક્યારેય ઓવરરાઇટ નહીં કરે; ડેટાબેઝમાં સેવ નિષ્ફળ જાય તો જૂનો ડેટા પાછો આવી જાય છે.", "Your current data is auto-downloaded before a restore. A corrupted or incomplete file can never overwrite your data, and if the database save fails your previous data is rolled back.") + '</div></div>';
    html += '</div></div></div>';
    html += gjFinCardHTML();
    return html;
  }

  /* ---------------------------------------------------------------- ROSTER (workers / niwar parties) */
  function fVal(sel) { var e = $(sel); return e ? e.value : ""; }
  function fRow(label, field) { return '<label style="display:block;margin-bottom:13px"><span style="display:block;font-size:12px;font-weight:600;color:var(--ink-soft);margin-bottom:5px">' + label + '</span>' + field + '</label>'; }
  function fInput(id, val, extra) { return '<input id="' + id + '" ' + (extra || '') + ' value="' + String(val == null ? '' : val).replace(/"/g, '&quot;') + '" style="width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:14px;font-family:inherit;background:var(--surface);color:var(--ink)">'; }

  /* ---- Gujarati ⇆ English name transliteration (one name field, both saved) ----
     Type the name once in either script; the other language is generated live.
     Gujarati→English is a deterministic romanisation; English→Gujarati is a
     best-effort phonetic map (good for names, editable by typing in Gujarati). */
  function isGujarati(s) { return /[઀-૿]/.test(String(s || "")); }
  // bug 26: show the free-text Quality in the current language (transliterate, like worker names)
  function qLabel(q) { q = q || ""; if (!q) return q; if (STATE.lang === "en") { var r = isGujarati(q) ? titleCase(translitToEn(q)) : q; return r.replace(/[૦-૯]/g, function (d) { return "૦૧૨૩૪૫૬૭૮૯".indexOf(d); }); } return isGujarati(q) ? q : translitToGu(q); }
  function titleCase(s) { return String(s || "").toLowerCase().replace(/(^|[\s'().-])([a-z])/g, function (m, p, c) { return p + c.toUpperCase(); }); }
  function translitToEn(s) {
    s = String(s || "");
    var C = { 'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'ng', 'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'jh', 'ઞ': 'ny', 'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n', 'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n', 'પ': 'p', 'ફ': 'ph', 'બ': 'b', 'ભ': 'bh', 'મ': 'm', 'ય': 'y', 'ર': 'r', 'લ': 'l', 'ળ': 'l', 'વ': 'v', 'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h' };
    var V = { 'અ': 'a', 'આ': 'aa', 'ઇ': 'i', 'ઈ': 'ee', 'ઉ': 'u', 'ઊ': 'oo', 'ઋ': 'ru', 'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au', 'ઍ': 'e', 'ઑ': 'o' };
    var M = { 'ા': 'aa', 'િ': 'i', 'ી': 'ee', 'ુ': 'u', 'ૂ': 'oo', 'ૃ': 'ru', 'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au', 'ૅ': 'e', 'ૉ': 'o' };
    var out = "", i = 0;
    while (i < s.length) {
      var ch = s[i], nx = s[i + 1];
      if (C[ch] != null) {
        out += C[ch];
        if (nx === '્') { i += 2; continue; }                 // virama → conjunct, no vowel
        if (M[nx] != null) { out += M[nx]; i += 2; continue; } // explicit matra
        if (nx === undefined || /[\s.,\-\/()]/.test(nx)) { i++; continue; }  // word-final: drop inherent 'a'
        out += 'a'; i++; continue;                            // inherent 'a'
      }
      if (V[ch] != null) { out += V[ch]; i++; continue; }
      if (ch === 'ં' || ch === 'ઁ') { out += 'n'; i++; continue; }
      if (ch === 'ઃ') { out += 'h'; i++; continue; }
      if (ch === '્') { i++; continue; }
      out += ch; i++;                                          // spaces / digits / punctuation pass through
    }
    return out;
  }
  function translitToGu(s) {
    s = String(s || "").toLowerCase();
    var consKeys = ['chh', 'ksh', 'sh', 'ch', 'kh', 'gh', 'jh', 'th', 'dh', 'ph', 'bh', 'ng', 'ny', 'k', 'g', 'c', 'j', 't', 'd', 'n', 'p', 'b', 'm', 'y', 'r', 'l', 'v', 'w', 's', 'h', 'f', 'z', 'x', 'q'];
    var cons = { 'chh': 'છ', 'ksh': 'ક્ષ', 'sh': 'શ', 'ch': 'ચ', 'kh': 'ખ', 'gh': 'ઘ', 'jh': 'ઝ', 'th': 'થ', 'dh': 'ધ', 'ph': 'ફ', 'bh': 'ભ', 'ng': 'ંગ', 'ny': 'ન્ય', 'k': 'ક', 'g': 'ગ', 'c': 'ક', 'j': 'જ', 't': 'ત', 'd': 'દ', 'n': 'ન', 'p': 'પ', 'b': 'બ', 'm': 'મ', 'y': 'ય', 'r': 'ર', 'l': 'લ', 'v': 'વ', 'w': 'વ', 's': 'સ', 'h': 'હ', 'f': 'ફ', 'z': 'ઝ', 'x': 'ક્સ', 'q': 'ક' };
    var vowKeys = ['aa', 'ai', 'au', 'ee', 'oo', 'a', 'i', 'u', 'e', 'o'];
    var vindep = { 'aa': 'આ', 'ai': 'ઐ', 'au': 'ઔ', 'ee': 'ઈ', 'oo': 'ઊ', 'a': 'અ', 'i': 'ઇ', 'u': 'ઉ', 'e': 'એ', 'o': 'ઓ' };
    var vmatra = { 'aa': 'ા', 'ai': 'ૈ', 'au': 'ૌ', 'ee': 'ી', 'oo': 'ૂ', 'a': '', 'i': 'િ', 'u': 'ુ', 'e': 'ે', 'o': 'ો' };
    function matchAt(keys, pos) { for (var k = 0; k < keys.length; k++) { if (s.substr(pos, keys[k].length) === keys[k]) return keys[k]; } return null; }
    var out = "", i = 0, lastCons = false;
    while (i < s.length) {
      var vk = matchAt(vowKeys, i);
      if (vk) { out += lastCons ? vmatra[vk] : vindep[vk]; i += vk.length; lastCons = false; continue; }
      var ck = matchAt(consKeys, i);
      if (ck) { if (lastCons) out += '્'; out += cons[ck]; i += ck.length; lastCons = true; continue; }
      lastCons = false; out += s[i]; i++;                      // spaces / digits / punctuation pass through
    }
    return out;
  }
  function renderNamePv(gu, en) {
    var pv = $("#wfNamePv"); if (!pv) return;
    if (gu || en) { pv.style.display = "flex"; pv.innerHTML = '<span>ગુજરાતી: <b>' + esc(gu) + '</b></span><span>English: <b>' + esc(en) + '</b></span>'; }
    else { pv.style.display = "none"; pv.innerHTML = ""; }
  }
  function syncWorkerName() {
    var one = $("#wfNameOne"); if (!one) return;
    var v = one.value.trim(), gu, en;
    if (!v) { if ($("#wfName")) $("#wfName").value = ""; if ($("#wfEn")) $("#wfEn").value = ""; renderNamePv("", ""); return; }
    if (isGujarati(v)) { gu = v; en = titleCase(translitToEn(v)); }
    else { en = v; gu = translitToGu(v); }
    if ($("#wfName")) $("#wfName").value = gu;
    if ($("#wfEn")) $("#wfEn").value = en;
    renderNamePv(gu, en);
  }

  function workerForm(id) {
    var w = id ? workerById(id) : null;
    var oneVal = w ? (w.name || w.en || "") : "";
    var body =
      fRow(L("નામ", "Name"),
        fInput("wfNameOne", oneVal, 'placeholder="' + L("રમેશ / Ramesh", "Ramesh / રમેશ") + '" autocomplete="off"') +
        '<div id="wfNamePv" class="worker-name-pv" style="display:none"></div>' +
        '<div class="worker-name-hint">' + L("ગુજરાતી કે English — કોઈ પણ ભાષામાં લખો, બીજી ભાષા આપમેળે બનશે.", "Type in Gujarati or English — the other language is filled in automatically.") + '</div>' +
        '<input type="hidden" id="wfName" value="' + esc(w ? w.name : "") + '">' +
        '<input type="hidden" id="wfEn" value="' + esc(w ? w.en : "") + '">'
      ) +
      fRow(L("ફોન", "Phone"), fInput("wfPhone", w ? w.phone : "", 'inputmode="tel" maxlength="16" placeholder="+91 "') + '<div class="msg">' + L("10 અંકનો ભારતીય મોબાઇલ નંબર", "10-digit Indian mobile number") + '</div>') +
      fRow(L("કાપડ", "Cloth"), fInput("wfCloth", w ? w.cloth : "", 'placeholder="' + L("કોટન 40s", "Cotton 40s") + '"')) +
      fRow(L("રેટ (₹/મીટર)", "Rate (₹/metre)"), fInput("wfRate", w ? w.rate : "", 'type="number" step="0.01" min="0" max="10000" inputmode="decimal" placeholder="3.55"') + '<div class="msg">' + L("વધુમાં વધુ ₹10,000/મીટર", "Up to ₹10,000 / metre") + '</div>');
    showModal("users", id ? L("જોબ વર્કર ફેરફાર", "Edit Job Worker") : L("જોબ વર્કર ઉમેરો", "Add Job Worker"), L("નામ, ફોન, કાપડ અને રેટ.", "Name, phone, cloth and rate."), body, function () { saveWorkerForm(id); });
    var one = $("#wfNameOne"); if (one) one.oninput = syncWorkerName;
    var ph = $("#wfPhone"); if (ph) ph.oninput = function () { cleanPhoneField(ph); };   // bug 18: strip letters/specials live
    var rt = $("#wfRate"); if (rt) rt.oninput = function () { var n = parseFloat(rt.value); if (!isNaN(n)) { if (n > WRATE_MAX) rt.value = String(WRATE_MAX); else if (n < 0) rt.value = "0"; } };   // bug 19: clamp rate live
    renderNamePv((w ? w.name : "") || "", (w ? w.en : "") || "");   // seed preview from existing values on edit
  }
  function saveWorkerForm(id) {
    var name = fVal("#wfName").trim(), en = fVal("#wfEn").trim(), phone = fVal("#wfPhone").trim(), cloth = fVal("#wfCloth").trim();
    if (!name && !en) { toast(L("નામ દાખલ કરો", "Enter a name"), "info"); return; }
    if (phone && !validIndMobile(phone)) { toast(L("માન્ય 10-અંકનો ભારતીય મોબાઇલ નંબર દાખલ કરો (6–9થી શરૂ થતો)", "Enter a valid 10-digit Indian mobile number (starting 6–9)"), "info"); return; }   // bug 18
    var rateRaw = fVal("#wfRate").trim(), rate = parseFloat(rateRaw);   // bug 19
    if (rateRaw !== "") {
      if (isNaN(rate) || rate < 0) { toast(L("માન્ય રેટ દાખલ કરો", "Enter a valid rate"), "info"); return; }
      if (rate > WRATE_MAX) { toast(L("રેટ ₹10,000/મીટરથી વધુ ન હોય", "Rate can't exceed ₹10,000 / metre"), "info"); return; }
    }
    rate = (isNaN(rate) || rate < 0) ? 0 : Math.round(Math.min(rate, WRATE_MAX) * 100) / 100;
    if (!en) en = name; if (!name) name = en;
    if (id) { var w = workerById(id); if (w) { w.name = name; w.en = en; w.phone = phone; w.cloth = cloth; w.rate = rate; } }
    else {
      var nid = "w_" + rid(), nw = { id: nid, name: name, en: en, phone: phone, cloth: cloth, rate: rate };
      WORKERS.push(nw); decorateWorkers();
      BILL[nid] = {}; MONTHS.forEach(function (m) { BILL[nid][m.id] = { rate: rate, ghati: 3, tempo: 0, loanDeductP: null, paidP: null, openingSeed: 0n, openingWseedG: 0n }; });
      LOANS[nid] = []; UPAD[nid] = []; STATE.worker = nid;
    }
    closeModal(); buildSwitchers(); render(); flushPersistNow(); toast(id ? L("સેવ થયું", "Saved") : L("જોબ વર્કર ઉમેરાયો", "Job worker added"), "ok");
  }
  function delWorker(id) {
    var w = workerById(id); if (!w) return;
    var hasSheets = SHEETS.some(function (s) { return s.workerId === id; });
    var hasLedger = (LOANS[id] && LOANS[id].length) || (UPAD[id] && UPAD[id].length);
    if (hasSheets || hasLedger) { infoModal(L("કાઢી શકાય નહીં", "Can't delete"), L("આ જોબ વર્કરની શીટ કે ખાતા એન્ટ્રી છે. પહેલાં તે કાઢો.", "This worker has sheets or ledger entries. Remove those first.")); return; }
    infoModalConfirm(L("જોબ વર્કર કાઢવો?", "Delete job worker?"), L("આ જોબ વર્કર કાઢી નાખશે.", "This removes the job worker."), function () {
      WORKERS = WORKERS.filter(function (x) { return x.id !== id; }); decorateWorkers();
      delete BILL[id]; delete LOANS[id]; delete UPAD[id];
      if (STATE.worker === id) STATE.worker = WORKERS[0] ? WORKERS[0].id : null;
      buildSwitchers(); render(); flushPersistNow(); toast(L("કાઢ્યું", "Deleted"), "ok");
    });
  }

  function nPartyForm(id) {
    var p = id ? nwById(id) : null;
    var body =
      fRow(L("નામ (ગુજરાતી)", "Name (Gujarati)"), fInput("npName", p ? p.name : "", 'placeholder="' + L("ગુરુ ગોવિંદ નિવાર", "Guru Govind Niwar") + '"')) +
      fRow(L("નામ (English)", "Name (English)"), fInput("npEn", p ? p.en : "", 'placeholder="' + L("Guru Govind Niwar", "Guru Govind Niwar") + '"')) +
      fRow(L("ફોન", "Phone"), fInput("npPhone", p ? p.phone : "", 'placeholder="+91 "'));
    showModal("roll", id ? L("નિવાર પાર્ટી ફેરફાર", "Edit Niwar Party") : L("નિવાર પાર્ટી ઉમેરો", "Add Niwar Party"), L("નામ અને ફોન.", "Name and phone."), body, function () { saveNParty(id); });
  }
  function saveNParty(id) {
    var name = fVal("#npName").trim(), en = fVal("#npEn").trim(), phone = fVal("#npPhone").trim();
    if (!name && !en) { toast(L("નામ દાખલ કરો", "Enter a name"), "info"); return; }
    if (!en) en = name; if (!name) name = en;
    if (id) { var p = nwById(id); if (p) { p.name = name; p.en = en; p.phone = phone; } }
    else { var nid = "n_" + rid(); NWORKERS.push({ id: nid, name: name, en: en, phone: phone }); NUPAD[nid] = []; NLOANS[nid] = []; STATE.niwarParty = nid; }
    closeModal(); render(); flushPersistNow(); toast(id ? L("સેવ થયું", "Saved") : L("પાર્ટી ઉમેરાઈ", "Party added"), "ok");
  }
  function delNParty(id) {
    var p = nwById(id); if (!p) return;
    var hasSheets = NSHEETS.some(function (s) { return s.partyId === id; });
    var hasLedger = (NUPAD[id] && NUPAD[id].length) || (NLOANS[id] && NLOANS[id].length);
    if (hasSheets || hasLedger) { infoModal(L("કાઢી શકાય નહીં", "Can't delete"), L("આ પાર્ટીની શીટ કે ખાતા એન્ટ્રી છે. પહેલાં તે કાઢો.", "This party has sheets or ledger entries. Remove those first.")); return; }
    infoModalConfirm(L("પાર્ટી કાઢવી?", "Delete party?"), L("આ નિવાર પાર્ટી કાઢી નાખશે.", "This removes the niwar party."), function () {
      NWORKERS = NWORKERS.filter(function (x) { return x.id !== id; });
      delete NUPAD[id]; delete NLOANS[id]; if (NPARAM[id]) delete NPARAM[id];
      if (STATE.niwarParty === id) STATE.niwarParty = NWORKERS[0] ? NWORKERS[0].id : null;
      render(); flushPersistNow(); toast(L("કાઢ્યું", "Deleted"), "ok");
    });
  }
  function toast(msg, kind) { var tw = $("#toastWrap"); var t = document.createElement("div"); t.className = "toast " + (kind || ""); t.innerHTML = svg(kind === "info" || kind === "error" ? "info" : "check") + "<span>" + msg + "</span>"; tw.appendChild(t); setTimeout(function () { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(function () { t.remove(); }, 320); }, kind === "error" ? 6000 : 3000); }

  /* ---------------------------------------------------------------- PDF */
  function sheetTop(chip, sub) { return '<div class="sh-top"><div class="co"><b>' + CO.nameGuj + '</b><div class="tag">' + CO.name + ' · ' + CO.tag + '</div><div class="meta">' + CO.place + ' &nbsp;|&nbsp; ' + CO.phone + '</div></div><div class="copybox">' + chip + '<div class="sh-sub">' + sub + '</div></div></div>'; }
  function sheetFoot() { return '<div class="sh-foot"><span>તૈયાર · Generated ' + new Date().toLocaleDateString("en-IN") + '</span><span>Powered by ' + VENDOR + '</span></div>'; }
  function chipOf(copy) { return copy === "worker" ? '<span class="copy-chip copy-worker">જોબ વર્કર કોપી · WORKER COPY</span>' : '<span class="copy-chip copy-company">કંપની કોપી · COMPANY COPY</span>'; }

  /* job work sheet PDF — paginated so rows never get cut across pages */
  var PDF_ROWS_PER_PAGE = 32;
  function jobSheetPages(id, copy) {
    var sh = sheetById(id); var w = workerById(sh.workerId);
    var land = (sh.nSteps || 1) > 8;                 // many steps → landscape wide sheet
    var lastRow = 1; for (var s = 0; s < sh.nSteps; s++) for (var r = 0; r < MAX_ROWS; r++) if (sh.meters[s][r] != null) lastRow = Math.max(lastRow, r + 1);
    var head = ''; for (var s2 = 0; s2 < sh.nSteps; s2++) head += '<th>સ્ટેપ ' + (s2 + 1) + '<br>Step</th>';
    var totalPages = Math.max(1, Math.ceil(lastRow / PDF_ROWS_PER_PAGE));
    var party = '<div class="sh-party"><div class="pb"><div class="k">નામ · Name</div><div class="vv">' + esc(w.name) + '</div></div><div class="pb"><div class="k">તારીખ · Date</div><div class="vv">' + dmy(sh.date) + '</div></div><div class="pb"><div class="k">ક્વોલિટી · Quality</div><div class="vv">' + esc(sh.quality || "—") + '</div></div></div>';
    var pages = [];
    for (var pg = 0; pg < totalPages; pg++) {
      var start = pg * PDF_ROWS_PER_PAGE, end = Math.min(lastRow, start + PDF_ROWS_PER_PAGE), isLast = pg === totalPages - 1;
      var body = '';
      for (var r2 = start; r2 < end; r2++) { body += '<tr><td class="l">' + (r2 + 1) + '</td>'; for (var s3 = 0; s3 < sh.nSteps; s3++) { var v = sh.meters[s3][r2]; body += '<td>' + (v == null ? "" : numI(v)) + '</td>'; } body += '</tr>'; }
      var tfoot = '';
      if (isLast) {
        tfoot = '<tfoot><tr class="tot"><td class="l">કુલ · Total</td>';
        for (var s4 = 0; s4 < sh.nSteps; s4++) tfoot += '<td>' + numI(stepTotalMt(sh, s4)) + '</td>';
        tfoot += '</tr><tr class="tot"><td class="l">KG</td>';
        for (var s5 = 0; s5 < sh.nSteps; s5++) tfoot += '<td>' + (sh.kg[s5] == null ? "" : kgStr(B(Math.round(sh.kg[s5] * 1000)))) + '</td>';
        tfoot += '</tr></tfoot>';
      }
      var h = '<div class="sheet' + (land ? ' land' : '') + '">' + sheetTop(chipOf(copy), "જોબ વર્ક શીટ<br>Job Work Sheet" + (totalPages > 1 ? ' <span style="font-size:11px">(' + (pg + 1) + '/' + totalPages + ')</span>' : '')) + party +
        '<h4 class="sh-h">સ્ટેપ પ્રમાણે મીટર · Step-wise Metres' + (totalPages > 1 ? ' — ' + L("ક્રમ", "Sr.") + ' ' + (start + 1) + '–' + end : '') + '</h4>' +
        '<table class="pt jws-pt"><thead><tr><th class="l">ક્રમ<br>Sr.</th>' + head + '</tr></thead><tbody>' + body + '</tbody>' + tfoot + '</table>';
      if (isLast) {
        var paratRows = sh.parat.map(function (p, i) { return '<tr><td class="l">' + (i + 1) + '</td><td>' + (p.kokdi == null ? "" : kgStr(B(Math.round(p.kokdi * 1000)))) + '</td><td>' + (p.color == null ? "" : kgStr(B(Math.round(p.color * 1000)))) + '</td></tr>'; }).join("");
        h += '<div class="two-col" style="margin-top:18px;align-items:flex-start">' +
          '<div style="flex:1"><h4 class="sh-h">સારાંશ · Summary</h4><table class="pt"><tbody>' +
          '<tr><td class="l">રોલ · Roll</td><td>' + numI(sheetRolls(sh)) + '</td></tr>' +
          '<tr><td class="l">કુલ મીટર · Total Metre</td><td>' + numI(sheetMt(sh)) + '</td></tr>' +
          '<tr class="tot"><td class="l">KG</td><td>' + kgStr(B(sheetKgG(sh))) + '</td></tr></table></div>' +
          '<div style="flex:1"><h4 class="sh-h">પરત ની યાદી · Parat ni Yadi</h4><table class="pt"><thead><tr><th class="l">#</th><th>કોકડી<br>Kokdi</th><th>કલર<br>Color</th></tr></thead><tbody>' + paratRows + '</tbody><tfoot><tr class="tot"><td class="l">કુલ</td><td>' + kgStr(B(sheetKokdiG(sh))) + '</td><td>' + kgStr(B(sheetColorG(sh))) + '</td></tr></tfoot></table></div></div>' +
          '<div class="sig"><div class="s">સુપરવાઇઝર · Supervisor</div><div class="s">જોબ વર્કર · Job Worker</div></div>';
      }
      h += sheetFoot() + '</div>';
      pages.push(h);
    }
    return pages;
  }

  /* monthly bill PDF */
  function billHTML(copy) {
    var w = worker(); var mid = STATE.month; var mi = monthIndexOf(mid); var b = billMonth(w.id, mid); var s = settleM(w.id, mi); var mat = matBalance(w.id, mi); var m = monthObj();
    var loanOpen = loanOpeningBalanceP(w.id, mid), loanClosing = loanOpen - s.deduct;
    var rows = b.rows.map(function (r) { return '<tr><td class="l">' + dmy(r.date) + '</td><td>' + r.roll + '</td><td>' + numI(r.mtr) + '</td><td>' + kgStr(B(r.kapadG)) + '</td><td>' + kgStr(B(r.kokdiG)) + '</td><td>' + kgStr(B(r.colorG)) + '</td><td>' + kgStr(B(r.kokdiG + r.colorG)) + '</td></tr>'; }).join("");
    return '<div class="sheet">' + sheetTop(chipOf(copy), "માસિક જોબવર્ક બિલ<br>Monthly Jobwork Bill") +
      '<div class="sh-party"><div class="pb"><div class="k">જોબ વર્કર · Job Worker</div><div class="vv">' + wNm(w) + '</div></div><div class="pb"><div class="k">મહિનો · Month</div><div class="vv">' + m.g + '</div></div><div class="pb"><div class="k">રેટ · Rate</div><div class="vv">' + rateStr(b.ratePaise) + '/mtr</div></div></div>' +
      '<h4 class="sh-h">ગેટ શીટ (ખાતાવહી) · Gate Sheets (Ledger)</h4><table class="pt"><thead><tr><th class="l">તારીખ<br>Date</th><th>રોલ<br>Roll</th><th>મીટર<br>Mtr</th><th>કાપડ<br>Cloth</th><th>કોકડી<br>Kokdi</th><th>કલર<br>Color</th><th>ક્લબ<br>Clubbed</th></tr></thead><tbody>' + (rows || '<tr><td colspan="7" class="l">—</td></tr>') + '</tbody><tfoot><tr class="tot"><td class="l">કુલ</td><td>' + b.roll + '</td><td>' + numI(b.mtr) + '</td><td>' + kgStr(b.kapadG) + '</td><td>' + kgStr(b.kokdiG) + '</td><td>' + kgStr(b.colorG) + '</td><td>' + kgStr(b.sentG) + '</td></tr></tfoot></table>' +
      '<div class="two-col" style="margin-top:18px"><div><h4 class="sh-h">માલ બેલેન્સ (વજન) · Material Balance (kg)</h4><div class="mini">' +
      '<div class="ml"><span>ઓપનિંગ (ગયા મહિનેથી) · Opening</span><b>' + kgStr(mat.opening, 2) + ' kg</b></div>' +
      '<div class="ml"><span>કોકડી+કલર (મોકલ્યું) · Clubbed sent</span><b>+ ' + kgStr(mat.clubbedG, 2) + ' kg</b></div>' +
      '<div class="ml"><span>કાપડ + ઘટ 3% (પાછું) · Cloth+Ghati</span><b>− ' + kgStr(mat.clothGhatiG, 2) + ' kg</b></div>' +
      '<div class="ml"><span><b>બાકી → કેરી ફોરવર્ડ · Closing</b></span><b>' + kgStr(mat.closing, 2) + ' kg</b></div></div></div>' +
      '<div><h4 class="sh-h">ચુકવણી (રૂપિયા) · Payment</h4><div class="mini">' +
      '<div class="ml"><span>' + numI(b.mtr) + ' × ' + rateStr(b.ratePaise) + ' + ટેમ્પો</span><b>+ ' + moneyP(s.E) + '</b></div>' +
      '<div class="ml"><span>ઉપડ · Upad</span><b>− ' + moneyP(s.upad) + '</b></div>' +
      '<div class="ml"><span>લોન કપાત · Loan deduction</span><b>− ' + moneyP(s.deduct) + '</b></div>' +
      '<div class="ml"><span>ચૂકવવાપાત્ર · Payable</span><b>' + moneyP(s.payable) + '</b></div>' +
      '<div class="ml"><span>ચૂકવ્યું · Paid</span><b>− ' + moneyP(s.paid) + '</b></div>' +
      '<div class="ml"><span>બાકી લોન · Loan left</span><b>' + moneyP(loanClosing > 0n ? loanClosing : 0n) + '</b></div></div></div></div>' +
      '<div class="pay-row"><div>ચૂકવવાપાત્ર (આ મહિને) · Payable this month</div><div class="pv">' + moneyP(s.payable) + '</div></div>' +
      '<div class="sig"><div class="s">જોબ વર્કર · Job Worker</div><div class="s">' + CO.name + '</div></div>' + sheetFoot() + '</div>';
  }

  function loanHTML() {
    var w = worker(); var m = monthObj(); var txns = (LOANS[w.id] || []).slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; }); var bal = 0n;
    var rows = txns.map(function (t) { var a = rupToP(t.amt); bal += (t.type === "repay" ? -a : a); var typ = t.type === "loan" ? "Loan given" : t.type === "topup" ? "Top-up" : "Repayment"; return '<tr><td class="l">' + t.d.split("-").reverse().join("/") + '</td><td class="l">' + typ + '</td><td class="l">' + esc(t.note) + '</td><td>' + (t.type === "repay" ? "− " : "+ ") + moneyP(a) + '</td><td>' + moneyP(bal) + '</td></tr>'; }).join("");
    return '<div class="sheet">' + sheetTop(chipOf("company"), "લોન ખાતા રિપોર્ટ<br>Loan Account Report") +
      '<div class="sh-party"><div class="pb"><div class="k">જોબ વર્કર · Job Worker</div><div class="vv">' + wNm(w) + '</div></div><div class="pb"><div class="k">રિપોર્ટ · Report</div><div class="vv">' + m.g + ' (upto)</div></div></div>' +
      '<h4 class="sh-h">વ્યવહાર · Transactions</h4><table class="pt"><thead><tr><th class="l">તારીખ · Date</th><th class="l">પ્રકાર · Type</th><th class="l">નોંધ · Note</th><th>રકમ · Amount</th><th>બાકી · Balance</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5" class="l">No transactions</td></tr>') + '</tbody></table>' +
      '<div class="pay-row"><div>કુલ બાકી લોન · Outstanding Loan</div><div class="pv">' + moneyP(loanBalanceP(w.id)) + '</div></div>' +
      '<div class="sig"><div class="s">જોબ વર્કર · Job Worker</div><div class="s">' + CO.name + '</div></div>' + sheetFoot() + '</div>';
  }

  function upadHTML() {
    var w = worker(); var mid = STATE.month; var mi = monthIndexOf(mid); var m = monthObj();
    var rows = upadEntries(w.id, mid); var upTot = upadMP(w.id, mid); var s = settleM(w.id, mi);
    var run = 0n;
    var tr = rows.map(function (t) { var a = rupToP(t.amt); run += a; return '<tr><td class="l">' + dmy(t.d) + '</td><td class="l">' + esc(t.note) + '</td><td>+ ' + moneyP(a) + '</td><td>' + moneyP(run) + '</td></tr>'; }).join("");
    return '<div class="sheet">' + sheetTop(chipOf("company"), "ઉપડ (એડવાન્સ) રિપોર્ટ<br>Upad (Advance) Report") +
      '<div class="sh-party"><div class="pb"><div class="k">જોબ વર્કર · Job Worker</div><div class="vv">' + wNm(w) + '</div></div><div class="pb"><div class="k">મહિનો · Month</div><div class="vv">' + m.g + '</div></div></div>' +
      '<h4 class="sh-h">અઠવાડિક ઉપડ · Weekly Advances</h4><table class="pt"><thead><tr><th class="l">તારીખ · Date</th><th class="l">નોંધ · Note</th><th>રકમ · Amount</th><th>ચાલુ કુલ · Running</th></tr></thead><tbody>' + (tr || '<tr><td colspan="4" class="l">No upad this month</td></tr>') + '</tbody><tfoot><tr class="tot"><td class="l" colspan="2">કુલ ઉપડ · Total Upad</td><td>' + moneyP(upTot) + '</td><td></td></tr></tfoot></table>' +
      '<div class="two-col" style="margin-top:18px"><div><h4 class="sh-h">બિલ પર અસર · Effect on Bill</h4><div class="mini">' +
      '<div class="ml"><span>કમાણી · Earnings</span><b>+ ' + moneyP(s.E) + '</b></div>' +
      '<div class="ml"><span>ઉપડ · Upad</span><b>− ' + moneyP(s.upad) + '</b></div>' +
      '<div class="ml"><span>લોન કપાત · Loan deduction</span><b>− ' + moneyP(s.deduct) + '</b></div>' +
      '<div class="ml"><span>ચૂકવવાપાત્ર · Payable</span><b>' + moneyP(s.payable) + '</b></div></div></div>' +
      '<div><h4 class="sh-h">નોંધ · Note</h4><p style="font-size:12px;color:#555;line-height:1.6">ઉપડ ચાલુ મહિનાનું જ છે અને મહિનાના બિલમાં આપમેળે કપાય છે. બાકી રકમ કેરી ફોરવર્ડ થાય. લોન અલગ ખાતું છે.<br><br>Upad belongs to this month and is auto-deducted in the monthly bill. Any remainder carries forward. Loans are a separate account.</p></div></div>' +
      '<div class="pay-row"><div>કુલ ઉપડ (આ મહિને) · Total Upad this month</div><div class="pv">' + moneyP(upTot) + '</div></div>' +
      '<div class="sig"><div class="s">જોબ વર્કર · Job Worker</div><div class="s">' + CO.name + '</div></div>' + sheetFoot() + '</div>';
  }

  function yearEndHTML() {
    var w = worker(); var ye = yearEnd(w.id); var g = ye.ghati; var actualPct = (g.actualBP / 100).toFixed(2);
    return '<div class="sheet">' + sheetTop(chipOf("company"), "વર્ષાંત સેટલમેન્ટ (દિવાળી)<br>Year-End Settlement (Diwali)") +
      '<div class="sh-party"><div class="pb"><div class="k">જોબ વર્કર · Job Worker</div><div class="vv">' + wNm(w) + '</div></div><div class="pb"><div class="k">વર્ષ · Year</div><div class="vv">upto Diwali 2026</div></div></div>' +
      '<h4 class="sh-h">1. લોન · Loan</h4><table class="pt"><tbody><tr><td class="l">વર્ષ દરમિયાન વસૂલ · Recovered</td><td>' + moneyP(recoveredThisYear(w.id)) + '</td></tr><tr><td class="l">બાકી લોન · Loan remaining</td><td><b>' + moneyP(ye.loanRem) + '</b></td></tr></tbody></table>' +
      '<h4 class="sh-h">2. ઘટ · Ghati Reconciliation</h4><table class="pt"><tbody><tr><td class="l">અપાયેલ · Given monthly</td><td>3.00%</td></tr><tr><td class="l">ખરેખર સરેરાશ · Actual average</td><td>' + actualPct + '%</td></tr><tr><td class="l">વાર્ષિક કાપડ · Annual cloth</td><td>' + kgStr(g.annual, 1) + ' kg</td></tr><tr><td class="l">ઘટ તફાવત (× ' + moneyP(g.rateP) + '/kg)</td><td>' + kgStr(g.diffG, 2) + ' kg</td></tr><tr><td class="l">' + (g.settleP >= 0n ? "માલિક આપે · Owner pays" : "માલિક વસૂલ · Owner recovers") + '</td><td><b>' + moneyP(g.settleP < 0n ? -g.settleP : g.settleP) + '</b></td></tr></tbody></table>' +
      '<h4 class="sh-h">3. આખરી · Final</h4><table class="pt"><tbody><tr><td class="l">ઘટ સેટલમેન્ટ · Ghati</td><td>' + (g.settleP >= 0n ? "+ " : "− ") + moneyP(g.settleP < 0n ? -g.settleP : g.settleP) + '</td></tr><tr><td class="l">બાકી લોન · Loan</td><td>− ' + moneyP(ye.loanRem) + '</td></tr><tr><td class="l">માલ બેલેન્સ · Material (kg)</td><td>' + kgStr(ye.matClose, 2) + ' kg</td></tr></tbody></table>' +
      '<div class="pay-row"><div>' + (ye.netToWorker >= 0n ? "માલિક ચૂકવે · Owner PAYS" : "માલિક વસૂલ · Owner RECOVERS") + '</div><div class="pv">' + moneyP(ye.netToWorker < 0n ? -ye.netToWorker : ye.netToWorker) + '</div></div>' +
      '<div class="sig"><div class="s">જોબ વર્કર · Job Worker</div><div class="s">' + CO.name + '</div></div>' + sheetFoot() + '</div>';
  }

  /* niwar MONTHLY bill PDF — per-size jobwork + yarn balance + ghat / TDS */
  function niwarBillHTML(copy) {
    var p = niwarParty(), mid = STATE.month, mi = niwarMonthIdx(mid), m = monthObj();
    var st = niwarSettle(p.id, mi);
    var sizeRows = st.bySize.map(function (b) { return '<tr><td class="l">' + b.size + '"</td><td>' + kgStr(b.g) + '</td><td>' + rateStr(b.rateP) + '</td><td>' + moneyP(b.amtP) + '</td></tr>'; }).join("");
    return '<div class="sheet">' + sheetTop(chipOf(copy), "નિવાર જોબવર્ક બિલ<br>Niwar Jobwork Bill") +
      '<div class="sh-party"><div class="pb"><div class="k">પાર્ટી · Party</div><div class="vv">' + (STATE.lang === "en" ? p.en : p.name) + '</div></div><div class="pb"><div class="k">મહિનો · Month</div><div class="vv">' + m.g + '</div></div><div class="pb"><div class="k">શીટ · Sheets</div><div class="vv">' + nMonthSheets(p.id, mid).length + '</div></div></div>' +
      '<h4 class="sh-h">સાઇઝ પ્રમાણે જોબવર્ક · Jobwork by size</h4><table class="pt"><thead><tr><th class="l">સાઇઝ<br>Size</th><th>વજન kg<br>Weight</th><th>રેટ<br>Rate</th><th>રકમ<br>Amount</th></tr></thead><tbody>' +
      (sizeRows || '<tr><td colspan="4" class="l">—</td></tr>') +
      '</tbody><tfoot><tr class="tot"><td class="l">કુલ · Total</td><td>' + kgStr(st.recvG) + '</td><td></td><td>' + moneyP(st.jobworkP) + '</td></tr></tfoot></table>' +
      '<div class="two-col" style="margin-top:16px"><div><h4 class="sh-h">માલ બેલેન્સ (વજન) · Material Balance (kg)</h4><div class="mini">' +
      '<div class="ml"><span>ઓપનિંગ (ગયા મહિનેથી) · Opening</span><b>' + kgStr(st.matOpen) + ' kg</b></div>' +
      '<div class="ml"><span>કુલ નિવાર · Total niwar</span><b>+ ' + kgStr(st.recvG) + ' kg</b></div>' +
      '<div class="ml"><span>પરાત (મોકલ્યું) · Parat</span><b>− ' + kgStr(st.paratG) + ' kg</b></div>' +
      '<div class="ml"><span><b>બાકી → કેરી · Closing</b></span><b>' + kgStr(st.matClose) + ' kg</b></div></div></div>' +
      '<div><h4 class="sh-h">બિલ · Bill</h4><div class="mini">' +
      '<div class="ml"><span>જોબવર્ક · Jobwork</span><b>+ ' + moneyP(st.jobworkP) + '</b></div>' +
      '<div class="ml"><span>ઉપડ · Upad</span><b>− ' + moneyP(st.upadP) + '</b></div>' +
      '<div class="ml"><span>ઘટ (' + kgStr(st.ghatKg * 1000n, 0) + ' kg × ' + rateStr(st.yarnPriceP) + ') · Ghat</span><b>− ' + moneyP(st.ghatP) + '</b></div>' +
      '<div class="ml"><span>TDS</span><b>− ' + moneyP(st.tdsP) + '</b></div>' +
      '<div class="ml"><span>લોન કપાત · Loan</span><b>− ' + moneyP(st.deductP) + '</b></div>' +
      '<div class="ml"><span>ચૂકવવાપાત્ર · Payable</span><b>' + moneyP(st.payable) + '</b></div>' +
      '<div class="ml"><span>ચૂકવ્યું · Paid</span><b>− ' + moneyP(st.paid) + '</b></div></div></div></div>' +
      '<div class="pay-row"><div>ચૂકવવાપાત્ર · Payable</div><div class="pv">' + moneyP(st.payable) + '</div></div>' +
      '<div class="sig"><div class="s">નિવાર પાર્ટી · Niwar Party</div><div class="s">' + CO.name + '</div></div>' + sheetFoot() + '</div>';
  }
  /* niwar single DELIVERY sheet PDF (gate-entry copy)
     Same wide Sr-rows × columns grid as the Gate Job Work & Packing List sheets,
     with the product SIZES as the columns (niwar has no "steps"). */
  function niwarSheetHTML(id, copy) {
    var s = nSheetById(id); if (!s) return '<div class="sheet">' + sheetTop(chipOf(copy), "નિવાર શીટ<br>Niwar Sheet") + '<p class="l">No sheet.</p>' + sheetFoot() + '</div>';
    var p = nwById(s.partyId);
    var prods = (s.products || []);
    var sheetNiwar = nSheetNiwarG(s), sheetNet = sheetNiwar - (s.paratG || 0n);
    // grid: columns = sizes, rows = weight lots (Sr. 1..maxRows)
    var maxRows = 1; prods.forEach(function (pr) { (pr.lots || []).forEach(function (x, i) { if (x != null) maxRows = Math.max(maxRows, i + 1); }); });
    var head = prods.map(function (pr) { return '<th>' + esc(pr.size) + '"</th>'; }).join("");
    var body = '';
    for (var r = 0; r < maxRows; r++) {
      body += '<tr><td class="l">' + (r + 1) + '</td>';
      prods.forEach(function (pr) { var g = (pr.lots || [])[r]; body += '<td>' + (g == null ? "" : kgStr(g)) + '</td>'; });
      body += '</tr>';
    }
    var tfoot = '<tfoot><tr class="tot"><td class="l">kg · Total</td>' + prods.map(function (pr) { return '<td>' + kgStr(nProductG(pr)) + '</td>'; }).join("") + '</tr></tfoot>';
    var party = '<div class="sh-party"><div class="pb"><div class="k">પાર્ટી · Party</div><div class="vv">' + esc(STATE.lang === "en" ? p.en : p.name) + '</div></div><div class="pb"><div class="k">તારીખ · Date</div><div class="vv">' + dmy(s.date) + '</div></div><div class="pb"><div class="k">સાઇઝ · Sizes</div><div class="vv">' + prods.length + '</div></div></div>';
    var nland = prods.length > 8;   // many sizes → landscape wide sheet (same rule as the gate sheet)
    return '<div class="sheet' + (nland ? ' land' : '') + '">' + sheetTop(chipOf(copy), "નિવાર ગેટ એન્ટ્રી<br>Niwar Gate Entry") + party +
      '<h4 class="sh-h">સાઇઝ × વજન (kg) · Sizes &amp; Weights</h4>' +
      '<table class="pt jws-pt"><thead><tr><th class="l">Sr.</th>' + (head || '<th>—</th>') + '</tr></thead><tbody>' + (body || '<tr><td class="l">—</td></tr>') + '</tbody>' + (prods.length ? tfoot : '') + '</table>' +
      '<div class="two-col" style="margin-top:18px;align-items:flex-start">' +
        '<div style="flex:1"><h4 class="sh-h">પરાત + કુલ · Parat + Totals</h4><table class="pt"><tbody>' +
          '<tr><td class="l">કુલ નિવાર · Total niwar</td><td>' + kgStr(sheetNiwar) + ' kg</td></tr>' +
          '<tr><td class="l">પરાત (મોકલ્યું) · Parat (sent)</td><td>' + kgStr(s.paratG || 0n) + ' kg</td></tr>' +
          '<tr class="tot"><td class="l">બેલેન્સ (નિવાર−પરાત) · Balance</td><td>' + kgStr(sheetNet) + ' kg</td></tr>' +
        '</tbody></table></div><div style="flex:1"></div></div>' +
      '<div class="pay-row"><div>કુલ નિવાર · Total Niwar</div><div class="pv">' + kgStr(sheetNiwar) + ' kg</div></div>' +
      '<div class="sig"><div class="s">નિવાર પાર્ટી · Niwar Party</div><div class="s">' + CO.name + '</div></div>' + sheetFoot() + '</div>';
  }
  function niwarWaText() {
    var p = niwarParty(), mid = STATE.month, mi = niwarMonthIdx(mid), st = niwarSettle(p.id, mi), m = monthObj();
    var sizes = st.bySize.map(function (b) { return b.size + '" ' + kgStr(b.g) + " × " + rateStr(b.rateP) + " = " + moneyP(b.amtP); }).join("\n");
    return "*" + CO.name + "*\n" + L("નિવાર બિલ", "Niwar Bill") + "\n—\n" + (STATE.lang === "en" ? p.en : p.name) + "\n" + L("મહિનો", "Month") + ": " + m.e + "\n" +
      (sizes ? sizes + "\n" : "") + L("કુલ જોબવર્ક", "Total jobwork") + ": " + moneyP(st.jobworkP) + "\n" +
      L("ઉપડ", "Upad") + ": -" + moneyP(st.upadP) + "\n" + L("ઘટ", "Ghat") + ": -" + moneyP(st.ghatP) + "\n" + "TDS: -" + moneyP(st.tdsP) + "\n" +
      L("લોન કપાત", "Loan deduction") + ": -" + moneyP(st.deductP) + "\n" +
      L("ચૂકવવાપાત્ર", "Net Payable") + ": " + moneyP(st.payable) + "\n" + L("માલ બેલેન્સ (કેરી)", "Material balance (carry)") + ": " + kgStr(st.matClose) + " kg\n—\nPowered by " + VENDOR;
  }

  /* ---- WhatsApp share (opens WhatsApp with a text summary) ---- */
  function waDigits(p) { var d = (p || "").replace(/\D/g, ""); return d; }
  function waShare(text, phone) {
    var base = phone ? "https://wa.me/" + phone + "?text=" : "https://wa.me/?text=";
    try { var win = window.open(base + encodeURIComponent(text), "_blank"); if (!win) location.href = base + encodeURIComponent(text); } catch (e) {}
  }
  function sheetWaText(sh) {
    var w = workerById(sh.workerId);
    return "*" + CO.name + "*\n" + L("જોબ વર્ક શીટ", "Job Work Sheet") + "\n" +
      "—\n" + wNm(w) + "\n" + L("તારીખ", "Date") + ": " + dmy(sh.date) + "   " + L("ક્વોલિટી", "Quality") + ": " + (sh.quality || "-") + "\n" +
      L("રોલ", "Roll") + ": " + numI(sheetRolls(sh)) + "   " + L("કુલ મીટર", "Total Metre") + ": " + numI(sheetMt(sh)) + "   KG: " + kgStr(B(sheetKgG(sh))) + "\n" +
      L("પરત", "Parat") + " — " + L("કોકડી", "Kokdi") + ": " + kgStr(B(sheetKokdiG(sh))) + " kg, " + L("કલર", "Color") + ": " + kgStr(B(sheetColorG(sh))) + " kg\n—\n" + "Powered by " + VENDOR;
  }
  function billWaText() {
    var w = worker(), mid = STATE.month, mi = monthIndexOf(mid), b = billMonth(w.id, mid), s = settleM(w.id, mi), mat = matBalance(w.id, mi), m = monthObj();
    return "*" + CO.name + "*\n" + L("માસિક બિલ", "Monthly Bill") + "\n—\n" + wNm(w) + "\n" + L("મહિનો", "Month") + ": " + m.e + "\n" +
      L("કુલ મીટર", "Total Metre") + ": " + numI(b.mtr) + " × " + rateStr(b.ratePaise) + " = " + moneyP(b.grossP) + "\n" +
      L("ઉપડ", "Upad") + ": -" + moneyP(s.upad) + "\n" +
      L("લોન કપાત", "Loan deduction") + ": -" + moneyP(s.deduct) + "\n" +
      L("ચૂકવવાપાત્ર", "Net Payable") + ": " + moneyP(s.payable) + "\n" +
      L("ચૂકવ્યું", "Paid") + ": -" + moneyP(s.paid) + "\n" +
      L("માલ બેલેન્સ (કેરી)", "Material balance (carry)") + ": " + kgStr(mat.closing, 2) + " kg\n—\n" + "Powered by " + VENDOR;
  }

  function slug(s) { return (s || "x").replace(/[^\w઀-૿]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || "x"; }
  /* Render an array of page-HTML strings → one PDF, each string on its own A4
     page, scaled to fit within the page (so rows are never cut across a break). */
  function renderPages(pages, filename, orient) {
    if (!window.html2canvas || !window.jspdf) return Promise.reject(new Error("libs"));
    orient = orient === "l" ? "l" : "p";
    var jsPDF = window.jspdf.jsPDF; var pdf = new jsPDF(orient, "mm", "a4");
    var winW = orient === "l" ? 1160 : 820;                 // wider capture for landscape (many step columns)
    var pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    var MARGIN = 6; var stage = $("#printStage");
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : Promise.resolve();
    function one(i) {
      stage.innerHTML = pages[i]; var node = stage.firstChild;
      return new Promise(function (r) { setTimeout(r, i === 0 ? 70 : 20); }).then(function () {
        return window.html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false, windowWidth: winW });
      }).then(function (canvas) {
        var availW = pw - MARGIN * 2, availH = ph - MARGIN * 2;
        var imgW = availW, imgH = canvas.height * availW / canvas.width;
        if (imgH > availH) { var sc = availH / imgH; imgH = imgH * sc; imgW = imgW * sc; }
        var x = (pw - imgW) / 2;
        if (i > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", x, MARGIN, imgW, imgH);
      });
    }
    return fontsReady.then(function () {
      var chain = Promise.resolve();
      for (var i = 0; i < pages.length; i++) (function (ix) { chain = chain.then(function () { return one(ix); }); })(i);
      return chain;
    }).then(function () { stage.innerHTML = ""; pdf.save(filename); });
  }
  function pdfDone() { toast(L("ડાઉનલોડ", "Downloaded"), "ok"); }
  function pdfFail(e) { console.warn(e); toast(L("PDF બન્યું નહીં", "PDF failed"), "info"); }
  function makeSheetPDF(id, copy) { var sh = sheetById(id); var w = workerById(sh.workerId); var orient = (sh.nSteps || 1) > 8 ? "l" : "p"; toast(L("PDF તૈયાર…", "Generating…"), "info"); renderPages(jobSheetPages(id, copy), "Girijaj_JobWorkSheet_" + slug(w.en) + "_" + sh.date + "_" + (copy === "worker" ? "Worker" : "Company") + ".pdf", orient).then(pdfDone).catch(pdfFail); }
  function makeBillPDF(copy, both) { var w = worker(), m = monthObj(); toast(L("PDF તૈયાર…", "Generating…"), "info"); renderPages([billHTML(copy)], "Girijaj_Bill_" + slug(w.en) + "_" + m.e.replace(" ", "") + "_" + (copy === "worker" ? "Worker" : "Company") + ".pdf").then(function () { if (both) return renderPages([billHTML("worker")], "Girijaj_Bill_" + slug(w.en) + "_Worker.pdf").then(function () { toast(L("બંને ડાઉનલોડ", "Both downloaded"), "ok"); }); pdfDone(); }).catch(pdfFail); }
  function makeLoanPDF() { var w = worker(); toast(L("રિપોર્ટ તૈયાર…", "Generating…"), "info"); renderPages([loanHTML()], "Girijaj_Loan_" + slug(w.en) + ".pdf").then(pdfDone).catch(pdfFail); }
  function makeUpadPDF() { var w = worker(), m = monthObj(); toast(L("રિપોર્ટ તૈયાર…", "Generating…"), "info"); renderPages([upadHTML()], "Girijaj_Upad_" + slug(w.en) + "_" + m.e.replace(" ", "") + ".pdf").then(pdfDone).catch(pdfFail); }
  function makeNiwarPDF(copy) { var p = niwarParty(), m = monthObj(); toast(L("PDF તૈયાર…", "Generating…"), "info"); renderPages([niwarBillHTML(copy)], "Girijaj_Niwar_" + slug(p.en) + "_" + m.e.replace(" ", "") + "_" + (copy === "worker" ? "Party" : "Company") + ".pdf").then(pdfDone).catch(pdfFail); }
  function makeNiwarSheetPDF(id) { var s = nSheetById(id); if (!s) return; var p = nwById(s.partyId); var orient = ((s.products || []).length > 8) ? "l" : "p"; toast(L("PDF તૈયાર…", "Generating…"), "info"); renderPages([niwarSheetHTML(id, "company")], "Girijaj_NiwarSheet_" + slug(p.en) + "_" + s.date + ".pdf", orient).then(pdfDone).catch(pdfFail); }
  function makeYearEndPDF() { var w = worker(); toast(L("સેટલમેન્ટ તૈયાર…", "Generating…"), "info"); renderPages([yearEndHTML()], "Girijaj_YearEnd_" + slug(w.en) + ".pdf").then(pdfDone).catch(pdfFail); }

  /* ---------------------------------------------------------------- SHELL / HERO / BOOT */
  function buildShell() {
    var nav = navForRole();
    $("#sidebar").innerHTML = '<div class="nav-head"><img class="nav-head-logo" src="./img/logo.png" alt="' + esc(L(CO.nameGuj, CO.name)) + '"><button type="button" class="nav-close" id="navClose" aria-label="' + L("મેનૂ બંધ કરો", "Close menu") + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' + nav.map(function (n) { return '<a class="nav-item" data-nav="' + n.id + '" href="#' + n.id + '">' + svg(n.ic) + '<span>' + L(n.g, n.e) + '</span></a>'; }).join("") + '<div class="nav-foot">' + L(CO.nameGuj, CO.name) + '<br><b>' + L("જોબવર્ક સિસ્ટમ", "Jobwork System") + '</b></div>';
    document.querySelectorAll("[data-nav]").forEach(function (a) { a.onclick = function (e) { e.preventDefault(); go(a.getAttribute("data-nav")); }; });
    var nc = $("#navClose"); if (nc) nc.onclick = function () { try { if (window.__gjCloseNav) window.__gjCloseNav(); } catch (e) {} };
  }
  var vortex = null;
  function startApp() { $("#hero").classList.add("hide"); $("#app").classList.add("show"); if (vortex) { setTimeout(function () { try { vortex.dispose(); } catch (e) {} vortex = null; }, 900); } render(); }
  function initHero() { if (typeof window.initVortex !== "function") return; try { var small = Math.min(window.innerWidth, window.innerHeight) < 760; vortex = window.initVortex($("#hero-canvas"), $("#hero-canvas-wrap"), small ? { lineOptions: { count: 120, color: "#ffd79a", glow: 9 }, dotOptions: { count: 2600, color: "#fff2d6", glow: 10 }, cometOptions: { count: 6 } } : {}); } catch (e) { console.warn("hero", e); } }
  /* ================================================================
     FIRESTORE PERSISTENCE  (LIVE mode only — demo mode is untouched)
     • load on login  → hydrate the in-memory stores
     • first empty DB  → seed a clean starter (roster kept, no fake data)
     • every render() in LIVE schedules a debounced per-store save
     ================================================================ */
  var _persistOn = false, _persistT = null;

  function decorateWorkers() {
    WORKERS.forEach(function (w, i) { w.color = AV[i % AV.length]; w.idx = i; if (w.actualGhati == null) w.actualGhati = 2.85; });
  }
  function rebuildBill() {
    BILL = {};
    WORKERS.forEach(function (w) { BILL[w.id] = {}; MONTHS.forEach(function (m) { BILL[w.id][m.id] = { rate: w.rate, ghati: 3, tempo: 0, loanDeductP: null, paidP: null, openingSeed: 0n, openingWseedG: 0n }; }); });
  }

  // trailing-null trim keeps the sheet grid tiny in Firestore; re-padded on load.
  function trimSteps(meters) {
    return (meters || []).map(function (step) { var last = -1; for (var i = 0; i < step.length; i++) if (step[i] != null) last = i; return step.slice(0, last + 1); });
  }
  function snapSheet(s) {
    var o = {}; for (var k in s) if (s.hasOwnProperty(k)) o[k] = s[k];
    // Firestore forbids directly-nested arrays, so store the metre grid as a
    // map { "0":[row…], "1":[row…] } instead of an array-of-arrays.
    var m = trimSteps(s.meters), map = {};
    for (var i = 0; i < m.length; i++) map[i] = m[i];
    o.meters = map;
    return o;
  }
  function expandSheet(s, nStepsMax, nRows) {
    var m = s.meters || [], meters = [];
    for (var st = 0; st < nStepsMax; st++) { var src = m[st] || [], row = new Array(nRows).fill(null); for (var r = 0; r < Math.min(src.length, nRows); r++) row[r] = src[r]; meters.push(row); }
    s.meters = meters;
    var kg = s.kg || [], kg2 = []; for (var k = 0; k < nStepsMax; k++) kg2.push(kg[k] != null ? kg[k] : null); s.kg = kg2;
    // clamp step count to the current column cap so a sheet saved with more
    // steps than the cap (e.g. an old 35-step packing sheet) can never render
    // past its allocated columns.
    if (!s.nSteps || s.nSteps < 1) s.nSteps = 1;
    if (s.nSteps > nStepsMax) s.nSteps = nStepsMax;
    return s;
  }

  function buildSnapshot() {
    return {
      workers:  WORKERS.map(function (w) { return { id: w.id, name: w.name, en: w.en, phone: w.phone, cloth: w.cloth, rate: w.rate, actualGhati: w.actualGhati }; }),
      nworkers: NWORKERS.map(function (p) { return { id: p.id, name: p.name, en: p.en, phone: p.phone }; }),
      sheets:   SHEETS.map(snapSheet),
      packing:  PACKING.map(snapSheet),
      nsheets:  { list: NSHEETS, seq: NSEQ.v },
      bills:    { w: BILL, ghatiRate: GHATI_RATE.v },
      nparam:   NPARAM,
      loans:    LOANS, upad: UPAD, nupad: NUPAD, nloans: NLOANS
    };
  }

  function hydrate(d) {
    d = d || {};
    if (d.workers && d.workers.length !== undefined)  { WORKERS = d.workers; decorateWorkers(); }
    if (d.nworkers && d.nworkers.length !== undefined) { NWORKERS = d.nworkers; }
    rebuildBill();
    if (d.bills && d.bills.w) {
      for (var wid in d.bills.w) if (BILL[wid]) for (var mid in d.bills.w[wid]) if (BILL[wid][mid]) assign(BILL[wid][mid], d.bills.w[wid][mid]);
      if (d.bills.ghatiRate != null) GHATI_RATE.v = d.bills.ghatiRate;
    }
    if (d.loans)  LOANS  = d.loans  || {};
    if (d.upad)   UPAD   = d.upad   || {};
    if (d.nupad)  NUPAD  = d.nupad  || {};
    if (d.nloans) NLOANS = d.nloans || {};
    if (d.nparam) NPARAM = d.nparam || {};
    if (d.sheets && d.sheets.length !== undefined)  SHEETS  = d.sheets.map(function (s) { return expandSheet(s, MAX_STEPS, MAX_ROWS); });
    if (d.packing && d.packing.length !== undefined) PACKING = d.packing.map(function (p) { return expandSheet(p, PK_STEPS, PK_ROWS); });
    if (d.nsheets && d.nsheets.list) { NSHEETS = d.nsheets.list; if (d.nsheets.seq != null) NSEQ.v = d.nsheets.seq; }
    WORKERS.forEach(function (w) { LOANS[w.id] = LOANS[w.id] || []; UPAD[w.id] = UPAD[w.id] || []; });
    NWORKERS.forEach(function (p) { NUPAD[p.id] = NUPAD[p.id] || []; NLOANS[p.id] = NLOANS[p.id] || []; });
    if (!workerById(STATE.worker) && WORKERS[0]) STATE.worker = WORKERS[0].id;
    if (!nwById(STATE.niwarParty) && NWORKERS[0]) STATE.niwarParty = NWORKERS[0].id;
    healOrphanDates();   // rescue any sheet dated outside the listed months (self-heals on next save)
    buildSwitchers();
  }
  function assign(t, s) { for (var k in s) if (s.hasOwnProperty(k)) t[k] = s[k]; return t; }

  // add a default BILL row for any worker that lacks one (keeps existing overrides)
  function ensureBill() {
    WORKERS.forEach(function (w) { if (!BILL[w.id]) BILL[w.id] = {}; MONTHS.forEach(function (m) { if (!BILL[w.id][m.id]) BILL[w.id][m.id] = { rate: w.rate, ghati: 3, tempo: 0, loanDeductP: null, paidP: null, openingSeed: 0n, openingWseedG: 0n }; }); });
  }

  // apply ONE store's remote value into memory, without disturbing the other stores
  function hydrateStore(key, v) {
    if (key === "workers")      { if (v && v.length !== undefined) { WORKERS = v; decorateWorkers(); ensureBill(); if (!workerById(STATE.worker) && WORKERS[0]) STATE.worker = WORKERS[0].id; buildSwitchers(); } }
    else if (key === "nworkers"){ if (v && v.length !== undefined) { NWORKERS = v; if (!nwById(STATE.niwarParty) && NWORKERS[0]) STATE.niwarParty = NWORKERS[0].id; } }
    else if (key === "sheets")  { if (v && v.length !== undefined) SHEETS  = v.map(function (s) { return expandSheet(s, MAX_STEPS, MAX_ROWS); }); }
    else if (key === "packing") { if (v && v.length !== undefined) PACKING = v.map(function (s) { return expandSheet(s, PK_STEPS, PK_ROWS); }); }
    else if (key === "nsheets") { if (v && v.list) { NSHEETS = v.list; if (v.seq != null) NSEQ.v = v.seq; } }
    else if (key === "bills")   { if (v && v.w) { rebuildBill(); for (var wid in v.w) if (BILL[wid]) for (var mid in v.w[wid]) if (BILL[wid][mid]) assign(BILL[wid][mid], v.w[wid][mid]); if (v.ghatiRate != null) GHATI_RATE.v = v.ghatiRate; } }
    else if (key === "nparam")  { if (v) NPARAM = v; }
    else if (key === "loans")   { if (v) LOANS  = v; }
    else if (key === "upad")    { if (v) UPAD   = v; }
    else if (key === "nupad")   { if (v) NUPAD  = v; }
    else if (key === "nloans")  { if (v) NLOANS = v; }
    WORKERS.forEach(function (w) { LOANS[w.id] = LOANS[w.id] || []; UPAD[w.id] = UPAD[w.id] || []; });
    NWORKERS.forEach(function (p) { NUPAD[p.id] = NUPAD[p.id] || []; NLOANS[p.id] = NLOANS[p.id] || []; });
  }

  /* ---- real-time sync: apply the other panel's changes, but never while the
          current user is mid-edit (defer until they stop typing) ---- */
  var _remoteQ = {}, _remoteTimer = null, _pendingEdit = false, _inRender = false;
  function isEditingNow() {
    if (editableEditorNow()) return true;              // hold ALL remote applies while a sheet editor is open
    var a = document.activeElement;
    if (a && a !== document.body) {
      var t = (a.tagName || "").toLowerCase();
      if (t === "input" || t === "textarea" || t === "select") {
        var app = document.getElementById("app");           // only count edits inside the app shell,
        if (app && app.contains(a)) return true;             // not focus left on the hidden login form
      }
    }
    var mb = $("#modalBack"); if (mb && mb.classList.contains("show")) return true;  // a modal is open
    return false;
  }
  function applyRemote(key, value) { _remoteQ[key] = value; scheduleRemoteFlush(); }
  function scheduleRemoteFlush() {
    if (isEditingNow()) {
      if (!_remoteTimer) _remoteTimer = setInterval(function () { if (!isEditingNow()) { clearInterval(_remoteTimer); _remoteTimer = null; flushRemote(); } }, 1000);
      return;
    }
    flushRemote();
  }
  function flushRemote() {
    var keys = Object.keys(_remoteQ); if (!keys.length) return;
    keys.forEach(function (k) { hydrateStore(k, _remoteQ[k]); });
    _remoteQ = {};
    try { if (window.GJDB && window.GJDB.cacheSeed) window.GJDB.cacheSeed(buildSnapshot()); } catch (e) {}
    setSync("synced");
    render();
  }

  /* =================================================================
     MULTI-USER EDIT LOCKS + "reflect only on save"
     -----------------------------------------------------------------
     • Only one user edits a given sheet at a time. A second user who
       opens it gets a view-only copy with a "<name> is editing" banner.
     • While a sheet editor is open, this user's keystrokes stay LOCAL —
       they are pushed to everyone only on Save / Done / Back. That stops
       half-typed values from flashing onto the other users' screens.
     • Deletes and saved changes made elsewhere are merged in without
       wiping the row this user currently has open (per-id merge), so two
       people editing different sheets never clobber each other.
  ================================================================= */
  function isSheetEditor(v) { return v === "gatesheet" || v === "packingsheet" || v === "niwarsheet"; }
  function currentEditStoreKey() { return STATE.view === "gatesheet" ? "sheets" : STATE.view === "packingsheet" ? "packing" : STATE.view === "niwarsheet" ? "nsheets" : null; }
  function currentEditItemId() { return STATE.view === "gatesheet" ? STATE.sheetId : STATE.view === "packingsheet" ? STATE.packingId : STATE.view === "niwarsheet" ? STATE.niwarSheetId : null; }
  function currentEditLockKey() { var k = currentEditStoreKey(), id = currentEditItemId(); return (k && id) ? (STATE.view + ":" + id) : null; }
  function editableEditorNow() { return isSheetEditor(STATE.view) && !(STATE.lock && STATE.lock.readOnly); }

  function arrByKey(k) { return k === "sheets" ? SHEETS : k === "packing" ? PACKING : NSHEETS; }
  // Apply a remote array-store value but keep the row this user has open intact.
  function mergeArrayStoreById(key, remoteVal, editId) {
    var local = editId ? arrByKey(key).filter(function (x) { return x.id === editId; })[0] : null;
    hydrateStore(key, remoteVal);
    if (local) {
      var arr = arrByKey(key), found = false;
      for (var i = 0; i < arr.length; i++) { if (arr[i].id === editId) { arr[i] = local; found = true; break; } }
      if (!found) arr.unshift(local);               // the row I'm editing isn't on the server yet — keep it
    }
  }
  // Pull in everything other users saved while I was editing, without touching
  // the row I have open, so my upcoming write includes their changes too.
  function mergePendingRemoteBeforeSave() {
    var keys = Object.keys(_remoteQ); if (!keys.length) return;
    var ek = currentEditStoreKey(), eid = currentEditItemId();
    keys.forEach(function (k) {
      if (ek && k === ek && eid) mergeArrayStoreById(k, _remoteQ[k], eid);
      else hydrateStore(k, _remoteQ[k]);
    });
    _remoteQ = {};
  }
  function saveEditorNow() {
    mergePendingRemoteBeforeSave();
    _pendingEdit = false;
    touchEditItem();   // bug 24: mark this sheet as the most recently updated
    // Claim success only AFTER the server acknowledges the write. If the write is
    // rejected (Firestore rules not published) say so plainly instead of a false "Saved".
    Promise.resolve(flushPersistNow()).then(function (res) {
      if (res && res.ok) { toast(L("સેવ થયું — બધાને દેખાશે", "Saved — now visible to everyone"), "ok"); }
      else if (res && res.denied) { toast(L("સેવ નથી થયું — ડેટાબેઝ નિયમો (Firestore rules) પબ્લિશ કરવા જરૂરી છે. રિફ્રેશ પછી ડેટા ખોવાઈ જશે.", "NOT saved — the database security rules must be published. Data will be lost on refresh."), "error"); }
      else { toast(L("સેવ હજી બાકી — આપમેળે ફરી પ્રયાસ થઈ રહ્યો છે…", "Not saved yet — retrying automatically…"), "info"); }
    });
  }

  /* ---- lock lifecycle ---- */
  var _hbT = null;
  function startHeartbeat(key) { stopHeartbeat(); _hbT = setInterval(function () { try { if (window.GJDB && window.GJDB.heartbeatLock) window.GJDB.heartbeatLock(key); } catch (e) {} }, 15000); }
  function stopHeartbeat() { if (_hbT) { clearInterval(_hbT); _hbT = null; } }
  function acquireEditorLock() {
    var key = currentEditLockKey();
    if (!key || !(window.GJDB && window.GJDB.ready && window.GJDB.acquireLock)) { STATE.lock = null; return; }
    STATE.lock = { key: key, readOnly: false, by: null };    // optimistic until the server answers
    window.GJDB.acquireLock(key).then(function (r) {
      if (!STATE.lock || STATE.lock.key !== key) return;      // user already navigated away
      if (r && r.ok) { STATE.lock = { key: key, readOnly: false, by: null }; startHeartbeat(key); }
      else {
        STATE.lock = { key: key, readOnly: true, by: (r && r.by) || null };
        stopHeartbeat();
        var who = (r && r.by && r.by.name) || L("બીજા યુઝર", "Another user");
        toast(who + " " + L("આ શીટ એડિટ કરે છે — ફક્ત જોવા મળશે", "is editing this sheet — opened view-only"), "info");
        render();
      }
    });
  }
  function releaseEditorLock() {
    var k = STATE.lock && STATE.lock.key;
    stopHeartbeat();
    STATE.lock = null;
    if (k) { try { if (window.GJDB && window.GJDB.releaseLock) window.GJDB.releaseLock(k); } catch (e) {} }
  }
  // Live locks map → if the sheet I'm viewing read-only becomes free, try to take it.
  function onLocksChanged(locks) {
    if (!STATE.lock || !STATE.lock.readOnly) return;
    var cur = locks[STATE.lock.key], now = Date.now();
    var free = !cur || (now - (cur.ts || 0) >= 45000);
    if (free) acquireEditorLock();
  }

  // Draw the editing banner + enforce view-only. Called at the end of render().
  function decorateEditor() {
    if (!isSheetEditor(STATE.view)) return;
    var view = $("#view"); if (!view) return;
    var lock = STATE.lock || {};
    var banner = document.createElement("div");
    banner.className = "edit-banner" + (lock.readOnly ? " locked" : "");
    if (lock.readOnly) {
      var who = (lock.by && lock.by.name) || L("બીજા યુઝર", "Another user");
      banner.innerHTML = '<span class="eb-ic">🔒</span><span class="eb-tx">' + esc(who) + ' ' + L("આ શીટ એડિટ કરે છે — ફક્ત જોવા માટે", "is editing this sheet — view only") + '</span>';
      view.querySelectorAll("input,select,textarea").forEach(function (el) { el.disabled = true; });
      view.querySelectorAll("button").forEach(function (b) {
        if (b.hasAttribute("data-go")) return;                 // keep Done/navigation usable
        b.disabled = true; b.style.opacity = "0.5"; b.style.pointerEvents = "none";
      });
    } else {
      banner.innerHTML = '<span class="eb-ic">✎</span><span class="eb-tx">' + L("તમે એડિટ કરો છો — સેવ કરો ત્યારે બધાને દેખાશે", "You are editing — click Save to share with everyone") + '</span>' +
        '<button type="button" class="eb-save" id="ebSave">' + svg("check") + ' ' + L("સેવ કરો", "Save") + '</button>';
    }
    view.insertBefore(banner, view.firstChild);
    var sb = $("#ebSave"); if (sb) sb.onclick = saveEditorNow;
  }

  // Fresh client database: keep the (editable) starter roster, wipe all demo transactions.
  function seedInitial() {
    SHEETS.length = 0; PACKING.length = 0; NSHEETS.length = 0;
    WORKERS.forEach(function (w) { LOANS[w.id] = []; UPAD[w.id] = []; });
    NWORKERS.forEach(function (p) { NUPAD[p.id] = []; NLOANS[p.id] = []; });
    NPARAM = {}; NSEQ.v = 0; GHATI_RATE.v = 120;
    rebuildBill();
    if (!workerById(STATE.worker) && WORKERS[0]) STATE.worker = WORKERS[0].id;
  }

  function schedulePersist() {
    if (!_persistOn || !(window.GJDB && window.GJDB.ready)) return;
    // Reflect-only-on-save: while a sheet editor is open, keep edits local and
    // do NOT push them — the user shares them explicitly via Save / Done / Back.
    if (editableEditorNow()) {
      if (!_inRender) { _pendingEdit = true; setSync("unsaved"); }
      else if (_pendingEdit) { setSync("unsaved"); }
      return;
    }
    if (_persistT) clearTimeout(_persistT);
    _persistT = setTimeout(function () { _persistT = null; doPersist(1); }, 900);
  }
  // Firestore is the single source of truth — no localStorage/sessionStorage copy.
  // "✓ Saved" shows only after the server acknowledges the write; on failure the write
  // keeps retrying against the server until it succeeds (nothing is cached locally).
  var _lastSaveErr = "", _retryT = null, _saving = false;
  // True while an edit is pending or a write is in flight — used to hold back the
  // new-build auto-refresh so a reload never happens mid-save.
  function savePending() { return _saving || !!_persistT; }
  // Flush any debounced edit to the server immediately (e.g. when leaving an editor
  // or the tab is closing) instead of waiting out the 900 ms debounce.
  function flushPersistNow() { if (_persistT) { clearTimeout(_persistT); _persistT = null; } if (_persistOn && window.GJDB && window.GJDB.ready) return doPersist(1); return Promise.resolve({ ok: true, n: 0 }); }
  function doPersist(attempt) {
    if (_retryT) { clearTimeout(_retryT); _retryT = null; }
    _saving = true;
    setSync("saving");
    try {
      return window.GJDB.saveStores(buildSnapshot(), STATE.role)
        .then(function (n) { _saving = false; _lastSaveErr = ""; showSaveBlocked(false); setSync(n ? "saved" : "idle"); return { ok: true, n: n }; })
        .catch(function (e) {
          _saving = false;
          var msg = (e && (e.code || e.message)) || "unknown error";
          _lastSaveErr = msg; console.warn("save failed (attempt " + attempt + ")", e);
          var denied = (msg === "permission-denied" || /permission/i.test(msg));
          if (denied) {
            // Security rules rejected the write — retrying won't help, and the data
            // will be LOST on refresh. Surface it LOUDLY and at once (no silent retries).
            setSync("error", msg);
            console.warn("[Giriraj] Save blocked by Firestore security rules (permission-denied). Publish firestore.rules in the Firebase console (firebase deploy --only firestore:rules).");
            showSaveBlocked(true);
            _retryT = setTimeout(function () { _retryT = null; doPersist(1); }, 15000);  // re-check in case the rules get published
            return { ok: false, denied: true, msg: msg };
          }
          if (attempt < 3) { setSync("saving"); setTimeout(function () { doPersist(attempt + 1); }, 1500 * attempt); return { ok: false, retrying: true, msg: msg }; }
          setSync("error", msg);
          toast(L("સર્વરમાં સેવ નિષ્ફળ — ઇન્ટરનેટ તપાસો. આપમેળે ફરી પ્રયાસ થશે.",
                  "Not saved to the server — check your internet. It will keep retrying."), "info");
          // keep trying the server (no local fallback) so a transient failure self-heals
          _retryT = setTimeout(function () { _retryT = null; doPersist(1); }, 10000);
          return { ok: false, msg: msg };
        });
    } catch (e) { _lastSaveErr = (e && e.message) || ""; setSync("error", _lastSaveErr); return Promise.resolve({ ok: false, msg: _lastSaveErr }); }
  }

  // (Removed the localStorage write-ahead backup. Firestore is the single source of
  //  truth; a failed write retries against the server instead of being cached locally.)
  function dropLegacyLocalCopy() { try { localStorage.removeItem("gj_pending"); } catch (e) {} }

  // Persistent, impossible-to-miss banner shown when Firestore rejects a write
  // (permission-denied). Data is NOT being saved, so this stays up until a save
  // succeeds — it is the clear signal that the security rules must be published.
  function showSaveBlocked(on) {
    var el = $("#saveBlocked");
    if (!on) { if (el) el.remove(); return; }
    if (el) return;
    el = document.createElement("div");
    el.id = "saveBlocked";
    el.className = "save-blocked-bar";
    el.innerHTML = '<span class="sbb-ic">⚠</span><span class="sbb-tx">' +
      L("ફેરફારો ડેટાબેઝમાં સેવ થતા નથી — રિફ્રેશ પછી ખોવાઈ જશે. ડેટાબેઝ નિયમો (Firestore rules) પબ્લિશ કરવા જરૂરી છે.",
        "Changes are NOT being saved to the database — they will be lost on refresh. The Firestore security rules need to be published.") +
      '</span>';
    document.body.appendChild(el);
  }

  /* tiny save-status pill in the app bar (reassures the owner data is stored) */
  function ensureSyncPill() {
    if ($("#gjSync") || !$(".appbar")) return;
    var el = document.createElement("div"); el.id = "gjSync";
    el.style.cssText = "display:none;align-items:center;gap:6px;font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:999px;margin-left:8px;white-space:nowrap";
    var bar = $(".appbar"); bar.appendChild(el);
  }
  function setSync(state, msg) {
    ensureSyncPill(); var el = $("#gjSync"); if (!el) return;
    el.style.display = "inline-flex"; el.title = "";
    if (state === "saving") { el.style.background = "var(--bg-2)"; el.style.color = "var(--muted)"; el.textContent = L("સેવ થાય છે…", "Saving…"); }
    else if (state === "saved") { el.style.background = "#e7f7ef"; el.style.color = "#1f9d6b"; el.textContent = "✓ " + L("સેવ થયું", "Saved"); }
    else if (state === "error") { el.style.background = "#fdecec"; el.style.color = "#c0392b"; el.style.cursor = "help"; el.textContent = "⚠ " + L("સેવ નથી થયું", "Not saved"); el.title = msg ? ("Save error: " + msg) : ""; el.onclick = function () { if (msg) alert("Save error: " + msg); }; }
    else if (state === "synced") { el.style.background = "#e8f0fe"; el.style.color = "#2f5fae"; el.textContent = "↻ " + L("અપડેટ થયું", "Updated"); setTimeout(function () { var e2 = $("#gjSync"); if (e2 && /Updated|અપડેટ/.test(e2.textContent)) setSync("idle"); }, 2500); }
    else if (state === "unsaved") { el.style.background = "#fff4e5"; el.style.color = "#b26a00"; el.title = L("સેવ કરો ત્યારે બધાને દેખાશે", "Changes show to others when you Save"); el.textContent = "● " + L("સેવ બાકી", "Unsaved"); }
    else { el.style.display = "none"; }
  }
  function loadingHTML() {
    return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:50vh;gap:14px;color:var(--muted)">' +
      '<div style="width:34px;height:34px;border:3px solid var(--line);border-top-color:var(--brand);border-radius:50%;animation:gjspin .8s linear infinite"></div>' +
      '<div style="font-weight:600">' + L("તમારો ડેટા લોડ થાય છે…", "Loading your data…") + '</div>' +
      '<style>@keyframes gjspin{to{transform:rotate(360deg)}}</style></div>';
  }

  /* ---- bug 1: auto-refresh when a new build is published ------------------
     Each deploy bumps window.__BUILD (index.html, served no-cache) and the
     matching /version.json. Any open tab polls version.json; when the published
     build differs from the one it is running, it reloads once to pick up the new
     code. sessionStorage guards against reload loops. */
  var BUILD = (typeof window !== "undefined" && window.__BUILD) || "";
  function checkBuild() {
    try {
      fetch("version.json?t=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (j) {
          if (!j || !j.build || !BUILD || j.build === BUILD) return;
          showUpdateBar(j.build);   // notify with a Refresh button instead of reloading on its own
        }).catch(function () {});
    } catch (e) {}
  }
  function startAutoUpdate() {
    if (!BUILD) return;
    setTimeout(checkBuild, 4000);        // early check catches a stale (cached) first load
    setInterval(checkBuild, 60000);      // then poll every minute
    document.addEventListener("visibilitychange", function () { if (!document.hidden) checkBuild(); });
    window.addEventListener("focus", checkBuild);
  }

  /* ---- "new version available" prompt with a Refresh button ----------------
     Instead of reloading on its own, show a small banner so the person finishes
     what they are doing and refreshes when ready. Refresh clears only the build
     caches and reloads with ?v=<build> (fresh page + assets); it does NOT touch
     cookies, localStorage or the Firebase login session, so they stay signed in. */
  var _updBuild = "", _updDismissed = "";
  function showUpdateBar(nb) {
    _updBuild = nb;
    if (nb === _updDismissed) return;          // they dismissed this version's prompt
    if ($("#gjUpdateBar")) return;             // already showing
    var refreshIc = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/></svg>';
    var closeIc = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    var bar = document.createElement("div");
    bar.id = "gjUpdateBar"; bar.className = "update-bar"; bar.setAttribute("role", "status");
    bar.innerHTML =
      '<span class="ub-ic">' + refreshIc + '</span>' +
      '<span class="ub-txt">' + L("નવું વર્ઝન ઉપલબ્ધ છે.", "A new version is available.") + '</span>' +
      '<button type="button" class="ub-btn" id="gjUpdateBtn">' + refreshIc + '<span>' + L("રિફ્રેશ કરો", "Refresh") + '</span></button>' +
      '<button type="button" class="ub-x" id="gjUpdateX" aria-label="' + L("બંધ કરો", "Dismiss") + '">' + closeIc + '</button>';
    document.body.appendChild(bar);
    $("#gjUpdateBtn").onclick = function () { applyUpdate(_updBuild); };
    $("#gjUpdateX").onclick = function () { _updDismissed = _updBuild; bar.remove(); };
  }
  function applyUpdate(nb) {
    var btn = $("#gjUpdateBtn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<span>' + L("રિફ્રેશ થાય છે…", "Refreshing…") + '</span>'; }
    try { flushPersistNow(); } catch (e) {}   // save any pending edit before reloading
    // clear only the build/asset caches (if any) — keep cookies, localStorage and
    // the Firebase login session so the person stays signed in.
    var clearCaches = (window.caches && caches.keys)
      ? caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }).catch(function () {})
      : Promise.resolve();
    clearCaches.then(function () {
      (function waitSave(tries) {
        if (savePending() && tries > 0) { setTimeout(function () { waitSave(tries - 1); }, 1000); return; }
        try { location.replace(location.pathname + "?v=" + encodeURIComponent(nb)); } catch (e) { try { location.reload(); } catch (e2) {} }
      })(15);
    });
  }

  function boot() {
    // tidy the cache-busting ?v= that an auto-update reload may have added
    try { if (location.search && /[?&]v=/.test(location.search)) history.replaceState(null, "", location.pathname + location.hash); } catch (e) {}
    startAutoUpdate();
    buildShell(); buildSwitchers(); initHero();
    $("#langGu") && ($("#langGu").onclick = function () { setLang("gu"); });
    $("#langEn") && ($("#langEn").onclick = function () { setLang("en"); });
    // tablet/phone navigation drawer (hamburger) — makes every module reachable
    (function () {
      var app = $("#app"), tog = $("#navToggle"), bd = $("#navBackdrop");
      function closeNav() { if (app) app.classList.remove("nav-open"); if (tog) tog.setAttribute("aria-expanded", "false"); }
      window.__gjCloseNav = closeNav;
      if (tog) tog.onclick = function () { var open = app && app.classList.toggle("nav-open"); tog.setAttribute("aria-expanded", open ? "true" : "false"); if (open) { try { if (window.__gjClosePf) window.__gjClosePf(); } catch (e) {} } };
      if (bd) bd.onclick = closeNav;
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
    })();
    // Login page: role selection decides which dashboard opens
    var pendingRole = "admin";
    var picker = $("#rolePicker");
    if (picker) {
      picker.querySelectorAll(".role-card").forEach(function (c) {
        c.onclick = function () {
          picker.querySelectorAll(".role-card").forEach(function (x) { x.classList.remove("on"); });
          c.classList.add("on");
          pendingRole = c.getAttribute("data-role") || "admin";
        };
      });
    }
    // Production auth hook: when a real Firebase config is present, auth.js sets
    // window.GJAuth.enabled = true and handles sign-in; otherwise this stays in demo mode.
    $("#enterBtn") && ($("#enterBtn").onclick = function () {
      if (window.GJAuth && window.GJAuth.enabled && typeof window.GJAuth.attempt === "function") { window.GJAuth.attempt(pendingRole); }
      else { login(pendingRole); }
    });
    window.GJ = window.GJ || {};
    window.GJ.getPendingRole = function () { return pendingRole; };
    window.GJ.selectRole = function (r) { pendingRole = (r === "supervisor" ? "supervisor" : "admin"); if (picker) { picker.querySelectorAll(".role-card").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-role") === pendingRole); }); } };
    window.addEventListener("hashchange", function () {
      // protected routes: in LIVE mode, no app navigation until a user is signed in
      if (window.GJAuth && window.GJAuth.enabled && !(window.GJAuth.user)) return;
      var h = location.hash.replace("#", ""); if (h && NAV.some(function (n) { return n.id === h; })) { if (!$("#app").classList.contains("show")) startApp(); go(h); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  // Production entry point used by auth.js once a user is authenticated and their role resolved.
  window.GJ = window.GJ || {};
  window.GJ.enter = function (role) {
    STATE.role = (role === "supervisor" ? "supervisor" : "admin");
    try { var l = localStorage.getItem("gj_lang"); if (l === "en" || l === "gu") STATE.lang = l; } catch (e) {}
    restoreRoute();   // stay on the page the user was on before refresh (falls back to dashboard)
    try {
      var g = document.getElementById("langGu"), e2 = document.getElementById("langEn");
      if (g && e2) { g.classList.toggle("on", STATE.lang !== "en"); e2.classList.toggle("on", STATE.lang === "en"); }
      document.documentElement.lang = STATE.lang === "en" ? "en" : "gu";
    } catch (e) {}
    buildShell(); buildSwitchers();   // rebuild appbar switchers so month/worker match the restored language
    startSelfWatch();                 // live account watch: disable/role/permission changes apply at once
    if (window.GJDB && window.GJDB.ready) {
      // LIVE: load this project's data from Firestore, then show the app.
      _persistOn = false;
      $("#hero").classList.add("hide"); $("#app").classList.add("show");
      $("#view").innerHTML = loadingHTML();
      window.GJDB.loadAll().then(function (d) {
        var has = d && (d.workers || d.sheets || d.packing || d.nsheets || d.loans || d.bills || d.nworkers);
        if (!has) {
          // first ever sign-in → clean starter database (roster kept, no demo transactions)
          seedInitial();
          if (STATE.role === "admin") { return window.GJDB.saveStores(buildSnapshot(), "admin").then(function () { window.GJDB.cacheSeed(buildSnapshot()); }); }
          window.GJDB.cacheSeed(buildSnapshot());
        } else {
          hydrate(d); window.GJDB.cacheSeed(buildSnapshot());
        }
      }).catch(function (e) { console.warn("load failed", e); })
        .then(function () {
          _persistOn = true;
          dropLegacyLocalCopy();   // Firestore is the only source of truth — discard any legacy local copy
          render();
          try { gjMaybeYearlyFinancialBackup(); } catch (e) {}   // auto yearly financial backup (on/after 30 Nov, once per year)
          // best-effort: push a pending edit to the server when the tab is hidden/closed
          // (Firestore write, no local cache). Keeps a last-second edit from being lost.
          window.addEventListener("visibilitychange", function () { if (document.hidden) flushPersistNow(); });
          window.addEventListener("pagehide", function () { try { releaseEditorLock(); } catch (e) {} flushPersistNow(); });
          // real-time sync: changes from any other device/panel stream in live
          try { if (window.GJDB && window.GJDB.watch) window.GJDB.watch(applyRemote); } catch (e) {}
          // live edit-locks: who is editing which sheet, across all users
          try { if (window.GJDB && window.GJDB.watchLocks) window.GJDB.watchLocks(onLocksChanged); } catch (e) {}
        });
    } else {
      startApp();   // DEMO mode — unchanged
    }
  };
  window.GJ.setRole = setRole;
  window.GJ.go = go;
  window.GJ.render = render;
  window.GJ.releaseLock = releaseEditorLock;   // free my sheet lock on logout
  window.GJ.logout = function () { try { location.reload(); } catch (e) {} };

  if (typeof window !== "undefined" && window.__TEST) {
    window.__TEST_API = { STATE: STATE, render: render, go: go, openSheet: openSheet, newSheet: newSheet, setLang: setLang, setRole: setRole, saveLoan: saveLoan,
      viewDashboard: viewDashboard, viewGate: viewGate, viewGateSheet: viewGateSheet, viewLedger: viewLedger, viewUpad: viewUpad, viewBilling: viewBilling, viewLoans: viewLoans, viewYearEnd: viewYearEnd, viewWorkers: viewWorkers, viewHelp: viewHelp, viewNiwar: viewNiwar,
      jobSheetPages: jobSheetPages, billHTML: billHTML, loanHTML: loanHTML, upadHTML: upadHTML, yearEndHTML: yearEndHTML, niwarBillHTML: niwarBillHTML, sheetWaText: sheetWaText, sheetById: sheetById, newSheet: newSheet, openSheet: openSheet,
      sheetMt: sheetMt, sheetRolls: sheetRolls, sheetKgG: sheetKgG, ledgerRows: ledgerRows, billMonth: billMonth, settleM: settleM, matBalance: matBalance, ghatiRecon: ghatiRecon, yearEnd: yearEnd, loanBalanceP: loanBalanceP, upadMP: upadMP, upadEntries: upadEntries, UPAD: UPAD, moneyP: moneyP, kgStr: kgStr,
      NWORKERS: NWORKERS, NSHEETS: NSHEETS, NUPAD: NUPAD, NLOANS: NLOANS, NPARAM: NPARAM, NIWAR_SIZES: NIWAR_SIZES, NL_ROWS: NL_ROWS, niwarSettle: niwarSettle, nMonthSheets: nMonthSheets, nSizeTotalsG: nSizeTotalsG, nRecvG: nRecvG, nParatG: nParatG, nSheetNiwarG: nSheetNiwarG, nProductG: nProductG, nParam: nParam, nSheetById: nSheetById, viewNiwarSheet: viewNiwarSheet, niwarSheetHTML: niwarSheetHTML, nUpadMP: nUpadMP, nLoanBalanceP: nLoanBalanceP, kgToG: kgToG,
      viewPacking: viewPacking, viewPackingSheet: viewPackingSheet, packingPages: packingPages, newPacking: newPacking, openPacking: openPacking,
      pkMt: pkMt, pkRolls: pkRolls, pkKgG: pkKgG, pkStepTotal: pkStepTotal, pkAmount: pkAmount, PACKING: PACKING, PK_ROWS: PK_ROWS, PK_STEPS: PK_STEPS,
      SHEETS: SHEETS, WORKERS: WORKERS, MONTHS: MONTHS, LOANS: LOANS, BILL: BILL, navForRole: navForRole, blankSheet: blankSheet, blankPacking: blankPacking,
      buildSnapshot: buildSnapshot, hydrate: hydrate, seedInitial: seedInitial, workerForm: workerForm, saveWorkerForm: saveWorkerForm, delWorker: delWorker, nPartyForm: nPartyForm, saveNParty: saveNParty, delNParty: delNParty,
      getStores: function () { return { WORKERS: WORKERS, SHEETS: SHEETS, BILL: BILL, LOANS: LOANS, UPAD: UPAD, PACKING: PACKING, NWORKERS: NWORKERS, NSHEETS: NSHEETS, NPARAM: NPARAM, NUPAD: NUPAD, NLOANS: NLOANS, GHATI_RATE: GHATI_RATE, NSEQ: NSEQ, STATE: STATE }; },
      setPersistOn: function (v) { _persistOn = !!v; }, schedulePersist: schedulePersist,
      gjBackupObject: gjBackupObject, gjValidateBackup: gjValidateBackup, gjRestoreFromObject: gjRestoreFromObject, gjCounts: gjCounts, gjTotal: gjTotal,
      gjGenerateFinancialBackup: gjGenerateFinancialBackup, gjFinAll: gjFinAll, gjMaybeYearlyFinancialBackup: gjMaybeYearlyFinancialBackup, zipStore: zipStore, istNow: istNow, gjFinancialData: gjFinancialData,
      viewAllowed: viewAllowed, modulePermitted: modulePermitted, PERM_MODULES: PERM_MODULES, STAFF_DEFAULT: STAFF_DEFAULT };
  }
})();
