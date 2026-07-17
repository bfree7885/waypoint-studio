/**
 * SignalTerrain Intelligence Summary — prototype.
 * Summarizes sample UIOs; does not list endless feeds. No IDS/IPS.
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadJson(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("Failed to load " + url + " (" + r.status + ")");
      return r.json();
    });
  }

  function indexById(list, key) {
    key = key || "id";
    var map = {};
    (list || []).forEach(function (item) {
      map[item[key]] = item;
    });
    return map;
  }

  function mountSummary(root, options) {
    options = options || {};
    if (!root) return Promise.reject(new Error("mount root required"));
    root.setAttribute("aria-busy", "true");
    root.innerHTML = '<p class="st-loading">Opening intelligence summary…</p>';

    var base = options.base || "../../design-system/signalterrain/intelligence/samples/";
    return Promise.all([
      loadJson(base + "intelligence-summary.sample.json"),
      loadJson(base + "uio-bundle.sample.json"),
      loadJson(base + "recommendations.sample.json"),
      loadJson("../../design-system/signalterrain/intelligence/correlation-patterns.json")
    ])
      .then(function (parts) {
        var summary = parts[0];
        var bundle = parts[1];
        var recs = parts[2];
        var patterns = parts[3];
        var uioById = indexById(bundle.events);
        var recById = indexById(recs.recommendations);
        var patternById = indexById(patterns.patterns);
        var selectedId = (summary.bullets[0] && summary.bullets[0].uioId) || null;

        function paint() {
          var selected = selectedId ? uioById[selectedId] : null;
          var next = (summary.nextActions || [])
            .map(function (id) {
              return recById[id];
            })
            .filter(Boolean);

          root.innerHTML =
            '<div class="st-summary">' +
            '<header class="st-demo-header">' +
            "<h1>" +
            esc(summary.meta.title || "Intelligence Summary") +
            "</h1>" +
            '<p class="st-lead">' +
            esc(summary.meta.subtitle || "") +
            "</p>" +
            '<p class="st-badge">' +
            esc(summary.meta.disclaimer) +
            "</p>" +
            "</header>" +
            '<section class="st-summary-questions" aria-label="Four questions">' +
            "<h2>Always ask</h2>" +
            "<ul>" +
            (summary.fourQuestions || [])
              .map(function (q) {
                return "<li>" + esc(q) + "</li>";
              })
              .join("") +
            "</ul></section>" +
            '<div class="st-summary-grid">' +
            '<section class="st-summary-today" aria-label="Today">' +
            "<h2>Today</h2>" +
            '<ul class="st-summary-bullets">' +
            (summary.bullets || [])
              .map(function (b) {
                var on = b.uioId === selectedId;
                return (
                  '<li><button type="button" class="st-summary-bullet' +
                  (on ? " is-selected" : "") +
                  '" data-uio="' +
                  esc(b.uioId) +
                  '"><span class="st-domain">' +
                  esc(b.domain) +
                  "</span> " +
                  esc(b.text) +
                  "</button></li>"
                );
              })
              .join("") +
            "</ul>" +
            "<h2>What should happen next?</h2>" +
            '<ul class="st-summary-recs">' +
            next
              .map(function (r) {
                return (
                  "<li><strong>" +
                  esc(r.priority) +
                  "</strong> · " +
                  esc(r.title) +
                  '<p class="st-muted">' +
                  esc(r.action) +
                  "</p>" +
                  '<p class="st-muted">Auto-execute: never</p></li>'
                );
              })
              .join("") +
            "</ul>" +
            "<h2>Correlation highlights</h2>" +
            "<ul>" +
            (summary.correlationHighlights || [])
              .map(function (id) {
                var p = patternById[id];
                return (
                  "<li>" +
                  esc(p ? p.label : id) +
                  (p
                    ? ' <span class="st-muted">(' +
                      esc((p.domainPath || []).join(" → ")) +
                      ")</span>"
                    : "") +
                  "</li>"
                );
              })
              .join("") +
            "</ul></section>" +
            '<section class="st-topic-detail" aria-label="Selected intelligence">' +
            (selected
              ? '<p class="st-detail-eyebrow">' +
                esc(selected.domain) +
                " · " +
                esc(selected.category) +
                "</p>" +
                "<h2>" +
                esc(selected.title) +
                "</h2>" +
                '<p class="st-detail-summary">' +
                esc(selected.summary) +
                "</p>" +
                "<h3>What changed?</h3><p>" +
                esc(selected.summary) +
                "</p>" +
                "<h3>Why does it matter?</h3><p>" +
                esc(selected.whyItMatters) +
                "</p>" +
                "<h3>Who is affected?</h3><ul>" +
                (selected.affectedSystems || [])
                  .map(function (x) {
                    return "<li>" + esc(x) + "</li>";
                  })
                  .join("") +
                (selected.industries || [])
                  .map(function (x) {
                    return "<li>Industry: " + esc(x) + "</li>";
                  })
                  .join("") +
                "<li>Scope: " +
                esc(selected.geographicScope || "unspecified") +
                "</li></ul>" +
                "<h3>Confidence</h3><p>" +
                esc(selected.trustLabel || selected.confidence) +
                " · severity " +
                esc(selected.severity) +
                "</p>" +
                "<h3>Unknowns</h3><ul>" +
                (selected.unknowns || [])
                  .map(function (u) {
                    return "<li>" + esc(u) + "</li>";
                  })
                  .join("") +
                "</ul>" +
                '<p class="st-disclaimer">' +
                esc(selected.meta && selected.meta.disclaimer) +
                "</p>"
              : '<p class="st-empty">Select a summary item.</p>') +
            "</section></div>" +
            '<p class="st-muted st-summary-foot">Prototype only · No IDS · No IPS · No live feeds · ' +
            '<a href="graph.html">Knowledge graph</a> · <a href="topics.html">Topics</a></p>' +
            "</div>";

          root.querySelectorAll("[data-uio]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              selectedId = btn.getAttribute("data-uio");
              paint();
            });
          });
        }

        root.removeAttribute("aria-busy");
        paint();
        return { summary: summary, bundle: bundle, recommendations: recs };
      })
      .catch(function (err) {
        root.removeAttribute("aria-busy");
        root.innerHTML =
          '<p class="st-error">Could not open intelligence summary. ' +
          esc(err && err.message) +
          "</p>";
        throw err;
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainSummary = {
    mountSummary: mountSummary,
    loadJson: loadJson
  };
})(window);
