/**
 * Global Signals — Industry Intelligence (index + detail).
 * Loads curated structural baseline JSON + optional live impacts.
 * Does not invent missing Takes, live events, or activations.
 * Auto-boots [data-gsi-index] / [data-gsi-detail] mounts; every load must
 * terminate in ready | empty | error (never infinite Loading).
 */
(function (global) {
  "use strict";

  var NS = (global.WDS = global.WDS || {});
  var GS = (NS.globalSignals = NS.globalSignals || {});

  var FETCH_TIMEOUT_MS = 12000;
  var INDUSTRIES_REL = "data/global-signals/industries/industries.json";
  var LIVE_IMPACTS_REL = "data/global-signals/industries/live-impacts.json";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var CONFIDENCE_ALLOWED = ["Observed", "High", "Medium", "Low", "Unknown"];
  var HORIZON_ALLOWED = ["Immediate", "Days", "Weeks", "Months", "Long-term"];

  function scriptBaseUrl() {
    try {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        var src = scripts[i].src || "";
        var marker = "design-system/js/global-signals/";
        var idx = src.indexOf(marker);
        if (idx !== -1) return src.slice(0, idx);
      }
    } catch (e) {}
    return "/";
  }

  function joinUrl(base, rel) {
    if (!rel) return base || "";
    if (/^https?:\/\//i.test(rel) || rel.charAt(0) === "/") return rel;
    var b = String(base || "/");
    if (b.charAt(b.length - 1) !== "/") b += "/";
    return b + rel.replace(/^\.\//, "");
  }

  function depthPrefix(depth) {
    var d = typeof depth === "number" ? depth : 3;
    var prefix = "";
    for (var i = 0; i < d; i++) prefix += "../";
    return prefix;
  }

  function fetchJson(url, timeoutMs) {
    var ms = timeoutMs == null ? FETCH_TIMEOUT_MS : timeoutMs;
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = null;
    var opts = { credentials: "same-origin" };
    if (ctrl) {
      opts.signal = ctrl.signal;
      timer = setTimeout(function () {
        try {
          ctrl.abort();
        } catch (e) {}
      }, ms);
    }
    var req = fetch(url, opts).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
    if (!ctrl) {
      var timeoutPromise = new Promise(function (_, reject) {
        timer = setTimeout(function () {
          reject(new Error("timeout"));
        }, ms);
      });
      req = Promise.race([req, timeoutPromise]);
    }
    return Promise.resolve(req).then(
      function (value) {
        if (timer) clearTimeout(timer);
        return value;
      },
      function (err) {
        if (timer) clearTimeout(timer);
        throw err;
      }
    );
  }

  function normalizeConfidence(value, opts) {
    opts = opts || {};
    if (value == null || value === "") return "Unknown";
    var lower = String(value).trim().toLowerCase();
    if (lower === "moderate") return "Medium";
    if (lower === "speculative") return "Low";
    var mapped = {
      observed: "Observed",
      high: "High",
      medium: "Medium",
      low: "Low",
      unknown: "Unknown"
    };
    var out = mapped[lower];
    if (!out) return "Unknown";
    if (opts.predicted && out === "Observed") return "Unknown";
    return out;
  }

  function normalizeTimeHorizon(value) {
    if (value == null || value === "") return "Unknown";
    var compact = String(value)
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-");
    var mapped = {
      immediate: "Immediate",
      days: "Days",
      day: "Days",
      weeks: "Weeks",
      week: "Weeks",
      months: "Months",
      month: "Months",
      "long-term": "Long-term",
      longterm: "Long-term"
    };
    return mapped[compact] || "Unknown";
  }

  function normalizeClaim(raw, predicted) {
    if (!raw) {
      return { text: "", confidence: "Unknown", horizon: "Unknown" };
    }
    if (typeof raw === "string") {
      return {
        text: raw.trim(),
        confidence: normalizeConfidence(null, { predicted: predicted }),
        horizon: "Unknown"
      };
    }
    return {
      text: String(raw.text || "").trim(),
      confidence: normalizeConfidence(raw.confidence, { predicted: !!predicted }),
      horizon: normalizeTimeHorizon(raw.horizon || raw.timeHorizon || raw.timeframe)
    };
  }

  function normalizeItems(list, predicted) {
    if (!Array.isArray(list)) return [];
    return list
      .map(function (item) {
        if (!item || typeof item !== "object") return null;
        var label = String(item.label || "").trim();
        if (!label) return null;
        return {
          label: label,
          detail: String(item.detail || item.text || "").trim(),
          confidence: normalizeConfidence(item.confidence, { predicted: !!predicted }),
          horizon: normalizeTimeHorizon(item.horizon || item.timeHorizon || item.timeframe)
        };
      })
      .filter(Boolean);
  }

  function normalizeIndustry(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    var slug = String(raw.slug || "").trim();
    if (!id || !slug) return null;
    var take = raw.waypointsTake || raw.waypointTake || null;
    if (typeof take === "string") take = { analysis: take };

    var countries = Array.isArray(raw.majorCountries)
      ? raw.majorCountries
          .map(function (c) {
            if (!c || typeof c !== "object") return null;
            var cid = String(c.id || "").trim();
            var name = String(c.name || "").trim();
            if (!cid && !name) return null;
            return {
              id: cid || null,
              name: name || "Country unavailable",
              slug: String(c.slug || "").trim() || null,
              role: String(c.role || "").trim()
            };
          })
          .filter(Boolean)
      : [];

    var supply = raw.supplyChain || {};
    var nodes = Array.isArray(supply.nodes)
      ? supply.nodes
          .map(function (n) {
            if (!n || typeof n !== "object") return null;
            var label = String(n.label || "").trim();
            if (!label) return null;
            return {
              label: label,
              type: String(n.type || "node").trim() || "node",
              note: String(n.note || "").trim()
            };
          })
          .filter(Boolean)
      : [];

    var articles = Array.isArray(raw.relatedArticles)
      ? raw.relatedArticles
          .map(function (a) {
            if (!a || typeof a !== "object") return null;
            var aid = String(a.id || "").trim();
            if (!aid) return null;
            return {
              id: aid,
              headline: String(a.headline || "").trim() || "Untitled brief"
            };
          })
          .filter(Boolean)
      : [];

    var citizens = Array.isArray(raw.citizenImpacts)
      ? raw.citizenImpacts
          .map(function (c) {
            if (!c || typeof c !== "object") return null;
            var label = String(c.label || "").trim();
            if (!label) return null;
            return {
              id: String(c.id || "").trim() || null,
              label: label,
              detail: String(c.detail || "").trim(),
              confidence: normalizeConfidence(c.confidence, { predicted: true }),
              horizon: normalizeTimeHorizon(c.horizon || c.timeHorizon)
            };
          })
          .filter(Boolean)
      : [];

    var deps = Array.isArray(raw.topDependencies)
      ? raw.topDependencies
          .map(function (d) {
            if (!d || typeof d !== "object") return null;
            var name = String(d.name || "").trim();
            var slugDep = String(d.slug || "").trim();
            var industryId = String(d.industryId || "").trim();
            if (!name && !slugDep && !industryId) return null;
            return {
              industryId: industryId || null,
              name: name || "Dependency unavailable",
              slug: slugDep || null,
              relation: String(d.relation || "").trim(),
              confidence: normalizeConfidence(d.confidence, { predicted: true })
            };
          })
          .filter(Boolean)
      : [];

    return {
      id: id,
      slug: slug,
      name: String(raw.name || "").trim() || "Untitled industry",
      tagline: String(raw.tagline || "").trim(),
      summary: String(raw.summary || "").trim(),
      whatIsHappening: normalizeClaim(raw.whatIsHappening, false),
      why: normalizeClaim(raw.why, true),
      threats: normalizeItems(raw.threats, true),
      opportunities: normalizeItems(raw.opportunities, true),
      majorCountries: countries,
      supplyChain: {
        overview: String(supply.overview || "").trim(),
        nodes: nodes
      },
      relatedArticles: articles,
      waypointsTake: take,
      citizenImpacts: citizens,
      topDependencies: deps,
      relatedIndustries: Array.isArray(raw.relatedIndustries)
        ? raw.relatedIndustries.map(function (x) {
            return String(x || "").trim();
          }).filter(Boolean)
        : [],
      taxonomyAliases: Array.isArray(raw.taxonomyAliases)
        ? raw.taxonomyAliases.map(function (x) {
            return String(x || "").trim();
          }).filter(Boolean)
        : []
    };
  }

  function badge(label, kind) {
    var cls = "gsi-badge";
    if (kind === "confidence") {
      cls += " gsi-badge--confidence";
      return (
        '<span class="' +
        cls +
        '" data-confidence="' +
        esc(label) +
        '">' +
        esc(label) +
        "</span>"
      );
    }
    return '<span class="' + cls + '">' + esc(label) + "</span>";
  }

  function claimMeta(claim) {
    return (
      '<p class="gsi-meta">' +
      badge("Confidence · " + claim.confidence, "confidence") +
      badge("Horizon · " + claim.horizon) +
      "</p>"
    );
  }

  function renderBanner(meta) {
    var label = (meta && meta.modeLabel) || "Curated baseline";
    var banner =
      (meta && meta.honesty && meta.honesty.banner) ||
      "Curated baseline intelligence — not a live breaking-news feed.";
    return (
      '<aside class="gsi-banner" role="status">' +
      '<p class="gsi-badge gsi-badge--mode">' +
      esc(label) +
      "</p>" +
      "<p>" +
      esc(banner) +
      "</p></aside>"
    );
  }

  function takeHasSubstance(take) {
    if (!take) return false;
    if (typeof take === "string") return take.trim().length > 0;
    return Boolean(
      (take.whyItMatters && String(take.whyItMatters).trim()) ||
        (take.analysis && String(take.analysis).trim())
    );
  }

  function renderTake(take) {
    if (!takeHasSubstance(take)) {
      return (
        '<section class="gsi-take gsi-take--empty" aria-labelledby="gsi-take-title">' +
        '<h2 id="gsi-take-title">Waypoint\u2019s Take</h2>' +
        '<p class="gsi-note">Analysis · interpretation, not established fact</p>' +
        "<p>No Waypoint\u2019s Take is available for this industry. We will not invent one.</p>" +
        "</section>"
      );
    }
    var parts = [];
    if (take.whyItMatters && String(take.whyItMatters).trim()) {
      parts.push(
        "<p><strong>Why it matters.</strong> " + esc(take.whyItMatters) + "</p>"
      );
    }
    if (take.analysis && String(take.analysis).trim()) {
      parts.push("<p>" + esc(take.analysis) + "</p>");
    }
    return (
      '<section class="gsi-take" aria-labelledby="gsi-take-title">' +
      '<h2 id="gsi-take-title">Waypoint\u2019s Take</h2>' +
      '<p class="gsi-note">Analysis · interpretation, not established fact</p>' +
      parts.join("") +
      "</section>"
    );
  }

  function renderItemList(title, id, items, emptyMsg) {
    if (!items || !items.length) {
      return (
        '<section class="gsi-section" aria-labelledby="' +
        esc(id) +
        '">' +
        "<h2 id=\"" +
        esc(id) +
        '">' +
        esc(title) +
        "</h2>" +
        '<p class="gsi-empty">' +
        esc(emptyMsg || "Not tagged.") +
        "</p></section>"
      );
    }
    var lis = items
      .map(function (item) {
        return (
          '<li class="gsi-item">' +
          "<h3>" +
          esc(item.label) +
          "</h3>" +
          '<p class="gsi-meta">' +
          badge(item.confidence, "confidence") +
          badge(item.horizon) +
          "</p>" +
          (item.detail ? "<p>" + esc(item.detail) + "</p>" : "") +
          "</li>"
        );
      })
      .join("");
    return (
      '<section class="gsi-section" aria-labelledby="' +
      esc(id) +
      '">' +
      "<h2 id=\"" +
      esc(id) +
      '">' +
      esc(title) +
      "</h2>" +
      '<ul class="gsi-item-list">' +
      lis +
      "</ul></section>"
    );
  }

  function countryHref(c, crossLinks) {
    var base =
      (crossLinks && crossLinks.countriesBase) ||
      "/side-trails/global-signals/countries/";
    if (c.slug) return base + encodeURIComponent(c.slug) + "/";
    if (c.id) return base + "?" + "id=" + encodeURIComponent(c.id);
    return base;
  }

  function articleHref(a, crossLinks) {
    var base =
      (crossLinks && crossLinks.articlesBase) ||
      "/side-trails/global-signals/articles/";
    return base + "?id=" + encodeURIComponent(a.id);
  }

  function citizenHref(c, crossLinks) {
    var base =
      (crossLinks && crossLinks.citizenImpactBase) ||
      "/side-trails/global-signals/citizen-impact/";
    if (c.id) return base + "?category=" + encodeURIComponent(c.id);
    return base + "?category=" + encodeURIComponent(c.label);
  }

  function industryHref(slug, relative) {
    if (relative) return "../" + encodeURIComponent(slug) + "/";
    return "./" + encodeURIComponent(slug) + "/";
  }

  function renderCountries(countries, crossLinks) {
    if (!countries.length) {
      return (
        '<section class="gsi-section" aria-labelledby="gsi-countries">' +
        '<h2 id="gsi-countries">Major countries involved</h2>' +
        '<p class="gsi-empty">Countries not tagged.</p></section>'
      );
    }
    var lis = countries
      .map(function (c) {
        return (
          '<li class="gsi-link-card">' +
          '<a href="' +
          esc(countryHref(c, crossLinks)) +
          '" data-entity="country" data-id="' +
          esc(c.id || "") +
          '">' +
          esc(c.name) +
          "</a>" +
          (c.role ? "<p>" + esc(c.role) + "</p>" : "") +
          '<p class="gsi-softlink">Country Intelligence soft-link · stable id ' +
          esc(c.id || "n/a") +
          "</p></li>"
        );
      })
      .join("");
    return (
      '<section class="gsi-section" aria-labelledby="gsi-countries">' +
      '<h2 id="gsi-countries">Major countries involved</h2>' +
      '<ul class="gsi-link-grid">' +
      lis +
      "</ul></section>"
    );
  }

  function renderSupply(supply) {
    var overview = supply.overview
      ? "<p>" + esc(supply.overview) + "</p>"
      : '<p class="gsi-empty">Supply chain overview unavailable.</p>';
    var chain = "";
    if (supply.nodes && supply.nodes.length) {
      chain =
        '<ol class="gsi-chain" aria-label="Supply chain stages">' +
        supply.nodes
          .map(function (n, i) {
            return (
              '<li class="gsi-chain__step" data-type="' +
              esc(n.type) +
              '">' +
              "<strong>" +
              esc(n.label) +
              "</strong>" +
              (n.note ? "<p>" + esc(n.note) + "</p>" : "") +
              (i < supply.nodes.length - 1
                ? '<span class="gsi-chain__arrow" aria-hidden="true">→</span>'
                : "") +
              "</li>"
            );
          })
          .join("") +
        "</ol>";
    }
    return (
      '<section class="gsi-section" aria-labelledby="gsi-supply">' +
      '<h2 id="gsi-supply">Supply chain</h2>' +
      overview +
      chain +
      "</section>"
    );
  }

  function renderArticles(articles, crossLinks) {
    if (!articles.length) {
      return (
        '<section class="gsi-section" aria-labelledby="gsi-articles">' +
        '<h2 id="gsi-articles">Related articles</h2>' +
        '<p class="gsi-empty">No related articles tagged.</p></section>'
      );
    }
    var lis = articles
      .map(function (a) {
        return (
          '<li><a href="' +
          esc(articleHref(a, crossLinks)) +
          '" data-entity="article" data-id="' +
          esc(a.id) +
          '">' +
          esc(a.headline) +
          "</a>" +
          '<span class="gsi-id">' +
          esc(a.id) +
          "</span></li>"
        );
      })
      .join("");
    return (
      '<section class="gsi-section" aria-labelledby="gsi-articles">' +
      '<h2 id="gsi-articles">Related articles</h2>' +
      '<ul class="gsi-plain-list">' +
      lis +
      "</ul></section>"
    );
  }

  function renderCitizens(items, crossLinks) {
    if (!items.length) {
      return (
        '<section class="gsi-section" aria-labelledby="gsi-citizen">' +
        '<h2 id="gsi-citizen">Citizen impacts</h2>' +
        '<p class="gsi-empty">Citizen impacts not tagged.</p></section>'
      );
    }
    var lis = items
      .map(function (c) {
        return (
          '<li class="gsi-item">' +
          '<h3><a href="' +
          esc(citizenHref(c, crossLinks)) +
          '" data-entity="citizen-impact" data-id="' +
          esc(c.id || "") +
          '">' +
          esc(c.label) +
          "</a></h3>" +
          '<p class="gsi-meta">' +
          badge(c.confidence, "confidence") +
          badge(c.horizon) +
          "</p>" +
          (c.detail ? "<p>" + esc(c.detail) + "</p>" : "") +
          "</li>"
        );
      })
      .join("");
    return (
      '<section class="gsi-section" aria-labelledby="gsi-citizen">' +
      '<h2 id="gsi-citizen">Citizen impacts</h2>' +
      '<p class="gsi-note">Soft-links to Citizen Impact categories (parallel module may still be a shell).</p>' +
      '<ul class="gsi-item-list">' +
      lis +
      "</ul></section>"
    );
  }

  function renderDeps(deps, byId) {
    if (!deps.length) {
      return (
        '<section class="gsi-section" aria-labelledby="gsi-deps">' +
        '<h2 id="gsi-deps">Top dependencies</h2>' +
        '<p class="gsi-empty">Dependencies not tagged.</p></section>'
      );
    }
    var lis = deps
      .map(function (d) {
        var href = d.slug ? industryHref(d.slug, true) : null;
        if (!href && d.industryId && byId[d.industryId]) {
          href = industryHref(byId[d.industryId].slug, true);
        }
        var title = href
          ? '<a href="' +
            esc(href) +
            '" data-entity="industry" data-id="' +
            esc(d.industryId || "") +
            '">' +
            esc(d.name) +
            "</a>"
          : esc(d.name);
        return (
          '<li class="gsi-item"><h3>' +
          title +
          "</h3>" +
          '<p class="gsi-meta">' +
          badge(d.confidence, "confidence") +
          "</p>" +
          (d.relation ? "<p>" + esc(d.relation) + "</p>" : "") +
          "</li>"
        );
      })
      .join("");
    return (
      '<section class="gsi-section" aria-labelledby="gsi-deps">' +
      '<h2 id="gsi-deps">Top dependencies</h2>' +
      '<ul class="gsi-item-list">' +
      lis +
      "</ul></section>"
    );
  }

  function renderRelatedIndustries(ids, byId) {
    var list = (ids || [])
      .map(function (id) {
        return byId[id];
      })
      .filter(Boolean);
    if (!list.length) return "";
    var lis = list
      .map(function (ind) {
        return (
          '<li><a href="' +
          esc(industryHref(ind.slug, true)) +
          '" data-entity="industry" data-id="' +
          esc(ind.id) +
          '">' +
          esc(ind.name) +
          "</a></li>"
        );
      })
      .join("");
    return (
      '<section class="gsi-section" aria-labelledby="gsi-related">' +
      '<h2 id="gsi-related">Related industries</h2>' +
      '<ul class="gsi-chip-links">' +
      lis +
      "</ul></section>"
    );
  }

  function looksLikePortOrRoute(text) {
    return /port|canal|strait|hub|gateway|corridor|lane|transshipment|terminal/i.test(
      String(text || "")
    );
  }

  function renderPortsRoutes(ind, crossLinks) {
    var items = [];
    (ind.majorCountries || []).forEach(function (c) {
      if (!looksLikePortOrRoute(c.role) && !looksLikePortOrRoute(c.name)) return;
      items.push({
        label: c.name,
        detail: c.role || "",
        href: countryHref(c, crossLinks),
        id: c.id || ""
      });
    });
    (ind.supplyChain && ind.supplyChain.nodes ? ind.supplyChain.nodes : []).forEach(
      function (n) {
        if (!looksLikePortOrRoute(n.label) && !looksLikePortOrRoute(n.note) && n.type !== "infrastructure")
          return;
        if (!looksLikePortOrRoute(n.label) && !looksLikePortOrRoute(n.note)) return;
        items.push({
          label: n.label,
          detail: n.note || "",
          href: null,
          id: ""
        });
      }
    );
    var body;
    if (!items.length) {
      body =
        '<p class="gsi-empty">No port or route nodes are tagged on this structural baseline.</p>';
    } else {
      body =
        '<ul class="gsi-item-list">' +
        items
          .map(function (it) {
            var title = it.href
              ? '<a href="' +
                esc(it.href) +
                '" data-entity="country" data-id="' +
                esc(it.id) +
                '">' +
                esc(it.label) +
                "</a>"
              : esc(it.label);
            return (
              '<li class="gsi-item"><h3>' +
              title +
              "</h3>" +
              (it.detail ? "<p>" + esc(it.detail) + "</p>" : "") +
              "</li>"
            );
          })
          .join("") +
        "</ul>";
    }
    return (
      '<section class="gsi-section" aria-labelledby="gsi-ports">' +
      '<h2 id="gsi-ports">Ports &amp; routes</h2>' +
      '<p class="gsi-note">Structural nodes from the industry baseline — not a live vessel or AIS feed.</p>' +
      body +
      "</section>"
    );
  }

  function industryImpactMatches(impact, ind) {
    if (!impact || !ind) return false;
    var label = String(impact.affectedEntityLabel || "").toLowerCase();
    var entity = String(impact.affectedEntity || "").toLowerCase();
    var name = String(ind.name || "").toLowerCase();
    var slug = String(ind.slug || "").toLowerCase();
    var id = String(ind.id || "").toLowerCase();
    if (label && label === name) return true;
    if (entity && (entity === id || entity.indexOf(slug) !== -1)) return true;
    if (label && slug && label.indexOf(slug) !== -1) return true;
    var aliases = ind.taxonomyAliases || [];
    for (var i = 0; i < aliases.length; i++) {
      if (label && label === String(aliases[i] || "").toLowerCase()) return true;
    }
    return false;
  }

  function renderLiveDevelopments(ind, livePayload) {
    var status = (livePayload && livePayload._gsiLiveStatus) || "missing";
    var impacts = ((livePayload && livePayload.impacts) || []).filter(function (imp) {
      return industryImpactMatches(imp, ind);
    });
    var note =
      '<p class="gsi-note">Live activations are evidence-backed exposure paths — analysis, not Observed facts. We will not invent developments.</p>';
    var statusLine =
      '<p class="gsi-meta">' +
      badge("Live · " + String(status)) +
      (livePayload && livePayload.updatedAt
        ? badge("Updated · " + String(livePayload.updatedAt).slice(0, 10))
        : "") +
      "</p>";
    var body;
    if (status === "error") {
      body =
        '<p class="gsi-empty" role="status">Live industry impacts could not be loaded (' +
        esc((livePayload && livePayload._gsiLiveError) || "request failed") +
        "). Structural baseline below is still shown when available.</p>";
    } else if (!impacts.length) {
      body =
        '<p class="gsi-empty" role="status">No live activations currently reach ' +
        esc(ind.name) +
        ". The structural baseline remains available below.</p>";
    } else {
      body =
        '<ul class="gsi-item-list">' +
        impacts
          .map(function (imp) {
            var evidence = Array.isArray(imp.evidence) ? imp.evidence : [];
            var ev =
              evidence.length && evidence[0] && evidence[0].url
                ? ' <a href="' +
                  esc(evidence[0].url) +
                  '" rel="noopener noreferrer">Source</a>'
                : "";
            return (
              '<li class="gsi-item"><h3>' +
              esc(imp.originEventTitle || imp.id || "Live impact") +
              "</h3>" +
              '<p class="gsi-meta">' +
              badge(imp.orderLabel || "Impact") +
              badge(normalizeConfidence(imp.confidence, { predicted: true }), "confidence") +
              badge(normalizeTimeHorizon(imp.timeHorizon || imp.horizon)) +
              "</p>" +
              (imp.whyThisIsShowing
                ? "<p>" + esc(imp.whyThisIsShowing) + "</p>"
                : "") +
              (ev ? "<p>" + ev + "</p>" : "") +
              "</li>"
            );
          })
          .join("") +
        "</ul>";
    }
    return (
      '<section class="gsi-section" aria-labelledby="gsi-live">' +
      '<h2 id="gsi-live">Live developments</h2>' +
      note +
      statusLine +
      body +
      "</section>"
    );
  }

  function renderIndexCard(ind) {
    return (
      '<article class="gsi-card" data-gsi-id="' +
      esc(ind.id) +
      '">' +
      '<p class="gsi-meta">' +
      badge(ind.id) +
      "</p>" +
      "<h2><a href=\"" +
      esc(industryHref(ind.slug, false)) +
      '">' +
      esc(ind.name) +
      "</a></h2>" +
      (ind.tagline ? '<p class="gsi-card__tagline">' + esc(ind.tagline) + "</p>" : "") +
      (ind.summary ? "<p>" + esc(ind.summary) + "</p>" : "") +
      '<p class="gsi-card__cta"><a class="gs-cta" href="' +
      esc(industryHref(ind.slug, false)) +
      '">Open industry</a></p>' +
      "</article>"
    );
  }

  function renderIndex(payload) {
    var industries = (payload.industries || [])
      .map(normalizeIndustry)
      .filter(Boolean);
    if (!industries.length) {
      return (
        renderBanner(payload) +
        '<p class="gsi-empty" role="status">Industry intelligence will appear here when curated baselines are available. We will not invent live events.</p>'
      );
    }
    return (
      renderBanner(payload) +
      '<p class="gsi-count">' +
      industries.length +
      " industries · interconnected baselines</p>" +
      '<div class="gsi-grid">' +
      industries.map(renderIndexCard).join("") +
      "</div>" +
      '<nav class="gsi-crossnav" aria-label="Related Global Signals modules">' +
      "<h2>Explore connections</h2>" +
      "<ul>" +
      '<li><a href="../articles/">Articles</a></li>' +
      '<li><a href="../citizen-impact/">Citizen Impact</a></li>' +
      '<li><a href="../relationship-graph/">Relationship Graph</a></li>' +
      '<li><a href="../supply-chains/">Supply Chains</a></li>' +
      "</ul></nav>"
    );
  }

  function renderDetail(ind, payload, byId) {
    var cross = (payload && payload.crossLinks) || {};
    var what = ind.whatIsHappening;
    var why = ind.why;
    var relExplorer =
      (cross.relationshipExplorerBase ||
        "/side-trails/global-signals/relationship-graph/") +
      "?focus=industry&id=" +
      encodeURIComponent(ind.id);

    return (
      renderBanner(payload) +
      '<article class="gsi-detail" data-gsi-id="' +
      esc(ind.id) +
      '" data-gsi-slug="' +
      esc(ind.slug) +
      '">' +
      '<header class="gsi-detail__head">' +
      '<p class="gsi-meta">' +
      badge("Industry") +
      badge(ind.id) +
      "</p>" +
      "<h1>" +
      esc(ind.name) +
      "</h1>" +
      (ind.tagline ? '<p class="gsi-detail__tagline">' + esc(ind.tagline) + "</p>" : "") +
      (ind.summary ? "<p>" + esc(ind.summary) + "</p>" : "") +
      "</header>" +
      '<section class="gsi-section" aria-labelledby="gsi-what">' +
      '<h2 id="gsi-what">What is happening?</h2>' +
      '<p class="gsi-note">Curated baseline context — not a live ticker</p>' +
      claimMeta(what) +
      "<p>" +
      esc(what.text || "What-is-happening unavailable.") +
      "</p></section>" +
      '<section class="gsi-section" aria-labelledby="gsi-why">' +
      '<h2 id="gsi-why">Why?</h2>' +
      claimMeta(why) +
      "<p>" +
      esc(why.text || "Why unavailable.") +
      "</p></section>" +
      renderLiveDevelopments(ind, payload && payload.liveImpacts) +
      renderItemList("Current threats", "gsi-threats", ind.threats, "Threats not tagged.") +
      renderItemList(
        "Current opportunities",
        "gsi-opps",
        ind.opportunities,
        "Opportunities not tagged."
      ) +
      renderCountries(ind.majorCountries, cross) +
      renderPortsRoutes(ind, cross) +
      renderSupply(ind.supplyChain) +
      renderArticles(ind.relatedArticles, cross) +
      renderTake(ind.waypointsTake) +
      renderCitizens(ind.citizenImpacts, cross) +
      renderDeps(ind.topDependencies, byId) +
      renderRelatedIndustries(ind.relatedIndustries, byId) +
      '<nav class="gsi-crossnav" aria-label="Interconnect">' +
      "<h2>Interconnect</h2>" +
      "<ul>" +
      '<li><a href="../">All industries</a></li>' +
      '<li><a href="../../articles/">Articles</a></li>' +
      '<li><a href="' +
      esc(relExplorer) +
      '" data-entity="relationship-explorer">Relationship Explorer soft-link</a></li>' +
      '<li><a href="../../citizen-impact/">Citizen Impact</a></li>' +
      '<li><a href="../../">Global Signals</a></li>' +
      "</ul></nav>" +
      "</article>"
    );
  }

  function buildIndex(byId, list) {
    list.forEach(function (ind) {
      byId[ind.id] = ind;
    });
    return byId;
  }

  function resolveDataUrl(el, depth, configured) {
    if (configured) return configured;
    if (el && el.getAttribute && el.getAttribute("data-gsi-data")) {
      return el.getAttribute("data-gsi-data");
    }
    var relative = depthPrefix(depth == null ? 3 : depth) + INDUSTRIES_REL;
    var absolute = joinUrl(scriptBaseUrl(), INDUSTRIES_REL);
    return { relative: relative, absolute: absolute };
  }

  function candidateUrls(primary, depth) {
    var out = [];
    var seen = {};
    function add(u) {
      if (!u || seen[u]) return;
      seen[u] = true;
      out.push(u);
    }
    if (primary && typeof primary === "object") {
      add(primary.relative);
      add(primary.absolute);
    } else {
      add(primary);
    }
    add(depthPrefix(depth == null ? 4 : depth) + INDUSTRIES_REL);
    add(joinUrl(scriptBaseUrl(), INDUSTRIES_REL));
    add("/" + INDUSTRIES_REL);
    return out;
  }

  function loadIndustryDataset(opts) {
    opts = opts || {};
    var depth = opts.depth;
    var primary = resolveDataUrl(opts.el, depth, opts.dataUrl);
    var urls = candidateUrls(primary, depth);
    var lastErr = null;
    var i = 0;

    function next() {
      if (i >= urls.length) {
        return Promise.reject(lastErr || new Error("Industry dataset unavailable"));
      }
      var url = urls[i++];
      return fetchJson(url, opts.timeoutMs).catch(function (err) {
        lastErr = err;
        return next();
      });
    }

    return next().then(function (payload) {
      payload = payload || {};
      payload._gsiResolvedFrom = urls[Math.max(0, i - 1)];
      return attachLiveImpacts(payload, opts);
    });
  }

  function liveImpactCandidates(opts) {
    opts = opts || {};
    var configured =
      opts.liveDataUrl ||
      (opts.el && opts.el.getAttribute && opts.el.getAttribute("data-gsi-live"));
    var out = [];
    var seen = {};
    function add(u) {
      if (!u || seen[u]) return;
      seen[u] = true;
      out.push(u);
    }
    add(configured);
    add(depthPrefix(opts.depth == null ? 4 : opts.depth) + LIVE_IMPACTS_REL);
    add(joinUrl(scriptBaseUrl(), LIVE_IMPACTS_REL));
    add("/" + LIVE_IMPACTS_REL);
    return out;
  }

  function attachLiveImpacts(payload, opts) {
    var urls = liveImpactCandidates(opts);
    var i = 0;
    var lastErr = null;

    function next() {
      if (i >= urls.length) {
        payload.liveImpacts = {
          mode: "live-empty",
          impacts: [],
          _gsiLiveStatus: lastErr ? "error" : "missing",
          _gsiLiveError: lastErr ? String(lastErr.message || lastErr) : "not_found"
        };
        return payload;
      }
      var url = urls[i++];
      return fetchJson(url, opts.timeoutMs)
        .then(function (live) {
          live = live || {};
          var mode = String(live.mode || "");
          var loader = GS.loader;
          if (loader && typeof loader.gateDataset === "function") {
            var gated = loader.gateDataset(live, { allowFixture: !!opts.allowFixture });
            if (!gated.ok) {
              throw new Error(gated.message || gated.reason || "non_production_live_impacts");
            }
          } else if (mode && mode !== "live" && mode !== "live-empty" && !opts.allowFixture) {
            throw new Error("Refusing non-production live impacts mode: " + mode);
          }
          live._gsiLiveStatus =
            Array.isArray(live.impacts) && live.impacts.length ? "live" : "live-empty";
          live._gsiResolvedFrom = url;
          payload.liveImpacts = live;
          return payload;
        })
        .catch(function (err) {
          lastErr = err;
          return next();
        });
    }

    return Promise.resolve()
      .then(next)
      .catch(function () {
        payload.liveImpacts = {
          mode: "live-empty",
          impacts: [],
          _gsiLiveStatus: "error",
          _gsiLiveError: "live_impacts_unavailable"
        };
        return payload;
      });
  }

  function setState(el, state) {
    if (el) el.setAttribute("data-gsi-state", state);
  }

  function renderLoadError(message, withBack) {
    return (
      '<p class="gsi-empty" role="alert">' +
      esc(message) +
      (withBack ? ' <a href="../">Back to industries</a>' : "") +
      "</p>"
    );
  }

  function mountIndex(el, opts) {
    opts = opts || {};
    if (!el) return Promise.resolve(null);
    if (el.getAttribute("data-gsi-booted") === "1" && el.getAttribute("data-gsi-state") !== "loading") {
      return Promise.resolve(null);
    }
    el.setAttribute("data-gsi-booted", "1");
    opts.el = el;
    if (opts.depth == null) opts.depth = 3;
    setState(el, "loading");
    el.setAttribute("aria-busy", "true");
    el.innerHTML = '<p class="gsi-empty" role="status">Loading industry intelligence\u2026</p>';
    return loadIndustryDataset(opts)
      .then(function (payload) {
        var html = renderIndex(payload || {});
        el.innerHTML = html;
        var empty = !(payload && payload.industries && payload.industries.length);
        setState(el, empty ? "empty" : "ready");
        el.setAttribute("aria-busy", "false");
        return payload;
      })
      .catch(function () {
        el.innerHTML = renderLoadError(
          "Industry intelligence could not be loaded. The dataset may be unavailable — we will not invent content.",
          false
        );
        setState(el, "error");
        el.setAttribute("aria-busy", "false");
        return null;
      });
  }

  function mountDetail(el, opts) {
    opts = opts || {};
    if (!el) return Promise.resolve(null);
    if (el.getAttribute("data-gsi-booted") === "1" && el.getAttribute("data-gsi-state") !== "loading") {
      return Promise.resolve(null);
    }
    el.setAttribute("data-gsi-booted", "1");
    opts.el = el;
    if (opts.depth == null) opts.depth = 4;
    var slug =
      opts.slug ||
      (el.getAttribute && el.getAttribute("data-gsi-slug")) ||
      "";
    slug = String(slug || "").trim();
    setState(el, "loading");
    el.setAttribute("aria-busy", "true");
    el.innerHTML = '<p class="gsi-empty" role="status">Loading industry\u2026</p>';
    if (!slug) {
      el.innerHTML = renderLoadError("Industry slug missing.", true);
      setState(el, "error");
      el.setAttribute("aria-busy", "false");
      return Promise.resolve(null);
    }
    return loadIndustryDataset(opts)
      .then(function (payload) {
        var list = (payload.industries || []).map(normalizeIndustry).filter(Boolean);
        var byId = buildIndex({}, list);
        var ind = null;
        for (var i = 0; i < list.length; i++) {
          if (list[i].slug === slug) {
            ind = list[i];
            break;
          }
        }
        if (!ind) {
          el.innerHTML = renderLoadError("Industry not found.", true);
          setState(el, "error");
          el.setAttribute("aria-busy", "false");
          return null;
        }
        el.innerHTML = renderDetail(ind, payload, byId);
        setState(el, "ready");
        el.setAttribute("aria-busy", "false");
        if (global.document && document.title) {
          document.title = ind.name + " — Industry Intelligence · Global Signals";
        }
        return ind;
      })
      .catch(function () {
        el.innerHTML = renderLoadError(
          "Industry intelligence could not be loaded.",
          true
        );
        setState(el, "error");
        el.setAttribute("aria-busy", "false");
        return null;
      });
  }

  function boot(root) {
    var doc = root || (global.document ? document : null);
    if (!doc || !doc.querySelectorAll) return [];
    var jobs = [];
    var indexes = doc.querySelectorAll("[data-gsi-index]");
    for (var i = 0; i < indexes.length; i++) {
      var idxEl = indexes[i];
      if (idxEl.getAttribute("data-gsi-booted") === "1") continue;
      idxEl.setAttribute("data-gsi-booted", "1");
      jobs.push(
        mountIndex(idxEl, {
          depth: Number(idxEl.getAttribute("data-gsi-depth") || 3),
          dataUrl: idxEl.getAttribute("data-gsi-data") || undefined,
          liveDataUrl: idxEl.getAttribute("data-gsi-live") || undefined
        })
      );
    }
    var details = doc.querySelectorAll("[data-gsi-detail]");
    for (var j = 0; j < details.length; j++) {
      var el = details[j];
      if (el.getAttribute("data-gsi-booted") === "1") continue;
      el.setAttribute("data-gsi-booted", "1");
      jobs.push(
        mountDetail(el, {
          slug: el.getAttribute("data-gsi-slug") || undefined,
          depth: Number(el.getAttribute("data-gsi-depth") || 4),
          dataUrl: el.getAttribute("data-gsi-data") || undefined,
          liveDataUrl: el.getAttribute("data-gsi-live") || undefined
        })
      );
    }
    return jobs;
  }

  function autoBoot() {
    try {
      boot();
    } catch (e) {}
  }

  if (global.document) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", autoBoot);
    } else {
      autoBoot();
    }
  }

  GS.industries = {
    normalizeConfidence: normalizeConfidence,
    normalizeTimeHorizon: normalizeTimeHorizon,
    normalizeIndustry: normalizeIndustry,
    normalizeClaim: normalizeClaim,
    renderIndex: renderIndex,
    renderDetail: renderDetail,
    renderTake: renderTake,
    renderIndexCard: renderIndexCard,
    renderLiveDevelopments: renderLiveDevelopments,
    renderPortsRoutes: renderPortsRoutes,
    takeHasSubstance: takeHasSubstance,
    resolveDataUrl: resolveDataUrl,
    candidateUrls: candidateUrls,
    loadIndustryDataset: loadIndustryDataset,
    fetchJson: fetchJson,
    mountIndex: mountIndex,
    mountDetail: mountDetail,
    boot: boot,
    FETCH_TIMEOUT_MS: FETCH_TIMEOUT_MS,
    CONFIDENCE_ALLOWED: CONFIDENCE_ALLOWED,
    HORIZON_ALLOWED: HORIZON_ALLOWED
  };
})(typeof window !== "undefined" ? window : globalThis);
