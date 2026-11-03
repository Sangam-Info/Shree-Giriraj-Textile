/* =====================================================================
   db.js — Firestore data layer (scaffold) for the Jobwork System
   ---------------------------------------------------------------------
   Replaces the prototype's in-memory stores with Firestore collections.
   Exposes window.GJDB. Active only in LIVE mode (real Firebase config).

   MIGRATION PLAN (phased — see docs/DATA-MODEL.md):
     Phase 1 (done): auth + this scaffold + rules.
     Phase 2: wire WORKERS, SHEETS, PACKING to Firestore (read on login,
              write on save) — the gate sheet is the single source of truth.
     Phase 3: BILL controls, LOANS, UPAD, niwar stores, year-end.
     Phase 4: realtime listeners + offline persistence + cross-device sync.

   All money stays in paise and weight in grams (BigInt) in app logic;
   Firestore stores them as plain numbers/strings and the app converts.
   ===================================================================== */
(function () {
  "use strict";

  var COL = {
    users:        "users",          // users/{uid}            {name, role, active}
    meta:         "meta",           // meta/settings          {company, months, vendor}
    workers:      "workers",        // workers/{workerId}     {name, en, phone, cloth, rate}
    sheets:       "sheets",         // sheets/{sheetId}       gate job work sheet (source of truth)
    bills:        "bills",          // bills/{workerId_month} {rateP, transportP, loanP, paidP}
    loans:        "loans",          // loans/{workerId}/entries/{id}
    upad:         "upad",           // upad/{workerId}/entries/{id}
    packing:      "packing",        // packing/{id}           independent packing lists
    niwarParties: "niwarParties",   // niwarParties/{partyId}
    niwarSheets:  "niwarSheets",    // niwarSheets/{id}
    niwarParams:  "niwarParams",    // niwarParams/{partyId_month} rates/ghat/tds
    niwarUpad:    "niwarUpad",       // niwarUpad/{partyId}/entries/{id}
    niwarLoans:   "niwarLoans"      // niwarLoans/{partyId}/entries/{id}
  };

  if (!(window.GJAuth && window.GJAuth.enabled && window.GJAuth.db)) {
    window.GJDB = { enabled: false, COL: COL };
    return;
  }

  var db = window.GJAuth.db;

  function colRef(name) { return db.collection(name); }

  // --- generic helpers -------------------------------------------------
  function all(name) {
    return colRef(name).get().then(function (qs) {
      var out = []; qs.forEach(function (d) { out.push(Object.assign({ id: d.id }, d.data())); }); return out;
    });
  }
  function get(name, id) {
    return colRef(name).doc(id).get().then(function (d) { return d.exists ? Object.assign({ id: d.id }, d.data()) : null; });
  }
  function set(name, id, data) { return colRef(name).doc(id).set(data, { merge: true }); }
  function add(name, data) { return colRef(name).add(data).then(function (r) { return r.id; }); }
  function del(name, id) { return colRef(name).doc(id).delete(); }
  function sub(name, id, subname) { return colRef(name).doc(id).collection(subname); }

  // --- typed accessors (phase 2+ wire these into app.js) ---------------
  var api = {
    enabled: true,
    COL: COL,
    raw: db,

    loadWorkers: function () { return all(COL.workers); },
    saveWorker:  function (w) { return w.id ? set(COL.workers, w.id, w) : add(COL.workers, w); },

    loadSheets:  function () { return all(COL.sheets); },
    saveSheet:   function (s) { return s.id ? set(COL.sheets, s.id, s) : add(COL.sheets, s); },
    deleteSheet: function (id) { return del(COL.sheets, id); },

    loadPacking: function () { return all(COL.packing); },
    savePacking: function (p) { return p.id ? set(COL.packing, p.id, p) : add(COL.packing, p); },
    deletePacking: function (id) { return del(COL.packing, id); },

    loadBills:   function () { return all(COL.bills); },
    saveBill:    function (id, data) { return set(COL.bills, id, data); },

    loanEntries: function (workerId) { return sub(COL.loans, workerId, "entries").get().then(function (qs) { var o = []; qs.forEach(function (d) { o.push(Object.assign({ id: d.id }, d.data())); }); return o; }); },
    addLoanEntry: function (workerId, e) { return sub(COL.loans, workerId, "entries").add(e); },

    settings:    function () { return get(COL.meta, "settings"); },
    saveSettings: function (data) { return set(COL.meta, "settings", data); },

    // low-level escape hatches
    all: all, get: get, set: set, add: add, del: del, sub: sub
  };

  window.GJDB = api;
})();
