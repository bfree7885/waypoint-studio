/**
 * SignalTerrain Cyber — Live Intelligence Dashboard
 * Reads data/cyber/live.json only. Never loads sample/fixture intelligence.
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
    var u = Util();
    if (u && u.loadJson) return u.loadJson(url);
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("Failed to load " + url + " (" + r.status + ")");
      return r.json();
    });
  }

  function parseHash() {
    var u = Util();
    if (u && u.parseHash) {
      var raw = u.parseHash();
      return { panel: raw.panel || "posture", id: raw.id || null };
    }
    var h = String(global.location.hash || "").replace(/^#/, "");
    if (!h) return { panel: "posture", id: null };
    var parts = h.split("/");
    return { panel: parts[0] || "posture", id: parts[1] || null };
  }

  function setHash(panel, id) {
    var u = Util();
    if (u && u.setHash) {
      u.setHash(panel, id);
      return;
    }
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
      var productHit = products.some(function (p) {
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
      .slice(0, 4)
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
    return '<span class="st-live-trust" data-trust="' + esc(state || "Unknown") + '">' + esc(state || "Unknown") + "</span>";
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
          ((r.entities && r.entities.vendors) || []).join(" ") +
          " " +
          ((r.entities && r.entities.products) || []).join(" ")
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
      esc((r.summary || "").slice(0, 280)) +
      (r.summary && r.summary.length > 280 ? "…" : "") +
      "</p>" +
      '<ul class="st-live-meta">' +
      (cves ? "<li><strong>CVE:</strong> " + esc(cves) + "</li>" : "") +
      (vendors || products
        ? "<li><strong>Affects:</strong> " + esc([vendors, products].filter(Boolean).join(" / ")) + "</li>"
        : "") +
      "<li><strong>Exploitation:</strong> " +
      esc(
        r.exploitation && r.exploitation.knownExploited
          ? "Known exploited (" + (r.exploitation.exploitationEvidence || "confirmed") + ")"
          : "Not asserted as known-exploited in connected sources"
      ) +
      "</li>" +
      "<li><strong>Profile:</strong> " +
      esc(pm.label || "No declared technology match") +
      "</li>" +
      "<li><strong>Source:</strong> <a href=\"" +
      esc(r.source && r.source.sourceUrl) +
      "\" rel=\"noopener noreferrer\" target=\"_blank\">" +
      esc(r.source && r.source.providerName) +
      "</a> · " +
      esc(r.source && r.source.authorityLevel) +
      "</li>" +
      "<li><strong>Published:</strong> " +
      esc((r.publishedAt || "—").slice(0, 19)) +
      " · <strong>Retrieved:</strong> " +
      esc((r.retrievedAt || "—").slice(0, 19)) +
      " · <strong>Freshness:</strong> " +
      esc(r.freshness || "—") +
      " · <strong>Confidence:</strong> " +
      esc(r.confidence || "—") +
      "</li>" +
      "<li><strong>Why prioritized:</strong> " +
      esc((r.priority && r.priority.explanation) || "") +
      "</li>" +
      "</ul></article>"
    );
  }

  function todayPriorities(records) {
    var lines = [];
    var immediate = records.filter(function (r) {
      return r.priority && r.priority.band === "Immediate";
    });
    var exact = records.filter(function (r) {
      return r.priority && r.priority.profileMatch && r.priority.profileMatch.level === "exact";
    });
    var kevNew = records.filter(function (r) {
      return r.type === "exploited-vulnerability" && r.freshness === "live";
    });
    immediate.slice(0, 5).forEach(function (r) {
      var pm = r.priority.profileMatch || {};
      if (pm.level === "exact") {
        lines.push(
          "Review " +
            r.title +
            " — direct product match to “" +
            pm.detail +
            "”. Version confirmation may still be required. Known exploited per official sources."
        );
      } else if (pm.level === "vendor") {
        lines.push(
          "Possibly relevant: " +
            r.title +
            " — vendor-level match to “" +
            pm.detail +
            "”; not proof you are affected."
        );
      } else {
        lines.push(
          "Immediate (not a declared profile match): " +
            r.title +
            " — track if you use related products; no declared technology match found."
        );
      }
    });
    if (!exact.length) {
      lines.push("No direct product matches were found between Immediate items and your declared technology profile.");
    }
    if (kevNew.length) {
      lines.push(
        kevNew.length +
          " KEV-linked record(s) appear freshly retrieved; confirm whether any products you run are in scope."
      );
    }
    if (!lines.length) {
      lines.push("No current Immediate items from connected sources. Absence of matches does not prove safety.");
    }
    return lines;
  }

  function mountLive(root, options) {
    options = options || {};
    if (!root) return Promise.reject(new Error("mount root required"));
    root.setAttribute("aria-busy", "true");
    root.innerHTML = '<p class="st-loading">Loading verified cyber intelligence…</p>';

    var liveUrl = options.liveUrl || "../../../data/cyber/live.json";
    var state = {
      q: "",
      band: "all",
      type: "all",
      provider: "all",
      kevOnly: false,
      profileOnly: false,
      doc: null,
      records: []
    };

    return loadJson(liveUrl)
      .catch(function (err) {
        root.innerHTML =
          '<div class="st-demo" role="alert">' +
          "<h1>No verified cyber intelligence has been retrieved yet.</h1>" +
          "<p>The live artifact is missing or unreadable. Run <code>node scripts/signalterrain-cyber-live-engine.mjs</code> to fetch official sources. Sample data will not be substituted.</p>" +
          "<p class=\"st-ws-meta\">" +
          esc(String(err && err.message ? err.message : err)) +
          "</p></div>";
        root.removeAttribute("aria-busy");
        throw err;
      })
      .then(function (doc) {
        if (!doc || !Array.isArray(doc.records)) {
          root.innerHTML =
            '<p role="alert">Live artifact is malformed. Sample data will not be substituted.</p>';
          root.removeAttribute("aria-busy");
          return;
        }
        state.doc = doc;
        var items = profileTermsFromInventory();
        state.records = applyProfile(doc.records, items);

        function nav() {
          var route = parseHash();
          var panels = [
            ["posture", "Posture"],
            ["immediate", "Immediate"],
            ["kev", "KEV"],
            ["advisories", "Advisories"],
            ["releases", "Software updates"],
            ["today", "Today"],
            ["search", "Search"],
            ["providers", "Provider health"],
            ["profile", "Tech profile"],
            ["about", "How we evaluate"]
          ];
          return (
            '<nav class="st-cyber-nav" aria-label="Live cyber intelligence">' +
            "<ul>" +
            panels
              .map(function (p) {
                var cur = route.panel === p[0] || (p[0] === "immediate" && route.panel === "record");
                return (
                  "<li><a href=\"#" +
                  p[0] +
                  "\"" +
                  (cur ? ' aria-current="page"' : "") +
                  ">" +
                  esc(p[1]) +
                  "</a></li>"
                );
              })
              .join("") +
            "</ul></nav>"
          );
        }

        function posture() {
          var imm = state.records.filter(function (r) {
            return r.priority.band === "Immediate";
          }).length;
          var high = state.records.filter(function (r) {
            return r.priority.band === "High";
          }).length;
          var exact = state.records.filter(function (r) {
            return r.priority.profileMatch && r.priority.profileMatch.level === "exact";
          }).length;
          var unavailable = (state.doc.providers || []).filter(function (p) {
            return p.status === "error" || p.status === "planned";
          }).length;
          var oldest = state.records.reduce(function (min, r) {
            var t = r.retrievedAt || "";
            return !min || t < min ? t : min;
          }, "");
          return (
            '<header class="st-demo-header"><h1>Current cyber posture</h1>' +
            '<p class="st-lead">Real public cyber intelligence — not a sample dashboard. ' +
            trustBadge(state.doc.meta && state.doc.meta.trustState) +
            "</p>" +
            '<p class="st-badge">Generated ' +
            esc((state.doc.meta && state.doc.meta.generatedAt) || "—") +
            " · " +
            esc(String((state.doc.meta && state.doc.meta.counts && state.doc.meta.counts.records) || state.records.length)) +
            " records</p></header>" +
            '<ul class="st-cyber-list">' +
            "<li><strong>" +
            imm +
            "</strong> Immediate items</li>" +
            "<li><strong>" +
            high +
            "</strong> High-priority items</li>" +
            "<li><strong>" +
            exact +
            "</strong> direct matches to your technology profile</li>" +
            "<li><strong>" +
            unavailable +
            "</strong> providers unavailable or planned</li>" +
            "<li>Oldest retrieved timestamp in view: " +
            esc((oldest || "—").slice(0, 19)) +
            "</li></ul>" +
            '<p class="st-ws-meta">Counts are derived only from the live artifact. No sample records are included.</p>'
          );
        }

        function listPanel(title, lead, list) {
          return (
            '<header class="st-demo-header"><h1>' +
            esc(title) +
            "</h1><p class=\"st-lead\">" +
            esc(lead) +
            "</p></header>" +
            (list.length
              ? list.map(cardHtml).join("")
              : '<p class="st-ws-meta">No matching verified records.</p>')
          );
        }

        function recordDetail(id) {
          var r = state.records.filter(function (x) {
            return x.id === id;
          })[0];
          if (!r) return '<p role="alert">Record not found in the live artifact.</p>';
          var factors = ((r.priority && r.priority.contributions) || [])
            .map(function (c) {
              return (
                "<li><strong>" +
                esc(c.factorId) +
                "</strong> +" +
                esc(String(c.points)) +
                "/" +
                esc(String(c.maxPoints)) +
                " — " +
                esc(c.reason) +
                "</li>"
              );
            })
            .join("");
          var sources = ((r.supportingSources || []).concat([
            {
              providerName: r.source.providerName,
              sourceUrl: r.source.sourceUrl,
              providerId: r.source.providerId
            }
          ]))
            .map(function (s) {
              return (
                "<li><a href=\"" +
                esc(s.sourceUrl) +
                "\" rel=\"noopener noreferrer\" target=\"_blank\">" +
                esc(s.providerName || s.providerId) +
                "</a></li>"
              );
            })
            .join("");
          return (
            '<p><a href="#immediate">← Back</a></p>' +
            '<header class="st-demo-header"><h1>' +
            esc(r.title) +
            "</h1></header>" +
            cardHtml(r) +
            "<h2>Priority factors</h2><ul class=\"st-cyber-list\">" +
            factors +
            "</ul>" +
            "<h2>Supporting sources</h2><ul class=\"st-cyber-list\">" +
            sources +
            "</ul>" +
            '<p class="st-disclaimer">Provider facts above are attributed. SignalTerrain priority text is interpretation of those facts — not a claim that you are compromised.</p>'
          );
        }

        function providersPanel() {
          return (
            '<header class="st-demo-header"><h1>Provider health</h1>' +
            '<p class="st-lead">Failures are visible. Cached or planned providers are never presented as live sample data.</p></header>' +
            '<table class="st-health-table"><thead><tr><th>Provider</th><th>Status</th><th>Records</th><th>Last success</th><th>Error / note</th></tr></thead><tbody>' +
            (state.doc.providers || [])
              .map(function (p) {
                return (
                  "<tr><td>" +
                  esc(p.providerName) +
                  "</td><td>" +
                  esc(p.status) +
                  " / " +
                  esc(p.resultsMode || "") +
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
            "</tbody></table>"
          );
        }

        function profilePanel() {
          var Inv = Inventory();
          var items = Inv ? Inv.list() : [];
          return (
            '<header class="st-demo-header"><h1>Technology profile</h1>' +
            '<p class="st-lead">Private and local-first. Matching distinguishes exact, vendor, platform, ambiguous, and none. Never proof of compromise.</p></header>' +
            '<form id="st-live-profile-add" class="st-ws-form">' +
            "<label>Name <input name=\"name\" required placeholder=\"Firefox\"/></label>" +
            "<label>Category <select name=\"category\">" +
            ((Inv && Inv.CATEGORIES) || ["browser", "operating-system", "application", "other"])
              .map(function (c) {
                return "<option value=\"" + esc(c) + "\">" + esc(c) + "</option>";
              })
              .join("") +
            "</select></label>" +
            "<label>Vendor (optional) <input name=\"vendor\"/></label>" +
            "<label>Version (optional) <input name=\"version\"/></label>" +
            '<button type="submit" class="wds-btn wds-btn--primary">Add to local profile</button></form>' +
            "<ul class=\"st-cyber-list\">" +
            (items
              .map(function (it) {
                return (
                  "<li><strong>" +
                  esc(it.name) +
                  "</strong> <span class=\"st-ws-meta\">" +
                  esc(it.category) +
                  (it.version ? " · " + esc(it.version) : "") +
                  '</span> <button type="button" class="wds-btn wds-btn--ghost" data-rm-inv="' +
                  esc(it.id) +
                  '">Remove</button></li>'
                );
              })
              .join("") || "<li class=\"st-ws-meta\">No technologies declared yet.</li>") +
            "</ul>"
          );
        }

        function aboutPanel() {
          var pts = ((state.doc.howToEvaluate && state.doc.howToEvaluate.points) || [])
            .map(function (p) {
              return "<li>" + esc(p) + "</li>";
            })
            .join("");
          return (
            '<header class="st-demo-header"><h1>How SignalTerrain evaluates cyber information</h1></header>' +
            "<ul class=\"st-cyber-list\">" +
            pts +
            "</ul>" +
            '<p class="st-disclaimer">Educational defensive awareness. No scanning, no offense, no SIEM claims.</p>'
          );
        }

        function searchPanel() {
          var list = filterRecords(state.records, state);
          return (
            '<header class="st-demo-header"><h1>Search</h1>' +
            '<p class="st-lead">Search and filter verified live records only.</p></header>' +
            '<form id="st-live-search" class="st-ws-form">' +
            "<label>Query <input name=\"q\" value=\"" +
            esc(state.q) +
            "\" placeholder=\"CVE, vendor, product\"/></label>" +
            "<label>Band <select name=\"band\">" +
            ["all", "Immediate", "High", "Monitor", "Informational"]
              .map(function (b) {
                return (
                  "<option" +
                  (state.band === b ? " selected" : "") +
                  ">" +
                  b +
                  "</option>"
                );
              })
              .join("") +
            "</select></label>" +
            "<label>Type <select name=\"type\">" +
            ["all", "exploited-vulnerability", "vulnerability", "security-advisory", "software-security-release"]
              .map(function (t) {
                return "<option" + (state.type === t ? " selected" : "") + ">" + t + "</option>";
              })
              .join("") +
            '</select></label>' +
            "<label><input type=\"checkbox\" name=\"kev\"" +
            (state.kevOnly ? " checked" : "") +
            "/> KEV / known exploited only</label>" +
            "<label><input type=\"checkbox\" name=\"profile\"" +
            (state.profileOnly ? " checked" : "") +
            "/> Profile matches only</label>" +
            '<button type="submit" class="wds-btn wds-btn--primary">Apply</button></form>' +
            "<p class=\"st-ws-meta\">" +
            list.length +
            " results</p>" +
            list.slice(0, 40).map(cardHtml).join("")
          );
        }

        function body() {
          var route = parseHash();
          if (route.panel === "record") return recordDetail(route.id);
          if (route.panel === "immediate") {
            return listPanel(
              "Immediate attention",
              "Only verified records at the Immediate priority band.",
              state.records.filter(function (r) {
                return r.priority.band === "Immediate";
              })
            );
          }
          if (route.panel === "kev") {
            return listPanel(
              "Known exploited vulnerabilities (CISA KEV)",
              "Official KEV-linked records from the live artifact.",
              state.records.filter(function (r) {
                return r.exploitation && r.exploitation.knownExploited;
              })
            );
          }
          if (route.panel === "advisories") {
            return listPanel(
              "Advisories",
              "Official and authoritative advisories from connected providers.",
              state.records.filter(function (r) {
                return r.type === "security-advisory";
              })
            );
          }
          if (route.panel === "releases") {
            return listPanel(
              "Software security updates",
              "Vendor security release notices from connected feeds.",
              state.records.filter(function (r) {
                return r.type === "software-security-release";
              })
            );
          }
          if (route.panel === "today") {
            var lines = todayPriorities(state.records);
            return (
              '<header class="st-demo-header"><h1>Today’s defensive priorities</h1>' +
              '<p class="st-lead">Careful interpretation of source-backed records. Not a claim that you are compromised.</p></header>' +
              "<ul class=\"st-cyber-list\">" +
              lines
                .map(function (l) {
                  return "<li>" + esc(l) + "</li>";
                })
                .join("") +
              "</ul>"
            );
          }
          if (route.panel === "search") return searchPanel();
          if (route.panel === "providers") return providersPanel();
          if (route.panel === "profile") return profilePanel();
          if (route.panel === "about") return aboutPanel();
          return posture();
        }

        function paint() {
          root.innerHTML =
            '<div class="st-live st-demo">' +
            nav() +
            '<div id="st-live-body">' +
            body() +
            "</div>" +
            '<p class="st-disclaimer">Live cyber intelligence from official/public sources. Defensive and educational only. Teaching samples are isolated to teaching mode and are never used as fallback here.</p></div>';

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
          var h = root.querySelector("#st-live-body h1");
          if (h) {
            h.setAttribute("tabindex", "-1");
            try {
              h.focus();
            } catch (e) {
              /* ignore */
            }
          }
        }

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
