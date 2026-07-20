/**
 * Shared Savant Sommelier shell — task nav, helpers, page chrome.
 * Prefers WDS.platformUi for escape/loading/error/fetch/task-nav consistency.
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

  function ui() {
    return global.WDS && WDS.platformUi ? WDS.platformUi : null;
  }

  function escapeHtml(str) {
    if (ui()) return ui().escapeHtml(str);
    if (global.WDS && WDS.escapeHtml) return WDS.escapeHtml(str);
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function taskNav(active) {
    if (ui() && ui().taskNav) {
      return ui().taskNav(TASKS, active, {
        ariaLabel: "Savant Sommelier tasks",
        className: "wds-task-nav ss-task-nav"
      });
    }
    return (
      '<nav class="wds-task-nav ss-task-nav" aria-label="Savant Sommelier tasks">' +
      TASKS.map(function (it) {
        var on = it[0] === active ? " is-active" : "";
        return (
          '<a class="wds-task-nav__link ss-task-nav__link' + on + '" href="' + it[1] + '"' +
          (on ? ' aria-current="page"' : "") + ">" + escapeHtml(it[2]) + "</a>"
        );
      }).join("") +
      "</nav>"
    );
  }

  function honestyBanner(text) {
    if (ui() && ui().honestyHtml) return ui().honestyHtml(text);
    return '<p class="wds-honesty ss-honesty">' + escapeHtml(text) + "</p>";
  }

  function loadingHtml(msg) {
    if (ui() && ui().loadingHtml) return ui().loadingHtml(msg);
    return '<p class="wds-loading ss-loading">' + escapeHtml(msg || "Loading…") + "</p>";
  }

  function errorHtml(msg, opts) {
    opts = opts || {};
    if (msg && typeof msg === "object") {
      opts = msg;
      msg = opts.text;
    }
    if (ui() && ui().errorHtml) {
      return ui().errorHtml({
        text: msg || "Something went wrong.",
        title: opts.title,
        kind: opts.kind,
        retry: !!opts.retry,
        retryLabel: opts.retryLabel
      });
    }
    var retry = opts.retry
      ? '<div class="wds-state__actions"><button type="button" class="wds-btn wds-btn--secondary" data-wds-retry">' +
        escapeHtml(opts.retryLabel || "Retry") +
        "</button></div>"
      : "";
    return (
      '<div class="wds-state ss-error" role="alert">' +
      '<p class="wds-error">' + escapeHtml(msg || "Something went wrong.") + "</p>" +
      retry +
      "</div>"
    );
  }

  function bindRetry(root, onRetry) {
    if (!root || typeof onRetry !== "function") return;
    var btn = root.querySelector("[data-wds-retry]");
    if (btn) {
      btn.addEventListener("click", function () {
        onRetry();
      });
    }
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
    if (ui() && ui().getJson) return ui().getJson(url);
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
    bindRetry: bindRetry,
    mountShell: mountShell,
    getJson: getJson
  };
})(typeof window !== "undefined" ? window : globalThis);
