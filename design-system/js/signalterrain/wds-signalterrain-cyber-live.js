/**
 * SignalTerrain Cyber — Live Intelligence Dashboard (Product Recovery)
 * Reads data/cyber/live.json only. Never loads sample/fixture intelligence.
 * Home experience: Today's Cyber Brief. Task nav for detail.
 */
(function (global) {
  "use strict";

  var BANNED_SAMPLE_PATHS = [
    "cyber-intelligence.sample.json",
    "workspace.seed.json",
    "research-workspace.sample.json",
    "quiet-day.brief.json",
    "ingestion/samples/raw"
  ];

  var CACHE_KEY = "st_cyber_live_cache_v3";
  var CACHE_TTL_MS = 5 * 60 * 1000;

  var NAV = [
    ["brief", "Overview"],
    ["briefings", "Briefings"],
    ["threats", "Threats"],
    ["vulnerabilities", "Vulnerabilities"],
    ["kev", "KEV"],
    ["ransomware", "Ransomware"],
    ["zeroday", "Zero-Day"],
    ["advisories", "Advisories"],
    ["outages", "Outages"],
    ["timeline", "Timeline"],
    ["trends", "Trends"],
    ["feeds", "Feeds"],
    ["search", "Search"],
    ["history", "History"],
    ["settings", "Settings"]
  ];

  var PERSONA_KEY = "st_cyber_persona_v1";

  function Util() {
    return global.WDS && global.WDS.signalTerrainUtil;
  }

  function Inventory() {
    return global.WDS && global.WDS.signalTerrainInventory;
  }

  function esc(s) {
    var u = Util();
    if (u && u.esc) return u.esc(s);
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadJson(url) {
    if (BANNED_SAMPLE_PATHS.some(function (b) { return String(url).indexOf(b) >= 0; })) {
      return Promise.reject(new Error("Refusing to load sample/fixture path in live dashboard: " + url));
    }
    try {
      var cached = global.sessionStorage && global.sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed && parsed.url === url && parsed.at && Date.now() - parsed.at < CACHE_TTL_MS && parsed.doc) {
          return Promise.resolve(parsed.doc);
        }
      }
    } catch (e) { /* ignore cache */ }

    var u = Util();
    var p = u && u.loadJson
      ? u.loadJson(url)
      : fetch(url, { credentials: "same-origin", cache: "no-cache" }).then(function (r) {
          if (!r.ok) throw new Error("Failed to load " + url + " (" + r.status + ")");
          return r.json();
        });
    return p.then(function (doc) {
      try {
        if (global.sessionStorage) {
          global.sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ url: url, at: Date.now(), doc: doc })
          );
        }
      } catch (e2) { /* ignore */ }
      return doc;
    });
  }

  function parseHash() {
    var h = String(global.location.hash || "").replace(/^#/, "");
    if (!h) return { panel: "brief", id: null };
    var parts = h.split("/");
    var panel = parts[0] || "brief";
    // Legacy aliases
    if (panel === "posture" || panel === "today" || panel === "immediate") panel = "brief";
    if (panel === "providers" || panel === "about") panel = "feeds";
    if (panel === "profile") panel = "settings";
    if (panel === "releases") panel = "advisories";
    if (panel === "signal") panel = "briefings";
    return { panel: panel, id: parts[1] || null };
  }

  function setHash(panel, id) {
    global.location.hash = id ? panel + "/" + id : panel;
  }

  function profileTermsFromInventory() {
    var Inv = Inventory();
    if (!Inv) return [];
    return (Inv.list() || []).filter(function (it) {
      return !it.disabled;
    });
  }

  function matchProfile(rec, items) {
    var vendors = ((rec.entities && rec.entities.vendors) || []).map(function (v) {
      return String(v).toLowerCase();
    });
    var products = ((rec.entities && rec.entities.products) || []).map(function (v) {
      return String(v).toLowerCase();
    });
    var blob = (rec.title + " " + rec.summary + " " + products.join(" ") + " " + vendors.join(" ")).toLowerCase();
    var best = { level: "none", label: "No declared technology match", detail: "" };
    (items || []).forEach(function (term) {
      var t = String(term.name || "").toLowerCase().trim();
      if (t.length < 2) return;
      var vendor = String(term.vendor || "").toLowerCase();
      var productHit =
        products.some(function (p) {
          return p.indexOf(t) >= 0 || t.indexOf(p) >= 0;
        }) || blob.indexOf(t) >= 0;
      var vendorHit =
        (vendor &&
          vendors.some(function (v) {
            return v.indexOf(vendor) >= 0 || vendor.indexOf(v) >= 0;
          })) ||
        vendors.some(function (v) {
          return v.indexOf(t) >= 0 || t.indexOf(v) >= 0;
        });
      if (productHit && products.some(function (p) { return p === t || p.indexOf(t) >= 0; })) {
        best = { level: "exact", label: "Direct product match", detail: term.name };
      } else if (productHit && best.level !== "exact") {
        best = { level: "exact", label: "Direct product match", detail: term.name };
      } else if (vendorHit && (best.level === "none" || best.level === "platform" || best.level === "ambiguous")) {
        best = { level: "vendor", label: "Possible vendor match", detail: term.name };
      } else if (blob.indexOf(t) >= 0 && t.length >= 4 && best.level === "none") {
        best = { level: "ambiguous", label: "Ambiguous possible match", detail: term.name };
      }
    });
    return best;
  }

  function rescore(rec, items) {
    var base = (rec.priority && rec.priority.contributions) || [];
    var withoutProfile = base.filter(function (c) {
      return String(c.factorId || "").indexOf("profile_") !== 0;
    });
    var sub = withoutProfile.reduce(function (s, c) {
      return s + (c.points || 0);
    }, 0);
    var match = matchProfile(rec, items);
    var profilePts = 0;
    var profileReason = match.label;
    if (match.level === "exact") {
      profilePts = 18;
      profileReason = "Direct product match: " + match.detail;
    } else if (match.level === "vendor") {
      profilePts = 8;
      profileReason = "Possible vendor match: " + match.detail;
    } else if (match.level === "platform") {
      profilePts = 5;
      profileReason = "Platform may be relevant: " + match.detail;
    } else if (match.level === "ambiguous") {
      profilePts = 2;
      profileReason = "Ambiguous possible match: " + match.detail;
    } else {
      profileReason = "No declared technology match in your profile.";
    }
    var contributions = withoutProfile.concat([
      { factorId: "profile_" + match.level, points: profilePts, maxPoints: 18, reason: profileReason }
    ]);
    var total = Math.max(0, Math.min(100, Math.round(sub + profilePts)));
    var band = "Informational";
    if (total >= 80) band = "Immediate";
    else if (total >= 60) band = "High";
    else if (total >= 35) band = "Monitor";
    var why = contributions
      .filter(function (c) {
        return c.points > 0;
      })
      .sort(function (a, b) {
        return b.points - a.points;
      })
      .slice(0, 5)
      .map(function (c) {
        return c.reason;
      })
      .join(" ");
    return {
      score: total,
      band: band,
      contributions: contributions,
      explanation: "Priority " + total + " — " + band + ". " + why,
      profileMatch: match
    };
  }

  function applyProfile(records, items) {
    return (records || [])
      .map(function (r) {
        return Object.assign({}, r, { priority: rescore(r, items) });
      })
      .sort(function (a, b) {
        var hideA = a.noise && a.noise.hideByDefault ? 1 : 0;
        var hideB = b.noise && b.noise.hideByDefault ? 1 : 0;
        if (hideA !== hideB) return hideA - hideB;
        return (b.priority.score || 0) - (a.priority.score || 0);
      });
  }

  function loadPersona() {
    try {
      return global.localStorage && global.localStorage.getItem(PERSONA_KEY);
    } catch (e) {
      return null;
    }
  }

  function savePersona(id) {
    try {
      if (global.localStorage) {
        if (id) global.localStorage.setItem(PERSONA_KEY, id);
        else global.localStorage.removeItem(PERSONA_KEY);
      }
    } catch (e2) { /* ignore */ }
  }

  function visibleRecords(records, showNoise) {
    if (showNoise) return records || [];
    return (records || []).filter(function (r) {
      return !(r.noise && r.noise.hideByDefault);
    });
  }

  function actionClass(action) {
    if (action === "patch-immediately" || action === "disable-exposed-service") return "st-live-action st-live-action--urgent";
    if (action === "increase-monitoring" || action === "review-vendor-advisory") return "st-live-action st-live-action--soon";
    if (action === "ignore") return "st-live-action st-live-action--quiet";
    return "st-live-action";
  }

  function bandClass(band) {
    if (band === "Immediate") return "st-live-band st-live-band--immediate";
    if (band === "High") return "st-live-band st-live-band--high";
    if (band === "Monitor") return "st-live-band st-live-band--monitor";
    return "st-live-band";
  }

  /** User-facing priority vocabulary (engine bands → briefing language). */
  function bandLabel(band) {
    if (band === "Immediate") return "Critical";
    if (band === "High") return "High";
    if (band === "Monitor") return "Medium";
    return "Informational";
  }

  function bandWhy(band) {
    if (band === "Immediate") {
      return "Critical — known exploitation, severe exposure, or time-sensitive defensive action.";
    }
    if (band === "High") {
      return "High — material risk or widespread advisory; confirm relevance and plan remediation.";
    }
    if (band === "Monitor") {
      return "Medium — worth tracking; not the first thing to interrupt your day unless it matches your stack.";
    }
    return "Informational — context and awareness; low urgency unless your profile elevates it.";
  }

  function trustBadge(state) {
    return '<span class="st-live-trust" data-trust="' + esc(state || "Unknown") + '">' + esc(state || "Unknown") + "</span>";
  }

  /** Max age for presenting trustState "Live" honestly (ms). */
  var LIVE_MAX_AGE_MS = 36 * 60 * 60 * 1000;

  /**
   * Effective trust for display — never show Live when the artifact is stale.
   * Returns { trustState, ageMs, generatedAt, stale }.
   */
  function effectiveTrust(doc, nowMs) {
    var meta = (doc && doc.meta) || {};
    var raw = meta.trustState || "Unknown";
    var gen = meta.generatedAt || null;
    var now = typeof nowMs === "number" ? nowMs : Date.now();
    var ageMs = null;
    if (gen) {
      var t = Date.parse(gen);
      if (!isNaN(t)) ageMs = Math.max(0, now - t);
    }
    var trust = raw;
    var stale = ageMs != null && ageMs > LIVE_MAX_AGE_MS;
    if (stale && (raw === "Live" || raw === "Partial")) {
      trust = "Stale";
    } else if (stale && raw === "Cached") {
      trust = "Stale";
    }
    return { trustState: trust, ageMs: ageMs, generatedAt: gen, stale: !!stale, rawTrust: raw };
  }

  function formatAge(ageMs) {
    if (ageMs == null) return "unknown age";
    var h = Math.floor(ageMs / 3600000);
    if (h < 1) return "under 1 hour old";
    if (h < 48) return h + " hour" + (h === 1 ? "" : "s") + " old";
    var d = Math.floor(h / 24);
    return d + " day" + (d === 1 ? "" : "s") + " old";
  }

  function providerTrustStrip(doc) {
    var providers = (doc && doc.providers) || [];
    var ok = providers.filter(function (p) {
      return p.status === "ok";
    }).length;
    var failed = providers.filter(function (p) {
      return p.status === "error" || p.status === "timeout" || p.status === "failed";
    });
    var planned = providers.filter(function (p) {
      return p.status === "planned";
    }).length;
    var cached = providers.filter(function (p) {
      return p.status === "cached" || p.status === "stale";
    }).length;
    var eff = effectiveTrust(doc);
    var gen = eff.generatedAt || "—";
    return (
      '<div class="st-live-trust-strip" role="status">' +
      "<p><strong>Trust:</strong> " +
      trustBadge(eff.trustState) +
      " · refreshed " +
      esc(String(gen).slice(0, 19)) +
      " (" +
      esc(formatAge(eff.ageMs)) +
      ")" +
      " · " +
      esc(String(ok)) +
      " providers ok" +
      (cached ? " · " + esc(String(cached)) + " cached" : "") +
      (planned ? " · " + esc(String(planned)) + " planned (not faked live)" : "") +
      "</p>" +
      (eff.stale
        ? "<p class=\"st-live-stale-warn\"><strong>Not current:</strong> This brief is older than 36 hours. Treat it as historical public-source context, not a live feed. Refresh has not completed recently.</p>"
        : "") +
      (failed.length
        ? "<p><strong>Unavailable now:</strong> " +
          esc(
            failed
              .map(function (p) {
                return p.providerName || p.providerId;
              })
              .join(", ")
          ) +
          ' · <a href="#feeds">Provider health</a></p>'
        : '<p>All active providers responded or are planned. <a href="#feeds">Provider health</a></p>') +
      "</div>"
    );
  }

  function filterRecords(records, state) {
    return (records || []).filter(function (r) {
      if (!state.showNoise && r.noise && r.noise.hideByDefault) return false;
      if (state.q) {
        var blob = (
          r.title +
          " " +
          r.summary +
          " " +
          ((r.identifiers && r.identifiers.cves) || []).join(" ") +
          " " +
          ((r.identifiers && r.identifiers.ghsa) || "") +
          " " +
          ((r.entities && r.entities.vendors) || []).join(" ") +
          " " +
          ((r.entities && r.entities.products) || []).join(" ") +
          " " +
          (r.type || "") +
          " " +
          ((r.recommendation && r.recommendation.label) || "")
        ).toLowerCase();
        if (blob.indexOf(state.q.toLowerCase()) < 0) return false;
      }
      if (state.band !== "all" && (r.priority && r.priority.band) !== state.band) return false;
      if (state.kevOnly && !(r.exploitation && r.exploitation.knownExploited)) return false;
      if (state.type !== "all" && r.type !== state.type) return false;
      if (state.provider !== "all" && r.source && r.source.providerId !== state.provider) return false;
      if (state.profileOnly) {
        var lvl = r.priority && r.priority.profileMatch && r.priority.profileMatch.level;
        if (!lvl || lvl === "none") return false;
      }
      if (state.persona) {
        var personas = r.personas || [];
        var hit = personas.some(function (p) {
          return p.personaId === state.persona;
        });
        if (!hit) return false;
      }
      return true;
    });
  }

  function cardHtml(r) {
    var cves = ((r.identifiers && r.identifiers.cves) || []).join(", ");
    var vendors = ((r.entities && r.entities.vendors) || []).join(", ");
    var products = ((r.entities && r.entities.products) || []).join(", ");
    var rec = r.recommendation || {};
    var risk = r.risk || {};
    var merged = r.enrichment && r.enrichment.mergedDuplicates;
    return (
      '<article class="st-live-card' +
      (r.noise && r.noise.hideByDefault ? " st-live-card--noise" : "") +
      '">' +
      '<div class="st-live-card-top">' +
      '<span class="' +
      bandClass(r.priority && r.priority.band) +
      '">' +
      esc(bandLabel(r.priority && r.priority.band)) +
      " · " +
      esc(String((r.priority && r.priority.score) || "—")) +
      "</span>" +
      (rec.label
        ? '<span class="' + actionClass(rec.action) + '">' + esc(rec.label) + "</span>"
        : "") +
      '<span class="st-ws-meta">' +
      esc(r.type) +
      "</span></div>" +
      "<h3><a href=\"#record/" +
      encodeURIComponent(r.id) +
      "\">" +
      esc(r.title) +
      "</a></h3>" +
      "<p>" +
      esc((risk.plainSummary || r.summary || "").slice(0, 260)) +
      ((risk.plainSummary || r.summary || "").length > 260 ? "…" : "") +
      "</p>" +
      '<ul class="st-live-meta">' +
      (cves ? "<li><strong>CVE:</strong> " + esc(cves) + "</li>" : "") +
      (vendors || products
        ? "<li><strong>Affects:</strong> " + esc([vendors, products].filter(Boolean).join(" / ")) + "</li>"
        : "") +
      (rec.why ? "<li><strong>Why this matters:</strong> " + esc(rec.why) + "</li>" : "") +
      "<li><strong>Why ranked " +
      esc(bandLabel(r.priority && r.priority.band)) +
      ":</strong> " +
      esc((r.priority && r.priority.explanation) || "") +
      "</li>" +
      (merged
        ? "<li><strong>Deduped:</strong> " + esc(String(merged + 1)) + " related reports merged</li>"
        : "") +
      "<li><strong>Source:</strong> " +
      esc((r.source && (r.source.providerName || r.source.providerId)) || "—") +
      (r.source && r.source.providerId ? " (" + esc(r.source.providerId) + ")" : "") +
      (r.source && r.source.sourceUrl
        ? ' · <a href="' +
          esc(r.source.sourceUrl) +
          '" rel="noopener noreferrer" target="_blank">Open</a>'
        : "") +
      "</li>" +
      "<li><strong>Retrieved:</strong> " +
      esc(String(r.retrievedAt || "—").slice(0, 19)) +
      (r.confidence != null
        ? " · <strong>Confidence:</strong> " + esc(String(r.confidence))
        : r.source && r.source.confidence != null
          ? " · <strong>Confidence:</strong> " + esc(String(r.source.confidence))
          : "") +
      "</li>" +
      "</ul></article>"
    );
  }

  function noiseToolbar(state) {
    var hidden =
      (state.doc && state.doc.meta && state.doc.meta.counts && state.doc.meta.counts.hiddenByDefault) ||
      (state.doc && state.doc.signal && state.doc.signal.noise && state.doc.signal.noise.hideByDefaultCount) ||
      0;
    return (
      '<div class="st-live-toolbar">' +
      '<label class="st-live-noise-toggle"><input type="checkbox" id="st-show-noise"' +
      (state.showNoise ? " checked" : "") +
      "/> Show low-signal (" +
      esc(String(hidden)) +
      " hidden)</label>" +
      '<span class="st-ws-meta">Signal engine ' +
      esc(
        (state.doc && state.doc.meta && state.doc.meta.signalEngineVersion) ||
          (state.doc && state.doc.signal && state.doc.signal.meta && state.doc.signal.meta.version) ||
          "—"
      ) +
      "</span></div>"
    );
  }

  function listPanel(title, lead, list, state) {
    return (
      (state ? noiseToolbar(state) : "") +
      "<h1 class=\"st-live-section-title\">" +
      esc(title) +
      "</h1>" +
      '<p class="st-live-lead">' +
      esc(lead) +
      "</p>" +
      (list.length
        ? list.map(cardHtml).join("")
        : '<p class="st-live-lead">No matching verified records in the live artifact.</p>')
    );
  }

  function byIdMap(records) {
    var m = Object.create(null);
    (records || []).forEach(function (r) {
      m[r.id] = r;
    });
    return m;
  }

  function mountLive(root, options) {
    options = options || {};
    if (!root) return Promise.reject(new Error("mount root required"));
    try {
      if (global.performance && performance.mark) performance.mark("st-cyber-mount-start");
    } catch (e0) { /* noop */ }
    root.setAttribute("aria-busy", "true");
    var Boot = global.WDS && global.WDS.platformBoot;
    if (Boot && Boot.mount) {
      Boot.mount(root, {
        product: "SignalTerrain Cyber",
        title: "Today’s cyber brief",
        detail: "Loading verified public intelligence. Sample threats are never substituted.",
        status: "Fetching live artifact…"
      });
      if (Boot.watch) {
        Boot.watch(root, {
          product: "SignalTerrain Cyber",
          title: "Cyber intelligence is taking too long",
          detail: "The live artifact did not finish loading. Retry, or check provider/engine health.",
          homeHref: "../",
          supportHref: "../../../support.html",
          timeoutMs: 20000,
          onRetry: function () {
            mountLive(root, options);
          }
        });
      }
    } else {
      root.innerHTML = '<p class="st-loading">Loading verified cyber intelligence…</p>';
    }

    var liveUrl = options.liveUrl || "../../../data/cyber/live.json";
    var historyUrl = options.historyUrl || "../../../data/cyber/history.json";
    var state = {
      q: "",
      band: "all",
      type: "all",
      provider: "all",
      kevOnly: false,
      profileOnly: false,
      showNoise: false,
      persona: loadPersona() || "",
      timelineSeverity: "all",
      timelineCategory: "all",
      timelineVendor: "",
      doc: null,
      records: [],
      historyDoc: null
    };

    if (Boot && Boot.status) Boot.status(root, "Loading live.json…");

    return loadJson(liveUrl)
      .catch(function (err) {
        if (Boot && Boot.fail) {
          Boot.fail(root, {
            product: "SignalTerrain Cyber",
            title: "No verified cyber intelligence yet",
            detail:
              (err && err.message ? err.message + " — " : "") +
              "Run node scripts/signalterrain-cyber-live-engine.mjs. Sample data will not be substituted.",
            homeHref: "../",
            supportHref: "../../../support.html",
            onRetry: function () {
              mountLive(root, options);
            }
          });
        } else {
          root.innerHTML =
            '<div class="st-live-app" role="alert">' +
            "<h1>No verified cyber intelligence has been retrieved yet.</h1>" +
            "<p>Run <code>node scripts/signalterrain-cyber-live-engine.mjs</code>. Sample data will not be substituted.</p>" +
            "<p class=\"st-live-lead\">" +
            esc(String(err && err.message ? err.message : err)) +
            "</p>" +
            '<p><button type="button" class="wds-btn wds-btn--primary wds-btn--sm" onclick="location.reload()">Retry</button></p></div>';
          root.removeAttribute("aria-busy");
        }
        throw err;
      })
      .then(function (doc) {
        if (!doc || !Array.isArray(doc.records)) {
          if (Boot && Boot.fail) {
            Boot.fail(root, {
              product: "SignalTerrain Cyber",
              title: "Live artifact is malformed",
              detail: "Sample data will not be substituted.",
              onRetry: function () {
                mountLive(root, options);
              }
            });
          } else {
            root.innerHTML = '<p role="alert">Live artifact is malformed. Sample data will not be substituted.</p>';
            root.removeAttribute("aria-busy");
          }
          return;
        }
        if (Boot && Boot.clear) Boot.clear(root);
        if (Boot && Boot.status) Boot.status(root, "Building brief…");
        state.doc = doc;
        state.records = applyProfile(doc.records, profileTermsFromInventory());
        // Soft-load history (non-blocking)
        loadJson(historyUrl)
          .then(function (h) {
            state.historyDoc = h;
          })
          .catch(function () {
            state.historyDoc = { entries: doc.historyPreview || [] };
          });

        function navHtml() {
          var route = parseHash();
          return (
            '<nav class="st-live-nav" aria-label="Cyber intelligence">' +
            "<ul>" +
            NAV.map(function (p) {
              var cur = route.panel === p[0] || (route.panel === "record" && p[0] === "threats");
              return (
                "<li><a href=\"#" +
                p[0] +
                "\"" +
                (cur ? ' aria-current="page"' : "") +
                ">" +
                esc(p[1]) +
                "</a></li>"
              );
            }).join("") +
            "</ul></nav>"
          );
        }

        function briefPanel() {
          var brief = state.doc.brief;
          var signal = state.doc.signal || {};
          var briefings = signal.briefings || {};
          var activeKind = briefings.activeKind || "morning";
          var active = briefings[activeKind] || null;
          var surfaced = visibleRecords(state.records, state.showNoise).filter(function (r) {
            return r.type !== "service-outage" || !(r.rawProviderMetadata && r.rawProviderMetadata.healthy);
          });
          var byBand = {
            Immediate: [],
            High: [],
            Monitor: [],
            Informational: []
          };
          surfaced.forEach(function (r) {
            var b = (r.priority && r.priority.band) || "Informational";
            if (!byBand[b]) b = "Informational";
            byBand[b].push(r);
          });
          var bullets =
            brief && brief.bullets && brief.bullets.length
              ? brief.bullets
              : [{ text: "Brief not present in artifact — showing highest-priority verified items instead." }].concat(
                  surfaced.slice(0, 5).map(function (r) {
                    return { text: r.title };
                  })
                );
          var trendsNarrative = ((signal.trends && signal.trends.narrative) || []).slice(0, 3);
          var hidden =
            (state.doc.meta && state.doc.meta.counts && state.doc.meta.counts.hiddenByDefault) ||
            (signal.noise && signal.noise.hideByDefaultCount) ||
            0;

          function bandBlock(engineBand) {
            var list = byBand[engineBand] || [];
            if (!list.length) return "";
            return (
              '<section class="st-live-band-block" aria-labelledby="st-band-' +
              esc(engineBand) +
              '">' +
              '<h2 class="st-live-band-block__title" id="st-band-' +
              esc(engineBand) +
              '">' +
              esc(bandLabel(engineBand)) +
              " (" +
              list.length +
              ")</h2>" +
              '<p class="st-live-band-block__why">' +
              esc(bandWhy(engineBand)) +
              "</p>" +
              list
                .slice(0, engineBand === "Immediate" || engineBand === "High" ? 5 : 3)
                .map(cardHtml)
                .join("") +
              (list.length > (engineBand === "Immediate" || engineBand === "High" ? 5 : 3)
                ? '<p class="st-live-lead"><a href="#threats">See all ' +
                  esc(bandLabel(engineBand).toLowerCase()) +
                  " items →</a></p>"
                : "") +
              "</section>"
            );
          }

          return (
            noiseToolbar(state) +
            '<section class="st-live-brief" aria-labelledby="st-brief-title">' +
            '<p class="st-live-brief__eyebrow">Operational intelligence · ' +
            esc((active && active.title) || (brief && brief.title) || "Today's Cyber Brief") +
            "</p>" +
            '<h1 class="st-live-brief__title" id="st-brief-title">What changed — and what deserves attention?</h1>' +
            '<p class="st-live-brief__question">Why it matters, who is affected, and what is low priority today.</p>' +
            '<p class="st-live-brief__meta">Generated ' +
            esc((brief && brief.generatedAt) || (state.doc.meta && state.doc.meta.generatedAt) || "—") +
            " · " +
            esc(String(surfaced.length)) +
            " surfaced / " +
            esc(String(state.records.length)) +
            " total · " +
            esc(String(hidden)) +
            " low-signal hidden</p>" +
            providerTrustStrip(state.doc) +
            '<div class="st-live-stats" aria-label="Priority counts">' +
            '<div class="st-live-stat"><strong>' +
            byBand.Immediate.length +
            "</strong><span>Critical</span></div>" +
            '<div class="st-live-stat"><strong>' +
            byBand.High.length +
            "</strong><span>High</span></div>" +
            '<div class="st-live-stat"><strong>' +
            byBand.Monitor.length +
            "</strong><span>Medium</span></div>" +
            '<div class="st-live-stat"><strong>' +
            byBand.Informational.length +
            "</strong><span>Info</span></div>" +
            "</div>" +
            '<h2 class="st-live-section-title" style="font-size:1.05rem">What should I pay attention to?</h2>' +
            '<ul class="st-live-brief__list">' +
            bullets
              .map(function (b) {
                return (
                  "<li>" +
                  esc(b.text || b) +
                  (b.why ? '<span class="st-live-brief__why"> — ' + esc(b.why) + "</span>" : "") +
                  "</li>"
                );
              })
              .join("") +
            "</ul>" +
            (brief && brief.whoShouldCare && brief.whoShouldCare.length
              ? '<p class="st-live-brief__rec"><strong>Who should care:</strong> ' +
                esc(brief.whoShouldCare.join(" · ")) +
                "</p>"
              : "") +
            (brief && brief.recommendation
              ? '<p class="st-live-brief__rec"><strong>Recommended focus:</strong> ' +
                esc(brief.recommendation) +
                "</p>"
              : "") +
            (brief && brief.expectedFuture && brief.expectedFuture.length
              ? '<p class="st-live-lead"><strong>Expected next:</strong> ' +
                esc(brief.expectedFuture.join(" ")) +
                "</p>"
              : "") +
            (trendsNarrative.length
              ? '<div class="st-live-trends-snip"><h2 class="st-live-section-title" style="font-size:1.05rem">Trend read</h2><ul class="st-live-brief__list">' +
                trendsNarrative
                  .map(function (t) {
                    return "<li>" + esc(t) + "</li>";
                  })
                  .join("") +
                '</ul><p><a href="#trends">Full trend analysis →</a></p></div>'
              : "") +
            '<p class="st-live-lead">' +
            esc((brief && brief.method) || "Interpretation of provider-backed records only.") +
            ' Low-signal items stay hidden unless you enable them. <a href="#briefings">All briefings</a> · <a href="#feeds">Feeds</a></p></section>' +
            bandBlock("Immediate") +
            bandBlock("High") +
            bandBlock("Monitor") +
            '<p class="st-live-lead st-live-lowpri"><strong>Low priority today:</strong> ' +
            esc(String(byBand.Informational.length)) +
            " informational items and " +
            esc(String(hidden)) +
            " hidden low-signal records — open <a href=\"#threats\">Threats</a> or enable low-signal only when you need depth.</p>"
          );
        }

        function briefingPackHtml(pack) {
          if (!pack) return "";
          return (
            '<section class="st-briefing-pack">' +
            "<h2>" +
            esc(pack.title) +
            "</h2>" +
            "<h3>What changed</h3><ul class=\"st-live-brief__list\">" +
            (pack.whatChanged || [])
              .map(function (t) {
                return "<li>" + esc(t) + "</li>";
              })
              .join("") +
            "</ul>" +
            "<h3>Why it matters</h3><ul class=\"st-live-meta\">" +
            (pack.whyItMatters || [])
              .map(function (t) {
                return "<li>" + esc(t) + "</li>";
              })
              .join("") +
            "</ul>" +
            "<h3>Who should care</h3><ul class=\"st-live-meta\">" +
            (pack.whoShouldCare || [])
              .map(function (t) {
                return "<li>" + esc(t) + "</li>";
              })
              .join("") +
            "</ul>" +
            "<h3>Recommended actions</h3><ul class=\"st-live-meta\">" +
            (pack.recommendedActions || [])
              .map(function (a) {
                return (
                  "<li><span class=\"" +
                  actionClass(a.action) +
                  "\">" +
                  esc(a.label) +
                  "</span> — " +
                  esc(a.why) +
                  (a.recordId
                    ? ' <a href="#record/' + encodeURIComponent(a.recordId) + '">Open</a>'
                    : "") +
                  "</li>"
                );
              })
              .join("") +
            "</ul>" +
            "<h3>Expected future developments</h3><ul class=\"st-live-meta\">" +
            (pack.expectedFuture || [])
              .map(function (t) {
                return "<li>" + esc(t) + "</li>";
              })
              .join("") +
            "</ul></section>"
          );
        }

        function briefingsPanel() {
          var b = (state.doc.signal && state.doc.signal.briefings) || {};
          return (
            "<h1 class=\"st-live-section-title\">Operational briefings</h1>" +
            '<p class="st-live-lead">Morning, evening, weekly, and critical views — built from verified records, not headlines.</p>' +
            briefingPackHtml(b.morning) +
            briefingPackHtml(b.evening) +
            briefingPackHtml(b.weekly) +
            briefingPackHtml(b.critical)
          );
        }

        function trendsPanel() {
          var trends = (state.doc.signal && state.doc.signal.trends) || {};
          var list = trends.trends || [];
          return (
            "<h1 class=\"st-live-section-title\">Trend analysis</h1>" +
            '<p class="st-live-lead">Interpreted shifts vs the previous live artifact — not raw charts.</p>' +
            ((trends.narrative || [])
              .map(function (n) {
                return '<p class="st-live-brief__rec">' + esc(n) + "</p>";
              })
              .join("") ||
              '<p class="st-live-lead">No interpretive narrative yet (need a prior artifact for deltas).</p>') +
            '<table class="st-health-table"><thead><tr><th>Theme</th><th>Now</th><th>Prev</th><th>Δ</th><th>Read</th></tr></thead><tbody>' +
            list
              .map(function (t) {
                return (
                  "<tr><td>" +
                  esc(t.label) +
                  "</td><td>" +
                  esc(String(t.current)) +
                  "</td><td>" +
                  esc(String(t.previous)) +
                  "</td><td>" +
                  esc(String(t.delta) + " (" + t.direction + ")") +
                  "</td><td>" +
                  esc(t.interpretation) +
                  "</td></tr>"
                );
              })
              .join("") +
            "</tbody></table>"
          );
        }

        function timelinePanel() {
          var tl = (state.doc.signal && state.doc.signal.timeline) || { events: [] };
          var events = (tl.events || []).filter(function (e) {
            if (!state.showNoise && e.hideByDefault) return false;
            if (state.timelineCategory !== "all" && e.category !== state.timelineCategory) return false;
            if (state.timelineSeverity !== "all" && String(e.severity).toLowerCase() !== state.timelineSeverity) {
              return false;
            }
            if (state.timelineVendor) {
              var v = state.timelineVendor.toLowerCase();
              var hit = (e.vendors || []).some(function (x) {
                return String(x).toLowerCase().indexOf(v) >= 0;
              });
              if (!hit) return false;
            }
            return true;
          });
          return (
            noiseToolbar(state) +
            "<h1 class=\"st-live-section-title\">Unified timeline</h1>" +
            '<p class="st-live-lead">KEV, vulnerabilities, advisories/patches, outages, ransomware flags — filter to reduce noise.</p>' +
            '<form id="st-timeline-filter" class="st-ws-form">' +
            "<label>Category <select name=\"cat\">" +
            ["all", "kev", "vulnerability", "patch-or-advisory", "outage", "ransomware", "other"]
              .map(function (c) {
                return (
                  "<option value=\"" +
                  c +
                  "\"" +
                  (state.timelineCategory === c ? " selected" : "") +
                  ">" +
                  c +
                  "</option>"
                );
              })
              .join("") +
            "</select></label>" +
            "<label>Severity <select name=\"sev\">" +
            ["all", "critical", "high", "medium", "low", "unknown"]
              .map(function (s) {
                return (
                  "<option" + (state.timelineSeverity === s ? " selected" : "") + ">" + s + "</option>"
                );
              })
              .join("") +
            "</select></label>" +
            "<label>Vendor contains <input name=\"vendor\" value=\"" +
            esc(state.timelineVendor) +
            "\"/></label>" +
            '<button type="submit" class="wds-btn wds-btn--primary">Filter</button></form>' +
            '<ol class="st-timeline">' +
            events
              .slice(0, 80)
              .map(function (e) {
                return (
                  "<li><time>" +
                  esc(String(e.at).slice(0, 10)) +
                  "</time> <span class=\"st-ws-meta\">" +
                  esc(e.category) +
                  "</span> " +
                  '<a href="#record/' +
                  encodeURIComponent(e.recordId) +
                  '">' +
                  esc(e.title) +
                  "</a></li>"
                );
              })
              .join("") +
            "</ol>"
          );
        }

        function recordDetail(id) {
          var r = state.records.filter(function (x) {
            return x.id === id;
          })[0];
          if (!r) return '<p role="alert">Record not found in the live artifact.</p>';
          var factors = ((r.priority && r.priority.contributions) || [])
            .filter(function (c) {
              return c.points > 0;
            })
            .sort(function (a, b) {
              return b.points - a.points;
            })
            .map(function (c) {
              return (
                "<li><strong>+" +
                esc(String(c.points)) +
                "</strong> " +
                esc(c.reason) +
                "</li>"
              );
            })
            .join("");
          var who =
            (r.risk && r.risk.whoIsAffected) ||
            (r.priority && r.priority.profileMatch && r.priority.profileMatch.level === "exact"
              ? "You declared related technology (“" + r.priority.profileMatch.detail + "”) — confirm versions."
              : r.priority && r.priority.profileMatch && r.priority.profileMatch.level === "vendor"
                ? "Possible vendor overlap with your profile — not proof of exposure."
                : "No declared profile match. Relevant if you run related products.");
          var exploit =
            (r.risk && r.risk.howLikelyExploitation) ||
            (r.exploitation && r.exploitation.knownExploited
              ? "Yes — known exploited per connected official sources (" +
                (r.exploitation.exploitationEvidence || "confirmed") +
                ")."
              : "Not asserted as known-exploited in connected sources.");
          var mitigate =
            (r.risk && r.risk.howDifficultMitigation) ||
            (r.remediation && (r.remediation.summary || (r.remediation.mitigations || []).join("; "))) ||
            (r.remediation && r.remediation.patchesAvailable
              ? "Vendor patches indicated as available — check the source advisory for builds."
              : "See source advisory for mitigations and patch status.");
          var rec = r.recommendation || {};
          var e = r.enrichment || {};
          var personas = (r.personas || [])
            .map(function (p) {
              return esc(p.label);
            })
            .join(", ");
          return (
            '<p><a href="#threats">← Threats</a></p>' +
            "<h1 class=\"st-live-section-title\">" +
            esc(r.title) +
            "</h1>" +
            '<p class="' +
            bandClass(r.priority && r.priority.band) +
            '">' +
            esc((r.priority && r.priority.band) || "—") +
            " · score " +
            esc(String((r.priority && r.priority.score) || "—")) +
            "</p>" +
            (rec.label
              ? '<p class="st-live-brief__rec"><span class="' +
                actionClass(rec.action) +
                '">' +
                esc(rec.label) +
                "</span> — " +
                esc(rec.why || "") +
                (r.risk
                  ? " · " +
                    (r.risk.patchImmediately
                      ? "Patch now if exposed."
                      : r.risk.canItWait
                        ? "Can often wait after confirmation."
                        : "")
                  : "") +
                "</p>"
              : "") +
            '<div class="st-detail-grid">' +
            '<div class="st-detail-block"><h2>Who is affected?</h2><p>' +
            esc(who) +
            "</p></div>" +
            '<div class="st-detail-block"><h2>How likely is exploitation?</h2><p>' +
            esc(exploit) +
            (r.exploitation && r.exploitation.ransomwareLinked ? " Flagged with ransomware association in KEV." : "") +
            "</p></div>" +
            '<div class="st-detail-block"><h2>How difficult is mitigation?</h2><p>' +
            esc(mitigate) +
            (r.remediation && r.remediation.deadline ? " Deadline: " + r.remediation.deadline : "") +
            "</p></div>" +
            '<div class="st-detail-block"><h2>Enrichment</h2><ul class="st-live-meta">' +
            "<li>Severity: " +
            esc(e.severity || (r.severity && r.severity.label) || "—") +
            "</li>" +
            "<li>Confidence: " +
            esc(e.confidence || "—") +
            "</li>" +
            "<li>Freshness: " +
            esc(e.freshness || "—") +
            "</li>" +
            "<li>Exploit maturity: " +
            esc(e.exploitMaturity || "—") +
            "</li>" +
            "<li>Patch: " +
            esc(e.patchAvailability || "—") +
            " · Mitigation: " +
            esc(e.mitigationAvailability || "—") +
            "</li>" +
            "<li>Platforms: " +
            esc((e.affectedPlatforms || []).join(", ") || "—") +
            "</li>" +
            "<li>Industry relevance: " +
            esc((e.industryRelevance || []).join(", ") || "general") +
            "</li>" +
            "<li>Small-org likelihood: " +
            esc(String(e.likelihoodSmallOrg != null ? e.likelihoodSmallOrg : "—")) +
            " · Enterprise: " +
            esc(String(e.likelihoodEnterprise != null ? e.likelihoodEnterprise : "—")) +
            "</li>" +
            "</ul></div>" +
            '<div class="st-detail-block"><h2>Why ranked here</h2><ul class="st-live-meta">' +
            factors +
            "</ul></div>" +
            (personas
              ? '<div class="st-detail-block"><h2>Persona relevance</h2><p>' +
                personas +
                " <span class=\"st-ws-meta\">(heuristic hooks)</span></p></div>"
              : "") +
            '<div class="st-detail-block"><h2>References</h2><ul class="st-live-meta"><li><a href="' +
            esc(r.source && r.source.sourceUrl) +
            '" rel="noopener noreferrer" target="_blank">' +
            esc(r.source && r.source.providerName) +
            "</a></li>" +
            ((r.supportingSources || [])
              .map(function (s) {
                return (
                  "<li><a href=\"" +
                  esc(s.sourceUrl) +
                  "\" rel=\"noopener noreferrer\" target=\"_blank\">" +
                  esc(s.providerName || s.providerId) +
                  "</a></li>"
                );
              })
              .join("") || "") +
            "</ul></div></div>" +
            '<p class="st-disclaimer">Plain-language sections interpret provider facts. Recommendations are decision support — not proof of compromise or a compliance mandate.</p>'
          );
        }

        function feedsPanel() {
          return (
            "<h1 class=\"st-live-section-title\">Feeds &amp; provider health</h1>" +
            '<p class="st-live-lead">Timeouts, failures, and planned sources stay visible. Nothing is filled with sample data.</p>' +
            '<table class="st-health-table"><thead><tr><th>Provider</th><th>Status</th><th>Records</th><th>Last success</th><th>Note</th></tr></thead><tbody>' +
            (state.doc.providers || [])
              .map(function (p) {
                return (
                  "<tr><td>" +
                  esc(p.providerName) +
                  "</td><td>" +
                  esc(p.status) +
                  "</td><td>" +
                  esc(String(p.recordCount)) +
                  "</td><td>" +
                  esc((p.lastSuccessfulAt || "—").slice(0, 19)) +
                  "</td><td>" +
                  esc(p.latestError || (p.meta && p.meta.note) || "—") +
                  "</td></tr>"
                );
              })
              .join("") +
            "</tbody></table>" +
            "<h2 class=\"st-live-section-title\" style=\"margin-top:1.25rem;font-size:1.05rem\">How we evaluate</h2>" +
            "<ul class=\"st-live-meta\">" +
            (((state.doc.howToEvaluate && state.doc.howToEvaluate.points) || [])
              .map(function (p) {
                return "<li>" + esc(p) + "</li>";
              })
              .join("") || "") +
            "</ul>"
          );
        }

        function settingsPanel() {
          var Inv = Inventory();
          var items = Inv ? Inv.list() : [];
          var fw =
            (state.doc.signal && state.doc.signal.personaFramework) || {
              personas: [],
              note: "Persona framework not present in this artifact."
            };
          return (
            "<h1 class=\"st-live-section-title\">Settings · profile &amp; personas</h1>" +
            '<p class="st-live-lead">Local-only inventory and persona preference. Never leaves this browser. Full adaptive ranking comes later — hooks are live.</p>' +
            "<h2 class=\"st-live-section-title\" style=\"font-size:1.05rem\">Persona focus</h2>" +
            '<p class="st-live-lead">' +
            esc(fw.note || "") +
            "</p>" +
            '<form id="st-persona-form" class="st-ws-form">' +
            "<label>Preferred persona <select name=\"persona\">" +
            '<option value="">None (show all)</option>' +
            (fw.personas || [])
              .map(function (p) {
                return (
                  "<option value=\"" +
                  esc(p.id) +
                  "\"" +
                  (state.persona === p.id ? " selected" : "") +
                  ">" +
                  esc(p.label) +
                  "</option>"
                );
              })
              .join("") +
            "</select></label>" +
            '<button type="submit" class="wds-btn wds-btn--primary">Save persona</button></form>' +
            "<h2 class=\"st-live-section-title\" style=\"font-size:1.05rem;margin-top:1rem\">Technology profile</h2>" +
            '<form id="st-live-profile-add" class="st-ws-form">' +
            "<label>Name <input name=\"name\" required placeholder=\"Exchange Server\"/></label>" +
            "<label>Category <select name=\"category\">" +
            ((Inv && Inv.CATEGORIES) || ["browser", "operating-system", "application", "other"])
              .map(function (c) {
                return "<option value=\"" + esc(c) + "\">" + esc(c) + "</option>";
              })
              .join("") +
            "</select></label>" +
            "<label>Vendor (optional) <input name=\"vendor\"/></label>" +
            "<label>Version (optional) <input name=\"version\"/></label>" +
            '<button type="submit" class="wds-btn wds-btn--primary">Add</button></form>' +
            "<ul class=\"st-live-meta\">" +
            (items
              .map(function (it) {
                return (
                  "<li><strong>" +
                  esc(it.name) +
                  "</strong> · " +
                  esc(it.category) +
                  ' <button type="button" class="wds-btn wds-btn--ghost" data-rm-inv="' +
                  esc(it.id) +
                  '">Remove</button></li>'
                );
              })
              .join("") || "<li>No technologies declared yet.</li>") +
            "</ul>"
          );
        }

        function searchPanel() {
          var list = filterRecords(state.records, state);
          return (
            "<h1 class=\"st-live-section-title\">Search</h1>" +
            '<p class="st-live-lead">CVE, vendor, product, GHSA, advisory text — live artifact only.</p>' +
            '<form id="st-live-search" class="st-ws-form">' +
            "<label>Query <input name=\"q\" value=\"" +
            esc(state.q) +
            "\" placeholder=\"CVE-2024-…, Fortinet, Exchange\"/></label>" +
            "<label>Band <select name=\"band\">" +
            ["all", "Immediate", "High", "Monitor", "Informational"]
              .map(function (b) {
                return "<option" + (state.band === b ? " selected" : "") + ">" + b + "</option>";
              })
              .join("") +
            "</select></label>" +
            "<label>Type <select name=\"type\">" +
            [
              "all",
              "exploited-vulnerability",
              "vulnerability",
              "security-advisory",
              "software-security-release",
              "service-outage"
            ]
              .map(function (t) {
                return "<option" + (state.type === t ? " selected" : "") + ">" + t + "</option>";
              })
              .join("") +
            "</select></label>" +
            "<label><input type=\"checkbox\" name=\"kev\"" +
            (state.kevOnly ? " checked" : "") +
            "/> KEV only</label>" +
            "<label><input type=\"checkbox\" name=\"profile\"" +
            (state.profileOnly ? " checked" : "") +
            "/> Profile matches</label>" +
            '<button type="submit" class="wds-btn wds-btn--primary">Apply</button></form>' +
            "<p class=\"st-live-lead\">" +
            list.length +
            " results</p>" +
            list.slice(0, 50).map(cardHtml).join("")
          );
        }

        function historyPanel() {
          var entries =
            (state.historyDoc && state.historyDoc.entries) ||
            state.doc.historyPreview ||
            [];
          if (!entries.length) {
            return (
              "<h1 class=\"st-live-section-title\">History</h1>" +
              '<p class="st-live-lead">No prior brief snapshots yet. History fills as the live engine runs.</p>'
            );
          }
          return (
            "<h1 class=\"st-live-section-title\">History</h1>" +
            '<p class="st-live-lead">Prior brief snapshots from engine runs (local artifact).</p>' +
            entries
              .map(function (e) {
                return (
                  '<article class="st-live-card"><h3>' +
                  esc((e.at || "").slice(0, 19)) +
                  " · " +
                  esc(e.trustState || "") +
                  "</h3><ul class=\"st-live-meta\">" +
                  ((e.briefBullets || []).slice(0, 4)
                    .map(function (b) {
                      return "<li>" + esc(b) + "</li>";
                    })
                    .join("") || "<li>" + esc(e.recommendation || "") + "</li>") +
                  "</ul></article>"
                );
              })
              .join("")
          );
        }

        function ransomwarePanel() {
          var derived = (state.doc.derived && state.doc.derived.ransomware) || [];
          if (derived.length) {
            var map = byIdMap(state.records);
            var list = derived
              .map(function (d) {
                return map[d.id];
              })
              .filter(Boolean)
              .filter(function (r) {
                return state.showNoise || !(r.noise && r.noise.hideByDefault);
              });
            return listPanel(
              "Ransomware center",
              "KEV entries flagged with ransomware association. Campaign TTPs beyond this flag require additional authoritative sources (not fabricated here).",
              list,
              state
            );
          }
          return listPanel(
            "Ransomware center",
            "No ransomware-associated KEV flags in the current live artifact.",
            [],
            state
          );
        }

        function zeroDayPanel() {
          var derived = (state.doc.derived && state.doc.derived.zeroDay) || [];
          var map = byIdMap(state.records);
          var list = derived
            .map(function (d) {
              return map[d.id];
            })
            .filter(Boolean)
            .filter(function (r) {
              return state.showNoise || !(r.noise && r.noise.hideByDefault);
            });
          return (
            listPanel(
              "Zero-Day center",
              "Public feeds rarely prove a true zero-day. This view highlights known-exploited, freshly listed, or explicitly labeled items — with honest status tags.",
              list,
              state
            ) +
            (derived.length
              ? '<ul class="st-live-meta">' +
                derived
                  .slice(0, 20)
                  .map(function (d) {
                    return (
                      "<li><strong>" +
                      esc(d.status) +
                      "</strong> — " +
                      esc(d.title) +
                      "</li>"
                    );
                  })
                  .join("") +
                "</ul>"
              : "")
          );
        }

        function body() {
          var route = parseHash();
          var view = visibleRecords(state.records, state.showNoise);
          if (state.persona) {
            view = view.filter(function (r) {
              return (r.personas || []).some(function (p) {
                return p.personaId === state.persona;
              });
            });
          }
          if (route.panel === "record") return recordDetail(route.id);
          if (route.panel === "brief") return briefPanel();
          if (route.panel === "briefings") return briefingsPanel();
          if (route.panel === "trends") return trendsPanel();
          if (route.panel === "timeline") return timelinePanel();
          if (route.panel === "threats") {
            return listPanel(
              "Threats",
              "Immediate and High priority — ranked by operational score. Low-signal hidden by default.",
              view.filter(function (r) {
                return (
                  (r.priority.band === "Immediate" || r.priority.band === "High") &&
                  r.type !== "service-outage"
                );
              }),
              state
            );
          }
          if (route.panel === "vulnerabilities") {
            return listPanel(
              "Vulnerabilities",
              "KEV, NVD, and GHSA vulnerability records — priority sorted.",
              view.filter(function (r) {
                return r.type === "exploited-vulnerability" || r.type === "vulnerability";
              }),
              state
            );
          }
          if (route.panel === "kev") {
            return listPanel(
              "CISA KEV",
              "Known Exploited Vulnerabilities catalog entries in this artifact.",
              view.filter(function (r) {
                return r.exploitation && r.exploitation.knownExploited;
              }),
              state
            );
          }
          if (route.panel === "ransomware") return ransomwarePanel();
          if (route.panel === "zeroday") return zeroDayPanel();
          if (route.panel === "advisories") {
            return listPanel(
              "Advisories & security releases",
              "Official/authoritative advisories and vendor security release notices.",
              view.filter(function (r) {
                return r.type === "security-advisory" || r.type === "software-security-release";
              }),
              state
            );
          }
          if (route.panel === "outages") {
            return listPanel(
              "Outage center",
              "Public cloud/SaaS status signals. Healthy heartbeats count as low-signal unless shown.",
              view.filter(function (r) {
                return r.type === "service-outage";
              }),
              state
            );
          }
          if (route.panel === "feeds") return feedsPanel();
          if (route.panel === "search") return searchPanel();
          if (route.panel === "history") return historyPanel();
          if (route.panel === "settings") return settingsPanel();
          return briefPanel();
        }

        function paint() {
          root.innerHTML =
            '<div class="st-live-app">' +
            '<div class="st-live-shell">' +
            navHtml() +
            '<div class="st-live-main" id="st-live-body">' +
            body() +
            "</div></div>" +
            '<p class="st-disclaimer">Live cyber intelligence from official/public sources. Defensive awareness only. Teaching samples are never used as fallback.</p></div>';

          var form = root.querySelector("#st-live-search");
          if (form) {
            form.addEventListener("submit", function (ev) {
              ev.preventDefault();
              var fd = new FormData(form);
              state.q = String(fd.get("q") || "");
              state.band = String(fd.get("band") || "all");
              state.type = String(fd.get("type") || "all");
              state.kevOnly = !!fd.get("kev");
              state.profileOnly = !!fd.get("profile");
              paint();
            });
          }
          var add = root.querySelector("#st-live-profile-add");
          if (add && Inventory()) {
            add.addEventListener("submit", function (ev) {
              ev.preventDefault();
              var fd = new FormData(add);
              var id =
                "inv_" +
                String(fd.get("name") || "item")
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .slice(0, 40) +
                "_" +
                Date.now().toString(36);
              Inventory().upsert({
                id: id,
                name: String(fd.get("name")),
                category: String(fd.get("category")),
                vendor: String(fd.get("vendor") || "") || null,
                version: String(fd.get("version") || "") || null
              });
              state.records = applyProfile(state.doc.records, profileTermsFromInventory());
              paint();
            });
          }
          root.querySelectorAll("[data-rm-inv]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              if (Inventory()) Inventory().remove(btn.getAttribute("data-rm-inv"));
              state.records = applyProfile(state.doc.records, profileTermsFromInventory());
              paint();
            });
          });
          var noiseToggle = root.querySelector("#st-show-noise");
          if (noiseToggle) {
            noiseToggle.addEventListener("change", function () {
              state.showNoise = !!noiseToggle.checked;
              paint();
            });
          }
          var personaForm = root.querySelector("#st-persona-form");
          if (personaForm) {
            personaForm.addEventListener("submit", function (ev) {
              ev.preventDefault();
              var fd = new FormData(personaForm);
              state.persona = String(fd.get("persona") || "");
              savePersona(state.persona);
              paint();
            });
          }
          var tlForm = root.querySelector("#st-timeline-filter");
          if (tlForm) {
            tlForm.addEventListener("submit", function (ev) {
              ev.preventDefault();
              var fd = new FormData(tlForm);
              state.timelineCategory = String(fd.get("cat") || "all");
              state.timelineSeverity = String(fd.get("sev") || "all");
              state.timelineVendor = String(fd.get("vendor") || "");
              paint();
            });
          }
          root.removeAttribute("aria-busy");
          try {
            if (global.performance && performance.mark) {
              performance.mark("st-cyber-paint");
              performance.measure("st-cyber-mount-to-paint", "st-cyber-mount-start", "st-cyber-paint");
            }
          } catch (e1) { /* noop */ }
        }

        if (!global.location.hash) setHash("brief");
        global.addEventListener("hashchange", paint);
        paint();
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainCyberLive = {
    mountLive: mountLive,
    applyProfile: applyProfile,
    matchProfile: matchProfile,
    rescore: rescore,
    bandLabel: bandLabel,
    bandWhy: bandWhy,
    effectiveTrust: effectiveTrust,
    LIVE_MAX_AGE_MS: LIVE_MAX_AGE_MS,
    BANNED_SAMPLE_PATHS: BANNED_SAMPLE_PATHS
  };
})(typeof window !== "undefined" ? window : globalThis);
