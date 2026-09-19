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

function jsonResponse(status, body) {
  var text = JSON.stringify(body, null, 2);
  return new Response(text, {
    status: status,
    statusText: status === 200 ? "OK" : status === 401 ? "Unauthorized" : status === 404 ? "Not Found" : "",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(new Blob([text]).size),
      "Cache-Control": "no-store"
    }
  });
}

var PRODUCTS = {
  "42": { id: 42, name: "Trail Camera", price: 129.99 },
  "17": { id: 17, name: "Headlamp", price: 34.0 }
};

self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  var path = url.pathname;
  var method = event.request.method;

  if (method === "GET" && /\/search$/.test(path)) {
    var q = url.searchParams.get("q") || "";
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
