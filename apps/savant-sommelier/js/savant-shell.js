/**
 * Shared Savant Sommelier shell — task nav, helpers, page chrome.
 */
(function (global) {
  "use strict";

  var TASKS = [
    ["discover", "index.html", "Discover"],
    ["learn", "learn.html", "Learn"],
    ["cellar", "cellar.html", "My Cellar"],
    ["vineyard", "vineyard.html", "Vineyard Intelligence"],
    ["settings", "settings.html", "Settings"]
  ];

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function taskNav(active) {
    return (
      '<nav class="ss-task-nav" aria-label="Savant Sommelier tasks">' +
      TASKS.map(function (it) {
        var on = it[0] === active ? " is-active" : "";
        return (
          '<a class="ss-task-nav__link' + on + '" href="' + it[1] + '"' +
          (on ? ' aria-current="page"' : "") + ">" + escapeHtml(it[2]) + "</a>"
        );
      }).join("") +
      "</nav>"
    );
  }

  function honestyBanner(text) {
    return '<p class="ss-honesty">' + escapeHtml(text) + "</p>";
  }

  function loadingHtml(msg) {
    return '<p class="ss-loading">' + escapeHtml(msg || "Loading…") + "</p>";
  }

  function errorHtml(msg) {
    return '<p class="ss-error" role="alert">' + escapeHtml(msg || "Something went wrong.") + "</p>";
  }

  function mountShell() {
    if (global.WDS && WDS.appShell) {
      WDS.appShell.mount({
        appId: "savant-sommelier",
        productName: "Savant Sommelier",
        shellDepth: 1
      });
    }
  }

  function getJson(url) {
    if (global.SavantFetch) return SavantFetch.getJson(url);
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url);
      return r.json().then(function (data) {
        return { data: data, freshness: { source: "network", ageMs: 0 } };
      });
    });
  }

  global.SavantShell = {
    TASKS: TASKS,
    escapeHtml: escapeHtml,
    taskNav: taskNav,
    honestyBanner: honestyBanner,
    loadingHtml: loadingHtml,
    errorHtml: errorHtml,
    mountShell: mountShell,
    getJson: getJson
  };
})(typeof window !== "undefined" ? window : globalThis);
