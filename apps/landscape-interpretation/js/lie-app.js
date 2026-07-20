/**
 * Landscape Interpretation — field reading UI.
 * Mission: Why does this place look the way it does?
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

  var PRESETS = [
    {
      id: "pasture",
      label: "Stone walls + fence remnant",
      tags: ["stone-wall-present", "barbed-wire-or-fence-remnant", "dense-young-stems"]
    },
    {
      id: "flood",
      label: "Stream valley floods",
      tags: ["flood-debris-or-scour", "seasonal-standing-water", "terrace-step"]
    },
    {
      id: "glacial",
      label: "Glacial bowl",
      tags: ["unsorted-glacial-debris", "closed-depression", "seasonal-standing-water"]
    },
    {
      id: "logging",
      label: "After logging",
      tags: ["stumps-or-skid-trails", "dense-young-stems", "abrupt-cover-edge"]
    },
    {
      id: "fire",
      label: "Fire scars",
      tags: ["fire-scar-or-char", "standing-deadwood", "dense-young-stems"]
    }
  ];

  var BRIDGES = [
    { href: "../fieldry/", label: "Fieldry", note: "Save what you noticed" },
    { href: "../shed-hunting/", label: "Sheds", note: "Read cover as habitat" },
    { href: "../foragecast/", label: "ForageCast", note: "Season + site context" },
    { href: "../scenes/", label: "Scenes", note: "Photograph the evidence" },
    { href: "../waypoint-volunteer/", label: "Volunteer", note: "Stewardship nearby" },
    { href: "../hidden-landscapes/", label: "Hidden Landscapes", note: "Creative seeing (different tool)" }
  ];

  function groupTags(taxonomy) {
    var groups = [
      { id: "people", label: "Human history clues", ids: ["stone-wall-present", "barbed-wire-or-fence-remnant", "even-aged-tree-line", "foundation-or-cellar-hole", "fruit-trees-in-grid", "stumps-or-skid-trails", "parallel-road-berms", "charcoal-pit-ring", "mining-spoil-or-pit", "utility-corridor-or-roadcut"] },
      { id: "forest", label: "Forest & succession", ids: ["dense-young-stems", "large-diameter-canopy", "tip-up-mounds", "standing-deadwood", "abrupt-cover-edge", "shrub-thicket", "open-meadow-forbs", "mixed-conifer-hardwood", "fire-scar-or-char"] },
      { id: "water", label: "Water & wetlands", ids: ["seasonal-standing-water", "beaver-sign", "soft-seepage-ground", "terrace-step", "flood-debris-or-scour"] },
      { id: "rock", label: "Rock & landform", ids: ["unsorted-glacial-debris", "closed-depression", "talus-or-scree", "bedrock-outcrop"] }
    ];
    var byId = {};
    (taxonomy.observationTags || []).forEach(function (t) {
      byId[t.id] = t;
    });
    return groups.map(function (g) {
      return {
        label: g.label,
        tags: g.ids.map(function (id) {
          return byId[id] || { id: id, label: id };
        }).filter(Boolean)
      };
    });
  }

  function mount(root, options) {
    options = options || {};
    if (!root) return Promise.reject(new Error("root required"));
    var Engine = global.WDS && global.WDS.landscapeInterpretation;
    if (!Engine) return Promise.reject(new Error("Landscape Interpretation engine missing"));

    var packBase = options.packBase || "../../design-system/landscape-interpretation/";
    var stopWatch = null;
    if (global.WDS && WDS.platformBoot) {
      WDS.platformBoot.mount(root, {
        product: "Landscape Interpretation",
        title: "Reading this place",
        detail: "Loading observation vocabulary and Northeast sample rules. Stories stay educational.",
        status: "Loading…"
      });
      stopWatch = WDS.platformBoot.watch(root, {
        product: "Landscape Interpretation",
        title: "Still loading",
        detail: "Rules or vocabulary took too long. Retry when ready.",
        homeHref: "../../",
        onRetry: function () {
          mount(root, options);
        }
      });
    } else {
      root.setAttribute("aria-busy", "true");
      root.innerHTML = '<p class="lie-loading">Loading landscape reader…</p>';
    }

    function finish() {
      if (stopWatch) stopWatch();
      if (global.WDS && WDS.platformBoot) WDS.platformBoot.clear(root);
      root.removeAttribute("aria-busy");
    }

    function fail(err) {
      if (stopWatch) stopWatch();
      if (global.WDS && WDS.platformBoot) {
        WDS.platformBoot.fail(root, {
          product: "Landscape Interpretation",
          title: "Could not open the field reader",
          detail: (err && err.message) || "Unknown error",
          homeHref: "../../",
          onRetry: function () {
            mount(root, options);
          }
        });
      } else {
        root.removeAttribute("aria-busy");
        root.innerHTML = '<p class="lie-error">' + esc(err && err.message) + "</p>";
      }
    }

    return Promise.all([
      fetch(packBase + "taxonomy.json", { credentials: "same-origin" }).then(function (r) {
        if (!r.ok) throw new Error("taxonomy " + r.status);
        return r.json();
      }),
      Engine.loadPack(packBase + "rules/samples/northeast-land-use.sample.json")
    ])
      .then(function (parts) {
        var taxonomy = parts[0];
        var pack = parts[1];
        var selected = {};
        var lastResult = null;
        var groups = groupTags(taxonomy);

        function selectedTags() {
          return Object.keys(selected).filter(function (k) {
            return selected[k];
          });
        }

        function applyPreset(id) {
          var p = PRESETS.find(function (x) {
            return x.id === id;
          });
          if (!p) return;
          selected = {};
          p.tags.forEach(function (t) {
            selected[t] = true;
          });
          paint(true);
        }

        function renderResult(result) {
          if (!result) {
            return '<p class="lie-empty">Choose what you notice, then read the place.</p>';
          }
          var ixs = result.interpretations || [];
          if (!ixs.length) {
            return (
              '<div class="lie-result lie-result--empty">' +
              "<h2>Keep looking</h2>" +
              "<p>" +
              esc(result.narrative && result.narrative.text) +
              "</p>" +
              '<p class="lie-muted">Confidence: insufficient — we will not invent a story.</p></div>'
            );
          }
          return (
            '<div class="lie-result">' +
            '<p class="lie-honesty" role="note">' +
            esc(result.meta.disclaimer) +
            " · Ceiling: " +
            esc(result.honesty.confidenceCeiling) +
            "</p>" +
            (result.narrative
              ? '<p class="lie-narrative"><strong>Short story:</strong> ' +
                esc(result.narrative.text) +
                "</p>"
              : "") +
            ixs
              .map(function (ix) {
                return (
                  '<article class="lie-ix">' +
                  '<p class="lie-ix__cat">' +
                  esc(ix.category) +
                  " · " +
                  esc(ix.confidence.level) +
                  "</p>" +
                  "<h3>" +
                  esc(ix.label) +
                  "</h3>" +
                  "<p>" +
                  esc(ix.statement) +
                  "</p>" +
                  (ix.because
                    ? '<p class="lie-because"><span class="lie-label">Because</span> ' +
                      esc(ix.because) +
                      "</p>"
                    : "") +
                  "<h4>Evidence</h4><ul>" +
                  (ix.supportingEvidence || [])
                    .slice(0, 5)
                    .map(function (e) {
                      return "<li>" + esc(e.text) + "</li>";
                    })
                    .join("") +
                  "</ul>" +
                  "<h4>Other explanations</h4><ul>" +
                  (ix.alternativeExplanations || [])
                    .map(function (a) {
                      return "<li>" + esc(a.text) + "</li>";
                    })
                    .join("") +
                  "</ul>" +
                  "<h4>Look next</h4><ul>" +
                  (ix.suggestedFieldObservations || [])
                    .map(function (f) {
                      return "<li>" + esc(f.prompt) + "</li>";
                    })
                    .join("") +
                  "</ul>" +
                  (ix.limitations
                    ? '<p class="lie-muted">' + esc(ix.limitations) + "</p>"
                    : "") +
                  "</article>"
                );
              })
              .join("") +
            "</div>"
          );
        }

        function paint(autoEvaluate) {
          if (autoEvaluate) {
            lastResult = Engine.evaluate({
              packs: [pack],
              observations: selectedTags().map(function (tag) {
                return { tag: tag, sourceKind: "user-field", confidence: "moderate" };
              }),
              regionHint: "northeastern-us"
            });
          }

          root.innerHTML =
            '<div class="lie-app">' +
            '<header class="lie-hero">' +
            '<p class="lie-eyebrow">Landscape Interpretation</p>' +
            "<h1>Why does this place look the way it does?</h1>" +
            '<p class="lie-lead">Landscapes are natural and human processes written into form — ice, water, fire, farming, logging, and infrastructure. Notice clues. Read evidence. Stay uncertain when you should.</p>' +
            '<p class="lie-nav"><a href="learn.html">Learn the processes</a> · <a href="../../">Studio home</a></p>' +
            "</header>" +
            '<section class="lie-presets" aria-label="Example places">' +
            "<h2>Try an example</h2>" +
            '<div class="lie-preset-row">' +
            PRESETS.map(function (p) {
              return (
                '<button type="button" class="lie-chip" data-preset="' +
                esc(p.id) +
                '">' +
                esc(p.label) +
                "</button>"
              );
            }).join("") +
            '<button type="button" class="lie-chip lie-chip--ghost" data-clear="1">Clear</button>' +
            "</div></section>" +
            '<div class="lie-grid">' +
            '<section class="lie-observe" aria-labelledby="lie-obs-title">' +
            '<h2 id="lie-obs-title">What do you notice?</h2>' +
            '<p class="lie-muted">Check clues you can see. Interpretation follows — not the other way around.</p>' +
            groups
              .map(function (g) {
                return (
                  '<fieldset class="lie-group"><legend>' +
                  esc(g.label) +
                  "</legend>" +
                  g.tags
                    .map(function (t) {
                      return (
                        '<label class="lie-check"><input type="checkbox" data-tag="' +
                        esc(t.id) +
                        '"' +
                        (selected[t.id] ? " checked" : "") +
                        " /> " +
                        esc(t.label) +
                        "</label>"
                      );
                    })
                    .join("") +
                  "</fieldset>"
                );
              })
              .join("") +
            '<button type="button" class="lie-btn" data-read="1">Read this place</button>' +
            "</section>" +
            '<section class="lie-stories" aria-labelledby="lie-story-title">' +
            '<h2 id="lie-story-title">Provisional stories</h2>' +
            renderResult(lastResult) +
            "</section></div>" +
            '<section class="lie-bridges" aria-labelledby="lie-bridge-title">' +
            '<h2 id="lie-bridge-title">Continue observing</h2>' +
            '<p class="lie-muted">Same place, sibling tools — no duplicated notebooks.</p>' +
            "<ul>" +
            BRIDGES.map(function (b) {
              return (
                "<li><a href=\"" +
                esc(b.href) +
                '">' +
                esc(b.label) +
                "</a> — " +
                esc(b.note) +
                "</li>"
              );
            }).join("") +
            "</ul></section>" +
            '<p class="lie-pack-note">Rule pack: ' +
            esc((pack.meta && pack.meta.title) || "sample") +
            " · " +
            esc((pack.meta && pack.meta.regionalScope && pack.meta.regionalScope.join(", ")) || "") +
            "</p></div>";

          root.querySelectorAll("[data-tag]").forEach(function (el) {
            el.addEventListener("change", function () {
              selected[el.getAttribute("data-tag")] = el.checked;
            });
          });
          root.querySelectorAll("[data-preset]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              applyPreset(btn.getAttribute("data-preset"));
            });
          });
          var clearBtn = root.querySelector("[data-clear]");
          if (clearBtn) {
            clearBtn.addEventListener("click", function () {
              selected = {};
              lastResult = null;
              paint(false);
            });
          }
          var readBtn = root.querySelector("[data-read]");
          if (readBtn) {
            readBtn.addEventListener("click", function () {
              paint(true);
              var stories = root.querySelector(".lie-stories");
              if (stories && stories.scrollIntoView) stories.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }
        }

        finish();
        paint(false);
        return { taxonomy: taxonomy, pack: pack };
      })
      .catch(fail);
  }

  global.WDS = global.WDS || {};
  global.WDS.lieApp = { mount: mount, PRESETS: PRESETS };
})(window);
