/**
 * Fieldry — mobile-first observation capture (WOS + Knowledge)
 */
(function (global) {
  "use strict";

  var U = function () { return global.FieldryUtil; };
  var Life = function () { return global.WaypointFieldryLifeList; };

  var LOCATION_PRECISION_OPTS = [
    { value: "exact", label: "Exact" },
    { value: "obfuscated", label: "Approximate" },
    { value: "county", label: "Regional" },
    { value: "hidden", label: "Hidden" }
  ];

  var PRIVACY_OPTS = [
    { value: "private", label: "Private (device only)" },
    { value: "shared", label: "Shared" },
    { value: "public", label: "Public" },
    { value: "anonymized", label: "Anonymized" }
  ];

  var ID_STATUS_OPTS = [
    { value: "identified", label: "Identified" },
    { value: "tentative", label: "Tentative" },
    { value: "unidentified", label: "Unidentified — identify later" }
  ];

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
      (opts.min ? ' min="' + opts.min + '"' : "") +
      (opts.list ? ' list="' + opts.list + '"' : "") +
      (opts.autocomplete ? ' autocomplete="' + opts.autocomplete + '"' : "") +
      (opts.ariaDescribedBy ? ' aria-describedby="' + opts.ariaDescribedBy + '"' : "") +
      ">";
  }

  function textarea(id, name, value, rows) {
    return '<textarea class="wds-textarea" id="' + id + '" name="' + name + '" rows="' + (rows || 4) + '">' + U().escapeHtml(value) + "</textarea>";
  }

  function selectOptions(name, options, selected) {
    return '<select class="wds-select" id="' + name + '" name="' + name + '">' +
      options.map(function (opt) {
        var sel = String(opt.value) === String(selected) ? " selected" : "";
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

  function categoryOptions(selected) {
    var cats = Life().CATEGORIES;
    return [{ value: "", label: "Select category…" }].concat(
      cats.map(function (c) { return { value: c.id, label: c.label }; })
    );
  }

  function weatherReadonly(obs) {
    var snap = obs.context && obs.context.weatherSnapshot;
    if (!snap) {
      return '<p class="fld-hint">Weather fills from regional context when available.</p>';
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
    var ext = Life().fieldryExt(obs);
    var category = fieldry.category || ext.category || "";
    var tags = (fieldry.tags || ext.tags || []).join(", ");
    var privacy = fieldry.privacyLevel || ext.privacyLevel || "private";
    var idStatus = fieldry.identificationStatus || ext.identificationStatus ||
      (fieldry.unidentified ? "unidentified" : "identified");
    var precision = (obs.location && obs.location.privacy && obs.location.privacy.precision) || "county";
    var countVal = fieldry.count != null ? fieldry.count : (ext.count != null ? ext.count : "");
    var typeOpts = [{ value: "", label: "Optional record type…" }].concat(
      U().OBSERVATION_TYPES.map(function (t) { return { value: t.value, label: t.label }; })
    );

    return (
      '<form class="fld-form" id="fld-observation-form" novalidate>' +
        '<input type="hidden" name="id" value="' + U().escapeHtml(obs.id) + '">' +
        '<input type="hidden" name="knowledgeId" id="fld-knowledge-id" value="' + U().escapeHtml(fieldry.knowledgeId || ext.knowledgeId || "") + '">' +
        '<input type="hidden" name="wskbSpeciesId" value="' + U().escapeHtml(fieldry.wskbSpeciesId || (obs.taxon && obs.taxon.taxonIdSource === "wskb" ? obs.taxon.taxonId : "") || "") + '">' +
        '<header class="fld-form__head">' +
          '<a class="fld-form__back" href="#/">← Home</a>' +
          '<h1 class="fld-form__title">' + (isEdit ? "Edit observation" : "Record an observation") + "</h1>" +
          '<p class="fld-form__lead">What did you encounter? Exact species optional — unidentified records are welcome.</p>' +
          '<p class="fld-form__tip">' + U().escapeHtml(U().randomTip()) + "</p>" +
        "</header>" +
        '<div class="fld-form__layout">' +
          '<div class="fld-form__main">' +
            '<fieldset class="fld-form__group">' +
              '<legend>Subject</legend>' +
              field("fld-category", "Category", selectOptions("category", categoryOptions(category), category),
                "Life-list category — birds, mushrooms, rocks, weather, and more.") +
              field("fld-knowledge-q", "Search Knowledge",
                textInput("fld-knowledge-q", "knowledgeQuery", "", {
                  placeholder: "Common or scientific name…",
                  autocomplete: "off",
                  ariaDescribedBy: "fld-knowledge-status"
                }) +
                '<div class="fld-knowledge-status" id="fld-knowledge-status" role="status" aria-live="polite"></div>' +
                '<ul class="fld-knowledge-results" id="fld-knowledge-results" hidden></ul>' +
                '<div class="fld-knowledge-selected" id="fld-knowledge-selected" hidden></div>',
                "Uses the shared Knowledge Platform sample catalog when available. Representative samples only — not a complete field guide.") +
              field("fld-common", "Common name", textInput("fld-common", "commonName", val(obs, "taxon.commonName") || fieldry.knowledgeCommon || "", {
                placeholder: "e.g. Eastern bluebird — or Unknown mushroom"
              })) +
              field("fld-scientific", "Scientific name <span class='fld-optional'>(optional)</span>",
                textInput("fld-scientific", "scientificName", val(obs, "taxon.scientificName") || fieldry.knowledgeScientific || "", {
                  placeholder: "When known"
                })) +
              field("fld-title", "Observation title", textInput("fld-title", "title", val(obs, "taxon.label"), {
                placeholder: "Short label for this encounter",
                required: true
              })) +
              field("fld-id-status", "Identification", selectOptions("identificationStatus", ID_STATUS_OPTS, idStatus),
                "You do not need a confident ID to record an encounter.") +
              field("fld-confidence", "Confidence", selectOptions("confidence", confidenceOptions(val(obs, "record.confidence", "likely")), val(obs, "record.confidence", "likely"))) +
              field("fld-count", "Count <span class='fld-optional'>(optional)</span>",
                textInput("fld-count", "count", countVal === "" || countVal == null ? "" : String(countVal), {
                  type: "number", min: "0", step: "1", placeholder: "How many?"
                })) +
            "</fieldset>" +
            '<fieldset class="fld-form__group">' +
              '<legend>When &amp; where</legend>' +
              field("fld-date", "Date", textInput("fld-date", "date", val(obs, "observedAt.date"), { type: "date", required: true })) +
              field("fld-time", "Time <span class='fld-optional'>(optional)</span>", textInput("fld-time", "time", val(obs, "observedAt.time"), { type: "time" })) +
              field("fld-precision", "Location precision", selectOptions("locationPrecision", LOCATION_PRECISION_OPTS, precision),
                "Exact coordinates stay on device; regional and hidden protect sensitive places.") +
              field("fld-privacy", "Privacy", selectOptions("privacyLevel", PRIVACY_OPTS, privacy),
                "Default is private. No public feeds in this release.") +
              field("fld-county", "County / region", textInput("fld-county", "county", val(obs, "location.county"))) +
              field("fld-state", "State", textInput("fld-state", "state", val(obs, "location.state"))) +
              '<details class="fld-form__advanced">' +
                '<summary>Coordinates (optional)</summary>' +
                '<div class="fld-form__advanced-body">' +
                  field("fld-lat", "Latitude", textInput("fld-lat", "latitude", val(obs, "location.latitude"), { type: "number", step: "any" })) +
                  field("fld-lon", "Longitude", textInput("fld-lon", "longitude", val(obs, "location.longitude"), { type: "number", step: "any" })) +
                  '<p class="fld-form__gps"><button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="fld-use-gps">Use current location</button></p>' +
                "</div>" +
              "</details>" +
            "</fieldset>" +
            '<fieldset class="fld-form__group">' +
              '<legend>Notes &amp; context</legend>' +
              field("fld-notes", "Notes", textarea("fld-notes", "notes", val(obs, "record.notes"), 5),
                "Describe what you observed — behavior, signs, context.") +
              field("fld-tags", "Tags", textInput("fld-tags", "tags", tags, {
                placeholder: "backyard, dawn, wet bark"
              }), "Comma-separated.") +
              field("fld-habitat", "Habitat", textInput("fld-habitat", "habitat", val(obs, "habitat.label"), {
                placeholder: "e.g. Riparian hardwood"
              })) +
              field("fld-type", "Record type <span class='fld-optional'>(optional)</span>",
                selectOptions("observationType", typeOpts, fieldry.observationType || "")) +
              field("fld-season", "Season", textInput("fld-season", "season", val(obs, "context.season"), { placeholder: "e.g. late spring" })) +
              field("fld-phenology", "Phenology", textInput("fld-phenology", "phenologyStage", val(obs, "context.phenologyStage"), { placeholder: "e.g. fruiting" })) +
              '<div class="wds-field fld-field"><span class="wds-label">Weather snapshot</span>' + weatherReadonly(obs) + "</div>" +
              field("fld-media-ref", "Media reference <span class='fld-optional'>(optional)</span>",
                textInput("fld-media-ref", "mediaRef", (fieldry.mediaRefs && fieldry.mediaRefs[0]) || "", {
                  placeholder: "Local path or note — attachment UI coming later"
                }), "Stores a reference only; photo upload is not yet wired.") +
              field("fld-ethical", "Ethical notes", textarea("fld-ethical", "ethicalNotes", fieldry.ethicalNotes || "", 3)) +
            "</fieldset>" +
            '<div class="fld-form__status" id="fld-form-status" role="status" aria-live="polite" hidden></div>' +
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

  function parseTags(raw) {
    return String(raw || "")
      .split(",")
      .map(function (t) { return t.trim(); })
      .filter(Boolean)
      .slice(0, 24);
  }

  function readForm(form) {
    var fd = new FormData(form);
    var obs = global.FieldryStorage.get(fd.get("id")) || global.FieldryStorage.createDraft(null, null);
    if (!obs) {
      var O = global.WDS && global.WDS.observations;
      obs = O ? O.emptyObservation({ source: "fieldry" }) : {};
    }

    var common = String(fd.get("commonName") || "").trim();
    var scientific = String(fd.get("scientificName") || "").trim();
    var title = String(fd.get("title") || "").trim();
    var category = String(fd.get("category") || "").trim() || "other";
    var idStatus = String(fd.get("identificationStatus") || "identified");
    var unidentified = idStatus === "unidentified";
    var knowledgeId = String(fd.get("knowledgeId") || "").trim() || null;
    var tags = parseTags(fd.get("tags"));
    var privacyLevel = String(fd.get("privacyLevel") || "private");
    var countRaw = fd.get("count");
    var count = countRaw !== "" && countRaw != null ? Number(countRaw) : null;
    var mediaRef = String(fd.get("mediaRef") || "").trim();

    obs.taxon = obs.taxon || {};
    obs.taxon.commonName = common || null;
    obs.taxon.scientificName = scientific || null;
    obs.taxon.label = title || common || (unidentified ? "Unidentified " + category : "Field observation");
    obs.observedAt.date = fd.get("date") || obs.observedAt.date;
    obs.observedAt.time = fd.get("time") || null;
    obs.record.confidence = fd.get("confidence") || "not_recorded";
    obs.record.notes = String(fd.get("notes") || "").trim() || null;
    if (count != null && isFinite(count)) {
      obs.record.quantity = count;
      obs.record.quantityUnit = "individuals";
    }
    obs.habitat.label = String(fd.get("habitat") || "").trim() || null;

    var lat = fd.get("latitude");
    var lon = fd.get("longitude");
    obs.location.latitude = lat !== "" && lat != null ? Number(lat) : null;
    obs.location.longitude = lon !== "" && lon != null ? Number(lon) : null;
    obs.location.county = String(fd.get("county") || "").trim() || obs.location.county;
    obs.location.state = String(fd.get("state") || "").trim() || obs.location.state;
    obs.location.privacy = obs.location.privacy || {};
    obs.location.privacy.precision = fd.get("locationPrecision") || "county";

    obs.context.season = String(fd.get("season") || "").trim() || null;
    obs.context.phenologyStage = String(fd.get("phenologyStage") || "").trim() || null;

    obs.meta.fieldry = obs.meta.fieldry || {};
    obs.meta.fieldry.observationType = fd.get("observationType") || null;
    obs.meta.fieldry.ethicalNotes = String(fd.get("ethicalNotes") || "").trim() || null;
    obs.meta.fieldry.category = category;
    obs.meta.fieldry.unidentified = unidentified;
    obs.meta.fieldry.identificationStatus = idStatus;
    obs.meta.fieldry.tags = tags;
    obs.meta.fieldry.privacyLevel = privacyLevel;
    obs.meta.fieldry.count = count;
    obs.meta.fieldry.mediaRefs = mediaRef ? [mediaRef] : [];
    obs.meta.fieldry.knowledgeId = knowledgeId;

    if (knowledgeId && global.WDS && global.WDS.knowledge && global.WDS.knowledge.getSync) {
      var entry = global.WDS.knowledge.getSync(knowledgeId);
      if (entry && entry.names) {
        obs.meta.fieldry.knowledgeCommon = entry.names.common || common || null;
        obs.meta.fieldry.knowledgeScientific = entry.names.scientific || scientific || null;
        if (!obs.taxon.commonName) obs.taxon.commonName = entry.names.common || null;
        if (!obs.taxon.scientificName) obs.taxon.scientificName = entry.names.scientific || null;
        obs.taxon.taxonId = entry.id;
        obs.taxon.taxonIdSource = "knowledge";
        if (entry.wskbId) {
          obs.meta.fieldry.wskbSpeciesId = entry.wskbId;
        }
      }
    } else {
      obs.meta.fieldry.knowledgeCommon = common || null;
      obs.meta.fieldry.knowledgeScientific = scientific || null;
      var wskbId = String(fd.get("wskbSpeciesId") || "").trim();
      if (wskbId) {
        obs.meta.fieldry.wskbSpeciesId = wskbId;
        obs.taxon.taxonId = wskbId;
        obs.taxon.taxonIdSource = "wskb";
      } else if (!knowledgeId) {
        // Keep existing taxon ids only if still relevant
        if (obs.taxon.taxonIdSource === "knowledge" || obs.taxon.taxonIdSource === "wskb") {
          /* leave as-is for edits without clearing */ 
        }
      }
    }

    if (unidentified && !obs.taxon.commonName) {
      var catLabel = Life().categoryLabel(category);
      obs.taxon.commonName = "Unknown " + catLabel.replace(/s$/, "").toLowerCase();
      if (!title) obs.taxon.label = obs.taxon.commonName;
    }

    return obs;
  }

  function setStatus(el, text, kind) {
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || "";
    el.className = "fld-knowledge-status" + (kind ? " fld-knowledge-status--" + kind : "");
  }

  function bindKnowledgeSearch(form) {
    var input = form.querySelector("#fld-knowledge-q");
    var results = form.querySelector("#fld-knowledge-results");
    var status = form.querySelector("#fld-knowledge-status");
    var selected = form.querySelector("#fld-knowledge-selected");
    var hiddenId = form.querySelector("#fld-knowledge-id");
    var commonInput = form.querySelector('[name="commonName"]');
    var sciInput = form.querySelector('[name="scientificName"]');
    var titleInput = form.querySelector('[name="title"]');
    var categorySelect = form.querySelector('[name="category"]');
    var timer = null;

    function showSelected(entry) {
      if (!selected || !entry) {
        if (selected) selected.hidden = true;
        return;
      }
      selected.hidden = false;
      var names = entry.names || {};
      selected.innerHTML =
        '<p><strong>Linked Knowledge</strong> · ' + U().escapeHtml(names.common || entry.id) +
        (names.scientific ? ' <em>(' + U().escapeHtml(names.scientific) + ")</em>" : "") +
        ' · <span class="fld-sample-label">Shared reference</span></p>' +
        '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="fld-clear-knowledge">Clear link</button>';
      var clear = selected.querySelector("#fld-clear-knowledge");
      if (clear) {
        clear.addEventListener("click", function () {
          if (hiddenId) hiddenId.value = "";
          selected.hidden = true;
          selected.innerHTML = "";
        });
      }
    }

    function applyEntry(entry) {
      if (!entry) return;
      if (hiddenId) hiddenId.value = entry.id;
      var names = entry.names || {};
      if (commonInput) commonInput.value = names.common || "";
      if (sciInput) sciInput.value = names.scientific || "";
      if (titleInput && !titleInput.value) titleInput.value = names.common || entry.id;
      if (categorySelect && entry.categories && entry.categories.length) {
        var cat = entry.categories.filter(function (c) {
          return Life().CATEGORY_BY_ID[c];
        })[0];
        if (cat) categorySelect.value = cat;
      }
      showSelected(entry);
      if (results) {
        results.hidden = true;
        results.innerHTML = "";
      }
      setStatus(status, "Linked to Knowledge entry.", "ok");
    }

    function renderHits(hits) {
      if (!results) return;
      if (!hits.length) {
        results.hidden = true;
        results.innerHTML = "";
        return;
      }
      results.hidden = false;
      results.innerHTML = hits.map(function (entry) {
        var names = entry.names || {};
        return (
          '<li><button type="button" class="fld-knowledge-hit" data-id="' + U().escapeHtml(entry.id) + '">' +
            '<span class="fld-knowledge-hit__common">' + U().escapeHtml(names.common || entry.id) + "</span>" +
            (names.scientific ? '<span class="fld-knowledge-hit__sci"><em>' + U().escapeHtml(names.scientific) + "</em></span>" : "") +
            '<span class="fld-knowledge-hit__meta">' + U().escapeHtml((entry.categories || []).slice(0, 2).join(", ")) + "</span>" +
          "</button></li>"
        );
      }).join("");
      results.querySelectorAll(".fld-knowledge-hit").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-id");
          var entry = (global.WDS.knowledge.getSync && global.WDS.knowledge.getSync(id)) ||
            (lastHits.filter(function (h) { return h.id === id; })[0] &&
              (lastHits.filter(function (h) { return h.id === id; })[0].entry ||
               lastHits.filter(function (h) { return h.id === id; })[0]));
          applyEntry(entry);
        });
      });
    }

    var lastHits = [];

    function runSearch() {
      var q = (input && input.value || "").trim();
      if (!q) {
        setStatus(status, "");
        if (results) { results.hidden = true; results.innerHTML = ""; }
        return;
      }
      var K = global.WDS && global.WDS.knowledge;
      if (!K || !K.search) {
        setStatus(status, "Knowledge Platform unavailable — you can still record a manual or unidentified observation.", "warn");
        return;
      }
      setStatus(status, "Searching…", "loading");
      var cat = categorySelect && categorySelect.value;
      var opts = { domain: "fieldry", limit: 8 };
      if (cat) opts.category = cat;
      var searchFn = (global.WDS.knowledgeSearch && global.WDS.knowledgeSearch.search) || K.search;
      Promise.resolve(searchFn(q, opts)).then(function (hits) {
        lastHits = hits || [];
        if (!hits || !hits.length) {
          setStatus(status, "No Knowledge matches. Record with a custom name or as unidentified.", "empty");
          renderHits([]);
          return;
        }
        setStatus(status, hits.length + " suggestion" + (hits.length === 1 ? "" : "s") + " · sample catalog", "ok");
        renderHits(hits);
      }).catch(function () {
        setStatus(status, "Knowledge search unavailable offline — continue with a manual name.", "warn");
        renderHits([]);
      });
    }

    if (input) {
      input.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(runSearch, 280);
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && results) {
          results.hidden = true;
        }
      });
    }

    // Show existing link
    if (hiddenId && hiddenId.value && global.WDS && global.WDS.knowledge) {
      var existing = global.WDS.knowledge.getSync(hiddenId.value);
      if (existing) showSelected(existing);
    }
  }

  function bind(form, options) {
    options = options || {};
    var statusEl = form.querySelector("#fld-form-status");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var obs = readForm(form);
      if (!obs.taxon.label) {
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.textContent = "Please add an observation title or common name.";
        }
        var titleEl = form.querySelector("#fld-title");
        if (titleEl) titleEl.focus();
        return;
      }
      if (!form.querySelector('[name="category"]').value) {
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.textContent = "Choose a category for your life list.";
        }
        form.querySelector('[name="category"]').focus();
        return;
      }
      try {
        if (options.platform || options.loc) {
          obs = global.FieldryStorage.hydrateFromContext(obs, options.platform, options.loc);
        }
        global.FieldryStorage.save(obs);
        if (options.onSaved) options.onSaved(obs);
        window.location.hash = "#/obs/" + encodeURIComponent(obs.id);
      } catch (err) {
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.textContent = "Could not save this observation. Your draft remains on screen — try again.";
        }
      }
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
          if (statusEl) {
            statusEl.hidden = false;
            statusEl.textContent = "Could not read GPS — enter coordinates manually or use regional place names.";
          }
        }, { enableHighAccuracy: true, timeout: 12000 });
      });
    } else if (gpsBtn) {
      gpsBtn.disabled = true;
    }

    bindKnowledgeSearch(form);
  }

  global.FieldryForm = {
    render: render,
    bind: bind,
    readForm: readForm
  };
})(typeof window !== "undefined" ? window : global);
