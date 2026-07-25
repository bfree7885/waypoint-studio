/**
 * Shared formatting helpers for Scene Library UI.
 */
(function (global) {
  "use strict";

  var MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  var MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseDate(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatLongDate(iso) {
    var d = parseDate(iso);
    if (!d) return "Date unknown";
    return MONTHS[d.getUTCMonth()] + " " + d.getUTCDate() + ", " + d.getUTCFullYear();
  }

  function formatShortDate(iso) {
    var d = parseDate(iso);
    if (!d) return "—";
    return MONTHS_SHORT[d.getUTCMonth()] + " " + d.getUTCDate() + ", " + d.getUTCFullYear();
  }

  function formatRelative(iso) {
    var d = parseDate(iso);
    if (!d) return "Never opened";
    var now = Date.now();
    var diff = now - d.getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return mins + " min ago";
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.floor(hrs / 24);
    if (days < 14) return days + "d ago";
    return formatShortDate(iso);
  }

  function photoCountLabel(n) {
    var count = n == null ? 0 : n;
    return count + (count === 1 ? " photograph" : " photographs");
  }

  function statusLabel(status) {
    switch (status) {
      case "imported": return "Imported";
      case "reviewing": return "In review";
      case "reviewed": return "Reviewed";
      case "archived": return "Archived";
      default: return status || "—";
    }
  }

  function capabilityLabel(status) {
    switch (status) {
      case "not-started": return "Not started";
      case "in-progress": return "In progress";
      case "ready": return "Ready";
      case "complete": return "Complete";
      default: return status || "—";
    }
  }

  function analysisBadge(status) {
    var label = capabilityLabel(status);
    var cls = status === "ready" || status === "complete" ? "is-ready"
      : status === "in-progress" ? "is-progress"
      : "is-idle";
    return { label: label, className: cls };
  }

  global.WaypointSceneFormat = {
    escapeHtml: escapeHtml,
    formatLongDate: formatLongDate,
    formatShortDate: formatShortDate,
    formatRelative: formatRelative,
    photoCountLabel: photoCountLabel,
    statusLabel: statusLabel,
    capabilityLabel: capabilityLabel,
    analysisBadge: analysisBadge
  };
})(typeof window !== "undefined" ? window : globalThis);
