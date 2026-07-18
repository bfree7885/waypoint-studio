/**
 * SignalTerrain Cyber Ingestion Framework V0.1
 * Normalize, dedupe (keep attribution), change detect, local cache, health.
 * Connectors remain independent — this module never couples them.
 */
(function (global) {
  "use strict";

  var CACHE_PREFIX = "wds.st.cyber.ingest.v01.";

  function esc(s) {
    return String(s == null ? "" : s);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function fingerprintTitle(title) {
    return String(title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .slice(0, 120);
  }

  function simpleHash(str) {
    var h = 0;
    var s = String(str || "");
    for (var i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return "h" + (h >>> 0).toString(16);
  }

  function mapSeverity(raw) {
    var s = String(raw || "").toLowerCase();
    if (s === "critical") return "critical";
    if (s === "high") return "high";
    if (s === "medium" || s === "moderate" || s === "elevated") return "elevated";
    if (s === "low" || s === "notice") return "notice";
    if (s === "info" || s === "informational") return "info";
    return "unknown";
  }

  function makeProvenance(connector, extras) {
    extras = extras || {};
    return {
      connectorId: connector.id,
      retrievedAt: extras.retrievedAt || nowIso(),
      sourceLabel: (connector.attribution && connector.attribution.label) || connector.name,
      sourceUrl: extras.sourceUrl || (connector.attribution && connector.attribution.url) || null,
      sourceRecordId: extras.sourceRecordId || null,
      verified: !!extras.verified,
      verificationNote: extras.verificationNote || null,
      contentHash: extras.contentHash || null,
      reliability: connector.reliability || "moderate"
    };
  }

  function baseRecord(partial) {
    return Object.assign(
      {
        meta: {
          version: "0.1.0",
          schema: "https://waypoint.studio/schemas/signalterrain/cyber/normalized-record/v0.1",
          status: "sample",
          rejectionReason: null
        },
        cveIds: [],
        advisoryIds: [],
        references: [],
        products: [],
        vendors: [],
        industries: [],
        regions: ["global"],
        citations: [],
        verified: false,
        targetEntityKind: null,
        rawSnapshotId: null
      },
      partial
    );
  }

  function reject(reason, connectorId) {
    return baseRecord({
      id: "nir_rejected-" + simpleHash(connectorId + reason + nowIso()).slice(0, 10),
      recordType: "research-item",
      title: "Rejected record",
      summary: reason,
      publishedAt: null,
      retrievedAt: nowIso(),
      severity: "unknown",
      confidence: "insufficient",
      provenance: [
        {
          connectorId: connectorId,
          retrievedAt: nowIso(),
          sourceLabel: connectorId,
          sourceUrl: null,
          sourceRecordId: null,
          verified: false,
          verificationNote: reason,
          contentHash: null,
          reliability: "experimental"
        }
      ],
      identityKeys: { primary: "rejected:" + reason },
      meta: {
        version: "0.1.0",
        schema: "https://waypoint.studio/schemas/signalterrain/cyber/normalized-record/v0.1",
        status: "rejected",
        rejectionReason: reason
      }
    });
  }

  /** Normalize helpers — provider-specific adapters live in connectors runtime; shared field rules here. */
  function finalizeNormalized(rec) {
    if (!rec.title || !rec.summary) {
      return reject("Missing title or summary after normalize", (rec.provenance && rec.provenance[0] && rec.provenance[0].connectorId) || "conn_unknown");
    }
    if (/exploit payload|metasploit|poc code|weaponiz/i.test(rec.summary + rec.title)) {
      return reject("Forbidden exploit content", (rec.provenance && rec.provenance[0] && rec.provenance[0].connectorId) || "conn_unknown");
    }
    rec.identityKeys = rec.identityKeys || {};
    rec.identityKeys.titleFingerprint = fingerprintTitle(rec.title);
    if (!rec.identityKeys.primary) {
      if (rec.cveIds && rec.cveIds[0]) rec.identityKeys.primary = "cve:" + rec.cveIds[0];
      else if (rec.advisoryIds && rec.advisoryIds[0]) rec.identityKeys.primary = "adv:" + rec.advisoryIds[0];
      else rec.identityKeys.primary = "title:" + rec.identityKeys.titleFingerprint;
    }
    rec.identityKeys.cveIds = rec.cveIds || [];
    rec.identityKeys.advisoryIds = rec.advisoryIds || [];
    rec.identityKeys.vendorKeys = (rec.vendors || []).map(function (v) {
      return String(v).toLowerCase();
    });
    return rec;
  }

  function overlap(a, b) {
    var set = {};
    (a || []).forEach(function (x) {
      set[String(x).toLowerCase()] = true;
    });
    return (b || []).some(function (x) {
      return set[String(x).toLowerCase()];
    });
  }

  function likelyDuplicate(a, b) {
    if (!a || !b) return false;
    if (a.identityKeys && b.identityKeys && a.identityKeys.primary && a.identityKeys.primary === b.identityKeys.primary) {
      return true;
    }
    if (overlap(a.cveIds, b.cveIds)) return true;
    if (overlap(a.advisoryIds, b.advisoryIds)) return true;
    if (
      a.identityKeys &&
      b.identityKeys &&
      a.identityKeys.titleFingerprint &&
      a.identityKeys.titleFingerprint === b.identityKeys.titleFingerprint &&
      overlap(a.vendors, b.vendors)
    ) {
      return true;
    }
    return false;
  }

  /**
   * Merge duplicates while preserving every provenance entry.
   */
  function dedupePreserveAttribution(records) {
    var groups = [];
    (records || []).forEach(function (rec) {
      if (rec.meta && rec.meta.status === "rejected") {
        groups.push({ keep: rec, members: [rec] });
        return;
      }
      var found = null;
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].keep.meta && groups[i].keep.meta.status === "rejected") continue;
        if (likelyDuplicate(groups[i].keep, rec)) {
          found = groups[i];
          break;
        }
      }
      if (!found) {
        groups.push({ keep: JSON.parse(JSON.stringify(rec)), members: [rec] });
        return;
      }
      found.members.push(rec);
      var keep = found.keep;
      // Merge arrays uniquely
      function mergeArr(key) {
        var seen = {};
        var out = [];
        (keep[key] || []).concat(rec[key] || []).forEach(function (x) {
          var k = String(x).toLowerCase();
          if (!seen[k]) {
            seen[k] = true;
            out.push(x);
          }
        });
        keep[key] = out;
      }
      ["cveIds", "advisoryIds", "references", "products", "vendors", "industries", "regions"].forEach(mergeArr);
      // Provenance: append unique by connectorId+sourceRecordId+contentHash
      var provSeen = {};
      var prov = [];
      (keep.provenance || []).concat(rec.provenance || []).forEach(function (p) {
        var k = [p.connectorId, p.sourceRecordId || "", p.contentHash || p.retrievedAt].join("|");
        if (!provSeen[k]) {
          provSeen[k] = true;
          prov.push(p);
        }
      });
      keep.provenance = prov;
      keep.citations = (keep.citations || []).concat(rec.citations || []);
      // Prefer higher reliability severity only if not unknown; never invent certainty
      if (keep.severity === "unknown" && rec.severity !== "unknown") keep.severity = rec.severity;
      if (rec.verified) keep.verified = true;
      keep.summary = keep.summary || rec.summary;
      found.keep = keep;
    });
    return {
      records: groups.map(function (g) {
        return g.keep;
      }),
      mergeCount: groups.reduce(function (n, g) {
        return n + Math.max(0, g.members.length - 1);
      }, 0),
      independentSourceCounts: groups.map(function (g) {
        var ids = {};
        (g.keep.provenance || []).forEach(function (p) {
          ids[p.connectorId] = true;
        });
        return { id: g.keep.id, independentSources: Object.keys(ids).length };
      })
    };
  }

  function detectChanges(previous, next) {
    previous = previous || {};
    next = next || {};
    var changes = [];
    var subjectId = next.id || previous.id || "unknown";
    var prov = next.provenance || previous.provenance || [];

    function push(changeType, summary, before, after) {
      changes.push({
        meta: {
          version: "0.1.0",
          schema: "https://waypoint.studio/schemas/signalterrain/cyber/change-event/v0.1",
          status: "sample"
        },
        id: "chg_" + simpleHash(subjectId + changeType + summary).slice(0, 14),
        subjectId: subjectId,
        detectedAt: nowIso(),
        changeType: changeType,
        summary: summary,
        before: before,
        after: after,
        provenance: prov.slice(0, 3)
      });
    }

    if (!previous.id && next.id) {
      push("other", "New normalized record observed: " + next.title, null, { title: next.title });
      return changes;
    }

    if (previous.severity !== next.severity) {
      push(
        "severity-revised",
        "Severity revised from “" + previous.severity + "” to “" + next.severity + "”.",
        { severity: previous.severity },
        { severity: next.severity }
      );
    }

    var prevProducts = (previous.products || []).slice().sort().join("|");
    var nextProducts = (next.products || []).slice().sort().join("|");
    if (prevProducts !== nextProducts && (next.products || []).length > (previous.products || []).length) {
      push(
        "affected-products-added",
        "Additional affected products listed.",
        { products: previous.products || [] },
        { products: next.products || [] }
      );
    }

    var prevRefs = (previous.references || []).length;
    var nextRefs = (next.references || []).length;
    if (nextRefs > prevRefs) {
      push("references-added", "Additional references attached.", { count: prevRefs }, { count: nextRefs });
    }

    // Heuristic: patch bulletin / patch record type
    if (previous.recordType !== "patch-bulletin" && next.recordType === "patch-bulletin") {
      push("patch-released", "Patch bulletin information appeared.", { recordType: previous.recordType }, { recordType: next.recordType });
    }

    // Exploitation confirmed: verified flag or advisory id containing KEV
    var prevKev = (previous.advisoryIds || []).some(function (a) {
      return /kev/i.test(a);
    });
    var nextKev = (next.advisoryIds || []).some(function (a) {
      return /kev/i.test(a);
    });
    if (!prevKev && nextKev) {
      push("exploitation-confirmed", "Known-exploitation signal (e.g. KEV) appeared in identifiers.", { kev: false }, { kev: true });
    }

    if (!previous.verified && next.verified) {
      push("vendor-statement-updated", "Record marked verified from an additional trusted source.", { verified: false }, { verified: true });
    }

    return changes;
  }

  function storageAvailable() {
    try {
      var k = CACHE_PREFIX + "ping";
      global.localStorage.setItem(k, "1");
      global.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  function cacheKey(connectorId, kind) {
    return CACHE_PREFIX + connectorId + "." + (kind || "normalized");
  }

  function writeCache(connector, payload, options) {
    options = options || {};
    var ttlHours = (connector.cachePolicy && connector.cachePolicy.ttlHours) || 12;
    var cachedAt = nowIso();
    var expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();
    var entry = {
      connectorId: connector.id,
      cachedAt: cachedAt,
      expiresAt: expiresAt,
      payloadKind: options.payloadKind || "normalized",
      objectCount: Array.isArray(payload) ? payload.length : payload && payload.records ? payload.records.length : 0,
      ok: options.ok !== false,
      errorMessage: options.errorMessage || null,
      latencyMs: options.latencyMs != null ? options.latencyMs : null,
      contentHash: simpleHash(JSON.stringify(payload)),
      storageKey: cacheKey(connector.id, options.payloadKind || "normalized")
    };
    var envelope = { entry: entry, payload: payload };
    if (storageAvailable()) {
      global.localStorage.setItem(entry.storageKey, JSON.stringify(envelope));
    }
    return entry;
  }

  function readCache(connectorId, kind) {
    if (!storageAvailable()) return { hit: false, reason: "storage-unavailable", entry: null, payload: null };
    var key = cacheKey(connectorId, kind || "normalized");
    var raw = global.localStorage.getItem(key);
    if (!raw) return { hit: false, reason: "miss", entry: null, payload: null };
    try {
      var envelope = JSON.parse(raw);
      var expired = envelope.entry && envelope.entry.expiresAt && Date.parse(envelope.entry.expiresAt) < Date.now();
      return {
        hit: true,
        expired: !!expired,
        reason: expired ? "expired" : "fresh",
        entry: envelope.entry,
        payload: envelope.payload
      };
    } catch (e) {
      return { hit: false, reason: "corrupt", entry: null, payload: null };
    }
  }

  function cacheAgeHours(entry) {
    if (!entry || !entry.cachedAt) return null;
    return Math.round(((Date.now() - Date.parse(entry.cachedAt)) / 3600000) * 10) / 10;
  }

  function buildHealth(connector, stats) {
    stats = stats || {};
    var cache = readCache(connector.id, "normalized");
    var status = "mock";
    if (stats.failureCount > 2) status = "failing";
    else if (stats.failureCount > 0) status = "degraded";
    else if (cache.hit && !cache.expired) status = connector.status === "mock" ? "mock" : "healthy";
    else if (cache.hit && cache.expired) status = "degraded";
    else status = connector.status === "mock" ? "mock" : "idle";

    return {
      connectorId: connector.id,
      name: connector.name,
      status: status,
      lastUpdate: (cache.entry && cache.entry.cachedAt) || connector.lastSuccessfulUpdate || null,
      averageLatencyMs: stats.averageLatencyMs != null ? stats.averageLatencyMs : null,
      failureCount: stats.failureCount || 0,
      cacheAgeHours: cacheAgeHours(cache.entry),
      trustLevel: connector.reliability || "moderate",
      objectsIngested: stats.objectsIngested || 0,
      objectsNormalized: stats.objectsNormalized || 0,
      objectsRejected: stats.objectsRejected || 0,
      notes: stats.notes || (cache.expired ? "Serving expired cache — graceful degradation." : "Independent connector health.")
    };
  }

  function answerProvenanceQuestions(record) {
    var prov = record.provenance || [];
    var connectors = {};
    prov.forEach(function (p) {
      connectors[p.connectorId] = true;
    });
    return {
      whereFrom: prov.map(function (p) {
        return p.sourceLabel + (p.sourceUrl ? " (" + p.sourceUrl + ")" : "");
      }),
      whenRetrieved: prov.map(function (p) {
        return p.retrievedAt;
      }),
      independentSources: Object.keys(connectors).length,
      verified: !!record.verified || prov.some(function (p) {
        return p.verified;
      }),
      confidence: record.confidence,
      severity: record.severity,
      note: "Confidence is separate from severity. Independent sources do not imply certainty."
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainCyberIngest = {
    mapSeverity: mapSeverity,
    makeProvenance: makeProvenance,
    baseRecord: baseRecord,
    finalizeNormalized: finalizeNormalized,
    reject: reject,
    likelyDuplicate: likelyDuplicate,
    dedupePreserveAttribution: dedupePreserveAttribution,
    detectChanges: detectChanges,
    writeCache: writeCache,
    readCache: readCache,
    cacheAgeHours: cacheAgeHours,
    buildHealth: buildHealth,
    answerProvenanceQuestions: answerProvenanceQuestions,
    fingerprintTitle: fingerprintTitle,
    simpleHash: simpleHash,
    storageAvailable: storageAvailable,
    CACHE_PREFIX: CACHE_PREFIX
  };
})(typeof window !== "undefined" ? window : globalThis);
