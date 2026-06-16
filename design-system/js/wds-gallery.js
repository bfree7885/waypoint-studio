/**
 * Waypoint Studio Design System — Gallery
 * Shared masonry gallery, filters, and collection headers.
 */
(function (global) {
  "use strict";

  var edu = null;

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderCollectionHeader(options) {
    options = options || {};
    return (
      '<header class="wds-collection-header">' +
        '<div class="wds-collection-rule" aria-hidden="true"></div>' +
        (options.eyebrow ? '<p class="wds-eyebrow">' + escapeHtml(options.eyebrow) + "</p>" : "") +
        "<h2 class=\"wds-display-lg\">" + escapeHtml(options.title || "") + "</h2>" +
        (options.lead ? '<p class="wds-lead">' + escapeHtml(options.lead) + "</p>" : "") +
      "</header>"
    );
  }

  function renderFilters(categories, activeId, options) {
    options = options || {};
    var chipClass = options.chipClass || "wds-chip";
    var list = categories.slice();
    if (options.includeAll) {
      list.unshift({ id: "all", label: options.allLabel || "All" });
    }
    var html = "";
    list.forEach(function (cat) {
      var id = cat.id || cat;
      var label = cat.label || cat;
      var on = id === activeId;
      html +=
        '<button type="button" class="' + chipClass + (on ? " is-active" : "") + '" data-category="' + escapeHtml(id) + '" aria-pressed="' + (on ? "true" : "false") + '">' +
          escapeHtml(label) +
        "</button>";
    });
    return '<div class="wds-gallery-filters" role="group" aria-label="' + escapeHtml(options.ariaLabel || "Filter") + '">' + html + "</div>";
  }

  function renderItem(item, index, options) {
    options = options || {};
    var sizeClass = options.sizeClass ? options.sizeClass(index) : "";
    var searchText = [item.title, item.caption, item.location, item.category].filter(Boolean).join(" ");
    return (
      '<div class="wds-gallery__item' + (sizeClass ? " " + sizeClass : "") + '">' +
        '<button type="button" class="wds-gallery__hit" data-item-id="' + escapeHtml(item.id) + '" data-search-text="' + escapeHtml(searchText) + '">' +
          '<img class="wds-gallery__img" src="' + escapeHtml(item.src) + '" alt="' + escapeHtml(item.alt || item.title || "") + '" loading="lazy">' +
          (item.title ? '<span class="wds-gallery__caption">' + escapeHtml(item.title) + "</span>" : "") +
        "</button>" +
      "</div>"
    );
  }

  function renderGallery(items, options) {
    options = options || {};
    var masonry = options.masonry !== false ? " wds-gallery--masonry" : "";
    var inner = items.map(function (item, i) {
      if (typeof options.itemRenderer === "function") {
        return options.itemRenderer(item, i);
      }
      return renderItem(item, i, options);
    }).join("");
    return '<div class="wds-gallery' + masonry + '" data-wds-gallery>' + inner + "</div>";
  }

  function bindFilters(container, onSelect) {
    if (!container) return;
    container.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-category]");
      if (!btn) return;
      var id = btn.getAttribute("data-category");
      container.querySelectorAll("[data-category]").forEach(function (chip) {
        var on = chip === btn;
        chip.classList.toggle("is-active", on);
        chip.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (onSelect) onSelect(id);
    });
  }

  function bindGallery(container, onSelect) {
    if (!container) return;
    container.addEventListener("click", function (e) {
      var hit = e.target.closest(".wds-gallery__hit");
      if (!hit) return;
      if (onSelect) onSelect(hit.getAttribute("data-item-id"), hit);
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.gallery = {
    renderCollectionHeader: renderCollectionHeader,
    renderFilters: renderFilters,
    renderGallery: renderGallery,
    renderItem: renderItem,
    bindFilters: bindFilters,
    bindGallery: bindGallery,
    escapeHtml: escapeHtml
  };
})(window);
