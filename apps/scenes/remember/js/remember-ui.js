/**
 * Scenes Remember — light hub/placeholder wiring (no full journal UX).
 */
(function () {
  "use strict";

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function mountCatalog(listEl, catalog) {
    if (!listEl || !catalog || !Array.isArray(catalog.types)) return;
    listEl.innerHTML = "";
    catalog.types
      .filter(function (t) {
        return t.kind !== "hub";
      })
      .forEach(function (t) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = t.href;
        a.innerHTML =
          "<strong>" +
          t.label +
          "</strong><span>" +
          (t.summary || "") +
          "</span>";
        li.appendChild(a);
        listEl.appendChild(li);
      });
  }

  function wirePrintDemo(button) {
    if (!button) return;
    button.addEventListener("click", function () {
      var model = window.WaypointScenesRemember && window.WaypointScenesRemember.model;
      var print = window.WaypointScenesRemember && window.WaypointScenesRemember.print;
      var status = document.querySelector("[data-remember-print-status]");
      if (!model || !print) {
        if (status) status.textContent = "Print pipeline scripts not loaded.";
        return;
      }
      var type = button.getAttribute("data-remember-type") || "outdoor-journal";
      var doc = model.createDocument({
        type: type,
        title: button.getAttribute("data-remember-title") || "Remember foundation preview",
        sections: [
          {
            id: "sec-1",
            title: "Foundation note",
            body: "This is a print-pipeline stub. No full journal or book generator ships in this sprint."
          }
        ]
      });
      var pdf = print.exportPdfStub(doc);
      var preview = print.createPrintJob(doc, { status: "preview" });
      if (status) {
        status.textContent =
          "PDF: not implemented (" +
          (pdf.reason || "stub") +
          "). Print job " +
          (preview.job && preview.job.id) +
          " · ~" +
          (preview.job && preview.job.pageEstimate) +
          " page(s) estimated.";
      }
    });
  }

  function boot() {
    var list = $("[data-remember-catalog]");
    if (list) {
      fetch("data/remember-catalog.json")
        .then(function (r) {
          return r.json();
        })
        .then(function (catalog) {
          mountCatalog(list, catalog);
        })
        .catch(function () {
          /* static fallback already in HTML */
        });
    }
    wirePrintDemo($("[data-remember-print-demo]"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
