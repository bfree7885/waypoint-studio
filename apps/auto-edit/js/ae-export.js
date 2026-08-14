/**
 * Waypoint Auto Edit — export download (local only)
 */
(function (global) {
  "use strict";

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename || "photo-waypoint.jpg";
    a.rel = "noopener";
    if (document.body && document.body.appendChild) document.body.appendChild(a);
    if (typeof a.click === "function") a.click();
    setTimeout(function () {
      try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1500);
    return { url: url, filename: filename };
  }

  /**
   * Export JPEG. GPS: by default strip — we export canvas pixels only (no EXIF GPS written).
   * Behavior is explicit in UI copy.
   */
  function exportEdited(blob, originalFilename) {
    var Models = global.WaypointAutoEditModels;
    var name = Models ? Models.waypointFilename(originalFilename) : "photo-waypoint.jpg";
    downloadBlob(blob, name);
    return {
      filename: name,
      includesGps: false,
      note: "Export is a new JPEG from on-device pixels. Precise GPS is not embedded in the download."
    };
  }

  global.WaypointAutoEditExport = {
    downloadBlob: downloadBlob,
    exportEdited: exportEdited
  };
})(typeof window !== "undefined" ? window : globalThis);
