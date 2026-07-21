/**
 * Waypoint’s Take — reusable presentation pattern for interpretation surfaces.
 * Does not invent data: callers supply body text or a restrained empty state.
 *
 * Mount: WDS.take.mount(el, { body, meta, sources, surface })
 * Empty: WDS.take.restrained(el, { reason, surface })
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function mount(el, opts) {
    if (!el) return null;
    opts = opts || {};
    var body = opts.body || opts.text || "";
    var meta = opts.meta || "Interpretation · not a score · uncertainty welcome";
    var sources = opts.sources || [];
    var surface = opts.surface || el.getAttribute("data-take-surface") || "general";

    if (!body) {
      return restrained(el, {
        reason: opts.emptyReason || "Not enough local signals yet for a Take.",
        surface: surface,
        meta: meta
      });
    }

    var sourceHtml = "";
    if (sources.length) {
      sourceHtml =
        '<p class="wds-take__sources">' +
        sources
          .map(function (s) {
            if (typeof s === "string") return esc(s);
            if (s && s.href) {
              return '<a href="' + esc(s.href) + '">' + esc(s.label || s.href) + "</a>";
            }
            return esc((s && s.label) || "");
          })
          .filter(Boolean)
          .join(" · ") +
        "</p>";
    }

    el.className = (el.className || "").replace(/\bwds-take\b/g, "").trim() + " wds-take";
    el.setAttribute("data-take-surface", surface);
    el.setAttribute("data-take-kind", "interpretation");
    el.innerHTML =
      '<p class="wds-take__body">' +
      esc(body) +
      "</p>" +
      '<p class="wds-take__meta">' +
      esc(meta) +
      "</p>" +
      sourceHtml;
    return el;
  }

  function restrained(el, opts) {
    if (!el) return null;
    opts = opts || {};
    var reason =
      opts.reason ||
      "Conditions are incomplete here — we will not invent a Take.";
    el.className = (el.className || "").replace(/\bwds-take\b/g, "").trim() + " wds-take wds-take--restrained";
    el.setAttribute("data-take-surface", opts.surface || "general");
    el.setAttribute("data-take-kind", "restrained");
    el.innerHTML =
      '<p class="wds-take__body">' +
      esc(reason) +
      "</p>" +
      '<p class="wds-take__meta">' +
      esc(opts.meta || "Honest pause · observation without fabrication") +
      "</p>";
    return el;
  }

  /** Homepage default — product orientation, not fabricated weather. */
  function homepageDefault() {
    return {
      body:
        "Start with conditions, then craft, then care for place. Dashboard explains today’s outdoors; Scenes deepens photography judgment; Sheds teaches field reading; Volunteer asks what good you can do nearby.",
      meta: "Interpretation · not a score · uncertainty welcome",
      sources: [
        { label: "Dashboard", href: "apps/dashboard/" },
        { label: "Articles", href: "articles/" }
      ]
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.take = {
    mount: mount,
    restrained: restrained,
    homepageDefault: homepageDefault
  };
})(typeof window !== "undefined" ? window : globalThis);
