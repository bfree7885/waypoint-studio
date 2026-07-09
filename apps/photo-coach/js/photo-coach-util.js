/**
 * Photo Coach — shared utilities
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function num(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return num(val.value);
    return null;
  }

  function levelClass(level) {
    if (!level) return "";
    return "pc-level--" + String(level).toLowerCase().replace(/\s+/g, "-");
  }

  function monthName(d) {
    return d.toLocaleString("en-US", { month: "long" });
  }

  function seasonForMonth(m) {
    if (m >= 3 && m <= 5) return "spring";
    if (m >= 6 && m <= 8) return "summer";
    if (m >= 9 && m <= 11) return "fall";
    return "winter";
  }

  global.PhotoCoachUtil = {
    escapeHtml: escapeHtml,
    num: num,
    levelClass: levelClass,
    monthName: monthName,
    seasonForMonth: seasonForMonth
  };
})(window);
