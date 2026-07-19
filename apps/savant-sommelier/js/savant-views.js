/**
 * Savant Sommelier — Discover / Learn / Cellar / Vineyard / Settings views.
 */
(function (global) {
  "use strict";

  function esc(s) {
    return SavantShell.escapeHtml(s);
  }

  function matchEntry(entry, query, facet, value) {
    if (facet && value) {
      var v = String(value).toLowerCase();
      if (facet === "grape" || facet === "style" || facet === "body" || facet === "sweetness" || facet === "acidity" || facet === "alcohol" || facet === "oak") {
        if (String(entry[facet] || entry.style || "").toLowerCase() !== v &&
            !(entry.tags || []).some(function (t) { return String(t).toLowerCase() === v; }) &&
            String(entry.name || "").toLowerCase() !== v) {
          return false;
        }
      } else if (facet === "country") {
        if (!(entry.countryHints || []).some(function (c) { return String(c).toLowerCase() === v; })) return false;
      } else if (facet === "region" || facet === "subregion" || facet === "ava") {
        if (!(entry.regionHints || []).some(function (c) { return String(c).toLowerCase().indexOf(v) !== -1; })) return false;
      } else if (facet === "foodPairing") {
        if (!(entry.foodPairing || []).some(function (c) { return String(c).toLowerCase().indexOf(v) !== -1; })) return false;
      } else if (facet === "sparkling" || facet === "dessert" || facet === "fortified" || facet === "organic" || facet === "biodynamic" || facet === "natural") {
        if (!(entry.tags || []).some(function (t) { return String(t).toLowerCase().indexOf(facet) !== -1 || String(t).toLowerCase() === v; }) &&
            String(entry.style || "").toLowerCase().indexOf(facet) === -1) {
          return false;
        }
      } else if (facet === "producer" || facet === "blend" || facet === "vintage" || facet === "price") {
        var blobFacet = JSON.stringify(entry).toLowerCase();
        if (blobFacet.indexOf(v) === -1) return false;
      }
    }
    if (!query) return true;
    var q = query.toLowerCase();
    var blob = [
      entry.name, entry.kind, entry.style, entry.body, entry.unique,
      (entry.flavors || []).join(" "),
      (entry.countryHints || []).join(" "),
      (entry.regionHints || []).join(" "),
      (entry.foodPairing || []).join(" "),
      (entry.tags || []).join(" "),
      entry.whyMatchTemplate
    ].join(" ").toLowerCase();
    return blob.indexOf(q) !== -1;
  }

  function renderDiscoverCard(entry, catalog) {
    var similar = (entry.similar || []).map(function (id) {
      var s = (catalog.entries || []).find(function (e) { return e.id === id; });
      return s ? s.name : id;
    }).filter(Boolean);

    return (
      '<article class="ss-card" data-id="' + esc(entry.id) + '">' +
        '<p class="ss-card__kind">' + esc(entry.kind) + (entry.style ? " · " + esc(entry.style) : "") + "</p>" +
        "<h3>" + esc(entry.name) + "</h3>" +
        '<p class="ss-card__why"><span class="ss-label">Why it matches</span> ' + esc(entry.whyMatchTemplate) + "</p>" +
        '<p><span class="ss-label">Flavors to expect</span> ' + esc((entry.flavors || []).join(", ")) + "</p>" +
        '<p><span class="ss-label">What makes it unique</span> ' + esc(entry.unique) + "</p>" +
        (similar.length ? '<p><span class="ss-label">Similar wines / grapes</span> ' + esc(similar.join(", ")) + "</p>" : "") +
        '<p><span class="ss-label">Typical price range</span> ' + esc(entry.typicalPrice || "varies") + "</p>" +
        (entry.foodPairing && entry.foodPairing.length
          ? '<p><span class="ss-label">Food pairing</span> ' + esc(entry.foodPairing.join(", ")) + "</p>"
          : "") +
        '<p class="ss-card__meta">' +
          esc((entry.regionHints || []).slice(0, 3).join(" · ")) +
        "</p>" +
      "</article>"
    );
  }

  function renderIntelBlock(pkg) {
    if (!pkg) return "";
    var recHtml = (pkg.recommendations && pkg.recommendations.items || []).map(function (r) {
      return (
        '<article class="ss-intel-item">' +
          "<h3>" + esc(r.entry.name) + "</h3>" +
          '<p class="ss-card__why"><span class="ss-label">Why</span> ' + esc(r.why) + "</p>" +
        "</article>"
      );
    }).join("");
    var discHtml = (pkg.discovery && pkg.discovery.suggestions || []).slice(0, 6).map(function (s) {
      return (
        '<article class="ss-intel-item">' +
          '<p class="ss-card__kind">' + esc(s.kind) + "</p>" +
          "<h3>" + esc(s.title) + "</h3>" +
          '<p><span class="ss-label">Why</span> ' + esc(s.why) + "</p>" +
        "</article>"
      );
    }).join("");
    var edu = (pkg.education && pkg.education.discover || []).map(function (t) {
      return "<li>" + esc(t) + "</li>";
    }).join("");
    return (
      '<section class="ss-intel" aria-label="Wine intelligence">' +
        "<h2>For you — explained</h2>" +
        '<p class="ss-honesty">' + esc(pkg.honesty) + "</p>" +
        '<p class="ss-freshness">Palate confidence: ' + esc(pkg.palate && pkg.palate.confidence) +
        (pkg._fromCache ? " · cached" : "") + "</p>" +
        '<div class="ss-intel-grid">' + recHtml + "</div>" +
        "<h2>Guided discovery</h2>" +
        '<div class="ss-intel-grid">' + discHtml + "</div>" +
        (edu ? "<h2>Teachable moments</h2><ul class=\"ss-teach\">" + edu + "</ul>" : "") +
      "</section>"
    );
  }

  function startDiscover(root) {
    root.innerHTML =
      SavantShell.taskNav("discover") +
      '<section class="ss-hero">' +
        '<p class="wds-eyebrow">Savant Sommelier · Wine Intelligence</p>' +
        "<h1>Discover</h1>" +
        "<p class=\"ss-lead\">Personal recommendations, guided exploration, and search that explain why.</p>" +
        SavantShell.honestyBanner("Educational catalog for learning. Not a live retailer inventory.") +
      "</section>" +
      '<div id="ss-discover-intel">' + SavantShell.loadingHtml("Building palate intelligence…") + "</div>" +
      '<section class="ss-toolbar" aria-label="Discover filters">' +
        '<label class="ss-field"><span>Intelligent search</span><input type="search" id="ss-discover-q" placeholder="cab, peeno, burgundy…" autocomplete="off"></label>' +
        '<label class="ss-field"><span>Explore by</span>' +
          '<select id="ss-discover-facet">' +
            '<option value="">All facets</option>' +
          "</select></label>" +
        '<label class="ss-field"><span>Value</span><input id="ss-discover-value" placeholder="e.g. Riesling, Burgundy" autocomplete="off"></label>' +
        '<label class="ss-field"><span>Pair with food</span><input id="ss-discover-food" placeholder="steak, curry, oysters…" autocomplete="off"></label>' +
      "</section>" +
      '<section id="ss-discover-suggest" class="ss-section" hidden></section>' +
      '<section id="ss-discover-pair" class="ss-section" hidden></section>' +
      '<section class="ss-section">' +
        "<h2>Compare two styles</h2>" +
        '<div class="ss-toolbar">' +
          '<label class="ss-field"><span>A</span><select id="ss-compare-a"></select></label>' +
          '<label class="ss-field"><span>B</span><select id="ss-compare-b"></select></label>' +
          '<button type="button" class="ss-btn" id="ss-compare-go">Compare</button>' +
        "</div>" +
        '<div id="ss-compare-out"></div>' +
      "</section>" +
      '<section id="ss-discover-results" class="ss-results" aria-live="polite">' +
        SavantShell.loadingHtml("Loading discovery catalog…") +
      "</section>";

    SavantShell.getJson("data/discover-catalog.json").then(function (res) {
      var catalog = res.data;
      var facetSel = root.querySelector("#ss-discover-facet");
      (catalog.facets || []).forEach(function (f) {
        var opt = document.createElement("option");
        opt.value = f;
        opt.textContent = f;
        facetSel.appendChild(opt);
      });

      var pkg = null;
      if (global.SavantWIE && SavantWIE.engine) {
        pkg = SavantWIE.engine.evaluate({ catalog: catalog, force: true });
        root.querySelector("#ss-discover-intel").innerHTML = renderIntelBlock(pkg);
      } else {
        root.querySelector("#ss-discover-intel").innerHTML = "";
      }

      var opts = (catalog.entries || []).map(function (e) {
        return '<option value="' + esc(e.id) + '">' + esc(e.name) + "</option>";
      }).join("");
      root.querySelector("#ss-compare-a").innerHTML = opts;
      root.querySelector("#ss-compare-b").innerHTML = opts;
      if (catalog.entries && catalog.entries[1]) root.querySelector("#ss-compare-b").selectedIndex = 1;

      root.querySelector("#ss-compare-go").addEventListener("click", function () {
        var a = catalog.entries.find(function (e) { return e.id === root.querySelector("#ss-compare-a").value; });
        var b = catalog.entries.find(function (e) { return e.id === root.querySelector("#ss-compare-b").value; });
        var cmp = SavantWIE.engine.compare(a, b);
        var out = root.querySelector("#ss-compare-out");
        if (!cmp.ok) {
          out.innerHTML = '<p class="ss-empty">' + esc(cmp.why) + "</p>";
          return;
        }
        out.innerHTML =
          '<p class="ss-honesty">' + esc(cmp.honesty) + "</p>" +
          "<p><span class=\"ss-label\">Why compare</span> " + esc(cmp.why) + "</p>" +
          "<ul>" + cmp.differences.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul>" +
          (cmp.teach ? '<p class="ss-visual">' + esc(cmp.teach) + "</p>" : "");
      });

      function paint() {
        var q = root.querySelector("#ss-discover-q").value;
        var facet = facetSel.value;
        var value = root.querySelector("#ss-discover-value").value;
        var food = root.querySelector("#ss-discover-food").value;
        var box = root.querySelector("#ss-discover-results");
        var suggest = root.querySelector("#ss-discover-suggest");
        var pairBox = root.querySelector("#ss-discover-pair");

        var searchPkg = SavantWIE.engine.search(catalog, q);
        if (q && searchPkg.suggestions && searchPkg.suggestions.length) {
          suggest.hidden = false;
          suggest.innerHTML =
            "<h2>Suggested searches</h2>" +
            '<p class="ss-honesty">' + esc(searchPkg.honesty) + "</p>" +
            "<ul class=\"ss-teach\">" +
            searchPkg.suggestions.map(function (s) {
              return "<li><strong>" + esc(s.text) + "</strong> — " + esc(s.why) + "</li>";
            }).join("") +
            "</ul>";
        } else {
          suggest.hidden = true;
          suggest.innerHTML = "";
        }

        if (food) {
          var paired = SavantWIE.engine.pairFood(catalog, food, pkg && pkg.palate);
          pairBox.hidden = false;
          pairBox.innerHTML =
            "<h2>Food pairing intelligence</h2>" +
            '<p class="ss-honesty">' + esc(paired.honesty) + "</p>" +
            (paired.teach ? '<p class="ss-visual">' + esc(paired.teach) + "</p>" : "") +
            (paired.matches || []).map(function (m) {
              return (
                '<article class="ss-intel-item">' +
                  "<h3>" + esc(m.entry ? m.entry.name : "General guide") + "</h3>" +
                  '<p><span class="ss-label">Why</span> ' + esc(m.why) + "</p>" +
                "</article>"
              );
            }).join("");
        } else {
          pairBox.hidden = true;
        }

        var hits;
        if (q && !facet && !value) {
          hits = (searchPkg.results || []).map(function (r) { return r.entry; });
        } else {
          var norm = q && SavantWIE.search ? SavantWIE.search.normalize(q) : q;
          hits = (catalog.entries || []).filter(function (e) {
            return matchEntry(e, norm || q, facet, value);
          });
        }

        if (!hits.length) {
          box.innerHTML = '<p class="ss-empty">No matches. Try a synonym, related grape, or clear filters.</p>';
          return;
        }
        box.innerHTML =
          '<p class="ss-freshness">' + hits.length + " result" + (hits.length === 1 ? "" : "s") +
          (searchPkg.normalized && q && searchPkg.normalized !== q.toLowerCase()
            ? " · interpreted as “" + esc(searchPkg.normalized) + "”"
            : "") +
          (res.freshness && res.freshness.source === "memory-cache" ? " · cached" : "") +
          "</p>" +
          hits.map(function (e) {
            var card = renderDiscoverCard(e, catalog);
            if (pkg && pkg.palate && SavantWIE.palate) {
              var aff = SavantWIE.palate.affinityForEntry(pkg.palate, e);
              if (aff.reasons.length) {
                card = card.replace(
                  "</article>",
                  '<p class="ss-card__why"><span class="ss-label">Personal why</span> ' +
                    esc(aff.reasons.join(" ")) +
                    "</p></article>"
                );
              }
            }
            return card;
          }).join("");
      }

      ["ss-discover-q", "ss-discover-value", "ss-discover-food"].forEach(function (id) {
        root.querySelector("#" + id).addEventListener("input", paint);
      });
      facetSel.addEventListener("change", paint);
      paint();
    }).catch(function () {
      root.querySelector("#ss-discover-results").innerHTML =
        SavantShell.errorHtml("Could not load the discovery catalog. Check your connection and retry.");
      root.querySelector("#ss-discover-intel").innerHTML = "";
    });
  }

  function startLearn(root) {
    root.innerHTML =
      SavantShell.taskNav("learn") +
      '<section class="ss-hero">' +
        '<p class="wds-eyebrow">Savant Sommelier</p>' +
        "<h1>Learn</h1>" +
        "<p class=\"ss-lead\">Visual, interactive wine education — not a Wikipedia dump.</p>" +
        SavantShell.honestyBanner("Curriculum authored for Savant. Prefer tasting practice over trivia contests.") +
      "</section>" +
      '<div id="ss-learn-body">' + SavantShell.loadingHtml("Loading curriculum…") + "</div>";

    SavantShell.getJson("data/learn-curriculum.json").then(function (res) {
      var topics = res.data.topics || [];
      var body = root.querySelector("#ss-learn-body");
      var teach = (global.SavantWIE && SavantWIE.education)
        ? SavantWIE.education.forContext({ page: "discover" }).concat(SavantWIE.education.forContext({ theme: "pinotVsCab" }))
        : [];
      body.innerHTML =
        (teach.length
          ? '<section class="ss-intel"><h2>Teach naturally</h2><ul class="ss-teach">' +
            teach.filter(function (t, i, a) { return a.indexOf(t) === i; }).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") +
            "</ul></section>"
          : "") +
        '<nav class="ss-learn-index" aria-label="Topics">' +
        topics.map(function (t) {
          return '<a class="ss-learn-index__link" href="#' + esc(t.id) + '">' + esc(t.title) + "</a>";
        }).join("") +
        "</nav>" +
        topics.map(function (t) {
          return (
            '<article class="ss-learn-topic" id="' + esc(t.id) + '">' +
              '<p class="ss-card__kind">' + esc(t.category) + "</p>" +
              "<h2>" + esc(t.title) + "</h2>" +
              '<h3 class="ss-sub">Overview</h3><p>' + esc(t.overview) + "</p>" +
              '<h3 class="ss-sub">Visual aid</h3><p class="ss-visual">' + esc(t.visualAid) + "</p>" +
              '<h3 class="ss-sub">Interesting facts</h3><ul>' +
                (t.facts || []).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") +
              "</ul>" +
              '<h3 class="ss-sub">Common misconceptions</h3><ul>' +
                (t.misconceptions || []).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") +
              "</ul>" +
              (t.similarGrapes ? '<p><span class="ss-label">Similar grapes</span> ' + esc(t.similarGrapes.join(", ")) + "</p>" : "") +
              (t.similarRegions ? '<p><span class="ss-label">Similar regions</span> ' + esc(t.similarRegions.join(", ")) + "</p>" : "") +
              '<p><span class="ss-label">Related learning</span> ' +
                (t.related || []).map(function (id) {
                  return '<a href="#' + esc(id) + '">' + esc(id.replace(/-/g, " ")) + "</a>";
                }).join(" · ") +
              "</p>" +
            "</article>"
          );
        }).join("");
    }).catch(function () {
      root.querySelector("#ss-learn-body").innerHTML =
        SavantShell.errorHtml("Could not load the learning curriculum.");
    });
  }

  function cellarFormHtml() {
    return (
      '<form class="ss-form" id="ss-cellar-form" autocomplete="on">' +
        "<h2>Add a bottle</h2>" +
        '<div class="ss-form-grid">' +
          '<label class="ss-field"><span>Name</span><input name="name" required placeholder="Wine name"></label>' +
          '<label class="ss-field"><span>Varietal / grape</span><input name="varietal" placeholder="e.g. Pinot Noir"></label>' +
          '<label class="ss-field"><span>Region</span><input name="region"></label>' +
          '<label class="ss-field"><span>Country</span><input name="country"></label>' +
          '<label class="ss-field"><span>Producer</span><input name="wineryName"></label>' +
          '<label class="ss-field"><span>Vintage</span><input name="vintage" inputmode="numeric"></label>' +
          '<label class="ss-field"><span>Style</span><input name="style" placeholder="red / white / sparkling…"></label>' +
          '<label class="ss-field"><span>Quantity</span><input name="quantity" type="number" min="1" value="1"></label>' +
          '<label class="ss-field"><span>Purchase price</span><input name="purchasePrice" type="number" min="0" step="0.01"></label>' +
          '<label class="ss-field"><span>Purchase date</span><input name="purchaseDate" type="date"></label>' +
          '<label class="ss-field"><span>Bottle location</span><input name="location" placeholder="Rack A / fridge"></label>' +
          '<label class="ss-field"><span>Drink from</span><input name="drinkFrom" placeholder="2026"></label>' +
          '<label class="ss-field"><span>Drink to</span><input name="drinkTo" placeholder="2030"></label>' +
          '<label class="ss-field"><span>Rating (1–100)</span><input name="rating" type="number" min="1" max="100"></label>' +
          '<label class="ss-field ss-field--wide"><span>Notes</span><textarea name="notes" rows="2"></textarea></label>' +
          '<label class="ss-field ss-field--wide"><span>Food pairings</span><input name="foodPairings" placeholder="Comma-separated"></label>' +
          '<label class="ss-check"><input type="checkbox" name="favorite"> Favorite</label>' +
        "</div>" +
        '<button type="submit" class="ss-btn">Save to cellar</button>' +
      "</form>"
    );
  }

  function renderWineRow(w) {
    return (
      '<article class="ss-wine" data-id="' + esc(w.id) + '">' +
        "<header>" +
          "<h3>" + esc(w.name) + (w.favorite ? " ★" : "") + "</h3>" +
          '<p class="ss-card__meta">' +
            esc([w.vintage, w.varietal, w.region, w.country].filter(Boolean).join(" · ")) +
          "</p>" +
        "</header>" +
        "<p>" +
          "<span class=\"ss-label\">Bottles</span> " + esc(w.quantity) +
          (w.location ? ' · <span class="ss-label">Location</span> ' + esc(w.location) : "") +
          (w.purchasePrice != null ? ' · <span class="ss-label">Paid</span> $' + esc(w.purchasePrice) : "") +
        "</p>" +
        (w.drinkFrom || w.drinkTo
          ? '<p><span class="ss-label">Drink window</span> ' + esc(w.drinkFrom || "?") + " – " + esc(w.drinkTo || "?") + "</p>"
          : "") +
        (w.rating != null ? '<p><span class="ss-label">Rating</span> ' + esc(w.rating) + "</p>" : "") +
        (w.notes ? "<p>" + esc(w.notes) + "</p>" : "") +
        (w.foodPairings && w.foodPairings.length
          ? '<p><span class="ss-label">Pairings</span> ' + esc(w.foodPairings.join(", ")) + "</p>"
          : "") +
        '<div class="ss-wine__actions">' +
          '<button type="button" class="ss-btn ss-btn--ghost" data-action="fav">Toggle favorite</button>' +
          '<button type="button" class="ss-btn ss-btn--ghost" data-action="wish">Add to wishlist</button>' +
          '<button type="button" class="ss-btn ss-btn--danger" data-action="remove">Remove</button>' +
        "</div>" +
      "</article>"
    );
  }

  function startCellar(root) {
    function paint() {
      if (!global.WaypointSavant) {
        root.innerHTML = SavantShell.taskNav("cellar") + SavantShell.errorHtml("Cellar models failed to load.");
        return;
      }
      var stats = WaypointSavant.cellarStats();
      var q = (root.querySelector("#ss-cellar-q") && root.querySelector("#ss-cellar-q").value) || "";
      var favOnly = root.querySelector("#ss-cellar-fav") && root.querySelector("#ss-cellar-fav").checked;
      var wines = WaypointSavant.searchWines(q, { favorite: favOnly });
      var wish = WaypointSavant.listWishlist();

      var listHtml = wines.length
        ? wines.map(renderWineRow).join("")
        : '<p class="ss-empty">Your cellar is empty — add a bottle to begin. No sample inventory is planted for you.</p>';

      var wishHtml = wish.length
        ? '<ul class="ss-wish">' + wish.map(function (i) {
            return "<li>" + esc(i.name || i.id) +
              ' <button type="button" class="ss-btn ss-btn--ghost" data-wish-remove="' + esc(i.id) + '">Remove</button></li>';
          }).join("") + "</ul>"
        : '<p class="ss-empty">Wishlist is empty.</p>';

      var buying = global.SavantBuying
        ? SavantBuying.emptyComparison({ name: "Future purchase rails" })
        : null;

      root.innerHTML =
        SavantShell.taskNav("cellar") +
        '<section class="ss-hero">' +
          '<p class="wds-eyebrow">Savant Sommelier</p>' +
          "<h1>My Cellar</h1>" +
          '<p class="ss-lead">Inventory, drink windows, notes — private on this device.</p>' +
          SavantShell.honestyBanner("Local-first. Friends’ recommendations are reserved for a future release.") +
        "</section>" +
        '<section class="ss-stats" aria-label="Cellar stats">' +
          '<p><strong>' + stats.bottleCount + "</strong> bottles · <strong>" + stats.wineCount + "</strong> wines · " +
          "<strong>" + stats.favoriteCount + "</strong> favorites · wishlist <strong>" + stats.wishlistCount + "</strong>" +
          (stats.estimatedSpend ? " · est. spend $" + stats.estimatedSpend : "") +
          "</p>" +
        "</section>" +
        '<div id="ss-cellar-intel"></div>' +
        '<section class="ss-toolbar">' +
          '<label class="ss-field"><span>Instant search</span><input type="search" id="ss-cellar-q" value="' + esc(q) + '" placeholder="Name, grape, location…"></label>' +
          '<label class="ss-check"><input type="checkbox" id="ss-cellar-fav"' + (favOnly ? " checked" : "") + "> Favorites only</label>" +
        "</section>" +
        cellarFormHtml() +
        '<section class="ss-section"><h2>Inventory</h2><div id="ss-cellar-list">' + listHtml + "</div></section>" +
        '<section class="ss-section"><h2>Wishlist</h2>' + wishHtml + "</section>" +
        (buying
          ? '<section class="ss-section"><h2>Buying (architecture)</h2><p class="ss-honesty">' +
            esc(buying.honesty) +
            "</p><p class=\"ss-card__meta\">Future fields: " +
            esc(SavantBuying.COMPARISON_FIELDS.map(function (f) { return f.label; }).join(", ")) +
            "</p></section>"
          : "");


      if (global.SavantWIE && SavantWIE.engine) {
        SavantShell.getJson("data/discover-catalog.json").then(function (res) {
          var pkg = SavantWIE.engine.evaluate({ catalog: res.data, force: true });
          var el = root.querySelector("#ss-cellar-intel");
          if (!el) return;
          var tasting = pkg.tasting || {};
          var cellarI = pkg.cellar || {};
          var purchase = pkg.purchase || {};
          el.innerHTML =
            '<section class="ss-intel">' +
              "<h2>Cellar intelligence</h2>" +
              '<p class="ss-honesty">' + esc(cellarI.honesty || pkg.honesty) + "</p>" +
              (cellarI.insights || []).map(function (i) {
                return '<article class="ss-intel-item"><h3>' + esc(i.text) + '</h3><p><span class="ss-label">Why</span> ' + esc(i.why) + "</p></article>";
              }).join("") +
              ((cellarI.suggestions || []).length
                ? '<h3 class="ss-sub">Suggested improvements</h3>' +
                  (cellarI.suggestions || []).map(function (s) {
                    return "<p><strong>" + esc(s.text) + "</strong> — " + esc(s.why) + "</p>";
                  }).join("")
                : "") +
              "<h2>Tasting patterns</h2>" +
              '<p class="ss-honesty">' + esc(tasting.honesty || "") + "</p>" +
              (tasting.summary || []).map(function (s) { return "<p>" + esc(s) + "</p>"; }).join("") +
              (tasting.teach ? '<p class="ss-visual">' + esc(tasting.teach) + "</p>" : "") +
              "<h2>Purchase intelligence</h2>" +
              '<p class="ss-honesty">' + esc(purchase.honesty || "") + "</p>" +
              "<p>Average bottle price: <strong>" + esc(purchase.averageBottlePrice != null ? ("$" + purchase.averageBottlePrice) : "—") +
              "</strong> · Est. cellar value: <strong>$" + esc(purchase.estimatedCellarValue || 0) + "</strong></p>" +
              (purchase.recommendations || []).map(function (r) {
                return '<p><span class="ss-label">Next buy</span> ' + esc(r.text) + " — " + esc(r.why) + "</p>";
              }).join("") +
              ((pkg.education && pkg.education.cellar) ? '<ul class="ss-teach">' + pkg.education.cellar.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" : "") +
            "</section>";
        }).catch(function () { /* keep cellar usable */ });
      }

      root.querySelector("#ss-cellar-form").addEventListener("submit", function (ev) {
        ev.preventDefault();
        var fd = new FormData(ev.target);
        var pairings = String(fd.get("foodPairings") || "")
          .split(",")
          .map(function (s) { return s.trim(); })
          .filter(Boolean);
        WaypointSavant.saveWine({
          name: fd.get("name"),
          varietal: fd.get("varietal") || null,
          region: fd.get("region") || null,
          country: fd.get("country") || null,
          wineryName: fd.get("wineryName") || null,
          vintage: fd.get("vintage") || null,
          style: fd.get("style") || null,
          quantity: Number(fd.get("quantity") || 1),
          purchasePrice: fd.get("purchasePrice") !== "" ? Number(fd.get("purchasePrice")) : null,
          purchaseDate: fd.get("purchaseDate") || null,
          location: fd.get("location") || null,
          drinkFrom: fd.get("drinkFrom") || null,
          drinkTo: fd.get("drinkTo") || null,
          rating: fd.get("rating") !== "" ? Number(fd.get("rating")) : null,
          notes: fd.get("notes") || null,
          foodPairings: pairings,
          favorite: !!fd.get("favorite")
        });
        paint();
      });

      root.querySelector("#ss-cellar-q").addEventListener("input", paint);
      root.querySelector("#ss-cellar-fav").addEventListener("change", paint);

      root.querySelector("#ss-cellar-list").addEventListener("click", function (ev) {
        var btn = ev.target.closest("button[data-action]");
        if (!btn) return;
        var art = btn.closest(".ss-wine");
        var id = art && art.getAttribute("data-id");
        if (!id) return;
        var wine = WaypointSavant.listWines().find(function (w) { return w.id === id; });
        if (!wine) return;
        if (btn.getAttribute("data-action") === "remove") {
          WaypointSavant.removeWine(id);
        } else if (btn.getAttribute("data-action") === "fav") {
          wine.favorite = !wine.favorite;
          WaypointSavant.saveWine(wine);
        } else if (btn.getAttribute("data-action") === "wish") {
          WaypointSavant.saveWishlistItem({ name: wine.name, wineId: wine.id, region: wine.region });
        }
        paint();
      });

      root.querySelectorAll("[data-wish-remove]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          WaypointSavant.removeWishlistItem(btn.getAttribute("data-wish-remove"));
          paint();
        });
      });
    }

    paint();
  }

  function startVineyard(root) {
    root.innerHTML =
      SavantShell.taskNav("vineyard") +
      '<section class="ss-hero">' +
        '<p class="wds-eyebrow">Flagship · Vineyard Intelligence</p>' +
        "<h1>Vineyard Intelligence</h1>" +
        '<p class="ss-lead">Click a place. Analyze the site. Project grape suitability decades ahead — with explanations.</p>' +
        SavantShell.honestyBanner("Educational scenario engine. Not surveyed soils, certified climate downscaling, or planting advice.") +
      "</section>" +
      '<section class="ss-map-panel" aria-label="Site map">' +
        '<div id="ss-map" class="ss-map" role="application" tabindex="0" aria-label="Click to analyze a location">' +
          '<p class="ss-map__hint">Click anywhere on the map to analyze. Drag is not required — one click runs property analysis.</p>' +
          '<div class="ss-map__grid" aria-hidden="true"></div>' +
          '<div id="ss-map-marker" class="ss-map__marker" hidden></div>' +
        "</div>" +
        '<form class="ss-form ss-form--compact" id="ss-site-form">' +
          "<h2>Or enter coordinates</h2>" +
          '<div class="ss-form-grid">' +
            '<label class="ss-field"><span>Label</span><input name="label" value="Study site"></label>' +
            '<label class="ss-field"><span>Latitude</span><input name="lat" type="number" step="any" value="38.5" required></label>' +
            '<label class="ss-field"><span>Longitude</span><input name="lng" type="number" step="any" value="-122.8" required></label>' +
            '<label class="ss-field"><span>Elevation (m)</span><input name="elevationM" type="number" step="any" placeholder="optional"></label>' +
            '<label class="ss-field"><span>Slope (°)</span><input name="slopeDeg" type="number" step="any" placeholder="optional"></label>' +
            '<label class="ss-field"><span>Aspect (°)</span><input name="aspectDeg" type="number" step="any" placeholder="0–360"></label>' +
          "</div>" +
          '<button type="submit" class="ss-btn">Analyze property</button>' +
        "</form>" +
      "</section>" +
      '<section id="ss-vineyard-out" class="ss-section" aria-live="polite">' +
        '<p class="ss-empty">Select a site to see elevation, climate heuristics, and Future Vineyard horizons.</p>' +
      "</section>";

    var map = root.querySelector("#ss-map");
    var marker = root.querySelector("#ss-map-marker");
    var form = root.querySelector("#ss-site-form");

    function latLngFromClick(ev) {
      var rect = map.getBoundingClientRect();
      var x = (ev.clientX - rect.left) / rect.width;
      var y = (ev.clientY - rect.top) / rect.height;
      var lng = -125 + x * 55;
      var lat = 49 - y * 25;
      return { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000, x: x, y: y };
    }

    function runAnalysis(input) {
      var out = root.querySelector("#ss-vineyard-out");
      out.innerHTML = SavantShell.loadingHtml("Analyzing property…");

      Promise.all([
        Promise.resolve(SavantVineyard.analyzeProperty(input)),
        SavantShell.getJson("data/grape-suitability-models.json")
      ]).then(function (parts) {
        var analysis = parts[0];
        var models = parts[1].data;
        var future = SavantVineyard.futureVineyard(analysis, models);
        var mapReq = SavantMap.clickToAnalyze(analysis.site.lat, analysis.site.lng, analysis.site.label);

        if (global.WaypointSavant && analysis.site.lat != null) {
          WaypointSavant.saveSite({
            label: analysis.site.label,
            lat: analysis.site.lat,
            lng: analysis.site.lng,
            elevationM: analysis.site.elevationM,
            slopeDeg: analysis.site.slopeDeg,
            aspect: analysis.site.aspectDeg,
            hardinessZone: (analysis.metrics.find(function (m) { return m.id === "hardinessZone"; }) || {}).value
          });
        }

        var eduBits = (global.SavantWIE && SavantWIE.education)
          ? SavantWIE.education.forContext({ page: "vineyard" })
          : [];
        var horizonCmp = (global.SavantWIE && SavantWIE.compare)
          ? SavantWIE.compare.compareHorizons(future, 0, 25)
          : null;

        out.innerHTML =
          '<p class="ss-honesty">' + esc(analysis.honesty) + "</p>" +
          "<h2>Property analysis</h2>" +
          "<p>" + esc(analysis.summaryWhy) + "</p>" +
          '<p class="ss-freshness">Confidence: ' + esc(analysis.confidence) +
          " · Map contract overlays ready: " + esc(mapReq.spatialRequest.overlays.join(", ")) + "</p>" +
          (eduBits.length ? '<ul class="ss-teach">' + eduBits.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" : "") +
          '<div class="ss-intel-grid">' +
            '<article class="ss-intel-item"><h3>Major strengths</h3><ul>' +
              (future.strengths || []).map(function (s) { return "<li>" + esc(s.text) + " — " + esc(s.why) + "</li>"; }).join("") +
            "</ul></article>" +
            '<article class="ss-intel-item"><h3>Major risks</h3><ul>' +
              (future.risks || []).map(function (s) { return "<li>" + esc(s.text) + " — " + esc(s.why) + "</li>"; }).join("") +
            "</ul></article>" +
          "</div>" +
          '<div class="ss-metrics">' +
            analysis.metrics.map(function (m) {
              var teach = global.SavantWIE && SavantWIE.education ? SavantWIE.education.forMetric(m) : null;
              return (
                '<article class="ss-metric">' +
                  "<h3>" + esc(m.label) + "</h3>" +
                  '<p class="ss-metric__value">' + esc(m.value) + (m.unit ? " " + esc(m.unit) : "") + "</p>" +
                  '<p class="ss-metric__why"><span class="ss-label">Why it matters</span> ' + esc(m.whyItMatters) + "</p>" +
                  (teach && teach !== m.whyItMatters ? '<p class="ss-card__meta">' + esc(teach) + "</p>" : "") +
                  '<p class="ss-card__meta">' + esc(m.confidence) + "</p>" +
                "</article>"
              );
            }).join("") +
          "</div>" +
          "<h2>Climate trajectory</h2>" +
          '<p class="ss-honesty">' + esc(future.climateTrajectory && future.climateTrajectory.honesty) + "</p>" +
          '<div class="ss-horizons">' +
            ((future.climateTrajectory && future.climateTrajectory.byHorizon) || []).map(function (h) {
              return (
                '<article class="ss-horizon">' +
                  "<h3>" + (h.yearsAhead === 0 ? "Today" : h.yearsAhead + " years") + "</h3>" +
                  "<p>Heat ~" + esc(h.heatAccumulation) + " GDD · season ~" + esc(h.growingSeason) +
                  " days · disease " + esc(h.diseasePressure) + "</p>" +
                  "<p><span class=\"ss-label\">Water demand</span> " + esc(h.waterDemand) + "</p>" +
                  "<p><span class=\"ss-label\">Freeze</span> " + esc(h.freezeProbability) + "</p>" +
                  "<p><span class=\"ss-label\">Variety pressure</span> " + esc(h.varietyPressure) + "</p>" +
                  "<p class=\"ss-freshness\">Uncertainty: " + esc(h.uncertainty) + "</p>" +
                "</article>"
              );
            }).join("") +
          "</div>" +
          (horizonCmp && horizonCmp.ok
            ? "<h2>Today vs 25 years</h2><p class=\"ss-honesty\">" + esc(horizonCmp.honesty) + "</p><ul>" +
              (horizonCmp.changes || []).slice(0, 6).map(function (c) {
                return "<li><strong>" + esc(c.name) + "</strong> (" + (c.delta > 0 ? "+" : "") + esc(c.delta) + "): " + esc(c.why) + "</li>";
              }).join("") + "</ul>"
            : "") +
          "<h2>The Future Vineyard</h2>" +
          '<p class="ss-honesty">' + esc(future.honesty) + "</p>" +
          '<div class="ss-horizons">' +
            future.timeline.map(function (h) {
              return (
                '<section class="ss-horizon">' +
                  "<h3>" + esc(h.label) +
                  (h.yearsAhead ? " · +" + esc(h.warmingC) + "°C scenario" : "") +
                  "</h3>" +
                  '<p class="ss-freshness">' + esc(h.honesty) + "</p>" +
                  "<h4 class=\"ss-sub\">Recommended</h4>" +
                  h.recommended.map(function (g) {
                    return (
                      '<article class="ss-grape-rec">' +
                        "<h4>" + esc(g.name) + " · " + esc(g.score) + "% educational fit</h4>" +
                        '<p><span class="ss-label">Why</span> ' + esc(g.why) + "</p>" +
                        '<p><span class="ss-label">Climate suitability</span> ' + esc(g.climateSuitability) +
                        " · <span class=\"ss-label\">Expected quality</span> " + esc(g.expectedQuality) + "</p>" +
                        '<p><span class="ss-label">Heat stress</span> ' + esc(g.heatStress) +
                        " · <span class=\"ss-label\">Disease</span> " + esc(g.diseasePressure) +
                        " · <span class=\"ss-label\">Freeze risk</span> " + esc(g.freezeRisk) + "</p>" +
                        '<p><span class="ss-label">Water demand</span> ' + esc(g.waterDemand) + "</p>" +
                        '<p><span class="ss-label">Growing challenges</span> ' + esc((g.growingChallenges || []).join(" ")) + "</p>" +
                        '<p><span class="ss-label">Expected changes</span> ' + esc(g.expectedChanges) + "</p>" +
                        '<p class="ss-card__meta">Confidence: ' + esc(g.confidence) + "</p>" +
                      "</article>"
                    );
                  }).join("") +
                  ((h.notRecommended || []).length
                    ? "<h4 class=\"ss-sub\">Not strongly recommended</h4>" +
                      h.notRecommended.map(function (g) {
                        return (
                          '<article class="ss-grape-rec ss-grape-rec--not">' +
                            "<h4>" + esc(g.name) + " · " + esc(g.score) + "%</h4>" +
                            '<p><span class="ss-label">Why not</span> ' + esc(g.whyNot || g.why) + "</p>" +
                          "</article>"
                        );
                      }).join("")
                    : "") +
                "</section>"
              );
            }).join("") +
          "</div>" +
          '<section class="ss-section"><h2>Map architecture</h2><ul class="ss-contract-list">' +
            SavantMap.OVERLAY_KINDS.map(function (o) {
              return "<li><strong>" + esc(o.label) + "</strong> — " + esc(o.status) + "</li>";
            }).join("") +
          "</ul></section>";
      }).catch(function (err) {
        out.innerHTML = SavantShell.errorHtml(String(err && err.message || err));
      });
    }

    map.addEventListener("click", function (ev) {
      var pt = latLngFromClick(ev);
      marker.hidden = false;
      marker.style.left = pt.x * 100 + "%";
      marker.style.top = pt.y * 100 + "%";
      form.lat.value = pt.lat;
      form.lng.value = pt.lng;
      runAnalysis({ label: "Map selection", lat: pt.lat, lng: pt.lng });
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var fd = new FormData(form);
      runAnalysis({
        label: fd.get("label") || "Study site",
        lat: Number(fd.get("lat")),
        lng: Number(fd.get("lng")),
        elevationM: fd.get("elevationM") !== "" ? Number(fd.get("elevationM")) : null,
        slopeDeg: fd.get("slopeDeg") !== "" ? Number(fd.get("slopeDeg")) : null,
        aspectDeg: fd.get("aspectDeg") !== "" ? Number(fd.get("aspectDeg")) : null
      });
    });
  }

  function startSettings(root) {
    var settings = global.WaypointSavant ? WaypointSavant.readSettings() : {};
    var stats = global.WaypointSavant ? WaypointSavant.cellarStats() : {};
    root.innerHTML =
      SavantShell.taskNav("settings") +
      '<section class="ss-hero">' +
        '<p class="wds-eyebrow">Savant Sommelier</p>' +
        "<h1>Settings</h1>" +
        '<p class="ss-lead">Privacy defaults, units, and local data controls.</p>' +
      "</section>" +
      '<form class="ss-form" id="ss-settings-form">' +
        '<label class="ss-field"><span>Display name</span><input name="displayName" value="' + esc(settings.displayName || "") + '"></label>' +
        '<label class="ss-field"><span>Preferred units</span>' +
          '<select name="units">' +
            '<option value="metric"' + (settings.units !== "imperial" ? " selected" : "") + ">Metric</option>" +
            '<option value="imperial"' + (settings.units === "imperial" ? " selected" : "") + ">Imperial</option>" +
          "</select></label>" +
        '<label class="ss-check"><input type="checkbox" name="compactNav"' + (settings.compactNav ? " checked" : "") + "> Compact task labels</label>" +
        '<button type="submit" class="ss-btn">Save settings</button>' +
      "</form>" +
      '<section class="ss-section">' +
        "<h2>Local data</h2>" +
        "<p>" + esc(stats.wineCount || 0) + " wines · " + esc(stats.siteCount || 0) + " sites · " +
        esc(stats.wishlistCount || 0) + " wishlist items stored in this browser.</p>" +
        '<button type="button" class="ss-btn ss-btn--danger" id="ss-clear">Clear all local Savant data</button>' +
      "</section>" +
      '<section class="ss-section">' +
        "<h2>Platform</h2>" +
        "<p>Savant shares Waypoint shell navigation, foundation patterns, and honesty-first intelligence labeling with ForageCast and other Studio apps.</p>" +
      "</section>";

    root.querySelector("#ss-settings-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var fd = new FormData(ev.target);
      WaypointSavant.saveSettings({
        displayName: fd.get("displayName") || "",
        units: fd.get("units") || "metric",
        compactNav: !!fd.get("compactNav")
      });
      var note = document.createElement("p");
      note.className = "ss-freshness";
      note.textContent = "Settings saved locally.";
      ev.target.appendChild(note);
    });

    root.querySelector("#ss-clear").addEventListener("click", function () {
      if (confirm("Clear all local Savant cellar, sites, and wishlist data?")) {
        WaypointSavant.clearAllLocal();
        if (global.SavantWIE && SavantWIE.engine) SavantWIE.engine.clearCache();
        startSettings(root);
      }
    });
  }

  function start(view) {
    SavantShell.mountShell();
    var root = document.getElementById("savant-page");
    if (!root) return;
    root.setAttribute("aria-busy", "true");
    try {
      if (view === "discover") startDiscover(root);
      else if (view === "learn") startLearn(root);
      else if (view === "cellar") startCellar(root);
      else if (view === "vineyard") startVineyard(root);
      else if (view === "settings") startSettings(root);
      else startDiscover(root);
    } finally {
      root.setAttribute("aria-busy", "false");
    }
  }

  global.SavantViews = {
    start: start,
    matchEntry: matchEntry
  };
})(typeof window !== "undefined" ? window : globalThis);
