/**
 * Waypoint Scenes — Portfolio Website Output · Engine
 * Project CRUD, source reconciliation, export orchestration.
 * Output edits never silently mutate the source portfolio.
 */
(function (global) {
  "use strict";

  function Models() {
    return global.WaypointScenesPortfolioOutputModels;
  }
  function Store() {
    return global.WaypointScenesPortfolioOutputStore;
  }
  function Privacy() {
    return global.WaypointScenesPortfolioOutputPrivacy;
  }
  function Package() {
    return global.WaypointScenesPortfolioOutputPackage;
  }
  function Catalog() {
    return global.WaypointScenesPortfolioOutputCatalog;
  }

  function create() {
    var projects = [];
    var ready = false;

    function persist() {
      Store().saveProjects(projects);
      var meta = Store().loadMeta();
      meta.updatedAt = Models().nowIso();
      Store().saveMeta(meta);
    }

    function init() {
      projects = Store().loadProjects();
      ready = true;
      return Promise.resolve(true);
    }

    function list() {
      return projects.slice().sort(function (a, b) {
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      });
    }

    function get(id) {
      for (var i = 0; i < projects.length; i++) {
        if (projects[i].id === id) return projects[i];
      }
      return null;
    }

    function listForPortfolio(portfolioId) {
      return list().filter(function (p) {
        return p.portfolioId === portfolioId;
      });
    }

    /**
     * Create a website project from a saved portfolio. Copies order/cover/title/description.
     * Does not copy private notes into public captions.
     */
    function createFromPortfolio(portfolio, opts) {
      opts = opts || {};
      var M = Models();
      if (!portfolio || !portfolio.id) throw new Error("Portfolio required");
      var imageIds = Array.isArray(portfolio.imageIds) ? portfolio.imageIds.slice() : [];
      var imageContent = {};
      imageIds.forEach(function (id) {
        imageContent[id] = M.createImageContent({});
      });
      var project = M.createProject({
        portfolioId: portfolio.id,
        title: opts.title || portfolio.title || "Untitled gallery",
        description: opts.description != null ? opts.description : portfolio.description || null,
        layout: opts.layout || "editorial",
        imageIds: imageIds,
        coverImageId: portfolio.coverImageId || imageIds[0] || null,
        imageContent: imageContent,
        sourceSnapshot: M.snapshotFromPortfolio(portfolio),
        appearance: opts.appearance || null,
        metadataVisibility: opts.metadataVisibility || null
      });
      projects.unshift(project);
      persist();
      return project;
    }

    function updateProject(id, patch) {
      var p = get(id);
      if (!p) return null;
      patch = patch || {};
      var M = Models();
      var next = M.createProject(
        Object.assign({}, p, patch, {
          id: p.id,
          createdAt: p.createdAt,
          updatedAt: M.nowIso(),
          sourceSnapshot: patch.sourceSnapshot !== undefined ? patch.sourceSnapshot : p.sourceSnapshot
        })
      );
      for (var i = 0; i < projects.length; i++) {
        if (projects[i].id === id) {
          projects[i] = next;
          break;
        }
      }
      persist();
      return next;
    }

    function renameProject(id, title) {
      return updateProject(id, { title: title });
    }

    function duplicateProject(id) {
      var p = get(id);
      if (!p) return null;
      var M = Models();
      var copy = M.createProject(
        Object.assign({}, p, {
          id: M.uuid(),
          title: (p.title || "Gallery") + " (copy)",
          createdAt: M.nowIso(),
          updatedAt: M.nowIso(),
          lastExport: null
        })
      );
      projects.unshift(copy);
      persist();
      return copy;
    }

    function deleteProject(id) {
      var before = projects.length;
      projects = projects.filter(function (p) {
        return p.id !== id;
      });
      if (projects.length !== before) persist();
      return projects.length !== before;
    }

    /**
     * Diff source portfolio vs project sourceSnapshot + current membership.
     */
    function detectSourceChanges(project, portfolio) {
      var changes = [];
      if (!project || !portfolio) return changes;
      var snap = project.sourceSnapshot || {};
      var srcIds = Array.isArray(portfolio.imageIds) ? portfolio.imageIds.slice() : [];
      var snapIds = Array.isArray(snap.imageIds) ? snap.imageIds.slice() : [];
      var curIds = Array.isArray(project.imageIds) ? project.imageIds.slice() : [];

      if ((snap.title || "") !== (portfolio.title || "")) {
        changes.push({
          type: "title",
          label: "Source title changed",
          from: snap.title,
          to: portfolio.title
        });
      }
      if ((snap.description || "") !== (portfolio.description || "")) {
        changes.push({
          type: "description",
          label: "Source description changed",
          from: snap.description,
          to: portfolio.description
        });
      }
      if ((snap.purpose || "") !== (portfolio.purpose || "")) {
        changes.push({
          type: "purpose",
          label: "Source purpose changed",
          from: snap.purpose,
          to: portfolio.purpose
        });
      }
      if ((snap.coverImageId || null) !== (portfolio.coverImageId || null)) {
        changes.push({
          type: "cover",
          label: "Source cover changed",
          from: snap.coverImageId,
          to: portfolio.coverImageId
        });
      }

      var snapSet = {};
      snapIds.forEach(function (id) {
        snapSet[id] = true;
      });
      var srcSet = {};
      srcIds.forEach(function (id) {
        srcSet[id] = true;
      });

      srcIds.forEach(function (id) {
        if (!snapSet[id]) {
          changes.push({ type: "added", label: "Photograph added in source", imageId: id });
        }
      });
      snapIds.forEach(function (id) {
        if (!srcSet[id]) {
          changes.push({ type: "removed", label: "Photograph removed from source", imageId: id });
        }
      });

      if (JSON.stringify(snapIds) !== JSON.stringify(srcIds) && snapIds.length && srcIds.length) {
        var onlyReorder =
          snapIds.slice().sort().join(",") === srcIds.slice().sort().join(",") &&
          JSON.stringify(snapIds) !== JSON.stringify(srcIds);
        if (onlyReorder) {
          changes.push({ type: "reordered", label: "Source order changed", from: snapIds, to: srcIds });
        }
      }

      // Also note membership drift vs current project (output edits)
      curIds.forEach(function (id) {
        if (!srcSet[id]) {
          /* kept in output after source remove — surfaced via removed if in snap */
        }
      });

      return changes;
    }

    /**
     * Apply reconciliation.
     * mode: 'all' | 'keep' | or apply selected change types via opts.applyTypes
     * Never silently discards output imageContent for surviving ids.
     */
    function reconcile(projectId, portfolio, opts) {
      opts = opts || {};
      var project = get(projectId);
      if (!project || !portfolio) return null;
      var M = Models();
      var mode = opts.mode || "all";
      var changes = detectSourceChanges(project, portfolio);

      if (mode === "keep") {
        return updateProject(projectId, {
          sourceSnapshot: M.snapshotFromPortfolio(portfolio)
        });
      }

      var applyTypes = opts.applyTypes || null;
      function want(type) {
        if (mode === "all" && !applyTypes) return true;
        if (applyTypes && applyTypes.indexOf(type) >= 0) return true;
        return false;
      }

      var patch = {};
      var imageIds = project.imageIds.slice();
      var imageContent = M.clone(project.imageContent || {});
      var coverImageId = project.coverImageId;

      changes.forEach(function (ch) {
        if (!want(ch.type)) return;
        if (ch.type === "title" && opts.adoptSourceTitle) {
          patch.title = ch.to;
        }
        if (ch.type === "description" && opts.adoptSourceDescription) {
          patch.description = ch.to;
        }
        if (ch.type === "cover") {
          coverImageId = ch.to;
        }
        if (ch.type === "added" && ch.imageId) {
          if (imageIds.indexOf(ch.imageId) < 0) {
            imageIds.push(ch.imageId);
            imageContent[ch.imageId] = M.createImageContent({});
          }
        }
        if (ch.type === "removed" && ch.imageId) {
          imageIds = imageIds.filter(function (id) {
            return id !== ch.imageId;
          });
        }
        if (ch.type === "reordered" && Array.isArray(ch.to)) {
          // Preserve output-only ids at end; adopt source order for shared ids
          var shared = ch.to.filter(function (id) {
            return imageIds.indexOf(id) >= 0 || true;
          });
          var extras = imageIds.filter(function (id) {
            return shared.indexOf(id) < 0;
          });
          imageIds = shared.concat(extras);
          // Prefer pure source order when applying reorder fully
          imageIds = ch.to.slice().concat(
            extras.filter(function (id) {
              return ch.to.indexOf(id) < 0;
            })
          );
        }
      });

      // When mode all: sync membership to source order, preserve content for surviving
      if (mode === "all" && !applyTypes) {
        var srcIds = (portfolio.imageIds || []).slice();
        var nextContent = {};
        srcIds.forEach(function (id) {
          nextContent[id] = imageContent[id] || M.createImageContent({});
        });
        imageIds = srcIds;
        imageContent = nextContent;
        coverImageId = portfolio.coverImageId || srcIds[0] || null;
        if (opts.adoptSourceTitle !== false) patch.title = portfolio.title || project.title;
        if (opts.adoptSourceDescription !== false) {
          patch.description = portfolio.description != null ? portfolio.description : project.description;
        }
      }

      patch.imageIds = imageIds;
      patch.imageContent = imageContent;
      patch.coverImageId = coverImageId;
      patch.sourceSnapshot = M.snapshotFromPortfolio(portfolio);
      return updateProject(projectId, patch);
    }

    function setImageContent(projectId, imageId, contentPatch) {
      var p = get(projectId);
      if (!p) return null;
      var M = Models();
      var imageContent = M.clone(p.imageContent || {});
      imageContent[imageId] = M.createImageContent(
        Object.assign({}, imageContent[imageId] || {}, contentPatch || {})
      );
      return updateProject(projectId, { imageContent: imageContent });
    }

    function setHidden(projectId, imageId, hidden) {
      return setImageContent(projectId, imageId, { hidden: !!hidden });
    }

    function setCover(projectId, imageId) {
      var p = get(projectId);
      if (!p) return null;
      if ((p.imageIds || []).indexOf(imageId) < 0) return p;
      return updateProject(projectId, { coverImageId: imageId });
    }

    function libraryLookup(libraryImages) {
      var map = {};
      (libraryImages || []).forEach(function (img) {
        map[img.id] = img;
      });
      return function (id) {
        return map[id] || null;
      };
    }

    function refreshMissing(projectId, libraryImages) {
      var p = get(projectId);
      if (!p) return null;
      var byId = libraryLookup(libraryImages);
      var missing = (p.imageIds || []).filter(function (id) {
        return !byId(id);
      });
      return updateProject(projectId, { missingFileIds: missing });
    }

    function validate(projectId, libraryImages) {
      var p = get(projectId);
      return Privacy().validateProject(p, libraryLookup(libraryImages));
    }

    /**
     * Build and return ZIP bytes + report. Does not download.
     * cancelRef: { cancelled: boolean } checked between images when provided.
     */
    function exportPackage(projectId, libraryImages, portfolio, opts) {
      opts = opts || {};
      var p = get(projectId);
      if (!p) {
        return Promise.resolve({
          success: false,
          failureReason: "Project not found",
          validation: { blocking: [{ code: "no-project", message: "Project not found" }], warnings: [], info: [] }
        });
      }

      var byId = libraryLookup(libraryImages);
      var validation = Privacy().validateProject(p, byId);
      if (validation.blocking.length && !opts.ignoreBlocking) {
        return Promise.resolve({
          success: false,
          failureReason: "Validation blocked export",
          validation: validation
        });
      }

      var itemsById = {};
      if (portfolio && Array.isArray(portfolio.items)) {
        portfolio.items.forEach(function (it) {
          itemsById[it.imageId] = it;
        });
      }

      var visibleIds = (p.imageIds || []).filter(function (id) {
        var c = p.imageContent && p.imageContent[id];
        return !(c && c.hidden);
      });

      var chain = Promise.resolve();
      var resolved = [];
      var cancelRef = opts.cancelRef || null;

      visibleIds.forEach(function (id) {
        chain = chain.then(function () {
          if (cancelRef && cancelRef.cancelled) {
            return Promise.reject(new Error("cancelled"));
          }
          var img = byId(id);
          var meta = Privacy().publicMetadataForImage(img, p.metadataVisibility);
          if (!img) {
            resolved.push({ imageId: id, missing: true, meta: meta });
            return;
          }
          return Package()
            .resolveImageBytes(img, { preferOriginal: opts.preferOriginal !== false })
            .then(function (res) {
              if (!res || res.missing) {
                resolved.push({ imageId: id, missing: true, meta: meta });
              } else {
                resolved.push({
                  imageId: id,
                  bytes: res.bytes,
                  ext: res.ext,
                  kind: res.kind,
                  approxBytes: res.approxBytes,
                  meta: meta
                });
              }
            });
        });
      });

      return chain
        .then(function () {
          if (cancelRef && cancelRef.cancelled) {
            return { success: false, failureReason: "cancelled", validation: validation };
          }
          var pack = Package().buildPackageFiles(p, resolved, itemsById);
          var zipBytes = Package().assembleZip(pack.files);
          var approx = zipBytes.length;
          var Cat = Catalog();
          var guide = (Cat && Cat.SIZE_GUIDANCE) || {};
          var warnings = validation.warnings.slice();
          if (approx > (guide.warnApproxBytes || 0)) {
            warnings.push({
              code: "large-package",
              message: "Approximate package size is " + Math.round(approx / (1024 * 1024)) + " MB."
            });
          }
          if (approx > (guide.blockApproxBytes || Infinity) && !opts.allowLarge) {
            return {
              success: false,
              failureReason: "Package exceeds safe browser size guidance",
              validation: {
                blocking: validation.blocking.concat([
                  {
                    code: "oversized",
                    message: "Estimated package is too large for a reliable browser export."
                  }
                ]),
                warnings: warnings,
                info: validation.info
              }
            };
          }

          var filename =
            Privacy().sanitizeFilename(p.title || "gallery", "gallery") +
            "-website.zip";

          var history = Models().createExportHistoryEntry({
            projectId: p.id,
            filename: filename,
            imageCount: pack.frames.filter(function (f) {
              return !f.missing;
            }).length,
            approxBytes: approx,
            warnings: warnings.map(function (w) {
              return w.message;
            }),
            success: true
          });
          Store().appendHistory(history);
          updateProject(p.id, {
            lastExport: {
              at: history.at,
              version: history.exportVersion,
              filename: filename,
              imageCount: history.imageCount,
              approxBytes: approx,
              warnings: history.warnings,
              success: true
            }
          });

          return {
            success: true,
            filename: filename,
            zipBytes: zipBytes,
            approxBytes: approx,
            frames: pack.frames,
            files: pack.files,
            validation: { blocking: validation.blocking, warnings: warnings, info: validation.info },
            history: history
          };
        })
        .catch(function (err) {
          var reason = err && err.message === "cancelled" ? "cancelled" : String((err && err.message) || err);
          var history = Models().createExportHistoryEntry({
            projectId: p.id,
            success: false,
            failureReason: reason,
            imageCount: 0
          });
          Store().appendHistory(history);
          return {
            success: false,
            failureReason: reason,
            validation: validation
          };
        });
    }

    function downloadZip(zipBytes, filename) {
      var blob = global.WaypointScenesPortfolioOutputZip.bytesToBlob(zipBytes, "application/zip");
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = filename || "gallery-website.zip";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 2000);
      return true;
    }

    return {
      init: init,
      isReady: function () {
        return ready;
      },
      list: list,
      get: get,
      listForPortfolio: listForPortfolio,
      createFromPortfolio: createFromPortfolio,
      updateProject: updateProject,
      renameProject: renameProject,
      duplicateProject: duplicateProject,
      deleteProject: deleteProject,
      detectSourceChanges: detectSourceChanges,
      reconcile: reconcile,
      setImageContent: setImageContent,
      setHidden: setHidden,
      setCover: setCover,
      refreshMissing: refreshMissing,
      validate: validate,
      exportPackage: exportPackage,
      downloadZip: downloadZip,
      libraryLookup: libraryLookup
    };
  }

  var shared = null;
  function getShared() {
    if (!shared) shared = create();
    return shared;
  }

  global.WaypointScenesPortfolioOutputEngine = {
    create: create,
    getShared: getShared
  };
})(typeof window !== "undefined" ? window : globalThis);
