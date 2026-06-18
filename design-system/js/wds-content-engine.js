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
    "this-week-outdoors",
    "seasonal-watch",
    "regional-field-notes",
    "species-spotlight",
    "research-brief",
    "conservation-update",
    "featured-video",
    "photo-essay",
    "experiences"
  ];

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

  function blockHead(eyebrow, title, lead) {
    return (
      '<div class="ws-block__head">' +
        (eyebrow ? '<p class="ws-block__eyebrow">' + escapeHtml(eyebrow) + "</p>" : "") +
        '<h2 class="ws-block__title">' + escapeHtml(title) + "</h2>" +
        (lead ? '<p class="ws-block__lead">' + escapeHtml(lead) + "</p>" : "") +
      "</div>"
    );
  }

  function mediaSlot(label, hint) {
    return (
      '<div class="ws-media-slot" role="img" aria-label="' + escapeHtml(label) + '">' +
        '<span class="ws-media-slot__label">' + escapeHtml(label) + "</span>" +
        (hint ? '<p class="ws-media-slot__hint">' + escapeHtml(hint) + "</p>" : "") +
      "</div>"
    );
  }

  function renderMeta(item) {
    if (!item) return "";
    var parts = [];
    if (item.outdoorChallenge) parts.push("<p><strong>Outdoor:</strong> " + escapeHtml(item.outdoorChallenge) + "</p>");
    if (item.citizenScience) parts.push("<p><strong>Citizen science (optional):</strong> " + escapeHtml(item.citizenScience) + "</p>");
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
    if (!loc) return "";
    var statusLine = "";
    if (loc.isDefault) {
      statusLine = '<strong>Using default region:</strong> Pike County, PA';
    } else if (loc.source === "geo") {
      statusLine = "<strong>Near</strong> " + escapeHtml(loc.name) + ", " + escapeHtml(loc.stateCode);
      if (loc.distanceKm > 0) {
        statusLine += ' <span class="wce-location-bar__dist">(~' + escapeHtml(String(loc.distanceKm)) + " km)</span>";
      }
    } else {
      statusLine = "<strong>Region:</strong> " + escapeHtml(loc.name) + ", " + escapeHtml(loc.state);
    }

    var bundleNote = "";
    if (loc.usingNearestBundle) {
      bundleNote = '<p class="wce-location-bar__note">Field guide content from nearest available bundle — more counties coming.</p>';
    }

    return (
      '<div class="wce-location-bar" id="wds-location-bar" data-location-source="' + escapeHtml(loc.source) + '">' +
        '<div class="wce-location-bar__main">' +
          '<p class="wce-location-bar__status">' + statusLine + "</p>" +
          '<div class="wce-location-bar__actions">' +
            '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wds-loc-retry">Use my location</button>' +
            '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wds-loc-change">Change region</button>' +
          "</div>" +
        "</div>" +
        bundleNote +
        '<form class="wce-location-bar__search wds-location-search is-hidden" id="wds-loc-change-form">' +
          '<label class="wds-location-search__label" for="wds-loc-change-input">Search county</label>' +
          '<div class="wds-location-search__row">' +
            '<input class="wds-location-search__input" id="wds-loc-change-input" list="wds-loc-change-list" placeholder="County, ST" autocomplete="off">' +
            '<datalist id="wds-loc-change-list"></datalist>' +
            '<button type="submit" class="wds-btn wds-btn--secondary wds-btn--sm">Set</button>' +
          "</div>" +
        "</form>" +
      "</div>"
    );
  }

  function bindLocationBar(mount, options) {
    if (!mount || !global.WDS || !global.WDS.location) return;
    var bar = mount.querySelector("#wds-location-bar");
    if (!bar) return;

    var base = resolveEngineBase(options);
    var changeBtn = bar.querySelector("#wds-loc-change");
    var changeForm = bar.querySelector("#wds-loc-change-form");
    var retryBtn = bar.querySelector("#wds-loc-retry");

    if (changeBtn && changeForm) {
      changeBtn.addEventListener("click", function () {
        changeForm.classList.toggle("is-hidden");
        global.WDS.location.loadIndex(base).then(function (index) {
          var list = bar.querySelector("#wds-loc-change-list");
          if (list) {
            list.innerHTML = (index.regions || []).map(function (r) {
              return '<option value="' + escapeHtml(r.name + ", " + r.stateCode) + '">';
            }).join("");
          }
        });
      });
    }

    if (changeForm) {
      changeForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var q = (bar.querySelector("#wds-loc-change-input").value || "").toLowerCase().trim();
        global.WDS.location.loadIndex(base).then(function (index) {
          var found = (index.regions || []).find(function (r) {
            var label = (r.name + ", " + r.stateCode).toLowerCase();
            return label === q || r.name.toLowerCase() === q;
          });
          if (!found) {
            found = (index.regions || []).find(function (r) {
              return r.name.toLowerCase().indexOf(q) !== -1;
            });
          }
          if (found) {
            var state = global.WDS.location.resolveManual(found.id, index);
            global.WDS.location.writeStored(state);
            if (options.onLocationChange) options.onLocationChange(state);
          }
        });
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener("click", function () {
        global.WDS.location.requestGeolocationAndSave(base).then(function (state) {
          if (options.onLocationChange) options.onLocationChange(state);
        });
      });
    }
  }

  function renderThisWeekOutdoors(data) {
    var w = data.thisWeekOutdoors;
    if (!w) return "";
    var region = data.region;
    var weather = w.weather || {};
    var happening = (w.happeningNow || []).map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("");
    var heroImg = w.heroImage
      ? '<img class="wce-dashboard__photo" src="' + escapeHtml(w.heroImage) + '" alt="' + escapeHtml(w.heroAlt || "Regional field photograph") + '">'
      : mediaSlot("Regional photograph · placeholder", w.photography && w.photography.caption);
    var featured = "";
    if (data.featuredProject) {
      var fp = data.featuredProject;
      featured =
        '<aside class="wce-featured-project" aria-label="Featured project">' +
          '<p class="wce-featured-project__eyebrow">' + escapeHtml(fp.eyebrow) + "</p>" +
          '<h3 class="wce-featured-project__title">' + escapeHtml(fp.name) + "</h3>" +
          '<p class="wce-featured-project__headline">' + escapeHtml(fp.headline) + "</p>" +
          '<p class="wce-featured-project__summary">' + escapeHtml(fp.summary) + "</p>" +
          '<div class="wce-featured-project__actions">' +
            '<a class="wds-btn wds-btn--primary wds-btn--sm" href="' + escapeHtml(fp.href) + '">Visit ForageCast</a>' +
            (fp.toolHref ? '<a class="wds-btn wds-btn--ghost wds-btn--sm" href="' + escapeHtml(fp.toolHref) + '">' + escapeHtml(fp.toolLabel || "Open tool") + "</a>" : "") +
          "</div>" +
        "</aside>";
    }

    var coordsLine = "";
    if (data._location && data._location.source === "geo") {
      var lat = data._location.lat;
      var lng = data._location.lng;
      var latStr = (lat >= 0 ? lat.toFixed(2) + "°N" : Math.abs(lat).toFixed(2) + "°S");
      var lngStr = (lng >= 0 ? lng.toFixed(2) + "°E" : Math.abs(lng).toFixed(2) + "°W");
      coordsLine = '<p class="wce-dashboard__coords">Map center · ' + escapeHtml(latStr + ", " + lngStr) + "</p>";
    }

    return (
      '<section class="wce-dashboard" id="this-week-outdoors" aria-labelledby="wce-two-title">' +
        '<div class="wce-dashboard__hero">' +
          heroImg +
          '<div class="wce-dashboard__scrim" aria-hidden="true"></div>' +
          '<div class="wce-dashboard__hero-inner">' +
            '<p class="wce-dashboard__region">' + escapeHtml(region.name) + ", " + escapeHtml(region.state) + "</p>" +
            '<p class="wce-dashboard__meta">Week of ' + escapeHtml(data.weekOf) + " · " + escapeHtml(data.season) + "</p>" +
            coordsLine +
            '<h1 class="wce-dashboard__title" id="wce-two-title">' + escapeHtml(w.title) + "</h1>" +
            '<p class="wce-dashboard__summary">' + escapeHtml(w.summary) + "</p>" +
          "</div>" +
        "</div>" +
        '<div class="wce-dashboard__body">' +
          '<div class="wce-dashboard__grid">' +
            '<div class="wce-weather-card" aria-label="Weather snapshot">' +
              '<p class="wce-weather-card__label">Weather</p>' +
              '<p class="wce-weather-card__temp">' + escapeHtml(weather.high || "—") + " · " + escapeHtml(weather.low || "—") + "</p>" +
              '<p class="wce-weather-card__conditions">' + escapeHtml(weather.conditions || (w.blocks && w.blocks[0] && w.blocks[0].text) || "") + "</p>" +
            "</div>" +
            '<div class="wce-happening">' +
              '<p class="wce-happening__label">Happening now outdoors</p>' +
              '<ul class="wce-happening__list">' + happening + "</ul>" +
            "</div>" +
            featured +
          "</div>" +
        "</div>" +
      "</section>"
    );
  }

  function renderRegionalFieldNotes(data) {
    var notes = data.regionalFieldNotes || [];
    if (!notes.length) return "";
    var list = notes.map(function (n) {
      return (
        '<article class="wce-field-note">' +
          '<div class="wce-field-note__meta">' +
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
      '<section class="ws-block" id="regional-field-notes" aria-labelledby="wce-rfn-title">' +
        blockHead("Local", "Regional field notes", "Trail, weather, wildlife, and phenology — short dispatches from the field.") +
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
            '<span class="wce-seasonal-item__status">' + escapeHtml((it.status || "").replace(/-/g, " ")) + "</span>" +
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

    var groups =
      renderGroup("Active now", sw.activeNow) +
      renderGroup("Ending", sw.ending) +
      renderGroup("Coming soon", sw.comingSoon);

    if (!groups && sw.items) {
      groups = '<div class="wce-seasonal-grid">' + (sw.items || []).map(function (it) {
        return (
          '<div class="wce-seasonal-item">' +
            '<p class="wce-seasonal-item__name">' + escapeHtml(it.name) + "</p>" +
            '<span class="wce-seasonal-item__status">' + escapeHtml((it.status || "").replace(/-/g, " ")) + "</span>" +
            '<p class="wce-seasonal-item__note">' + escapeHtml(it.note) + "</p>" +
          "</div>"
        );
      }).join("") + "</div>";
    }

    return (
      '<section class="ws-block" id="seasonal-watch" aria-labelledby="wce-sw-title">' +
        blockHead("Phenology", "Seasonal watch", "What the forest is doing this week in " + escapeHtml(data.region.name) + ".") +
        '<h3 class="wds-sr-only" id="wce-sw-title">' + escapeHtml(sw.title) + "</h3>" +
        '<div class="wce-seasonal-groups">' + groups + "</div>" +
      "</section>"
    );
  }

  function renderResearchBrief(data) {
    var rb = data.researchBrief;
    if (!rb) return "";
    return (
      '<section class="ws-block" id="research-brief" aria-labelledby="wce-rb-title">' +
        blockHead("Research", "Research brief", "Plain language — with a local application paragraph.") +
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
      '<section class="ws-block" id="featured-video" aria-labelledby="wce-vid-title">' +
        blockHead("Videos", "Featured videos", "Educational field lessons — click to play, never autoplay.") +
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
      '<section class="ws-block" id="photo-essay" aria-labelledby="wce-pe-title">' +
        blockHead("Photos", "Regional photographs", escapeHtml(pe.summary)) +
        '<h3 class="wds-display-md" id="wce-pe-title" style="margin:0 0 var(--wds-space-4);">' + escapeHtml(pe.title) + "</h3>" +
        '<div class="wce-essay-frames">' + frames + "</div>" +
      "</section>"
    );
  }

  function renderSpeciesSpotlight(data) {
    var sp = data.speciesSpotlight;
    if (!sp) return "";
    var card = global.WDS && global.WDS.speciesSpotlight
      ? global.WDS.speciesSpotlight.renderCard(sp, {
          weekOf: data.weekOf,
          showWeekPreview: /weekly/i.test(sp.spotlightLabel || "")
        })
      : "";
    return (
      '<section class="ws-block" id="species-spotlight" aria-labelledby="wce-spotlight-name">' +
        '<div class="ws-spotlight">' +
          '<figure class="ws-spotlight__plate">' + mediaSlot("Species plate · placeholder", sp.commonName) + "</figure>" +
          card +
        "</div>" +
      "</section>"
    );
  }

  function renderExperiences(data) {
    var items = data.experiences || [];
    if (!items.length) return "";
    var cards = items.map(function (exp) {
      if (!exp.href || !exp.name) return "";
      var statusClass = exp.status === "live" ? " is-live" : " is-preview";
      if (exp.featured) statusClass += " is-featured";
      var statusLabel = exp.status === "live" ? "Live" : "Preview";
      var summary = exp.summary || exp.desc || "";
      var learn = exp.learnNow || "";
      var coming = exp.comingLater || "";

      return (
        '<a class="ws-experience-card' + statusClass + '" href="' + escapeHtml(exp.href) + '">' +
          '<div class="ws-experience-card__head">' +
            (exp.featured ? '<span class="ws-experience-card__badge">Featured</span>' : "") +
            '<span class="ws-experience-card__status">' + escapeHtml(statusLabel) + "</span>" +
            '<h3 class="ws-experience-card__title">' + escapeHtml(exp.name) + "</h3>" +
            (summary ? '<p class="ws-experience-card__desc">' + escapeHtml(summary) + "</p>" : "") +
          "</div>" +
          '<div class="ws-experience-card__body">' +
            (learn
              ? '<div class="ws-experience-card__block">' +
                  '<p class="ws-experience-card__label">Learn now</p>' +
                  '<p class="ws-experience-card__text">' + escapeHtml(learn) + "</p>" +
                "</div>"
              : "") +
            (coming
              ? '<div class="ws-experience-card__block ws-experience-card__block--soon">' +
                  '<p class="ws-experience-card__label">Coming later</p>' +
                  '<p class="ws-experience-card__text">' + escapeHtml(coming) + "</p>" +
                "</div>"
              : "") +
          "</div>" +
          '<span class="ws-experience-card__cta">' + (exp.status === "live" ? "Open app" : "Read preview") + " →</span>" +
        "</a>"
      );
    }).join("");

    return (
      '<section class="ws-block" id="experiences" aria-labelledby="wce-exp-title">' +
        blockHead("Field laboratories", "Experiences", "Five rooms in the same cabin — each app teaches a different outdoor skill. Start where your curiosity points.") +
        '<h3 class="wds-sr-only" id="wce-exp-title">Experiences</h3>' +
        '<div class="ws-card-grid ws-card-grid--experiences">' + cards + "</div>" +
      "</section>"
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
            '<p class="wds-body">Waypoint Studio is a regional field-guide studio — outdoor knowledge, calm lessons, and private-by-default observations. ' +
            "The references below are for contributors and builders, not required reading for visitors.</p>" +
            '<ul class="wce-methodology__links">' +
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
      '<section class="ws-block" id="conservation-update" aria-labelledby="wce-cu-title">' +
        blockHead("Stewardship", "Conservation update", "Real place, honest hope — local action.") +
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
    return (
      '<section class="ws-block" id="citizen-science" aria-labelledby="wce-cs-title">' +
        blockHead("Privacy", "Private by default", "Your notes and photographs are yours.") +
        '<div class="ws-citizen">' +
          "<p class=\"wds-body\"><strong>You own your observations.</strong> Citizen science is always optional. Identity never required. Location privacy respected.</p>" +
          "<p class=\"wds-body\" style=\"margin-top:var(--wds-space-3);\">No comments, likes, profiles, or feeds — a field guide, not social media.</p>" +
          '<p class="wds-caption" style="margin-top:var(--wds-space-4);"><a href="#how-waypoint-works">Privacy approach</a></p>' +
        "</div>" +
      "</section>"
    );
  }

  var RENDERERS = {
    "this-week-outdoors": renderThisWeekOutdoors,
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
      return fn ? fn(data) : "";
    }).join("");
    if (options.includeCitizenScience !== false) {
      html += renderCitizenScience(options.privacyHref);
    }
    if (options.includeMethodology !== false) {
      html += renderHowWaypointWorks(options.methodology);
    }
    return html;
  }

  function init(options) {
    options = options || {};
    var base = resolveEngineBase(options);
    var loc = options.location || (global.WDS && global.WDS.location ? global.WDS.location.getState() : null);
    var regionId = options.region ||
      (loc && loc.contentBundle) ||
      (options.mount && options.mount.getAttribute("data-wds-region")) ||
      "pike-county-pa";
    var mount = options.mount || document.getElementById("wds-content-engine");
    if (!mount) return Promise.reject(new Error("WDS.contentEngine: no mount element"));

    mount.setAttribute("aria-busy", "true");

    return loadRegion(regionId, base).then(function (data) {
      if (loc && global.WDS && global.WDS.location) {
        data = global.WDS.location.applyToBundle(data, loc);
      }
      var bar = renderLocationBar(loc);
      var inner = bar + renderHome(data, options);
      mount.innerHTML = options.wrapMain !== false ? '<main id="main">' + inner + "</main>" : inner;
      mount.removeAttribute("aria-busy");
      bindLocationBar(mount, options);
      if (loc && loc.name) {
        document.title = "This Week Outdoors · " + loc.name + ", " + (loc.stateCode || loc.state) + " — Waypoint Studio";
      }
      return data;
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
