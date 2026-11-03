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
    place: "Junagadh, Gujarat",
    gstin: "24XXXXX0000X1ZX",   /* sample — replace with the real GSTIN */
    phone: "+91 00000 00000"    /* sample — replace with the real phone */
  };
  var VENDOR = "Shri Giriraj Textile";
  var MAX_ROWS = 45, MAX_STEPS = 8;

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
    briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20"/>'
  };
  function svg(n, c) { return '<svg class="' + (c || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (I[n] || "") + '</svg>'; }

  /* ---------------------------------------------------------------- UTIL */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function L(gu, en) { return STATE.lang === "en" ? en : gu; }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var RID = 0; function rid() { return "s" + (++RID); }
  function numOrNull(v) { if (v === "" || v == null) return null; var n = parseFloat(v); return isNaN(n) ? null : n; }

  /* ---------------------------------------------------------------- DATA */
  var MONTHS = [
    { id: "2026-08", g: "ઓગસ્ટ 2026", e: "August 2026", mm: 8, yy: 26 },
    { id: "2026-09", g: "સપ્ટેમ્બર 2026", e: "September 2026", mm: 9, yy: 26 },
    { id: "2026-10", g: "ઓક્ટોબર 2026", e: "October 2026", mm: 10, yy: 26 }
  ];
  var AV = ["#30397e", "#bd7c16", "#2f74c0", "#1f9d6b", "#8a4fb0", "#c75a3a", "#3a7d7b", "#b03a63"];
  var WORKERS = [
    { id: "w0", name: "વિઠ્ઠલ ટેક્ષટાઇલ વર્ક્સ", en: "Vitthal Textile Works", phone: "+91 98240 11001", cloth: "કોટન 40s", rate: 3.55 },
    { id: "w1", name: "રમેશ પ્રોસેસર્સ", en: "Ramesh Processors", phone: "+91 98240 11002", cloth: "રેયોન", rate: 3.40 },
    { id: "w2", name: "જયંતિ ડાઇંગ", en: "Jayanti Dyeing", phone: "+91 98240 11003", cloth: "પોલિએસ્ટર", rate: 3.80 },
    { id: "w3", name: "કિશોર જોબવર્ક", en: "Kishor Jobwork", phone: "+91 98240 11004", cloth: "કોટન", rate: 3.25 },
    { id: "w4", name: "મહેશ પ્રિન્ટર્સ", en: "Mahesh Printers", phone: "+91 98240 11005", cloth: "સિલ્ક", rate: 4.00 },
    { id: "w5", name: "દિનેશ ફેબ્રિક્સ", en: "Dinesh Fabrics", phone: "+91 98240 11006", cloth: "રેયોન", rate: 3.60 },
    { id: "w6", name: "સુરેશ ટેક્ષટાઇલ", en: "Suresh Textile", phone: "+91 98240 11007", cloth: "કોટન", rate: 3.45 },
    { id: "w7", name: "નીલેશ પ્રોસેસ હાઉસ", en: "Nilesh Process House", phone: "+91 98240 11008", cloth: "પોલિએસ્ટર", rate: 3.90 },
    { id: "w8", name: "ભાવેશ વીવર્સ", en: "Bhavesh Weavers", phone: "+91 98240 11009", cloth: "કોટન", rate: 3.30 }
  ];
  WORKERS.forEach(function (w, i) { w.color = AV[i % AV.length]; w.idx = i; });
  var GH_SEED = { w0: 2.75, w1: 2.90, w2: 3.00, w4: 2.80, w6: 2.85 };
  WORKERS.forEach(function (w) { w.actualGhati = GH_SEED[w.id] != null ? GH_SEED[w.id] : 2.85; });
  var GHATI_RATE = { v: 120 };
  function worker() { return WORKERS.filter(function (w) { return w.id === STATE.worker; })[0]; }
  function workerById(id) { return WORKERS.filter(function (w) { return w.id === id; })[0]; }
  function monthObj() { return MONTHS.filter(function (m) { return m.id === STATE.month; })[0]; }
  function monthName() { var m = monthObj(); return L(m.g, m.e); }

  function blankSheet(wid, date) {
    var meters = [], kg = [];
    for (var s = 0; s < MAX_STEPS; s++) { meters.push(new Array(MAX_ROWS).fill(null)); kg.push(null); }
    return { id: rid(), workerId: wid, date: date, quality: workerById(wid) ? workerById(wid).cloth : "", nSteps: 1, meters: meters, kg: kg, parat: [{ kokdi: null, color: null }] };
  }

  /* SHEETS = the single source of truth (one per gate event) */
  var SHEETS = [];
  (function seedSheets() {
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
  (function seedLoans() {
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
  (function seedUpad() {
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
  var NWORKERS = [
    { id: "n0", name: "ગુરુ ગોવિંદ નિવાર", en: "Guru Govind Niwar", phone: "+91 98240 22001" },
    { id: "n1", name: "જય અંબે નિવાર", en: "Jay Ambe Niwar", phone: "+91 98240 22002" },
    { id: "n2", name: "શિવ નિવાર વર્ક્સ", en: "Shiv Niwar Works", phone: "+91 98240 22003" },
    { id: "n3", name: "રમેશભાઈ પડાયા", en: "Rameshbhai Padaya", phone: "+91 98240 22004" }
  ];
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

  (function seedNiwar() {
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
  (function seedNUpad() {
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
  (function seedNLoans() {
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
  var STATE = { role: "admin", view: "dashboard", worker: "w0", month: "2026-08", lang: "gu", sheetId: null, packingId: null, niwarParty: "n0", niwarSheetId: null };
  var NAV = [
    { id: "dashboard", g: "ડેશબોર્ડ", e: "Dashboard", ic: "dash", roles: ["admin", "supervisor"] },
    { id: "gate", g: "ગેટ · જોબ વર્ક શીટ", e: "Gate · Job Work Sheet", ic: "sheet", roles: ["admin", "supervisor"] },
    { id: "packing", g: "પેકેજિંગ", e: "Packaging", ic: "box", roles: ["admin", "supervisor"] },
    { id: "ledger", g: "જોબવર્ક ખાતાવહી", e: "Jobwork Ledger", ic: "ledger", roles: ["admin"] },
    { id: "niwar", g: "નિવાર જોબવર્ક", e: "Niwar Jobwork", ic: "roll", roles: ["admin", "supervisor"] },
    { id: "upad", g: "ઉપડ (એડવાન્સ)", e: "Upad (Advances)", ic: "wallet", roles: ["admin"] },
    { id: "billing", g: "બિલિંગ અને PDF", e: "Billing & PDF", ic: "bill", roles: ["admin"] },
    { id: "loans", g: "લોન ખાતા", e: "Loan Accounts", ic: "rupee", roles: ["admin"] },
    { id: "yearend", g: "વર્ષાંત (દિવાળી)", e: "Year-End (Diwali)", ic: "spark", roles: ["admin"] },
    { id: "workers", g: "જોબ વર્કર્સ", e: "Job Workers", ic: "users", roles: ["admin"] },
    { id: "help", g: "માહિતી", e: "How it works", ic: "help", roles: ["admin", "supervisor"] }
  ];
  function navForRole() { return NAV.filter(function (n) { return n.roles.indexOf(STATE.role) > -1; }); }
  function viewAllowed(v) { if (v === "gatesheet") return viewAllowed("gate"); if (v === "packingsheet") return viewAllowed("packing"); if (v === "niwarsheet") return viewAllowed("niwar"); var n = NAV.filter(function (x) { return x.id === v; })[0]; return n && n.roles.indexOf(STATE.role) > -1; }

  /* ---------------------------------------------------------------- SHARED UI */
  function demoStrip() {
    return '<div class="demo-strip">' + svg("info") + '<span>' +
      L('<b>ગેટ જોબ વર્ક શીટ</b> આખી સિસ્ટમનો આધાર છે — શીટ ભરો → ખાતાવહી, બિલિંગ, લોન અને વર્ષાંત આપમેળે અપડેટ થાય.',
        '<b>The gate Job Work Sheet</b> is the single source of truth — fill a sheet → ledger, billing, loans & year-end update automatically.') + '</span></div>';
  }
  function stat(tint, ic, k, v, vs, d) {
    return '<div class="stat"><div class="ico ' + tint + '">' + svg(ic) + '</div><div class="k">' + k + '</div><div class="v num">' + v + (vs ? ' <small>' + vs + '</small>' : '') + '</div>' + (d ? '<div class="d">' + d + '</div>' : '') + '</div>';
  }
  function dmy(iso) { var p = iso.split("-"); return p[2] + "/" + p[1] + "/" + p[0].slice(-2); }

  /* ---------------------------------------------------------------- DASHBOARD */
  function viewDashboard() {
    if (STATE.role === "supervisor") return dashSupervisor();
    var w = worker(); var b = billMonth(w.id, STATE.month);
    var ranks = WORKERS.map(function (ww) { return { w: ww, mtr: billMonth(ww.id, STATE.month).mtr }; }).sort(function (a, z) { return z.mtr - a.mtr; }).slice(0, 5);
    var maxMtr = ranks[0].mtr || 1;
    var monthSheets = SHEETS.filter(function (s) { return s.date.slice(0, 7) === STATE.month; });
    var loanTot = WORKERS.reduce(function (a, ww) { return a + loanBalanceP(ww.id); }, 0n);
    var upadTot = WORKERS.reduce(function (a, ww) { return a + upadMP(ww.id, STATE.month); }, 0n);

    var html = demoStrip();
    html += '<div class="page-head"><h2>' + L("ડેશબોર્ડ", "Dashboard") + '</h2><div class="sub">' + w.name + ' · ' + monthName() + '</div></div>';
    html += '<div class="stat-grid">' +
      stat("tint-brand", "sheet", L("આ મહિને શીટ", "Sheets this month"), monthSheets.length, "", L("બધા વર્કર", "all workers")) +
      stat("tint-in", "box", L("આ મહિને મીટર", "Meters this month"), numI(b.mtr), "mtr", w.name) +
      stat("tint-out", "send", L("કોકડી+કલર", "Kokdi+Color"), kgStr(b.sentG), "", L("મોકલ્યું", "sent")) +
      stat("tint-upad", "wallet", L("આ મહિને ઉપડ", "Upad this month"), moneyPw(upadTot), "", L("બધા વર્કર", "all workers")) +
      stat("tint-out", "rupee", L("કુલ લોન બાકી", "Loan outstanding"), moneyPw(loanTot), "", L("બધા વર્કર", "all workers")) +
      '</div>';
    html += '<div class="grid-2">';
    html += '<div class="card"><div class="card-head"><div class="ico tint-ok">' + svg("bill") + '</div><div><h3>' + w.name + ' <span class="en">' + monthName() + '</span></h3></div></div><div class="card-pad">' +
      '<div class="bill-line"><span class="lab">' + L("કુલ મીટર", "Total meters") + ' <small>' + numI(b.mtr) + ' × ' + rateStr(b.ratePaise) + '</small></span><span class="val num">' + moneyP(b.grossP) + '</span></div>' +
      '<div class="bill-line"><span class="lab">' + L("કાપડ વજન (KG)", "Cloth weight (KG)") + '</span><span class="val num">' + kgStr(b.kapadG) + '</span></div>' +
      '<div class="bill-total"><span class="lab"><b>' + L("માસિક નેટ", "Month net") + '</b></span><span class="val num">' + moneyP(b.EP) + '</span></div>' +
      '<div class="page-actions"><button class="btn btn-soft btn-sm" data-go="ledger">' + svg("ledger") + ' ' + L("ખાતાવહી", "Ledger") + '</button><button class="btn btn-gold btn-sm" data-go="billing">' + svg("file") + ' PDF</button></div></div></div>';
    html += '<div class="card"><div class="card-head"><div class="ico tint-in">' + svg("dash") + '</div><div><h3>' + L("ટોપ જોબ વર્કર્સ", "Top job workers") + '</h3></div></div><div class="card-pad">';
    ranks.forEach(function (rk) { var pc = Math.max(6, Math.round(rk.mtr / maxMtr * 100)); html += '<div style="margin-bottom:13px"><div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:5px"><b>' + rk.w.name + '</b><span class="num" style="color:var(--muted)">' + numI(rk.mtr) + ' mtr</span></div><div style="height:9px;background:var(--bg-2);border-radius:999px;overflow:hidden"><div style="height:100%;width:' + pc + '%;background:linear-gradient(90deg,var(--brand),var(--brand-600));border-radius:999px"></div></div></div>'; });
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
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-soft" data-go="niwar">' + svg("roll") + ' ' + L("નિવાર ગેટ એન્ટ્રી", "Niwar Gate Entry") + '</button><button class="btn btn-primary" data-newsheet="1">' + svg("plus") + ' ' + L("નવી શીટ", "New Sheet") + '</button></div></div>';
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
    var list = sheetsFor(STATE.worker, STATE.month);
    var w = worker();
    var html = demoStrip();
    html += '<div class="page-head row-between"><div><h2>' + L("ગેટ · જોબ વર્ક શીટ", "Gate · Job Work Sheet") + '</h2>' +
      '<div class="sub">' + L("ટેમ્પો આવે ત્યારે ગેટ પર આ શીટ ભરાય. ", "Filled at the gate when a tempo arrives. ") + w.name + ' · ' + monthName() + '</div></div>' +
      '<button class="btn btn-primary" data-newsheet="1">' + svg("plus") + ' ' + L("નવી શીટ", "New Sheet") + '</button></div>';
    html += '<div class="card"><div class="table-scroll"><table class="data"><thead><tr>' +
      '<th>' + L("તારીખ", "Date") + '</th><th>' + L("ક્વોલિટી", "Quality") + '</th><th style="text-align:right">' + L("રોલ", "Roll") + '</th><th style="text-align:right">' + L("કુલ મીટર", "Total Mtr") + '</th><th style="text-align:right">KG</th><th style="text-align:right">' + L("કોકડી+કલર", "Kokdi+Color") + '</th><th></th></tr></thead><tbody>';
    if (!list.length) html += '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:22px">' + L("આ વર્કર માટે આ મહિને કોઈ શીટ નથી. “નવી શીટ” દબાવો.", "No sheets for this worker this month. Press “New Sheet”.") + '</td></tr>';
    list.forEach(function (s) {
      html += '<tr><td><b>' + dmy(s.date) + '</b></td><td>' + esc(s.quality) + '</td>' +
        '<td style="text-align:right" class="num">' + sheetRolls(s) + '</td><td style="text-align:right" class="num">' + numI(sheetMt(s)) + '</td>' +
        '<td style="text-align:right" class="num">' + kgStr(B(sheetKgG(s))) + '</td><td style="text-align:right" class="num">' + kgStr(B(sheetKokdiG(s) + sheetColorG(s))) + '</td>' +
        '<td style="text-align:right"><button class="btn btn-soft btn-sm" data-opensheet="' + s.id + '">' + svg("edit") + ' ' + L("ખોલો", "Open") + '</button></td></tr>';
    });
    html += '</tbody></table></div></div>';
    html += '<div class="hint mt">' + L("💡 દરેક શીટ = ખાતાવહીની એક એન્ટ્રી. શીટ ભરતાં જ બિલિંગ/લોન/વર્ષાંત અપડેટ થાય.", "💡 Each sheet = one ledger entry. Filling a sheet updates billing / loans / year-end automatically.") + '</div>';
    return html;
  }

  /* ---------------------------------------------------------------- GATE SHEET EDITOR */
  function viewGateSheet() {
    var sh = sheetById(STATE.sheetId);
    if (!sh) { STATE.view = "gate"; return viewGate(); }
    var html = '';
    html += '<div class="page-head row-between"><div style="display:flex;align-items:center;gap:12px"><button class="btn btn-ghost btn-sm" data-go="gate">' + svg("back") + ' ' + L("પાછળ", "Back") + '</button>' +
      '<div><h2 style="margin:0">' + L("જોબ વર્ક શીટ", "Job Work Sheet") + '</h2></div></div>' +
      '<div class="page-actions"><button class="btn btn-wa btn-sm" data-sheetwa="1">' + svg("wa") + ' ' + L("WhatsApp", "WhatsApp") + '</button>' +
      '<button class="btn btn-gold btn-sm" data-sheetpdf="worker">' + svg("send") + ' ' + L("વર્કર કોપી PDF", "Worker PDF") + '</button>' +
      '<button class="btn btn-primary btn-sm" data-sheetpdf="company">' + svg("file") + ' ' + L("કંપની કોપી PDF", "Company PDF") + '</button></div></div>';

    /* header fields */
    var wopts = WORKERS.map(function (w) { return '<option value="' + w.id + '"' + (w.id === sh.workerId ? " selected" : "") + '>' + (STATE.lang === "en" ? w.en : w.name) + '</option>'; }).join("");
    html += '<div class="jws-head"><div class="jws-hfields">' +
      '<label class="jws-hf"><span>' + L("જોબ વર્કર (નામ)", "Job Worker (Name)") + '</span><select data-sh="workerId">' + wopts + '</select></label>' +
      '<label class="jws-hf"><span>' + L("તારીખ", "Date") + '</span><input type="date" data-sh="date" value="' + esc(sh.date) + '"></label>' +
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
    for (var s4 = 0; s4 < sh.nSteps; s4++) html += '<td><input class="cell kgcell" inputmode="decimal" data-kg="' + s4 + '" value="' + (sh.kg[s4] == null ? "" : sh.kg[s4]) + '"></td>';
    html += '</tr></tfoot></table></div><div class="hint" style="padding:10px 14px 0">' + L("ખાલી ખાના છોડી શકાય. બાજુમાં સ્ક્રોલ કરીને બધા સ્ટેપ જુઓ.", "Blanks are fine. Scroll sideways for all steps.") + '</div></div>';
    html += '<div class="jws-side">' +
      sideStat("roll", L("રોલ", "Roll"), '<span id="sumRoll">' + numI(sheetRolls(sh)) + '</span>', L("કુલ એન્ટ્રી", "total entries"), "tint-in") +
      sideStat("ruler", L("કુલ મીટર", "Total Metre"), '<span id="sumMt">' + numI(sheetMt(sh)) + '</span>', L("બધા સ્ટેપ", "all steps"), "tint-brand") +
      sideStat("scale", "KG", '<span id="sumKg">' + kgStr(B(sheetKgG(sh))) + '</span>', L("કુલ કિલો", "total KG"), "tint-out") +
      '</div></div>';

    /* parat */
    html += '<div class="card mt jws-parat"><div class="card-head"><div class="ico tint-out">' + svg("send") + '</div><div><h3>પરત ની યાદી <span class="en">Parat ni Yadi — ' + L("જોબ વર્કરને મોકલ્યું", "sent to job worker") + '</span></h3></div><div class="spacer"></div><button class="btn btn-ghost btn-sm" id="paratAdd">' + svg("plus") + ' ' + L("લાઇન", "Add line") + '</button></div>';
    html += '<div class="table-scroll"><table class="jws-parat-tbl"><thead><tr><th>#</th><th>' + L("કોકડી (kg)", "Kokdi (kg)") + '</th><th>' + L("કલર (kg)", "Color (kg)") + '</th><th></th></tr></thead><tbody>';
    sh.parat.forEach(function (p, i) {
      html += '<tr><td class="sr-col">' + (i + 1) + '</td><td><input class="cell" inputmode="decimal" data-pk="' + i + '" value="' + (p.kokdi == null ? "" : p.kokdi) + '"></td><td><input class="cell" inputmode="decimal" data-pc="' + i + '" value="' + (p.color == null ? "" : p.color) + '"></td><td class="act">' + (sh.parat.length > 1 ? '<button class="icon-btn sm" data-pdel="' + i + '">' + svg("minus") + '</button>' : '') + '</td></tr>';
    });
    html += '</tbody><tfoot><tr><td class="sr-col">' + L("કુલ", "Total") + '</td><td class="num" id="pkTot">' + kgStr(B(sheetKokdiG(sh))) + '</td><td class="num" id="pcTot">' + kgStr(B(sheetColorG(sh))) + '</td><td class="act"></td></tr>' +
      '<tr class="grand"><td class="sr-col">' + L("કોકડી+કલર", "Kokdi+Color") + '</td><td colspan="2" class="num" id="pBoth">' + kgStr(B(sheetKokdiG(sh) + sheetColorG(sh))) + '</td><td></td></tr></tfoot></table></div></div>';

    html += '<div class="card mt"><div class="card-pad" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><div class="free-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + I.check + '</svg>' + L("આપમેળે સેવ — ખાતાવહીમાં દેખાશે", "Auto-saved — appears in the ledger") + '</div><div class="spacer"></div>' +
      '<button class="btn btn-ghost btn-sm" data-delsheet="' + sh.id + '">' + svg("trash") + ' ' + L("શીટ કાઢો", "Delete sheet") + '</button>' +
      '<button class="btn btn-primary" data-go="gate">' + svg("check") + ' ' + L("થઈ ગયું", "Done") + '</button></div></div>';
    return html;
  }
  function sideStat(ic, k, v, d, tint) { return '<div class="stat"><div class="ico ' + tint + '">' + svg(ic) + '</div><div class="k">' + k + '</div><div class="v num">' + v + '</div><div class="d">' + d + '</div></div>'; }

  /* ---------------------------------------------------------------- LEDGER (from sheets) */
  function viewLedger() {
    var w = worker(); var rows = ledgerRows(w.id, STATE.month);
    var t = { roll: 0, mtr: 0, kapadG: 0n, kokdiG: 0n, colorG: 0n };
    rows.forEach(function (r) { t.roll += r.roll; t.mtr += r.mtr; t.kapadG += B(r.kapadG); t.kokdiG += B(r.kokdiG); t.colorG += B(r.colorG); });
    var html = demoStrip();
    html += '<div class="page-head row-between"><div><h2>' + L("જોબવર્ક ખાતાવહી", "Jobwork Ledger") + '</h2>' +
      '<div class="sub">' + w.name + ' · ' + monthName() + ' — ' + L("ગેટ શીટમાંથી આપમેળે", "auto from gate sheets") + '</div></div>' +
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
    var p = niwarParty(); var mid = STATE.month; var mi = niwarMonthIdx(mid);
    var sheets = nMonthSheets(p.id, mid);
    var pname = (STATE.lang === "en" ? p.en : p.name);
    var isAdmin = STATE.role === "admin";
    var html = '<div class="demo-strip">' + svg("info") + '<span>' +
      L('<b>નિવાર જોબવર્ક</b> — ગેટ-સ્ટાઇલ અલગ ખાતાવહી (kg). ગેટ પર <b>સુપરવાઇઝર</b> સાઇઝ પ્રમાણે વજન + પરાત ભરે; <b>એડમિન</b> રેટ, ઘટ, TDS, લોન અને બિલ કરે. બાકી માલ (વજન) આવતા મહિને કેરી ફોરવર્ડ થાય.',
        '<b>Niwar Jobwork</b> — a separate gate-style ledger (kg). At the gate the <b>Supervisor</b> records weights by size + parat; the <b>Admin</b> does rates, ghat, TDS, loan and the bill. The material balance (weight) carries forward.') + '</span></div>';
    html += '<div class="page-head row-between"><div><h2>' + (isAdmin ? L("નિવાર જોબવર્ક", "Niwar Jobwork") : L("નિવાર ગેટ એન્ટ્રી", "Niwar Gate Entry")) + '</h2>' +
      '<div class="sub">' + pname + ' · ' + monthName() + ' — ' + (isAdmin ? L("ખાતાવહી + બિલ", "ledger + bill") : L("ગેટ પર માલ ઇન/આઉટ (kg)", "material in/out at the gate (kg)")) + '</div></div>' +
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' + niwarPartySelect() + '<button class="btn btn-primary" data-newnsheet="1">' + svg("plus") + ' ' + L("નવી નિવાર શીટ", "New niwar sheet") + '</button></div></div>';

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
    var html = '<div class="page-head row-between"><div class="row-left" style="display:flex;align-items:center;gap:10px"><button class="btn btn-ghost btn-sm" data-go="niwar">' + svg("back") + ' ' + L("પાછળ", "Back") + '</button><div><h2>' + L("નિવાર ગેટ એન્ટ્રી", "Niwar Gate Entry") + '</h2><div class="sub">' + pname + ' · ' + dmy(s.date) + '</div></div></div>' +
      '<div style="display:flex;gap:8px"><button class="btn btn-ghost btn-sm" data-delnsheet="' + s.id + '">' + svg("trash") + ' ' + L("કાઢો", "Delete") + '</button><button class="btn btn-gold btn-sm" data-nsheetpdf="' + s.id + '">' + svg("file") + ' PDF</button></div></div>';

    /* header: party / date */
    html += '<div class="card"><div class="card-pad"><div class="form-grid">' +
      '<div class="fg"><label>' + L("પાર્ટી", "Party") + '</label><div class="field"><input value="' + esc(pname) + '" disabled></div></div>' +
      '<div class="fg"><label>' + L("તારીખ", "Date") + '</label><div class="field"><input type="date" data-nh="date" value="' + s.date + '"></div></div>' +
      '</div></div></div>';

    /* product blocks — jobwork-style 3-digit grid, max 5 lines per size */
    html += '<div class="page-head" style="margin-bottom:10px"><div><h3 style="font-size:16px">' + L("પ્રોડક્ટ (નિવાર સાઇઝ)", "Products (niwar sizes)") + '</h3><div class="sub">' + L("સાઇઝ પસંદ કરો, પછી વજન ભરો — 3 આંકડા પછી આપમેળે આગળની લાઇને (વધુમાં વધુ 5 લાઇન).", "Pick a size, then enter weights — 3 digits auto-advance to the next line (max 5 lines).") + '</div></div><button class="btn btn-primary btn-sm" data-np-addprod="1">' + svg("plus") + ' ' + L("પ્રોડક્ટ ઉમેરો", "Add product") + '</button></div>';
    html += '<div class="grid-2">';
    (s.products || []).forEach(function (prod, pi) {
      html += '<div class="card"><div class="card-head"><div class="ico tint-brand">' + svg("roll") + '</div><div><h3 style="font-size:15px">' + L("સાઇઝ", "Size") + '</h3></div><div class="spacer"></div><div class="field" style="width:120px;margin:0"><select data-np-size="' + pi + '">' + sizeOpts(prod.size) + '</select></div><button class="icon-btn" data-np-delprod="' + pi + '" title="' + L("પ્રોડક્ટ કાઢો", "Remove product") + '" style="margin-left:8px">' + svg("trash") + '</button></div><div class="card-pad">';
      html += '<table class="data"><thead><tr><th style="width:30px">#</th><th style="text-align:right">' + L("વજન (kg, 3 આંકડા)", "Weight (kg, 3-digit)") + '</th></tr></thead><tbody>';
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
    html += '<div class="ctrl"><label>' + L("પરાત / મોકલ્યું (kg) — મેન્યુઅલ (યાર્ન સહિત બધું)", "Parat / sent (kg) — manual (everything incl. yarn)") + ' <span class="v" id="npar">' + kgStr(s.paratG || 0n) + ' kg</span></label><div class="field"><input type="number" data-np-parat="1" value="' + (Number(s.paratG || 0n) / 1000) + '" min="0" step="1"><span class="suf">kg</span></div><div class="hint">' + L("કુલ નિવાર − પરાત = આ શીટનું બેલેન્સ (વજન કેરી ફોરવર્ડ).", "Total niwar − parat = this sheet's balance (weight carried forward).") + '</div></div>';
    html += '<div class="weigh" style="margin-top:8px"><div class="wbox"><div class="k">' + L("કુલ નિવાર", "Total niwar") + '</div><div class="v num" id="nsn">' + kgStr(sheetNiwar) + '</div></div><div class="wbox ghati"><div class="k">' + L("પરાત (મોકલ્યું)", "Parat (sent)") + '</div><div class="v num" id="nsp">' + kgStr(s.paratG || 0n) + '</div></div><div class="wbox total"><div class="k">' + L("બેલેન્સ (નિવાર−પરાત)", "Balance (niwar−parat)") + '</div><div class="v num" id="nsnet">' + kgStr(sheetNet) + '</div></div></div>';
    html += '<div class="page-actions" style="margin-top:14px"><button class="btn btn-primary" data-go="niwar">' + svg("check") + ' ' + L("થઈ ગયું", "Done") + '</button></div>';
    html += '</div></div>';

    return html;
  }

  /* ---------------------------------------------------------------- UPAD (advances) */
  function viewUpad() {
    var w = worker(); var mid = STATE.month; var mi = monthIndexOf(mid);
    var rows = upadEntries(w.id, mid);
    var upTot = upadMP(w.id, mid);
    var earnP = billMonth(w.id, mid).EP;
    var s = settleM(w.id, mi);
    var allUpad = WORKERS.reduce(function (a, ww) { return a + upadMP(ww.id, mid); }, 0n);
    var html = demoStrip();
    html += '<div class="page-head row-between"><div><h2>' + L("ઉપડ (એડવાન્સ)", "Upad (Advances)") + '</h2><div class="sub">' + w.name + ' · ' + monthName() + ' — ' + L("અઠવાડિક ઉપડ — બિલમાં આપમેળે કપાય", "weekly advances — auto-deducted in the bill") + '</div></div>' +
      '<button class="btn btn-primary" data-upadnew="1">' + svg("plus") + ' ' + L("ઉપડ એન્ટ્રી", "Add Upad Entry") + '</button></div>';
    html += '<div class="stat-grid">' +
      stat("tint-upad", "wallet", L("આ મહિનાનું ઉપડ", "Upad this month"), moneyP(upTot), "", w.name) +
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
    var w = worker(); var mid = STATE.month; var mi = monthIndexOf(mid);
    var b = billMonth(w.id, mid); var bl = BILL[w.id][mid]; var s = settleM(w.id, mi);
    var loanOpen = loanOpeningBalanceP(w.id, mid), loanClosing = loanOpen - s.deduct;
    var html = demoStrip();
    html += '<div class="page-head"><h2>' + L("બિલિંગ અને PDF", "Billing & PDF") + '</h2>' +
      '<div class="sub">' + w.name + ' · ' + monthName() + ' — ' + L("માલ બેલેન્સ (વજન) કેરી ફોરવર્ડ + આ મહિનાની ચુકવણી", "material (weight) balance carry-forward + this month's payment") + '</div></div>';
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
    var w = worker(); var txns = (LOANS[w.id] || []).slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    var bal = loanBalanceP(w.id), totalOut = WORKERS.reduce(function (a, ww) { return a + loanBalanceP(ww.id); }, 0n);
    var givenP = 0n, repaidP = 0n; (LOANS[w.id] || []).forEach(function (t) { if (t.type === "repay") repaidP += rupToP(t.amt); else givenP += rupToP(t.amt); });
    var html = demoStrip();
    html += '<div class="page-head row-between"><div><h2>' + L("લોન ખાતા", "Loan Accounts") + '</h2><div class="sub">' + w.name + ' — ' + L("લોન આપો / વસૂલો, ટોપ-અપ, માસિક રિપોર્ટ", "give / recover, top-up, monthly report") + '</div></div>' +
      '<button class="btn btn-primary" data-loannew="1">' + svg("plus") + ' ' + L("લોન એન્ટ્રી", "Add Loan Entry") + '</button></div>';
    html += '<div class="stat-grid">' +
      stat("tint-upad", "rupee", L("વર્કરની બાકી લોન", "Worker outstanding"), moneyP(bal), "", w.name) +
      stat("tint-in", "dl", L("કુલ આપ્યું", "Total given"), moneyPw(givenP), "", L("લોન + ટોપ-અપ", "loan + top-up")) +
      stat("tint-ok", "check", L("કુલ વસૂલ", "Total recovered"), moneyPw(repaidP), "", L("રિપેમેન્ટ", "repayments")) +
      stat("tint-brand", "users", L("બધા વર્કર્સ બાકી", "All workers"), moneyPw(totalOut), "", L("કંપની કુલ", "company total")) +
      '</div>';
    html += '<div class="card"><div class="card-head"><div class="ico tint-upad">' + svg("rupee") + '</div><div><h3>' + L("લોન વ્યવહાર", "Loan transactions") + '</h3></div><div class="spacer"></div><button class="btn btn-gold btn-sm" id="loanReport">' + svg("file") + ' ' + L("માસિક રિપોર્ટ PDF", "Monthly Report PDF") + '</button></div>';
    html += '<div class="table-scroll"><table class="data"><thead><tr><th>' + L("તારીખ", "Date") + '</th><th>' + L("પ્રકાર", "Type") + '</th><th>' + L("નોંધ", "Note") + '</th><th style="text-align:right">' + L("રકમ", "Amount") + '</th><th style="text-align:right">' + L("બાકી", "Balance") + '</th></tr></thead><tbody>';
    var run = 0n;
    txns.forEach(function (t) { var a = rupToP(t.amt); run += (t.type === "repay" ? -a : a); var typ = t.type === "loan" ? L("લોન આપી", "Loan given") : t.type === "topup" ? L("ટોપ-અપ", "Top-up") : L("વસૂલ", "Repayment"); html += '<tr><td>' + t.d.split("-").reverse().join("/") + '</td><td><span class="badge ' + (t.type === "repay" ? "badge-ok" : "badge-upad") + '">' + typ + '</span></td><td style="color:var(--ink-soft)">' + esc(t.note) + '</td><td style="text-align:right" class="num ' + (t.type === "repay" ? "loan-repay" : "loan-give") + '">' + (t.type === "repay" ? "− " : "+ ") + moneyP(a) + '</td><td style="text-align:right;font-weight:700" class="num">' + moneyP(run) + '</td></tr>'; });
    if (!txns.length) html += '<tr><td colspan="5" style="text-align:center;color:var(--muted)">' + L("કોઈ લોન નથી.", "No loan activity.") + '</td></tr>';
    html += '</tbody></table></div></div>';
    html += '<div class="hint mt">' + L("💡 લોન બાકી માસિક બિલમાંથી (બિલિંગ સ્ક્રીન) માલિક નક્કી કરે એટલી વસૂલ થાય.", "💡 Loan is recovered from the monthly bill by the amount the owner sets on the Billing screen.") + '</div>';
    return html;
  }

  /* ---------------------------------------------------------------- YEAR-END */
  function viewYearEnd() {
    var w = worker(); var ye = yearEnd(w.id); var g = ye.ghati; var actualPct = (g.actualBP / 100).toFixed(2);
    var html = demoStrip();
    html += '<div class="page-head"><h2>' + L("વર્ષાંત સેટલમેન્ટ (દિવાળી)", "Year-End Settlement (Diwali)") + '</h2><div class="sub">' + w.name + ' — ' + L("લોન + ઘટ + કેરી ફોરવર્ડ એકસાથે.", "loan + ghati + carry-forward, together.") + '</div></div>';
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
    html += '<div class="page-head row-between"><div><h2>' + L("જોબ વર્કર્સ", "Job Workers") + '</h2><div class="sub">' + L("જોબ વર્કરની યાદી અને રેટ.", "Job worker list and rates.") + '</div></div><button class="btn btn-primary" data-lock="' + L("જોબ વર્કર ઉમેરો", "Add Job Worker") + '">' + svg("plus") + ' ' + L("ઉમેરો", "Add") + '</button></div>';
    html += '<div class="card"><div class="table-scroll"><table class="data"><thead><tr><th>' + L("જોબ વર્કર", "Job Worker") + '</th><th>' + L("કાપડ", "Cloth") + '</th><th>' + L("ફોન", "Phone") + '</th><th style="text-align:right">' + L("રેટ", "Rate") + '</th><th style="text-align:right">' + monthName() + ' ' + L("મીટર", "Mtr") + '</th><th style="text-align:right">' + L("લોન બાકી", "Loan") + '</th><th></th></tr></thead><tbody>';
    WORKERS.forEach(function (w) { var ini = w.en.split(" ").map(function (x) { return x[0]; }).slice(0, 2).join(""); var mt = billMonth(w.id, STATE.month).mtr; html += '<tr><td><div style="display:flex;align-items:center;gap:11px"><span class="avatar" style="background:' + w.color + '">' + ini + '</span><div><b>' + (STATE.lang === "en" ? w.en : w.name) + '</b><div style="font-size:12px;color:var(--muted)">' + (STATE.lang === "en" ? w.name : w.en) + '</div></div></div></td><td>' + w.cloth + '</td><td class="num" style="color:var(--ink-soft)">' + w.phone + '</td><td style="text-align:right" class="num">' + rateStr(rupToP(w.rate)) + '</td><td style="text-align:right" class="num">' + numI(mt) + '</td><td style="text-align:right" class="num">' + moneyPw(loanBalanceP(w.id)) + '</td><td style="text-align:right"><button class="btn btn-soft btn-sm" data-openworker="' + w.id + '">' + svg("chevR") + ' ' + L("ખોલો", "Open") + '</button></td></tr>'; });
    html += '</tbody></table></div></div>';
    return html;
  }

  /* ================================================================
     PACKAGING  —  fully independent panel (no dependencies at all).
     The Packaging role fills it; Admin views and downloads. Pure data
     entry + calculation + its own PDF.  50 rows per step.
     Amount = (Total Metre × Rate) + Packing Charge + Tax   (all BigInt).
     ================================================================ */
  var PK_ROWS = 16, PK_STEPS = 12;
  function todayISO() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function blankPacking() {
    var meters = [], kg = [];
    for (var s = 0; s < PK_STEPS; s++) { meters.push(new Array(PK_ROWS).fill(null)); kg.push(null); }
    return { id: rid(), name: "", date: todayISO(), quality: "", city: "", transport: "", nSteps: 1, meters: meters, kg: kg, rate: 0, packing: 0, tax: 0, basis: "mtr" };
  }
  var PACKING = [];
  (function seedPacking() {
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
      html += '<tr><td><b>' + dmy(p.date) + '</b></td><td>' + esc(p.name || "—") + '</td><td>' + esc(p.quality || "—") + '</td><td>' + esc(p.transport || "—") + '</td>' +
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
    var html = '<div class="page-head row-between"><div style="display:flex;align-items:center;gap:12px"><button class="btn btn-ghost btn-sm" data-go="packing">' + svg("back") + ' ' + L("પાછળ", "Back") + '</button><div><h2 style="margin:0">' + L("પેકિંગ લિસ્ટ", "Packing List") + '</h2></div></div>' +
      '<div class="page-actions"><button class="btn btn-gold btn-sm" data-packpdf="1">' + svg("dl") + ' ' + L("PDF ડાઉનલોડ", "Download PDF") + '</button></div></div>';
    if (!canEditPacking()) html += '<div class="demo-strip">' + svg("info") + '<span>' + L("ફક્ત જોવા માટે — ફેરફાર પેકેજિંગ પેનલ કરે. તમે PDF ડાઉનલોડ કરી શકો.", "View only — editing is done by the Packaging panel. You can download the PDF.") + '</span></div>';

    /* header fields */
    html += '<div class="jws-head"><div class="jws-hfields" style="grid-template-columns:repeat(3,1fr)">' +
      '<label class="jws-hf"><span>' + L("નામ", "Name") + '</span><input type="text" data-ph="name" value="' + esc(p.name) + '"' + dis + '></label>' +
      '<label class="jws-hf"><span>' + L("તારીખ", "Date") + '</span><input type="date" data-ph="date" value="' + esc(p.date) + '"' + dis + '></label>' +
      '<label class="jws-hf"><span>' + L("ક્વોલિટી", "Quality") + '</span><input type="text" data-ph="quality" value="' + esc(p.quality) + '"' + dis + '></label>' +
      '<label class="jws-hf"><span>' + L("સિટી", "City") + '</span><input type="text" data-ph="city" value="' + esc(p.city) + '"' + dis + '></label>' +
      '<label class="jws-hf"><span>' + L("ટ્રાન્સપોર્ટ", "Transport") + '</span><input type="text" data-ph="transport" value="' + esc(p.transport) + '"' + dis + '></label>' +
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
    for (var s4 = 0; s4 < p.nSteps; s4++) html += '<td><input class="cell kgcell" inputmode="decimal" data-pkg="' + s4 + '" value="' + (p.kg[s4] == null ? "" : p.kg[s4]) + '"' + dis + '></td>';
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
      '<div class="ctrl"><label>' + L("રેટ (₹", "Rate (₹") + am.rateUnit + ')' + '</label><div class="field"><span class="pre">₹</span><input type="number" data-pf="rate" value="' + p.rate + '" min="0" step="0.05"' + dis + '><span class="suf">' + am.rateUnit + '</span></div></div>' +
      '<div class="ctrl"><label>' + L("પેકિંગ ચાર્જ (₹)", "Packing Charge (₹)") + '</label><div class="field"><span class="pre">₹</span><input type="number" data-pf="packing" value="' + p.packing + '" min="0" step="10"' + dis + '></div></div>' +
      '<div class="ctrl"><label>' + L("ટેક્ષ (₹)", "Tax (₹)") + '</label><div class="field"><span class="pre">₹</span><input type="number" data-pf="tax" value="' + p.tax + '" min="0" step="10"' + dis + '></div></div>' +
      '<div class="bill-line"><span class="lab">' + L("જથ્થો × રેટ", "Qty × Rate") + ' <small id="pGrossSub">' + am.qtyStr + ' × ' + rateStr(rupToP(p.rate || 0)) + am.rateUnit + '</small></span><span class="val num" id="pGross">' + moneyP(am.grossP) + '</span></div>' +
      '<div class="pk-amount"><span class="k">' + L("રકમ · Amount", "Amount") + '</span><span class="v num" id="pAmt">' + moneyP(am.amountP) + '</span></div>' +
      '<div class="hint" id="pAmtHint">' + L("રકમ = કુલ " + (am.basis === "kg" ? "કિલો" : "મીટર") + " × રેટ + પેકિંગ ચાર્જ + ટેક્ષ", "Amount = Total " + (am.basis === "kg" ? "KG" : "Metre") + " × Rate + Packing Charge + Tax") + '</div>' +
      '</div></div></div>';
    html += '</div>';

    if (canEditPacking()) html += '<div class="card mt"><div class="card-pad" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><div class="free-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + I.check + '</svg>' + L("આપમેળે સેવ", "Auto-saved") + '</div><div class="spacer"></div><button class="btn btn-ghost btn-sm" data-delpacking="' + p.id + '">' + svg("trash") + ' ' + L("કાઢો", "Delete") + '</button><button class="btn btn-primary" data-go="packing">' + svg("check") + ' ' + L("થઈ ગયું", "Done") + '</button></div></div>';
    return html;
  }

  /* packing editor live wiring (no full re-render; 2-digit auto-advance on metres) */
  function wirePackingEditor() {
    var p = packingById(STATE.packingId); if (!p || STATE.view !== "packingsheet") return;
    function refreshPk() { setTxt("#pSumRoll", numI(pkRolls(p))); setTxt("#pSumMt", numI(pkMt(p))); setTxt("#pSumKg", kgStr(B(pkKgG(p)))); var am = pkAmount(p); setTxt("#pGross", moneyP(am.grossP)); setTxt("#pGrossSub", am.qtyStr + " × " + rateStr(rupToP(p.rate || 0)) + am.rateUnit); setTxt("#pAmt", moneyP(am.amountP)); }
    document.querySelectorAll("[data-ph]").forEach(function (el) { el.onchange = function () { p[el.getAttribute("data-ph")] = el.value; }; });
    document.querySelectorAll("[data-pbasis]").forEach(function (el) { el.onclick = function () { if (!canEditPacking()) return; p.basis = el.getAttribute("data-pbasis"); render(); }; });
    document.querySelectorAll("[data-pmt]").forEach(function (el) {
      el.oninput = function () {
        var d = el.value.replace(/\D/g, "").slice(0, 2); if (d !== el.value) el.value = d;
        var q = el.getAttribute("data-pmt").split("_"); var s = +q[0], r = +q[1];
        p.meters[s][r] = d === "" ? null : parseInt(d, 10);
        setTxt("#pstot_" + s, numI(pkStepTotal(p, s))); refreshPk();
        if (d.length === 2) { var nx = document.querySelector('[data-pmt="' + s + '_' + (r + 1) + '"]'); if (nx) { nx.focus(); if (nx.select) nx.select(); } }
      };
    });
    document.querySelectorAll("[data-pkg]").forEach(function (el) { el.oninput = function () { p.kg[+el.getAttribute("data-pkg")] = numOrNull(el.value); setTxt("#pSumKg", kgStr(B(pkKgG(p)))); refreshPk(); }; });
    document.querySelectorAll("[data-pf]").forEach(function (el) { el.oninput = function () { var k = el.getAttribute("data-pf"); p[k] = Math.max(0, parseFloat(el.value || 0) || 0); refreshPk(); }; });
    var sp = $("#pStepPlus"); if (sp) sp.onclick = function () { if (p.nSteps < PK_STEPS) { p.nSteps++; render(); } };
    var sm = $("#pStepMinus"); if (sm) sm.onclick = function () { if (p.nSteps > 1) { p.nSteps--; render(); } };
  }
  function newPacking() { var p = blankPacking(); PACKING.unshift(p); STATE.packingId = p.id; STATE.view = "packingsheet"; render(); toast(L("નવું પેકિંગ લિસ્ટ", "New packing list"), "ok"); }
  function openPacking(id) { STATE.packingId = id; STATE.view = "packingsheet"; render(); }
  function delPacking(id) { infoModalConfirm(L("પેકિંગ લિસ્ટ કાઢવું?", "Delete packing list?"), L("આ પેકિંગ લિસ્ટ કાઢી નાખશે.", "This removes the packing list."), function () { PACKING = PACKING.filter(function (p) { return p.id !== id; }); STATE.view = "packing"; render(); toast(L("કાઢ્યું", "Deleted"), "ok"); }); }

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
      var h = '<div class="sheet">' + sheetTop('<span class="copy-chip copy-company">પેકિંગ લિસ્ટ · PACKING LIST</span>', "પેકિંગ લિસ્ટ<br>Packing List" + (totalPages > 1 ? ' <span style="font-size:11px">(' + (pg + 1) + '/' + totalPages + ')</span>' : '')) + party +
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
  function makePackingPDF(id) { var p = packingById(id); toast(L("PDF તૈયાર…", "Generating…"), "info"); renderPages(packingPages(id), "Girijaj_PackingList_" + slug(p.name) + "_" + p.date + ".pdf").then(pdfDone).catch(pdfFail); }

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
      feat(L("બધી રકમ/વજન BigInt — ચોક્કસ", "All money/weight BigInt — exact")) + '</ul></div></div>';
    return html;
  }
  function fnode(n, t, s) { return '<div class="node"><div class="n">' + n + '</div><b>' + t + '</b><span>' + s + '</span></div>'; }
  function feat(t) { return '<li>' + svg("check") + '<span>' + t + '</span></li>'; }

  /* ---------------------------------------------------------------- RENDER */
  function render() {
    if (!viewAllowed(STATE.view)) STATE.view = (STATE.role === "supervisor" ? "gate" : "dashboard");
    var map = { dashboard: viewDashboard, gate: viewGate, gatesheet: viewGateSheet, packing: viewPacking, packingsheet: viewPackingSheet, ledger: viewLedger, niwar: viewNiwar, niwarsheet: viewNiwarSheet, upad: viewUpad, billing: viewBilling, loans: viewLoans, yearend: viewYearEnd, workers: viewWorkers, help: viewHelp };
    $("#view").innerHTML = (map[STATE.view] || viewDashboard)();
    document.querySelectorAll("[data-nav]").forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-nav") === (STATE.view === "gatesheet" ? "gate" : STATE.view)); });
    wire();
    if (window.scrollTo) window.scrollTo(0, 0);
  }
  function go(v) { if (!viewAllowed(v)) return; STATE.view = v; render(); }
  function openSheet(id) { STATE.sheetId = id; STATE.view = "gatesheet"; render(); }
  function newSheet() {
    var m = monthObj(); var date = m.id + "-" + pad(Math.min(28, new Date().getDate()));
    var sh = blankSheet(STATE.worker, date); SHEETS.push(sh); openSheet(sh.id);
    toast(L("નવી શીટ બની", "New sheet created"), "ok");
  }

  function wire() {
    document.querySelectorAll("[data-go]").forEach(function (b) { b.onclick = function () { go(b.getAttribute("data-go")); }; });
    document.querySelectorAll("[data-opensheet]").forEach(function (b) { b.onclick = function () { openSheet(b.getAttribute("data-opensheet")); }; });
    document.querySelectorAll("[data-newsheet]").forEach(function (b) { b.onclick = function () { newSheet(); }; });
    document.querySelectorAll("[data-openworker]").forEach(function (b) { b.onclick = function () { STATE.worker = b.getAttribute("data-openworker"); syncSwitchers(); go("ledger"); }; });
    document.querySelectorAll("[data-lock]").forEach(function (b) { b.onclick = function () { infoModal(b.getAttribute("data-lock"), L("જોબ વર્કર ઉમેરવા/બદલવાનું લાઇવ બિલ્ડમાં સક્ષમ થશે.", "Adding or editing job workers will be enabled in the live build.")); }; });
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
    var lr = $("#loanReport"); if (lr) lr.onclick = makeLoanPDF;
    var ur = $("#upadReport"); if (ur) ur.onclick = makeUpadPDF;
    var yp = $("#yePdf"); if (yp) yp.onclick = makeYearEndPDF;
    var ag = $("#ag"); if (ag) { ag.oninput = function () { setTxt("#agV", (parseFloat(ag.value || 0) || 0).toFixed(2) + "%"); }; ag.onchange = function () { worker().actualGhati = Math.max(0, parseFloat(ag.value || 0)); render(); }; }
    var gr = $("#gr"); if (gr) { gr.oninput = function () { setTxt("#grV", moneyP(rupToP(Math.max(0, parseFloat(gr.value || 0))))); }; gr.onchange = function () { GHATI_RATE.v = Math.max(0, parseFloat(gr.value || 0)); render(); }; }
    var pc = $("#pdfCompany"); if (pc) pc.onclick = function () { makeBillPDF("company"); };
    var pw = $("#pdfWorker"); if (pw) pw.onclick = function () { makeBillPDF("worker"); };
    var pb = $("#pdfBoth"); if (pb) pb.onclick = function () { makeBillPDF("company", true); };
  }
  function setTxt(id, t) { var el = $(id); if (el) el.textContent = t; }

  /* --- sheet editor live wiring (no full re-render) --- */
  function wireSheetEditor() {
    var sh = sheetById(STATE.sheetId); if (!sh || STATE.view !== "gatesheet") return;
    document.querySelectorAll("[data-sh]").forEach(function (el) { el.onchange = function () { var k = el.getAttribute("data-sh"); sh[k] = el.value; if (k === "workerId") render(); }; });
    document.querySelectorAll("[data-mt]").forEach(function (el) {
      el.oninput = function () {
        var d = el.value.replace(/\D/g, "").slice(0, 2);     /* digits only, max 2 */
        if (d !== el.value) el.value = d;
        var p = el.getAttribute("data-mt").split("_"); var s = +p[0], r = +p[1];
        sh.meters[s][r] = d === "" ? null : parseInt(d, 10);
        setTxt("#stot_" + s, numI(stepTotalMt(sh, s)));
        setTxt("#sumRoll", numI(sheetRolls(sh)));
        setTxt("#sumMt", numI(sheetMt(sh)));
        if (d.length === 2) {                                 /* 2 digits → jump to next row, same step */
          var next = document.querySelector('[data-mt="' + s + '_' + (r + 1) + '"]');
          if (next) { next.focus(); if (next.select) next.select(); }
        }
      };
    });
    document.querySelectorAll("[data-kg]").forEach(function (el) { el.oninput = function () { sh.kg[+el.getAttribute("data-kg")] = numOrNull(el.value); setTxt("#sumKg", kgStr(B(sheetKgG(sh)))); }; });
    document.querySelectorAll("[data-pk]").forEach(function (el) { el.oninput = function () { sh.parat[+el.getAttribute("data-pk")].kokdi = numOrNull(el.value); refreshParat(sh); }; });
    document.querySelectorAll("[data-pc]").forEach(function (el) { el.oninput = function () { sh.parat[+el.getAttribute("data-pc")].color = numOrNull(el.value); refreshParat(sh); }; });
    document.querySelectorAll("[data-pdel]").forEach(function (el) { el.onclick = function () { sh.parat.splice(+el.getAttribute("data-pdel"), 1); render(); }; });
    var pa = $("#paratAdd"); if (pa) pa.onclick = function () { sh.parat.push({ kokdi: null, color: null }); render(); };
    var sp = $("#stepPlus"); if (sp) sp.onclick = function () { if (sh.nSteps < MAX_STEPS) { sh.nSteps++; render(); } };
    var sm = $("#stepMinus"); if (sm) sm.onclick = function () { if (sh.nSteps > 1) { sh.nSteps--; render(); } };
  }
  function refreshParat(sh) { setTxt("#pkTot", kgStr(B(sheetKokdiG(sh)))); setTxt("#pcTot", kgStr(B(sheetColorG(sh)))); setTxt("#pBoth", kgStr(B(sheetKokdiG(sh) + sheetColorG(sh)))); }
  function delSheet(id) {
    infoModalConfirm(L("શીટ કાઢવી?", "Delete sheet?"), L("આ શીટ અને તેની ખાતાવહી એન્ટ્રી કાઢી નાખશે.", "This removes the sheet and its ledger entry."), function () { SHEETS = SHEETS.filter(function (s) { return s.id !== id; }); STATE.view = "gate"; render(); toast(L("શીટ કાઢી", "Sheet deleted"), "ok"); });
  }

  /* --- billing live wiring --- */
  function wireBilling() {
    if (STATE.view !== "billing") return;
    var w = worker(), mid = STATE.month, bl = BILL[w.id][mid];
    function pf(v) { v = parseFloat(v); return isNaN(v) ? 0 : Math.max(0, v); }
    var rate = $("#rate"); if (rate) { rate.oninput = function () { setTxt("#rateV", rateStr(rupToP(pf(rate.value)))); }; rate.onchange = function () { bl.rate = pf(rate.value); render(); }; }
    var tempo = $("#tempo"); if (tempo) { tempo.oninput = function () { setTxt("#tempoV", moneyP(rupToP(pf(tempo.value)))); }; tempo.onchange = function () { bl.tempo = pf(tempo.value); render(); }; }
    var deduct = $("#deduct"); if (deduct) { deduct.oninput = function () { setTxt("#deductV", moneyP(rupToP(pf(deduct.value)))); }; deduct.onchange = function () { bl.loanDeductP = rupToP(pf(deduct.value)); bl.paidP = null; render(); }; }
    var paid = $("#paid"); if (paid) { paid.oninput = function () { setTxt("#paidV", moneyP(rupToP(pf(paid.value)))); }; paid.onchange = function () { bl.paidP = rupToP(pf(paid.value)); render(); }; }
  }

  /* ---------------------------------------------------------------- LOAN modal */
  function openLoan() {
    var w = worker();
    var body = '<div class="form-grid"><div class="fg fg-full"><label>' + L("પ્રકાર", "Type") + '</label><div class="field"><select data-l="type"><option value="loan">' + L("લોન આપી (+)", "Loan given (+)") + '</option><option value="topup">' + L("ટોપ-અપ (+)", "Top-up (+)") + '</option><option value="repay">' + L("વસૂલ (−)", "Repayment (−)") + '</option></select></div></div>' +
      '<div class="fg" data-fg="lamt"><label>' + L("રકમ (₹)", "Amount (₹)") + '</label><div class="field"><span class="pre">₹</span><input type="number" data-l="amt" min="1" value="10000"></div><div class="msg">' + L("માન્ય રકમ", "Enter amount") + '</div></div>' +
      '<div class="fg"><label>' + L("તારીખ (દિવસ)", "Date (day)") + '</label><div class="field"><input type="number" data-l="day" min="1" max="31" value="18"></div></div>' +
      '<div class="fg fg-full"><label>' + L("નોંધ", "Note") + '</label><div class="field"><input data-l="note" value=""></div></div></div><div class="hint">' + w.name + ' · ' + monthName() + '</div>';
    showModal("rupee", L("લોન એન્ટ્રી", "Loan entry"), w.name, body, saveLoan);
  }
  function saveLoan() {
    function val(k) { var el = document.querySelector('[data-l="' + k + '"]'); return el ? el.value : ""; }
    var amt = parseFloat(val("amt")), day = parseInt(val("day"), 10);
    var ok = !(isNaN(amt) || amt < 1 || isNaN(day) || day < 1 || day > 31);
    var fg = document.querySelector('[data-fg="lamt"]'); if (fg) fg.classList.toggle("err", !ok); if (!ok) return;
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
      '<div class="fg" data-fg="uamt"><label>' + L("રકમ (₹)", "Amount (₹)") + '</label><div class="field"><span class="pre">₹</span><input type="number" data-u="amt" min="1" step="100" value="' + (ex ? ex.amt : 2000) + '"></div><div class="msg">' + L("માન્ય રકમ દાખલ કરો", "Enter a valid amount") + '</div></div>' +
      '<div class="fg" data-fg="uday"><label>' + L("તારીખ (દિવસ)", "Date (day)") + '</label><div class="field"><input type="number" data-u="day" min="1" max="' + lastDay + '" value="' + defDay + '"></div><div class="msg">1–' + lastDay + '</div></div>' +
      '<div class="fg fg-full"><label>' + L("નોંધ", "Note") + '</label><div class="field"><input data-u="note" value="' + (ex ? esc(ex.note) : L("અઠવાડિક ઉપડ", "Weekly advance")) + '"></div></div></div>' +
      '<div class="hint">' + w.name + ' · ' + monthName() + ' — ' + L("ઉપડ ફક્ત આ મહિનામાં નોંધાય.", "upad is recorded within this month only.") + '</div>';
    showModal("wallet", editId ? L("ઉપડ ફેરફાર", "Edit upad") : L("ઉપડ એન્ટ્રી", "Upad entry"), w.name + " · " + monthName(), body, saveUpad);
  }
  function saveUpad() {
    var w = worker(); var m = monthObj(); var lastDay = new Date(2026, m.mm, 0).getDate();
    function val(k) { var el = document.querySelector('[data-u="' + k + '"]'); return el ? el.value : ""; }
    var amt = parseFloat(val("amt")), day = parseInt(val("day"), 10);
    var okA = !(isNaN(amt) || amt < 1), okD = !(isNaN(day) || day < 1 || day > lastDay);
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
    var p = niwarParty(), mid = STATE.month;
    var sh = blankNSheet(p.id, mid + "-" + pad(Math.min(28, new Date().getDate())));
    NSHEETS.push(sh); STATE.niwarSheetId = sh.id; STATE.view = "niwarsheet"; render(); toast(L("નિવાર શીટ બની", "Niwar sheet created"), "ok");
  }
  function openNSheet(id) { STATE.niwarSheetId = id; STATE.view = "niwarsheet"; render(); }
  function delNSheet(id) {
    infoModalConfirm(L("નિવાર શીટ કાઢવી?", "Delete niwar sheet?"), L("આ ડિલિવરી શીટ કાઢી નાખશે; ખાતાવહી/બિલ ફરી ગણાશે.", "This removes the delivery sheet; the ledger/bill recomputes."), function () {
      NSHEETS = NSHEETS.filter(function (s) { return s.id !== id; }); STATE.view = "niwar"; render(); toast(L("કાઢ્યું", "Deleted"), "ok");
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
    document.querySelectorAll("[data-nh]").forEach(function (el) { el.onchange = function () { s[el.getAttribute("data-nh")] = el.value; nRecalc(); render(); }; });
    document.querySelectorAll("[data-np-size]").forEach(function (el) { el.onchange = function () { var pi = +el.getAttribute("data-np-size"); if (s.products[pi]) { s.products[pi].size = el.value; nRecalc(); render(); } }; });
    /* 3-digit weight cells: strip to digits, cap 3, store whole kg, auto-advance to next line on the 3rd digit */
    var cells = document.querySelectorAll("[data-np-cell]");
    cells.forEach(function (el) {
      el.oninput = function () {
        var a = el.getAttribute("data-np-cell").split("-"), pi = +a[0], ri = +a[1];
        var d = (el.value || "").replace(/\D/g, "").slice(0, 3); el.value = d;
        if (s.products[pi]) { if (d === "") s.products[pi].lots[ri] = null; else s.products[pi].lots[ri] = kgToG(parseInt(d, 10)); }
        nRecalc(); nRefreshSheetTotals();
        if (d.length === 3 && ri < NL_ROWS - 1) { var nx = document.querySelector('[data-np-cell="' + pi + '-' + (ri + 1) + '"]'); if (nx) { nx.focus(); nx.select && nx.select(); } }
      };
    });
    document.querySelectorAll("[data-np-delprod]").forEach(function (el) { el.onclick = function () { delNProduct(+el.getAttribute("data-np-delprod")); }; });
    document.querySelectorAll("[data-np-addprod]").forEach(function (el) { el.onclick = function () { addNProduct(); }; });
    var par = document.querySelector("[data-np-parat]"); if (par) { par.oninput = function () { s.paratG = kgToG(pf(par.value)); nRecalc(); setTxt("#npar", kgStr(s.paratG) + " kg"); nRefreshSheetTotals(); }; par.onchange = function () { s.paratG = kgToG(pf(par.value)); render(); }; }
    document.querySelectorAll("[data-nsheetpdf]").forEach(function (el) { el.onclick = function () { makeNiwarSheetPDF(el.getAttribute("data-nsheetpdf")); }; });
  }
  function wireNiwar() {
    if (STATE.view !== "niwar") return;
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
    var okA = !(isNaN(amt) || amt < 1), okD = !(isNaN(day) || day < 1 || day > lastDay);
    var fa = document.querySelector('[data-fg="nuamt"]'); if (fa) fa.classList.toggle("err", !okA);
    var fd = document.querySelector('[data-fg="nuday"]'); if (fd) fd.classList.toggle("err", !okD);
    if (!okA || !okD) return;
    var d = "2026-" + pad(m.mm) + "-" + pad(day), note = val("note") || L("અઠવાડિક ઉપડ", "Weekly advance");
    NUPAD[p.id] = NUPAD[p.id] || [];
    if (nUpadEditId) { var ex = NUPAD[p.id].filter(function (t) { return t.id === nUpadEditId; })[0]; if (ex) { ex.d = d; ex.amt = Math.round(amt); ex.note = note; } }
    else NUPAD[p.id].push({ id: rid(), d: d, amt: Math.round(amt), note: note });
    var s = curNiwarSheet(); if (s) s.paidP = null;
    nUpadEditId = null; closeModal(); render(); toast(L("ઉપડ સેવ થયું", "Upad saved"), "ok");
  }
  function delNUpad(id) {
    var p = niwarParty();
    infoModalConfirm(L("ઉપડ કાઢવું?", "Delete upad?"), L("આ ઉપડ એન્ટ્રી કાઢી નાખશે; બિલ ફરી ગણાશે.", "This removes the upad entry; the bill recomputes."), function () {
      NUPAD[p.id] = (NUPAD[p.id] || []).filter(function (t) { return t.id !== id; });
      var s = curNiwarSheet(); if (s) s.paidP = null; render(); toast(L("કાઢ્યું", "Deleted"), "ok");
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
    var ws = $("#workerSelect"); ws.innerHTML = WORKERS.map(function (w) { return '<option value="' + w.id + '">' + w.name + '</option>'; }).join(""); ws.value = STATE.worker; ws.onchange = function () { STATE.worker = ws.value; render(); };
    refreshMonthOptions(); $("#monthSelect").onchange = function () { STATE.month = $("#monthSelect").value; render(); };
    $("#monthPrev").onclick = function () { stepMonth(-1); }; $("#monthNext").onclick = function () { stepMonth(1); };
  }
  function refreshMonthOptions() { var ms = $("#monthSelect"); ms.innerHTML = MONTHS.map(function (m) { return '<option value="' + m.id + '">' + L(m.g, m.e) + '</option>'; }).join(""); ms.value = STATE.month; }
  function stepMonth(dir) { var idx = MONTHS.map(function (m) { return m.id; }).indexOf(STATE.month); idx = Math.min(MONTHS.length - 1, Math.max(0, idx + dir)); STATE.month = MONTHS[idx].id; syncSwitchers(); render(); }
  function syncSwitchers() { $("#workerSelect").value = STATE.worker; $("#monthSelect").value = STATE.month; }
  function setLang(lang) { STATE.lang = lang; try { document.documentElement.lang = lang === "en" ? "en" : "gu"; } catch (e) {} $("#langGu").classList.toggle("on", lang === "gu"); $("#langEn").classList.toggle("on", lang === "en"); buildShell(); refreshMonthOptions(); render(); }
  function setRole(role) { STATE.role = role; if (!viewAllowed(STATE.view)) STATE.view = "dashboard"; buildShell(); render(); }
  function login(role) { STATE.role = (role === "supervisor" ? "supervisor" : "admin"); STATE.view = "dashboard"; buildShell(); startApp(); }

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
  function toast(msg, kind) { var tw = $("#toastWrap"); var t = document.createElement("div"); t.className = "toast " + (kind || ""); t.innerHTML = svg(kind === "info" ? "info" : "check") + "<span>" + msg + "</span>"; tw.appendChild(t); setTimeout(function () { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(function () { t.remove(); }, 320); }, 3000); }

  /* ---------------------------------------------------------------- PDF */
  function sheetTop(chip, sub) { return '<div class="sh-top"><div class="co"><b>' + CO.nameGuj + '</b><div class="tag">' + CO.name + ' · ' + CO.tag + '</div><div class="meta">' + CO.place + ' &nbsp;|&nbsp; GSTIN: ' + CO.gstin + ' &nbsp;|&nbsp; ' + CO.phone + '</div></div><div class="copybox">' + chip + '<div class="sh-sub">' + sub + '</div></div></div>'; }
  function sheetFoot() { return '<div class="sh-foot"><span>તૈયાર · Generated ' + new Date().toLocaleDateString("en-IN") + '</span><span>Powered by ' + VENDOR + '</span></div>'; }
  function chipOf(copy) { return copy === "worker" ? '<span class="copy-chip copy-worker">જોબ વર્કર કોપી · WORKER COPY</span>' : '<span class="copy-chip copy-company">કંપની કોપી · COMPANY COPY</span>'; }

  /* job work sheet PDF — paginated so rows never get cut across pages */
  var PDF_ROWS_PER_PAGE = 32;
  function jobSheetPages(id, copy) {
    var sh = sheetById(id); var w = workerById(sh.workerId);
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
      var h = '<div class="sheet">' + sheetTop(chipOf(copy), "જોબ વર્ક શીટ<br>Job Work Sheet" + (totalPages > 1 ? ' <span style="font-size:11px">(' + (pg + 1) + '/' + totalPages + ')</span>' : '')) + party +
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
      '<div class="sh-party"><div class="pb"><div class="k">જોબ વર્કર · Job Worker</div><div class="vv">' + w.name + '</div></div><div class="pb"><div class="k">મહિનો · Month</div><div class="vv">' + m.g + '</div></div><div class="pb"><div class="k">રેટ · Rate</div><div class="vv">' + rateStr(b.ratePaise) + '/mtr</div></div></div>' +
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
      '<div class="sh-party"><div class="pb"><div class="k">જોબ વર્કર · Job Worker</div><div class="vv">' + w.name + '</div></div><div class="pb"><div class="k">રિપોર્ટ · Report</div><div class="vv">' + m.g + ' (upto)</div></div></div>' +
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
      '<div class="sh-party"><div class="pb"><div class="k">જોબ વર્કર · Job Worker</div><div class="vv">' + w.name + '</div></div><div class="pb"><div class="k">મહિનો · Month</div><div class="vv">' + m.g + '</div></div></div>' +
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
      '<div class="sh-party"><div class="pb"><div class="k">જોબ વર્કર · Job Worker</div><div class="vv">' + w.name + '</div></div><div class="pb"><div class="k">વર્ષ · Year</div><div class="vv">upto Diwali 2026</div></div></div>' +
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
  /* niwar single DELIVERY sheet PDF (gate-entry copy) */
  function niwarSheetHTML(id, copy) {
    var s = nSheetById(id); if (!s) return '<div class="sheet">' + sheetTop(chipOf(copy), "નિવાર શીટ<br>Niwar Sheet") + '<p class="l">No sheet.</p>' + sheetFoot() + '</div>';
    var p = nwById(s.partyId);
    var prodTables = (s.products || []).map(function (prod) {
      var lots = (prod.lots || []).filter(function (x) { return x != null; }).map(function (g, i) { return '<tr><td class="l">' + (i + 1) + '</td><td>' + kgStr(g || 0n) + '</td></tr>'; }).join("");
      return '<div style="flex:1;min-width:150px"><h4 class="sh-h">' + prod.size + '" · નિવાર</h4><table class="pt"><thead><tr><th class="l">#</th><th>kg</th></tr></thead><tbody>' + (lots || '<tr><td colspan="2" class="l">—</td></tr>') + '</tbody><tfoot><tr class="tot"><td class="l">કુલ</td><td>' + kgStr(nProductG(prod)) + '</td></tr></tfoot></table></div>';
    }).join("");
    var sheetNiwar = nSheetNiwarG(s);
    return '<div class="sheet">' + sheetTop(chipOf(copy), "નિવાર ગેટ એન્ટ્રી<br>Niwar Gate Entry") +
      '<div class="sh-party"><div class="pb"><div class="k">પાર્ટી · Party</div><div class="vv">' + (STATE.lang === "en" ? p.en : p.name) + '</div></div><div class="pb"><div class="k">તારીખ · Date</div><div class="vv">' + dmy(s.date) + '</div></div></div>' +
      '<h4 class="sh-h">પ્રોડક્ટ (સાઇઝ × વજન) · Products</h4><div style="display:flex;gap:14px;flex-wrap:wrap">' + (prodTables || '—') + '</div>' +
      '<div style="margin-top:16px"><h4 class="sh-h">પરાત + કુલ · Parat + Totals</h4><div class="mini"><div class="ml"><span>કુલ નિવાર · Total niwar</span><b>' + kgStr(sheetNiwar) + ' kg</b></div><div class="ml"><span>પરાત (મોકલ્યું) · Parat (sent)</span><b>' + kgStr(s.paratG || 0n) + ' kg</b></div><div class="ml"><span><b>બેલેન્સ (નિવાર−પરાત) · Balance</b></span><b>' + kgStr(sheetNiwar - (s.paratG || 0n)) + ' kg</b></div></div></div>' +
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
      "—\n" + w.name + "\n" + L("તારીખ", "Date") + ": " + dmy(sh.date) + "   " + L("ક્વોલિટી", "Quality") + ": " + (sh.quality || "-") + "\n" +
      L("રોલ", "Roll") + ": " + numI(sheetRolls(sh)) + "   " + L("કુલ મીટર", "Total Metre") + ": " + numI(sheetMt(sh)) + "   KG: " + kgStr(B(sheetKgG(sh))) + "\n" +
      L("પરત", "Parat") + " — " + L("કોકડી", "Kokdi") + ": " + kgStr(B(sheetKokdiG(sh))) + " kg, " + L("કલર", "Color") + ": " + kgStr(B(sheetColorG(sh))) + " kg\n—\n" + "Powered by " + VENDOR;
  }
  function billWaText() {
    var w = worker(), mid = STATE.month, mi = monthIndexOf(mid), b = billMonth(w.id, mid), s = settleM(w.id, mi), mat = matBalance(w.id, mi), m = monthObj();
    return "*" + CO.name + "*\n" + L("માસિક બિલ", "Monthly Bill") + "\n—\n" + w.name + "\n" + L("મહિનો", "Month") + ": " + m.e + "\n" +
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
  function renderPages(pages, filename) {
    if (!window.html2canvas || !window.jspdf) return Promise.reject(new Error("libs"));
    var jsPDF = window.jspdf.jsPDF; var pdf = new jsPDF("p", "mm", "a4");
    var pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    var MARGIN = 6; var stage = $("#printStage");
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : Promise.resolve();
    function one(i) {
      stage.innerHTML = pages[i]; var node = stage.firstChild;
      return new Promise(function (r) { setTimeout(r, i === 0 ? 70 : 20); }).then(function () {
        return window.html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false, windowWidth: 820 });
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
  function makeSheetPDF(id, copy) { var sh = sheetById(id); var w = workerById(sh.workerId); toast(L("PDF તૈયાર…", "Generating…"), "info"); renderPages(jobSheetPages(id, copy), "Girijaj_JobWorkSheet_" + slug(w.en) + "_" + sh.date + "_" + (copy === "worker" ? "Worker" : "Company") + ".pdf").then(pdfDone).catch(pdfFail); }
  function makeBillPDF(copy, both) { var w = worker(), m = monthObj(); toast(L("PDF તૈયાર…", "Generating…"), "info"); renderPages([billHTML(copy)], "Girijaj_Bill_" + slug(w.en) + "_" + m.e.replace(" ", "") + "_" + (copy === "worker" ? "Worker" : "Company") + ".pdf").then(function () { if (both) return renderPages([billHTML("worker")], "Girijaj_Bill_" + slug(w.en) + "_Worker.pdf").then(function () { toast(L("બંને ડાઉનલોડ", "Both downloaded"), "ok"); }); pdfDone(); }).catch(pdfFail); }
  function makeLoanPDF() { var w = worker(); toast(L("રિપોર્ટ તૈયાર…", "Generating…"), "info"); renderPages([loanHTML()], "Girijaj_Loan_" + slug(w.en) + ".pdf").then(pdfDone).catch(pdfFail); }
  function makeUpadPDF() { var w = worker(), m = monthObj(); toast(L("રિપોર્ટ તૈયાર…", "Generating…"), "info"); renderPages([upadHTML()], "Girijaj_Upad_" + slug(w.en) + "_" + m.e.replace(" ", "") + ".pdf").then(pdfDone).catch(pdfFail); }
  function makeNiwarPDF(copy) { var p = niwarParty(), m = monthObj(); toast(L("PDF તૈયાર…", "Generating…"), "info"); renderPages([niwarBillHTML(copy)], "Girijaj_Niwar_" + slug(p.en) + "_" + m.e.replace(" ", "") + "_" + (copy === "worker" ? "Party" : "Company") + ".pdf").then(pdfDone).catch(pdfFail); }
  function makeNiwarSheetPDF(id) { var s = nSheetById(id); if (!s) return; var p = nwById(s.partyId); toast(L("PDF તૈયાર…", "Generating…"), "info"); renderPages([niwarSheetHTML(id, "company")], "Girijaj_NiwarSheet_" + slug(p.en) + "_" + s.date + ".pdf").then(pdfDone).catch(pdfFail); }
  function makeYearEndPDF() { var w = worker(); toast(L("સેટલમેન્ટ તૈયાર…", "Generating…"), "info"); renderPages([yearEndHTML()], "Girijaj_YearEnd_" + slug(w.en) + ".pdf").then(pdfDone).catch(pdfFail); }

  /* ---------------------------------------------------------------- SHELL / HERO / BOOT */
  function buildShell() {
    var nav = navForRole();
    $("#sidebar").innerHTML = nav.map(function (n) { return '<a class="nav-item" data-nav="' + n.id + '" href="#' + n.id + '">' + svg(n.ic) + '<span>' + L(n.g, n.e) + '</span></a>'; }).join("") + '<div class="nav-foot">' + CO.nameGuj + '<br><b>Jobwork System</b></div>';
    $("#botnav").innerHTML = nav.slice(0, 5).map(function (n) { return '<a data-nav="' + n.id + '" href="#' + n.id + '">' + svg(n.ic) + '<span>' + L(n.g, n.e) + '</span></a>'; }).join("");
    document.querySelectorAll("[data-nav]").forEach(function (a) { a.onclick = function (e) { e.preventDefault(); go(a.getAttribute("data-nav")); }; });
  }
  var vortex = null;
  function startApp() { $("#hero").classList.add("hide"); $("#app").classList.add("show"); if (vortex) { setTimeout(function () { try { vortex.dispose(); } catch (e) {} vortex = null; }, 900); } render(); }
  function initHero() { if (typeof window.initVortex !== "function") return; try { var small = Math.min(window.innerWidth, window.innerHeight) < 760; vortex = window.initVortex($("#hero-canvas"), $("#hero-canvas-wrap"), small ? { lineOptions: { count: 120, color: "#ffd79a", glow: 9 }, dotOptions: { count: 2600, color: "#fff2d6", glow: 10 }, cometOptions: { count: 6 } } : {}); } catch (e) { console.warn("hero", e); } }
  function boot() {
    buildShell(); buildSwitchers(); initHero();
    $("#langGu") && ($("#langGu").onclick = function () { setLang("gu"); });
    $("#langEn") && ($("#langEn").onclick = function () { setLang("en"); });
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
    window.addEventListener("hashchange", function () { var h = location.hash.replace("#", ""); if (h && NAV.some(function (n) { return n.id === h; })) { if (!$("#app").classList.contains("show")) startApp(); go(h); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  // Production entry point used by auth.js once a user is authenticated and their role resolved.
  window.GJ = window.GJ || {};
  window.GJ.enter = function (role) {
    STATE.role = (role === "supervisor" ? "supervisor" : "admin"); STATE.view = "dashboard";
    try { var l = localStorage.getItem("gj_lang"); if (l === "en" || l === "gu") STATE.lang = l; } catch (e) {}
    try {
      var g = document.getElementById("langGu"), e2 = document.getElementById("langEn");
      if (g && e2) { g.classList.toggle("on", STATE.lang !== "en"); e2.classList.toggle("on", STATE.lang === "en"); }
      document.documentElement.lang = STATE.lang === "en" ? "en" : "gu";
    } catch (e) {}
    buildShell(); startApp();
  };
  window.GJ.setRole = setRole;
  window.GJ.render = render;
  window.GJ.logout = function () { try { location.reload(); } catch (e) {} };

  if (typeof window !== "undefined" && window.__TEST) {
    window.__TEST_API = { STATE: STATE, render: render, go: go, openSheet: openSheet, newSheet: newSheet, setLang: setLang, setRole: setRole, saveLoan: saveLoan,
      viewDashboard: viewDashboard, viewGate: viewGate, viewGateSheet: viewGateSheet, viewLedger: viewLedger, viewUpad: viewUpad, viewBilling: viewBilling, viewLoans: viewLoans, viewYearEnd: viewYearEnd, viewWorkers: viewWorkers, viewHelp: viewHelp, viewNiwar: viewNiwar,
      jobSheetPages: jobSheetPages, billHTML: billHTML, loanHTML: loanHTML, upadHTML: upadHTML, yearEndHTML: yearEndHTML, niwarBillHTML: niwarBillHTML,
      sheetMt: sheetMt, sheetRolls: sheetRolls, sheetKgG: sheetKgG, ledgerRows: ledgerRows, billMonth: billMonth, settleM: settleM, matBalance: matBalance, ghatiRecon: ghatiRecon, yearEnd: yearEnd, loanBalanceP: loanBalanceP, upadMP: upadMP, upadEntries: upadEntries, UPAD: UPAD, moneyP: moneyP, kgStr: kgStr,
      NWORKERS: NWORKERS, NSHEETS: NSHEETS, NUPAD: NUPAD, NLOANS: NLOANS, NPARAM: NPARAM, NIWAR_SIZES: NIWAR_SIZES, NL_ROWS: NL_ROWS, niwarSettle: niwarSettle, nMonthSheets: nMonthSheets, nSizeTotalsG: nSizeTotalsG, nRecvG: nRecvG, nParatG: nParatG, nSheetNiwarG: nSheetNiwarG, nProductG: nProductG, nParam: nParam, nSheetById: nSheetById, viewNiwarSheet: viewNiwarSheet, niwarSheetHTML: niwarSheetHTML, nUpadMP: nUpadMP, nLoanBalanceP: nLoanBalanceP, kgToG: kgToG,
      viewPacking: viewPacking, viewPackingSheet: viewPackingSheet, packingPages: packingPages, newPacking: newPacking, openPacking: openPacking,
      pkMt: pkMt, pkRolls: pkRolls, pkKgG: pkKgG, pkStepTotal: pkStepTotal, pkAmount: pkAmount, PACKING: PACKING, PK_ROWS: PK_ROWS, PK_STEPS: PK_STEPS,
      SHEETS: SHEETS, WORKERS: WORKERS, MONTHS: MONTHS, LOANS: LOANS, BILL: BILL, navForRole: navForRole, blankSheet: blankSheet, blankPacking: blankPacking };
  }
})();
