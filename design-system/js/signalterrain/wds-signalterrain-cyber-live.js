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

  var CACHE_KEY = "st_cyber_live_cache_v2";
  var CACHE_TTL_MS = 5 * 60 * 1000;

  var NAV = [
    ["brief", "Overview"],
    ["threats", "Threats"],
    ["vulnerabilities", "Vulnerabilities"],
    ["kev", "KEV"],
    ["ransomware", "Ransomware"],
    ["zeroday", "Zero-Day"],
    ["advisories", "Advisories"],
    ["outages", "Outages"],
    ["feeds", "Feeds"],
    ["search", "Search"],
    ["history", "History"],
    ["settings", "Settings"]
  ];

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
        return (b.priority.score || 0) - (a.priority.score || 0);
      });
  }

  function bandClass(band) {
    if (band === "Immediate") return "st-live-band st-live-band--immediate";
    if (band === "High") return "st-live-band st-live-band--high";
    if (band === "Monitor") return "st-live-band st-live-band--monitor";
    return "st-live-band";
  }

  function trustBadge(state) {
    return '<span class="st-live-trust">' + esc(state || "Unknown") + "</span>";
  }

  function filterRecords(records, state) {
    return (records || []).filter(function (r) {
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
          (r.type || "")
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
      return true;
    });
  }

  function cardHtml(r) {
    var cves = ((r.identifiers && r.identifiers.cves) || []).join(", ");
    var vendors = ((r.entities && r.entities.vendors) || []).join(", ");
    var products = ((r.entities && r.entities.products) || []).join(", ");
    var pm = (r.priority && r.priority.profileMatch) || {};
    return (
      '<article class="st-live-card">' +
      '<div class="st-live-card-top">' +
      '<span class="' +
      bandClass(r.priority && r.priority.band) +
      '">' +
      esc((r.priority && r.priority.band) || "—") +
      " · " +
      esc(String((r.priority && r.priority.score) || "—")) +
      "</span>" +
      '<span class="st-ws-meta">' +
      esc(r.type) +
      "</span></div>" +
      "<h3><a href=\"#record/" +
      encodeURIComponent(r.id) +
      "\">" +
      esc(r.title) +
      "</a></h3>" +
      "<p>" +
      esc((r.summary || "").slice(0, 240)) +
      (r.summary && r.summary.length > 240 ? "…" : "") +
      "</p>" +
      '<ul class="st-live-meta">' +
      (cves ? "<li><strong>CVE:</strong> " + esc(cves) + "</li>" : "") +
      (vendors || products
        ? "<li><strong>Affects:</strong> " + esc([vendors, products].filter(Boolean).join(" / ")) + "</li>"
        : "") +
      "<li><strong>Why:</strong> " +
      esc((r.priority && r.priority.explanation) || "") +
      "</li>" +
      "<li><strong>Source:</strong> <a href=\"" +
      esc(r.source && r.source.sourceUrl) +
      "\" rel=\"noopener noreferrer\" target=\"_blank\">" +
      esc(r.source && r.source.providerName) +
      "</a></li>" +
      "</ul></article>"
    );
  }

  function listPanel(title, lead, list) {
    return (
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
    root.innerHTML = '<p class="st-loading">Loading verified cyber intelligence…</p>';

    var liveUrl = options.liveUrl || "../../../data/cyber/live.json";
    var historyUrl = options.historyUrl || "../../../data/cyber/history.json";
    var state = {
      q: "",
      band: "all",
      type: "all",
      provider: "all",
      kevOnly: false,
      profileOnly: false,
      doc: null,
      records: [],
      historyDoc: null
    };

    return loadJson(liveUrl)
      .catch(function (err) {
        root.innerHTML =
          '<div class="st-live-app" role="alert">' +
          "<h1>No verified cyber intelligence has been retrieved yet.</h1>" +
          "<p>Run <code>node scripts/signalterrain-cyber-live-engine.mjs</code>. Sample data will not be substituted.</p>" +
          "<p class=\"st-live-lead\">" +
          esc(String(err && err.message ? err.message : err)) +
          "</p></div>";
        root.removeAttribute("aria-busy");
        throw err;
      })
      .then(function (doc) {
        if (!doc || !Array.isArray(doc.records)) {
          root.innerHTML = '<p role="alert">Live artifact is malformed. Sample data will not be substituted.</p>';
          root.removeAttribute("aria-busy");
          return;
        }
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
          var bullets =
            brief && brief.bullets && brief.bullets.length
              ? brief.bullets
              : [{ text: "Brief not present in artifact — showing highest-priority verified items instead." }].concat(
                  state.records.slice(0, 5).map(function (r) {
                    return { text: r.title };
                  })
                );
          var imm = state.records.filter(function (r) {
            return r.priority.band === "Immediate";
          }).length;
          var high = state.records.filter(function (r) {
            return r.priority.band === "High";
          }).length;
          return (
            '<section class="st-live-brief" aria-labelledby="st-brief-title">' +
            '<p class="st-live-brief__eyebrow">Today\'s Cyber Brief</p>' +
            '<h1 class="st-live-brief__title" id="st-brief-title">What should I pay attention to right now?</h1>' +
            '<p class="st-live-brief__meta">Generated ' +
            esc((brief && brief.generatedAt) || (state.doc.meta && state.doc.meta.generatedAt) || "—") +
            " · " +
            trustBadge(state.doc.meta && state.doc.meta.trustState) +
            " · " +
            esc(String(state.records.length)) +
            " verified records</p>" +
            '<div class="st-live-stats" aria-label="Priority counts">' +
            '<div class="st-live-stat"><strong>' +
            imm +
            "</strong><span>Immediate</span></div>" +
            '<div class="st-live-stat"><strong>' +
            high +
            "</strong><span>High</span></div>" +
            '<div class="st-live-stat"><strong>' +
            esc(
              String(
                state.records.filter(function (r) {
                  return r.exploitation && r.exploitation.knownExploited;
                }).length
              )
            ) +
            "</strong><span>KEV</span></div>" +
            '<div class="st-live-stat"><strong>' +
            esc(
              String(
                state.records.filter(function (r) {
                  return r.type === "service-outage" && !(r.rawProviderMetadata && r.rawProviderMetadata.healthy);
                }).length
              )
            ) +
            "</strong><span>Outages</span></div>" +
            "</div>" +
            '<ul class="st-live-brief__list">' +
            bullets
              .map(function (b) {
                return "<li>" + esc(b.text || b) + "</li>";
              })
              .join("") +
            "</ul>" +
            (brief && brief.recommendation
              ? '<p class="st-live-brief__rec"><strong>Recommended priority:</strong> ' +
                esc(brief.recommendation) +
                "</p>"
              : "") +
            '<p class="st-live-lead">' +
            esc((brief && brief.method) || "Interpretation of provider-backed records only.") +
            "</p></section>" +
            listPanel(
              "Top threats by priority",
              "Sorted by operational priority score — not chronology.",
              state.records
                .filter(function (r) {
                  return r.type !== "service-outage" || !(r.rawProviderMetadata && r.rawProviderMetadata.healthy);
                })
                .slice(0, 8)
            )
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
            (r.priority && r.priority.profileMatch && r.priority.profileMatch.level === "exact"
              ? "You declared related technology (“" + r.priority.profileMatch.detail + "”) — confirm versions."
              : r.priority && r.priority.profileMatch && r.priority.profileMatch.level === "vendor"
                ? "Possible vendor overlap with your profile — not proof of exposure."
                : "No declared profile match. Relevant if you run related products.");
          var exploit = r.exploitation && r.exploitation.knownExploited
            ? "Yes — known exploited per connected official sources (" +
              (r.exploitation.exploitationEvidence || "confirmed") +
              ")."
            : "Not asserted as known-exploited in connected sources.";
          var mitigate =
            (r.remediation && (r.remediation.summary || (r.remediation.mitigations || []).join("; "))) ||
            (r.remediation && r.remediation.patchesAvailable
              ? "Vendor patches indicated as available — check the source advisory for builds."
              : "See source advisory for mitigations and patch status.");
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
            '<div class="st-detail-grid">' +
            '<div class="st-detail-block"><h2>What is affected</h2><p>' +
            esc(
              [((r.entities && r.entities.vendors) || []).join(", "), ((r.entities && r.entities.products) || []).join(", ")]
                .filter(Boolean)
                .join(" / ") || "See source — entities not fully parsed from this feed."
            ) +
            "</p></div>" +
            '<div class="st-detail-block"><h2>How serious</h2><p>' +
            esc(
              (r.severity && r.severity.label ? "Severity: " + r.severity.label : "Severity unknown") +
                (r.severity && r.severity.cvssScore != null ? " · CVSS " + r.severity.cvssScore : "")
            ) +
            ". " +
            esc((r.priority && r.priority.explanation) || "") +
            "</p></div>" +
            '<div class="st-detail-block"><h2>Exploitation occurring?</h2><p>' +
            esc(exploit) +
            (r.exploitation && r.exploitation.ransomwareLinked ? " Flagged with ransomware association in KEV." : "") +
            "</p></div>" +
            '<div class="st-detail-block"><h2>Who should care</h2><p>' +
            esc(who) +
            "</p></div>" +
            '<div class="st-detail-block"><h2>How to mitigate / patches</h2><p>' +
            esc(mitigate) +
            (r.remediation && r.remediation.deadline ? " Deadline: " + r.remediation.deadline : "") +
            "</p></div>" +
            '<div class="st-detail-block"><h2>Why ranked here</h2><ul class="st-live-meta">' +
            factors +
            "</ul></div>" +
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
            '<p class="st-disclaimer">Plain-language sections interpret provider facts. Not a claim that you are compromised.</p>'
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
          return (
            "<h1 class=\"st-live-section-title\">Settings · technology profile</h1>" +
            '<p class="st-live-lead">Local-only inventory used to re-weight priority. Never leaves this browser.</p>' +
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
              .filter(Boolean);
            return listPanel(
              "Ransomware center",
              "KEV entries flagged with ransomware association. Campaign TTPs beyond this flag require additional authoritative sources (not fabricated here).",
              list
            );
          }
          return listPanel(
            "Ransomware center",
            "No ransomware-associated KEV flags in the current live artifact.",
            []
          );
        }

        function zeroDayPanel() {
          var derived = (state.doc.derived && state.doc.derived.zeroDay) || [];
          var map = byIdMap(state.records);
          var list = derived
            .map(function (d) {
              return map[d.id];
            })
            .filter(Boolean);
          return (
            listPanel(
              "Zero-Day center",
              "Public feeds rarely prove a true zero-day. This view highlights known-exploited, freshly listed, or explicitly labeled items — with honest status tags.",
              list
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
          if (route.panel === "record") return recordDetail(route.id);
          if (route.panel === "brief") return briefPanel();
          if (route.panel === "threats") {
            return listPanel(
              "Threats",
              "Immediate and High priority — ranked by operational score.",
              state.records.filter(function (r) {
                return (
                  (r.priority.band === "Immediate" || r.priority.band === "High") &&
                  r.type !== "service-outage"
                );
              })
            );
          }
          if (route.panel === "vulnerabilities") {
            return listPanel(
              "Vulnerabilities",
              "KEV, NVD, and GHSA vulnerability records — priority sorted.",
              state.records.filter(function (r) {
                return r.type === "exploited-vulnerability" || r.type === "vulnerability";
              })
            );
          }
          if (route.panel === "kev") {
            return listPanel(
              "CISA KEV",
              "Known Exploited Vulnerabilities catalog entries in this artifact.",
              state.records.filter(function (r) {
                return r.exploitation && r.exploitation.knownExploited;
              })
            );
          }
          if (route.panel === "ransomware") return ransomwarePanel();
          if (route.panel === "zeroday") return zeroDayPanel();
          if (route.panel === "advisories") {
            return listPanel(
              "Advisories & security releases",
              "Official/authoritative advisories and vendor security release notices.",
              state.records.filter(function (r) {
                return r.type === "security-advisory" || r.type === "software-security-release";
              })
            );
          }
          if (route.panel === "outages") {
            return listPanel(
              "Outage center",
              "Public cloud/SaaS status signals (AWS, Azure, GCP, Cloudflare, GitHub, OpenAI). Healthy heartbeats included for honesty.",
              state.records.filter(function (r) {
                return r.type === "service-outage";
              })
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
    BANNED_SAMPLE_PATHS: BANNED_SAMPLE_PATHS
  };
})(typeof window !== "undefined" ? window : globalThis);
