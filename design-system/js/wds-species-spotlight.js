/**
 * Waypoint Studio — Species spotlight educational module
 * Rotation-ready resolver + rich field-guide layout. Editorial content only — never fake live updates.
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

  function formatWeekOf(iso) {
    if (!iso) return "";
    try {
      var parts = iso.split("-");
      if (parts.length !== 3) return iso;
      var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch (e) {
      return iso;
    }
  }

  function resolveAsset(path, base) {
    if (!path) return "";
    if (/^https?:\/\//.test(path) || path.charAt(0) === "/") return path;
    if (base) return base.replace(/\/?$/, "/") + "regions/" + path.replace(/^\.\//, "");
    return path;
  }

  /**
   * Pick the featured species from bundle data.
   * Supports: entries[] + rotation.featuredId | rotation.featuredIndex | legacy flat object.
   */
  function resolveFeatured(data, options) {
    options = options || {};
    var block = data && data.speciesSpotlight;
    if (!block) {
      return { species: null, rotation: null, weekOf: data && data.weekOf, queueSize: 0 };
    }

    var rotation = block.rotation || null;
    var entries = block.entries || block.queue;
    var species = null;
    var queueSize = 0;

    if (entries && entries.length) {
      queueSize = entries.length;
      var featuredId = options.featuredId || (rotation && rotation.featuredId);
      if (featuredId) {
        species = entries.find(function (e) { return e.id === featuredId; }) || null;
      }
      if (!species && rotation && typeof rotation.featuredIndex === "number") {
        species = entries[rotation.featuredIndex] || null;
      }
      if (!species) species = entries[0];
    } else if (block.featured && block.featured.commonName) {
      species = block.featured;
    } else if (block.commonName || block.scientificName) {
      species = block;
    }

    return {
      species: species,
      rotation: rotation,
      weekOf: options.weekOf || data.weekOf || block.weekOf || (species && species.weekOf),
      queueSize: queueSize
    };
  }

  function renderIdentificationList(marks) {
    if (!marks || !marks.length) return "";
    if (typeof marks === "string") {
      return '<p class="wss-module__ident-text">' + escapeHtml(marks) + "</p>";
    }
    return (
      "<ul class=\"wss-module__ident-list\">" +
        marks.map(function (m) {
          return "<li>" + escapeHtml(m) + "</li>";
        }).join("") +
      "</ul>"
    );
  }

  function renderField(label, value) {
    if (!value) return "";
    return (
      '<div class="wss-module__field">' +
        '<h4 class="wss-module__field-label">' + escapeHtml(label) + "</h4>" +
        '<p class="wss-module__field-value">' + escapeHtml(value) + "</p>" +
      "</div>"
    );
  }

  function renderMedia(sp, options) {
    options = options || {};
    var image = sp.image || {};
    var src = resolveAsset(image.src, options.assetBase);
    var alt = image.alt || sp.commonName || "Species photograph";
    var caption = image.caption || sp.title || "";

    var visual = src
      ? '<img class="wss-module__image" src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '">'
      : (
        '<div class="wss-module__image wss-module__image--placeholder" role="img" aria-label="' + escapeHtml(alt) + '">' +
          '<span class="wss-module__image-badge">Species photograph · placeholder</span>' +
        "</div>"
      );

    return (
      '<figure class="wss-module__figure">' +
        visual +
        (caption ? "<figcaption class=\"wss-module__caption\">" + escapeHtml(caption) + "</figcaption>" : "") +
      "</figure>"
    );
  }

  function renderDisclosure(resolved) {
    var rotation = resolved.rotation || {};
    var weekOf = resolved.weekOf;
    var mode = rotation.mode || "editorial";
    var custom = rotation.disclosure;

    var line = custom;
    if (!line) {
      line = "Seasonal educational content";
      if (weekOf) line += " for week of " + formatWeekOf(weekOf);
      line += " — not a live species report or harvest alert.";
    }

    var RI = global.WDS && global.WDS.researchIntegrity;
    if (RI && RI.renderDisclaimer) {
      return (
        '<div class="wss-module__disclosure" role="note">' +
          RI.renderDisclaimer({ provenance: mode === "editorial" ? "educational" : mode, text: line, showBadge: true }) +
          (resolved.queueSize > 1
            ? '<p class="wss-module__disclosure-queue">' + escapeHtml(String(resolved.queueSize)) + " species in rotation queue · automatic cycling not enabled</p>"
            : "") +
        "</div>"
      );
    }

    var modeLabel = mode === "editorial" ? "Editorial spotlight" : escapeHtml(mode);

    return (
      '<div class="wss-module__disclosure" role="note">' +
        '<span class="wss-module__disclosure-tag">' + modeLabel + "</span>" +
        '<p class="wss-module__disclosure-text">' + escapeHtml(line) + "</p>" +
        (resolved.queueSize > 1
          ? '<p class="wss-module__disclosure-queue">' + escapeHtml(String(resolved.queueSize)) + " species in rotation queue · automatic cycling not enabled</p>"
          : "") +
      "</div>"
    );
  }

  function learnMoreHref(sp) {
    if (sp.learnMore && sp.learnMore.href) return sp.learnMore;
    if (sp.profileHref) {
      return { href: sp.profileHref, label: sp.profileLabel || "Learn more" };
    }
    return null;
  }

  /**
   * @param {object} resolved — output of resolveFeatured()
   * @param {object} options — { assetBase, showDisclosure }
   */
  function renderModule(resolved, options) {
    options = options || {};
    var sp = resolved && resolved.species;
    if (!sp) return "";

    var marks = sp.identification || sp.fieldMarks || [];
    var whereToLook = sp.whereToLook || sp.where || "";
    var conservation = sp.conservationNote || sp.conservation || sp.ethics || "";
    var ecology = sp.ecologicalRole || sp.ecology || "";
    var observeTips = sp.observationTips || sp.observeTips || [];
    var why = sp.whyThisWeek || sp.summary || "";
    var label = sp.spotlightLabel || "Species spotlight";
    var learn = learnMoreHref(sp);

    var lookalikes = sp.lookAlikes
      ? '<p class="wss-module__lookalikes"><strong>Look-alikes:</strong> ' + escapeHtml(sp.lookAlikes) + "</p>"
      : "";

    return (
      '<article class="wss-module" aria-labelledby="wss-species-name">' +
        '<header class="wss-module__header">' +
          '<p class="wss-module__eyebrow">' + escapeHtml(label) + "</p>" +
          (options.showDisclosure !== false ? renderDisclosure(resolved) : "") +
          '<h3 class="wss-module__name" id="wss-species-name">' + escapeHtml(sp.commonName || sp.title) + "</h3>" +
          (sp.scientificName ? '<p class="wss-module__sci"><em>' + escapeHtml(sp.scientificName) + "</em></p>" : "") +
          (sp.title && sp.commonName && sp.title !== sp.commonName
            ? '<p class="wss-module__hook">' + escapeHtml(sp.title) + "</p>"
            : "") +
        "</header>" +
        '<div class="wss-module__layout">' +
          renderMedia(sp, options) +
          '<div class="wss-module__body">' +
            '<section class="wss-module__section" aria-labelledby="wss-ident-heading">' +
              '<h4 class="wss-module__section-title" id="wss-ident-heading">Identification</h4>' +
              renderIdentificationList(marks) +
              lookalikes +
            "</section>" +
            '<div class="wss-module__fields">' +
              renderField("Habitat", sp.habitat) +
              renderField("Timing", sp.timing) +
              renderField("Where to look", whereToLook) +
            "</div>" +
            (why
              ? '<section class="wss-module__why" aria-labelledby="wss-why-heading">' +
                  '<h4 class="wss-module__section-title" id="wss-why-heading">Why it matters this week</h4>' +
                  "<p>" + escapeHtml(why) + "</p>" +
                "</section>"
              : "") +
            (ecology
              ? '<section class="wss-module__ecology" aria-labelledby="wss-eco-heading">' +
                  '<h4 class="wss-module__section-title" id="wss-eco-heading">Ecological role</h4>' +
                  "<p>" + escapeHtml(ecology) + "</p>" +
                "</section>"
              : "") +
            (observeTips && observeTips.length
              ? '<section class="wss-module__observe" aria-labelledby="wss-obs-heading">' +
                  '<h4 class="wss-module__section-title" id="wss-obs-heading">Observation tips</h4>' +
                  "<ul class=\"wss-module__observe-list\">" +
                    observeTips.map(function (tip) { return "<li>" + escapeHtml(tip) + "</li>"; }).join("") +
                  "</ul>" +
                "</section>"
              : "") +
            (conservation
              ? '<section class="wss-module__conservation" aria-labelledby="wss-conserve-heading">' +
                  '<h4 class="wss-module__section-title" id="wss-conserve-heading">Conservation note</h4>' +
                  "<p>" + escapeHtml(conservation) + "</p>" +
                "</section>"
              : "") +
            (learn
              ? '<footer class="wss-module__foot">' +
                  '<a class="wds-btn wds-btn--secondary wss-module__cta" href="' + escapeHtml(learn.href) + '">' +
                    escapeHtml(learn.label || "Learn more") +
                  "</a>" +
                "</footer>"
              : "") +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  /** @deprecated Use renderModule(resolveFeatured(...)) */
  function renderCard(sp, options) {
    return renderModule({
      species: sp,
      rotation: null,
      weekOf: options && options.weekOf,
      queueSize: 0
    }, options);
  }

  global.WDS = global.WDS || {};
  global.WDS.speciesSpotlight = {
    resolveFeatured: resolveFeatured,
    renderModule: renderModule,
    renderCard: renderCard,
    renderMedia: renderMedia,
    formatWeekOf: formatWeekOf
  };
})(typeof window !== "undefined" ? window : global);
