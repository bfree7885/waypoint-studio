/**
 * Global Signals — Country Intelligence (sample/demo).
 * Index + detail for labeled structural country profiles.
 * Does not invent live news or fill missing sections with fabrications.
 */
(function (global) {
  "use strict";

  var NS = (global.WDS = global.WDS || {});
  var GS = (NS.globalSignals = NS.globalSignals || {});

  var CONFIDENCE_ALLOWED = ["Observed", "High", "Medium", "Low", "Unknown"];
  var HORIZON_ALLOWED = ["Immediate", "Days", "Weeks", "Months", "Long-term"];
  var CITIZEN_CATEGORIES = [
    "food",
    "fuel",
    "utilities",
    "housing",
    "travel",
    "healthcare",
    "insurance",
    "technology"
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeConfidence(value, opts) {
    opts = opts || {};
    if (value == null || value === "") return "Unknown";
    var raw = String(value).trim();
    var lower = raw.toLowerCase();
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
    var lower = String(value)
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
    return mapped[lower] || "Unknown";
  }

  function normalizeStringList(value) {
    if (!value) return [];
    if (!Array.isArray(value)) value = [value];
    return value
      .map(function (v) {
        return String(v == null ? "" : v).trim();
      })
      .filter(Boolean);
  }

  function normalizeNamedList(value, nameKeys) {
    nameKeys = nameKeys || ["name", "commodity", "title"];
    if (!value) return [];
    if (!Array.isArray(value)) value = [value];
    return value
      .map(function (raw) {
        if (raw == null) return null;
        if (typeof raw === "string") {
          var s = raw.trim();
          return s ? { name: s, notes: "" } : null;
        }
        if (typeof raw !== "object") return null;
        var name = "";
        for (var i = 0; i < nameKeys.length; i++) {
          if (raw[nameKeys[i]]) {
            name = String(raw[nameKeys[i]]).trim();
            if (name) break;
          }
        }
        if (!name) return null;
        return {
          name: name,
          notes: String(raw.notes || raw.summary || "").trim(),
          type: String(raw.type || "").trim()
        };
      })
      .filter(Boolean);
  }

  function queryParam(name) {
    try {
      var u = new URL(global.location.href);
      return u.searchParams.get(name);
    } catch (e) {
      return null;
    }
  }

  function slugFromPath() {
    try {
      var parts = String(global.location.pathname || "")
        .replace(/\/+$/, "")
        .split("/");
      var last = parts[parts.length - 1] || "";
      if (!last || last === "countries" || last === "index.html") return null;
      return last;
    } catch (e) {
      return null;
    }
  }

  function resolveDetailKey(opts) {
    opts = opts || {};
    if (opts.slug) return String(opts.slug).trim();
    if (opts.id) return String(opts.id).trim();
    var q = queryParam("id") || queryParam("slug");
    if (q) return String(q).trim();
    return slugFromPath();
  }

  function normalizeCountry(raw) {
    if (!raw || typeof raw !== "object") return null;
    var slug = String(raw.slug || "").trim();
    var id = String(raw.id || "").trim();
    if (!slug && !id) return null;
    if (!slug && id.indexOf("gsc_") === 0) slug = id.slice(4);
    if (!id && slug) id = "gsc_" + slug;

    var events = Array.isArray(raw.currentEvents) ? raw.currentEvents : [];
    events = events
      .map(function (ev) {
        if (!ev || typeof ev !== "object") return null;
        var title = String(ev.title || "").trim();
        if (!title) return null;
        return {
          title: title,
          summary: String(ev.summary || "").trim(),
          asOf: ev.asOf || ev.date || null,
          kind: String(ev.kind || "structural-context").trim(),
          confidence: normalizeConfidence(ev.confidence),
          timeHorizon: normalizeTimeHorizon(ev.timeHorizon),
          label: String(ev.label || "Sample / demo · not live news").trim()
        };
      })
      .filter(Boolean);

    var trades = Array.isArray(raw.tradeRelationships) ? raw.tradeRelationships : [];
    trades = trades
      .map(function (t) {
        if (!t || typeof t !== "object") return null;
        var partnerSlug = String(t.partnerSlug || t.slug || "").trim();
        var partnerName = String(t.partnerName || t.name || "").trim();
        if (!partnerName && !partnerSlug) return null;
        return {
          partnerSlug: partnerSlug,
          partnerName: partnerName || partnerSlug,
          nature: String(t.nature || t.notes || "").trim(),
          confidence: normalizeConfidence(t.confidence),
          timeHorizon: normalizeTimeHorizon(t.timeHorizon || "Long-term")
        };
      })
      .filter(Boolean);

    var risks = Array.isArray(raw.currentRisks) ? raw.currentRisks : [];
    risks = risks
      .map(function (r) {
        if (!r || typeof r !== "object") return null;
        var title = String(r.title || "").trim();
        if (!title) return null;
        return {
          title: title,
          summary: String(r.summary || "").trim(),
          confidence: normalizeConfidence(r.confidence, { predicted: true }),
          timeHorizon: normalizeTimeHorizon(r.timeHorizon),
          label: String(r.label || "Illustrative risk framing · sample/demo").trim()
        };
      })
      .filter(Boolean);

    var citizen = Array.isArray(raw.citizenImpactConnections)
      ? raw.citizenImpactConnections
      : [];
    citizen = citizen
      .map(function (c) {
        if (!c || typeof c !== "object") return null;
        var category = String(c.category || "")
          .trim()
          .toLowerCase();
        if (category === "gasoline") category = "fuel";
        if (CITIZEN_CATEGORIES.indexOf(category) === -1) return null;
        return {
          category: category,
          summary: String(c.summary || "").trim(),
          confidence: normalizeConfidence(c.confidence, { predicted: true }),
          timeHorizon: normalizeTimeHorizon(c.timeHorizon),
          href: String(c.href || "").trim()
        };
      })
      .filter(Boolean);

    return {
      id: id,
      slug: slug,
      name: String(raw.name || slug || "").trim() || "Untitled country",
      iso2: String(raw.iso2 || "").trim().toUpperCase(),
      region: String(raw.region || "").trim(),
      summary: String(raw.summary || "").trim(),
      currentEvents: events,
      majorIndustries: normalizeNamedList(raw.majorIndustries),
      exports: normalizeNamedList(raw.exports, ["name", "commodity"]),
      imports: normalizeNamedList(raw.imports, ["name", "commodity"]),
      criticalInfrastructure: normalizeNamedList(raw.criticalInfrastructure),
      majorPorts: normalizeNamedList(raw.majorPorts),
      tradeRelationships: trades,
      currentRisks: risks,
      relatedArticles: normalizeStringList(raw.relatedArticles),
      citizenImpactConnections: citizen
    };
  }

  function findCountry(countries, key) {
    if (!key) return null;
    var k = String(key).trim().toLowerCase();
    for (var i = 0; i < countries.length; i++) {
      var c = countries[i];
      if (
        c.slug.toLowerCase() === k ||
        c.id.toLowerCase() === k ||
        ("gsc_" + c.slug).toLowerCase() === k
      ) {
        return c;
      }
    }
    return null;
  }

  function renderBanner(data) {
    if (!data || data.mode !== "sample-demo") return "";
    var label = data.modeLabel || "Sample / demo dataset";
    var honesty =
      (data.honesty && data.honesty.banner) ||
      "Sample / demo country intelligence — not a live news feed.";
    return (
      '<div class="gsc-banner" role="status">' +
      '<p class="gsc-badge">' +
      esc(label) +
      "</p>" +
      "<p>" +
      esc(honesty) +
      "</p>" +
      "</div>"
    );
  }

  function renderMetaChips(confidence, horizon) {
    return (
      '<ul class="gsc-chips" aria-label="Confidence and horizon">' +
      '<li><span class="gsc-chip">Confidence · ' +
      esc(confidence || "Unknown") +
      "</span></li>" +
      '<li><span class="gsc-chip">Horizon · ' +
      esc(horizon || "Unknown") +
      "</span></li>" +
      "</ul>"
    );
  }

  function renderNamedList(items, emptyLabel) {
    if (!items || !items.length) {
      return (
        '<p class="gsc-empty-inline" role="status">' +
        esc(emptyLabel || "Unavailable — we will not invent entries.") +
        "</p>"
      );
    }
    return (
      '<ul class="gsc-list">' +
      items
        .map(function (it) {
          var notes = it.notes
            ? '<span class="gsc-list__notes">' + esc(it.notes) + "</span>"
            : "";
          var type = it.type
            ? '<span class="gsc-list__type">' + esc(it.type) + "</span>"
            : "";
          return (
            "<li><strong>" +
            esc(it.name) +
            "</strong>" +
            type +
            notes +
            "</li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderIndexCard(country) {
    var href = "./" + encodeURIComponent(country.slug) + "/";
    var region = country.region
      ? '<p class="gsc-card__region">' + esc(country.region) + "</p>"
      : "";
    var summary = country.summary
      ? '<p class="gsc-card__summary">' + esc(country.summary) + "</p>"
      : '<p class="gsc-card__summary gsc-card__summary--empty">Summary unavailable.</p>';
    return (
      '<article class="gsc-card" role="listitem">' +
      '<h2 class="gsc-card__title"><a href="' +
      href +
      '">' +
      esc(country.name) +
      "</a></h2>" +
      region +
      summary +
      '<p class="gsc-card__cta"><a href="' +
      href +
      '">Open country profile</a></p>' +
      "</article>"
    );
  }

  function renderIndex(countries, data) {
    var sorted = countries.slice().sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    return (
      renderBanner(data) +
      '<p class="gsc-hub-count">' +
      sorted.length +
      " country profile" +
      (sorted.length === 1 ? "" : "s") +
      " · sample / demo</p>" +
      '<div class="gsc-grid" role="list">' +
      sorted.map(renderIndexCard).join("") +
      "</div>"
    );
  }

  function gsRelativePrefix(detailDepth) {
    // detailDepth 0 = mounted at /countries/ ; 1 = mounted at /countries/<slug>/
    return detailDepth >= 1 ? "../../" : "../";
  }

  function articleHref(id, detailDepth) {
    return (
      gsRelativePrefix(detailDepth) +
      "articles/?id=" +
      encodeURIComponent(id)
    );
  }

  function citizenHref(category, detailDepth) {
    return (
      gsRelativePrefix(detailDepth) +
      "citizen-impact/#" +
      encodeURIComponent(category)
    );
  }

  function renderDetail(country, opts) {
    opts = opts || {};
    var depth = opts.depth != null ? opts.depth : 1;
    var articlesBase = opts.articlesBase;
    var backHref = opts.backHref || (depth >= 1 ? "../" : "./");
    var gsPrefix = gsRelativePrefix(depth);
    var sideTrailsHref = depth >= 1 ? "../../../" : "../../";

    function section(title, bodyHtml, id) {
      return (
        '<section class="gsc-section" aria-labelledby="' +
        esc(id) +
        '">' +
        "<h2 id=\"" +
        esc(id) +
        '">' +
        esc(title) +
        "</h2>" +
        bodyHtml +
        "</section>"
      );
    }

    var eventsHtml;
    if (!country.currentEvents.length) {
      eventsHtml =
        '<p class="gsc-empty-inline" role="status">No current-events entries in this sample profile. Empty is honest — we will not invent breaking news.</p>';
    } else {
      eventsHtml =
        '<ul class="gsc-events">' +
        country.currentEvents
          .map(function (ev) {
            return (
              '<li class="gsc-event">' +
              '<p class="gsc-event__label">' +
              esc(ev.label) +
              "</p>" +
              "<h3>" +
              esc(ev.title) +
              "</h3>" +
              (ev.summary ? "<p>" + esc(ev.summary) + "</p>" : "") +
              renderMetaChips(ev.confidence, ev.timeHorizon) +
              (ev.asOf
                ? '<p class="gsc-event__asof">As-of (sample) · ' +
                  esc(String(ev.asOf)) +
                  "</p>"
                : "") +
              "</li>"
            );
          })
          .join("") +
        "</ul>";
    }

    var tradesHtml;
    if (!country.tradeRelationships.length) {
      tradesHtml =
        '<p class="gsc-empty-inline" role="status">Trade relationships unavailable.</p>';
    } else {
      tradesHtml =
        '<ul class="gsc-trades">' +
        country.tradeRelationships
          .map(function (t) {
            var link = t.partnerSlug
              ? '<a href="' +
                (depth >= 1 ? "../" : "./") +
                encodeURIComponent(t.partnerSlug) +
                '/">' +
                esc(t.partnerName) +
                "</a>"
              : esc(t.partnerName);
            // partner links always resolve under /countries/<slug>/
            return (
              "<li><strong>" +
              link +
              "</strong>" +
              (t.nature
                ? '<span class="gsc-list__notes">' + esc(t.nature) + "</span>"
                : "") +
              renderMetaChips(t.confidence, t.timeHorizon) +
              "</li>"
            );
          })
          .join("") +
        "</ul>";
    }

    var risksHtml;
    if (!country.currentRisks.length) {
      risksHtml =
        '<p class="gsc-empty-inline" role="status">No sample risks tagged. We will not invent threats.</p>';
    } else {
      risksHtml =
        '<ul class="gsc-risks">' +
        country.currentRisks
          .map(function (r) {
            return (
              "<li>" +
              '<p class="gsc-event__label">' +
              esc(r.label) +
              "</p>" +
              "<h3>" +
              esc(r.title) +
              "</h3>" +
              (r.summary ? "<p>" + esc(r.summary) + "</p>" : "") +
              renderMetaChips(r.confidence, r.timeHorizon) +
              "</li>"
            );
          })
          .join("") +
        "</ul>";
    }

    var articlesHtml;
    if (!country.relatedArticles.length) {
      articlesHtml =
        '<p class="gsc-empty-inline" role="status">No related sample articles linked.</p>';
    } else {
      articlesHtml =
        '<ul class="gsc-related">' +
        country.relatedArticles
          .map(function (aid) {
            var href = articlesBase
              ? articlesBase + encodeURIComponent(aid)
              : articleHref(aid, depth);
            return (
              '<li><a href="' +
              esc(href) +
              '">' +
              esc(aid) +
              '</a> <span class="gsc-list__notes">Global Signals Articles (sample/demo)</span></li>'
            );
          })
          .join("") +
        "</ul>";
    }

    var citizenHtml;
    if (!country.citizenImpactConnections.length) {
      citizenHtml =
        '<p class="gsc-empty-inline" role="status">No citizen-impact connections tagged.</p>';
    } else {
      citizenHtml =
        '<ul class="gsc-citizen">' +
        country.citizenImpactConnections
          .map(function (c) {
            var label = c.category.charAt(0).toUpperCase() + c.category.slice(1);
            var href = citizenHref(c.category, depth);
            return (
              "<li>" +
              '<a class="gsc-citizen__cat" href="' +
              esc(href) +
              '">' +
              esc(label) +
              "</a>" +
              (c.summary
                ? '<span class="gsc-list__notes">' + esc(c.summary) + "</span>"
                : "") +
              renderMetaChips(c.confidence, c.timeHorizon) +
              "</li>"
            );
          })
          .join("") +
        "</ul>" +
        '<p class="gsc-note">Citizen Impact module may still be a Coming soon shell on main; category links use stable ids for later integration. Soft-link also reserved for Relationship Explorer at <a href="' +
        esc(gsPrefix) +
        'relationship-graph/">relationship-graph</a>.</p>';
    }

    var iso = country.iso2
      ? '<span class="gsc-iso">' + esc(country.iso2) + "</span>"
      : "";

    return (
      '<article class="gsc-detail">' +
      '<nav class="gsc-detail__nav" aria-label="Country profile">' +
      '<a href="' +
      esc(backHref) +
      '">All countries</a>' +
      '<a href="' +
      esc(gsPrefix) +
      '">Global Signals</a>' +
      '<a href="' +
      esc(sideTrailsHref) +
      '">Side Trails</a>' +
      "</nav>" +
      '<header class="gsc-detail__head">' +
      '<p class="gs-eyebrow">Country Intelligence · sample / demo</p>' +
      "<h1>" +
      esc(country.name) +
      " " +
      iso +
      "</h1>" +
      (country.region
        ? '<p class="gsc-detail__region">' + esc(country.region) + "</p>"
        : "") +
      (country.summary
        ? '<p class="gsc-detail__summary">' + esc(country.summary) + "</p>"
        : '<p class="gsc-detail__summary gsc-empty-inline">Summary unavailable.</p>') +
      "</header>" +
      section("Current Events", eventsHtml, "gsc-events") +
      section(
        "Major Industries",
        renderNamedList(country.majorIndustries, "Major industries unavailable."),
        "gsc-industries"
      ) +
      section(
        "Exports",
        renderNamedList(country.exports, "Exports unavailable."),
        "gsc-exports"
      ) +
      section(
        "Imports",
        renderNamedList(country.imports, "Imports unavailable."),
        "gsc-imports"
      ) +
      section(
        "Critical Infrastructure",
        renderNamedList(
          country.criticalInfrastructure,
          "Critical infrastructure unavailable."
        ),
        "gsc-infra"
      ) +
      section(
        "Major Ports",
        renderNamedList(country.majorPorts, "Major ports unavailable."),
        "gsc-ports"
      ) +
      section("Trade Relationships", tradesHtml, "gsc-trade") +
      section("Current Risks", risksHtml, "gsc-risks") +
      section("Related Articles", articlesHtml, "gsc-articles") +
      section("Citizen Impact Connections", citizenHtml, "gsc-citizen") +
      "</article>"
    );
  }

  function resolveDataUrl(configured, depth) {
    if (configured) return configured;
    var prefix = "";
    for (var i = 0; i < (depth || 3); i++) prefix += "../";
    return prefix + "data/global-signals/countries/countries.json";
  }

  async function loadCountries(opts) {
    opts = opts || {};
    var url = resolveDataUrl(opts.dataUrl, opts.depth);
    var res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    var data = await res.json();
    var countries = (data.countries || []).map(normalizeCountry).filter(Boolean);
    return { data: data, countries: countries };
  }

  async function mount(root, opts) {
    if (!root) return null;
    opts = opts || {};
    root.setAttribute("aria-busy", "true");
    root.setAttribute("data-gsc-state", "loading");
    root.innerHTML = '<p class="gsc-loading">Loading country intelligence…</p>';

    try {
      var bundle = await loadCountries(opts);
      root.setAttribute("aria-busy", "false");

      if (!bundle.countries.length) {
        root.setAttribute("data-gsc-state", "empty");
        root.innerHTML =
          renderBanner(bundle.data) +
          '<p class="gsc-empty" role="status">Country profiles will appear here as curated sample data is added. Empty is honest.</p>';
        return bundle;
      }

      var key = resolveDetailKey(opts);
      if (key) {
        var found = findCountry(bundle.countries, key);
        root.setAttribute("data-gsc-state", found ? "detail" : "error");
        if (!found) {
          root.innerHTML =
            renderBanner(bundle.data) +
            '<div class="gsc-error" role="alert"><p>Country not found. <a href="' +
            esc(opts.backHref || "./") +
            '">Back to all countries</a></p></div>';
          return bundle;
        }
        try {
          document.title = found.name + " — Country Intelligence · Global Signals";
        } catch (e) {}
        var detailDepth = opts.detailDepth != null ? opts.detailDepth : opts.depth === 4 ? 1 : 0;
        // When mounted from /countries/<slug>/, depth to data is 4; relative nav uses detailDepth 1.
        if (opts.detailDepth == null && /\/countries\/[^/]+\/?$/.test(String(global.location && global.location.pathname || ""))) {
          detailDepth = 1;
        }
        root.innerHTML =
          renderBanner(bundle.data) +
          renderDetail(found, {
            depth: detailDepth,
            backHref: opts.backHref || (detailDepth >= 1 ? "../" : "./"),
            articlesBase: opts.articlesBase
          });
        return bundle;
      }

      root.setAttribute("data-gsc-state", "ready");
      root.innerHTML = renderIndex(bundle.countries, bundle.data);
      return bundle;
    } catch (err) {
      root.setAttribute("aria-busy", "false");
      root.setAttribute("data-gsc-state", "error");
      root.innerHTML =
        '<div class="gsc-error" role="alert">' +
        "<p>Country intelligence unavailable. Empty is honest — we will not invent profiles.</p>" +
        "</div>";
      return { error: err, countries: [] };
    }
  }

  GS.countries = {
    mount: mount,
    loadCountries: loadCountries,
    normalizeCountry: normalizeCountry,
    findCountry: findCountry,
    renderIndex: renderIndex,
    renderIndexCard: renderIndexCard,
    renderDetail: renderDetail,
    renderBanner: renderBanner,
    normalizeConfidence: normalizeConfidence,
    normalizeTimeHorizon: normalizeTimeHorizon,
    normalizeNamedList: normalizeNamedList,
    resolveDetailKey: resolveDetailKey,
    CITIZEN_CATEGORIES: CITIZEN_CATEGORIES,
    CONFIDENCE_ALLOWED: CONFIDENCE_ALLOWED,
    HORIZON_ALLOWED: HORIZON_ALLOWED
  };
})(typeof window !== "undefined" ? window : globalThis);
