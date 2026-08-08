/**
 * Global Signals — Universal Intelligence Search
 * Structured client-side search over a prebuilt index. No generative model.
 */
(function (global) {
  "use strict";

  var NS = (global.WDS = global.WDS || {});
  var GS = (NS.globalSignals = NS.globalSignals || {});

  var DEFAULT_TYPE_ORDER = [
    "country",
    "industry",
    "commodity",
    "company",
    "port",
    "conflict",
    "tariff",
    "policy",
    "weather",
    "article",
    "citizen-impact"
  ];

  var DEFAULT_TYPE_LABELS = {
    country: "Country",
    industry: "Industry",
    commodity: "Commodity",
    company: "Company",
    port: "Port",
    conflict: "Conflict",
    tariff: "Tariff",
    policy: "Policy",
    weather: "Weather",
    article: "Article",
    "citizen-impact": "Citizen impact"
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function norm(s) {
    return String(s == null ? "" : s)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function queryTokens(q) {
    return norm(q)
      .split(/\s+/)
      .filter(function (t) {
        return t.length >= 2;
      });
  }

  function typeLabel(type, index) {
    var labels = (index && index.typeLabels) || DEFAULT_TYPE_LABELS;
    return labels[type] || type;
  }

  function typeOrder(index) {
    return (index && index.typeOrder) || DEFAULT_TYPE_ORDER;
  }

  /**
   * Rank a single entry against a query.
   * Higher is better. Returns 0 when no match.
   */
  function scoreEntry(entry, query, qTokens) {
    if (!entry) return 0;
    var q = norm(query);
    if (!q) return 0;

    var label = norm(entry.label);
    var aliases = (entry.aliases || []).map(norm);
    var searchText = entry.searchText || norm([entry.label, entry.summary, entry.context].join(" "));
    var tokens = entry.tokens || [];
    var score = 0;

    if (label === q) score += 100;
    else if (label.indexOf(q) === 0) score += 80;
    else if (label.indexOf(q) >= 0) score += 55;

    for (var i = 0; i < aliases.length; i++) {
      if (aliases[i] === q) score += 90;
      else if (aliases[i].indexOf(q) === 0) score += 70;
      else if (aliases[i].indexOf(q) >= 0) score += 40;
    }

    if (qTokens.length) {
      var hit = 0;
      for (var t = 0; t < qTokens.length; t++) {
        if (tokens.indexOf(qTokens[t]) >= 0 || searchText.indexOf(qTokens[t]) >= 0) hit++;
      }
      // AND semantics: every query token must hit. Partial token overlap is not a match.
      if (hit !== qTokens.length) {
        // Allow pure phrase / label hits already scored above to stand without token AND.
        if (score === 0) return 0;
      } else {
        score += 35 + hit * 4;
      }
    } else if (score === 0 && searchText.indexOf(q) >= 0) {
      score += 20;
    }

    if (score === 0) return 0;

    if (entry.inCascades > 0) score += Math.min(18, 8 + entry.inCascades * 2);
    if (entry.boost) score *= entry.boost;
    if ((entry.hints || []).some(function (h) { return h.kind === "cascade"; })) score += 6;
    if (entry.moduleStatus === "live") score += 3;

    return score;
  }

  /**
   * @param {object} index
   * @param {string} query
   * @param {{ types?: string[], limit?: number }} [opts]
   * @returns {{ query: string, total: number, groups: Array<{type:string,typeLabel:string,results:Array}>, results: Array }}
   */
  function search(index, query, opts) {
    opts = opts || {};
    var q = String(query || "").trim();
    var qTokens = queryTokens(q);
    var types = opts.types && opts.types.length ? opts.types : null;
    var limit = opts.limit != null ? opts.limit : 40;
    var scored = [];

    if (!q) {
      return { query: q, total: 0, groups: [], results: [], emptyReason: "idle" };
    }

    var entries = (index && index.entries) || [];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (types && types.indexOf(entry.type) < 0) continue;
      var score = scoreEntry(entry, q, qTokens);
      if (score > 0) {
        scored.push({ entry: entry, score: score });
      }
    }

    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.entry.label).localeCompare(String(b.entry.label));
    });

    if (limit > 0) scored = scored.slice(0, limit);

    var results = scored.map(function (s) {
      return Object.assign({}, s.entry, { score: Math.round(s.score * 10) / 10 });
    });

    var order = typeOrder(index);
    var byType = {};
    for (var r = 0; r < results.length; r++) {
      var t = results[r].type;
      if (!byType[t]) byType[t] = [];
      byType[t].push(results[r]);
    }

    var groups = [];
    for (var o = 0; o < order.length; o++) {
      var type = order[o];
      if (byType[type] && byType[type].length) {
        groups.push({
          type: type,
          typeLabel: typeLabel(type, index),
          results: byType[type]
        });
      }
    }
    // Any unexpected types
    Object.keys(byType).forEach(function (type) {
      if (order.indexOf(type) < 0) {
        groups.push({
          type: type,
          typeLabel: typeLabel(type, index),
          results: byType[type]
        });
      }
    });

    return {
      query: q,
      total: results.length,
      groups: groups,
      results: results,
      emptyReason: results.length ? null : "no-match"
    };
  }

  function renderBanner(index) {
    var honesty = (index && index.honesty) || {};
    var modeLabel = (index && index.modeLabel) || "Sample / demo";
    return (
      '<aside class="gss-banner" role="note">' +
      '<p><span class="gss-badge">Sample / demo</span> ' +
      esc(honesty.banner || modeLabel) +
      "</p>" +
      "</aside>"
    );
  }

  function renderHints(hints) {
    if (!hints || !hints.length) return "";
    var items = hints
      .slice(0, 4)
      .map(function (h) {
        if (h.href) {
          return (
            '<li><a class="gss-hint" href="' +
            esc(h.href) +
            '">' +
            esc(h.label) +
            "</a></li>"
          );
        }
        return "<li><span class=\"gss-hint gss-hint--plain\">" + esc(h.label) + "</span></li>";
      })
      .join("");
    return '<ul class="gss-hints" aria-label="Relationship hints">' + items + "</ul>";
  }

  function renderResult(entry) {
    var conf =
      entry.confidence
        ? '<span class="gss-badge gss-badge--confidence" data-confidence="' +
          esc(entry.confidence) +
          '">' +
          esc(entry.confidence) +
          "</span>"
        : "";
    var moduleStatus =
      entry.moduleStatus === "live"
        ? ""
        : '<span class="gss-badge gss-badge--soft">Intended module route</span>';

    return (
      '<li class="gss-result">' +
      '<a class="gss-result__link" href="' +
      esc(entry.href) +
      '">' +
      '<div class="gss-result__meta">' +
      '<span class="gss-badge gss-badge--type">' +
      esc(entry.typeLabel || typeLabel(entry.type)) +
      "</span>" +
      conf +
      moduleStatus +
      "</div>" +
      '<h3 class="gss-result__title">' +
      esc(entry.label) +
      "</h3>" +
      (entry.context
        ? '<p class="gss-result__context">' + esc(entry.context) + "</p>"
        : "") +
      (entry.summary
        ? '<p class="gss-result__summary">' + esc(entry.summary) + "</p>"
        : "") +
      '<p class="gss-result__provenance">' +
      esc(entry.provenance || "sample-demo") +
      (entry.moduleLabel ? " · " + esc(entry.moduleLabel) : "") +
      "</p>" +
      "</a>" +
      renderHints(entry.hints) +
      "</li>"
    );
  }

  function renderGroups(payload) {
    if (!payload.total) {
      if (payload.emptyReason === "idle") {
        return (
          '<div class="gss-empty" role="status">' +
          "<p>Type a country, commodity, industry, company, port, conflict, tariff, policy, or article topic.</p>" +
          "<p class=\"gss-empty__note\">Results come from a structured sample/demo index — not an AI model.</p>" +
          "</div>"
        );
      }
      return (
        '<div class="gss-empty" role="status">' +
        "<p>No matches for “" +
        esc(payload.query) +
        "”" +
        (payload.typesFilter && payload.typesFilter.length
          ? " in the selected types"
          : "") +
        ".</p>" +
        "<p class=\"gss-empty__note\">Empty is honest — we will not invent entities or stretch weak string matches into false hits.</p>" +
        "</div>"
      );
    }

    var parts = payload.groups.map(function (g) {
      return (
        '<section class="gss-group" aria-labelledby="gss-group-' +
        esc(g.type) +
        '">' +
        '<h2 class="gss-group__title" id="gss-group-' +
        esc(g.type) +
        '">' +
        esc(g.typeLabel) +
        ' <span class="gss-group__count">' +
        g.results.length +
        "</span></h2>" +
        '<ol class="gss-results">' +
        g.results.map(renderResult).join("") +
        "</ol>" +
        "</section>"
      );
    });

    return (
      '<p class="gss-count" role="status" aria-live="polite">' +
      payload.total +
      (payload.total === 1 ? " result" : " results") +
      " for “" +
      esc(payload.query) +
      "”</p>" +
      parts.join("")
    );
  }

  function renderFilters(index, activeTypes) {
    var order = typeOrder(index);
    var present = {};
    ((index && index.entries) || []).forEach(function (e) {
      present[e.type] = true;
    });
    var chips = order
      .filter(function (t) {
        return present[t];
      })
      .map(function (t) {
        var on = activeTypes.indexOf(t) >= 0;
        return (
          '<button type="button" class="gss-chip' +
          (on ? " gss-chip--active" : "") +
          '" data-gss-type="' +
          esc(t) +
          '" aria-pressed="' +
          (on ? "true" : "false") +
          '">' +
          esc(typeLabel(t, index)) +
          "</button>"
        );
      })
      .join("");

    return (
      '<div class="gss-filters" role="group" aria-label="Filter by type">' +
      '<button type="button" class="gss-chip gss-chip--all' +
      (activeTypes.length === 0 ? " gss-chip--active" : "") +
      '" data-gss-type-all aria-pressed="' +
      (activeTypes.length === 0 ? "true" : "false") +
      '">All types</button>' +
      chips +
      "</div>"
    );
  }

  function resolveDataUrl(configured, depth) {
    if (configured) return configured;
    var prefix = "../".repeat(depth != null ? depth : 3);
    return prefix + "data/global-signals/search/search-index.json";
  }

  function readQueryFromUrl() {
    try {
      return new URLSearchParams(global.location.search).get("q") || "";
    } catch (e) {
      return "";
    }
  }

  function readTypesFromUrl() {
    try {
      var raw = new URLSearchParams(global.location.search).get("types");
      if (!raw) return [];
      return raw
        .split(",")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function writeUrlState(query, types) {
    try {
      var url = new URL(global.location.href);
      if (query) url.searchParams.set("q", query);
      else url.searchParams.delete("q");
      if (types && types.length) url.searchParams.set("types", types.join(","));
      else url.searchParams.delete("types");
      global.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  function bind(root, index, state) {
    var input = root.querySelector("[data-gss-input]");
    var resultsEl = root.querySelector("[data-gss-results]");
    var filtersEl = root.querySelector("[data-gss-filters]");
    var clearBtn = root.querySelector("[data-gss-clear]");
    var debounceTimer = null;

    function activeTypes() {
      return state.types.slice();
    }

    function refreshFilters() {
      if (filtersEl) filtersEl.innerHTML = renderFilters(index, state.types);
    }

    function runSearch(syncUrl) {
      var q = input ? String(input.value || "").trim() : state.query;
      state.query = q;
      var payload = search(index, q, {
        types: state.types.length ? state.types : null,
        limit: state.limit
      });
      payload.typesFilter = state.types;
      if (resultsEl) resultsEl.innerHTML = renderGroups(payload);
      if (clearBtn) clearBtn.hidden = !q;
      root.setAttribute("data-gss-state", q ? (payload.total ? "ready" : "empty") : "idle");
      if (syncUrl) writeUrlState(q, state.types);
    }

    function onInput() {
      global.clearTimeout(debounceTimer);
      debounceTimer = global.setTimeout(function () {
        runSearch(true);
      }, 120);
    }

    if (input) {
      input.addEventListener("input", onInput);
      input.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") {
          input.value = "";
          runSearch(true);
          input.focus();
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (input) input.value = "";
        runSearch(true);
        if (input) input.focus();
      });
    }

    if (filtersEl) {
      filtersEl.addEventListener("click", function (ev) {
        var all = ev.target.closest("[data-gss-type-all]");
        var chip = ev.target.closest("[data-gss-type]");
        if (all) {
          state.types = [];
          refreshFilters();
          runSearch(true);
          return;
        }
        if (!chip) return;
        var t = chip.getAttribute("data-gss-type");
        var idx = state.types.indexOf(t);
        if (idx >= 0) state.types.splice(idx, 1);
        else state.types.push(t);
        refreshFilters();
        runSearch(true);
      });
    }

    refreshFilters();
    if (input && state.query) input.value = state.query;
    runSearch(false);
  }

  async function mount(root, opts) {
    opts = opts || {};
    if (!root) return { error: new Error("mount root required") };

    root.setAttribute("data-gss-state", "loading");
    root.setAttribute("aria-busy", "true");
    root.innerHTML = '<p class="gss-loading" role="status">Loading search index…</p>';

    var dataUrl = resolveDataUrl(opts.dataUrl, opts.depth);

    try {
      var res = await fetch(dataUrl, { credentials: "same-origin" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var index = await res.json();
      if (!index || !Array.isArray(index.entries)) {
        throw new Error("Invalid search index");
      }

      var state = {
        query: opts.query != null ? String(opts.query) : readQueryFromUrl(),
        types: opts.types != null ? opts.types.slice() : readTypesFromUrl(),
        limit: opts.limit != null ? opts.limit : 48
      };

      root.setAttribute("aria-busy", "false");
      root.setAttribute("data-gss-state", "idle");
      root.innerHTML =
        renderBanner(index) +
        '<form class="gss-form" role="search" data-gss-form action="#" method="get">' +
        '<label class="gss-label" for="gss-input">Search Global Signals</label>' +
        '<div class="gss-input-row">' +
        '<input id="gss-input" class="gss-input" name="q" type="search" data-gss-input ' +
        'autocomplete="off" spellcheck="false" enterkeyhint="search" ' +
        'placeholder="Try Taiwan, semiconductors, steel tariff, canal…" ' +
        'aria-describedby="gss-help" />' +
        '<button type="button" class="gss-clear" data-gss-clear hidden>Clear</button>' +
        "</div>" +
        '<p id="gss-help" class="gss-help">Instant filter over curated sample/demo data. Optional type chips narrow results.</p>' +
        '<div class="gss-filters" data-gss-filters></div>' +
        "</form>" +
        '<div class="gss-results-panel" data-gss-results aria-live="polite"></div>';

      var form = root.querySelector("[data-gss-form]");
      if (form) {
        form.addEventListener("submit", function (ev) {
          ev.preventDefault();
        });
      }

      bind(root, index, state);

      try {
        if (state.query) {
          global.document.title =
            "Search: " + state.query + " · Global Signals";
        }
      } catch (e) {}

      return { index: index, state: state };
    } catch (err) {
      root.setAttribute("aria-busy", "false");
      root.setAttribute("data-gss-state", "error");
      root.innerHTML =
        '<div class="gss-error" role="alert">' +
        "<p>Search index unavailable. Empty is honest — we will not invent results.</p>" +
        "</div>";
      return { error: err };
    }
  }

  GS.search = {
    mount: mount,
    search: search,
    scoreEntry: scoreEntry,
    renderGroups: renderGroups,
    renderBanner: renderBanner,
    renderFilters: renderFilters,
    renderResult: renderResult,
    norm: norm,
    queryTokens: queryTokens,
    typeLabel: typeLabel,
    typeOrder: typeOrder,
    resolveDataUrl: resolveDataUrl,
    DEFAULT_TYPE_ORDER: DEFAULT_TYPE_ORDER,
    DEFAULT_TYPE_LABELS: DEFAULT_TYPE_LABELS
  };
})(typeof window !== "undefined" ? window : globalThis);
