/**
 * Dashboard Ambient — bounded on-device snapshot history (Phase 1.5).
 *
 * IndexedDB database: waypoint-ambient-history-v1
 * Object store: snapshots
 *
 * Persistence policy (documented for owner review):
 *   trigger     Successful Ambient compose/paint (hydrate or refresh). Never a 1s poll.
 *   throttle    Unchanged fingerprint: at most one write per 15 minutes (heartbeat).
 *   material    Fingerprint change: persist immediately (waiting→live, weather shift).
 *   dedupe      Identical fingerprint for the same placeKey is not written again
 *               until the heartbeat interval elapses.
 *   retention   36 hours and a hard cap of 72 records (oldest dropped first).
 *   geography   placeKey is a ~0.05° cell (~5.5 km) plus timezone. Stored lat/lng
 *               are rounded to that cell. Place label is stored. Precise GPS is
 *               not accumulated as a movement trail.
 *
 * Failure: missing IndexedDB, quota errors, and malformed records fail open.
 * Ambient still renders; change detection simply has no history.
 *
 * Does not fetch. Does not sync. No accounts.
 */
(function (global) {
  "use strict";

  var DB_NAME = "waypoint-ambient-history-v1";
  var STORE_NAME = "snapshots";
  var RECORD_VERSION = 1;
  var SNAPSHOT_SCHEMA = 1;
  var PLACE_CELL_DEG = 0.05;
  var HEARTBEAT_MS = 15 * 60 * 1000;
  var RETENTION_MS = 36 * 60 * 60 * 1000;
  var MAX_RECORDS = 72;
  var REFERENCE_TARGET_MS = 3 * 60 * 60 * 1000;
  var REFERENCE_WINDOW_MS = 90 * 60 * 1000;
  var MIN_REFERENCE_AGE_MS = 15 * 60 * 1000;
  var FALLBACK_REFERENCE_AGE_MS = 2 * 60 * 1000;
  var MIN_CANDIDATE_AGE_MS = 60 * 1000;

  var backend = null;
  var cache = [];
  var hydrated = false;
  var hydratePromise = null;
  var unavailable = false;

  function asDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    var d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  function num(v) {
    if (v == null) return null;
    if (typeof v === "number" && isFinite(v)) return v;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function roundTo(value, step) {
    var n = num(value);
    if (n == null) return null;
    return Math.round(n / step) * step;
  }

  function cloneJson(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (e) {
      return null;
    }
  }

  function placeKey(place) {
    place = place || {};
    var lat = roundTo(place.lat, PLACE_CELL_DEG);
    var lng = roundTo(place.lng, PLACE_CELL_DEG);
    var tz = String(place.timezone || "").trim();
    if (lat != null && lng != null) {
      return "geo:" + lat.toFixed(2) + "," + lng.toFixed(2) + (tz ? "|" + tz : "");
    }
    var label = String(place.label || "")
      .trim()
      .toLowerCase();
    if (label && label !== "place not set") return "label:" + label + (tz ? "|" + tz : "");
    return "unknown";
  }

  function placesComparable(a, b) {
    var ka = placeKey(a);
    var kb = placeKey(b);
    if (ka === "unknown" || kb === "unknown") return false;
    return ka === kb;
  }

  function alertFingerprint(snapshot) {
    var keys = [];
    function push(item) {
      if (!item) return;
      var id = String(item.id || "");
      if (id === "alert-none") return;
      var kind = String(item.kind || "");
      var title = String(item.title || "");
      if (kind !== "alert" && !/alert/i.test(id) && !/warning|watch|advisory/i.test(title)) return;
      if (/no active alerts/i.test(title)) return;
      var key = String(item.detail || title || id)
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      if (key && keys.indexOf(key) < 0) keys.push(key);
    }
    (snapshot.signals || []).forEach(push);
    (snapshot.developing && snapshot.developing.items ? snapshot.developing.items : []).forEach(push);
    keys.sort();
    return keys.join("|");
  }

  function fingerprint(snapshot) {
    if (!snapshot) return "";
    var c = snapshot.conditions || {};
    var ops = (snapshot.opportunities || [])
      .map(function (o) {
        return [o.domain || "", o.status || "", o.level || ""].join(":");
      })
      .sort()
      .join("|");
    var src = (snapshot.sources || [])
      .map(function (s) {
        return (s.id || "") + ":" + (s.trust || "");
      })
      .sort()
      .join("|");
    return [
      placeKey(snapshot.place),
      c.status || "",
      c.temperatureF == null ? "" : Math.round(Number(c.temperatureF) * 10) / 10,
      c.windMph == null ? "" : Math.round(Number(c.windMph) * 10) / 10,
      c.precipChancePct == null ? "" : Math.round(Number(c.precipChancePct)),
      c.precipitating == null ? "" : String(!!c.precipitating),
      String(c.summary || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim(),
      (c.daylight && c.daylight.status) || "",
      alertFingerprint(snapshot),
      ops,
      src
    ].join("~");
  }

  function sanitizeSnapshot(snapshot) {
    var copy = cloneJson(snapshot);
    if (!copy) return null;
    copy.place = copy.place || {};
    var lat = roundTo(copy.place.lat, PLACE_CELL_DEG);
    var lng = roundTo(copy.place.lng, PLACE_CELL_DEG);
    if (lat != null) copy.place.lat = Math.round(lat * 100) / 100;
    else delete copy.place.lat;
    if (lng != null) copy.place.lng = Math.round(lng * 100) / 100;
    else delete copy.place.lng;
    if (copy.meta) {
      copy.meta.history = true;
      copy.meta.changeDetection = false;
    }
    return copy;
  }

  function validRecord(rec) {
    if (!rec || typeof rec !== "object") return false;
    if (rec.recordVersion !== RECORD_VERSION) return false;
    if (rec.schemaVersion !== SNAPSHOT_SCHEMA) return false;
    if (!rec.capturedAt || !asDate(rec.capturedAt)) return false;
    if (!rec.placeKey || rec.placeKey === "unknown") return false;
    if (!rec.snapshot || typeof rec.snapshot !== "object") return false;
    if (rec.snapshot.schemaVersion != null && rec.snapshot.schemaVersion !== SNAPSHOT_SCHEMA) return false;
    return true;
  }

  function sortCache() {
    cache.sort(function (a, b) {
      return (asDate(a.capturedAt) || 0) - (asDate(b.capturedAt) || 0);
    });
  }

  function pruneCache(nowMs) {
    var now = nowMs || Date.now();
    var kept = cache.filter(function (rec) {
      if (!validRecord(rec)) return false;
      var t = asDate(rec.capturedAt);
      if (!t) return false;
      return now - t.getTime() <= RETENTION_MS;
    });
    if (kept.length > MAX_RECORDS) {
      kept.sort(function (a, b) {
        return (asDate(a.capturedAt) || 0) - (asDate(b.capturedAt) || 0);
      });
      kept = kept.slice(kept.length - MAX_RECORDS);
    }
    var keptIds = Object.create(null);
    kept.forEach(function (rec) {
      if (rec.id != null) keptIds[rec.id] = true;
    });
    var dropped = cache.filter(function (rec) {
      return rec.id != null && !keptIds[rec.id];
    });
    cache = kept;
    sortCache();
    return dropped;
  }

  function lastForPlace(key) {
    var found = null;
    cache.forEach(function (rec) {
      if (rec.placeKey === key) found = rec;
    });
    return found;
  }

  function createMemoryBackend() {
    var rows = [];
    var seq = 1;
    return {
      kind: "memory",
      available: true,
      getAll: function () {
        return Promise.resolve(rows.slice());
      },
      add: function (rec) {
        var row = cloneJson(rec) || rec;
        row.id = seq++;
        rows.push(row);
        return Promise.resolve(row);
      },
      removeIds: function (ids) {
        var drop = Object.create(null);
        (ids || []).forEach(function (id) {
          drop[id] = true;
        });
        rows = rows.filter(function (row) {
          return !drop[row.id];
        });
        return Promise.resolve();
      },
      clear: function () {
        rows = [];
        seq = 1;
        return Promise.resolve();
      }
    };
  }

  function createUnavailableBackend(reason) {
    reason = reason || "unavailable";
    function fail() {
      return Promise.reject(new Error(reason));
    }
    return {
      kind: "unavailable",
      available: false,
      reason: reason,
      getAll: fail,
      add: fail,
      removeIds: fail,
      clear: fail
    };
  }

  function idbReq(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error || new Error("idb"));
      };
    });
  }

  function createIdbBackend() {
    var idb = global.indexedDB || global.webkitIndexedDB || global.mozIndexedDB;
    if (!idb) return createUnavailableBackend("no-indexeddb");
    var dbPromise = null;

    function openDb() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise(function (resolve, reject) {
        var req;
        try {
          req = idb.open(DB_NAME, 1);
        } catch (e) {
          reject(e);
          return;
        }
        req.onupgradeneeded = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            var store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
            store.createIndex("capturedAt", "capturedAt", { unique: false });
            store.createIndex("placeKey", "placeKey", { unique: false });
          }
        };
        req.onsuccess = function () {
          resolve(req.result);
        };
        req.onerror = function () {
          reject(req.error || new Error("idb-open"));
        };
      });
      return dbPromise;
    }

    function txStore(mode) {
      return openDb().then(function (db) {
        var tx = db.transaction(STORE_NAME, mode || "readonly");
        return tx.objectStore(STORE_NAME);
      });
    }

    return {
      kind: "idb",
      available: true,
      getAll: function () {
        return txStore("readonly").then(function (store) {
          if (typeof store.getAll === "function") return idbReq(store.getAll());
          return new Promise(function (resolve, reject) {
            var out = [];
            var req = store.openCursor();
            req.onsuccess = function (ev) {
              var cursor = ev.target.result;
              if (cursor) {
                out.push(cursor.value);
                cursor.continue();
              } else resolve(out);
            };
            req.onerror = function () {
              reject(req.error);
            };
          });
        });
      },
      add: function (rec) {
        return txStore("readwrite").then(function (store) {
          var row = cloneJson(rec) || rec;
          delete row.id;
          return idbReq(store.add(row)).then(function (id) {
            row.id = id;
            return row;
          });
        });
      },
      removeIds: function (ids) {
        if (!ids || !ids.length) return Promise.resolve();
        return txStore("readwrite").then(function (store) {
          var chain = Promise.resolve();
          ids.forEach(function (id) {
            chain = chain.then(function () {
              return idbReq(store.delete(id));
            });
          });
          return chain;
        });
      },
      clear: function () {
        return txStore("readwrite").then(function (store) {
          return idbReq(store.clear());
        });
      }
    };
  }

  function ensureBackend() {
    if (backend) return backend;
    if (global.indexedDB || global.webkitIndexedDB || global.mozIndexedDB) {
      backend = createIdbBackend();
    } else {
      backend = createMemoryBackend();
      hydrated = true;
    }
    return backend;
  }

  function hydrate() {
    if (hydratePromise) return hydratePromise;
    var b = ensureBackend();
    if (!b || b.available === false) {
      unavailable = true;
      hydrated = true;
      cache = [];
      hydratePromise = Promise.resolve({ ok: false, reason: (b && b.reason) || "unavailable" });
      return hydratePromise;
    }
    if (b.kind === "memory" && !cache.length) {
      hydrated = true;
      hydratePromise = b.getAll().then(function (rows) {
        cache = (rows || []).filter(validRecord);
        sortCache();
        return { ok: true, records: cache.slice() };
      });
      return hydratePromise;
    }
    hydratePromise = b
      .getAll()
      .then(function (rows) {
        cache = (rows || []).filter(validRecord);
        sortCache();
        var dropped = pruneCache(Date.now());
        hydrated = true;
        unavailable = false;
        if (dropped.length && b.removeIds) {
          return b
            .removeIds(
              dropped
                .map(function (r) {
                  return r.id;
                })
                .filter(function (id) {
                  return id != null;
                })
            )
            .then(
              function () {
                return { ok: true, records: cache.slice() };
              },
              function () {
                return { ok: true, records: cache.slice() };
              }
            );
        }
        return { ok: true, records: cache.slice() };
      })
      .then(null, function () {
        unavailable = true;
        hydrated = true;
        cache = [];
        return { ok: false, reason: "read-failed" };
      });
    return hydratePromise;
  }

  function isHydrated() {
    return hydrated;
  }

  function shouldPersist(nextRec, nowMs) {
    var prev = lastForPlace(nextRec.placeKey);
    if (!prev) return { ok: true, reason: "first" };
    if (prev.fingerprint && prev.fingerprint === nextRec.fingerprint) {
      var prevT = asDate(prev.capturedAt);
      if (prevT && nowMs - prevT.getTime() < HEARTBEAT_MS) {
        return { ok: false, reason: "duplicate" };
      }
      return { ok: true, reason: "heartbeat" };
    }
    return { ok: true, reason: "material" };
  }

  function ingest(snapshot, options) {
    options = options || {};
    var cloned = cloneJson(snapshot);
    if (!cloned || typeof cloned !== "object") {
      return Promise.resolve({ persisted: false, reason: "malformed" });
    }
    var captured = asDate(options.capturedAt || cloned.capturedAt) || new Date();
    cloned.capturedAt = captured.toISOString();
    var sanitized = sanitizeSnapshot(cloned);
    if (!sanitized) return Promise.resolve({ persisted: false, reason: "malformed" });
    var key = placeKey(sanitized.place);
    if (key === "unknown" && !options.force) {
      return Promise.resolve({ persisted: false, reason: "no-place" });
    }
    var rec = {
      recordVersion: RECORD_VERSION,
      schemaVersion: SNAPSHOT_SCHEMA,
      capturedAt: sanitized.capturedAt,
      placeKey: key,
      placeLabel: (sanitized.place && sanitized.place.label) || null,
      timezone: (sanitized.place && sanitized.place.timezone) || null,
      fingerprint: fingerprint(sanitized),
      snapshot: sanitized
    };
    var nowMs = captured.getTime();
    if (!options.force) {
      var gate = shouldPersist(rec, nowMs);
      if (!gate.ok) return Promise.resolve({ persisted: false, reason: gate.reason });
    }

    function afterWrite(saved) {
      cache.push(saved);
      sortCache();
      var dropped = pruneCache(nowMs);
      var b = backend;
      if (dropped.length && b && b.removeIds) {
        b.removeIds(
          dropped
            .map(function (r) {
              return r.id;
            })
            .filter(function (id) {
              return id != null;
            })
        );
      }
      return { persisted: true, reason: options.force ? "forced" : "ok", record: saved };
    }

    var b = ensureBackend();
    if (!b || b.available === false) {
      unavailable = true;
      return Promise.resolve({ persisted: false, reason: "unavailable" });
    }
    return b.add(rec).then(afterWrite, function () {
      unavailable = true;
      return { persisted: false, reason: "write-failed" };
    });
  }

  function remember(snapshot, options) {
    options = options || {};
    if (!hydrated) {
      return hydrate().then(function () {
        return ingest(snapshot, options);
      });
    }
    return ingest(snapshot, options);
  }

  function reference(snapshot, now) {
    if (!snapshot) return null;
    var key = placeKey(snapshot.place);
    if (key === "unknown") return null;
    var currentAt = asDate(snapshot.capturedAt) || asDate(now) || new Date();
    var currentMs = currentAt.getTime();
    var candidates = cache.filter(function (rec) {
      if (!validRecord(rec)) return false;
      if (rec.placeKey !== key) return false;
      var t = asDate(rec.capturedAt);
      return t && t.getTime() < currentMs - MIN_CANDIDATE_AGE_MS;
    });
    if (!candidates.length) return null;
    var target = currentMs - REFERENCE_TARGET_MS;
    var near = candidates.filter(function (rec) {
      var t = asDate(rec.capturedAt).getTime();
      return Math.abs(t - target) <= REFERENCE_WINDOW_MS;
    });
    var pool = near.length
      ? near
      : candidates.filter(function (rec) {
          return currentMs - asDate(rec.capturedAt).getTime() >= MIN_REFERENCE_AGE_MS;
        });
    if (!pool.length) {
      pool = candidates.filter(function (rec) {
        return currentMs - asDate(rec.capturedAt).getTime() >= FALLBACK_REFERENCE_AGE_MS;
      });
    }
    if (!pool.length) return null;
    pool.sort(function (a, b) {
      if (near.length) {
        return (
          Math.abs(asDate(a.capturedAt).getTime() - target) -
          Math.abs(asDate(b.capturedAt).getTime() - target)
        );
      }
      return asDate(b.capturedAt).getTime() - asDate(a.capturedAt).getTime();
    });
    return pool[0];
  }

  function list() {
    return cache.filter(validRecord).slice();
  }

  function useBackend(next) {
    backend = next || createMemoryBackend();
    cache = [];
    hydrated = backend.kind === "memory";
    hydratePromise = hydrated ? Promise.resolve({ ok: true, records: [] }) : null;
    unavailable = backend.available === false;
    if (hydrated && backend.getAll) {
      return backend.getAll().then(function (rows) {
        cache = (rows || []).filter(validRecord);
        sortCache();
        return list();
      });
    }
    return Promise.resolve(list());
  }

  function resetForTests() {
    backend = createMemoryBackend();
    cache = [];
    hydrated = true;
    unavailable = false;
    hydratePromise = Promise.resolve({ ok: true, records: [] });
    return backend.clear();
  }

  function clear() {
    cache = [];
    var b = ensureBackend();
    if (!b || typeof b.clear !== "function" || b.available === false) {
      return Promise.resolve();
    }
    return b.clear().then(
      function () {
        cache = [];
        hydrated = true;
        hydratePromise = Promise.resolve({ ok: true, records: [] });
      },
      function () {
        cache = [];
      }
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildAmbientStore = {
    version: "1.5.0",
    RECORD_VERSION: RECORD_VERSION,
    SNAPSHOT_SCHEMA: SNAPSHOT_SCHEMA,
    POLICY: {
      database: DB_NAME,
      store: STORE_NAME,
      heartbeatMs: HEARTBEAT_MS,
      retentionMs: RETENTION_MS,
      maxRecords: MAX_RECORDS,
      placeCellDeg: PLACE_CELL_DEG,
      referenceTargetMs: REFERENCE_TARGET_MS,
      referenceWindowMs: REFERENCE_WINDOW_MS,
      minReferenceAgeMs: MIN_REFERENCE_AGE_MS,
      fallbackReferenceAgeMs: FALLBACK_REFERENCE_AGE_MS,
      minCandidateAgeMs: MIN_CANDIDATE_AGE_MS
    },
    placeKey: placeKey,
    placesComparable: placesComparable,
    fingerprint: fingerprint,
    createMemoryBackend: createMemoryBackend,
    createUnavailableBackend: createUnavailableBackend,
    useBackend: useBackend,
    hydrate: hydrate,
    isHydrated: isHydrated,
    remember: remember,
    ingest: ingest,
    reference: reference,
    list: list,
    resetForTests: resetForTests,
    clear: clear,
    replaceCacheForTests: function (rows) {
      cache = Array.isArray(rows) ? rows.slice() : [];
      hydrated = true;
      unavailable = false;
      hydratePromise = Promise.resolve({ ok: true, records: cache.slice() });
      return list();
    },
    isUnavailable: function () {
      return unavailable;
    }
  };
})(typeof window !== "undefined" ? window : global);
