/**
 * Fieldry — observation history / timeline
 */
(function (global) {
  "use strict";

  var U = function () { return global.FieldryUtil; };
  var Life = function () { return global.WaypointFieldryLifeList; };

  function parseQuery() {
    if (global.FieldryLifeView && global.FieldryLifeView.parseQuery) {
      return global.FieldryLifeView.parseQuery();
    }
    return {};
  }

  function renderCard(obs) {
    var cat = U().categoryLabel(obs);
    var species = obs.taxon && (obs.taxon.commonName || obs.taxon.scientificName);
    var conf = U().confidenceLabel(obs.record && obs.record.confidence);
    var unidentified = Life().isUnidentified(obs);

    return (
      '<article class="fld-card" data-obs-id="' + U().escapeHtml(obs.id) + '">' +
        '<a class="fld-card__link" href="#/obs/' + encodeURIComponent(obs.id) + '">' +
          '<div class="fld-card__body">' +
            '<div class="fld-card__meta">' +
              '<time datetime="' + U().escapeHtml(obs.observedAt && obs.observedAt.date) + '">' + U().escapeHtml(U().formatDate(obs.observedAt && obs.observedAt.date)) + "</time>" +
              '<span class="fld-card__type">' + U().escapeHtml(cat) + "</span>" +
              (unidentified ? '<span class="fld-card__badge">Unidentified</span>' : "") +
            "</div>" +
            '<h3 class="fld-card__title">' + U().escapeHtml(U().displayTitle(obs)) + "</h3>" +
            '<dl class="fld-card__facts">' +
              (species ? "<div><dt>Subject</dt><dd>" + U().escapeHtml(species) + "</dd></div>" : "") +
              "<div><dt>Confidence</dt><dd>" + U().escapeHtml(conf) + "</dd></div>" +
              "<div><dt>Location</dt><dd>" + U().escapeHtml(U().formatLocation(obs)) + "</dd></div>" +
              "<div><dt>Privacy</dt><dd>" + U().escapeHtml(U().privacyLabel(obs)) + "</dd></div>" +
            "</dl>" +
          "</div>" +
        "</a>" +
        '<div class="fld-card__actions">' +
          '<a class="wds-btn wds-btn--ghost wds-btn--sm" href="#/edit/' + encodeURIComponent(obs.id) + '">Edit</a>' +
          '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm fld-card__delete" data-delete-id="' + U().escapeHtml(obs.id) + '">Delete</button>' +
        "</div>" +
      "</article>"
    );
  }

  function renderEmpty() {
    return (
      '<div class="fld-empty">' +
        '<p class="fld-empty__title">No observations yet</p>' +
        '<p class="fld-empty__text">Record what you encounter — identified or unidentified.</p>' +
        '<a class="wds-btn wds-btn--primary" href="#/new">Record first observation</a>' +
      "</div>"
    );
  }

  function renderFilters(options) {
    var cats = [{ value: "all", label: "All categories" }].concat(
      Life().CATEGORIES.map(function (c) { return { value: c.id, label: c.label }; })
    );
    return (
      '<form class="fld-filters" id="fld-history-filters">' +
        '<div class="wds-field"><label class="wds-label" for="fld-hist-q">Search</label>' +
          '<input class="wds-input" id="fld-hist-q" name="q" type="search" value="' + U().escapeHtml(options.query || "") + '">' +
        "</div>" +
        '<div class="wds-field"><label class="wds-label" for="fld-hist-cat">Category</label>' +
          '<select class="wds-select" id="fld-hist-cat" name="category">' +
            cats.map(function (c) {
              return '<option value="' + c.value + '"' + (options.category === c.value ? " selected" : "") + ">" +
                U().escapeHtml(c.label) + "</option>";
            }).join("") +
          "</select>" +
        "</div>" +
        '<div class="wds-field"><label class="wds-label" for="fld-hist-id">Identification</label>' +
          '<select class="wds-select" id="fld-hist-id" name="identified">' +
            '<option value="all"' + (options.identified === "all" ? " selected" : "") + ">All</option>" +
            '<option value="identified"' + (options.identified === "identified" ? " selected" : "") + ">Identified</option>" +
            '<option value="unidentified"' + (options.identified === "unidentified" ? " selected" : "") + ">Unidentified</option>" +
          "</select>" +
        "</div>" +
        '<div class="wds-field"><label class="wds-label" for="fld-hist-priv">Privacy</label>' +
          '<select class="wds-select" id="fld-hist-priv" name="privacy">' +
            '<option value="all">All</option>' +
            '<option value="private"' + (options.privacy === "private" ? " selected" : "") + ">Private</option>" +
            '<option value="shared"' + (options.privacy === "shared" ? " selected" : "") + ">Shared</option>" +
            '<option value="public"' + (options.privacy === "public" ? " selected" : "") + ">Public</option>" +
            '<option value="anonymized"' + (options.privacy === "anonymized" ? " selected" : "") + ">Anonymized</option>" +
          "</select>" +
        "</div>" +
        '<button type="submit" class="wds-btn wds-btn--ghost wds-btn--sm">Filter</button>' +
      "</form>"
    );
  }

  function applySubjectFilter(list, subjectKey) {
    if (!subjectKey) return list;
    return list.filter(function (obs) {
      return Life().subjectKey(obs) === subjectKey;
    });
  }

  function favoriteIds() {
    var Stores = global.WDS && global.WDS.platform;
    if (!Stores || !Stores.Collections) return null;
    var fav = Stores.Collections.list().filter(function (c) {
      return c.kind === "favorites" && c.appId === "fieldry";
    })[0];
    return fav ? fav.itemIds : null;
  }

  function render(observations, options) {
    options = options || parseQuery();
    var filterOpts = {
      category: options.category || "all",
      query: options.q || options.query || "",
      identified: options.identified || "all",
      privacy: options.privacy || "all",
      favoriteIds: options.favorites === "1" ? (favoriteIds() || []) : null
    };
    var list = global.FieldryStorage.filter
      ? global.FieldryStorage.filter(filterOpts)
      : (observations || []);
    list = applySubjectFilter(list, options.subject);

    return (
      '<section class="fld-timeline" aria-labelledby="fld-timeline-title">' +
        '<header class="fld-view-head">' +
          '<a class="fld-form__back" href="#/">← Home</a>' +
          '<h1 class="fld-timeline__title" id="fld-timeline-title">Observation history</h1>' +
          '<p class="fld-view-lead">Your personal record of encounters — private by default.</p>' +
          '<a class="wds-btn wds-btn--primary" href="#/new">Record an observation</a>' +
        "</header>" +
        renderFilters(filterOpts) +
        (options.favorites === "1" ? '<p class="fld-hint">Showing favorites only.</p>' : "") +
        (list.length
          ? '<div class="fld-timeline__list">' + list.map(renderCard).join("") + "</div>"
          : renderEmpty()) +
      "</section>"
    );
  }

  function bindDelete(mount, onDelete) {
    if (!mount) return;
    mount.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-delete-id]");
      if (!btn) return;
      e.preventDefault();
      var id = btn.getAttribute("data-delete-id");
      if (!id) return;
      if (window.confirm("Delete this observation from your device? This cannot be undone.")) {
        onDelete(id);
      }
    });
  }

  function bindFilters(mount) {
    var form = mount.querySelector("#fld-history-filters");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var parts = [];
      ["q", "category", "identified", "privacy"].forEach(function (key) {
        var v = String(fd.get(key) || "").trim();
        if (!v || v === "all") return;
        if (key === "category" && v === "all") return;
        parts.push(key + "=" + encodeURIComponent(v));
      });
      window.location.hash = "#/history" + (parts.length ? "?" + parts.join("&") : "");
    });
  }

  global.FieldryList = {
    render: render,
    bindDelete: bindDelete,
    bindFilters: bindFilters
  };
})(typeof window !== "undefined" ? window : global);
