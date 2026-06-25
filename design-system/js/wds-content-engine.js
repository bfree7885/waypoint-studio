/**
 * Waypoint Content Engine
 * Regional field-guide content renderer — no APIs, no feeds, private by default.
 *
 * WDS.contentEngine.init({ region: 'pike-county-pa', mount: '#wds-content-engine', base: 'design-system/content-engine/' });
 */
(function (global) {
  "use strict";

  var engineBase = "content-engine/";
  var bundleCache = {};

  var SECTION_ORDER = [
    "home-hero",
    "platform-mission",
    "this-week-outdoors",
    "weekend-investigation",
    "foragecast",
    "seasonal-watch",
    "species-spotlight",
    "regional-field-notes",
    "conservation-update",
    "research-brief",
    "experiences",
    "photo-essay",
    "featured-video"
  ];

  var DECK_CARD_SKIP = {
    "seasonal-watch": true,
    "species-active": true
  };

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveEngineBase(options) {
    if (options && options.base) return options.base.replace(/\/?$/, "/");
    return engineBase;
  }

  function fetchJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("WDS.contentEngine: failed to load " + url);
      return res.json();
    });
  }

  function blockHead(eyebrow, title, lead, opts) {
    opts = typeof opts === "string" ? { variant: opts } : (opts || {});
    var headClass = "ws-block__head" + (opts.variant ? " ws-block__head--" + opts.variant : "");
    return (
      '<div class="' + headClass + '">' +
        (eyebrow ? '<p class="ws-block__eyebrow">' + escapeHtml(eyebrow) + "</p>" : "") +
        '<h2 class="ws-block__title">' + escapeHtml(title) + "</h2>" +
        (lead ? '<p class="ws-block__lead">' + escapeHtml(lead) + "</p>" : "") +
      "</div>"
    );
  }

  function storySection(tier, extraClass) {
    return "ws-block ws-story-section ws-story-section--" + tier + (extraClass ? " " + extraClass : "");
  }

  function resolveBundleAsset(path, base) {
    if (!path) return "";
    if (/^https?:\/\//.test(path) || path.charAt(0) === "/") return path;
    return base + "regions/" + path.replace(/^\.\//, "");
  }

  function mediaSlot(label, hint) {
    return (
      '<div class="ws-media-slot" role="img" aria-label="' + escapeHtml(label) + '">' +
        '<span class="ws-media-slot__label">' + escapeHtml(label) + "</span>" +
        (hint ? '<p class="ws-media-slot__hint">' + escapeHtml(hint) + "</p>" : "") +
      "</div>"
    );
  }

  function ri() {
    return global.WDS && (global.WDS.researchIntegrity || global.WDS.provenance);
  }

  function renderMeta(item) {
    if (!item) return "";
    var parts = [];
    var csNote = ri() && ri().citizenScienceNote;
    if (item.outdoorChallenge) parts.push("<p><strong>Outdoor:</strong> " + escapeHtml(item.outdoorChallenge) + "</p>");
    if (item.citizenScience) {
      var csText = csNote ? csNote(item.citizenScience) : item.citizenScience;
      parts.push("<p><strong>Citizen science (optional, coming soon):</strong> " + escapeHtml(csText) + "</p>");
    }
    if (item.subscriptionValue) parts.push("<p><strong>Subscribers:</strong> " + escapeHtml(item.subscriptionValue) + "</p>");
    if (!parts.length) return "";
    return '<div class="wce-meta">' + parts.join("") + "</div>";
  }

  function renderRegionTag(region, weekOf, season) {
    return (
      '<span class="wce-region-tag">' + escapeHtml(region.name) + ", " + escapeHtml(region.state) +
      " · Week of " + escapeHtml(weekOf) + " · " + escapeHtml(season) + "</span>"
    );
  }

  function renderLocationBar(loc) {
    if (!loc || !global.WDS || !global.WDS.location) return "";
    return global.WDS.location.renderBar(loc);
  }

  function bindLocationBar(mount, options) {
    if (!global.WDS || !global.WDS.location) return;
    global.WDS.location.bindBar(mount, {
      base: resolveEngineBase(options),
      onLocationChange: options && options.onLocationChange
    });
  }

  function humanizeStatus(status) {
    var P = ri();
    if (P && P.humanizeSpeciesStatus) return P.humanizeSpeciesStatus(status);
    return String(status || "").replace(/-/g, " ");
  }

  function renderDashCardItems(items) {
    if (!items || !items.length) return "";
    return (
      "<ul class=\"wce-dash-card__list\">" +
        items.map(function (item) {
          if (typeof item === "string") {
            return "<li>" + escapeHtml(item) + "</li>";
          }
          var line = "<strong>" + escapeHtml(item.name) + "</strong>";
          if (item.status) {
            line += ' <span class="wce-dash-card__status">' + escapeHtml(humanizeStatus(item.status)) + "</span>";
          }
          if (item.note) line += " — " + escapeHtml(item.note);
          return "<li>" + line + "</li>";
        }).join("") +
      "</ul>"
    );
  }

  function renderDashCardGroups(groups) {
    if (!groups || !groups.length) return "";
    return groups.map(function (group) {
      return (
        '<div class="wce-dash-card__group">' +
          '<p class="wce-dash-card__group-label">' + escapeHtml(group.label) + "</p>" +
          renderDashCardItems(group.items) +
        "</div>"
      );
    }).join("");
  }

  function renderDashCard(card) {
    if (!card || !card.title) return "";
    var isLiveWeatherCard = card.id === "weather" || card.id === "sun-moon";
    var isPlaceholder = !isLiveWeatherCard && card.source === "placeholder";
    var tagInfo = ri() && ri().dashboardTag
      ? ri().dashboardTag(card)
      : null;
    var tag = tagInfo ? tagInfo.label : (isLiveWeatherCard ? "Loading" : (isPlaceholder ? "Preview" : "Editorial"));
    var tagClass = tagInfo
      ? " " + tagInfo.className
      : (isLiveWeatherCard || isPlaceholder
        ? " wce-dash-card__tag--soon"
        : (card.source === "live" ? " wce-dash-card__tag--live" : " wce-dash-card__tag--regional"));

    var content = "";
    if (card.id === "weather") {
      var weatherLoading = global.WDS && global.WDS.weatherUI && global.WDS.weatherUI.renderLoading
        ? global.WDS.weatherUI.renderLoading("dashboard")
        : '<p class="wds-weather-loading">Loading current conditions…</p>';
      content += (
        '<div class="wds-weather-mount" data-wds-weather-mount="dashboard" aria-live="polite" aria-busy="true">' +
        weatherLoading +
        "</div>"
      );
    } else if (card.id === "sun-moon") {
      var sunLoading = global.WDS && global.WDS.weatherUI && global.WDS.weatherUI.renderLoading
        ? global.WDS.weatherUI.renderLoading("sun-moon")
        : '<p class="wds-weather-loading">Loading sun and moon…</p>';
      content += (
        '<div class="wds-weather-mount" data-wds-weather-mount="sun-moon" aria-live="polite" aria-busy="true">' +
        sunLoading +
        "</div>"
      );
    } else if (isPlaceholder && card.placeholder) {
      content += '<p class="wce-dash-card__placeholder">' + escapeHtml(card.placeholder) + "</p>";
    }
    if (card.highlight) {
      content += '<p class="wce-dash-card__highlight">' + escapeHtml(card.highlight) + "</p>";
    }
    if (card.body) {
      content += '<p class="wce-dash-card__body-text">' + escapeHtml(card.body) + "</p>";
    }
    if (card.groups) content += renderDashCardGroups(card.groups);
    else if (card.items) content += renderDashCardItems(card.items);

    return (
      '<article class="wce-dash-card wce-dash-card--' + escapeHtml(card.id) + '" id="dashboard-' + escapeHtml(card.id) + '">' +
        '<header class="wce-dash-card__head">' +
          '<h3 class="wce-dash-card__title">' + escapeHtml(card.title) + "</h3>" +
          '<span class="wce-dash-card__tag' + tagClass + '">' + escapeHtml(tag) + "</span>" +
        "</header>" +
        '<div class="wce-dash-card__content">' + content + "</div>" +
      "</article>"
    );
  }

  function getOutdoorDashboardCards(data) {
    var w = data.thisWeekOutdoors || {};
    var dash = w.outdoorDashboard;
    if (dash && dash.cards && dash.cards.length) {
      return dash.cards.filter(function (card) {
        return !DECK_CARD_SKIP[card.id];
      });
    }
    return [];
  }

  function renderPlatformScope(data) {
    var scope = data.platformScope;
    if (!scope || !scope.label) return "";
    return (
      '<div class="wce-platform-scope" role="note" aria-label="Regional preview scope">' +
        '<span class="wce-platform-scope__label">' + escapeHtml(scope.label) + "</span>" +
        (scope.detail ? '<span class="wce-platform-scope__detail">' + escapeHtml(scope.detail) + "</span>" : "") +
      "</div>"
    );
  }

  function riFootnote(ctx) {
    var RI = ri();
    return RI && RI.renderFootnote ? RI.renderFootnote(ctx) : "";
  }

  function renderPlatformMission(data) {
    var mission = data.platformMission;
    if (!mission || !mission.lead) return "";
    return (
      '<section class="ws-block ws-block--mission wce-platform-mission wce-platform-mission--compact" id="platform-mission" aria-labelledby="wce-mission-title">' +
        '<h2 class="wds-sr-only" id="wce-mission-title">Waypoint Studio mission</h2>' +
        '<p class="wce-platform-mission__lead">' + escapeHtml(mission.lead) + "</p>" +
        (mission.pillars ? '<p class="wce-platform-mission__pillars">' + escapeHtml(mission.pillars) + "</p>" : "") +
      "</section>"
    );
  }

  function renderHomeHero(data, base) {
    var w = data.thisWeekOutdoors;
    if (!w) return "";
    var region = data.region;
    base = base || engineBase;
    var heroSrc = resolveBundleAsset(w.heroImage, base);
    var visual = heroSrc
      ? '<img class="ws-home-hero__photo" src="' + escapeHtml(heroSrc) + '" alt="' + escapeHtml(w.heroAlt || w.title) + '">'
      : '<div class="ws-home-hero__placeholder" role="img" aria-label="' + escapeHtml(w.heroAlt || "Regional landscape placeholder") + '"></div>';
    var loc = data._location;
    var metaLine = global.WDS && global.WDS.location
      ? global.WDS.location.formatHeroMeta(loc, region, data.weekOf)
      : escapeHtml(region.name) + ", " + escapeHtml(region.state) + " · Week of " + escapeHtml(data.weekOf);

    return (
      '<section class="ws-home-hero ws-story-section ws-story-section--hero" id="home-hero" aria-labelledby="wce-hero-title">' +
        visual +
        '<div class="ws-home-hero__scrim" aria-hidden="true"></div>' +
        '<div class="ws-home-hero__inner">' +
          renderPlatformScope(data) +
          renderRegionTag(region, data.weekOf, data.season) +
          (ri() && ri().renderFootnote
            ? ri().renderFootnote({ provenance: "educational", disclaimer: "Field guide preview · confirm outdoors" })
            : (ri() ? ri().renderStrip("educational", "Field guide preview · confirm outdoors") : "")) +
          '<h1 class="ws-home-hero__title" id="wce-hero-title">' + escapeHtml(w.title) + "</h1>" +
          '<p class="ws-home-hero__deck">' + escapeHtml(w.summary) + "</p>" +
          '<p class="ws-home-hero__meta">' + escapeHtml(metaLine) + "</p>" +
        "</div>" +
      "</section>"
    );
  }

  function renderForagecast(data) {
    if (!data.featuredProject) return "";
    var fp = data.featuredProject;
    return (
      '<section class="' + storySection("feature", "wce-foragecast") + '" id="foragecast" aria-labelledby="wce-fc-title">' +
        '<div class="wce-foragecast__inner">' +
          '<div class="wce-foragecast__copy">' +
            '<p class="wce-foragecast__eyebrow">' + escapeHtml(fp.eyebrow || "Featured project") + "</p>" +
            '<h2 class="wce-foragecast__title" id="wce-fc-title">' + escapeHtml(fp.name) + "</h2>" +
            '<p class="wce-foragecast__headline">' + escapeHtml(fp.headline || fp.summary) + "</p>" +
            (fp.summary && fp.headline && fp.summary !== fp.headline
              ? '<p class="wce-foragecast__summary">' + escapeHtml(fp.summary) + "</p>"
              : "") +
          "</div>" +
          '<div class="wce-foragecast__actions">' +
            '<a class="wds-btn wds-btn--primary" href="' + escapeHtml(fp.href) + '">Visit ForageCast</a>' +
            (fp.toolHref
              ? '<a class="wds-btn wds-btn--ghost" href="' + escapeHtml(fp.toolHref) + '">' + escapeHtml(fp.toolLabel || "Open tool") + "</a>"
              : "") +
          "</div>" +
        "</div>" +
      "</section>"
    );
  }

  function renderThisWeekOutdoors(data) {
    var w = data.thisWeekOutdoors;
    if (!w) return "";
    var DE = global.WDS && global.WDS.dashboardEngine;
    var gridHtml = DE
      ? DE.renderGrid({ platform: data.outdoorIntelligence, bundle: data })
      : getOutdoorDashboardCards(data).map(renderDashCard).join("");
    var happeningMount = (
      '<div class="wce-happening-mount" data-wds-happening-now-mount aria-live="polite">' +
        (global.WDS && global.WDS.happeningNow && global.WDS.happeningNow.renderLoading
          ? global.WDS.happeningNow.renderLoading()
          : '<aside class="wce-happening wce-happening--loading"><h3 class="wce-happening__label">Field cues this week</h3><p class="wce-happening__loading">Building regional field notes…</p></aside>') +
      "</div>"
    );
    var outdoorQ = w.outdoorQuestion || "What is changing outside this week — and where can you investigate with your own eyes?";
    var season = data.season ? escapeHtml(data.season) : "";
    var weekend = w.weekendPrompt
      ? '<div class="wce-dashboard__weekend">' +
          '<p class="wce-dashboard__weekend-label">This weekend</p>' +
          '<p class="wce-dashboard__weekend-text">' + escapeHtml(w.weekendPrompt) + "</p>" +
          (w.outdoorChallenge ? '<p class="wce-dashboard__weekend-challenge"><strong>Challenge:</strong> ' + escapeHtml(w.outdoorChallenge) + "</p>" : "") +
        "</div>"
      : "";

    return (
      '<section class="wce-dashboard wce-dashboard--living ws-story-section ws-story-section--primary" id="this-week-outdoors" aria-labelledby="wce-two-title">' +
        '<div class="wce-dashboard__shell">' +
          '<header class="wce-dashboard__masthead wce-dashboard__masthead--inline">' +
            '<p class="wce-dashboard__kicker">Living outdoor dashboard</p>' +
            '<h2 class="wce-dashboard__section-title" id="wce-two-title">This week outdoors</h2>' +
            (season ? '<p class="wce-dashboard__season">' + season + " · Pike County Preview</p>" : "") +
            '<p class="wce-dashboard__outdoor-q">' + escapeHtml(outdoorQ) + "</p>" +
            (w.summary ? '<p class="wce-dashboard__summary">' + escapeHtml(w.summary) + "</p>" : "") +
            '<div class="wce-dashboard__toolbar">' +
              '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wds-dashboard-settings-open">Customize dashboard</button>' +
            "</div>" +
          "</header>" +
          '<div class="wce-dashboard__layout">' +
            '<div class="wce-dashboard__aside">' + happeningMount + weekend + "</div>" +
            '<div class="wdb-grid wce-dash-board" data-wds-dashboard-grid aria-label="Outdoor intelligence widgets">' + gridHtml + "</div>" +
          "</div>" +
          riFootnote({ provenance: "educational", disclaimer: "Editorial field snapshot — confirm weather, trails, and species outdoors" }) +
        "</div>" +
      "</section>"
    );
  }

  function renderWeekendInvestigation(data) {
    var inv = data.weekendFieldInvestigation;
    if (!inv || !inv.title) return "";
    var steps = (inv.steps || []).map(function (step) {
      return "<li>" + escapeHtml(step) + "</li>";
    }).join("");
    var materials = (inv.materials || []).length
      ? "<p class=\"wce-investigation__materials\"><strong>Bring:</strong> " + escapeHtml(inv.materials.join(", ")) + "</p>"
      : "";

    return (
      '<section class="' + storySection("feature", "wce-investigation-section") + '" id="weekend-investigation" aria-labelledby="wce-inv-title">' +
        blockHead("Field lab", "Weekend investigation", "A structured reason to go outside — observe carefully, record evidence, reflect.", "minimal") +
        '<article class="wce-investigation wce-investigation--premium">' +
          '<p class="wce-investigation__question" id="wce-inv-title">' + escapeHtml(inv.drivingQuestion || inv.title) + "</p>" +
          '<div class="wce-investigation__meta">' +
            (inv.when ? "<span><strong>When:</strong> " + escapeHtml(inv.when) + "</span>" : "") +
            (inv.duration ? "<span><strong>Duration:</strong> " + escapeHtml(inv.duration) + "</span>" : "") +
            (inv.place ? "<span><strong>Where:</strong> " + escapeHtml(inv.place) + "</span>" : "") +
          "</div>" +
          materials +
          (steps ? '<ol class="wce-investigation__steps">' + steps + "</ol>" : "") +
          renderMeta(inv) +
        "</article>" +
      "</section>"
    );
  }

  function renderRegionalFieldNotes(data) {
    var notes = data.regionalFieldNotes || [];
    if (!notes.length) return "";
    var RI = ri();
    var provBadge = RI && RI.renderBadge
      ? RI.renderBadge("educational", { tag: "span", className: "wce-field-note__prov" })
      : "";
    var list = notes.map(function (n) {
      var facts = (n.supportingFacts || []).map(function (f) {
        return "<li>" + escapeHtml(f) + "</li>";
      }).join("");
      return (
        '<article class="wce-field-note wce-field-note--journal">' +
          '<div class="wce-field-note__meta">' +
            provBadge +
            "<time datetime=\"" + escapeHtml(n.date) + "\">" + escapeHtml(n.date) + "</time>" +
            '<span class="wce-scope">' + escapeHtml(n.scope || "") + "</span>" +
          "</div>" +
          '<h3 class="wce-field-note__title">' + escapeHtml(n.title) + "</h3>" +
          '<p class="wce-field-note__body">' + escapeHtml(n.body) + "</p>" +
          (facts ? '<ul class="wce-field-note__facts">' + facts + "</ul>" : "") +
          (n.tryThis ? '<p class="wce-field-note__try"><span class="wce-field-note__try-label">Try this</span>' + escapeHtml(n.tryThis) + "</p>" : "") +
        "</article>"
      );
    }).join("");
    return (
      '<section class="' + storySection("story") + '" id="regional-field-notes" aria-labelledby="wce-rfn-title">' +
        blockHead("Journal", "Regional field notes", "Dispatches from the field — editorial observations to test outdoors, not verified survey data.", "minimal") +
        '<div class="wce-field-notes wce-field-notes--journal">' + list + "</div>" +
      "</section>"
    );
  }

  function renderSeasonalWatchCard(card) {
    if (!card || !card.name) return "";
    var status = card.status ? '<span class="wce-watch-card__status">' + escapeHtml(humanizeStatus(card.status)) + "</span>" : "";
    function eduRow(label, text) {
      if (!text) return "";
      return (
        '<div class="wce-watch-card__row">' +
          '<p class="wce-watch-card__row-label">' + escapeHtml(label) + "</p>" +
          '<p class="wce-watch-card__row-text">' + escapeHtml(text) + "</p>" +
        "</div>"
      );
    }
    return (
      '<article class="wce-watch-card">' +
        '<header class="wce-watch-card__head">' +
          '<h3 class="wce-watch-card__name">' + escapeHtml(card.name) + "</h3>" +
          status +
        "</header>" +
        '<div class="wce-watch-card__body">' +
          eduRow("Why this matters", card.whyMatters || card.note) +
          eduRow("What to watch for", card.watchFor) +
          eduRow("Ecological change", card.ecology || card.ecologicalChange) +
          eduRow("Weather connection", card.weatherLink || card.weatherInfluence) +
          eduRow("Observe ethically", card.observeEthically) +
        "</div>" +
      "</article>"
    );
  }

  function renderSeasonalWatch(data) {
    var sw = data.seasonalWatch;
    if (!sw) return "";
    var region = data.region || {};
    var regionName = region.name || "this region";
    var html = "";

    if (sw.watchCards && sw.watchCards.length) {
      html = '<div class="wce-watch-grid">' +
        sw.watchCards.filter(function (c) { return c && c.name; }).map(renderSeasonalWatchCard).join("") +
        "</div>";
    } else {
      var RI = ri();
      function renderGroup(label, items) {
        if (!items || !items.length) return "";
        var cards = items.filter(function (it) { return it && it.name; }).map(function (it) {
          return renderSeasonalWatchCard({
            name: it.name,
            status: it.status,
            note: it.note,
            whyMatters: it.note
          });
        }).join("");
        if (!cards) return "";
        return (
          '<div class="wce-seasonal-group">' +
            '<h3 class="wce-seasonal-group__label">' + escapeHtml(label) + "</h3>" +
            '<div class="wce-watch-grid">' + cards + "</div>" +
          "</div>"
        );
      }
      html =
        renderGroup("Likely this week", sw.activeNow) +
        renderGroup("May be ending", sw.ending) +
        renderGroup("On watch", sw.comingSoon);
    }

    if (!html) return "";

    return (
      '<section class="' + storySection("story", "wce-seasonal-section") + '" id="seasonal-watch" aria-labelledby="wce-sw-title">' +
        blockHead("Phenology", "Seasonal watch", "What is changing in " + escapeHtml(regionName) + " — and why it matters for your next walk.", "minimal") +
        riFootnote({ provenance: "educational", disclaimer: "Phenology watch · editorial estimates, not survey data" }) +
        '<h3 class="wds-sr-only" id="wce-sw-title">' + escapeHtml(sw.title || "Seasonal watch") + "</h3>" +
        html +
        (sw.outdoorChallenge ? '<p class="wce-seasonal-challenge"><strong>Go outside:</strong> ' + escapeHtml(sw.outdoorChallenge) + "</p>" : "") +
      "</section>"
    );
  }

  function renderResearchBrief(data) {
    var rb = data.researchBrief;
    if (!rb) return "";
    var isPlaceholder = rb.source && /placeholder/i.test(String(rb.source));
    var confidence = rb.confidence || (isPlaceholder ? "Editorial summary · source pending" : "Educational summary");
    return (
      '<section class="' + storySection("quiet") + '" id="research-brief" aria-labelledby="wce-rb-title">' +
        blockHead("Research", "Research brief", "Plain-language science with local application — uncertainty stated honestly.", "quiet") +
        '<article class="ws-research-card ws-research-card--v3">' +
          '<div class="ws-research-card__labels">' +
            '<span class="ws-research-card__confidence">' + escapeHtml(confidence) + "</span>" +
            '<span class="wce-scope">' + escapeHtml(rb.scope || "") + "</span>" +
          "</div>" +
          riFootnote({
            provenance: isPlaceholder ? "placeholder" : "educational",
            disclaimer: rb.uncertainty || "Editorial interpretation — verify with primary sources when available"
          }) +
          '<h3 class="wds-display-md ws-research-card__title" id="wce-rb-title">' + escapeHtml(rb.title) + "</h3>" +
          '<p class="wds-body ws-research-card__summary">' + escapeHtml(rb.summary) + "</p>" +
          (rb.localApplication
            ? '<div class="ws-research-card__local">' +
                '<p class="ws-research-card__local-label">Apply locally</p>' +
                '<p class="wds-body">' + escapeHtml(rb.localApplication) + "</p>" +
              "</div>"
            : "") +
          (rb.source
            ? '<footer class="ws-research-card__source-block">' +
                '<p class="ws-research-card__source-label">Source (future citation slot)</p>' +
                '<p class="ws-research-card__source">' + escapeHtml(rb.source) + "</p>" +
              "</footer>"
            : "") +
        "</article>" +
      "</section>"
    );
  }

  function renderFeaturedVideo(data) {
    var v = data.featuredVideo;
    if (!v) return "";
    var category = v.category || "Field learning";
    return (
      '<section class="' + storySection("quiet") + '" id="featured-video" aria-labelledby="wce-vid-title">' +
        blockHead("Learn", "Field video", "Educational lessons — click to play when available, never autoplay.", "quiet") +
        '<article class="ws-video-feature ws-video-feature--learning">' +
          '<div class="ws-video-feature__thumb" role="img" aria-label="Video placeholder — ' + escapeHtml(v.title) + '">' +
            '<span class="ws-video-feature__category">' + escapeHtml(category) + "</span>" +
            '<span class="ws-video-feature__play" aria-hidden="true">▶</span>' +
            '<span class="ws-video-feature__duration">' + escapeHtml(String(v.durationMinutes)) + " min · placeholder</span>" +
          "</div>" +
          '<div class="ws-video-feature__body">' +
            '<h3 class="wds-display-md ws-video-feature__title" id="wce-vid-title">' + escapeHtml(v.title) + "</h3>" +
            '<p class="wds-body">' + escapeHtml(v.summary) + "</p>" +
            (v.outdoorChallenge ? '<p class="ws-video-feature__assignment"><strong>After watching:</strong> ' + escapeHtml(v.outdoorChallenge) + "</p>" : "") +
          "</div>" +
        "</article>" +
      "</section>"
    );
  }

  function renderPhotoEssay(data) {
    var pe = data.photoEssay;
    if (!pe) return "";
    var frames = (pe.frames || []).map(function (f, i) {
      var featured = i === 0 ? " wce-essay-frame--lead" : "";
      return (
        '<figure class="wce-essay-frame' + featured + '">' +
          '<div class="wce-essay-frame__slot" role="img" aria-label="' + escapeHtml(f.caption || "Regional photograph placeholder") + '">' +
            '<span class="wce-essay-frame__index">' + String(i + 1).padStart(2, "0") + "</span>" +
            '<span class="ws-media-slot__label">Regional photograph · placeholder</span>' +
          "</div>" +
          "<figcaption class=\"wce-essay-frame__caption\">" + escapeHtml(f.caption) + "</figcaption>" +
        "</figure>"
      );
    }).join("");
    return (
      '<section class="' + storySection("quiet", "wce-photo-section") + '" id="photo-essay" aria-labelledby="wce-pe-title">' +
        blockHead("Evidence", "Regional photographs", pe.summary || "Frames from the field — observation, memory, and place.", "quiet") +
        '<h3 class="wce-photo-section__title" id="wce-pe-title">' + escapeHtml(pe.title) + "</h3>" +
        '<div class="wce-essay-frames wce-essay-frames--gallery">' + frames + "</div>" +
        (pe.outdoorChallenge ? '<p class="wce-photo-section__challenge"><strong>Your turn:</strong> ' + escapeHtml(pe.outdoorChallenge) + "</p>" : "") +
      "</section>"
    );
  }

  function renderSpeciesSpotlight(data, options) {
    options = options || {};
    var SS = global.WDS && global.WDS.speciesSpotlight;
    if (!SS || !data.speciesSpotlight) return "";

    var resolved = SS.resolveFeatured(data, {
      weekOf: data.weekOf,
      wskbBase: (options.base || "").replace(/content-engine\/?$/, "species/")
    });
    if (!resolved.species) return "";

    var moduleHtml = SS.renderModule(resolved, {
      assetBase: options.base,
      showDisclosure: true
    });

    return (
      '<section class="' + storySection("feature", "ws-block--spotlight") + '" id="species-spotlight" aria-labelledby="wss-species-name">' +
        blockHead("Species", "Species spotlight", "One species, deeply — identification, ecology, timing, and ethical observation.", "minimal") +
        moduleHtml +
      "</section>"
    );
  }

  function renderExperiences(data) {
    var items = data.experiences || [];
    if (!items.length) return "";
    var cards = items.map(function (exp) {
      if (!exp.href || !exp.name) return "";
      var slug = exp.slug || "";
      var statusClass = exp.status === "live" ? " is-live" : " is-preview";
      if (exp.featured) statusClass += " is-featured";
      var statusLabel = exp.statusLabel;
      if (!statusLabel) {
        statusLabel = exp.status === "live" ? "Preview app" : "In development";
      } else if (exp.status === "live" && statusLabel === "Live") {
        statusLabel = "Preview app";
      }
      var mission = exp.mission || exp.learnNow || exp.summary || "";
      var educationalValue = exp.educationalValue || exp.desc || "";
      var whatItDoes = exp.whatItDoes || "";
      var whoItHelps = exp.whoItHelps || "";
      var futurePlanned = exp.futurePlanned || "";

      var ctaLabel = exp.role === "dashboard" ? "Open dashboard" : ("Open " + exp.name);
      return (
        '<article class="ws-experience-card ws-experience-card--instrument ws-experience-card--' + escapeHtml(slug) + statusClass + '">' +
          '<header class="ws-experience-card__head">' +
            '<span class="ws-experience-card__status">' + escapeHtml(statusLabel) + "</span>" +
            '<h3 class="ws-experience-card__title">' + escapeHtml(exp.name) + "</h3>" +
          "</header>" +
          '<div class="ws-experience-card__body">' +
            (mission ? '<p class="ws-experience-card__mission">' + escapeHtml(mission) + "</p>" : "") +
            (whatItDoes ? '<dl class="ws-experience-card__spec"><dt>What it does</dt><dd>' + escapeHtml(whatItDoes) + "</dd></dl>" : "") +
            (whoItHelps ? '<dl class="ws-experience-card__spec"><dt>Who it helps</dt><dd>' + escapeHtml(whoItHelps) + "</dd></dl>" : "") +
            (educationalValue ? '<p class="ws-experience-card__value">' + escapeHtml(educationalValue) + "</p>" : "") +
            (futurePlanned ? '<p class="ws-experience-card__future"><strong>Building toward:</strong> ' + escapeHtml(futurePlanned) + "</p>" : "") +
          "</div>" +
          '<footer class="ws-experience-card__foot">' +
            '<a class="wds-btn wds-btn--secondary wds-btn--sm ws-experience-card__cta" href="' + escapeHtml(exp.href) + '" aria-label="' + escapeHtml(ctaLabel) + '">' + escapeHtml(ctaLabel) + "</a>" +
          "</footer>" +
        "</article>"
      );
    }).join("");

    return (
      '<section class="' + storySection("catalog") + '" id="experiences" aria-labelledby="wce-exp-title">' +
        blockHead("Platform", "Instruments", "One regional laboratory with specialized instruments — not eight separate apps.", "catalog") +
        '<h3 class="wds-sr-only" id="wce-exp-title">Platform instruments</h3>' +
        '<p class="wce-experiences-intro">Waypoint Studio helps people learn, get outdoors, and make better observations. The dashboard is the trailhead; ForageCast, Fieldry, and Scenes are the core instruments.</p>' +
        '<div class="ws-card-grid ws-card-grid--experiences">' + cards + "</div>" +
        renderContentTracks(data) +
      "</section>"
    );
  }

  function renderContentTracks(data) {
    var tracks = data.contentTracks || [];
    if (!tracks.length) return "";
    var items = tracks.map(function (track) {
      var retired = track.retired ? " wce-content-track--retired" : "";
      return (
        '<li class="wce-content-track' + retired + '">' +
          '<a href="' + escapeHtml(track.href) + '">' + escapeHtml(track.name) + "</a>" +
          " — " + escapeHtml(track.track) +
          (track.note ? ' <span class="wce-content-track__note">(' + escapeHtml(track.note) + ")</span>" : "") +
        "</li>"
      );
    }).join("");
    return (
      '<details class="wce-content-tracks">' +
        '<summary class="wce-content-tracks__summary">Future learning tracks &amp; shared modules (not standalone products)</summary>' +
        '<ul class="wce-content-tracks__list">' + items + "</ul>" +
      "</details>"
    );
  }

  function renderHowWaypointWorks(options) {
    options = options || {};
    var prefix = options.docsPrefix || "docs/";
    return (
      '<section class="ws-block ws-block--methodology" id="how-waypoint-works" aria-labelledby="wce-how-title">' +
        '<details class="wce-methodology">' +
          '<summary class="wce-methodology__summary" id="wce-how-title">How Waypoint works</summary>' +
          '<div class="wce-methodology__body">' +
            '<p class="wds-body">Waypoint Studio is a regional outdoor intelligence platform and field laboratory — beginning with Pike County Preview. ' +
            "Learn, go outside, and build toward research-grade observations. Private by default.</p>" +
            '<ul class="wce-methodology__links">' +
              '<li><a href="' + escapeHtml(prefix + "STRATEGIC-DIRECTION.md") + '">Strategic direction</a> — core platform and portfolio focus</li>' +
              '<li><a href="' + escapeHtml(prefix + "WAYPOINT-THEORY-OF-CHANGE.md") + '">Theory of change</a> — learn → observe → contribute cycle</li>' +
              '<li><a href="' + escapeHtml(prefix + "PLATFORM-ARCHITECTURE.md") + '">Platform architecture</a> — OIP, WOS, and shared foundations</li>' +
              '<li><a href="' + escapeHtml(prefix + "WAYPOINT-STUDIO-CONSTITUTION.md") + '">Studio Constitution</a> — privacy, scope, and product principles</li>' +
              '<li><a href="' + escapeHtml(prefix + "WAYPOINT-METHOD.md") + '">Waypoint Method</a> — teaching and learning cycle</li>' +
              '<li><a href="' + escapeHtml(prefix + "WAYPOINT-CONTENT-ENGINE.md") + '">Content Engine</a> — regional publishing model</li>' +
              '<li><a href="' + escapeHtml(prefix + "WAYPOINT-STUDIO-CONSTITUTION.md#privacy-philosophy") + '">Privacy philosophy</a> — private by default</li>' +
            "</ul>" +
          "</div>" +
        "</details>" +
      "</section>"
    );
  }

  function renderConservationUpdate(data) {
    var cu = data.conservationUpdate;
    if (!cu) return "";
    return (
      '<section class="' + storySection("story", "wce-conservation-section") + '" id="conservation-update" aria-labelledby="wce-cu-title">' +
        blockHead("Stewardship", "Conservation update", "Habitat, public lands, and what you can do on the ground.", "minimal") +
        '<article class="wce-conservation wce-conservation--v3">' +
          riFootnote({ provenance: "educational", disclaimer: "Editorial conservation note — verify with official land managers" }) +
          '<span class="wce-scope">' + escapeHtml(cu.scope || "") + "</span>" +
          '<h3 class="wce-conservation__title" id="wce-cu-title">' + escapeHtml(cu.title) + "</h3>" +
          (cu.habitat ? '<p class="wce-conservation__habitat"><strong>Habitat:</strong> ' + escapeHtml(cu.habitat) + "</p>" : "") +
          '<p class="wce-conservation__summary">' + escapeHtml(cu.summary) + "</p>" +
          (cu.stewardship ? '<p class="wce-conservation__stewardship"><strong>Stewardship:</strong> ' + escapeHtml(cu.stewardship) + "</p>" : "") +
          (cu.lands ? '<p class="wce-conservation__lands"><strong>Public lands:</strong> ' + escapeHtml(cu.lands) + "</p>" : "") +
          (cu.whatYouCanDo
            ? '<div class="wce-conservation__action">' +
                '<p class="wce-conservation__action-label">What you can do</p>' +
                '<p>' + escapeHtml(cu.whatYouCanDo) + "</p>" +
              "</div>"
            : "") +
          renderMeta(cu) +
        "</article>" +
      "</section>"
    );
  }

  function renderCitizenScience(privacyHref) {
    var href = privacyHref || "docs/WAYPOINT-STUDIO-CONSTITUTION.md#privacy-philosophy";
    var ethicsBlock = "";
    var OE = global.WDS && global.WDS.outdoorEthics;
    if (OE && OE.citizenScienceDisclosure) {
      ethicsBlock = OE.citizenScienceDisclosure({ submissionAvailable: false });
    }
    return (
      '<section class="ws-block" id="citizen-science" aria-labelledby="wce-cs-title">' +
        blockHead("Privacy", "Private by default", "Your notes and photographs are yours.") +
        '<div class="ws-citizen">' +
          "<p class=\"wds-body\"><strong>You own your observations.</strong> Waypoint is designed to support research-grade observations when you choose to record them. Submission is not available yet — citizen science participation will always be optional.</p>" +
          "<p class=\"wds-body\" style=\"margin-top:var(--wds-space-3);\">Identity never required. Location privacy respected. No comments, likes, profiles, or feeds — a field guide, not social media.</p>" +
          ethicsBlock +
          '<p class="wds-caption" style="margin-top:var(--wds-space-4);"><a href="' + escapeHtml(href) + '">Privacy approach</a> · <a href="docs/WAYPOINT-OUTDOOR-ETHICS-STANDARD.md">Outdoor ethics</a></p>' +
        "</div>" +
      "</section>"
    );
  }

  var RENDERERS = {
    "home-hero": function (data, options) {
      return renderHomeHero(data, options && options.base);
    },
    "platform-mission": function (data) {
      return renderPlatformMission(data);
    },
    "this-week-outdoors": renderThisWeekOutdoors,
    "weekend-investigation": renderWeekendInvestigation,
    "foragecast": renderForagecast,
    "regional-field-notes": renderRegionalFieldNotes,
    "seasonal-watch": renderSeasonalWatch,
    "species-spotlight": renderSpeciesSpotlight,
    "research-brief": renderResearchBrief,
    "featured-video": renderFeaturedVideo,
    "photo-essay": renderPhotoEssay,
    "conservation-update": renderConservationUpdate,
    "experiences": renderExperiences
  };

  function loadRegion(regionId, base) {
    var key = base + regionId;
    if (bundleCache[key]) return Promise.resolve(bundleCache[key]);
    return fetchJson(base + "regions/" + regionId + ".json").then(function (data) {
      bundleCache[key] = data;
      return data;
    });
  }

  function renderHome(data, options) {
    options = options || {};
    var sections = options.sections || SECTION_ORDER;
    var html = sections.map(function (id) {
      var fn = RENDERERS[id];
      return fn ? fn(data, options) : "";
    }).join("");
    if (options.includeCitizenScience !== false) {
      html += renderCitizenScience(options.privacyHref);
    }
    if (options.includeMethodology !== false) {
      html += renderHowWaypointWorks(options.methodology);
    }
    return html;
  }

  function mountHappeningNow(mount, options) {
    function tryMount() {
      if (global.WDS.happeningNow && global.WDS.happeningNow.mountAll) {
        global.WDS.happeningNow.mountAll(mount, options);
        return;
      }
      global.requestAnimationFrame(tryMount);
    }
    tryMount();
  }

  function mountWeatherWidgets(mount, options) {
    function tryMount() {
      if (global.WDS.weatherUI && global.WDS.weatherUI.mountAll && global.WDS.weather) {
        global.WDS.weatherUI.mountAll(mount, options);
        return;
      }
      global.requestAnimationFrame(tryMount);
    }
    tryMount();
  }

  function fetchOutdoorIntelligence(loc, base, bundle) {
    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    if (!OIP || !OIP.get) return Promise.resolve(null);
    var hints = bundle && bundle.thisWeekOutdoors && bundle.thisWeekOutdoors.weather;
    return OIP.get({
      location: loc,
      bundle: bundle,
      contentEngineBase: base,
      includeWeather: true,
      weatherHints: hints
    });
  }

  function mountDashboardWidgets(mount, loc, base, data, platform) {
    var weatherHints = data.thisWeekOutdoors && data.thisWeekOutdoors.weather;
    var intel = (platform && platform.legacy) || data.regionalIntelligence || null;
    var mountOpts = {
      location: loc,
      hints: weatherHints,
      bundle: data,
      intelligence: intel,
      platform: platform,
      package: platform && platform.weatherRef
    };
    var DE = global.WDS && global.WDS.dashboardEngine;
    if (DE) {
      DE.bindInteractions(mount);
      DE.bindSettings(mount, function () {
        DE.refreshGrid(mount, Object.assign({}, mountOpts, {
          platform: platform,
          bundle: data,
          settings: global.WDS.dashboardSettings && global.WDS.dashboardSettings.load()
        }));
      });
      DE.mountWidgets(mount, mountOpts);
      return;
    }
    var weatherMountOptions = Object.assign({}, mountOpts, { root: mount, fallback: false });
    mountWeatherWidgets(mount, weatherMountOptions);
    mountHappeningNow(mount, {
      bundle: data,
      location: loc,
      intelligence: intel,
      platform: platform
    });
  }

  function renderIntoMount(mount, data, loc, base, options, platform) {
    var bar = renderLocationBar(loc);
    var renderOpts = Object.assign({}, options, { base: base });
    var inner = bar + renderHome(data, renderOpts);
    mount.innerHTML = options.wrapMain !== false ? '<main id="main">' + inner + "</main>" : inner;
    mount.removeAttribute("aria-busy");
    bindLocationBar(mount, options);
    if (loc && loc.name) {
      var titleRegion = loc.name + ", " + (loc.stateCode || loc.state);
      document.title = "This Week Outdoors · " + titleRegion + " — Waypoint Studio";
    }
    if (global.WDS.mapView && global.WDS.mapView.applyLocation) {
      global.WDS.mapView.applyLocation(mount, loc, { base: base });
    }
    mountDashboardWidgets(mount, loc, base, data, platform);
    return data;
  }

  function applyPlatformToData(data, platform) {
    if (global.WDS && global.WDS.dashboard && global.WDS.dashboard.applyToBundle) {
      data = global.WDS.dashboard.applyToBundle(data, platform);
    }
    if (platform) {
      data.outdoorIntelligence = platform;
      data.regionalIntelligence = platform.legacy || data.regionalIntelligence || null;
    }
    return data;
  }

  function wskbBaseFromEngine(base) {
    return String(base || "content-engine/").replace(/content-engine\/?$/, "species/");
  }

  function ensureWskbPreload(data, base) {
    var KB = global.WDS && global.WDS.wskb;
    if (!KB || !KB.preloadFromBundle) return Promise.resolve();
    KB.configure({ base: wskbBaseFromEngine(base) });
    return KB.preloadFromBundle(data);
  }

  function init(options) {
    options = options || {};
    var base = resolveEngineBase(options);
    var loc = options.location || (global.WDS && global.WDS.location ? global.WDS.location.getState() : null);
    var regionId = options.region ||
      (loc && loc.contentBundle) ||
      (options.mount && options.mount.getAttribute("data-wds-region")) ||
      null;
    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    if (!regionId && OIP && OIP.adapters && OIP.adapters.resolveRegionId) {
      regionId = OIP.adapters.resolveRegionId({ location: loc, region: options.region });
    }
    if (!regionId && global.WDS && global.WDS.location && global.WDS.location.getDefaultRegionId) {
      regionId = global.WDS.location.getDefaultRegionId();
    }
    if (!regionId) {
      return Promise.reject(new Error("WDS.contentEngine: no region id — load regions-index or pass options.region"));
    }
    var mount = options.mount || document.getElementById("wds-content-engine");
    if (!mount) return Promise.reject(new Error("WDS.contentEngine: no mount element"));

    mount.setAttribute("aria-busy", "true");

    return loadRegion(regionId, base).then(function (data) {
      if (loc && global.WDS && global.WDS.location) {
        data = global.WDS.location.applyToBundle(data, loc);
      }
      return ensureWskbPreload(data, base).then(function () {
        return fetchOutdoorIntelligence(loc, base, data).then(function (platform) {
          data = applyPlatformToData(data, platform);
          return renderIntoMount(mount, data, loc, base, options, platform);
        }).catch(function () {
          data = applyPlatformToData(data, null);
          return renderIntoMount(mount, data, loc, base, options, null);
        });
      });
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.contentEngine = {
    init: init,
    loadRegion: loadRegion,
    renderHome: renderHome,
    renderHowWaypointWorks: renderHowWaypointWorks,
    SECTION_ORDER: SECTION_ORDER
  };
})(window);
