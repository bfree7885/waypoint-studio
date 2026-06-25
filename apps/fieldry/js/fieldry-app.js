/**
 * Fieldry — app shell, routing, export panel
 */
(function (global) {
  "use strict";

  var mountEl;
  var state = { loc: null, platform: null };

  function parseRoute() {
    var hash = (window.location.hash || "#/").replace(/^#/, "");
    var parts = hash.split("/").filter(Boolean);
    if (!parts.length || parts[0] === "") return { view: "ledger" };
    if (parts[0] === "new") return { view: "new" };
    if (parts[0] === "edit" && parts[1]) return { view: "edit", id: decodeURIComponent(parts[1]) };
    if (parts[0] === "obs" && parts[1]) return { view: "detail", id: decodeURIComponent(parts[1]) };
    return { view: "ledger" };
  }

  function renderHero() {
    return (
      '<header class="fld-hero">' +
        '<p class="wds-eyebrow">Fieldry</p>' +
        '<h1 class="fld-hero__title">Field notebook</h1>' +
        '<p class="fld-hero__lead">A waterproof Rite in the Rain for the digital age — structured observations aligned with the Waypoint Observation Standard. Private. Local. No accounts.</p>' +
      "</header>"
    );
  }

  function renderExportPanel(count) {
    return (
      '<section class="fld-export" aria-labelledby="fld-export-title">' +
        '<h2 class="fld-export__title" id="fld-export-title">Export archive</h2>' +
        '<p class="fld-export__text">' + count + ' observation' + (count === 1 ? "" : "s") + ' on this device. Export follows WOS v1 — JSON for archives, CSV for spreadsheets.</p>' +
        '<div class="fld-export__actions">' +
          '<button type="button" class="wds-btn wds-btn--ghost" id="fld-export-json"' + (count ? "" : " disabled") + ">Export JSON</button>" +
          '<button type="button" class="wds-btn wds-btn--ghost" id="fld-export-csv"' + (count ? "" : " disabled") + ">Export CSV</button>" +
        "</div>" +
        '<p class="fld-export__note">Sharing with researchers is a future capability — exports are for your archive today.</p>' +
      "</section>"
    );
  }

  function renderLedger() {
    var list = global.FieldryStorage.list();
    var stats = global.FieldryStorage.getStats();
    mountEl.innerHTML =
      renderHero() +
      global.FieldryDashboard.render(stats) +
      global.FieldryList.render(list) +
      renderExportPanel(list.length);
    global.FieldryList.bindDelete(mountEl, function (id) {
      global.FieldryStorage.remove(id);
      render();
    });
    bindExport(list);
  }

  function renderNew() {
    var obs = global.FieldryStorage.createDraft(state.platform, state.loc);
    mountEl.innerHTML = renderHero() + global.FieldryForm.render(obs, { isEdit: false });
    var form = mountEl.querySelector("#fld-observation-form");
    global.FieldryForm.bind(form, {
      platform: state.platform,
      loc: state.loc
    });
  }

  function renderEdit(id) {
    var obs = global.FieldryStorage.get(id);
    if (!obs) {
      mountEl.innerHTML = renderHero() + global.FieldryDetail.render(null);
      return;
    }
    mountEl.innerHTML = renderHero() + global.FieldryForm.render(obs, { isEdit: true });
    global.FieldryForm.bind(mountEl.querySelector("#fld-observation-form"), {
      platform: state.platform,
      loc: state.loc
    });
  }

  function renderDetail(id) {
    var obs = global.FieldryStorage.get(id);
    mountEl.innerHTML = renderHero() + global.FieldryDetail.render(obs);
    var del = mountEl.querySelector(".fld-detail__delete");
    if (del) {
      del.addEventListener("click", function () {
        if (window.confirm("Delete this observation from your device?")) {
          global.FieldryStorage.remove(id);
          window.location.hash = "#/";
        }
      });
    }
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

  function render() {
    if (!mountEl) return;
    var route = parseRoute();
    mountEl.setAttribute("aria-busy", "false");
    if (route.view === "new") renderNew();
    else if (route.view === "edit") renderEdit(route.id);
    else if (route.view === "detail") renderDetail(route.id);
    else renderLedger();
    window.scrollTo(0, 0);
  }

  function init() {
    mountEl = document.getElementById("fieldry-app");
    if (!mountEl) return;

    global.FieldryBoot.bootstrapLocation().then(function (loc) {
      state.loc = loc;
      if (global.WDS && global.WDS.wskb) {
        global.WDS.wskb.configure({ base: "../../design-system/species/" });
        return global.WDS.wskb.loadIndex().then(function () { return loc; });
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

  global.FieldryApp = { render: render };
})(window);
