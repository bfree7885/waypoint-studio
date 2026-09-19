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

  var DEMO_COOKIE_NAME = "trail_session";
  var DEMO_COOKIE_VALUE = "demo-trail-7";
  var DEMO_COOKIE_PATH = "/hackbot/training/web-foundations/lesson-2";
  var DEMO_COOKIE_PAIR = DEMO_COOKIE_NAME + "=" + DEMO_COOKIE_VALUE;

  function mirrorDemoCookie() {
    document.cookie =
      DEMO_COOKIE_PAIR +
      "; Path=" +
      DEMO_COOKIE_PATH +
      "; Max-Age=3600; SameSite=Lax";
  }

  function clearMirroredDemoCookie() {
    document.cookie =
      DEMO_COOKIE_NAME + "=; Path=" + DEMO_COOKIE_PATH + "; Max-Age=0; SameSite=Lax";
  }

  function hasMirroredDemoCookie() {
    var parts = String(document.cookie || "").split(";");
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].trim() === DEMO_COOKIE_PAIR) return true;
    }
    return false;
  }

  function sessionFetch(relative) {
    var headers = {};
    // SW cannot read Cookie on FetchEvent.request — mirror the same pair for status recognition.
    if (hasMirroredDemoCookie()) {
      headers["X-Trail-Training-Cookie"] = DEMO_COOKIE_PAIR;
    }
    return send(trainingUrl(relative), {
      method: "GET",
      credentials: "same-origin",
      headers: headers
    });
  }

  var sessionStatusBtn = document.getElementById("session-status");
  if (sessionStatusBtn) {
    sessionStatusBtn.addEventListener("click", function () {
      note(
        "Sending GET session/status (synthetic). If a demo session exists, Network shows X-Trail-Training-Cookie mirroring Cookie: " +
          DEMO_COOKIE_PAIR +
          "."
      );
      sessionFetch("session/status").catch(function (err) {
        note("Session status failed: " + (err && err.message ? err.message : String(err)));
      });
    });
  }

  var sessionStartBtn = document.getElementById("session-start");
  if (sessionStartBtn) {
    sessionStartBtn.addEventListener("click", function () {
      note(
        "Sending GET session/start. Inspect X-Training-Set-Cookie (training mirror of Set-Cookie) and Application → Cookies after the page mirrors trail_session."
      );
      sessionFetch("session/start")
        .then(function () {
          mirrorDemoCookie();
          note(
            "Demo session started. Network: X-Training-Set-Cookie / setCookieLine. Application → Cookies: trail_session. Then Check session status."
          );
        })
        .catch(function (err) {
          note("Session start failed: " + (err && err.message ? err.message : String(err)));
        });
    });
  }

  var sessionClearBtn = document.getElementById("session-clear");
  if (sessionClearBtn) {
    sessionClearBtn.addEventListener("click", function () {
      note("Clearing mirrored demo cookie and sending GET session/clear (synthetic).");
      clearMirroredDemoCookie();
      sessionFetch("session/clear").catch(function (err) {
        note("Session clear failed: " + (err && err.message ? err.message : String(err)));
      });
    });
  }

  var redirectBtn = document.getElementById("redirect-demo");
  if (redirectBtn) {
    redirectBtn.addEventListener("click", function () {
      var rel = redirectBtn.getAttribute("data-path") || "go/camera";
      note(
        "Sending GET " +
          rel +
          " (synthetic 302 → products/42). Watch Network for the redirect and Location header."
      );
      // Default redirect: 'follow' so DevTools can show the 302 then the final product request.
      send(trainingUrl(rel), { method: "GET" })
        .then(function (result) {
          note(
            "Redirect sequence finished at status " +
              result.res.status +
              ". Inspect the 302 and the followed products/42 request in Network."
          );
        })
        .catch(function (err) {
          note("Redirect demo failed: " + (err && err.message ? err.message : String(err)));
        });
    });
  }

  var paramBtn = document.getElementById("param-demo");
  if (paramBtn) {
    paramBtn.addEventListener("click", function () {
      var query = paramBtn.getAttribute("data-query") || "q=boots&sort=price";
      note(
        "Sending GET search?" +
          query +
          " (synthetic multi-parameter demo). Watch Network for q and sort."
      );
      send(trainingUrl("search?" + query), { method: "GET" }).catch(function (err) {
        note("Parameter demo failed: " + (err && err.message ? err.message : String(err)));
      });
    });
  }

  function readyMessage() {
    note(
      "Trail Supply script loaded (js/app.js). Search, sign-in, products, redirect, parameter, and session demos generate local Network requests."
    );
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
