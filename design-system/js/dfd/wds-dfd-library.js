/**
 * Deep Forest Dispatch — library grid from catalog.json
 */
(function (global) {
  "use strict";
  global.WDS = global.WDS || {};
  global.WDS.dfd = global.WDS.dfd || {};

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function assetUrl(relFromRepoRoot) {
    // Library page is /deep-forest-dispatch/ → one level below repo root
    return "../" + String(relFromRepoRoot || "").replace(/^\.\//, "");
  }

  function renderCard(story) {
    var href = story.path;
    var img = assetUrl(story.heroImage);
    return (
      "<li>" +
      '<a class="dfd-card" href="' +
      href +
      '" data-dfd-track="DFD_RELATED_STORY_CLICK" data-dfd-track-detail=\'' +
      JSON.stringify({ from: "library", slug: story.slug }) +
      "'>" +
      '<div class="dfd-card__media"><img src="' +
      img +
      '" alt="' +
      escapeHtml(story.heroAlt || "") +
      '" loading="lazy" width="800" height="550"></div>' +
      '<h2 class="dfd-card__title">' +
      escapeHtml(story.title) +
      "</h2>" +
      '<p class="dfd-card__loc">' +
      escapeHtml(story.cardLocation || story.subtitle || "") +
      "</p>" +
      "</a></li>"
    );
  }

  async function mount(el, opts) {
    opts = opts || {};
    var dataUrl = opts.dataUrl || "../data/deep-forest-dispatch/catalog.json";
    el.setAttribute("aria-busy", "true");
    try {
      var res = await fetch(dataUrl, { credentials: "same-origin" });
      if (!res.ok) throw new Error("catalog " + res.status);
      var catalog = await res.json();
      var stories = (catalog.stories || []).filter(function (s) {
        return s.status === "published";
      });
      if (!stories.length) {
        el.innerHTML =
          '<p class="wds-honesty" role="status">Stories will appear here as Deep Forest Dispatch publishes them.</p>';
      } else {
        el.innerHTML =
          '<ul class="dfd-grid">' +
          stories.map(renderCard).join("") +
          "</ul>";
      }
      if (global.WDS.dfd.analytics) {
        global.WDS.dfd.analytics.track(global.WDS.dfd.analytics.events.LIBRARY_VIEW, {
          count: stories.length
        });
        global.WDS.dfd.analytics.bindClicks(el);
      }
    } catch (err) {
      el.innerHTML =
        '<p class="wds-honesty" role="alert">The Deep Forest Dispatch library could not load right now.</p>';
    } finally {
      el.removeAttribute("aria-busy");
    }
  }

  global.WDS.dfd.library = { mount: mount };
})(typeof window !== "undefined" ? window : globalThis);
