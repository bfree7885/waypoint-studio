/**
 * Scenes Remember pillar — print pipeline foundation (stubs).
 * Provides print-ready HTML hooks and PDF export stubs. No full book generator.
 */
(function (global) {
  "use strict";

  function uid(prefix) {
    return (prefix || "print") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * @typedef {Object} RememberPrintJob
   * @property {string} id
   * @property {string} documentId
   * @property {string} status  draft | preview | queued | failed | complete-stub
   * @property {string} format
   * @property {string} orientation
   * @property {number} pageEstimate
   * @property {string} createdAt
   * @property {string} [note]
   */

  function estimatePages(doc) {
    var photos = (doc && doc.photoRefs && doc.photoRefs.length) || 0;
    var sections = (doc && doc.sections && doc.sections.length) || 0;
    return Math.max(1, sections + Math.ceil(photos / 2));
  }

  function createPrintJob(doc, options) {
    var opts = options || {};
    var model = global.WaypointScenesRemember && global.WaypointScenesRemember.model;
    if (model) {
      var check = model.validateDocument(doc);
      if (!check.ok) {
        return {
          ok: false,
          errors: check.errors,
          job: null
        };
      }
    }
    var job = {
      id: uid("job"),
      documentId: doc.id,
      status: opts.status || "draft",
      format: (doc.print && doc.print.format) || "letter",
      orientation: (doc.print && doc.print.orientation) || "portrait",
      pageEstimate: estimatePages(doc),
      createdAt: new Date().toISOString(),
      note: "Print pipeline foundation — PDF book generator not implemented."
    };
    return { ok: true, errors: [], job: job };
  }

  /**
   * Build a minimal print-ready HTML document for browser print / future PDF.
   * Intentionally plain — no designer chrome.
   */
  function renderPrintPreviewHtml(doc) {
    var title = escapeHtml((doc && doc.title) || "Untitled");
    var type = escapeHtml((doc && doc.type) || "outdoor-journal");
    var sections = (doc && doc.sections) || [];
    var photos = (doc && doc.photoRefs) || [];
    var body = sections
      .map(function (section) {
        return (
          "<section class=\"remember-print-section\">" +
          "<h2>" +
          escapeHtml(section.title || "Section") +
          "</h2>" +
          "<p>" +
          escapeHtml(section.body || "") +
          "</p>" +
          "</section>"
        );
      })
      .join("\n");
    if (!body) {
      body =
        "<p class=\"remember-print-empty\">No sections yet. This preview is a foundation stub.</p>";
    }
    var photoList =
      photos.length === 0
        ? "<p class=\"remember-print-empty\">No photographs linked yet.</p>"
        : "<ul>" +
          photos
            .map(function (ref) {
              return (
                "<li>" +
                escapeHtml(ref.caption || ref.id || "photo") +
                (ref.libraryId ? " <code>" + escapeHtml(ref.libraryId) + "</code>" : "") +
                "</li>"
              );
            })
            .join("") +
          "</ul>";

    return (
      "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\">" +
      "<title>" +
      title +
      " — print preview</title>" +
      "<style>" +
      "body{font-family:Georgia,serif;margin:1.5rem;color:#111;}" +
      "h1{font-size:1.6rem;margin-bottom:.25rem;}" +
      ".meta{color:#555;font-size:.9rem;margin-bottom:1.5rem;}" +
      "@media print{body{margin:0}}" +
      "</style></head><body>" +
      "<header><h1>" +
      title +
      "</h1><p class=\"meta\">Remember · " +
      type +
      " · foundation preview</p></header>" +
      body +
      "<h2>Photographs</h2>" +
      photoList +
      "<footer class=\"meta\"><p>Waypoint Scenes · Remember print pipeline stub — not a finished book.</p></footer>" +
      "</body></html>"
    );
  }

  /**
   * Open print dialog when possible; otherwise return a structured stub result.
   */
  function requestPrint(doc) {
    var created = createPrintJob(doc, { status: "preview" });
    if (!created.ok) return created;

    if (typeof window === "undefined" || typeof window.print !== "function") {
      created.job.status = "queued";
      return {
        ok: true,
        printed: false,
        reason: "window.print unavailable — job left as queued stub",
        job: created.job
      };
    }

    try {
      var html = renderPrintPreviewHtml(doc);
      var frame = document.createElement("iframe");
      frame.setAttribute("title", "Remember print preview");
      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "0";
      document.body.appendChild(frame);
      var win = frame.contentWindow;
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
      setTimeout(function () {
        if (frame.parentNode) frame.parentNode.removeChild(frame);
      }, 1000);
      created.job.status = "complete-stub";
      return { ok: true, printed: true, job: created.job };
    } catch (err) {
      created.job.status = "failed";
      return {
        ok: false,
        printed: false,
        reason: String(err && err.message ? err.message : err),
        job: created.job
      };
    }
  }

  /**
   * PDF export is intentionally not implemented in this foundation sprint.
   */
  function exportPdfStub(doc) {
    var created = createPrintJob(doc, { status: "draft" });
    return {
      ok: false,
      implemented: false,
      mime: "application/pdf",
      reason: "PDF export not implemented — print pipeline foundation only",
      job: created.job || null,
      documentId: doc && doc.id
    };
  }

  var api = {
    createPrintJob: createPrintJob,
    renderPrintPreviewHtml: renderPrintPreviewHtml,
    requestPrint: requestPrint,
    exportPdfStub: exportPdfStub,
    estimatePages: estimatePages
  };

  global.WaypointScenesRemember = global.WaypointScenesRemember || {};
  global.WaypointScenesRemember.print = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
