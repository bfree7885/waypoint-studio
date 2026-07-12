/**
 * Fieldry life-list view — personal unique subjects from observations.
 */
(function (global) {
  "use strict";

  var U = function () { return global.FieldryUtil; };
  var Life = function () { return global.WaypointFieldryLifeList; };

  function parseQuery() {
    var hash = window.location.hash || "";
    var qIndex = hash.indexOf("?");
    var params = {};
    if (qIndex < 0) return params;
    hash.slice(qIndex + 1).split("&").forEach(function (pair) {
      var parts = pair.split("=");
      if (parts[0]) params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || "");
    });
    return params;
  }

  function renderFilters(options) {
    var cats = [{ value: "all", label: "All categories" }].concat(
      Life().CATEGORIES.map(function (c) { return { value: c.id, label: c.label }; })
    );
    var catOpts = cats.map(function (c) {
      return '<option value="' + c.value + '"' + (options.category === c.value ? " selected" : "") + ">" +
        U().escapeHtml(c.label) + "</option>";
    }).join("");
    return (
      '<form class="fld-filters" id="fld-life-filters">' +
        '<div class="wds-field"><label class="wds-label" for="fld-life-q">Search</label>' +
          '<input class="wds-input" id="fld-life-q" name="q" type="search" value="' + U().escapeHtml(options.query || "") + '" placeholder="Subject name">' +
        "</div>" +
        '<div class="wds-field"><label class="wds-label" for="fld-life-cat">Category</label>' +
          '<select class="wds-select" id="fld-life-cat" name="category">' + catOpts + "</select>" +
        "</div>" +
        '<div class="wds-field"><label class="wds-label" for="fld-life-sort">Sort</label>' +
          '<select class="wds-select" id="fld-life-sort" name="sort">' +
            '<option value="recent"' + (options.sort === "recent" ? " selected" : "") + ">Recently added</option>" +
            '<option value="most"' + (options.sort === "most" ? " selected" : "") + ">Most observed (personal)</option>" +
            '<option value="first"' + (options.sort === "first" ? " selected" : "") + ">First discoveries</option>" +
            '<option value="name"' + (options.sort === "name" ? " selected" : "") + ">Name</option>" +
          "</select>" +
        "</div>" +
        '<div class="wds-field fld-filters__check">' +
          '<label><input type="checkbox" name="unidentified" value="1"' +
            (options.unidentifiedOnly ? " checked" : "") + "> Unidentified only</label>" +
        "</div>" +
        '<button type="submit" class="wds-btn wds-btn--ghost wds-btn--sm">Apply</button>' +
      "</form>"
    );
  }

  function renderEntry(entry) {
    var title = entry.commonName || entry.label;
    var knowLink = entry.knowledgeId
      ? '<a href="#/knowledge/' + encodeURIComponent(entry.knowledgeId) + '">Knowledge profile</a>'
      : "";
    return (
      '<article class="fld-life-card">' +
        '<header class="fld-life-card__head">' +
          '<h3 class="fld-life-card__title">' + U().escapeHtml(title) + "</h3>" +
          (entry.scientificName ? '<p class="fld-life-card__sci"><em>' + U().escapeHtml(entry.scientificName) + "</em></p>" : "") +
          '<p class="fld-life-card__meta">' +
            U().escapeHtml(Life().categoryLabel(entry.category)) +
            (entry.unidentified ? " · Unidentified" : "") +
          "</p>" +
        "</header>" +
        '<dl class="fld-life-card__facts">' +
          "<div><dt>First observed</dt><dd>" + U().escapeHtml(U().formatDate(entry.firstObserved)) + "</dd></div>" +
          "<div><dt>Most recent</dt><dd>" + U().escapeHtml(U().formatDate(entry.lastObserved)) + "</dd></div>" +
          "<div><dt>Times observed</dt><dd>" + entry.count + "</dd></div>" +
        "</dl>" +
        '<footer class="fld-life-card__foot">' +
          '<a href="#/history?subject=' + encodeURIComponent(entry.key) + '">Observation history</a>' +
          (knowLink ? " · " + knowLink : "") +
        "</footer>" +
      "</article>"
    );
  }

  function render(observations, options) {
    options = options || parseQuery();
    var opts = {
      category: options.category || "all",
      sort: options.sort || "recent",
      query: options.q || options.query || "",
      unidentifiedOnly: options.unidentified === "1" || options.unidentifiedOnly === true
    };
    var list = Life().deriveLifeList(observations, opts);

    return (
      '<section class="fld-life" aria-labelledby="fld-life-view-title">' +
        '<header class="fld-view-head">' +
          '<a class="fld-form__back" href="#/">← Home</a>' +
          '<h1 id="fld-life-view-title">Life list</h1>' +
          '<p class="fld-view-lead">Unique subjects you have observed — derived from your saved records. Personal statistics only.</p>' +
        "</header>" +
        renderFilters(opts) +
        '<p class="fld-life-count" role="status">' + list.length + " subject" + (list.length === 1 ? "" : "s") + "</p>" +
        (list.length
          ? '<div class="fld-life-grid">' + list.map(renderEntry).join("") + "</div>"
          : '<div class="fld-empty"><p class="fld-empty__title">No subjects yet</p>' +
            '<p class="fld-empty__text">Record an observation to start your life list. Unknown species are welcome.</p>' +
            '<a class="wds-btn wds-btn--primary" href="#/new">Record an observation</a></div>') +
      "</section>"
    );
  }

  function bind(mount) {
    var form = mount.querySelector("#fld-life-filters");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var parts = [];
      var q = String(fd.get("q") || "").trim();
      var cat = fd.get("category") || "all";
      var sort = fd.get("sort") || "recent";
      var unid = form.querySelector('[name="unidentified"]').checked;
      if (q) parts.push("q=" + encodeURIComponent(q));
      if (cat && cat !== "all") parts.push("category=" + encodeURIComponent(cat));
      if (sort && sort !== "recent") parts.push("sort=" + encodeURIComponent(sort));
      if (unid) parts.push("unidentified=1");
      window.location.hash = "#/life" + (parts.length ? "?" + parts.join("&") : "");
    });
  }

  global.FieldryLifeView = {
    render: render,
    bind: bind,
    parseQuery: parseQuery
  };
})(typeof window !== "undefined" ? window : global);
