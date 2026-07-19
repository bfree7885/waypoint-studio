/**
 * Steepleaf explore + entity detail UI mounts.
 */
(function (global) {
  "use strict";

  function esc(s) {
    return (global.WDS.steepleafGraph && WDS.steepleafGraph.esc(s)) || String(s || "");
  }

  function entityHref(id) {
    return "../entity/?id=" + encodeURIComponent(id);
  }

  /** Resolve package base from apps/steepleaf/** depth (explore/entity = 3). */
  function resolvePackageBase(opts) {
    if (opts && opts.base) return opts.base;
    var path = (global.location && global.location.pathname) || "";
    if (/\/apps\/steepleaf\/(explore|entity)\//.test(path)) {
      return "../../../design-system/steepleaf/";
    }
    if (/\/apps\/steepleaf\//.test(path)) {
      return "../../design-system/steepleaf/";
    }
    return "../../design-system/steepleaf/";
  }

  function mountExplore(root, opts) {
    opts = opts || {};
    var base = resolvePackageBase(opts);
    root.setAttribute("aria-busy", "true");
    if (global.WDS && WDS.platformBoot && WDS.platformBoot.mount) {
      WDS.platformBoot.mount(root, {
        product: "Steepleaf",
        title: "Knowledge graph",
        detail: "Loading the tea knowledge graph.",
        status: "Starting…"
      });
      WDS.platformBoot.watch(root, {
        product: "Steepleaf",
        title: "Could not open the knowledge graph",
        detail: "The sample graph did not finish loading. Check your connection and retry.",
        homeHref: "../",
        supportHref: "../../../support.html",
        timeoutMs: 15000,
        onRetry: function () {
          mountExplore(root, opts);
        }
      });
    } else {
      root.innerHTML = '<p class="stl-loading">Opening the tea knowledge graph…</p>';
    }

    return WDS.steepleafGraph.load({ base: base }).then(function () {
      if (global.WDS && WDS.platformBoot && WDS.platformBoot.clear) {
        WDS.platformBoot.clear(root);
      }
      var state = {
        q: "",
        kind: "tea",
        flavor: "any",
        teaType: "any",
        maxPrice: "",
        lens: "similar",
        seed: "stl_tea-longjing-shifeng"
      };

      function paint() {
        var results = WDS.steepleafSearch.search(state.q, {
          kind: state.kind === "any" ? null : state.kind,
          flavor: state.flavor,
          teaType: state.teaType === "any" ? null : state.teaType,
          maxPrice: state.maxPrice
        });
        var recs =
          state.lens === "under-20"
            ? WDS.steepleafRecommend.underPrice(20, state.seed)
            : WDS.steepleafRecommend.discover(state.lens, state.seed);
        var ai = WDS.steepleafAI.answer("What should I try next?", { teaId: state.seed });
        var teas = WDS.steepleafGraph.list("tea");
        var types = WDS.steepleafGraph.list("tea-type");
        var flavors = WDS.steepleafGraph.list("flavor");

        root.innerHTML =
          '<div class="stl-explore">' +
          '<header class="stl-header">' +
          '<p class="stl-eyebrow">Steepleaf · Knowledge Graph</p>' +
          "<h1>Tea knowledge & discovery</h1>" +
          '<p class="stl-lead">Move from leaf to land to process to cup — every recommendation explains why.</p>' +
          '<p class="stl-honesty">demo · educational sample · not a live shop · no social rankings</p></header>' +
          '<section class="stl-panel" aria-label="Graph-grounded guide">' +
          "<h2>Ask the graph</h2>" +
          '<form id="stl-ai-form" class="stl-row">' +
          '<input name="q" aria-label="Question" value="What should I try next?" />' +
          '<button type="submit" class="stl-btn">Ask</button></form>' +
          '<p id="stl-ai-answer">' +
          esc(ai.answer) +
          "</p></section>" +
          '<section class="stl-panel" aria-label="Discovery">' +
          "<h2>If I like this…</h2>" +
          '<label>Starting tea <select id="stl-seed">' +
          teas
            .map(function (t) {
              return (
                '<option value="' +
                esc(t.id) +
                '"' +
                (state.seed === t.id ? " selected" : "") +
                ">" +
                esc(t.name) +
                "</option>"
              );
            })
            .join("") +
          "</select></label>" +
          '<div class="stl-chips" role="group" aria-label="Discovery lenses">' +
          ["similar", "more-floral", "sweeter", "more-oxidized", "lighter-roast", "less-astringent", "lower-caffeine", "spring-greens", "excellent-value", "under-20"]
            .map(function (lens) {
              return (
                '<button type="button" class="stl-chip' +
                (state.lens === lens ? " is-on" : "") +
                '" data-lens="' +
                esc(lens) +
                '">' +
                esc(lens.replace(/-/g, " ")) +
                "</button>"
              );
            })
            .join("") +
          '</div><ul class="stl-list">' +
          (recs.length
            ? recs
                .map(function (r) {
                  return (
                    "<li><a href=\"" +
                    entityHref(r.entity.id) +
                    '"><strong>' +
                    esc(r.entity.name) +
                    "</strong></a><span>" +
                    esc(r.reason) +
                    "</span></li>"
                  );
                })
                .join("")
            : "<li>No matches for this lens yet.</li>") +
          "</ul></section>" +
          '<section class="stl-panel" aria-label="Search">' +
          "<h2>Search the graph</h2>" +
          '<form id="stl-search" class="stl-filters">' +
          '<label>Name / text <input name="q" value="' +
          esc(state.q) +
          '" /></label>' +
          '<label>Kind <select name="kind">' +
          ["tea", "region", "producer", "vendor", "cultivar", "flavor", "brewing-method", "any"]
            .map(function (k) {
              return (
                '<option value="' +
                k +
                '"' +
                (state.kind === k ? " selected" : "") +
                ">" +
                k +
                "</option>"
              );
            })
            .join("") +
          "</select></label>" +
          '<label>Tea type <select name="teaType"><option value="any">Any</option>' +
          types
            .map(function (t) {
              return (
                '<option value="' +
                esc(t.id) +
                '"' +
                (state.teaType === t.id ? " selected" : "") +
                ">" +
                esc(t.name) +
                "</option>"
              );
            })
            .join("") +
          "</select></label>" +
          '<label>Flavor <select name="flavor"><option value="any">Any</option>' +
          flavors
            .map(function (f) {
              return (
                '<option value="' +
                esc(f.id) +
                '"' +
                (state.flavor === f.id ? " selected" : "") +
                ">" +
                esc(f.name) +
                "</option>"
              );
            })
            .join("") +
          '</select></label>' +
          '<label>Max price (USD) <input name="maxPrice" type="number" min="1" value="' +
          esc(state.maxPrice) +
          '" /></label>' +
          '<button type="submit" class="stl-btn">Search</button></form>' +
          "<h3>" +
          results.length +
          " results</h3><ul class=\"stl-list\">" +
          results
            .slice(0, 40)
            .map(function (r) {
              return (
                "<li><a href=\"" +
                entityHref(r.entity.id) +
                '"><strong>' +
                esc(r.entity.name) +
                "</strong></a> <em>" +
                esc(r.entity.kind) +
                "</em><span>" +
                esc(r.entity.summary) +
                "</span></li>"
              );
            })
            .join("") +
          "</ul></section></div>";

        root.querySelector("#stl-ai-form").addEventListener("submit", function (e) {
          e.preventDefault();
          var q = new FormData(e.target).get("q");
          var ans = WDS.steepleafAI.answer(q, { teaId: state.seed });
          root.querySelector("#stl-ai-answer").textContent = ans.answer;
        });
        root.querySelector("#stl-seed").addEventListener("change", function (e) {
          state.seed = e.target.value;
          paint();
        });
        root.querySelectorAll("[data-lens]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            state.lens = btn.getAttribute("data-lens");
            paint();
          });
        });
        root.querySelector("#stl-search").addEventListener("submit", function (e) {
          e.preventDefault();
          var fd = new FormData(e.target);
          state.q = fd.get("q") || "";
          state.kind = fd.get("kind") || "tea";
          state.teaType = fd.get("teaType") || "any";
          state.flavor = fd.get("flavor") || "any";
          state.maxPrice = fd.get("maxPrice") || "";
          paint();
        });
      }

      root.removeAttribute("aria-busy");
      paint();
    }).catch(function (err) {
      if (global.WDS && WDS.platformBoot && WDS.platformBoot.fail) {
        WDS.platformBoot.fail(root, {
          product: "Steepleaf",
          title: "Could not open the knowledge graph",
          detail: (err && err.message) || "The sample graph failed to load.",
          homeHref: "../",
          supportHref: "../../../support.html",
          onRetry: function () {
            mountExplore(root, opts);
          }
        });
      } else {
        root.innerHTML =
          '<p class="stl-error" role="alert">Could not load the tea knowledge graph. ' +
          '<button type="button" class="wds-btn wds-btn--primary wds-btn--sm" onclick="location.reload()">Retry</button></p>';
        root.removeAttribute("aria-busy");
      }
    });
  }

  function mountEntity(root, opts) {
    opts = opts || {};
    var id = opts.id || new URLSearchParams(global.location.search).get("id");
    var base = resolvePackageBase(opts);
    root.setAttribute("aria-busy", "true");
    if (global.WDS && WDS.platformBoot && WDS.platformBoot.mount) {
      WDS.platformBoot.mount(root, {
        product: "Steepleaf",
        title: "Entity",
        detail: "Loading this tea graph entity.",
        status: "Starting…"
      });
      WDS.platformBoot.watch(root, {
        product: "Steepleaf",
        title: "Could not open this entity",
        detail: "The sample graph did not finish loading.",
        homeHref: "../",
        supportHref: "../../../support.html",
        timeoutMs: 15000,
        onRetry: function () {
          mountEntity(root, opts);
        }
      });
    }
    return WDS.steepleafGraph.load({ base: base }).then(function () {
      if (global.WDS && WDS.platformBoot && WDS.platformBoot.clear) {
        WDS.platformBoot.clear(root);
      }
      var e = WDS.steepleafGraph.get(id);
      if (!e) {
        root.innerHTML = '<p class="stl-error">Entity not found in the sample graph.</p>';
        root.removeAttribute("aria-busy");
        return;
      }
      var neigh = WDS.steepleafGraph.neighbors(id);
      var offers = e.kind === "tea" ? WDS.steepleafSearch.offersFor(id) : [];
      var recs = e.kind === "tea" ? WDS.steepleafRecommend.similarTo(id, { limit: 5 }) : [];
      var ai = e.kind === "tea" ? WDS.steepleafAI.unique(id) : {
        answer: e.education && e.education.aiSummary ? e.education.aiSummary : e.summary
      };
      var articles = neigh.filter(function (n) {
        return (
          n.entity.kind === "article" ||
          n.entity.kind === "historical-event" ||
          n.entity.kind === "scientific-study" ||
          n.entity.kind === "health-topic" ||
          n.entity.kind === "tea-tradition"
        );
      });
      var facts = (e.quickFacts || [])
        .map(function (f) {
          return "<li><strong>" + esc(f.label) + ":</strong> " + esc(f.value) + "</li>";
        })
        .join("");
      var timeline = ((e.education && e.education.timeline) || [])
        .map(function (t) {
          return "<li><strong>" + esc(t.year) + "</strong> — " + esc(t.event) + "</li>";
        })
        .join("");
      var map = e.education && e.education.mapHint;
      var related = neigh
        .map(function (n) {
          return (
            "<li><span class=\"stl-rel\">" +
            esc(n.type) +
            '</span> <a href="' +
            entityHref(n.entity.id) +
            '">' +
            esc(n.entity.name) +
            "</a>" +
            (n.edge.why ? "<span>" + esc(n.edge.why) + "</span>" : "") +
            "</li>"
          );
        })
        .join("");
      var eduLinks = articles
        .map(function (n) {
          return (
            "<li><a href=\"" +
            entityHref(n.entity.id) +
            '"><strong>' +
            esc(n.entity.name) +
            "</strong></a> <em>" +
            esc(n.entity.kind) +
            "</em><span>" +
            esc(n.entity.summary) +
            "</span></li>"
          );
        })
        .join("");

      root.innerHTML =
        '<article class="stl-entity">' +
        '<p class="stl-eyebrow">' +
        esc(e.kind) +
        " · sample</p>" +
        "<h1>" +
        esc(e.name) +
        "</h1>" +
        (e.aka && e.aka.length ? '<p class="stl-aka">' + esc(e.aka.join(" · ")) + "</p>" : "") +
        "<p>" +
        esc(e.description || e.summary) +
        "</p>" +
        '<p class="stl-honesty">demo · educational · confidence ' +
        esc((e.meta && e.meta.confidence) || "moderate") +
        "</p>" +
        '<section><h2>Overview</h2><p>' +
        esc(e.summary) +
        "</p></section>" +
        (facts ? "<section><h2>Quick facts</h2><ul>" + facts + "</ul></section>" : "") +
        (timeline ? "<section><h2>Timeline</h2><ul>" + timeline + "</ul></section>" : "") +
        (map && map.lat != null
          ? "<section><h2>Map</h2><p>" +
            esc(map.label || e.name) +
            " ≈ " +
            map.lat +
            ", " +
            map.lon +
            " (" +
            esc(map.precision || "approx") +
            ")</p></section>"
          : "") +
        "<section><h2>AI summary</h2><p>" +
        esc(ai.answer) +
        "</p></section>" +
        "<section><h2>Related entities</h2><ul class=\"stl-list\">" +
        (related || "<li>No edges yet.</li>") +
        "</ul></section>" +
        (recs.length
          ? "<section><h2>Recommendations</h2><ul class=\"stl-list\">" +
            recs
              .map(function (r) {
                return (
                  "<li><a href=\"" +
                  entityHref(r.entity.id) +
                  '"><strong>' +
                  esc(r.entity.name) +
                  "</strong></a><span>" +
                  esc(r.reason) +
                  "</span></li>"
                );
              })
              .join("") +
            "</ul></section>"
          : "") +
        (offers.length
          ? "<section><h2>Shopping (sample vendors)</h2><ul class=\"stl-list\">" +
            offers
              .map(function (o) {
                var hist = (o.offer.priceHistory || [])
                  .map(function (h) {
                    return h.date + ": $" + h.priceUsd;
                  })
                  .join("; ");
                var ship = o.offer.shipping
                  ? " · ships " + (o.offer.shipping.shipsFrom || "")
                  : "";
                return (
                  "<li><strong>" +
                  esc(o.vendor.name) +
                  "</strong> — $" +
                  esc(o.offer.priceUsd) +
                  " / " +
                  esc(o.offer.sizeG) +
                  "g · " +
                  esc(o.offer.availability) +
                  " · $" +
                  esc(o.offer.costPerGram) +
                  "/g" +
                  (o.offer.organic || o.offer.organicCertification ? " · organic sample" : "") +
                  (o.offer.freshness ? " · " + esc(o.offer.freshness) : "") +
                  ship +
                  (hist ? "<span>Price history: " + esc(hist) + "</span>" : "") +
                  "</li>"
                );
              })
              .join("") +
            '</ul><p class="stl-muted">Vendors are separated from teas. Offers are educational samples — not checkout.</p></section>'
          : "") +
        (eduLinks
          ? "<section><h2>Articles &amp; education</h2><ul class=\"stl-list\">" +
            eduLinks +
            "</ul></section>"
          : "") +
        (e.unknowns && e.unknowns.length
          ? "<section><h2>Unknowns</h2><ul>" +
            e.unknowns.map(function (u) { return "<li>" + esc(u) + "</li>"; }).join("") +
            "</ul></section>"
          : "") +
        '<p class="stl-nav"><a href="../explore/">← Explore graph</a> · <a href="../">Overview</a></p>' +
        "</article>";
      root.removeAttribute("aria-busy");
    }).catch(function (err) {
      if (global.WDS && WDS.platformBoot && WDS.platformBoot.fail) {
        WDS.platformBoot.fail(root, {
          product: "Steepleaf",
          title: "Could not open this entity",
          detail: (err && err.message) || "The sample graph failed to load.",
          homeHref: "../",
          supportHref: "../../../support.html",
          onRetry: function () {
            mountEntity(root, opts);
          }
        });
      } else {
        root.innerHTML =
          '<p class="stl-error" role="alert">Could not load this entity. ' +
          '<button type="button" class="wds-btn wds-btn--primary wds-btn--sm" onclick="location.reload()">Retry</button></p>';
        root.removeAttribute("aria-busy");
      }
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.steepleafUI = {
    mountExplore: mountExplore,
    mountEntity: mountEntity
  };
})(window);
