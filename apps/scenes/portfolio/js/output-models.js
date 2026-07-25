/**
 * Waypoint Scenes — Portfolio Website Output · Models
 * Durable PortfolioWebsiteProject — edits do not silently mutate source portfolios.
 */
(function (global) {
  "use strict";

  function Catalog() {
    return global.WaypointScenesPortfolioOutputCatalog;
  }

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return "pwo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function createImageContent(partial) {
    partial = partial || {};
    return {
      title: partial.title != null ? String(partial.title) : null,
      caption: partial.caption != null ? String(partial.caption) : null,
      altText: partial.altText != null ? String(partial.altText) : null,
      altDecorative: !!partial.altDecorative,
      hidden: !!partial.hidden
    };
  }

  function snapshotFromPortfolio(portfolio) {
    portfolio = portfolio || {};
    return {
      title: portfolio.title || null,
      description: portfolio.description || null,
      purpose: portfolio.purpose || null,
      imageIds: Array.isArray(portfolio.imageIds) ? portfolio.imageIds.slice() : [],
      coverImageId: portfolio.coverImageId || null,
      updatedAt: portfolio.updatedAt || null
    };
  }

  /**
   * @returns {object} PortfolioWebsiteProject
   */
  function createProject(partial) {
    partial = partial || {};
    var Cat = Catalog();
    var metaVis = Object.assign(
      {},
      Cat ? Cat.DEFAULT_METADATA_VISIBILITY : {},
      partial.metadataVisibility || {}
    );
    // Precise location never defaults on
    if (partial.metadataVisibility && partial.metadataVisibility.locationPrecise == null) {
      metaVis.locationPrecise = false;
    }
    var appearance = Object.assign({}, Cat ? Cat.DEFAULT_APPEARANCE : {}, partial.appearance || {});
    var imageIds = Array.isArray(partial.imageIds) ? partial.imageIds.slice() : [];
    var imageContent = {};
    var rawContent = partial.imageContent && typeof partial.imageContent === "object" ? partial.imageContent : {};
    imageIds.forEach(function (id) {
      imageContent[id] = createImageContent(rawContent[id]);
    });
    Object.keys(rawContent).forEach(function (id) {
      if (!imageContent[id]) imageContent[id] = createImageContent(rawContent[id]);
    });

    var cover = partial.coverImageId || null;
    if (cover && imageIds.indexOf(cover) < 0) cover = imageIds[0] || null;
    if (!cover && imageIds.length) cover = imageIds[0];

    var layout = partial.layout || "editorial";
    if (layout !== "editorial" && layout !== "grid" && layout !== "showcase") layout = "editorial";

    return {
      schemaVersion: (Cat && Cat.SCHEMA_VERSION) || "1.0.0",
      id: partial.id || uuid(),
      portfolioId: partial.portfolioId || null,
      title: (partial.title && String(partial.title).trim()) || "Untitled gallery",
      description: partial.description != null ? partial.description : null,
      layout: layout,
      imageIds: imageIds,
      coverImageId: cover,
      metadataVisibility: metaVis,
      imageContent: imageContent,
      appearance: appearance,
      sourceSnapshot: partial.sourceSnapshot ? clone(partial.sourceSnapshot) : null,
      lastExport: partial.lastExport || null,
      exportVersion: (Cat && Cat.EXPORT_VERSION) || "1.0.0",
      missingFileIds: Array.isArray(partial.missingFileIds) ? partial.missingFileIds.slice() : [],
      createdAt: partial.createdAt || nowIso(),
      updatedAt: partial.updatedAt || nowIso()
    };
  }

  function createExportHistoryEntry(partial) {
    partial = partial || {};
    return {
      id: partial.id || uuid(),
      projectId: partial.projectId || null,
      at: partial.at || nowIso(),
      exportVersion: partial.exportVersion || ((Catalog() && Catalog().EXPORT_VERSION) || "1.0.0"),
      filename: partial.filename || null,
      imageCount: partial.imageCount != null ? partial.imageCount : 0,
      approxBytes: partial.approxBytes != null ? partial.approxBytes : null,
      warnings: Array.isArray(partial.warnings) ? partial.warnings.slice() : [],
      success: partial.success !== false,
      failureReason: partial.failureReason || null
    };
  }

  global.WaypointScenesPortfolioOutputModels = {
    uuid: uuid,
    nowIso: nowIso,
    createProject: createProject,
    createImageContent: createImageContent,
    snapshotFromPortfolio: snapshotFromPortfolio,
    createExportHistoryEntry: createExportHistoryEntry,
    clone: clone
  };
})(typeof window !== "undefined" ? window : globalThis);
