/* =====================================================================
   db.js — Firestore persistence engine for the Jobwork System
   ---------------------------------------------------------------------
   Exposes window.GJDB. Active only in LIVE mode (real Firebase config +
   a signed-in user). In DEMO mode every call is a harmless no-op.

   DESIGN
   ------
   The app keeps all data in memory (app.js). This engine mirrors each
   in-memory store into ONE Firestore document so the whole dataset is
   small, atomic per store, and survives refresh / cross-device.

   Each store is written to  <collection>/__all__  where <collection> is
   one the PUBLISHED security rules already cover. That means:
     • no rules change is needed, and
     • role access is enforced server-side automatically —
       a supervisor only ever changes sheets / packing / niwarSheets,
       so the admin-only docs (bills, loans, upad, …) are never touched
       by a supervisor and never rejected.

   Money is kept in paise and weight in grams as BigInt inside app.js.
   Firestore can't store BigInt, so enc()/dec() convert BigInt <-> {$b}.
   ===================================================================== */
(function () {
  "use strict";

  // NOTE: must NOT match Firestore's reserved pattern /^__.*__$/ (double underscores
  // both ends) — such IDs are rejected with "invalid-argument". "all" is a plain,
  // valid single-document id used to hold each store as one document.
  var DOC = "all";

  // store key  ->  firestore collection  +  who may write it
  var STORES = [
    { k: "workers",  col: "workers",      role: "admin" },  // job-worker directory
    { k: "nworkers", col: "niwarParties", role: "admin" },  // niwar party directory
    { k: "sheets",   col: "sheets",       role: "staff" },  // gate job work sheets
    { k: "packing",  col: "packing",      role: "staff" },  // packaging lists
    { k: "nsheets",  col: "niwarSheets",  role: "staff" },  // niwar gate sheets
    { k: "bills",    col: "bills",        role: "admin" },  // billing params + ghati rate
    { k: "nparam",   col: "niwarParams",  role: "admin" },  // niwar bill params
    { k: "loans",    col: "loans",        role: "admin" },  // textile loans
    { k: "upad",     col: "upad",         role: "admin" },  // textile weekly advances
    { k: "nupad",    col: "niwarUpad",    role: "admin" },  // niwar weekly advances
    { k: "nloans",   col: "niwarLoans",   role: "admin" }   // niwar loans
  ];

  // Which permission module owns WRITE access to each store. A non-admin may
  // write a store only when their perms grant the owning module. This mirrors
  // the Firestore security rules so the client never attempts a denied write.
  var STORE_MODULE = {
    workers: "workers", nworkers: "niwar",
    sheets: "gate", packing: "packing", nsheets: "niwar",
    bills: "billing", nparam: "niwar",
    loans: "loans", upad: "upad", nupad: "niwar", nloans: "niwar"
  };
  function canWriteStore(k, role) {
    if (role === "admin") return true;
    var m = STORE_MODULE[k]; if (!m) return false;
    var perms = (window.GJAuth && window.GJAuth.user && window.GJAuth.user.perms) || null;
    return !!(perms && perms[m] === true);
  }

  /* ---- BigInt-safe encode / decode -------------------------------- */
  function enc(v) {
    if (typeof v === "bigint") return { $b: v.toString() };
    if (v === undefined) return null;
    if (Array.isArray(v)) { for (var a = [], i = 0; i < v.length; i++) a.push(enc(v[i])); return a; }
    if (v && typeof v === "object") { var o = {}; for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) o[k] = enc(v[k]); return o; }
    return v;
  }
  function dec(v) {
    if (Array.isArray(v)) { for (var a = [], i = 0; i < v.length; i++) a.push(dec(v[i])); return a; }
    if (v && typeof v === "object") {
      var ks = Object.keys(v);
      if (ks.length === 1 && ks[0] === "$b") { try { return BigInt(v.$b); } catch (e) { return 0n; } }
      var o = {}; for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) o[k] = dec(v[k]); return o;
    }
    return v;
  }

  var A = window.GJAuth || {};
  var db = (A.enabled && A.db) ? A.db : null;

  /* ---- DEMO mode: no-op shim -------------------------------------- */
  if (!db) {
    window.GJDB = {
      ready: false, STORES: STORES, enc: enc, dec: dec,
      loadAll: function () { return Promise.resolve({}); },
      saveStores: function () { return Promise.resolve(0); },
      cacheSeed: function () {},
      watch: function () {}, unwatch: function () {}
    };
    return;
  }

  /* ---- LIVE engine ------------------------------------------------ */
  var lastJSON = {};                       // store key -> JSON of last write (dirty check)
  function ref(col) { return db.collection(col).doc(DOC); }

  // Read every store doc. Returns { workers:…, sheets:…, … } (null if a doc is absent).
  function loadAll() {
    return Promise.all(STORES.map(function (s) {
      return ref(s.col).get().then(function (snap) {
        var d = snap.exists ? snap.data() : null;
        return { k: s.k, v: (d && d.data !== undefined) ? dec(d.data) : null };
      }).catch(function () { return { k: s.k, v: null }; });
    })).then(function (rows) {
      var out = {}; rows.forEach(function (r) { out[r.k] = r.v; }); return out;
    });
  }

  // map: { storeKey: plainValue }. Only CHANGED stores the role may write are committed.
  function saveStores(map, role) {
    var batch = db.batch(), prev = [], n = 0;
    STORES.forEach(function (s) {
      if (!Object.prototype.hasOwnProperty.call(map, s.k)) return;
      if (!canWriteStore(s.k, role)) return;                   // only stores this user's perms allow
      var encoded = enc(map[s.k]);
      var js = JSON.stringify(encoded);
      if (lastJSON[s.k] === js) return;                        // unchanged — skip the write
      batch.set(ref(s.col), { data: encoded, at: Date.now() });
      prev.push([s.k, lastJSON[s.k]]);                         // remember prior value for rollback
      lastJSON[s.k] = js;                                      // optimistic: suppress our own echo immediately
      n++;
    });
    if (!n) return Promise.resolve(0);
    return batch.commit().then(function () { return n; })
      .catch(function (e) {                                    // write rejected → roll back so it is retried
        prev.forEach(function (p) { lastJSON[p[0]] = p[1]; });
        throw e;
      });
  }

  // Record the baseline (after load or first seed) so the first edit diffs correctly.
  function cacheSeed(map) {
    STORES.forEach(function (s) {
      if (Object.prototype.hasOwnProperty.call(map, s.k)) lastJSON[s.k] = JSON.stringify(enc(map[s.k]));
    });
  }

  /* ---- real-time listeners: push changes made by the other panel live ---- */
  var watching = false, unsub = [];
  function watch(onChange) {
    if (watching) return; watching = true;
    STORES.forEach(function (s) {
      var first = true;
      var u = ref(s.col).onSnapshot(function (snap) {
        var d = snap.exists ? snap.data() : null;
        var val = (d && d.data !== undefined) ? d.data : null;   // stored (encoded) value
        var js = JSON.stringify(val);
        if (first) { first = false; lastJSON[s.k] = js; return; } // initial load — we already have it
        if (js === lastJSON[s.k]) return;                          // our own write echoing back / no change
        lastJSON[s.k] = js;
        try { onChange(s.k, val == null ? null : dec(val)); } catch (e) { console.warn("apply remote", e); }
      }, function (err) { console.warn("watch " + s.col, err); });
      unsub.push(u);
    });
  }
  function unwatch() { unsub.forEach(function (u) { try { u(); } catch (e) {} }); unsub = []; watching = false; }

  window.GJDB = { ready: true, STORES: STORES, enc: enc, dec: dec, loadAll: loadAll, saveStores: saveStores, cacheSeed: cacheSeed, watch: watch, unwatch: unwatch };
})();
