/**
 * Fieldry — app shell, routing
 */
(function (global) {
  "use strict";

  var mountEl;
  var state = { loc: null, platform: null, knowledgeReady: false };

  function parseRoute() {
    var hash = (window.location.hash || "#/").replace(/^#/, "");
    var qIndex = hash.indexOf("?");
    if (qIndex >= 0) hash = hash.slice(0, qIndex);
    var parts = hash.split("/").filter(Boolean);
    if (!parts.length || parts[0] === "") return { view: "home" };
    if (parts[0] === "new") return { view: "new" };
    if (parts[0] === "edit" && parts[1]) return { view: "edit", id: decodeURIComponent(parts[1]) };
    if (parts[0] === "obs" && parts[1]) return { view: "detail", id: decodeURIComponent(parts[1]) };
    if (parts[0] === "life" || parts[0] === "life-list") return { view: "life" };
    if (parts[0] === "history" || parts[0] === "ledger") return { view: "history" };
    if (parts[0] === "stats") return { view: "stats" };
    if (parts[0] === "browse") return { view: "browse" };
    if (parts[0] === "collections") return { view: "collections" };
    if (parts[0] === "knowledge" && parts[1]) return { view: "knowledge", id: decodeURIComponent(parts[1]) };
    return { view: "home" };
  }

  function setDocumentTitle(route) {
    var base = "Fieldry · Waypoint Studio";
    var titles = {
      home: "Fieldry — Life List · Waypoint Studio",
      new: "Record · " + base,
      edit: "Edit · " + base,
      detail: "Observation · " + base,
      life: "Life list · " + base,
      history: "History · " + base,
      stats: "Statistics · " + base,
      browse: "Categories · " + base,
      collections: "Collections · " + base,
      knowledge: "Species profile · " + base
    };
    document.title = titles[route.view] || titles.home;
  }

  function updateNavCurrent(route) {
    var map = {
      home: "#/",
      new: "#/new",
      edit: "#/history",
      detail: "#/history",
      life: "#/life",
      history: "#/history",
      stats: "#/stats",
      browse: "#/browse",
      collections: "#/collections",
      knowledge: "#/life"
    };
    var currentHref = map[route.view] || "#/";
    var links = document.querySelectorAll(".ws-topnav a[href^='#']");
    links.forEach(function (a) {
      var href = a.getAttribute("href");
      if (href === currentHref || (route.view === "home" && href === "#/")) {
        a.setAttribute("aria-current", "page");
      } else {
        a.removeAttribute("aria-current");
      }
    });
  }

  function renderExportPanel(count) {
    if (!count) return "";
    return (
      '<details class="fld-export">' +
        '<summary class="fld-export__title" id="fld-export-title">Export archive</summary>' +
        '<p class="fld-export__text">' + count + " observation" + (count === 1 ? "" : "s") +
          " on this device. Export JSON or CSV for your own archive. Coordinates respect each record’s location precision.</p>" +
        '<div class="fld-export__actions">' +
          '<button type="button" class="wds-btn wds-btn--ghost" id="fld-export-json">Export JSON</button>' +
          '<button type="button" class="wds-btn wds-btn--ghost" id="fld-export-csv">Export CSV</button>' +
        "</div>" +
      "</details>"
    );
  }

  function bindExport(list) {
    var jsonBtn = mountEl.querySelector("#fld-export-json");
    var csvBtn = mountEl.querySelector("#fld-export-csv");
    if (jsonBtn) {
      jsonBtn.addEventListener("click", function () {
        global.FieldryExport.exportJSON(list);
      });
    }
    if (csvBtn) {
      csvBtn.addEventListener("click", function () {
        global.FieldryExport.exportCSV(list);
      });
    }
  }

  function renderHome() {
    var list = global.FieldryStorage.list();
    mountEl.innerHTML = global.FieldryHome.render(list) + renderExportPanel(list.length);
    if (global.FieldryHome.bind) global.FieldryHome.bind(mountEl);
    bindExport(list);
  }

  function renderHistory() {
    var list = global.FieldryStorage.list();
    mountEl.innerHTML = global.FieldryList.render(list) + renderExportPanel(list.length);
    global.FieldryList.bindDelete(mountEl, function (id) {
      global.FieldryStorage.remove(id);
      render();
    });
    if (global.FieldryList.bindFilters) global.FieldryList.bindFilters(mountEl);
    bindExport(list);
  }

  function renderLife() {
    var list = global.FieldryStorage.list();
    mountEl.innerHTML = global.FieldryLifeView.render(list);
    global.FieldryLifeView.bind(mountEl);
  }

  function renderStats() {
    mountEl.innerHTML = global.FieldryStatsView.render(global.FieldryStorage.list());
  }

  function renderBrowse() {
    mountEl.innerHTML = global.FieldryBrowse.render(global.FieldryStorage.list());
  }

  function renderCollections() {
    mountEl.innerHTML = global.FieldryCollections.render();
  }

  function renderNew() {
    var obs = global.FieldryStorage.createDraft(state.platform, state.loc);
    if (!obs) {
      mountEl.innerHTML =
        '<section class="fld-empty"><p class="fld-empty__title">Unable to start a record</p>' +
        '<p class="fld-empty__text">Observation tools did not load. Refresh the page and try again.</p></section>';
      return;
    }
    mountEl.innerHTML = global.FieldryForm.render(obs, { isEdit: false });
    global.FieldryForm.bind(mountEl.querySelector("#fld-observation-form"), {
      platform: state.platform,
      loc: state.loc
    });
  }

  function renderEdit(id) {
    var obs = global.FieldryStorage.get(id);
    if (!obs) {
      mountEl.innerHTML = global.FieldryDetail.render(null);
      return;
    }
    mountEl.innerHTML = global.FieldryForm.render(obs, { isEdit: true });
    global.FieldryForm.bind(mountEl.querySelector("#fld-observation-form"), {
      platform: state.platform,
      loc: state.loc
    });
  }

  function renderDetail(id) {
    var obs = global.FieldryStorage.get(id);
    mountEl.innerHTML = global.FieldryDetail.render(obs);
    if (global.FieldryDetail.bindCollections) {
      global.FieldryDetail.bindCollections(mountEl, obs);
    }
    var del = mountEl.querySelector(".fld-detail__delete");
    if (del) {
      del.addEventListener("click", function () {
        if (window.confirm("Delete this observation from your device?")) {
          global.FieldryStorage.remove(id);
          window.location.hash = "#/history";
        }
      });
    }
  }

  function renderKnowledge(id) {
    global.FieldryKnowledgeView.loadAndRender(mountEl, id, global.FieldryStorage.list());
  }

  function render() {
    if (!mountEl) return;
    var route = parseRoute();
    mountEl.setAttribute("aria-busy", "false");
    setDocumentTitle(route);
    if (global.WDS && global.WDS.appShell && global.WDS.appShell.updateLocalCurrent) {
      global.WDS.appShell.updateLocalCurrent();
    } else {
      updateNavCurrent(route);
    }
    if (route.view === "new") renderNew();
    else if (route.view === "edit") renderEdit(route.id);
    else if (route.view === "detail") renderDetail(route.id);
    else if (route.view === "life") renderLife();
    else if (route.view === "history") renderHistory();
    else if (route.view === "stats") renderStats();
    else if (route.view === "browse") renderBrowse();
    else if (route.view === "collections") renderCollections();
    else if (route.view === "knowledge") renderKnowledge(route.id);
    else renderHome();
    window.scrollTo(0, 0);
  }

  function bootKnowledge() {
    var K = global.WDS && global.WDS.knowledge;
    if (!K) return Promise.resolve(false);
    K.configure({ base: "../../design-system/knowledge/" });
    if (global.WDS.knowledgeRelationships && global.WDS.knowledgeRelationships.configure) {
      global.WDS.knowledgeRelationships.configure({ base: "../../design-system/knowledge/" });
    }
    return K.preloadDemo().then(function () {
      state.knowledgeReady = true;
      return true;
    }).catch(function () {
      state.knowledgeReady = false;
      return false;
    });
  }

  function init() {
    mountEl = document.getElementById("fieldry-app");
    if (!mountEl) return;

    if (global.FieldryStorage && global.FieldryStorage.migrateAll) {
      global.FieldryStorage.migrateAll(false);
    }

    if (global.WDS && global.WDS.appShell && global.WDS.appShell.updateLocalCurrent) {
      /* App shell owns chrome; keep hash feature state in sync */
    } else if (global.WDS && global.WDS.platformShell && global.WDS.platformShell.mount) {
      global.WDS.platformShell.mount({
        currentId: "fieldry",
        productName: "Fieldry",
        depth: 1
      });
    }

    render();

    global.FieldryBoot.bootstrapLocation().then(function (loc) {
      state.loc = loc;
      return bootKnowledge().then(function () { return loc; });
    }).then(function (loc) {
      state.loc = loc;
      if (global.WDS && global.WDS.wskb) {
        global.WDS.wskb.configure({ base: "../../design-system/species/" });
        return global.WDS.wskb.loadIndex().catch(function () { return null; }).then(function () { return loc; });
      }
      return loc;
    }).then(function (loc) {
      state.loc = loc;
      return global.FieldryBoot.fetchPlatform(loc).catch(function () { return null; });
    }).then(function (platform) {
      state.platform = platform;
      global.FieldryBoot.bindRegionChange(mountEl, function (newLoc) {
        state.loc = newLoc;
        global.FieldryBoot.fetchPlatform(newLoc).then(function (p) {
          state.platform = p;
        });
      });
      render();
    }).catch(function () {
      render();
    });

    window.addEventListener("hashchange", render);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.FieldryApp = { render: render, parseRoute: parseRoute };
})(typeof window !== "undefined" ? window : global);
