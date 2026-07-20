/**
 * Waypoint Studio — Articles index (search prep + hub rendering)
 * Loads /articles/manifest.json and registers a platformSearch provider when available.
 */
(function (global) {
  "use strict";

  var cache = null;

  function esc(s) {
    if (global.WDS && WDS.escapeHtml) return WDS.escapeHtml(s);
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function manifestUrl(depth) {
    depth = depth == null ? 0 : depth;
    if (depth <= 0) return "articles/manifest.json";
    if (depth === 1) return "../articles/manifest.json";
    return "../../articles/manifest.json";
  }

  function hrefFor(path, options) {
    options = options || {};
    var base = options.base != null ? options.base : (options.depth === 0 ? "articles/" : "");
    if (path.indexOf("samples/") === 0 || path.indexOf("categories/") === 0) {
      return base + path;
    }
    return base + path;
  }

  function loadManifest(options) {
    options = options || {};
    if (cache) return Promise.resolve(cache);
    var url = options.url || manifestUrl(options.depth);
    return fetch(url, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("articles manifest HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        cache = data;
        registerSearch(data, options);
        return data;
      });
  }

  function registerSearch(data, options) {
    var Search = global.WDS && global.WDS.platformSearch;
    if (!Search || !Search.register || Search._articlesRegistered) return;
    Search.register({
      id: "articles",
      search: function (query, tokens, opts) {
        opts = opts || {};
        var depth = opts.depth != null ? opts.depth : 0;
        var prefix = depth <= 0 ? "articles/" : (depth === 1 ? "../articles/" : "../../articles/");
        return (data.articles || [])
          .map(function (a) {
            var blob = [a.title, a.summary, (a.tags || []).join(" "), a.category, (a.apps || []).join(" ")].join(" ");
            var score = 0;
            var lower = blob.toLowerCase();
            (tokens || []).forEach(function (t) {
              if (lower.indexOf(t) >= 0) score += 2;
            });
            if (score <= 0) return null;
            return {
              id: "article:" + a.id,
              group: "articles",
              title: a.title,
              subtitle: a.summary,
              href: prefix + (a.path || ("samples/" + a.slug + ".html")),
              score: score,
              source: "articles",
              honesty: (data.search && data.search.honesty) || "Editorial index"
            };
          })
          .filter(Boolean);
      }
    });
    Search._articlesRegistered = true;
  }

  function mountHub(el, options) {
    if (!el) return;
    options = options || {};
    loadManifest(options)
      .then(function (data) {
        var cats = (data.categories || [])
          .map(function (c) {
            return (
              '<article class="was-home__card">' +
              '<div class="was-home__card-head"><h3 class="was-home__card-title"><a href="categories/' +
              esc(c.id) +
              '/">' +
              esc(c.label) +
              "</a></h3></div>" +
              '<p class="was-home__purpose">' +
              esc(c.summary || "") +
              "</p></article>"
            );
          })
          .join("");
        var samples = (data.articles || [])
          .map(function (a) {
            return (
              "<li><a href=\"" +
              esc(a.path || ("samples/" + a.slug + ".html")) +
              "\">" +
              esc(a.title) +
              "</a> — " +
              esc(a.summary || "") +
              "</li>"
            );
          })
          .join("");
        el.innerHTML =
          '<section class="was-home__section" aria-labelledby="was-art-cats"><h2 id="was-art-cats">Categories</h2><div class="was-home__grid">' +
          cats +
          "</div></section>" +
          '<section class="was-home__section" aria-labelledby="was-art-samples"><h2 id="was-art-samples">Sample articles</h2><ul>' +
          (samples || "<li>No samples yet.</li>") +
          "</ul></section>";
        el.removeAttribute("aria-busy");
        bindLocalSearch(data, options);
      })
      .catch(function () {
        el.innerHTML = '<p class="wds-honesty" role="alert">Article index could not load.</p>';
        el.removeAttribute("aria-busy");
      });
  }

  function mountCategory(el, categoryId, options) {
    if (!el) return;
    options = options || {};
    var base = options.base != null ? options.base : "../../";
    loadManifest({ depth: 0, url: base + "manifest.json" })
      .then(function (data) {
        var rows = (data.articles || []).filter(function (a) {
          return a.category === categoryId;
        });
        if (!rows.length) {
          el.innerHTML =
            '<p class="wds-honesty">No articles in this category yet — the scaffold is ready for future pieces.</p>';
        } else {
          el.innerHTML =
            "<ul>" +
            rows
              .map(function (a) {
                return (
                  "<li><a href=\"" +
                  esc(base + (a.path || "")) +
                  "\">" +
                  esc(a.title) +
                  "</a> — " +
                  esc(a.summary || "") +
                  "</li>"
                );
              })
              .join("") +
            "</ul>";
        }
        el.removeAttribute("aria-busy");
      })
      .catch(function () {
        el.innerHTML = '<p class="wds-honesty" role="alert">Category index could not load.</p>';
        el.removeAttribute("aria-busy");
      });
  }

  function bindLocalSearch(data, options) {
    var input = document.getElementById("was-article-search");
    var out = document.getElementById("was-article-search-results");
    if (!input || !out) return;
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      if (!q) {
        out.innerHTML = "";
        return;
      }
      var hits = (data.articles || []).filter(function (a) {
        var blob = [a.title, a.summary, (a.tags || []).join(" ")].join(" ").toLowerCase();
        return blob.indexOf(q) >= 0;
      });
      if (!hits.length) {
        out.innerHTML = '<p class="wds-honesty">No matches in the sample index.</p>';
        return;
      }
      out.innerHTML =
        "<ul>" +
        hits
          .map(function (a) {
            return (
              "<li><a href=\"" +
              esc(a.path || "") +
              "\">" +
              esc(a.title) +
              "</a></li>"
            );
          })
          .join("") +
        "</ul>";
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.articles = {
    version: "0.1.0",
    loadManifest: loadManifest,
    mountHub: mountHub,
    mountCategory: mountCategory
  };

  // Opportunistic register on studio home when search exists
  function tryRegister() {
    if (!(global.WDS && WDS.platformSearch)) return;
    loadManifest({ depth: 0 }).catch(function () { /* offline ok */ });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryRegister);
  } else {
    tryRegister();
  }
})(typeof window !== "undefined" ? window : globalThis);
