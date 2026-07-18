/**
 * SignalTerrain Cyber Connectors V0.1 — mock/stub implementations.
 * Each connector normalizes only its own payload shape.
 * No connector imports or calls another connector.
 */
(function (global) {
  "use strict";

  function loadJson(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("Failed " + url + " (" + r.status + ")");
      return r.json();
    });
  }

  function Ingest() {
    return global.WDS && global.WDS.signalTerrainCyberIngest;
  }

  function byId(list) {
    var map = {};
    (list || []).forEach(function (c) {
      map[c.id] = c;
    });
    return map;
  }

  function normalizeNvd(connector, fixture) {
    var I = Ingest();
    var payload = fixture.payload || fixture;
    var retrievedAt = payload.retrievedAt || new Date().toISOString();
    return (payload.items || []).map(function (item, idx) {
      var cve = item.cve || {};
      var desc = (cve.descriptions || []).filter(function (d) {
        return d.lang === "en";
      })[0];
      var sev =
        item.metrics &&
        item.metrics.cvssMetricV31 &&
        item.metrics.cvssMetricV31[0] &&
        item.metrics.cvssMetricV31[0].cvssData
          ? item.metrics.cvssMetricV31[0].cvssData.baseSeverity
          : "unknown";
      var products = [];
      (item.configurations || []).forEach(function (cfg) {
        (cfg.nodes || []).forEach(function (n) {
          (n.cpeMatch || []).forEach(function (m) {
            if (m.criteria) products.push(m.criteria);
          });
        });
      });
      var refs = (item.references || []).map(function (r) {
        return r.url;
      });
      return I.finalizeNormalized(
        I.baseRecord({
          id: "nir_nvd-" + String(cve.id || idx).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          recordType: "shared-vulnerability",
          title: cve.id || "Unknown CVE",
          summary: (desc && desc.value) || "CVE record without English description.",
          publishedAt: cve.published || null,
          retrievedAt: retrievedAt,
          severity: I.mapSeverity(sev),
          confidence: "high",
          cveIds: cve.id ? [cve.id] : [],
          references: refs,
          products: products,
          vendors: [],
          citations: [{ label: "NVD", kind: "government", url: refs[0] || "https://nvd.nist.gov/" }],
          provenance: [
            I.makeProvenance(connector, {
              retrievedAt: retrievedAt,
              sourceUrl: refs[0] || connector.attribution.url,
              sourceRecordId: cve.id || null,
              verified: true,
              contentHash: I.simpleHash(JSON.stringify(item))
            })
          ],
          identityKeys: { primary: cve.id ? "cve:" + cve.id : undefined },
          targetEntityKind: "cve",
          verified: true
        })
      );
    });
  }

  function normalizeCisa(connector, fixture) {
    var I = Ingest();
    var payload = fixture.payload || fixture;
    var retrievedAt = payload.pulledAt || new Date().toISOString();
    return (payload.advisories || []).map(function (a, idx) {
      return I.finalizeNormalized(
        I.baseRecord({
          id: "nir_cisa-" + String(a.id || idx).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          recordType: a.knownExploited ? "threat-update" : "shared-advisory",
          title: a.title,
          summary: a.title + (a.knownExploited ? " (known exploited — KEV literacy)." : ""),
          publishedAt: a.published || null,
          retrievedAt: retrievedAt,
          severity: I.mapSeverity(a.severity),
          confidence: "high",
          cveIds: a.cves || [],
          advisoryIds: a.id ? [a.id] : [],
          products: a.products || [],
          vendors: [],
          references: a.url ? [a.url] : [],
          citations: [{ label: "CISA", kind: "government", url: a.url || null }],
          provenance: [
            I.makeProvenance(connector, {
              retrievedAt: retrievedAt,
              sourceUrl: a.url || connector.attribution.url,
              sourceRecordId: a.id || null,
              verified: true,
              contentHash: I.simpleHash(JSON.stringify(a))
            })
          ],
          identityKeys: {
            primary: a.cves && a.cves[0] ? "cve:" + a.cves[0] : "adv:" + a.id
          },
          targetEntityKind: a.knownExploited ? "kev-entry" : "vendor-advisory",
          verified: true
        })
      );
    });
  }

  function normalizeMsrc(connector, fixture) {
    var I = Ingest();
    var payload = fixture.payload || fixture;
    var retrievedAt = payload.retrieved || new Date().toISOString();
    return (payload.updates || []).map(function (u, idx) {
      return I.finalizeNormalized(
        I.baseRecord({
          id: "nir_msrc-" + String(u.id || idx).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          recordType: "shared-advisory",
          title: u.title,
          summary: "Vendor advisory " + (u.id || "") + " for " + (u.productFamily || "Microsoft products") + ".",
          publishedAt: u.releaseDate || null,
          retrievedAt: retrievedAt,
          severity: I.mapSeverity(u.severity),
          confidence: "high",
          cveIds: u.cveNumbers || [],
          advisoryIds: u.id ? [u.id] : [],
          products: u.productFamily ? [u.productFamily] : [],
          vendors: [payload.vendor || "Microsoft"],
          references: u.url ? [u.url] : [],
          citations: [{ label: "Microsoft MSRC", kind: "vendor", url: u.url || null }],
          provenance: [
            I.makeProvenance(connector, {
              retrievedAt: retrievedAt,
              sourceUrl: u.url || null,
              sourceRecordId: u.id || null,
              verified: true,
              contentHash: I.simpleHash(JSON.stringify(u))
            })
          ],
          identityKeys: { primary: u.id ? "adv:" + u.id : undefined },
          targetEntityKind: "vendor-advisory",
          verified: true
        })
      );
    });
  }

  function normalizeCuratedAdvisory(connector, fixture) {
    var I = Ingest();
    var payload = fixture.payload || fixture;
    var retrievedAt = payload.at || new Date().toISOString();
    return (payload.records || []).map(function (r, idx) {
      return I.finalizeNormalized(
        I.baseRecord({
          id: "nir_curated-" + idx + "-" + I.simpleHash(r.title).slice(0, 6),
          recordType: "shared-advisory",
          title: r.title,
          summary: r.title,
          publishedAt: r.date || null,
          retrievedAt: retrievedAt,
          severity: I.mapSeverity(r.severity),
          confidence: "moderate",
          cveIds: r.cves || [],
          products: r.products || [],
          vendors: r.vendors || [],
          references: r.url ? [r.url] : [],
          citations: [{ label: "Curated sample", kind: "other", url: r.url || null }],
          provenance: [
            I.makeProvenance(connector, {
              retrievedAt: retrievedAt,
              sourceUrl: r.url || null,
              sourceRecordId: null,
              verified: false,
              contentHash: I.simpleHash(JSON.stringify(r))
            })
          ],
          identityKeys: { primary: r.cves && r.cves[0] ? "cve:" + r.cves[0] : undefined },
          targetEntityKind: "vendor-advisory"
        })
      );
    });
  }

  function normalizeNews(connector, fixture) {
    var I = Ingest();
    var payload = fixture.payload || fixture;
    var retrievedAt = payload.retrievedAt || new Date().toISOString();
    return (payload.articles || []).map(function (a, idx) {
      return I.finalizeNormalized(
        I.baseRecord({
          id: "nir_news-" + idx + "-" + I.simpleHash(a.headline).slice(0, 6),
          recordType: "research-item",
          title: a.headline,
          summary: a.summary || a.headline,
          publishedAt: a.published || null,
          retrievedAt: retrievedAt,
          severity: "notice",
          confidence: "moderate",
          cveIds: a.relatedCves || [],
          references: a.url ? [a.url] : [],
          citations: [{ label: "Curated news pointer", kind: "news", url: a.url || null }],
          provenance: [
            I.makeProvenance(connector, {
              retrievedAt: retrievedAt,
              sourceUrl: a.url,
              verified: false,
              contentHash: I.simpleHash(JSON.stringify(a))
            })
          ],
          identityKeys: { primary: a.relatedCves && a.relatedCves[0] ? "cve:" + a.relatedCves[0] : undefined },
          targetEntityKind: "reference"
        })
      );
    });
  }

  function normalizeRansomware(connector, fixture) {
    var I = Ingest();
    var payload = fixture.payload || fixture;
    var retrievedAt = payload.at || new Date().toISOString();
    return (payload.reports || []).map(function (r, idx) {
      return I.finalizeNormalized(
        I.baseRecord({
          id: "nir_ransom-" + String(r.family || idx).toLowerCase(),
          recordType: "ransomware-report",
          title: r.family + " ransomware awareness",
          summary: r.summary,
          publishedAt: r.firstSeenPublic || null,
          retrievedAt: retrievedAt,
          severity: "critical",
          confidence: "high",
          cveIds: r.relatedCves || [],
          industries: r.industries || [],
          citations: [{ label: "Public ransomware awareness sample", kind: "other", url: null }],
          provenance: [
            I.makeProvenance(connector, {
              retrievedAt: retrievedAt,
              sourceRecordId: r.family,
              verified: false,
              contentHash: I.simpleHash(JSON.stringify(r))
            })
          ],
          identityKeys: { primary: "ransom:" + String(r.family || "").toLowerCase() },
          targetEntityKind: "ransomware-family"
        })
      );
    });
  }

  function normalizePatch(connector, fixture) {
    var I = Ingest();
    var payload = fixture.payload || fixture;
    var retrievedAt = payload.at || new Date().toISOString();
    return (payload.bulletins || []).map(function (b, idx) {
      return I.finalizeNormalized(
        I.baseRecord({
          id: "nir_patch-" + String(b.id || idx).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          recordType: "patch-bulletin",
          title: b.title,
          summary: "Patch bulletin " + (b.id || "") + " from " + (b.vendor || "vendor") + ".",
          publishedAt: b.released || null,
          retrievedAt: retrievedAt,
          severity: "high",
          confidence: "high",
          cveIds: b.cves || [],
          advisoryIds: b.id ? [b.id] : [],
          products: b.products || [],
          vendors: b.vendor ? [b.vendor] : [],
          citations: [{ label: b.vendor || "Vendor", kind: "vendor", url: null }],
          provenance: [
            I.makeProvenance(connector, {
              retrievedAt: retrievedAt,
              sourceRecordId: b.id,
              verified: true,
              contentHash: I.simpleHash(JSON.stringify(b))
            })
          ],
          identityKeys: { primary: b.cves && b.cves[0] ? "cve:" + b.cves[0] : "adv:" + b.id },
          targetEntityKind: "patch",
          verified: true
        })
      );
    });
  }

  function normalizeBlog(connector, fixture) {
    var I = Ingest();
    var payload = fixture.payload || fixture;
    var retrievedAt = payload.at || new Date().toISOString();
    return (payload.posts || []).map(function (p, idx) {
      return I.finalizeNormalized(
        I.baseRecord({
          id: "nir_blog-" + idx + "-" + I.simpleHash(p.title).slice(0, 6),
          recordType: "research-item",
          title: p.title,
          summary: p.title,
          publishedAt: p.published || null,
          retrievedAt: retrievedAt,
          severity: "elevated",
          confidence: p.confidenceHint || "limited",
          cveIds: p.relatedCves || [],
          references: p.url ? [p.url] : [],
          citations: [{ label: "Threat intel blog sample", kind: "technical", url: p.url || null }],
          provenance: [
            I.makeProvenance(connector, {
              retrievedAt: retrievedAt,
              sourceUrl: p.url,
              verified: false,
              contentHash: I.simpleHash(JSON.stringify(p))
            })
          ],
          identityKeys: { primary: p.relatedCves && p.relatedCves[0] ? "cve:" + p.relatedCves[0] : undefined },
          targetEntityKind: "reference"
        })
      );
    });
  }

  function normalizeAcademic(connector, fixture) {
    var I = Ingest();
    var payload = fixture.payload || fixture;
    var retrievedAt = payload.at || new Date().toISOString();
    return (payload.papers || []).map(function (p, idx) {
      return I.finalizeNormalized(
        I.baseRecord({
          id: "nir_acad-" + idx + "-" + I.simpleHash(p.title).slice(0, 6),
          recordType: "research-item",
          title: p.title,
          summary: p.note || p.title,
          publishedAt: p.year ? p.year + "-01-01" : null,
          retrievedAt: retrievedAt,
          severity: "info",
          confidence: "moderate",
          cveIds: (p.topics || []).filter(function (t) {
            return /^CVE-/.test(t);
          }),
          citations: [{ label: "Academic placeholder", kind: "academic", url: p.doi }],
          provenance: [
            I.makeProvenance(connector, {
              retrievedAt: retrievedAt,
              sourceRecordId: p.doi,
              verified: false,
              contentHash: I.simpleHash(JSON.stringify(p))
            })
          ],
          identityKeys: { primary: "title:" + I.fingerprintTitle(p.title) },
          targetEntityKind: "reference"
        })
      );
    });
  }

  var NORMALIZERS = {
    "conn_nvd-cve": normalizeNvd,
    "conn_cisa-gov": normalizeCisa,
    "conn_vendor-microsoft-msrc": normalizeMsrc,
    "conn_security-advisories-curated": normalizeCuratedAdvisory,
    "conn_security-news-curated": normalizeNews,
    "conn_ransomware-tracking": normalizeRansomware,
    "conn_patch-bulletins": normalizePatch,
    "conn_threat-intel-blogs": normalizeBlog,
    "conn_academic-cyber": normalizeAcademic
  };

  function createRegistry(connectorsDoc) {
    var connectors = (connectorsDoc && connectorsDoc.connectors) || [];
    var map = byId(connectors);

    function get(id) {
      return map[id] || null;
    }

    function list() {
      return connectors.slice();
    }

    /**
     * Fetch+normalize a single connector. Never calls other connectors.
     */
    function runConnector(id, options) {
      options = options || {};
      var connector = get(id);
      if (!connector) return Promise.reject(new Error("Unknown connector " + id));
      var I = Ingest();
      if (!I) return Promise.reject(new Error("Ingest framework missing"));

      var base = options.rawBase || "../../design-system/signalterrain/intelligence/cyber/ingestion/samples/raw/";
      var fixtureName = options.fixture || id + ".json";
      var started = Date.now();

      // Prefer fresh cache unless force
      if (!options.force) {
        var cached = I.readCache(id, "normalized");
        if (cached.hit && !cached.expired && cached.payload) {
          return Promise.resolve({
            connectorId: id,
            fromCache: true,
            expired: false,
            latencyMs: 0,
            records: cached.payload.records || cached.payload,
            health: I.buildHealth(connector, {
              objectsIngested: (cached.payload.records || cached.payload || []).length,
              objectsNormalized: (cached.payload.records || cached.payload || []).length,
              objectsRejected: 0,
              averageLatencyMs: cached.entry && cached.entry.latencyMs,
              notes: "Served from local cache."
            }),
            cacheEntry: cached.entry
          });
        }
        // Graceful degradation: expired cache still usable
        if (cached.hit && cached.expired && cached.payload && options.allowExpired !== false) {
          return Promise.resolve({
            connectorId: id,
            fromCache: true,
            expired: true,
            latencyMs: 0,
            records: cached.payload.records || cached.payload,
            health: I.buildHealth(connector, {
              objectsIngested: (cached.payload.records || []).length,
              objectsNormalized: (cached.payload.records || []).length,
              failureCount: 0,
              notes: "Expired cache — provider unavailable or refresh deferred."
            }),
            cacheEntry: cached.entry,
            lastUpdatedMessage: "Last updated " + cached.entry.cachedAt + " (cache expired; still showing local copy)."
          });
        }
      }

      return loadJson(base + fixtureName)
        .then(function (fixture) {
          var norm = NORMALIZERS[id];
          if (!norm) throw new Error("No normalizer for " + id);
          var records = norm(connector, fixture);
          var rejected = records.filter(function (r) {
            return r.meta && r.meta.status === "rejected";
          });
          var okRecords = records.filter(function (r) {
            return !r.meta || r.meta.status !== "rejected";
          });
          var latencyMs = Date.now() - started;
          var entry = I.writeCache(
            connector,
            { records: okRecords },
            { payloadKind: "normalized", ok: true, latencyMs: latencyMs }
          );
          return {
            connectorId: id,
            fromCache: false,
            expired: false,
            latencyMs: latencyMs,
            records: okRecords,
            rejected: rejected,
            health: I.buildHealth(connector, {
              objectsIngested: records.length,
              objectsNormalized: okRecords.length,
              objectsRejected: rejected.length,
              averageLatencyMs: latencyMs,
              failureCount: 0
            }),
            cacheEntry: entry,
            lastUpdatedMessage: "Last updated " + entry.cachedAt
          };
        })
        .catch(function (err) {
          var cached = I.readCache(id, "normalized");
          if (cached.hit && cached.payload) {
            return {
              connectorId: id,
              fromCache: true,
              expired: !!cached.expired,
              latencyMs: Date.now() - started,
              records: cached.payload.records || cached.payload,
              health: I.buildHealth(connector, {
                failureCount: 1,
                objectsIngested: 0,
                objectsNormalized: (cached.payload.records || []).length,
                objectsRejected: 0,
                notes: "Fetch failed; using local cache. " + (err && err.message)
              }),
              cacheEntry: cached.entry,
              lastUpdatedMessage: "Provider unavailable. Showing cached data from " + cached.entry.cachedAt + ".",
              error: String(err && err.message)
            };
          }
          I.writeCache(connector, { records: [] }, { ok: false, errorMessage: String(err && err.message), latencyMs: Date.now() - started });
          throw err;
        });
    }

    /**
     * Run connectors independently, then optionally dedupe across results
     * in the pipeline layer (not inside connectors).
     */
    function runAll(options) {
      options = options || {};
      var ids = options.ids || connectors.map(function (c) {
        return c.id;
      });
      return Promise.all(
        ids.map(function (id) {
          return runConnector(id, options).catch(function (err) {
            var In = Ingest();
            var c = get(id);
            return {
              connectorId: id,
              error: String(err && err.message),
              records: [],
              health: In && c ? In.buildHealth(c, { failureCount: 1, notes: String(err && err.message) }) : null
            };
          });
        })
      ).then(function (results) {
        var I = Ingest();
        var flat = [];
        results.forEach(function (r) {
          (r.records || []).forEach(function (rec) {
            flat.push(rec);
          });
        });
        var deduped = I.dedupePreserveAttribution(flat);
        return {
          results: results,
          merged: deduped.records,
          mergeCount: deduped.mergeCount,
          independentSourceCounts: deduped.independentSourceCounts,
          health: results.map(function (r) {
            return r.health;
          })
        };
      });
    }

    return {
      get: get,
      list: list,
      runConnector: runConnector,
      runAll: runAll,
      normalizers: Object.keys(NORMALIZERS)
    };
  }

  function loadRegistry(url) {
    url = url || "../../design-system/signalterrain/intelligence/cyber/ingestion/connectors.json";
    return loadJson(url).then(createRegistry);
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainCyberConnectors = {
    createRegistry: createRegistry,
    loadRegistry: loadRegistry,
    NORMALIZERS: NORMALIZERS
  };
})(typeof window !== "undefined" ? window : globalThis);
