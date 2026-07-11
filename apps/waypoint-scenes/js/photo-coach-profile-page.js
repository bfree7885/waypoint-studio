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
  }

  function status(msg) {
    var el = $("pp-status");
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || "";
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
