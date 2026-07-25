/**
 * WaypointScenesPortfolioEngine — CRUD, reorder, cover, library-backed candidates
 */
(function (global) {
  "use strict";

  function Models() {
    return global.WaypointScenesPortfolioModels;
  }
  function Store() {
    return global.WaypointScenesPortfolioStore;
  }
  function Candidates() {
    return global.WaypointScenesPortfolioCandidates;
  }

  function create() {
    var portfolios = [];
    var ready = false;

    function byId(id) {
      for (var i = 0; i < portfolios.length; i++) {
        if (portfolios[i].id === id) return portfolios[i];
      }
      return null;
    }

    function persist() {
      var ok = Store().savePortfolios(portfolios);
      Store().saveMeta({
        schemaVersion: Models().SCHEMA_VERSION,
        updatedAt: new Date().toISOString()
      });
      return ok;
    }

    function touch(p) {
      p.updatedAt = new Date().toISOString();
      return p;
    }

    function syncItems(p) {
      var map = {};
      (p.items || []).forEach(function (it) {
        if (it && it.imageId) map[it.imageId] = it;
      });
      p.items = (p.imageIds || []).map(function (id) {
        return (
          map[id] ||
          Models().createPortfolioItem({ imageId: id, source: "manual" })
        );
      });
      if (p.coverImageId && p.imageIds.indexOf(p.coverImageId) < 0) {
        p.coverImageId = p.imageIds[0] || null;
      }
      if (!p.coverImageId && p.imageIds.length) p.coverImageId = p.imageIds[0];
      return p;
    }

    function init() {
      portfolios = Store().loadPortfolios();
      ready = true;
      return Promise.resolve({
        portfolioCount: portfolios.length
      });
    }

    function createPortfolio(input) {
      input = input || {};
      var M = Models();
      var p = M.createPortfolio({
        title: input.title,
        description: input.description || null,
        purpose: M.normalizePurpose(input.purpose),
        notes: input.notes || null,
        imageIds: input.imageIds || [],
        coverImageId: input.coverImageId || null
      });
      portfolios.unshift(p);
      persist();
      return p;
    }

    function updatePortfolio(id, patch) {
      var p = byId(id);
      if (!p) return null;
      patch = patch || {};
      if (patch.title != null) {
        var t = String(patch.title).trim();
        p.title = t || p.title;
      }
      if (patch.description !== undefined) p.description = patch.description || null;
      if (patch.purpose !== undefined) p.purpose = Models().normalizePurpose(patch.purpose);
      if (patch.notes !== undefined) p.notes = patch.notes || null;
      if (patch.health !== undefined) p.health = patch.health;
      touch(p);
      persist();
      return p;
    }

    function renamePortfolio(id, title) {
      return updatePortfolio(id, { title: title });
    }

    function deletePortfolio(id) {
      var before = portfolios.length;
      portfolios = portfolios.filter(function (p) {
        return p.id !== id;
      });
      if (portfolios.length === before) return false;
      persist();
      return true;
    }

    function addImages(portfolioId, imageIds, meta) {
      var p = byId(portfolioId);
      if (!p) return null;
      meta = meta || {};
      var added = [];
      (imageIds || []).forEach(function (imageId) {
        if (!imageId || p.imageIds.indexOf(imageId) >= 0) return;
        p.imageIds.push(imageId);
        p.items.push(
          Models().createPortfolioItem({
            imageId: imageId,
            notes: meta.notes || null,
            selectionRationale: meta.selectionRationale || null,
            source: meta.source === "suggestion" ? "suggestion" : "manual"
          })
        );
        added.push(imageId);
      });
      syncItems(p);
      touch(p);
      persist();
      return { portfolio: p, added: added };
    }

    function removeImage(portfolioId, imageId) {
      var p = byId(portfolioId);
      if (!p) return null;
      p.imageIds = p.imageIds.filter(function (id) {
        return id !== imageId;
      });
      syncItems(p);
      touch(p);
      persist();
      return p;
    }

    function reorderImages(portfolioId, orderedIds) {
      var p = byId(portfolioId);
      if (!p) return null;
      orderedIds = Array.isArray(orderedIds) ? orderedIds : [];
      var set = {};
      p.imageIds.forEach(function (id) {
        set[id] = true;
      });
      var next = [];
      orderedIds.forEach(function (id) {
        if (set[id]) {
          next.push(id);
          delete set[id];
        }
      });
      Object.keys(set).forEach(function (id) {
        next.push(id);
      });
      p.imageIds = next;
      syncItems(p);
      touch(p);
      persist();
      return p;
    }

    function setCover(portfolioId, imageId) {
      var p = byId(portfolioId);
      if (!p) return null;
      if (imageId && p.imageIds.indexOf(imageId) < 0) return null;
      p.coverImageId = imageId || null;
      touch(p);
      persist();
      return p;
    }

    function moveImage(portfolioId, imageId, direction) {
      var p = byId(portfolioId);
      if (!p) return null;
      var idx = p.imageIds.indexOf(imageId);
      if (idx < 0) return null;
      var swap = direction < 0 ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= p.imageIds.length) return p;
      var tmp = p.imageIds[idx];
      p.imageIds[idx] = p.imageIds[swap];
      p.imageIds[swap] = tmp;
      syncItems(p);
      touch(p);
      persist();
      return p;
    }

    function suggestForPortfolio(portfolioId, libraryImages) {
      var p = byId(portfolioId);
      var selectedIds = p ? p.imageIds.slice() : [];
      return Candidates().suggestCandidates(libraryImages || [], {
        selectedIds: selectedIds
      });
    }

    return {
      id: "ScenesPortfolioEngine",
      version: "1.0.0",
      init: init,
      isReady: function () {
        return ready;
      },
      list: function () {
        return portfolios.slice();
      },
      get: byId,
      createPortfolio: createPortfolio,
      updatePortfolio: updatePortfolio,
      renamePortfolio: renamePortfolio,
      deletePortfolio: deletePortfolio,
      addImages: addImages,
      removeImage: removeImage,
      reorderImages: reorderImages,
      setCover: setCover,
      moveImage: moveImage,
      suggestForPortfolio: suggestForPortfolio
    };
  }

  var singleton = null;

  global.WaypointScenesPortfolioEngine = {
    create: create,
    getShared: function () {
      if (!singleton) singleton = create();
      return singleton;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
