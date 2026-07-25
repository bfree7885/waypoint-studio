/**
 * Waypoint Scenes — Portfolio Website Output · UI
 */
(function (global) {
  "use strict";

  var outputEngine = null;
  var portfolioEngine = null;
  var libraryImages = [];
  var cancelRef = { cancelled: false };
  var previewUrl = null;

  var state = {
    view: "home", // home | create | editor | preview
    activeId: null,
    viewport: "desktop",
    confirmDeleteId: null,
    status: ""
  };

  function $(id) {
    return document.getElementById(id);
  }

  function Catalog() {
    return global.WaypointScenesPortfolioOutputCatalog;
  }
  function Package() {
    return global.WaypointScenesPortfolioOutputPackage;
  }
  function Privacy() {
    return global.WaypointScenesPortfolioOutputPrivacy;
  }
  function Store() {
    return global.WaypointScenesPortfolioOutputStore;
  }

  function esc(s) {
    return Privacy().escapeHtml(s);
  }

  function setStatus(msg, isError) {
    var el = $("pfo-status");
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = msg;
    el.classList.toggle("is-error", !!isError);
  }

  function libraryById(id) {
    for (var i = 0; i < libraryImages.length; i++) {
      if (libraryImages[i].id === id) return libraryImages[i];
    }
    return null;
  }

  function loadLibrary() {
    libraryImages = [];
    try {
      var StorePL = global.WaypointPhotoLibraryStore;
      if (StorePL && StorePL.loadIndex) libraryImages = StorePL.loadIndex() || [];
    } catch (e) {
      libraryImages = [];
    }
  }

  function thumbHtml(img, alt) {
    if (img && img.media && img.media.thumbnailDataUrl) {
      return (
        '<img src="' +
        esc(img.media.thumbnailDataUrl) +
        '" alt="' +
        esc(alt || "Photograph") +
        '" loading="lazy" decoding="async">'
      );
    }
    return '<div class="pf-thumb-fallback" role="img" aria-label="' + esc(alt || "Missing") + '">No preview</div>';
  }

  function showView(view) {
    state.view = view;
    ["pfo-home", "pfo-create", "pfo-editor", "pfo-preview"].forEach(function (id) {
      var el = $(id);
      if (el) el.hidden = true;
    });
    var map = { home: "pfo-home", create: "pfo-create", editor: "pfo-editor", preview: "pfo-preview" };
    var panel = $(map[view]);
    if (panel) panel.hidden = false;
  }

  function fillLayoutSelect(sel, selected) {
    if (!sel) return;
    var layouts = Catalog().LAYOUTS;
    sel.innerHTML = layouts
      .map(function (l) {
        return (
          '<option value="' +
          esc(l.id) +
          '"' +
          (l.id === selected ? " selected" : "") +
          ">" +
          esc(l.label) +
          "</option>"
        );
      })
      .join("");
  }

  function renderHome() {
    showView("home");
    var list = outputEngine.list();
    var empty = $("pfo-empty");
    var root = $("pfo-project-list");
    if (!list.length) {
      if (empty) empty.hidden = false;
      if (root) root.innerHTML = "";
    } else {
      if (empty) empty.hidden = true;
      if (root) {
        root.innerHTML = list
          .map(function (p) {
            return (
              '<li class="pfo-card">' +
              "<div><h3>" +
              esc(p.title) +
              "</h3><p class=\"pfo-card__meta\">" +
              esc(p.layout) +
              " · " +
              (p.imageIds || []).length +
              " photos · updated " +
              esc((p.updatedAt || "").slice(0, 10) || "—") +
              "</p></div>" +
              '<div class="pfo-card__actions">' +
              '<button type="button" class="wds-btn wds-btn--ghost" data-open-project="' +
              esc(p.id) +
              '">Open</button>' +
              '<button type="button" class="wds-btn wds-btn--ghost pf-danger" data-delete-project="' +
              esc(p.id) +
              '">Delete</button>' +
              "</div></li>"
            );
          })
          .join("");
      }
    }

    var hist = Store().loadHistory();
    var hRoot = $("pfo-history");
    if (hRoot) {
      if (!hist.length) {
        hRoot.innerHTML = "<li class=\"pf-hint\">No exports yet.</li>";
      } else {
        hRoot.innerHTML = hist
          .slice(0, 12)
          .map(function (h) {
            return (
              "<li class=\"pfo-card__meta\">" +
              esc((h.at || "").slice(0, 19).replace("T", " ")) +
              " · " +
              (h.success ? "ok" : "failed") +
              " · " +
              esc(h.filename || "—") +
              (h.imageCount != null ? " · " + h.imageCount + " images" : "") +
              (h.approxBytes != null ? " · ~" + Math.round(h.approxBytes / 1024) + " KB" : "") +
              "</li>"
            );
          })
          .join("");
      }
    }
  }

  function renderCreate() {
    showView("create");
    var portfolios = portfolioEngine.list();
    var sel = $("pfo-portfolio");
    var empty = $("pfo-no-portfolios");
    fillLayoutSelect($("pfo-layout-new"), "editorial");
    if (!portfolios.length) {
      if (empty) empty.hidden = false;
      if (sel) sel.innerHTML = "";
      return;
    }
    if (empty) empty.hidden = true;
    if (sel) {
      sel.innerHTML = portfolios
        .map(function (p) {
          return (
            '<option value="' +
            esc(p.id) +
            '">' +
            esc(p.title) +
            " (" +
            (p.imageIds || []).length +
            ")</option>"
          );
        })
        .join("");
    }
  }

  function activeProject() {
    return state.activeId ? outputEngine.get(state.activeId) : null;
  }

  function activePortfolio(project) {
    if (!project || !project.portfolioId) return null;
    return portfolioEngine.get(project.portfolioId);
  }

  function saveEditorFields() {
    var p = activeProject();
    if (!p) return;
    var meta = {};
    document.querySelectorAll("#pfo-meta-checks [data-meta]").forEach(function (input) {
      meta[input.getAttribute("data-meta")] = !!input.checked;
    });
    outputEngine.updateProject(p.id, {
      title: $("pfo-title").value,
      description: $("pfo-description").value,
      layout: $("pfo-layout").value,
      metadataVisibility: meta,
      appearance: {
        theme: $("pfo-theme").value,
        spacing: $("pfo-spacing").value,
        gridDensity: $("pfo-density").value,
        imageFit: $("pfo-fit").value,
        captionVisibility: $("pfo-captions").value,
        titleAlignment: $("pfo-title-align").value,
        coverDisplay: $("pfo-cover-display").value,
        maxContentWidth: $("pfo-max-width").value
      }
    });
  }

  function renderValidation() {
    var box = $("pfo-validation");
    var p = activeProject();
    if (!box || !p) return;
    var v = outputEngine.validate(p.id, libraryImages);
    function list(items, cls) {
      if (!items.length) return "";
      return (
        "<ul class=\"" +
        cls +
        "\">" +
        items
          .map(function (it) {
            return "<li>" + esc(it.message) + "</li>";
          })
          .join("") +
        "</ul>"
      );
    }
    box.innerHTML =
      (v.blocking.length ? "<p><strong>Blocking</strong></p>" + list(v.blocking, "is-block") : "") +
      (v.warnings.length ? "<p><strong>Warnings</strong></p>" + list(v.warnings, "is-warn") : "") +
      (v.info.length ? "<p><strong>Notes</strong></p>" + list(v.info, "") : "") +
      (!v.blocking.length && !v.warnings.length && !v.info.length
        ? "<p class=\"pf-hint\">Ready to export — no issues detected.</p>"
        : "");
  }

  function renderEditor() {
    var p = activeProject();
    if (!p) {
      renderHome();
      return;
    }
    showView("editor");
    outputEngine.refreshMissing(p.id, libraryImages);
    p = activeProject();

    $("pfo-title").value = p.title || "";
    $("pfo-description").value = p.description || "";
    fillLayoutSelect($("pfo-layout"), p.layout);
    var layout = Catalog().layoutById(p.layout);
    $("pfo-layout-hint").textContent = layout ? layout.summary : "";

    var vis = p.metadataVisibility || {};
    document.querySelectorAll("#pfo-meta-checks [data-meta]").forEach(function (input) {
      var key = input.getAttribute("data-meta");
      input.checked = !!vis[key];
    });
    $("pfo-gps-warn").hidden = !vis.locationPrecise;

    var a = p.appearance || {};
    $("pfo-theme").value = a.theme || "dark";
    $("pfo-spacing").value = a.spacing || "comfortable";
    $("pfo-density").value = a.gridDensity || "regular";
    $("pfo-fit").value = a.imageFit || "contain";
    $("pfo-captions").value = a.captionVisibility || "always";
    $("pfo-title-align").value = a.titleAlignment || "left";
    $("pfo-cover-display").value = a.coverDisplay || "hero";
    $("pfo-max-width").value = a.maxContentWidth || "medium";

    var portfolio = activePortfolio(p);
    var changes = portfolio ? outputEngine.detectSourceChanges(p, portfolio) : [];
    var recon = $("pfo-reconcile");
    if (recon) {
      if (changes.length) {
        recon.hidden = false;
        $("pfo-reconcile-list").innerHTML = changes
          .map(function (c) {
            return "<li>" + esc(c.label) + "</li>";
          })
          .join("");
      } else {
        recon.hidden = true;
      }
    }

    var missingBox = $("pfo-missing");
    if (missingBox) {
      var missing = p.missingFileIds || [];
      if (missing.length) {
        missingBox.hidden = false;
        missingBox.textContent =
          missing.length +
          " photograph reference" +
          (missing.length === 1 ? " is" : "s are") +
          " missing from the local library. Export will block until resolved.";
      } else {
        missingBox.hidden = true;
      }
    }

    var list = $("pfo-images");
    if (list) {
      if (!(p.imageIds || []).length) {
        list.innerHTML = '<li class="pf-hint">This gallery has no photographs yet. Refresh from the source portfolio or pick another portfolio.</li>';
      } else {
        list.innerHTML = p.imageIds
          .map(function (id) {
            var img = libraryById(id);
            var c = (p.imageContent && p.imageContent[id]) || {};
            var isCover = p.coverImageId === id;
            return (
              '<li class="pfo-shot" data-image-id="' +
              esc(id) +
              '">' +
              '<div class="pfo-shot__media">' +
              thumbHtml(img, c.altText || (img && img.filename) || "Photograph") +
              (isCover ? '<span class="pfo-shot__badge">Cover</span>' : "") +
              (c.hidden ? '<span class="pfo-shot__badge">Hidden</span>' : "") +
              "</div>" +
              '<div class="pfo-shot__fields">' +
              "<label>Public title<input type=\"text\" data-field=\"title\" maxlength=\"120\" value=\"" +
              esc(c.title || "") +
              "\"></label>" +
              "<label>Public caption<textarea data-field=\"caption\" rows=\"2\" maxlength=\"800\">" +
              esc(c.caption || "") +
              "</textarea></label>" +
              "<label>Alt text<input type=\"text\" data-field=\"altText\" maxlength=\"300\" value=\"" +
              esc(c.altText || "") +
              "\" " +
              (c.altDecorative ? "disabled" : "") +
              "></label>" +
              '<label class="pfo-check"><input type="checkbox" data-field="altDecorative" ' +
              (c.altDecorative ? "checked" : "") +
              "> Decorative (empty alt)</label>" +
              '<div class="pfo-shot__actions">' +
              '<button type="button" class="wds-btn wds-btn--ghost" data-cover="' +
              esc(id) +
              '"' +
              (isCover ? " disabled" : "") +
              ">Set cover</button>" +
              '<button type="button" class="wds-btn wds-btn--ghost" data-toggle-hide="' +
              esc(id) +
              '">' +
              (c.hidden ? "Show in gallery" : "Hide in gallery") +
              "</button>" +
              '<button type="button" class="wds-btn wds-btn--ghost" data-copy-desc="' +
              esc(id) +
              '">Copy description → caption</button>' +
              "</div>" +
              (!img
                ? '<p class="pf-hint">Missing from library.</p>'
                : "") +
              "</div></li>"
            );
          })
          .join("");
      }
    }

    renderValidation();
  }

  function buildPreviewDocument(project) {
    var portfolio = activePortfolio(project);
    var itemsById = {};
    if (portfolio && portfolio.items) {
      portfolio.items.forEach(function (it) {
        itemsById[it.imageId] = it;
      });
    }
    var frames = [];
    (project.imageIds || []).forEach(function (id) {
      var content = (project.imageContent && project.imageContent[id]) || {};
      if (content.hidden) return;
      var img = libraryById(id);
      var meta = Privacy().publicMetadataForImage(img, project.metadataVisibility);
      var src =
        img && img.media && img.media.thumbnailDataUrl
          ? img.media.thumbnailDataUrl
          : "";
      frames.push({
        imageId: id,
        fileName: id + ".jpg",
        content: content,
        meta: meta,
        role: Package().roleHint(itemsById[id], frames.length, 0, project.coverImageId, id),
        missing: !img || !src,
        previewSrc: src
      });
    });
    frames.forEach(function (f, i) {
      f.role = Package().roleHint(itemsById[f.imageId], i, frames.length, project.coverImageId, f.imageId);
    });

    // Inline preview: rewrite image src to data URLs instead of images/ paths
    var html = Package().buildIndexHtml({ project: project, frames: frames });
    var css = Package().buildCss(project);
    var js = Package().buildViewerJs();
    frames.forEach(function (f) {
      if (f.previewSrc) {
        var re = new RegExp("images/" + f.fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
        html = html.replace(re, f.previewSrc);
      }
    });
    html = html.replace('<link rel="stylesheet" href="styles.css">', "<style>" + css + "</style>");
    html = html.replace('<script src="gallery.js"><\/script>', "<script>" + js + "<\/script>");
    return html;
  }

  function openPreview() {
    saveEditorFields();
    var p = activeProject();
    if (!p) return;
    showView("preview");
    state.viewport = "desktop";
    var wrap = $("pfo-preview-frame-wrap");
    if (wrap) wrap.setAttribute("data-viewport", "desktop");
    document.querySelectorAll("[data-viewport]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-viewport") === "desktop" ? "true" : "false");
    });
    var html = buildPreviewDocument(p);
    var frame = $("pfo-preview-frame");
    if (previewUrl) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch (e) {
        /* ignore */
      }
    }
    var blob = new Blob([html], { type: "text/html" });
    previewUrl = URL.createObjectURL(blob);
    if (frame) frame.src = previewUrl;
  }

  function runExport() {
    saveEditorFields();
    var p = activeProject();
    if (!p) return;
    cancelRef.cancelled = false;
    var progress = $("pfo-progress");
    var progressText = $("pfo-progress-text");
    if (progress) progress.hidden = false;
    if (progressText) progressText.textContent = "Building portable ZIP…";
    setStatus("");

    var portfolio = activePortfolio(p);
    outputEngine
      .exportPackage(p.id, libraryImages, portfolio, { cancelRef: cancelRef })
      .then(function (result) {
        if (progress) progress.hidden = true;
        if (!result.success) {
          setStatus(
            result.failureReason === "cancelled"
              ? "Export cancelled."
              : "Export blocked: " + (result.failureReason || "validation"),
            true
          );
          renderValidation();
          return;
        }
        outputEngine.downloadZip(result.zipBytes, result.filename);
        setStatus(
          "Exported “" +
            result.filename +
            "” (~" +
            Math.round(result.approxBytes / 1024) +
            " KB). Nothing was published."
        );
        renderEditor();
      });
  }

  function openProject(id) {
    state.activeId = id;
    setStatus("");
    renderEditor();
  }

  function renderConfirm() {
    var dlg = $("pfo-confirm");
    if (!dlg) return;
    if (!state.confirmDeleteId) {
      dlg.hidden = true;
      return;
    }
    var p = outputEngine.get(state.confirmDeleteId);
    dlg.hidden = false;
    $("pfo-confirm-text").textContent = p
      ? 'Delete website gallery “' + p.title + '”? The source portfolio is not deleted.'
      : "Delete this website gallery project?";
  }

  function bind() {
    $("pfo-new").addEventListener("click", function () {
      renderCreate();
    });
    $("pfo-create-cancel").addEventListener("click", function () {
      renderHome();
    });
    $("pfo-create-confirm").addEventListener("click", function () {
      var pid = $("pfo-portfolio").value;
      var portfolio = portfolioEngine.get(pid);
      if (!portfolio) {
        setStatus("Choose a portfolio first.", true);
        return;
      }
      if (!(portfolio.imageIds || []).length) {
        setStatus("That portfolio has no photographs yet.", true);
        return;
      }
      var project = outputEngine.createFromPortfolio(portfolio, {
        layout: $("pfo-layout-new").value || "editorial"
      });
      openProject(project.id);
      setStatus("Website gallery draft created. Captions and alt text stay empty until you write them.");
    });

    $("pfo-back").addEventListener("click", function () {
      saveEditorFields();
      state.activeId = null;
      renderHome();
    });
    $("pfo-save").addEventListener("click", function () {
      saveEditorFields();
      setStatus("Saved on this device.");
      renderEditor();
    });
    $("pfo-preview-btn").addEventListener("click", openPreview);
    $("pfo-export-btn").addEventListener("click", runExport);
    $("pfo-export-from-preview").addEventListener("click", runExport);
    $("pfo-preview-back").addEventListener("click", function () {
      showView("editor");
      renderEditor();
    });
    $("pfo-duplicate").addEventListener("click", function () {
      saveEditorFields();
      var copy = outputEngine.duplicateProject(state.activeId);
      if (copy) {
        openProject(copy.id);
        setStatus("Duplicated gallery draft.");
      }
    });
    $("pfo-delete").addEventListener("click", function () {
      state.confirmDeleteId = state.activeId;
      renderConfirm();
    });
    $("pfo-confirm-cancel").addEventListener("click", function () {
      state.confirmDeleteId = null;
      renderConfirm();
    });
    $("pfo-confirm-ok").addEventListener("click", function () {
      if (state.confirmDeleteId) {
        outputEngine.deleteProject(state.confirmDeleteId);
        state.confirmDeleteId = null;
        state.activeId = null;
        renderConfirm();
        renderHome();
        setStatus("Website gallery deleted. Source portfolio unchanged.");
      }
    });
    $("pfo-cancel-export").addEventListener("click", function () {
      cancelRef.cancelled = true;
      setStatus("Cancelling export…");
    });

    $("pfo-reconcile-all").addEventListener("click", function () {
      var p = activeProject();
      var portfolio = activePortfolio(p);
      if (!p || !portfolio) return;
      outputEngine.reconcile(p.id, portfolio, { mode: "all" });
      setStatus("Applied source portfolio changes. Your surviving captions and alt text were kept.");
      renderEditor();
    });
    $("pfo-reconcile-keep").addEventListener("click", function () {
      var p = activeProject();
      var portfolio = activePortfolio(p);
      if (!p || !portfolio) return;
      outputEngine.reconcile(p.id, portfolio, { mode: "keep" });
      setStatus("Kept current gallery. Source snapshot updated so this notice can clear.");
      renderEditor();
    });

    ["pfo-title", "pfo-description", "pfo-layout", "pfo-theme", "pfo-spacing", "pfo-density", "pfo-fit", "pfo-captions", "pfo-title-align", "pfo-cover-display", "pfo-max-width"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("change", function () {
        saveEditorFields();
        if (id === "pfo-layout") {
          var layout = Catalog().layoutById($("pfo-layout").value);
          $("pfo-layout-hint").textContent = layout ? layout.summary : "";
        }
        renderValidation();
      });
    });

    document.getElementById("pfo-meta-checks").addEventListener("change", function () {
      saveEditorFields();
      var gps = document.querySelector("#pfo-meta-checks [data-meta='locationPrecise']");
      $("pfo-gps-warn").hidden = !(gps && gps.checked);
      renderValidation();
    });

    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var open = t.closest("[data-open-project]");
      if (open) {
        openProject(open.getAttribute("data-open-project"));
        return;
      }
      var del = t.closest("[data-delete-project]");
      if (del) {
        state.confirmDeleteId = del.getAttribute("data-delete-project");
        renderConfirm();
        return;
      }
      var vp = t.closest("[data-viewport]");
      if (vp && state.view === "preview") {
        state.viewport = vp.getAttribute("data-viewport");
        $("pfo-preview-frame-wrap").setAttribute("data-viewport", state.viewport);
        document.querySelectorAll("#pfo-preview [data-viewport]").forEach(function (btn) {
          btn.setAttribute(
            "aria-pressed",
            btn.getAttribute("data-viewport") === state.viewport ? "true" : "false"
          );
        });
        return;
      }
      var cover = t.closest("[data-cover]");
      if (cover && state.activeId) {
        saveEditorFields();
        outputEngine.setCover(state.activeId, cover.getAttribute("data-cover"));
        renderEditor();
        return;
      }
      var hide = t.closest("[data-toggle-hide]");
      if (hide && state.activeId) {
        var id = hide.getAttribute("data-toggle-hide");
        var proj = activeProject();
        var cur = proj && proj.imageContent && proj.imageContent[id];
        outputEngine.setHidden(state.activeId, id, !(cur && cur.hidden));
        renderEditor();
        return;
      }
      var copy = t.closest("[data-copy-desc]");
      if (copy && state.activeId) {
        var iid = copy.getAttribute("data-copy-desc");
        var proj2 = activeProject();
        var content = (proj2.imageContent && proj2.imageContent[iid]) || {};
        // Copy from public title/description only — never private portfolio notes
        var src = content.title || (proj2.description || "");
        if (src) {
          outputEngine.setImageContent(state.activeId, iid, { caption: src });
          setStatus("Copied user-authored text into the public caption.");
          renderEditor();
        } else {
          setStatus("No user-authored title/description to copy. Write a caption manually.", true);
        }
      }
    });

    document.addEventListener("change", function (ev) {
      var t = ev.target;
      if (!t || !state.activeId) return;
      var shot = t.closest && t.closest(".pfo-shot");
      if (!shot) return;
      var imageId = shot.getAttribute("data-image-id");
      var field = t.getAttribute("data-field");
      if (!field) return;
      var patch = {};
      if (field === "altDecorative") {
        patch.altDecorative = !!t.checked;
        if (t.checked) patch.altText = "";
      } else {
        patch[field] = t.value;
      }
      outputEngine.setImageContent(state.activeId, imageId, patch);
      if (field === "altDecorative") renderEditor();
      else renderValidation();
    });
  }

  function boot() {
    loadLibrary();
    portfolioEngine = global.WaypointScenesPortfolioEngine.getShared();
    outputEngine = global.WaypointScenesPortfolioOutputEngine.getShared();
    return portfolioEngine
      .init()
      .then(function () {
        return outputEngine.init();
      })
      .then(function () {
        bind();
        try {
          var params = new URLSearchParams(global.location.search);
          var projectId = params.get("project");
          var portfolioId = params.get("portfolio");
          if (projectId && outputEngine.get(projectId)) {
            openProject(projectId);
            return;
          }
          if (portfolioId && portfolioEngine.get(portfolioId)) {
            var existing = outputEngine.listForPortfolio(portfolioId);
            if (existing.length) {
              openProject(existing[0].id);
              return;
            }
            var created = outputEngine.createFromPortfolio(portfolioEngine.get(portfolioId), {});
            openProject(created.id);
            setStatus("Started a website gallery from this portfolio.");
            return;
          }
        } catch (e) {
          /* ignore */
        }
        renderHome();
      });
  }

  global.WaypointScenesPortfolioOutputUI = {
    boot: boot,
    getState: function () {
      return state;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
