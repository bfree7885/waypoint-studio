/**
 * Photographer Profile page UI — private living profile for Waypoint Scenes.
 * Coaching language only; no rankings, badges, or comparisons.
 */
(function (global) {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch (e) {
      return String(iso).slice(0, 10);
    }
  }

  function claimBadge(item) {
    if (!item) return "";
    var strength = item.claimStrength || "";
    var label = item.confidenceLabel || item.evidenceLabel || "";
    if (strength === "experimental") label = "Low-confidence experimentation";
    if (strength === "insufficient") label = "Not enough work analyzed yet";
    return (
      '<span class="pp-badge" data-strength="' +
      esc(strength) +
      '">' +
      esc(label) +
      "</span>"
    );
  }

  function evidenceLine(item) {
    if (!item) return "";
    return (
      '<p class="pp-evidence-line">' +
      esc(item.confidencePercent != null ? item.confidencePercent + "% confidence" : "—") +
      " · " +
      esc(item.supportingPhotos || 0) +
      " supporting photo" +
      ((item.supportingPhotos || 0) === 1 ? "" : "s") +
      " · " +
      esc(item.supportingShoots || 0) +
      " shoot" +
      ((item.supportingShoots || 0) === 1 ? "" : "s") +
      "</p>"
    );
  }

  function renderList(items, emptyText) {
    items = items || [];
    if (!items.length) {
      return '<p class="pp-empty">' + esc(emptyText) + "</p>";
    }
    return (
      '<ul class="pp-rank-list">' +
      items
        .map(function (item) {
          return (
            "<li>" +
            '<div class="pp-rank-list__head">' +
            "<strong>" +
            esc(item.label) +
            "</strong>" +
            claimBadge(item) +
            "</div>" +
            evidenceLine(item) +
            (item.note ? '<p class="pp-note">' + esc(item.note) + "</p>" : "") +
            "</li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderStyle(style) {
    if (!style) {
      return '<p class="pp-empty">Visual style will appear after more work is analyzed.</p>';
    }
    function block(title, arr) {
      var top = (arr || [])[0];
      if (!top) {
        return (
          '<div class="pp-style-block"><h3>' +
          esc(title) +
          '</h3><p class="pp-empty">Still forming</p></div>'
        );
      }
      return (
        '<div class="pp-style-block"><h3>' +
        esc(title) +
        '</h3><p class="pp-style-value">' +
        esc(top.label) +
        "</p>" +
        evidenceLine(top) +
        claimBadge(top) +
        "</div>"
      );
    }
    return (
      '<p class="pp-lede">' +
      esc(style.summary || "") +
      "</p>" +
      '<div class="pp-style-grid">' +
      block("Mood", style.mood) +
      block("Light", style.light) +
      block("Color", style.color) +
      block("Framing", style.framing) +
      block("Subject distance", style.subjectDistance) +
      block("Composition", style.composition) +
      "</div>"
    );
  }

  function renderGrowth(profile) {
    var growth = profile.recentGrowth || {};
    var trends = growth.trends || profile.recentImprovements || [];
    var html = '<p class="pp-lede">' + esc(growth.summary || "Growth trends will appear as shoots accumulate.") + "</p>";
    if (trends.length) {
      html +=
        '<ul class="pp-growth-list">' +
        trends
          .map(function (t) {
            return (
              "<li data-direction=\"" +
              esc(t.direction || "") +
              '"><strong>' +
              esc(t.theme) +
              "</strong> — " +
              esc(t.detail) +
              "</li>"
            );
          })
          .join("") +
        "</ul>";
    }
    return html;
  }

  function renderEvidence(profile) {
    var ev = profile.evidence || {};
    var range = ev.dateRange || {};
    return (
      '<dl class="pp-evidence-dl">' +
      "<div><dt>Photos analyzed</dt><dd>" +
      esc(ev.photoCount != null ? ev.photoCount : profile.photoCount || 0) +
      "</dd></div>" +
      "<div><dt>Shoots analyzed</dt><dd>" +
      esc(ev.shootCount != null ? ev.shootCount : profile.shootCount || 0) +
      "</dd></div>" +
      "<div><dt>Eligible for learning</dt><dd>" +
      esc(ev.eligiblePhotoCount || 0) +
      " photos · " +
      esc(ev.eligibleShootCount || 0) +
      " shoots</dd></div>" +
      "<div><dt>Date range</dt><dd>" +
      esc(fmtDate(range.start)) +
      " – " +
      esc(fmtDate(range.end)) +
      "</dd></div>" +
      "<div><dt>Evidence strength</dt><dd>" +
      esc(ev.confidenceLabel || "—") +
      "</dd></div>" +
      "<div><dt>Last profile update</dt><dd>" +
      esc(fmtDate(ev.lastProfileUpdate || profile.computedAt)) +
      "</dd></div>" +
      "</dl>"
    );
  }

  function renderControls() {
    var Repo = global.WaypointPhotoCoachRepository;
    if (!Repo) return "<p>Controls unavailable.</p>";
    var photos = Repo.PhotoRepository.list().slice(0, 40);
    var shoots = Repo.ShootRepository.list();

    var shootHtml =
      '<ul class="pp-control-list">' +
      shoots
        .map(function (s) {
          return (
            "<li data-shoot-id=\"" +
            esc(s.id) +
            '">' +
            "<div><strong>" +
            esc(s.id) +
            "</strong>" +
            '<span class="pp-muted"> · ' +
            esc(s.date || fmtDate(s.createdAt)) +
            " · " +
            esc(s.imageCount || 0) +
            " images</span></div>" +
            '<label><input type="checkbox" data-action="exclude-shoot" ' +
            (s.excludeFromProfile ? "checked " : "") +
            "/> Exclude from profile</label> " +
            '<label><input type="checkbox" data-action="experiment-shoot" ' +
            (s.isExperimentation ? "checked " : "") +
            "/> Mark as experimentation</label>" +
            "</li>"
          );
        })
        .join("") +
      "</ul>";

    var photoHtml =
      '<ul class="pp-control-list pp-control-list--photos">' +
      photos
        .map(function (p) {
          var subjects = (p.subjectCategories || []).join(", ") || "—";
          var corrected =
            p.userCorrections &&
            p.userCorrections.subjectCategories &&
            p.userCorrections.subjectCategories.length
              ? p.userCorrections.subjectCategories.join(", ")
              : "";
          return (
            "<li data-photo-uuid=\"" +
            esc(p.uuid) +
            '">' +
            "<div><strong>" +
            esc(p.originalFilename || p.uuid.slice(0, 8)) +
            "</strong>" +
            '<span class="pp-muted"> · AI: ' +
            esc(subjects) +
            (corrected ? " · corrected: " + esc(corrected) : "") +
            "</span></div>" +
            '<label><input type="checkbox" data-action="exclude-photo" ' +
            (p.excludeFromProfile ? "checked " : "") +
            "/> Exclude from learning</label>" +
            '<div class="pp-correct-row">' +
            '<input type="text" data-action="correct-subjects" placeholder="Correct subjects (comma-separated)" value="' +
            esc(corrected || "") +
            '" />' +
            '<button type="button" class="btn btn-secondary" data-action="apply-correction">Save correction</button>' +
            "</div>" +
            "</li>"
          );
        })
        .join("") +
      "</ul>";

    return (
      '<div class="pp-controls">' +
      "<h3>Shoots</h3>" +
      (shoots.length ? shootHtml : '<p class="pp-empty">No shoots stored yet.</p>') +
      "<h3>Recent photos</h3>" +
      (photos.length ? photoHtml : '<p class="pp-empty">No photos stored yet.</p>') +
      '<div class="pp-actions">' +
      '<button type="button" class="btn btn-primary" id="pp-recalculate">Recalculate profile</button>' +
      '<button type="button" class="btn btn-secondary" id="pp-reset-computed">Reset profile view</button>' +
      '<button type="button" class="btn btn-secondary" id="pp-reset-learning">Reset learning flags</button>' +
      '<button type="button" class="btn btn-secondary" id="pp-seed-demo">Load demo corpus</button>' +
      "</div>" +
      '<p class="pp-muted">Corrections influence future profile learning without deleting the original critique. Reset profile view clears computed fields only; reset learning flags clears exclusions, experimentation marks, and corrections.</p>' +
      "</div>"
    );
  }

  function renderYourCoaching(profile) {
    var Repo = global.WaypointPhotoCoachRepository;
    var Pers = global.WaypointPhotoCoachPersonalized;
    if (!Repo || !Pers) {
      return '<p class="pp-empty">Personalized coaching will appear after analyses accumulate.</p>';
    }
    var memory = Repo.CoachingRepository.list();
    var prefs = Repo.PreferencesRepository.load();
    var photos = Repo.PhotoRepository.list();
    var shoots = Repo.ShootRepository.list();
    var growth = Pers.detectGrowth(photos, shoots, { preferences: prefs });
    var focus = Pers.currentFocus(memory, prefs, profile);
    var outingRec = memory.filter(function (r) { return r.source === "outing"; })[0];
    var recent = memory.slice(0, 12);

    var focusHtml = focus.length
      ? '<ul class="pp-rank-list">' +
        focus
          .map(function (f) {
            return (
              "<li><div class=\"pp-rank-list__head\"><strong>" +
              esc(f.label) +
              "</strong>" +
              (f.ongoing
                ? '<span class="pp-badge" data-strength="early">Ongoing focus</span>'
                : "") +
              "</div>" +
              '<div class="pp-coach-actions">' +
              '<button type="button" class="btn btn-secondary" data-coach-action="hide" data-family="' +
              esc(f.family) +
              '">Hide theme</button> ' +
              '<button type="button" class="btn btn-secondary" data-coach-action="want-more" data-family="' +
              esc(f.family) +
              '">More guidance</button> ' +
              '<button type="button" class="btn btn-secondary" data-coach-action="intentional" data-family="' +
              esc(f.family) +
              '">This was intentional</button>' +
              "</div></li>"
            );
          })
          .join("") +
        "</ul>"
      : '<p class="pp-empty">No active coaching focus yet — analyze a shoot to begin.</p>';

    var progressHtml = "";
    if (!growth.available) {
      progressHtml =
        '<p class="pp-empty">' +
        esc(growth.confidenceLabel || "Not enough work analyzed yet") +
        " for growth claims.</p>";
    } else {
      progressHtml =
        '<ul class="pp-growth-list">' +
        growth.improvements
          .map(function (g) {
            return (
              '<li data-direction="improving"><strong>' +
              esc(g.area) +
              "</strong> — " +
              esc(g.explanation) +
              '<p class="pp-evidence-line">' +
              esc(g.confidencePercent) +
              "% · " +
              esc(g.confidenceLabel) +
              " · window " +
              esc(g.evidenceWindow.recentPhotos) +
              " recent / " +
              esc(g.evidenceWindow.earlyPhotos) +
              " earlier photos</p></li>"
            );
          })
          .join("") +
        "</ul>";
    }

    var outingHtml = outingRec
      ? "<p>" + esc(outingRec.recommendation) + "</p>" +
        (outingRec.wasRepeated
          ? '<p class="pp-muted">Continues an ongoing focus rather than a new assignment.</p>'
          : "")
      : '<p class="pp-empty">Finish a multi-photo shoot to receive a short next-outing suggestion.</p>';

    var historyHtml = recent.length
      ? '<ul class="pp-control-list">' +
        recent
          .map(function (r) {
            return (
              '<li data-coach-uuid="' +
              esc(r.uuid) +
              '">' +
              "<div><strong>" +
              esc(r.themeLabel || r.coachingTheme || "Coaching") +
              "</strong>" +
              '<span class="pp-muted"> · ' +
              esc(r.date || fmtDate(r.createdAt)) +
              (r.wasRepeated ? " · ongoing" : "") +
              (r.laterShowedImprovement ? " · later improvement noted" : "") +
              (r.userFeedback ? " · feedback: " + esc(r.userFeedback) : "") +
              "</span></div>" +
              "<p>" +
              esc(r.recommendation) +
              "</p>" +
              '<div class="pp-coach-actions">' +
              '<button type="button" class="btn btn-secondary" data-coach-action="helpful" data-uuid="' +
              esc(r.uuid) +
              '">Helpful</button> ' +
              '<button type="button" class="btn btn-secondary" data-coach-action="not-relevant" data-uuid="' +
              esc(r.uuid) +
              '">Not relevant</button> ' +
              '<button type="button" class="btn btn-secondary" data-coach-action="intentional-rec" data-uuid="' +
              esc(r.uuid) +
              '" data-family="' +
              esc(r.coachingTheme || "") +
              '">This was intentional</button>' +
              "</div></li>"
            );
          })
          .join("") +
        "</ul>"
      : '<p class="pp-empty">Coaching history will collect as you analyze photos.</p>';

    var hidden = prefs.hiddenThemes || [];
    var hiddenHtml = hidden.length
      ? "<p class=\"pp-muted\">Hidden themes:</p><ul class=\"pp-control-list\">" +
        hidden
          .map(function (f) {
            return (
              "<li>" +
              esc(Pers.familyLabel(f)) +
              ' <button type="button" class="btn btn-secondary" data-coach-action="restore" data-family="' +
              esc(f) +
              '">Restore</button></li>'
            );
          })
          .join("") +
        "</ul>"
      : "";

    return (
      '<h3>Current Focus</h3>' +
      focusHtml +
      "<h3>Recent Progress</h3>" +
      progressHtml +
      "<h3>Next Outing</h3>" +
      outingHtml +
      "<h3>Coaching History</h3>" +
      historyHtml +
      hiddenHtml +
      '<p class="pp-muted">Feedback shapes future coaching. Disagreement is welcome — it is not a failure.</p>'
    );
  }

  function renderProfile() {
    var Repo = global.WaypointPhotoCoachRepository;
    var mount = $("pp-mount");
    if (!mount || !Repo) return;

    var profile = Repo.ProfileRepository.load();
    if (!profile.computedAt && !profile.awaitingRecalculation && (profile.photoCount > 0 || Repo.PhotoRepository.count() > 0)) {
      profile = Repo.ProfileRepository.recalculate() || profile;
    }

    var direction = profile.currentDirection || {};
    var html = "";

    html +=
      '<p class="pp-privacy" role="note">Private by default · stored in this browser only · not a ranking or public identity</p>';

    html +=
      '<section class="pp-section" aria-labelledby="pp-direction">' +
      '<h2 id="pp-direction">Current Direction</h2>' +
      '<p class="pp-direction-summary">' +
      esc(direction.summary || "Analyze photos in Photo Coach to begin a living profile.") +
      "</p>" +
      (direction.confidencePercent != null
        ? evidenceLine(direction) + claimBadge(direction)
        : "") +
      "</section>";

    html +=
      '<section class="pp-section pp-section--coaching" aria-labelledby="pp-your-coaching">' +
      '<h2 id="pp-your-coaching">Your Coaching</h2>' +
      '<p class="pp-lede">An ongoing relationship with your work — not an isolated grade.</p>' +
      renderYourCoaching(profile) +
      "</section>";

    html +=
      '<section class="pp-section" aria-labelledby="pp-niches">' +
      '<h2 id="pp-niches">Likely Niches</h2>' +
      '<p class="pp-lede">Ranked by weighted evidence — not a competition.</p>' +
      renderList(profile.likelyNiches, "No niche tendencies yet.") +
      "</section>";

    html +=
      '<section class="pp-section" aria-labelledby="pp-style">' +
      '<h2 id="pp-style">Visual Style</h2>' +
      renderStyle(profile.visualStyle) +
      "</section>";

    html +=
      '<section class="pp-section" aria-labelledby="pp-strengths">' +
      '<h2 id="pp-strengths">Strengths</h2>' +
      '<p class="pp-lede">Areas that consistently show up across eligible work.</p>' +
      renderList(profile.strengths, "Strengths will appear as patterns repeat.") +
      "</section>";

    html +=
      '<section class="pp-section" aria-labelledby="pp-coaching">' +
      '<h2 id="pp-coaching">Coaching Themes</h2>' +
      '<p class="pp-lede">Recurring opportunities — framed as practice, not grades.</p>' +
      renderList(
        profile.recurringCoachingThemes,
        "Coaching themes will appear as improvements recur."
      ) +
      "</section>";

    html +=
      '<section class="pp-section" aria-labelledby="pp-growth">' +
      '<h2 id="pp-growth">Recent Growth</h2>' +
      renderGrowth(profile) +
      "</section>";

    html +=
      '<section class="pp-section" aria-labelledby="pp-evidence">' +
      '<h2 id="pp-evidence">Evidence</h2>' +
      renderEvidence(profile) +
      "</section>";

    html +=
      '<section class="pp-section" aria-labelledby="pp-manage">' +
      '<h2 id="pp-manage">Manage learning</h2>' +
      renderControls() +
      "</section>";

    mount.innerHTML = html;
    bindControls();
    bindCoachingControls();
  }

  function status(msg) {
    var el = $("pp-status");
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || "";
  }

  function bindCoachingControls() {
    var Repo = global.WaypointPhotoCoachRepository;
    if (!Repo || !Repo.PreferencesRepository) return;
    var mount = $("pp-mount");
    if (!mount) return;

    mount.querySelectorAll("[data-coach-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.getAttribute("data-coach-action");
        var family = btn.getAttribute("data-family");
        var uuid = btn.getAttribute("data-uuid");

        if (action === "hide" && family) {
          Repo.PreferencesRepository.hideTheme(family);
          status("Theme hidden from future coaching.");
        } else if (action === "restore" && family) {
          Repo.PreferencesRepository.restoreTheme(family);
          status("Theme restored.");
        } else if (action === "want-more" && family) {
          Repo.PreferencesRepository.wantMore(family);
          status("Will offer more guidance on this theme.");
        } else if (action === "intentional" && family) {
          Repo.PreferencesRepository.markIntentional(family);
          status("Marked as intentional — future coaching will treat it as style, not a flaw.");
        } else if (action === "helpful" && uuid) {
          Repo.CoachingRepository.setFeedback(uuid, "helpful");
          status("Thanks — marked helpful.");
        } else if (action === "not-relevant" && uuid) {
          Repo.CoachingRepository.setFeedback(uuid, "not_relevant");
          status("Noted as not relevant. Disagreement is welcome.");
        } else if (action === "intentional-rec" && uuid) {
          Repo.CoachingRepository.setFeedback(uuid, "intentional");
          if (family) Repo.PreferencesRepository.markIntentional(family);
          status("Marked intentional. Future coaching will adapt.");
        }
        renderProfile();
      });
    });
  }

  function bindControls() {
    var Repo = global.WaypointPhotoCoachRepository;
    var Demo = global.WaypointPhotoCoachProfileDemo;
    if (!Repo) return;

    var mount = $("pp-mount");
    if (!mount) return;

    mount.querySelectorAll('[data-action="exclude-shoot"]').forEach(function (input) {
      input.addEventListener("change", function () {
        var li = input.closest("[data-shoot-id]");
        if (!li) return;
        Repo.ShootRepository.setExcluded(li.getAttribute("data-shoot-id"), input.checked);
        Repo.ProfileRepository.recalculate();
        renderProfile();
        status("Shoot exclusion updated. Profile recalculated.");
      });
    });

    mount.querySelectorAll('[data-action="experiment-shoot"]').forEach(function (input) {
      input.addEventListener("change", function () {
        var li = input.closest("[data-shoot-id]");
        if (!li) return;
        Repo.ShootRepository.setExperimentation(li.getAttribute("data-shoot-id"), input.checked);
        Repo.ProfileRepository.recalculate();
        renderProfile();
        status("Experimentation flag updated. Profile recalculated.");
      });
    });

    mount.querySelectorAll('[data-action="exclude-photo"]').forEach(function (input) {
      input.addEventListener("change", function () {
        var li = input.closest("[data-photo-uuid]");
        if (!li) return;
        Repo.PhotoRepository.setExcluded(li.getAttribute("data-photo-uuid"), input.checked);
        Repo.ProfileRepository.recalculate();
        renderProfile();
        status("Photo exclusion updated. Profile recalculated.");
      });
    });

    mount.querySelectorAll('[data-action="apply-correction"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        var li = btn.closest("[data-photo-uuid]");
        if (!li) return;
        var input = li.querySelector('[data-action="correct-subjects"]');
        var raw = input ? input.value : "";
        var subjects = String(raw)
          .split(",")
          .map(function (s) { return s.trim(); })
          .filter(Boolean);
        var uuid = li.getAttribute("data-photo-uuid");
        if (!subjects.length) {
          Repo.PhotoRepository.clearCorrections(uuid);
        } else {
          Repo.PhotoRepository.correctSubjects(uuid, subjects, subjects[0]);
        }
        Repo.ProfileRepository.recalculate();
        renderProfile();
        status("Subject correction saved. Original critique preserved.");
      });
    });

    var recalc = $("pp-recalculate");
    if (recalc) {
      recalc.addEventListener("click", function () {
        Repo.ProfileRepository.recalculate();
        renderProfile();
        status("Profile recalculated from eligible photos and shoots.");
      });
    }

    var resetView = $("pp-reset-computed");
    if (resetView) {
      resetView.addEventListener("click", function () {
        if (!global.confirm("Clear the computed profile view? Photos and critiques stay intact.")) {
          return;
        }
        Repo.ProfileRepository.resetComputed();
        renderProfile();
        status("Computed profile cleared.");
      });
    }

    var resetLearn = $("pp-reset-learning");
    if (resetLearn) {
      resetLearn.addEventListener("click", function () {
        if (
          !global.confirm(
            "Clear exclusions, experimentation flags, and subject corrections? Critiques stay intact."
          )
        ) {
          return;
        }
        Repo.ProfileRepository.resetLearning();
        Repo.ProfileRepository.recalculate();
        renderProfile();
        status("Learning flags reset. Profile recalculated.");
      });
    }

    var seed = $("pp-seed-demo");
    if (seed && Demo) {
      seed.addEventListener("click", function () {
        if (
          !global.confirm(
            "Replace growth photo/shoot stores with the woodland-detail demo corpus?"
          )
        ) {
          return;
        }
        var result = Demo.seedDemoProfile({ replace: true });
        renderProfile();
        status(
          result.ok
            ? "Demo corpus loaded (" +
                result.corpus.meta.totalPhotos +
                " photos, " +
                result.corpus.meta.totalShoots +
                " shoots)."
            : "Demo seed failed."
        );
      });
    }
  }

  function init() {
    renderProfile();
  }

  global.WaypointPhotoCoachProfilePage = {
    init: init,
    render: renderProfile
  };
})(window);
