/**
 * Fieldry — WOS observation form
 */
(function (global) {
  "use strict";

  var U = function () { return global.FieldryUtil; };

  function val(obs, path, fallback) {
    var parts = path.split(".");
    var cur = obs;
    for (var i = 0; i < parts.length; i += 1) {
      if (!cur) return fallback != null ? fallback : "";
      cur = cur[parts[i]];
    }
    return cur != null ? cur : (fallback != null ? fallback : "");
  }

  function field(id, label, input, hint) {
    return (
      '<div class="wds-field fld-field">' +
        '<label class="wds-label" for="' + id + '">' + label + "</label>" +
        input +
        (hint ? '<p class="fld-hint">' + hint + "</p>" : "") +
      "</div>"
    );
  }

  function textInput(id, name, value, opts) {
    opts = opts || {};
    return '<input class="wds-input" type="' + (opts.type || "text") + '" id="' + id + '" name="' + name + '" value="' + U().escapeHtml(value) + '"' +
      (opts.placeholder ? ' placeholder="' + U().escapeHtml(opts.placeholder) + '"' : "") +
      (opts.required ? " required" : "") +
      (opts.readonly ? " readonly" : "") +
      (opts.step ? ' step="' + opts.step + '"' : "") +
      ">";
  }

  function textarea(id, name, value, rows) {
    return '<textarea class="wds-textarea" id="' + id + '" name="' + name + '" rows="' + (rows || 4) + '">' + U().escapeHtml(value) + "</textarea>";
  }

  function selectOptions(name, options, selected) {
    return '<select class="wds-select" id="' + name + '" name="' + name + '">' +
      options.map(function (opt) {
        var sel = opt.value === selected ? " selected" : "";
        return '<option value="' + U().escapeHtml(opt.value) + '"' + sel + ">" + U().escapeHtml(opt.label) + "</option>";
      }).join("") +
    "</select>";
  }

  function confidenceOptions(selected) {
    var O = global.WDS && global.WDS.observations;
    var levels = O ? O.CONFIDENCE : ["certain", "likely", "possible", "uncertain", "not_recorded"];
    return levels.map(function (v) {
      return { value: v, label: U().confidenceLabel(v) };
    });
  }

  function weatherReadonly(obs) {
    var snap = obs.context && obs.context.weatherSnapshot;
    if (!snap) {
      return '<p class="fld-hint">Weather snapshot fills from regional context when available. You can note conditions in observation notes.</p>';
    }
    var parts = [];
    if (snap.conditions) parts.push(snap.conditions);
    if (snap.temperatureF != null) parts.push(snap.temperatureF + "°F");
    return '<p class="fld-weather-snap">' + U().escapeHtml(parts.join(" · ") || "Captured at save") + "</p>";
  }

  function render(obs, options) {
    options = options || {};
    var isEdit = !!options.isEdit;
    var fieldry = (obs.meta && obs.meta.fieldry) || {};
    var typeOpts = [{ value: "", label: "Select type…" }].concat(
      U().OBSERVATION_TYPES.map(function (t) { return { value: t.value, label: t.label }; })
    );

    return (
      '<form class="fld-form" id="fld-observation-form" novalidate>' +
        '<input type="hidden" name="id" value="' + U().escapeHtml(obs.id) + '">' +
        '<header class="fld-form__head">' +
          '<a class="fld-form__back" href="#/">← Ledger</a>' +
          '<h1 class="fld-form__title">' + (isEdit ? "Edit observation" : "New observation") + "</h1>" +
          '<p class="fld-form__lead">Structured field record · WOS v1 · saved locally on this device</p>' +
          '<p class="fld-form__tip">' + U().escapeHtml(U().randomTip()) + "</p>" +
        "</header>" +
        '<div class="fld-form__layout">' +
          '<div class="fld-form__main">' +
            '<fieldset class="fld-form__group">' +
              '<legend>Essential record</legend>' +
              field("fld-title", "Observation title", textInput("fld-title", "title", val(obs, "taxon.label"), {
                placeholder: "e.g. Wood frog chorus at wetland edge",
                required: true
              }), "Short label for this record — what you noticed.") +
              field("fld-type", "Observation type", selectOptions("observationType", typeOpts, fieldry.observationType || "")) +
              field("fld-species", "Species <span class='fld-optional'>(optional)</span>", textInput("fld-species", "species", val(obs, "taxon.commonName"), {
                placeholder: "Common name if applicable"
              })) +
              field("fld-date", "Date", textInput("fld-date", "date", val(obs, "observedAt.date"), { type: "date", required: true })) +
              field("fld-time", "Time <span class='fld-optional'>(optional)</span>", textInput("fld-time", "time", val(obs, "observedAt.time"), { type: "time" })) +
              field("fld-confidence", "Confidence", selectOptions("confidence", confidenceOptions(val(obs, "record.confidence", "likely")), val(obs, "record.confidence", "likely")),
                "Record uncertainty honestly — tentative IDs are valuable.") +
              field("fld-habitat", "Habitat", textInput("fld-habitat", "habitat", val(obs, "habitat.label"), {
                placeholder: "e.g. Riparian hardwood, north-facing slope"
              }), "Habitat often matters as much as species.") +
              field("fld-notes", "Observation notes", textarea("fld-notes", "notes", val(obs, "record.notes"), 5),
                "Describe what you observed — behavior, signs, context — not conclusions.") +
            "</fieldset>" +
            '<details class="fld-form__advanced">' +
              '<summary>Location &amp; context</summary>' +
              '<div class="fld-form__advanced-body">' +
                field("fld-lat", "Latitude", textInput("fld-lat", "latitude", val(obs, "location.latitude"), { type: "number", step: "any" })) +
                field("fld-lon", "Longitude", textInput("fld-lon", "longitude", val(obs, "location.longitude"), { type: "number", step: "any" })) +
                '<p class="fld-form__gps"><button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="fld-use-gps">Use current location</button></p>' +
                field("fld-county", "County", textInput("fld-county", "county", val(obs, "location.county"))) +
                field("fld-state", "State", textInput("fld-state", "state", val(obs, "location.state"))) +
                field("fld-season", "Season", textInput("fld-season", "season", val(obs, "context.season"), { placeholder: "e.g. late spring" })) +
                field("fld-phenology", "Phenology stage", textInput("fld-phenology", "phenologyStage", val(obs, "context.phenologyStage"), { placeholder: "e.g. budding, fruiting" })) +
                '<div class="wds-field fld-field">' +
                  '<span class="wds-label">Weather snapshot</span>' +
                  weatherReadonly(obs) +
                "</div>" +
              "</div>" +
            "</details>" +
            '<details class="fld-form__advanced">' +
              '<summary>Taxonomy, media &amp; future fields</summary>' +
              '<div class="fld-form__advanced-body">' +
                field("fld-scientific", "Scientific name <span class='fld-future'>(future enrichment)</span>", textInput("fld-scientific", "scientificName", val(obs, "taxon.scientificName"), {
                  placeholder: "Optional — verify before recording"
                })) +
                field("fld-elevation", "Elevation", textInput("fld-elevation", "elevationFt", val(obs, "location.elevationFt"), {
                  readonly: true,
                  placeholder: "Future placeholder"
                })) +
                '<div class="fld-media fld-media--placeholder">' +
                  '<p class="wds-label">Photographs</p>' +
                  '<p class="fld-hint">Photo attachment stores locally in a future update. Photograph before collecting.</p>' +
                "</div>" +
                '<p class="fld-hint">Audio and video — future capability.</p>' +
                field("fld-ethical", "Ethical notes", textarea("fld-ethical", "ethicalNotes", fieldry.ethicalNotes || "", 3),
                  "Leave No Trace, wildlife distance, private property, sensitive locations.") +
                '<div class="fld-form__future-grid">' +
                  field("fld-visibility", "Private / public", textInput("fld-visibility", "_visibility", "Private — device only", { readonly: true })) +
                  field("fld-verification", "Verification status", textInput("fld-verification", "_verification", "Unverified — future workflow", { readonly: true })) +
                "</div>" +
              "</div>" +
            "</details>" +
            '<footer class="fld-form__foot">' +
              '<button type="submit" class="wds-btn wds-btn--primary">' + (isEdit ? "Save changes" : "Save observation") + "</button>" +
              '<a class="wds-btn wds-btn--ghost" href="#/">Cancel</a>' +
            "</footer>" +
          "</div>" +
          '<aside class="fld-form__aside">' +
            U().ethicsHtml() +
            '<div class="fld-form__ethics-list">' +
              "<h2>Field ethics</h2>" +
              "<ul>" +
                "<li>Leave No Trace on trails and substrates.</li>" +
                "<li>Observe wildlife without disturbing nests or dens.</li>" +
                "<li>Respect private property — permission first.</li>" +
                "<li>Never reveal sensitive locations publicly.</li>" +
                "<li>Conservation before collection.</li>" +
              "</ul>" +
            "</div>" +
          "</aside>" +
        "</div>" +
      "</form>"
    );
  }

  function readForm(form) {
    var fd = new FormData(form);
    var obs = global.FieldryStorage.get(fd.get("id")) || global.FieldryStorage.createDraft(null, null);
    if (!obs) {
      var O = global.WDS && global.WDS.observations;
      obs = O ? O.emptyObservation({ source: "fieldry" }) : {};
    }

    obs.taxon.label = String(fd.get("title") || "").trim();
    obs.taxon.commonName = String(fd.get("species") || "").trim() || null;
    obs.taxon.scientificName = String(fd.get("scientificName") || "").trim() || null;
    obs.observedAt.date = fd.get("date") || obs.observedAt.date;
    obs.observedAt.time = fd.get("time") || null;
    obs.record.confidence = fd.get("confidence") || "not_recorded";
    obs.record.notes = String(fd.get("notes") || "").trim() || null;
    obs.habitat.label = String(fd.get("habitat") || "").trim() || null;

    var lat = fd.get("latitude");
    var lon = fd.get("longitude");
    obs.location.latitude = lat !== "" && lat != null ? Number(lat) : null;
    obs.location.longitude = lon !== "" && lon != null ? Number(lon) : null;
    obs.location.county = String(fd.get("county") || "").trim() || obs.location.county;
    obs.location.state = String(fd.get("state") || "").trim() || obs.location.state;
    obs.context.season = String(fd.get("season") || "").trim() || null;
    obs.context.phenologyStage = String(fd.get("phenologyStage") || "").trim() || null;

    obs.meta.fieldry = obs.meta.fieldry || {};
    obs.meta.fieldry.observationType = fd.get("observationType") || null;
    obs.meta.fieldry.ethicalNotes = String(fd.get("ethicalNotes") || "").trim() || null;

    if (!obs.taxon.label) {
      obs.taxon.label = obs.taxon.commonName || "Field observation";
    }

    return obs;
  }

  function bind(form, options) {
    options = options || {};
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var obs = readForm(form);
      if (!obs.taxon.label) {
        alert("Please add an observation title.");
        return;
      }
      if (options.platform || options.loc) {
        obs = global.FieldryStorage.hydrateFromContext(obs, options.platform, options.loc);
      }
      global.FieldryStorage.save(obs);
      if (options.onSaved) options.onSaved(obs);
      window.location.hash = "#/obs/" + encodeURIComponent(obs.id);
    });

    var gpsBtn = form.querySelector("#fld-use-gps");
    if (gpsBtn && navigator.geolocation) {
      gpsBtn.addEventListener("click", function () {
        gpsBtn.disabled = true;
        gpsBtn.textContent = "Locating…";
        navigator.geolocation.getCurrentPosition(function (pos) {
          form.querySelector('[name="latitude"]').value = Number(pos.coords.latitude.toFixed(6));
          form.querySelector('[name="longitude"]').value = Number(pos.coords.longitude.toFixed(6));
          gpsBtn.disabled = false;
          gpsBtn.textContent = "Use current location";
        }, function () {
          gpsBtn.disabled = false;
          gpsBtn.textContent = "Use current location";
          alert("Could not read GPS — enter coordinates manually or use county only.");
        }, { enableHighAccuracy: true, timeout: 12000 });
      });
    } else if (gpsBtn) {
      gpsBtn.disabled = true;
    }
  }

  global.FieldryForm = {
    render: render,
    bind: bind,
    readForm: readForm
  };
})(window);
