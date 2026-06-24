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
    "foragecast",
    "seasonal-watch",
    "regional-field-notes",
    "species-spotlight",
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

  function renderPlatformMission(data) {
    var mission = data.platformMission;
    if (!mission || !mission.lead) return "";
    return (
      '<section class="ws-block ws-block--mission wce-platform-mission" id="platform-mission" aria-labelledby="wce-mission-title">' +
        '<h2 class="wds-sr-only" id="wce-mission-title">Waypoint Studio mission</h2>' +
        '<p class="wce-platform-mission__lead">' + escapeHtml(mission.lead) + "</p>" +
        (mission.pillars ? '<p class="wce-platform-mission__pillars">' + escapeHtml(mission.pillars) + "</p>" : "") +
        (mission.honest ? '<p class="wce-platform-mission__honest">' + escapeHtml(mission.honest) + "</p>" : "") +
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
    var cardsHtml = getOutdoorDashboardCards(data).map(renderDashCard).join("");
    var happeningMount = (
      '<div class="wce-happening-mount" data-wds-happening-now-mount aria-live="polite">' +
        (global.WDS && global.WDS.happeningNow && global.WDS.happeningNow.renderLoading
          ? global.WDS.happeningNow.renderLoading()
          : '<aside class="wce-happening wce-happening--loading"><h3 class="wce-happening__label">Field cues this week</h3><p class="wce-happening__loading">Building regional field notes…</p></aside>') +
      "</div>"
    );

    return (
      '<section class="wce-dashboard wce-dashboard--slim ws-story-section ws-story-section--primary" id="this-week-outdoors" aria-labelledby="wce-two-title">' +
        '<div class="wce-dashboard__body">' +
          '<header class="wce-dashboard__intro">' +
            '<h2 class="wce-dashboard__section-title" id="wce-two-title">This week outdoors</h2>' +
            '<p class="wce-dashboard__section-lead">Editorial conditions, trails, and wildlife notes — confirm in the field.</p>' +
          "</header>" +
          happeningMount +
          '<div class="wce-dash-board" aria-label="Outdoor conditions dashboard">' + cardsHtml + "</div>" +
        "</div>" +
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
      return (
        '<article class="wce-field-note">' +
          '<div class="wce-field-note__meta">' +
            provBadge +
            "<time>" + escapeHtml(n.date) + "</time>" +
            '<span class="wce-scope">' + escapeHtml(n.scope) + "</span>" +
          "</div>" +
          '<h3 class="wce-field-note__title">' + escapeHtml(n.title) + "</h3>" +
          '<p class="wce-field-note__body">' + escapeHtml(n.body) + "</p>" +
          (n.tryThis ? '<p class="wce-field-note__try">Try this: ' + escapeHtml(n.tryThis) + "</p>" : "") +
        "</article>"
      );
    }).join("");
    return (
      '<section class="' + storySection("story") + '" id="regional-field-notes" aria-labelledby="wce-rfn-title">' +
        blockHead("Local", "Regional field notes", "Editorial dispatches — not verified survey data or live detection.") +
        '<div class="wce-field-notes">' + list + "</div>" +
      "</section>"
    );
  }

  function renderSeasonalWatch(data) {
    var sw = data.seasonalWatch;
    if (!sw) return "";

    function renderGroup(label, items) {
      if (!items || !items.length) return "";
      var cards = items.map(function (it) {
        return (
          '<div class="wce-seasonal-item">' +
            '<p class="wce-seasonal-item__name">' + escapeHtml(it.name) + "</p>" +
            '<span class="wce-seasonal-item__status">' + escapeHtml(humanizeStatus(it.status)) + "</span>" +
            '<p class="wce-seasonal-item__note">' + escapeHtml(it.note) + "</p>" +
          "</div>"
        );
      }).join("");
      return (
        '<div class="wce-seasonal-group">' +
          '<h3 class="wce-seasonal-group__label">' + escapeHtml(label) + "</h3>" +
          '<div class="wce-seasonal-group__items">' + cards + "</div>" +
        "</div>"
      );
    }

    function groupLabelFor(text) {
      if (text === "Active now") return "Likely this week";
      if (text === "Ending") return "May be ending";
      if (text === "Coming soon") return "On watch";
      return text;
    }

    var groups =
      renderGroup(groupLabelFor("Active now"), sw.activeNow) +
      renderGroup(groupLabelFor("Ending"), sw.ending) +
      renderGroup(groupLabelFor("Coming soon"), sw.comingSoon);

    if (!groups && sw.items) {
      groups = '<div class="wce-seasonal-grid">' + (sw.items || []).map(function (it) {
        return (
          '<div class="wce-seasonal-item">' +
            '<p class="wce-seasonal-item__name">' + escapeHtml(it.name) + "</p>" +
            '<span class="wce-seasonal-item__status">' + escapeHtml(humanizeStatus(it.status)) + "</span>" +
            '<p class="wce-seasonal-item__note">' + escapeHtml(it.note) + "</p>" +
          "</div>"
        );
      }).join("") + "</div>";
    }

    return (
      '<section class="' + storySection("story") + '" id="seasonal-watch" aria-labelledby="wce-sw-title">' +
        blockHead("Phenology", "Seasonal watch", "What editors are watching this week in " + escapeHtml(data.region.name) + " — confirm outdoors.") +
        (RI && RI.renderFootnote
          ? RI.renderFootnote({ provenance: "educational", disclaimer: "Phenology watch · not survey data" })
          : "") +
        '<h3 class="wds-sr-only" id="wce-sw-title">' + escapeHtml(sw.title) + "</h3>" +
        '<div class="wce-seasonal-groups">' + groups + "</div>" +
      "</section>"
    );
  }

  function renderResearchBrief(data) {
    var rb = data.researchBrief;
    if (!rb) return "";
    return (
      '<section class="' + storySection("quiet") + '" id="research-brief" aria-labelledby="wce-rb-title">' +
        blockHead("Research", "Research brief", "Plain-language science with local application — check source and citations.", "quiet") +
        (RI && RI.renderFootnote
          ? RI.renderFootnote({
              provenance: rb.source && /placeholder/i.test(rb.source) ? "placeholder" : "educational",
              disclaimer: rb.source || "Editorial summary"
            }) + (rb.source && RI.renderCitation ? RI.renderCitation({ label: rb.source }, { prefix: "" }) : "")
          : "") +
        '<article class="ws-research-card">' +
          '<span class="wce-scope">' + escapeHtml(rb.scope) + "</span>" +
          '<h3 class="wds-display-md" id="wce-rb-title" style="margin:var(--wds-space-2) 0;">' + escapeHtml(rb.title) + "</h3>" +
          '<p class="wds-body">' + escapeHtml(rb.summary) + "</p>" +
          '<p class="wds-body" style="margin-top:var(--wds-space-3);"><strong>Local:</strong> ' + escapeHtml(rb.localApplication) + "</p>" +
          (rb.source ? '<p class="ws-research-card__source">' + escapeHtml(rb.source) + "</p>" : "") +
        "</article>" +
      "</section>"
    );
  }

  function renderFeaturedVideo(data) {
    var v = data.featuredVideo;
    if (!v) return "";
    return (
      '<section class="' + storySection("quiet") + '" id="featured-video" aria-labelledby="wce-vid-title">' +
        blockHead("Videos", "Featured videos", "Educational field lessons — click to play, never autoplay.", "quiet") +
        '<div class="ws-video-feature">' +
          '<div class="ws-video-feature__thumb" role="img" aria-label="Video placeholder">' +
            '<span class="ws-video-feature__play" aria-hidden="true">▶</span>' +
            '<span class="ws-media-slot__label">' + escapeHtml(v.durationMinutes) + " min · " + escapeHtml(v.scope) + " · placeholder</span>" +
          "</div>" +
          "<div>" +
            '<h3 class="wds-display-md" id="wce-vid-title" style="margin:0 0 var(--wds-space-2);">' + escapeHtml(v.title) + "</h3>" +
            '<p class="wds-body">' + escapeHtml(v.summary) + "</p>" +
          "</div>" +
        "</div>" +
      "</section>"
    );
  }

  function renderPhotoEssay(data) {
    var pe = data.photoEssay;
    if (!pe) return "";
    var frames = (pe.frames || []).map(function (f) {
      return (
        '<figure class="wce-essay-frame">' +
          '<div class="ws-media-slot wce-essay-frame__slot" role="img" aria-label="Photo placeholder">' +
            '<span class="ws-media-slot__label">Photo essay frame · placeholder</span>' +
            '<p class="ws-media-slot__hint">' + escapeHtml(f.caption) + "</p>" +
          "</div>" +
          "<figcaption>" + escapeHtml(f.caption) + "</figcaption>" +
        "</figure>"
      );
    }).join("");
    return (
      '<section class="' + storySection("quiet") + '" id="photo-essay" aria-labelledby="wce-pe-title">' +
        blockHead("Photos", "Regional photographs", pe.summary, "quiet") +
        '<h3 class="wds-display-md" id="wce-pe-title" style="margin:0 0 var(--wds-space-4);">' + escapeHtml(pe.title) + "</h3>" +
        '<div class="wce-essay-frames">' + frames + "</div>" +
      "</section>"
    );
  }

  function renderSpeciesSpotlight(data, options) {
    options = options || {};
    var SS = global.WDS && global.WDS.speciesSpotlight;
    if (!SS || !data.speciesSpotlight) return "";

    var resolved = SS.resolveFeatured(data, { weekOf: data.weekOf });
    if (!resolved.species) return "";

    var moduleHtml = SS.renderModule(resolved, {
      assetBase: options.base,
      showDisclosure: true
    });

    return (
      '<section class="' + storySection("feature", "ws-block--spotlight") + '" id="species-spotlight" aria-labelledby="wss-species-name">' +
        blockHead("Species", "Species spotlight", "Field-guide depth for one species — seasonal education, not live detection.", "minimal") +
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

      var ctaLabel = exp.role === "dashboard" ? "Open dashboard" : ("Open " + exp.name);
      return (
        '<article class="ws-experience-card ws-experience-card--' + escapeHtml(slug) + statusClass + '">' +
          '<header class="ws-experience-card__head">' +
            '<span class="ws-experience-card__status">' + escapeHtml(statusLabel) + "</span>" +
            '<h3 class="ws-experience-card__title">' + escapeHtml(exp.name) + "</h3>" +
          "</header>" +
          '<div class="ws-experience-card__body">' +
            (mission ? '<p class="ws-experience-card__mission">' + escapeHtml(mission) + "</p>" : "") +
            (educationalValue ? '<p class="ws-experience-card__value">' + escapeHtml(educationalValue) + "</p>" : "") +
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
      '<section class="' + storySection("story") + '" id="conservation-update" aria-labelledby="wce-cu-title">' +
        blockHead("Stewardship", "Conservation update", "Local stewardship note — verify project details with official sources.") +
        (RI && RI.renderFootnote
          ? RI.renderFootnote({ provenance: "educational", disclaimer: "Editorial conservation note" })
          : "") +
        '<article class="wce-conservation">' +
          '<span class="wce-scope">' + escapeHtml(cu.scope) + "</span>" +
          '<h3 class="wds-display-md" id="wce-cu-title" style="margin:var(--wds-space-2) 0;">' + escapeHtml(cu.title) + "</h3>" +
          '<p class="wds-body">' + escapeHtml(cu.summary) + "</p>" +
          (cu.whatYouCanDo ? '<p class="wds-body" style="margin-top:var(--wds-space-3);"><strong>What you can do:</strong> ' + escapeHtml(cu.whatYouCanDo) + "</p>" : "") +
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
    var weatherMountOptions = {
      location: loc,
      hints: weatherHints,
      root: mount,
      fallback: false,
      intelligence: intel,
      platform: platform,
      package: platform && platform.weatherRef
    };
    var happeningNowOptions = {
      bundle: data,
      location: loc,
      intelligence: intel,
      platform: platform
    };
    mountWeatherWidgets(mount, weatherMountOptions);
    mountHappeningNow(mount, happeningNowOptions);
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
      return fetchOutdoorIntelligence(loc, base, data).then(function (platform) {
        data = applyPlatformToData(data, platform);
        return renderIntoMount(mount, data, loc, base, options, platform);
      }).catch(function () {
        data = applyPlatformToData(data, null);
        return renderIntoMount(mount, data, loc, base, options, null);
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
