/**
 * Fieldry Knowledge profile surface — shared reference + personal history.
 */
(function (global) {
  "use strict";

  var U = function () { return global.FieldryUtil; };
  var Life = function () { return global.WaypointFieldryLifeList; };

  function renderLoading(id) {
    return (
      '<section class="fld-knowledge-view" aria-busy="true">' +
        '<a class="fld-form__back" href="#/">← Home</a>' +
        '<p role="status">Loading Knowledge entry…</p>' +
        '<p class="fld-hint">ID: ' + U().escapeHtml(id) + "</p>" +
      "</section>"
    );
  }

  function renderMissing(id) {
    return (
      '<section class="fld-knowledge-view">' +
        '<a class="fld-form__back" href="#/">← Home</a>' +
        '<h1>Knowledge entry unavailable</h1>' +
        '<p>This shared reference could not be loaded. Your personal observations remain available.</p>' +
        '<p class="fld-hint">Requested id: <code>' + U().escapeHtml(id) + "</code></p>" +
        '<a class="wds-btn wds-btn--ghost" href="#/life">Back to life list</a>' +
      "</section>"
    );
  }

  function personalHistory(knowledgeId, observations) {
    var related = (observations || []).filter(function (obs) {
      var ext = Life().fieldryExt(obs);
      return ext.knowledgeId === knowledgeId ||
        (obs.taxon && obs.taxon.taxonId === knowledgeId);
    });
    if (!related.length) {
      return '<p class="fld-hint">You have not recorded this subject yet.</p>' +
        '<a class="wds-btn wds-btn--primary" href="#/new">Record an observation</a>';
    }
    return (
      '<ul class="fld-home-recent">' +
        related.map(function (obs) {
          return (
            '<li><a href="#/obs/' + encodeURIComponent(obs.id) + '">' +
              U().escapeHtml(U().displayTitle(obs)) + " · " +
              U().escapeHtml(U().formatDate(obs.observedAt && obs.observedAt.date)) +
            "</a></li>"
          );
        }).join("") +
      "</ul>"
    );
  }

  function renderEntry(entry, observations, related) {
    var names = entry.names || {};
    var taxonomy = entry.taxonomy || {};
    var geography = entry.geography || {};
    var seasonality = entry.seasonality || {};
    var citations = entry.citations || entry.references || [];
    var ai = entry.aiMetadata;

    return (
      '<article class="fld-knowledge-view" aria-labelledby="fld-know-title">' +
        '<a class="fld-form__back" href="#/life">← Life list</a>' +
        '<p class="wds-eyebrow">Shared Knowledge · sample catalog</p>' +
        '<h1 id="fld-know-title">' + U().escapeHtml(names.common || entry.id) + "</h1>" +
        (names.scientific ? '<p class="fld-life-card__sci"><em>' + U().escapeHtml(names.scientific) + "</em></p>" : "") +
        (names.aliases && names.aliases.length
          ? '<p class="fld-hint">Also known as: ' + U().escapeHtml(names.aliases.join(", ")) + "</p>"
          : "") +
        '<p class="fld-sample-banner">Representative Knowledge sample — not a complete production species database.</p>' +
        (entry.description ? '<p class="fld-knowledge-desc">' + U().escapeHtml(entry.description) + "</p>" : "") +
        '<section class="fld-detail__section"><h2>Taxonomy</h2><dl class="fld-detail__dl">' +
          (taxonomy.kingdom ? "<div><dt>Kingdom</dt><dd>" + U().escapeHtml(taxonomy.kingdom) + "</dd></div>" : "") +
          (taxonomy.family ? "<div><dt>Family</dt><dd>" + U().escapeHtml(taxonomy.family) + "</dd></div>" : "") +
          (taxonomy.genus ? "<div><dt>Genus</dt><dd>" + U().escapeHtml(taxonomy.genus) + "</dd></div>" : "") +
          (taxonomy.species ? "<div><dt>Species</dt><dd>" + U().escapeHtml(taxonomy.species) + "</dd></div>" : "") +
        "</dl></section>" +
        '<section class="fld-detail__section"><h2>Geography</h2>' +
          '<p>' + U().escapeHtml(geography.distribution || "Not specified in this sample.") + "</p>" +
        "</section>" +
        '<section class="fld-detail__section"><h2>Seasonal notes</h2>' +
          '<p>' + U().escapeHtml(seasonality.notes || seasonality.summary || "Not specified in this sample.") + "</p>" +
        "</section>" +
        (related && related.length
          ? '<section class="fld-detail__section"><h2>Related entries</h2><ul>' +
            related.map(function (r) {
              var n = (r.names && r.names.common) || r.id;
              return '<li><a href="#/knowledge/' + encodeURIComponent(r.id) + '">' + U().escapeHtml(n) + "</a></li>";
            }).join("") + "</ul></section>"
          : "") +
        (citations.length
          ? '<section class="fld-detail__section"><h2>Citations &amp; references</h2><ul>' +
            citations.map(function (c) {
              var label = typeof c === "string" ? c : (c.title || c.citation || c.url || "Reference");
              return "<li>" + U().escapeHtml(label) + "</li>";
            }).join("") + "</ul></section>"
          : "") +
        (ai
          ? '<section class="fld-detail__section fld-ai-meta"><h2>AI-generated metadata</h2>' +
            '<p class="fld-hint">Labeled as AI-assisted. Treat as provisional.</p></section>'
          : "") +
        '<section class="fld-detail__section" aria-labelledby="fld-personal-obs">' +
          '<h2 id="fld-personal-obs">Your observations</h2>' +
          '<p class="fld-hint">Personal records stored on this device — distinct from shared reference knowledge.</p>' +
          personalHistory(entry.id, observations) +
        "</section>" +
      "</article>"
    );
  }

  function loadAndRender(mount, id, observations) {
    mount.innerHTML = renderLoading(id);
    var K = global.WDS && global.WDS.knowledge;
    if (!K) {
      mount.innerHTML = renderMissing(id);
      return Promise.resolve();
    }
    return Promise.resolve(K.get(id) || K.loadRecord(id)).then(function (entry) {
      if (!entry) {
        mount.innerHTML = renderMissing(id);
        return;
      }
      var relatedPromise = (global.WDS.knowledgeRelated && global.WDS.knowledgeRelated.related)
        ? global.WDS.knowledgeRelated.related(id)
        : (global.WDS.knowledgeRelationships && global.WDS.knowledgeRelationships.related)
          ? global.WDS.knowledgeRelationships.related(id)
          : (K.related ? K.related(id) : Promise.resolve({ neighbors: [] }));
      return Promise.resolve(relatedPromise).then(function (related) {
        var neighbors = [];
        if (Array.isArray(related)) neighbors = related;
        else if (related && related.neighbors) {
          neighbors = related.neighbors.map(function (n) {
            return n.entry || { id: n.id, names: { common: n.id } };
          }).filter(Boolean);
        }
        mount.innerHTML = renderEntry(entry, observations, neighbors);
      }).catch(function () {
        mount.innerHTML = renderEntry(entry, observations, []);
      });
    }).catch(function () {
      mount.innerHTML = renderMissing(id);
    });
  }

  global.FieldryKnowledgeView = {
    renderMissing: renderMissing,
    loadAndRender: loadAndRender
  };
})(typeof window !== "undefined" ? window : global);
