/**
 * Photo Coach — main application shell
 */
(function (global) {
  "use strict";

  var state = {
    location: null,
    platform: null,
    photography: null,
    conceptIndex: 0
  };

  function util() { return global.PhotoCoachUtil; }

  function diagrams() {
    var stroke = "currentColor";
    var accent = "var(--wds-accent)";
    return {
      "leading-lines": '<svg viewBox="0 0 200 140" aria-hidden="true"><path d="M20 120 L100 40 L180 120" fill="none" stroke="' + accent + '" stroke-width="2"/><circle cx="100" cy="40" r="8" fill="' + accent + '"/><line x1="0" y1="130" x2="200" y2="130" stroke="' + stroke + '" stroke-opacity="0.3"/></svg>',
      foreground: '<svg viewBox="0 0 200 140" aria-hidden="true"><rect x="10" y="90" width="50" height="40" fill="' + accent + '" opacity="0.5"/><path d="M70 120 L100 50 L130 120 Z" fill="none" stroke="' + stroke + '" stroke-width="1.5"/><circle cx="160" cy="45" r="20" fill="none" stroke="' + stroke + '" stroke-opacity="0.4"/></svg>',
      "negative-space": '<svg viewBox="0 0 200 140" aria-hidden="true"><rect width="200" height="140" fill="none" stroke="' + stroke + '" stroke-opacity="0.2"/><circle cx="100" cy="70" r="12" fill="' + accent + '"/></svg>',
      thirds: '<svg viewBox="0 0 200 140" aria-hidden="true"><line x1="66" y1="0" x2="66" y2="140" stroke="' + stroke + '" stroke-opacity="0.25"/><line x1="133" y1="0" x2="133" y2="140" stroke="' + stroke + '" stroke-opacity="0.25"/><line x1="0" y1="46" x2="200" y2="46" stroke="' + stroke + '" stroke-opacity="0.25"/><line x1="0" y1="93" x2="200" y2="93" stroke="' + stroke + '" stroke-opacity="0.25"/><circle cx="133" cy="46" r="8" fill="' + accent + '"/></svg>',
      layering: '<svg viewBox="0 0 200 140" aria-hidden="true"><rect x="0" y="100" width="200" height="40" fill="' + accent + '" opacity="0.3"/><rect x="20" y="60" width="160" height="50" fill="' + stroke + '" opacity="0.15"/><path d="M0 60 Q100 20 200 60" fill="none" stroke="' + stroke + '" stroke-opacity="0.4"/></svg>',
      compression: '<svg viewBox="0 0 200 140" aria-hidden="true"><rect x="30" y="40" width="20" height="60" fill="' + stroke + '" opacity="0.3"/><rect x="55" y="50" width="20" height="50" fill="' + stroke + '" opacity="0.4"/><rect x="80" y="55" width="20" height="45" fill="' + stroke + '" opacity="0.5"/><rect x="105" y="58" width="20" height="42" fill="' + stroke + '" opacity="0.6"/><rect x="130" y="60" width="20" height="40" fill="' + accent + '" opacity="0.7"/></svg>',
      framing: '<svg viewBox="0 0 200 140" aria-hidden="true"><path d="M40 20 Q20 70 40 120 M160 20 Q180 70 160 120 M40 20 Q100 5 160 20 M40 120 Q100 135 160 120" fill="none" stroke="' + stroke + '" stroke-width="2" opacity="0.5"/><rect x="75" y="55" width="50" height="35" fill="' + accent + '" opacity="0.6"/></svg>',
      patterns: '<svg viewBox="0 0 200 140" aria-hidden="true"><g opacity="0.5">' +
        [0, 1, 2, 3, 4].map(function (i) {
          return '<circle cx="' + (30 + i * 35) + '" cy="70" r="12" fill="' + stroke + '"/>';
        }).join("") + '</g><circle cx="135" cy="70" r="14" fill="' + accent + '"/></svg>',
      texture: '<svg viewBox="0 0 200 140" aria-hidden="true"><path d="M20 100 Q40 80 60 100 T100 100 T140 100 T180 100" fill="none" stroke="' + stroke + '" stroke-width="1"/><path d="M20 110 Q45 90 70 110 T120 110 T170 110" fill="none" stroke="' + accent + '" stroke-width="1.5"/></svg>',
      "light-direction": '<svg viewBox="0 0 200 140" aria-hidden="true"><circle cx="40" cy="35" r="18" fill="' + accent + '" opacity="0.8"/><line x1="55" y1="45" x2="120" y2="90" stroke="' + accent + '" stroke-width="1" stroke-dasharray="4"/><rect x="110" y="75" width="60" height="45" fill="' + stroke + '" opacity="0.25"/></svg>',
      color: '<svg viewBox="0 0 200 140" aria-hidden="true"><rect x="20" y="50" width="45" height="45" fill="#8B4513" opacity="0.7"/><rect x="75" y="50" width="45" height="45" fill="#CD853F" opacity="0.7"/><rect x="130" y="50" width="45" height="45" fill="#DAA520" opacity="0.7"/></svg>',
      weight: '<svg viewBox="0 0 200 140" aria-hidden="true"><circle cx="50" cy="90" r="35" fill="' + stroke + '" opacity="0.3"/><circle cx="155" cy="50" r="12" fill="' + accent + '"/></svg>',
      balance: '<svg viewBox="0 0 200 140" aria-hidden="true"><rect x="25" y="60" width="40" height="50" fill="' + stroke + '" opacity="0.35"/><rect x="135" y="70" width="35" height="35" fill="' + accent + '" opacity="0.6"/><line x1="100" y1="20" x2="100" y2="120" stroke="' + stroke + '" stroke-opacity="0.2"/></svg>',
      story: '<svg viewBox="0 0 200 140" aria-hidden="true"><path d="M30 110 L170 110" stroke="' + stroke + '" stroke-width="2" opacity="0.3"/><circle cx="60" cy="110" r="6" fill="' + accent + '"/><path d="M60 110 L120 70 L170 90" fill="none" stroke="' + accent + '" stroke-width="1.5" marker-end="url(#arr)"/></svg>',
      depth: '<svg viewBox="0 0 200 140" aria-hidden="true"><rect x="15" y="85" width="40" height="35" fill="' + accent + '" opacity="0.5"/><rect x="70" y="65" width="35" height="30" fill="' + stroke + '" opacity="0.25"/><rect x="120" y="45" width="30" height="25" fill="' + stroke + '" opacity="0.15"/></svg>',
      movement: '<svg viewBox="0 0 200 140" aria-hidden="true"><path d="M30 80 Q80 40 130 80 T200 80" fill="none" stroke="' + accent + '" stroke-width="2"/><path d="M50 95 Q100 55 150 95" fill="none" stroke="' + stroke + '" stroke-opacity="0.3" stroke-width="3"/></svg>'
    };
  }

  function renderConceptSection() {
    var concepts = global.PhotoCoachContent.getConcepts();
    var c = concepts[state.conceptIndex] || concepts[0];
    var U = util();
    var diags = diagrams();
    var svg = diags[c.diagram] || "";
    var progress = global.PhotoCoachProgress.stats(concepts.length);

    global.PhotoCoachProgress.markConceptViewed(c.id);

    return (
      '<section class="pc-section" id="coach" aria-labelledby="pc-coach-title">' +
        '<header class="pc-section__head">' +
          '<p class="wds-eyebrow">Photo Coach</p>' +
          '<h2 class="pc-section__title" id="pc-coach-title">One concept at a time</h2>' +
          '<p class="pc-section__lead">Short field guidance — study one idea, then go outside and look for it.</p>' +
        "</header>" +
        '<div class="pc-concept" data-concept-id="' + U.escapeHtml(c.id) + '">' +
          '<div class="pc-concept__body">' +
            '<h3 class="pc-concept__title">' + U.escapeHtml(c.title) + "</h3>" +
            '<p class="pc-concept__summary">' + U.escapeHtml(c.summary) + "</p>" +
            '<div class="pc-concept__why"><strong>Why it works</strong>' + U.escapeHtml(c.why) + "</div>" +
            '<p class="pc-concept__field"><strong>Field note:</strong> ' + U.escapeHtml(c.field) + "</p>" +
            '<div class="pc-concept__nav">' +
              '<button type="button" class="pc-btn" id="pc-concept-prev" aria-label="Previous concept">Previous</button>' +
              '<button type="button" class="pc-btn pc-btn--primary" id="pc-concept-studied">I studied this</button>' +
              '<button type="button" class="pc-btn" id="pc-concept-next" aria-label="Next concept">Next</button>' +
            "</div>" +
            '<p class="pc-concept__progress">' + progress.conceptsStudied + " studied · " + progress.conceptsViewed + " viewed · " + concepts.length + " total</p>" +
          "</div>" +
          '<div class="pc-diagram" aria-hidden="true">' + svg + "</div>" +
        "</div>" +
      "</section>"
    );
  }

  function renderChecklist() {
    var items = global.PhotoCoachContent.getChecklist();
    var U = util();
    var lis = items.map(function (item) {
      return (
        '<li class="pc-checklist__item">' +
          '<p class="pc-checklist__q">' + U.escapeHtml(item.q) + "</p>" +
          '<p class="pc-checklist__why">' + U.escapeHtml(item.why) + "</p>" +
        "</li>"
      );
    }).join("");
    return (
      '<section class="pc-section" id="checklist" aria-labelledby="pc-check-title">' +
        '<header class="pc-section__head">' +
          '<p class="wds-eyebrow">Field checklist</p>' +
          '<h2 class="pc-section__title" id="pc-check-title">Before you press the shutter</h2>' +
          '<p class="pc-section__lead">A quiet pause — not a test. Ask these questions; let the scene answer.</p>' +
        "</header>" +
        '<ul class="pc-checklist">' + lis + "</ul>" +
        '<p style="margin-top:1.5rem"><button type="button" class="pc-btn" id="pc-field-session">I went out today</button></p>' +
      "</section>"
    );
  }

  function renderEditing() {
    var topics = global.PhotoCoachContent.getEditing();
    var U = util();
    var blocks = topics.map(function (t) {
      return (
        '<article class="pc-topic">' +
          '<h3 class="pc-topic__name">' + U.escapeHtml(t.name) + "</h3>" +
          '<p class="pc-topic__philosophy">' + U.escapeHtml(t.philosophy) + "</p>" +
          '<p class="pc-topic__why"><strong>Why:</strong> ' + U.escapeHtml(t.why) + "</p>" +
        "</article>"
      );
    }).join("");
    return (
      '<section class="pc-section" id="editing" aria-labelledby="pc-edit-title">' +
        '<header class="pc-section__head">' +
          '<p class="wds-eyebrow">Editing coach</p>' +
          '<h2 class="pc-section__title" id="pc-edit-title">Editing philosophy</h2>' +
          '<p class="pc-section__lead">Understand why each control exists — not which preset to copy.</p>' +
        "</header>" + blocks +
      "</section>"
    );
  }

  function renderGear() {
    var gear = global.PhotoCoachContent.getGear();
    var U = util();
    var essentials = gear.essentials.map(function (e) {
      return (
        '<article class="pc-topic">' +
          '<h3 class="pc-topic__name">' + U.escapeHtml(e.name) + "</h3>" +
          '<p class="pc-topic__why">' + U.escapeHtml(e.tip) + "</p>" +
        "</article>"
      );
    }).join("");
    var camPoints = gear.camera.points.map(function (p) { return "<li>" + U.escapeHtml(p) + "</li>"; }).join("");
    var lensPoints = gear.lens.points.map(function (p) { return "<li>" + U.escapeHtml(p) + "</li>"; }).join("");
    return (
      '<section class="pc-section" id="gear" aria-labelledby="pc-gear-title">' +
        '<header class="pc-section__head">' +
          '<p class="wds-eyebrow">Gear knowledge</p>' +
          '<h2 class="pc-section__title" id="pc-gear-title">Your kit in the field</h2>' +
          '<p class="pc-section__lead">Built around your Sony a6700 and 18–135mm — the gear you carry today.</p>' +
        "</header>" +
        '<article class="pc-topic"><h3 class="pc-topic__name">' + U.escapeHtml(gear.camera.name) + "</h3>" +
          '<p class="pc-topic__philosophy">' + U.escapeHtml(gear.camera.body) + "</p><ul>" + camPoints + "</ul></article>" +
        '<article class="pc-topic"><h3 class="pc-topic__name">' + U.escapeHtml(gear.lens.name) + "</h3>" +
          '<p class="pc-topic__philosophy">' + U.escapeHtml(gear.lens.body) + "</p><ul>" + lensPoints + "</ul></article>" +
        essentials +
      "</section>"
    );
  }

  function renderProgress() {
    var concepts = global.PhotoCoachContent.getConcepts();
    var s = global.PhotoCoachProgress.stats(concepts.length);
    var U = util();
    return (
      '<section class="pc-section" id="progress" aria-labelledby="pc-prog-title">' +
        '<header class="pc-section__head">' +
          '<p class="wds-eyebrow">My progress</p>' +
          '<h2 class="pc-section__title" id="pc-prog-title">Growth, not scores</h2>' +
          '<p class="pc-section__lead">A private record on this device — no badges, streaks, or leaderboards.</p>' +
        "</header>" +
        '<div class="pc-progress-stats">' +
          '<div class="pc-stat"><p class="pc-stat__value">' + s.conceptsStudied + '</p><p class="pc-stat__label">Concepts studied</p></div>' +
          '<div class="pc-stat"><p class="pc-stat__value">' + s.conceptsViewed + '</p><p class="pc-stat__label">Concepts viewed</p></div>' +
          '<div class="pc-stat"><p class="pc-stat__value">' + s.fieldSessions + '</p><p class="pc-stat__label">Field sessions</p></div>' +
          '<div class="pc-stat"><p class="pc-stat__value">' + s.visitCount + '</p><p class="pc-stat__label">Visits</p></div>' +
        '</div>' +
        '<p class="pc-progress-note">Future sprints will add favorite images, places photographed, species, and conditions — all optional and local-first.</p>' +
      "</section>"
    );
  }

  function locationLabel(loc) {
    if (!loc) return "";
    var parts = [loc.city, loc.county || loc.name, loc.state || loc.stateCode].filter(Boolean);
    return parts.join(", ") || "Your region";
  }

  function renderAll() {
    var U = util();
    var loc = state.location;
    var ctx = {
      platform: state.platform,
      location: loc,
      photography: state.photography
    };

    var conditionsHtml = global.PhotoCoachConditions.render(ctx);
    var oppsHtml = global.PhotoCoachOpportunities.render(ctx);

    return (
      '<header class="pc-hero">' +
        '<p class="wds-eyebrow">Photo Coach</p>' +
        '<h1 class="pc-hero__title">My photography journey</h1>' +
        '<p class="pc-hero__lead">A quiet guide for learning to see — conditions, opportunities, composition, editing, and the gear in your pack. ' +
          (loc ? "Observing for <strong>" + U.escapeHtml(locationLabel(loc)) + "</strong>." : "") +
        "</p>" +
      "</header>" +
      '<section class="pc-section" id="conditions" aria-labelledby="pc-cond-title">' +
        '<header class="pc-section__head">' +
          '<p class="wds-eyebrow">Today</p>' +
          '<h2 class="pc-section__title" id="pc-cond-title">Photography conditions</h2>' +
          '<p class="pc-section__lead">Golden hour, fog, clouds, wind, and night — from live weather when available.</p>' +
        "</header>" + conditionsHtml +
      "</section>" +
      '<section class="pc-section" id="opportunities" aria-labelledby="pc-opp-title">' +
        '<header class="pc-section__head">' +
          '<p class="wds-eyebrow">Field</p>' +
          '<h2 class="pc-section__title" id="pc-opp-title">Photo opportunities</h2>' +
          '<p class="pc-section__lead">What today&apos;s light and season favor — with reasons, not hype.</p>' +
        "</header>" + oppsHtml +
      "</section>" +
      renderConceptSection() +
      renderChecklist() +
      renderEditing() +
      renderGear() +
      renderProgress()
    );
  }

  function bindEvents(mount) {
    var prev = mount.querySelector("#pc-concept-prev");
    var next = mount.querySelector("#pc-concept-next");
    var studied = mount.querySelector("#pc-concept-studied");
    var fieldBtn = mount.querySelector("#pc-field-session");
    var concepts = global.PhotoCoachContent.getConcepts();

    if (prev) {
      prev.addEventListener("click", function () {
        state.conceptIndex = (state.conceptIndex - 1 + concepts.length) % concepts.length;
        refreshSection(mount);
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        state.conceptIndex = (state.conceptIndex + 1) % concepts.length;
        refreshSection(mount);
      });
    }
    if (studied) {
      studied.addEventListener("click", function () {
        var c = concepts[state.conceptIndex];
        global.PhotoCoachProgress.markConceptStudied(c.id);
        state.conceptIndex = (state.conceptIndex + 1) % concepts.length;
        refreshSection(mount);
      });
    }
    if (fieldBtn) {
      fieldBtn.addEventListener("click", function () {
        global.PhotoCoachProgress.recordFieldSession();
        fieldBtn.textContent = "Recorded — thank you for going out";
        fieldBtn.disabled = true;
      });
    }
  }

  function refreshSection(mount) {
    mount.innerHTML = renderAll();
    mount.setAttribute("aria-busy", "false");
    bindEvents(mount);
  }

  function init(opts) {
    opts = opts || {};
    state.location = opts.location;
    state.platform = opts.platform;
    global.PhotoCoachProgress.recordVisit();

    var mount = document.getElementById("photo-coach-app");
    if (!mount) return Promise.resolve();

    var PC = global.PhotoCoachConditions;
    state.photography = PC && PC.photographyFromPlatform
      ? PC.photographyFromPlatform(state.platform)
      : null;
    refreshSection(mount);

    var Bridge = global.WDS && global.WDS.ecosystemBridge;
    if (Bridge && Bridge.save && state.platform) {
      Bridge.save(state.platform, state.location);
    }
    if (global.WDS && global.WDS.locationDebug && global.WDS.locationDebug.mount) {
      global.WDS.locationDebug.mount(state.location, state.platform, document.getElementById("photo-coach-app"));
    }
    return Promise.resolve(state);
  }

  function refresh(loc) {
    state.location = loc;
    var Boot = global.PhotoCoachBoot;
    if (!Boot) return Promise.resolve();
    return Boot.fetchPlatform(loc).then(function (pkg) {
      state.platform = pkg;
      return init({ location: loc, platform: pkg });
    });
  }

  global.PhotoCoachApp = {
    init: init,
    refresh: refresh
  };
})(window);
