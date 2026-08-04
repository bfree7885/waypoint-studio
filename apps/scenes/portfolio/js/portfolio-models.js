/**
 * Waypoint Scenes — Portfolio domain models
 * Purpose-driven curated sets that reference Photo Library image ids.
 * Never invent missing analysis / EXIF fields.
 */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = "1.0.0";

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return "pf-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  /**
   * Per-image membership metadata inside a portfolio.
   */
  function createPortfolioItem(partial) {
    partial = partial || {};
    return {
      imageId: partial.imageId || null,
      notes: partial.notes || null,
      selectionRationale: partial.selectionRationale || null,
      addedAt: partial.addedAt || nowIso(),
      source: partial.source === "suggestion" ? "suggestion" : "manual"
    };
  }

  /**
   * @returns {object} Portfolio
   */
  function createPortfolio(partial) {
    partial = partial || {};
    var imageIds = Array.isArray(partial.imageIds) ? partial.imageIds.slice() : [];
    var items = Array.isArray(partial.items)
      ? partial.items.map(createPortfolioItem).filter(function (it) {
          return !!it.imageId;
        })
      : imageIds.map(function (id) {
          return createPortfolioItem({ imageId: id, source: "manual" });
        });

    // Keep imageIds as ordered SoT; sync items to membership
    var itemById = {};
    items.forEach(function (it) {
      itemById[it.imageId] = it;
    });
    imageIds.forEach(function (id) {
      if (!itemById[id]) itemById[id] = createPortfolioItem({ imageId: id });
    });
    var syncedItems = imageIds.map(function (id) {
      return itemById[id];
    });

    var cover = partial.coverImageId || null;
    if (cover && imageIds.indexOf(cover) < 0) cover = imageIds[0] || null;
    if (!cover && imageIds.length) cover = imageIds[0];

    return {
      schemaVersion: SCHEMA_VERSION,
      id: partial.id || uuid(),
      title: (partial.title && String(partial.title).trim()) || "Untitled portfolio",
      description: partial.description || null,
      purpose: partial.purpose || null,
      createdAt: partial.createdAt || nowIso(),
      updatedAt: partial.updatedAt || nowIso(),
      coverImageId: cover,
      imageIds: imageIds,
      items: syncedItems,
      notes: partial.notes || null,
      /** Reserved for Portfolio Health — null until a future sprint writes it. */
      health: partial.health != null ? partial.health : null,
      private: partial.private !== false
    };
  }

  function normalizePurpose(purpose) {
    if (purpose == null) return null;
    var t = String(purpose).trim();
    return t ? t.slice(0, 160) : null;
  }

  global.WaypointScenesPortfolioModels = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    uuid: uuid,
    createPortfolio: createPortfolio,
    createPortfolioItem: createPortfolioItem,
    normalizePurpose: normalizePurpose
  };
})(typeof window !== "undefined" ? window : globalThis);
