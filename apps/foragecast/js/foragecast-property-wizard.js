/**
 * ForageCast — first-run / edit property wizard (skippable steps)
 */
(function (global) {
  "use strict";

  var STEPS = [
    "basics",
    "goals",
    "land",
    "orchard",
    "garden",
    "wildlife",
    "water",
    "infra",
    "photos",
    "review"
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function uid(prefix) {
    return (prefix || "row") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  function loadCatalog() {
    if (global.WDS && WDS.platformUi && WDS.platformUi.getJson) {
      return WDS.platformUi.getJson("data/property-catalog.json", { providerId: "foragecast-data" }).then(function (pack) {
        return pack && pack.data != null ? pack.data : pack;
      });
    }
    return fetch("data/property-catalog.json").then(function (r) {
      if (!r.ok) throw new Error("catalog");
      return r.json();
    });
  }

  function checks(name, items, selected) {
    selected = selected || [];
    return (items || []).map(function (item) {
      var on = selected.indexOf(item.id) >= 0;
      return (
        '<label class="fc-check">' +
          '<input type="checkbox" name="' + esc(name) + '" value="' + esc(item.id) + '"' + (on ? " checked" : "") + ">" +
          "<span>" + esc(item.label) + "</span>" +
        "</label>"
      );
    }).join("");
  }

  function readChecked(root, name) {
    return Array.prototype.map.call(root.querySelectorAll('input[name="' + name + '"]:checked'), function (el) {
      return el.value;
    });
  }

  function orchardRowsHtml(orchard, catalog) {
    orchard = orchard && orchard.length ? orchard : [];
    if (!orchard.length) {
      orchard = [{ id: uid("tree"), species: "", quantity: 1, age: "unknown", notes: "" }];
    }
    return orchard.map(function (row) {
      var speciesOpts = (catalog.orchardSpecies || []).map(function (s) {
        return '<option value="' + esc(s.id) + '"' + (s.id === row.species ? " selected" : "") + ">" + esc(s.label) + "</option>";
      }).join("");
      var ageOpts = (catalog.treeAges || []).map(function (a) {
        return '<option value="' + esc(a.id) + '"' + (a.id === (row.age || "unknown") ? " selected" : "") + ">" + esc(a.label) + "</option>";
      }).join("");
      return (
        '<div class="fc-orchard-row" data-tree-id="' + esc(row.id) + '">' +
          '<label class="fc-field"><span>Tree</span><select data-field="species"><option value="">Select…</option>' + speciesOpts + "</select></label>" +
          '<label class="fc-field"><span>Quantity</span><input data-field="quantity" type="number" min="1" max="999" value="' + esc(row.quantity || 1) + '"></label>' +
          '<label class="fc-field"><span>Age</span><select data-field="age">' + ageOpts + "</select></label>" +
          '<label class="fc-field fc-field--wide"><span>Notes</span><input data-field="notes" type="text" maxlength="120" value="' + esc(row.notes || "") + '" placeholder="Variety, rootstock…"></label>' +
          '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" data-remove-tree>Remove</button>' +
        "</div>"
      );
    }).join("");
  }

  function collectOrchard(root) {
    return Array.prototype.map.call(root.querySelectorAll(".fc-orchard-row"), function (row) {
      var species = (row.querySelector('[data-field="species"]') || {}).value;
      if (!species) return null;
      var qty = Number((row.querySelector('[data-field="quantity"]') || {}).value);
      return {
        id: row.getAttribute("data-tree-id") || uid("tree"),
        species: species,
        quantity: isNaN(qty) || qty < 1 ? 1 : qty,
        age: (row.querySelector('[data-field="age"]') || {}).value || "unknown",
        notes: ((row.querySelector('[data-field="notes"]') || {}).value || "").trim()
      };
    }).filter(Boolean);
  }

  function mountWizard() {
    var mount = document.getElementById("fc-wizard-mount");
    if (!mount || !global.ForageCastProfile) return;

    var state = {
      step: 0,
      catalog: null,
      draft: ForageCastProfile.loadProperty()
    };

    function progress() {
      return (
        '<div class="fc-wizard__progress" role="status">' +
          "Step " + (state.step + 1) + " of " + STEPS.length + " · " +
          '<button type="button" class="fc-linkish" data-skip-all>Skip setup for now</button>' +
        "</div>"
      );
    }

    function nav() {
      return (
        '<div class="fc-wizard__nav">' +
          (state.step > 0 ? '<button type="button" class="wds-btn wds-btn--ghost" data-back>Back</button>' : "") +
          '<button type="button" class="wds-btn wds-btn--ghost" data-skip-step>Skip</button>' +
          (state.step < STEPS.length - 1
            ? '<button type="button" class="wds-btn wds-btn--primary" data-next>Continue</button>'
            : '<button type="button" class="wds-btn wds-btn--primary" data-finish>Save property</button>') +
        "</div>"
      );
    }

    function renderStep() {
      var id = STEPS[state.step];
      var c = state.catalog;
      var d = state.draft;
      var body = "";

      if (id === "basics") {
        var zoneOpts = (c.usdaZones || []).map(function (z) {
          return '<option value="' + esc(z) + '"' + (d.usdaZone === z ? " selected" : "") + ">" + esc(z) + "</option>";
        }).join("");
        body =
          "<h1>Name your place</h1>" +
          '<p class="fc-land-lead">A calm start — you can refine everything later. Private by default.</p>' +
          '<div class="fc-wizard__fields">' +
            '<label class="fc-field"><span>Property name</span><input id="wiz-name" type="text" maxlength="80" value="' + esc(d.name || "") + '" placeholder="e.g. Ridge Hollow"></label>' +
            '<label class="fc-field"><span>Location</span><input id="wiz-location" type="text" maxlength="120" value="' + esc(d.locationLabel || "") + '" placeholder="County, state, or place name"></label>' +
            '<label class="fc-field"><span>USDA hardiness zone</span><select id="wiz-zone"><option value="">Not sure yet</option>' + zoneOpts + "</select></label>" +
            '<label class="fc-field"><span>Approximate acreage</span><input id="wiz-acreage" type="text" maxlength="20" value="' + esc(d.acreage || "") + '" placeholder="e.g. 2.5 or backyard"></label>' +
          "</div>";
      } else if (id === "goals") {
        body =
          "<h1>Primary goals</h1>" +
          '<p class="fc-land-lead">What matters most on this land? Choose as many as you like.</p>' +
          '<div class="fc-check-grid">' + checks("goal", c.goals, d.goals) + "</div>";
      } else if (id === "land") {
        body =
          "<h1>Land types</h1>" +
          '<p class="fc-land-lead">Select every habitat that exists here.</p>' +
          '<div class="fc-check-grid">' + checks("land", c.landTypes, d.landTypes) + "</div>";
      } else if (id === "orchard") {
        body =
          "<h1>Orchard &amp; trees</h1>" +
          '<p class="fc-land-lead">Add trees with approximate quantity, age, and notes.</p>' +
          '<div id="wiz-orchard">' + orchardRowsHtml(d.orchard, c) + "</div>" +
          '<p><button type="button" class="wds-btn wds-btn--secondary wds-btn--sm" data-add-tree>Add another tree</button></p>' +
          '<h2 class="fc-wizard__sub">Berries</h2>' +
          '<div class="fc-check-grid">' + checks("berry", c.berries, d.berries) + "</div>";
      } else if (id === "garden") {
        body =
          "<h1>Garden</h1>" +
          '<p class="fc-land-lead">How do you grow food here?</p>' +
          '<div class="fc-check-grid">' + checks("garden", c.gardenTypes, d.gardenTypes) + "</div>";
      } else if (id === "wildlife") {
        body =
          "<h1>Wildlife features</h1>" +
          '<p class="fc-land-lead">Habitat you maintain for birds, bats, bees, and more.</p>' +
          '<div class="fc-check-grid">' + checks("wildlife", c.wildlife, d.wildlife) + "</div>";
      } else if (id === "water") {
        body =
          "<h1>Water</h1>" +
          '<p class="fc-land-lead">Natural and built water features.</p>' +
          '<div class="fc-check-grid">' + checks("water", c.water, d.water) + "</div>";
      } else if (id === "infra") {
        body =
          "<h1>Infrastructure</h1>" +
          '<p class="fc-land-lead">Compost, logs, coops, and other working pieces of the land.</p>' +
          '<div class="fc-check-grid">' + checks("infra", c.infrastructure, d.infrastructure) + "</div>";
      } else if (id === "photos") {
        body =
          "<h1>Photos</h1>" +
          '<p class="fc-land-lead">Optional. Photos stay on this device and can help future on-device guidance understand your land. Max ' +
          ForageCastProfile.MAX_PHOTOS + ".</p>" +
          '<label class="fc-field"><span>Category</span><select id="wiz-photo-cat">' +
            (c.photoCategories || []).map(function (p) {
              return '<option value="' + esc(p.id) + '">' + esc(p.label) + "</option>";
            }).join("") +
          "</select></label>" +
          '<label class="fc-field"><span>Add a photo</span><input id="wiz-photo-file" type="file" accept="image/*"></label>' +
          '<p class="fc-save-status" id="wiz-photo-status" aria-live="polite"></p>' +
          '<div class="fc-photo-grid" id="wiz-photo-grid"></div>';
      } else {
        var sum = ForageCastProfile.summarize(d, c);
        body =
          "<h1>Review</h1>" +
          '<p class="fc-land-lead">This profile powers Today’s recommendations. You can edit anytime.</p>' +
          '<dl class="fc-review">' +
            "<div><dt>Name</dt><dd>" + esc(sum.name) + "</dd></div>" +
            "<div><dt>Location</dt><dd>" + esc(sum.locationLabel || "—") + "</dd></div>" +
            "<div><dt>USDA zone</dt><dd>" + esc(sum.usdaZone || "—") + "</dd></div>" +
            "<div><dt>Acreage</dt><dd>" + esc(sum.acreage || "—") + "</dd></div>" +
            "<div><dt>Orchard trees</dt><dd>" + esc(String(sum.orchardTreeCount)) + "</dd></div>" +
            "<div><dt>Photos</dt><dd>" + esc(String(sum.photoCount)) + "</dd></div>" +
          "</dl>" +
          (sum.labels.length ? "<p><strong>Highlights:</strong> " + esc(sum.labels.join(" · ")) + "</p>" : "") +
          '<label class="fc-field"><span>Notes</span><textarea id="wiz-notes" rows="3" maxlength="800">' + esc(d.notes || "") + "</textarea></label>";
      }

      mount.innerHTML =
        '<header class="fc-land-hero">' +
          '<p class="wds-eyebrow"><a href="property.html">Property</a> · Setup</p>' +
          progress() +
        "</header>" +
        '<section class="fc-wizard__panel" aria-live="polite">' + body + nav() + "</section>" +
        '<p class="fc-land-note" role="note">' + esc(c.privacyNote || "Private by default.") + "</p>";

      bindStep();
      if (id === "photos") renderPhotoGrid();
    }

    function harvestBasics() {
      var d = state.draft;
      d.name = ((document.getElementById("wiz-name") || {}).value || "").trim();
      d.locationLabel = ((document.getElementById("wiz-location") || {}).value || "").trim();
      d.usdaZone = ((document.getElementById("wiz-zone") || {}).value || "").trim();
      d.acreage = ((document.getElementById("wiz-acreage") || {}).value || "").trim();
    }

    function harvestCurrent() {
      var id = STEPS[state.step];
      var panel = mount;
      if (id === "basics") harvestBasics();
      else if (id === "goals") state.draft.goals = readChecked(panel, "goal");
      else if (id === "land") state.draft.landTypes = readChecked(panel, "land");
      else if (id === "orchard") {
        state.draft.orchard = collectOrchard(panel);
        state.draft.berries = readChecked(panel, "berry");
      } else if (id === "garden") state.draft.gardenTypes = readChecked(panel, "garden");
      else if (id === "wildlife") state.draft.wildlife = readChecked(panel, "wildlife");
      else if (id === "water") state.draft.water = readChecked(panel, "water");
      else if (id === "infra") state.draft.infrastructure = readChecked(panel, "infra");
      else if (id === "review") {
        state.draft.notes = ((document.getElementById("wiz-notes") || {}).value || "").trim();
      }
    }

    function renderPhotoGrid() {
      var grid = document.getElementById("wiz-photo-grid");
      if (!grid) return;
      var photos = state.draft.photos || [];
      if (!photos.length) {
        grid.innerHTML = '<p class="fc-muted">No photos yet.</p>';
        return;
      }
      grid.innerHTML = photos.map(function (p) {
        return (
          '<figure class="fc-photo-card" data-photo-id="' + esc(p.id) + '">' +
            '<div class="fc-photo-card__img" data-photo-slot="' + esc(p.id) + '"></div>' +
            "<figcaption>" + esc(p.category) +
              ' <button type="button" class="fc-linkish" data-del-photo="' + esc(p.id) + '">Remove</button>' +
            "</figcaption>" +
          "</figure>"
        );
      }).join("");
      photos.forEach(function (p) {
        ForageCastProfile.photoObjectUrl(p.id).then(function (url) {
          var slot = grid.querySelector('[data-photo-slot="' + p.id + '"]');
          if (slot && url) {
            slot.style.backgroundImage = 'url("' + url + '")';
            slot.setAttribute("data-object-url", url);
          }
        });
      });
    }

    function bindStep() {
      mount.querySelectorAll("[data-next]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          harvestCurrent();
          state.step = Math.min(STEPS.length - 1, state.step + 1);
          renderStep();
        });
      });
      mount.querySelectorAll("[data-back]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          harvestCurrent();
          state.step = Math.max(0, state.step - 1);
          renderStep();
        });
      });
      mount.querySelectorAll("[data-skip-step]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.step = Math.min(STEPS.length - 1, state.step + 1);
          renderStep();
        });
      });
      mount.querySelectorAll("[data-skip-all]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.draft.wizardDismissed = true;
          ForageCastProfile.saveProperty(state.draft, state.catalog);
          location.href = "property.html";
        });
      });
      mount.querySelectorAll("[data-finish]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          harvestCurrent();
          state.draft.wizardCompleted = true;
          state.draft.wizardDismissed = false;
          ForageCastProfile.saveProperty(state.draft, state.catalog);
          ForageCastProfile.saveIntent({ priorities: (state.draft.goals && state.draft.goals.length) ? state.draft.goals : ["forage"] });
          location.href = "property.html?saved=1";
        });
      });
      mount.querySelectorAll("[data-add-tree]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          harvestCurrent();
          state.draft.orchard = state.draft.orchard || [];
          state.draft.orchard.push({ id: uid("tree"), species: "apple", quantity: 1, age: "unknown", notes: "" });
          renderStep();
        });
      });
      mount.querySelectorAll("[data-remove-tree]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var row = btn.closest(".fc-orchard-row");
          if (row) row.parentNode.removeChild(row);
        });
      });
      var file = document.getElementById("wiz-photo-file");
      if (file) {
        file.addEventListener("change", function () {
          var f = file.files && file.files[0];
          if (!f) return;
          var cat = (document.getElementById("wiz-photo-cat") || {}).value || "entire-property";
          var status = document.getElementById("wiz-photo-status");
          if (status) status.textContent = "Saving photo on this device…";
          ForageCastProfile.addPhoto(f, cat, "").then(function () {
            state.draft = ForageCastProfile.loadProperty();
            if (status) status.textContent = "Photo saved locally.";
            file.value = "";
            renderPhotoGrid();
          }).catch(function (err) {
            if (status) status.textContent = err.message || "Could not save photo.";
          });
        });
      }
      mount.querySelectorAll("[data-del-photo]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-del-photo");
          ForageCastProfile.removePhoto(id).then(function () {
            state.draft = ForageCastProfile.loadProperty();
            renderPhotoGrid();
          });
        });
      });
    }

    loadCatalog().then(function (catalog) {
      state.catalog = catalog;
      // If editing empty orchard placeholder with blank species, leave empty for cleaner UX
      if (state.draft.orchard && state.draft.orchard.length === 1 && !state.draft.orchard[0].species) {
        state.draft.orchard = [];
      }
      renderStep();
      mount.removeAttribute("aria-busy");
    }).catch(function () {
      mount.innerHTML = '<p class="wds-body" role="alert">Could not load the property setup catalog.</p>';
    });
  }

  global.ForageCastPropertyWizard = { mount: mountWizard, STEPS: STEPS };

  if (document.getElementById("fc-wizard-mount")) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mountWizard);
    } else {
      mountWizard();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
