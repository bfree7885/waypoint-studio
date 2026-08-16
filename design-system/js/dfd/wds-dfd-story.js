/**
 * Deep Forest Dispatch — story page enhancements
 * (compare slider, analytics, related cards from catalog)
 */
(function (global) {
  "use strict";
  global.WDS = global.WDS || {};
  global.WDS.dfd = global.WDS.dfd || {};

  function initCompare(root) {
    root.querySelectorAll("[data-dfd-compare]").forEach(function (el) {
      var range = el.querySelector(".dfd-compare__range");
      var wrap = el.querySelector(".dfd-compare__after-wrap");
      var handle = el.querySelector(".dfd-compare__handle");
      var stage = el.querySelector(".dfd-compare__stage");
      if (!range || !wrap || !stage) return;
      function syncWidth() {
        stage.style.setProperty("--dfd-compare-stage-w", stage.clientWidth + "px");
      }
      function apply(v) {
        var pct = Math.max(0, Math.min(100, Number(v)));
        wrap.style.width = pct + "%";
        if (handle) handle.style.left = pct + "%";
      }
      syncWidth();
      apply(range.value || 50);
      range.addEventListener("input", function () {
        apply(range.value);
      });
      if (global.ResizeObserver) {
        new ResizeObserver(syncWidth).observe(stage);
      } else {
        global.addEventListener("resize", syncWidth);
      }
    });
  }

  function initVideoAnalytics(root, slug) {
    var iframe = root.querySelector(".dfd-video__frame iframe");
    if (!iframe || !global.WDS.dfd.analytics) return;
    // Reliable play detection needs YouTube API; approximate with focus/click on frame.
    iframe.addEventListener("load", function () {
      /* ready */
    });
    var frame = root.querySelector(".dfd-video__frame");
    if (frame) {
      frame.addEventListener(
        "pointerdown",
        function () {
          global.WDS.dfd.analytics.track(global.WDS.dfd.analytics.events.VIDEO_PLAY, { slug: slug, method: "pointer" });
        },
        { once: true }
      );
    }
  }

  async function mountRelated(el, opts) {
    if (!el) return;
    opts = opts || {};
    var related = opts.related || [];
    if (!related.length) {
      el.hidden = true;
      return;
    }
    try {
      var res = await fetch(opts.catalogUrl || "../../../data/deep-forest-dispatch/catalog.json");
      if (!res.ok) throw new Error("catalog");
      var catalog = await res.json();
      var bySlug = {};
      (catalog.stories || []).forEach(function (s) {
        bySlug[s.slug] = s;
      });
      var html = related
        .map(function (slug) {
          var s = bySlug[slug];
          if (!s) return "";
          var img = "../../../" + String(s.heroImage || "").replace(/^\.\.\//, "");
          return (
            "<li><a href=\"../" +
            s.slug +
            "/\" data-dfd-track=\"DFD_RELATED_STORY_CLICK\" data-dfd-track-detail='" +
            JSON.stringify({ from: opts.slug, to: s.slug }) +
            "'>" +
            '<div class="dfd-related__media"><img src="' +
            img +
            '" alt="" loading="lazy"></div>' +
            "<strong>" +
            escapeHtml(s.title) +
            "</strong><span>" +
            escapeHtml(s.cardLocation || s.subtitle || "") +
            "</span></a></li>"
          );
        })
        .join("");
      el.querySelector("[data-dfd-related-list]").innerHTML = html || "";
      if (!html) el.hidden = true;
    } catch (_) {
      el.hidden = true;
    }
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function boot(opts) {
    opts = opts || {};
    var root = opts.root || document;
    var slug = opts.slug || document.documentElement.getAttribute("data-dfd-slug") || "";
    initCompare(root);
    initVideoAnalytics(root, slug);
    if (global.WDS.dfd.analytics) {
      global.WDS.dfd.analytics.track(global.WDS.dfd.analytics.events.STORY_VIEW, { slug: slug });
      global.WDS.dfd.analytics.bindClicks(root);
    }
    var relatedHost = root.querySelector("[data-dfd-related]");
    if (relatedHost) {
      var related = [];
      try {
        related = JSON.parse(relatedHost.getAttribute("data-related") || "[]");
      } catch (_) {}
      mountRelated(relatedHost, {
        related: related,
        slug: slug,
        catalogUrl: opts.catalogUrl
      });
    }
  }

  global.WDS.dfd.story = { boot: boot, initCompare: initCompare };
})(typeof window !== "undefined" ? window : globalThis);
