/**
 * Trail Supply client — local training only.
 * HTML form actions/hrefs stay inspectable. Submits use fetch so the
 * Network panel shows synthetic GET/POST pairs (handled by sw.js).
 */
(function () {
  "use strict";

  var statusEl = document.getElementById("store-status");
  var metaEl = document.getElementById("result-meta");
  var bodyEl = document.getElementById("result-body");
  var panelEl = document.getElementById("result-panel");

  function note(message) {
    if (statusEl) statusEl.textContent = message;
  }

  function showResult(status, contentType, bodyText) {
    if (panelEl) panelEl.hidden = false;
    if (metaEl) {
      metaEl.textContent = "Status " + status + (contentType ? " · " + contentType : "");
    }
    if (bodyEl) bodyEl.textContent = bodyText;
  }

  function trainingUrl(relative) {
    return new URL(relative, window.location.href);
  }

  function send(url, options) {
    return fetch(url, options).then(function (res) {
      return res.text().then(function (text) {
        var type = res.headers.get("Content-Type") || "";
        showResult(res.status, type, text);
        return { res: res, text: text };
      });
    });
  }

  var searchForm = document.getElementById("search-form");
  if (searchForm) {
    searchForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var q = searchForm.elements.q ? String(searchForm.elements.q.value || "").trim() : "";
      if (!q) q = "boots";
      note("Sending GET search?q=" + q + " (synthetic, local). Watch the Network panel.");
      send(trainingUrl("search?q=" + encodeURIComponent(q)), { method: "GET" }).catch(function (err) {
        note("Search request failed: " + (err && err.message ? err.message : String(err)));
      });
    });
  }

  var loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var username = loginForm.elements.username ? String(loginForm.elements.username.value || "") : "";
      var password = loginForm.elements.password ? String(loginForm.elements.password.value || "") : "";
      note("Sending POST login with a JSON body (synthetic, local). No credentials leave this browser.");
      send(trainingUrl("login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, password: password })
      }).catch(function (err) {
        note("Login request failed: " + (err && err.message ? err.message : String(err)));
      });
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll("a.product-link"), function (link) {
    link.addEventListener("click", function (ev) {
      ev.preventDefault();
      var id = link.getAttribute("data-product-id") || "";
      note("Sending GET products/" + id + " (synthetic, local). Watch the Network panel.");
      send(trainingUrl("products/" + id), { method: "GET" }).catch(function (err) {
        note("Product request failed: " + (err && err.message ? err.message : String(err)));
      });
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll(".store-nav a"), function (link) {
    link.addEventListener("click", function (ev) {
      ev.preventDefault();
      note("Synthetic nav link: " + link.getAttribute("href") + " — this training page does not navigate away.");
    });
  });

  function readyMessage() {
    note("Trail Supply script loaded (js/app.js). Search, sign-in, and product links generate local Network requests.");
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .then(function () {
        return navigator.serviceWorker.ready;
      })
      .then(function () {
        readyMessage();
      })
      .catch(function (err) {
        note("Training network handler did not register: " + (err && err.message ? err.message : String(err)));
      });
  } else {
    note("This browser has no service worker. Search and login will not show synthetic HTTP responses.");
  }
})();
