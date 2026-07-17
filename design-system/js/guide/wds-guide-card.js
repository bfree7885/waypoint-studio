/**
 * Waypoint Guide Card — presentation helper for the Guide Pattern.
 * What we're seeing → Why it matters → Worth noticing → If you're curious
 * @see docs/WAYPOINT-GUIDE-EXPERIENCE.md
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeLinks(items) {
    if (!items || !items.length) return [];
    return items
      .map(function (item) {
        if (item == null) return null;
        if (typeof item === "string") return { label: item, href: null };
        var label = item.label || item.title || item.text;
        if (!label) return null;
        return { label: String(label), href: item.href || item.url || null };
      })
      .filter(Boolean);
  }

  /**
   * @param {object} opts
   * @param {string} [opts.seeing] — What we're seeing
   * @param {string} [opts.why] — Why it matters
   * @param {string} [opts.noticing] — Worth noticing (primary observation)
   * @param {string} [opts.uncertainty] — Optional uncertainty note
   * @param {Array<string|{label,href}>} [opts.curious] — If you're curious links/notes
   * @param {string} [opts.safety] — Direct safety/legal line (kept imperative)
   * @param {boolean} [opts.inset] — Slightly framed variant
   * @param {string} [opts.id] — Optional id on root
   */
  function render(opts) {
    opts = opts || {};
    var noticing = opts.noticing || opts.worthNoticing || "";
    var seeing = opts.seeing || opts.whatWereSeeing || opts.whatWeAreSeeing || "";
    var why = opts.why || opts.whyItMatters || "";
    var curious = normalizeLinks(opts.curious || opts.ifCurious || opts.related);
    var uncertainty = opts.uncertainty || "";
    var safety = opts.safety || "";
    var inset = !!opts.inset;
    var idAttr = opts.id ? ' id="' + escapeHtml(opts.id) + '"' : "";

    if (!noticing && !seeing && !why && !curious.length && !safety) return "";

    var parts = [];
    parts.push(
      '<article class="wds-guide-card' +
        (inset ? " wds-guide-card--inset" : "") +
        '" data-wds-guide-card' +
        idAttr +
        ">"
    );

    if (seeing) {
      parts.push(
        '<section class="wds-guide-card__section" data-guide-beat="seeing">' +
          '<p class="wds-guide-card__eyebrow">What we\'re seeing</p>' +
          '<p class="wds-guide-card__body wds-guide-card__body--lead">' +
          escapeHtml(seeing) +
          "</p>" +
          "</section>"
      );
    }

    if (noticing) {
      parts.push(
        '<section class="wds-guide-card__section" data-guide-beat="noticing">' +
          '<p class="wds-guide-card__eyebrow">Worth noticing</p>' +
          '<h3 class="wds-guide-card__title">' +
          escapeHtml(noticing) +
          "</h3>" +
          (uncertainty
            ? '<p class="wds-guide-card__uncertainty">' + escapeHtml(uncertainty) + "</p>"
            : "") +
          "</section>"
      );
    } else if (uncertainty) {
      parts.push('<p class="wds-guide-card__uncertainty">' + escapeHtml(uncertainty) + "</p>");
    }

    if (why) {
      parts.push(
        '<section class="wds-guide-card__section" data-guide-beat="why">' +
          '<p class="wds-guide-card__eyebrow">Why it matters</p>' +
          '<p class="wds-guide-card__body">' +
          escapeHtml(why) +
          "</p>" +
          "</section>"
      );
    }

    if (curious.length) {
      parts.push(
        '<section class="wds-guide-card__section" data-guide-beat="curious">' +
          '<p class="wds-guide-card__eyebrow">If you\'re curious</p>' +
          '<ul class="wds-guide-card__list">' +
          curious
            .map(function (c) {
              if (c.href) {
                return (
                  "<li><a href=\"" +
                  escapeHtml(c.href) +
                  '">' +
                  escapeHtml(c.label) +
                  "</a></li>"
                );
              }
              return "<li><span>" + escapeHtml(c.label) + "</span></li>";
            })
            .join("") +
          "</ul></section>"
      );
    }

    if (safety) {
      parts.push('<p class="wds-guide-card__safety" role="note">' + escapeHtml(safety) + "</p>");
    }

    parts.push("</article>");
    return parts.join("");
  }

  /**
   * Linear stack: seeing → why → noticing → curious (same content model).
   */
  function renderStack(opts) {
    var html = render(opts);
    if (!html) return "";
    return html.replace('class="wds-guide-card', 'class="wds-guide-card wds-guide-stack');
  }

  global.WDS = global.WDS || {};
  global.WDS.guideCard = {
    version: "1.0.0",
    render: render,
    renderStack: renderStack,
    docPath: "docs/WAYPOINT-GUIDE-EXPERIENCE.md"
  };
})(typeof window !== "undefined" ? window : globalThis);
