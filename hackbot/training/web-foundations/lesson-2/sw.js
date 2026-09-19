/**
 * Trail Supply training handler — local synthetic HTTP only.
 * Intercepts search, login, and product fetches so the Network panel
 * can show request/response pairs without a backend.
 */
"use strict";

self.addEventListener("install", function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

function jsonResponse(status, body, extraHeaders) {
  var text = JSON.stringify(body, null, 2);
  var statusText =
    status === 200
      ? "OK"
      : status === 302
        ? "Found"
        : status === 401
          ? "Unauthorized"
          : status === 403
            ? "Forbidden"
            : status === 404
              ? "Not Found"
              : status === 500
                ? "Internal Server Error"
                : "";
  var headers = {
    "Content-Type": "application/json",
    "Content-Length": String(new Blob([text]).size),
    "Cache-Control": "no-store"
  };
  if (extraHeaders) {
    Object.keys(extraHeaders).forEach(function (key) {
      headers[key] = extraHeaders[key];
    });
  }
  return new Response(text, {
    status: status,
    statusText: statusText,
    headers: headers
  });
}

function redirectResponse(locationUrl) {
  return new Response(null, {
    status: 302,
    statusText: "Found",
    headers: {
      Location: locationUrl,
      "Cache-Control": "no-store"
    }
  });
}

var PRODUCTS = {
  "42": { id: 42, name: "Trail Camera", price: 129.99 },
  "17": { id: 17, name: "Headlamp", price: 34.0 }
};

// Deterministic synthetic demo cookie for Lesson 7 — not auth, not credentials.
var DEMO_SESSION_NAME = "trail_session";
var DEMO_SESSION_VALUE = "demo-trail-7";
var DEMO_COOKIE_PAIR = DEMO_SESSION_NAME + "=" + DEMO_SESSION_VALUE;
var DEMO_SET_COOKIE =
  DEMO_COOKIE_PAIR +
  "; Path=/hackbot/training/web-foundations/lesson-2; Max-Age=3600; SameSite=Lax";
var DEMO_CLEAR_COOKIE =
  DEMO_SESSION_NAME +
  "=; Path=/hackbot/training/web-foundations/lesson-2; Max-Age=0; SameSite=Lax";

function hasDemoSession(request) {
  // Service workers cannot read the browser Cookie header on FetchEvent.request.
  // Trail Supply accepts a training mirror header with the same name=value pair.
  var mirror = request.headers.get("X-Trail-Training-Cookie") || "";
  return mirror.indexOf(DEMO_COOKIE_PAIR) !== -1;
}

self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  var path = url.pathname;
  var method = event.request.method;

  // Lesson 7 — synthetic session lab (local only).
  // Limitation: SW Responses cannot reliably expose Set-Cookie (forbidden header),
  // and SW cannot read Cookie on FetchEvent.request. We emit training-mirror
  // headers that carry the same strings real Set-Cookie / Cookie would use.
  if (method === "GET" && /\/session\/start$/.test(path)) {
    event.respondWith(
      jsonResponse(
        200,
        {
          training: true,
          action: "start",
          session: "created",
          cookieName: DEMO_SESSION_NAME,
          cookieValue: DEMO_SESSION_VALUE,
          setCookieLine: DEMO_SET_COOKIE,
          note:
            "Synthetic demo session (not authentication). Real servers use Set-Cookie; this service-worker lab exposes the same line as X-Training-Set-Cookie and setCookieLine because Set-Cookie is a forbidden SW response header. Trail Supply also mirrors via document.cookie for Application → Cookies."
        },
        { "X-Training-Set-Cookie": DEMO_SET_COOKIE }
      )
    );
    return;
  }

  if (method === "GET" && /\/session\/status$/.test(path)) {
    var recognized = hasDemoSession(event.request);
    event.respondWith(
      jsonResponse(200, {
        training: true,
        action: "status",
        session: recognized ? "recognized" : "none",
        cartItems: recognized ? 0 : null,
        cookieSeen: recognized,
        note: recognized
          ? "Synthetic demo session recognized via X-Trail-Training-Cookie mirror (SW cannot read Cookie)."
          : "No demo session mirror header on this request."
      })
    );
    return;
  }

  if (method === "GET" && /\/session\/clear$/.test(path)) {
    event.respondWith(
      jsonResponse(
        200,
        {
          training: true,
          action: "clear",
          session: "cleared",
          setCookieLine: DEMO_CLEAR_COOKIE,
          note: "Synthetic clear. Trail Supply also clears document.cookie for the demo name."
        },
        { "X-Training-Set-Cookie": DEMO_CLEAR_COOKIE }
      )
    );
    return;
  }

  // Synthetic redirect for Lesson 5 — local only, lands on product 42.
  if (method === "GET" && /\/go\/camera$/.test(path)) {
    // Resolve against the lesson scope, not /go/, so Location is .../products/42.
    var dest = new URL("products/42", url.origin + path.replace(/\/go\/camera$/, "/")).href;
    event.respondWith(redirectResponse(dest));
    return;
  }

  if (method === "GET" && /\/search$/.test(path)) {
    var q = url.searchParams.get("q") || "";
    var sort = url.searchParams.get("sort") || "";
    var params = {};
    url.searchParams.forEach(function (value, key) {
      params[key] = value;
    });
    var items = [];
    if (q.toLowerCase() === "boots") {
      items = [PRODUCTS["42"], PRODUCTS["17"]];
    } else {
      Object.keys(PRODUCTS).forEach(function (id) {
        var item = PRODUCTS[id];
        if (q && item.name.toLowerCase().indexOf(q.toLowerCase()) !== -1) {
          items.push(item);
        }
      });
    }
    event.respondWith(
      jsonResponse(200, {
        query: q,
        sort: sort || null,
        params: params,
        results: items,
        note: "Synthetic search result. Local training only."
      })
    );
    return;
  }

  if (method === "POST" && /\/login$/.test(path)) {
    event.respondWith(
      event.request
        .clone()
        .text()
        .then(function () {
          return jsonResponse(401, { error: "Invalid credentials" });
        })
        .catch(function () {
          return jsonResponse(401, { error: "Invalid credentials" });
        })
    );
    return;
  }

  if (method === "GET" && /\/products\/(\d+)$/.test(path)) {
    var id = path.match(/\/products\/(\d+)$/)[1];
    if (PRODUCTS[id]) {
      event.respondWith(jsonResponse(200, PRODUCTS[id]));
    } else {
      event.respondWith(jsonResponse(404, { error: "Not found" }));
    }
  }
});
