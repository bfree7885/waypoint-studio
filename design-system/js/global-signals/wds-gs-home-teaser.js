/**
 * Homepage Global Signals teaser — live production artifacts only.
 * Never renders sample-demo / fixture content on Home.
 *
 * Data sources (live pipeline):
 *   data/global-signals/production/events/events.json
 *   data/global-signals/production/impacts/impacts.json
 *   data/global-signals/ingestion/status.json
 * Compat fallbacks under data/global-signals/{events,impacts}/ when present.
 */
(function (global) {
  "use strict";

  var NS = (global.WDS = global.WDS || {});
  var GS = (NS.globalSignals = NS.globalSignals || {});

  var EVENT_PRIORITY = {
    sanctions: 100,
    export_control: 95,
    conflict: 90,
    earthquake: 85,
    weather: 70,
    policy: 65,
    trade: 60,
    other: 10
  };

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function depthFromPath() {
    try {
      var path = String((global.location && global.location.pathname) || "");
      if (/\/apps\//.test(path)) return 1;
      return 0;
    } catch (e) {
      return 0;
    }
  }

  function prefixes(depth) {
    depth = depth == null ? depthFromPath() : depth;
    if (depth <= 0) {
      return {
        root: "",
        explore: "side-trails/global-signals/",
        events: "data/global-signals/production/events/events.json",
        eventsCompat: "data/global-signals/events/events.json",
        impacts: "data/global-signals/production/impacts/impacts.json",
        impactsCompat: "data/global-signals/impacts/impacts.json",
        status: "data/global-signals/ingestion/status.json"
      };
    }
    return {
      root: "../../",
      explore: "../../side-trails/global-signals/",
      events: "../../data/global-signals/production/events/events.json",
      eventsCompat: "../../data/global-signals/events/events.json",
      impacts: "../../data/global-signals/production/impacts/impacts.json",
      impactsCompat: "../../data/global-signals/impacts/impacts.json",
      status: "../../data/global-signals/ingestion/status.json"
    };
  }

  function loader() {
    return GS.loader || null;
  }

  function formatFreshness(iso) {
    if (!iso) return null;
    var t = Date.parse(iso);
    if (!Number.isFinite(t)) return null;
    var mins = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (mins < 1) return "Updated just now";
    if (mins === 1) return "Updated 1 min ago";
    if (mins < 60) return "Updated " + mins + " min ago";
    var hours = Math.round(mins / 60);
    if (hours === 1) return "Updated 1 hour ago";
    if (hours < 48) return "Updated " + hours + " hours ago";
    var days = Math.round(hours / 24);
    return days === 1 ? "Updated 1 day ago" : "Updated " + days + " days ago";
  }

  function eventScore(event, industryByOrigin, citizenByOrigin) {
    var type = String((event && event.eventType) || "other").toLowerCase();
    var score = EVENT_PRIORITY[type] != null ? EVENT_PRIORITY[type] : EVENT_PRIORITY.other;
    var id = event && event.id;
    if (id && industryByOrigin[id] && citizenByOrigin[id]) score += 40;
    else if (id && (industryByOrigin[id] || citizenByOrigin[id])) score += 15;
    var pub = Date.parse((event && (event.publishedAt || event.occurredAt || event.retrievedAt)) || "");
    if (Number.isFinite(pub)) score += Math.min(20, Math.max(0, 20 - (Date.now() - pub) / 86400000));
    return score;
  }

  function indexImpacts(list) {
    var byOrigin = Object.create(null);
    (list || []).forEach(function (imp) {
      if (!imp || !imp.originEvent) return;
      if (!byOrigin[imp.originEvent]) byOrigin[imp.originEvent] = [];
      byOrigin[imp.originEvent].push(imp);
    });
    Object.keys(byOrigin).forEach(function (k) {
      byOrigin[k].sort(function (a, b) {
        var oa = a.order || 99;
        var ob = b.order || 99;
        if (oa !== ob) return oa - ob;
        return String(a.affectedEntityLabel || "").localeCompare(String(b.affectedEntityLabel || ""));
      });
    });
    return byOrigin;
  }

  function pickTeaser(eventsDoc, impactsDoc, statusDoc) {
    var gate = loader();
    if (!gate) {
      return { state: "unavailable", reason: "loader_missing" };
    }

    var eventsGate = gate.gateDataset(eventsDoc);
    if (!eventsGate.ok) {
      return {
        state: "unavailable",
        reason: eventsGate.reason || "events_refused",
        mode: eventsGate.mode || (eventsDoc && eventsDoc.mode)
      };
    }

    var impactsGate = gate.gateDataset(impactsDoc);
    if (!impactsGate.ok) {
      return {
        state: "unavailable",
        reason: impactsGate.reason || "impacts_refused",
        mode: impactsGate.mode || (impactsDoc && impactsDoc.mode)
      };
    }

    var events = (eventsGate.data && eventsGate.data.events) || [];
    if (eventsGate.data.mode === "live-empty" || !events.length) {
      return {
        state: "empty",
        reason: "live_empty",
        updatedAt:
          (statusDoc && (statusDoc.lastSuccessfulIngestion || statusDoc.updatedAt)) ||
          eventsGate.data.updatedAt ||
          null
      };
    }

    var industries = (impactsGate.data && impactsGate.data.industries) || [];
    var citizens = (impactsGate.data && impactsGate.data.citizen) || [];
    if (!industries.length && impactsGate.data && Array.isArray(impactsGate.data.impacts)) {
      industries = impactsGate.data.impacts.filter(function (i) {
        return i && i.affectedEntityType === "Industry";
      });
    }
    if (!citizens.length && impactsGate.data && Array.isArray(impactsGate.data.impacts)) {
      citizens = impactsGate.data.impacts.filter(function (i) {
        return i && i.affectedEntityType === "Citizen Impact";
      });
    }

    var industryByOrigin = indexImpacts(industries);
    var citizenByOrigin = indexImpacts(citizens);

    var ranked = events.slice().sort(function (a, b) {
      return eventScore(b, industryByOrigin, citizenByOrigin) - eventScore(a, industryByOrigin, citizenByOrigin);
    });

    var chosen = null;
    var industry = null;
    var citizen = null;
    for (var i = 0; i < ranked.length; i++) {
      var ev = ranked[i];
      var indList = industryByOrigin[ev.id] || [];
      var citList = citizenByOrigin[ev.id] || [];
      if (indList.length && citList.length) {
        chosen = ev;
        industry = indList[0];
        citizen = citList[0];
        break;
      }
    }

    if (!chosen) {
      return {
        state: "empty",
        reason: "no_complete_ripple",
        updatedAt:
          (statusDoc && (statusDoc.lastSuccessfulIngestion || statusDoc.updatedAt)) ||
          eventsGate.data.updatedAt ||
          impactsGate.data.updatedAt ||
          null
      };
    }

    return {
      state: "live",
      event: chosen,
      industry: industry,
      citizen: citizen,
      updatedAt:
        (statusDoc && (statusDoc.lastSuccessfulIngestion || statusDoc.updatedAt)) ||
        impactsGate.data.updatedAt ||
        eventsGate.data.updatedAt ||
        chosen.lastVerifiedAt ||
        chosen.retrievedAt ||
        null,
      honesty:
        (impactsGate.data && impactsGate.data.honesty && impactsGate.data.honesty.banner) ||
        "Ripple effects are calculated exposure paths from live events — not Observed facts."
    };
  }

  function renderShell(exploreHref) {
    return (
      '<section class="wdb-r-deepen__section wdb-r-deepen__section--gs-teaser" data-deepen="global-signals-teaser" aria-labelledby="wdb-r-gs-teaser-title">' +
      '<p class="wdb-r-gs-teaser__eyebrow">Global Signals</p>' +
      '<header class="wdb-r-deepen__header">' +
      '<h2 class="wdb-r-deepen__title" id="wdb-r-gs-teaser-title">What\u2019s changing</h2>' +
      '<p class="wdb-r-deepen__lede">One live signal and its potential ripples — not a news feed.</p>' +
      "</header>" +
      '<div class="wdb-r-deepen__body wdb-r-gs-teaser" data-deepen-body="global-signals-teaser" data-gs-teaser aria-busy="true">' +
      '<p class="wdb-r-deepen__status" role="status">Checking live Global Signals\u2026</p>' +
      "</div>" +
      '<p class="wdb-r-deepen__action"><a class="wdb-r-deepen__link" data-deepen-link="global-signals" href="' +
      escapeHtml(exploreHref) +
      '">Explore Global Signals \u2192</a></p>' +
      "</section>"
    );
  }

  function renderUnavailable(el, opts) {
    opts = opts || {};
    var freshness = formatFreshness(opts.updatedAt);
    var message =
      opts.state === "empty"
        ? "No complete live signal with industry and citizen ripples is available yet. Empty is honest — sample content is never shown here."
        : "Live Global Signals data is unavailable right now. Home will not invent a signal.";
    el.innerHTML =
      '<p class="wdb-r-deepen__empty" data-gs-teaser-state="' +
      escapeHtml(opts.state || "unavailable") +
      '" role="status">' +
      escapeHtml(message) +
      "</p>" +
      (freshness
        ? '<p class="wdb-r-gs-teaser__freshness" data-gs-teaser-freshness>' + escapeHtml(freshness) + "</p>"
        : '<p class="wdb-r-gs-teaser__freshness" data-gs-teaser-freshness>Freshness unavailable</p>');
    el.removeAttribute("aria-busy");
  }

  function renderLive(el, model) {
    var eventTitle = (model.event && (model.event.title || model.event.summary)) || "Verified event";
    var industryLabel =
      (model.industry && (model.industry.affectedEntityLabel || model.industry.affectedEntity)) || "—";
    var citizenLabel =
      (model.citizen && (model.citizen.affectedEntityLabel || model.citizen.affectedEntity)) || "—";
    var freshness = formatFreshness(model.updatedAt) || "Freshness unavailable";
    el.innerHTML =
      '<p class="wdb-r-gs-teaser__event" data-gs-teaser-state="live" data-gs-teaser-event>' +
      escapeHtml(eventTitle) +
      "</p>" +
      '<p class="wdb-r-gs-teaser__ripples-label">Potential ripple effects:</p>' +
      '<ul class="wdb-r-gs-teaser__ripples">' +
      "<li><span class=\"wdb-r-gs-teaser__k\">Industry</span> \u2192 <span class=\"wdb-r-gs-teaser__v\" data-gs-teaser-industry>" +
      escapeHtml(industryLabel) +
      "</span></li>" +
      "<li><span class=\"wdb-r-gs-teaser__k\">Citizen impact</span> \u2192 <span class=\"wdb-r-gs-teaser__v\" data-gs-teaser-citizen>" +
      escapeHtml(citizenLabel) +
      "</span></li>" +
      "</ul>" +
      '<p class="wdb-r-gs-teaser__freshness" data-gs-teaser-freshness>' +
      escapeHtml(freshness) +
      "</p>" +
      '<p class="wdb-r-gs-teaser__note">' +
      escapeHtml(model.honesty) +
      "</p>";
    el.removeAttribute("aria-busy");
  }

  async function fetchFirstOk(urls) {
    var lastErr = null;
    for (var i = 0; i < urls.length; i++) {
      try {
        var res = await fetch(urls[i], { credentials: "same-origin", cache: "no-store" });
        if (!res.ok) {
          lastErr = new Error("HTTP " + res.status);
          continue;
        }
        return await res.json();
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("fetch_failed");
  }

  async function loadBundle(depth) {
    var p = prefixes(depth);
    var gate = loader();
    if (!gate) throw new Error("loader_missing");

    var eventsRaw = await fetchFirstOk([p.events, p.eventsCompat]);
    var eventsGate = gate.gateDataset(eventsRaw);
    if (!eventsGate.ok) {
      var e = new Error(eventsGate.message || eventsGate.reason);
      e.gate = eventsGate;
      throw e;
    }

    var impactsRaw = await fetchFirstOk([p.impacts, p.impactsCompat]);
    var impactsGate = gate.gateDataset(impactsRaw);
    if (!impactsGate.ok) {
      var ie = new Error(impactsGate.message || impactsGate.reason);
      ie.gate = impactsGate;
      throw ie;
    }

    var statusDoc = null;
    try {
      statusDoc = await fetchFirstOk([p.status]);
    } catch (err) {
      statusDoc = null;
    }

    return pickTeaser(eventsGate.data, impactsGate.data, statusDoc);
  }

  function fill(el, depth) {
    if (!el) return Promise.resolve();
    return loadBundle(depth)
      .then(function (model) {
        if (model.state === "live") renderLive(el, model);
        else renderUnavailable(el, model);
        return model;
      })
      .catch(function (err) {
        var reason = (err && err.gate && err.gate.reason) || (err && err.message) || "error";
        renderUnavailable(el, { state: "unavailable", reason: reason });
        return { state: "unavailable", reason: reason };
      });
  }

  function mount(host, options) {
    options = options || {};
    if (!host) return null;
    var depth = options.depth != null ? options.depth : depthFromPath();
    var p = prefixes(depth);
    var section = host.querySelector('[data-deepen="global-signals-teaser"]');
    if (!section) {
      host.insertAdjacentHTML("beforeend", renderShell(p.explore));
      section = host.querySelector('[data-deepen="global-signals-teaser"]');
    }
    var link = section && section.querySelector('[data-deepen-link="global-signals"]');
    if (link) link.setAttribute("href", p.explore);
    var body = section && section.querySelector("[data-gs-teaser]");
    fill(body, depth);
    return section;
  }

  GS.homeTeaser = {
    version: "1.0.0-homepage-teaser",
    prefixes: prefixes,
    pickTeaser: pickTeaser,
    formatFreshness: formatFreshness,
    renderShell: renderShell,
    renderLive: renderLive,
    renderUnavailable: renderUnavailable,
    fill: fill,
    mount: mount,
    EVENT_PRIORITY: EVENT_PRIORITY
  };
})(typeof window !== "undefined" ? window : globalThis);
