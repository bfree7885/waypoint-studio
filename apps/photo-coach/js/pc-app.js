/**
 * Photo Coach — application orchestration (no analysis or render logic).
 */
(function (global) {
  "use strict";

  var state = {
    loadResult: null,
    critique: null,
    historyId: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(msg, isError) {
    var el = $("pc-status");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("pc-status--error", !!isError);
  }

  function refreshHistory() {
    var mount = $("pc-history");
    var Store = global.PhotoCoachHistoryStore;
    var Render = global.PhotoCoachCritiqueRenderer;
    if (!mount || !Store || !Render) return;
    mount.innerHTML = Render.renderHistoryList(Store.list());
    bindHistory();
  }

  function showCritique(critique, imageUrl) {
    var workspace = $("pc-workspace");
    var Render = global.PhotoCoachCritiqueRenderer;
    if (!workspace || !Render) return;
    workspace.hidden = false;
    workspace.innerHTML = Render.renderCritique(critique, imageUrl);
    workspace.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearCurrentLoad() {
    if (state.loadResult && state.loadResult.revoke) {
      state.loadResult.revoke();
    }
    state.loadResult = null;
  }

  function analyzeFile(file) {
    var Loader = global.PhotoCoachImageLoader;
    var Meta = global.PhotoCoachImageMetadata;
    var Engine = global.PhotoCoachAnalysisEngine;
    var Store = global.PhotoCoachHistoryStore;

    if (!Loader || !Meta || !Engine || !Store) {
      setStatus("Photo Coach modules failed to load. Refresh the page.", true);
      return Promise.resolve();
    }

    var check = Loader.validateFile(file);
    if (!check.ok) {
      setStatus(check.message, true);
      return Promise.resolve();
    }

    setStatus("Loading image…");
    clearCurrentLoad();

    return Loader.loadImage(file)
      .then(function (loadResult) {
        state.loadResult = loadResult;
        setStatus("Reading metadata…");
        return Meta.collect(loadResult);
      })
      .then(function (metaPack) {
        setStatus("Analyzing photograph…");
        return Engine.analyzeLoadedImage(state.loadResult, metaPack.metadata).then(function (critique) {
          return { critique: critique, metaPack: metaPack };
        });
      })
      .then(function (result) {
        state.critique = result.critique;
        showCritique(result.critique, state.loadResult.url);
        setStatus("Saving critique locally…");
        return Store.save({
          id: result.critique.id,
          filename: result.critique.filename,
          score: result.critique.score,
          critique: result.critique,
          thumbnailSource: state.loadResult.url
        });
      })
      .then(function (record) {
        state.historyId = record.id;
        refreshHistory();
        setStatus("Analysis complete — saved on this device.");
      })
      .catch(function (err) {
        clearCurrentLoad();
        setStatus(err && err.message ? err.message : "Analysis failed.", true);
      });
  }

  function openHistory(id) {
    var Store = global.PhotoCoachHistoryStore;
    var record = Store && Store.get ? Store.get(id) : null;
    if (!record || !record.critique) return;
    clearCurrentLoad();
    state.critique = record.critique;
    state.historyId = record.id;
    var url = record.thumbnail || null;
    showCritique(record.critique, url);
    setStatus("Opened saved analysis from " + (record.filename || "your library") + ".");
  }

  function deleteHistory(id) {
    var Store = global.PhotoCoachHistoryStore;
    if (Store && Store.remove) Store.remove(id);
    if (state.historyId === id) {
      var workspace = $("pc-workspace");
      if (workspace) {
        workspace.hidden = true;
        workspace.innerHTML = "";
      }
      state.critique = null;
      state.historyId = null;
    }
    refreshHistory();
    setStatus("Analysis removed from local history.");
  }

  function bindHistory() {
    var mount = $("pc-history");
    if (!mount) return;
    mount.querySelectorAll(".pc-history__open").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openHistory(btn.getAttribute("data-id"));
      });
    });
    mount.querySelectorAll(".pc-history__delete").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        deleteHistory(btn.getAttribute("data-id"));
      });
    });
  }

  function bindUpload() {
    var input = $("pc-file");
    var drop = $("pc-drop");
    if (!input || !drop) return;

    drop.addEventListener("click", function () { input.click(); });
    drop.addEventListener("dragover", function (e) {
      e.preventDefault();
      drop.classList.add("pc-drop--hover");
    });
    drop.addEventListener("dragleave", function () {
      drop.classList.remove("pc-drop--hover");
    });
    drop.addEventListener("drop", function (e) {
      e.preventDefault();
      drop.classList.remove("pc-drop--hover");
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) analyzeFile(file);
    });
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (file) analyzeFile(file);
      input.value = "";
    });
  }

  function init() {
    var mount = $("photo-coach-app");
    var Render = global.PhotoCoachCritiqueRenderer;
    if (!mount || !Render) return;

    mount.innerHTML = Render.renderShell();
    mount.setAttribute("aria-busy", "false");
    bindUpload();
    refreshHistory();
  }

  global.PhotoCoachApp = {
    init: init,
    analyzeFile: analyzeFile
  };
})(window);
