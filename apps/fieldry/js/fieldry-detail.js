/**
 * Fieldry — observation detail (field notebook page)
 */
(function (global) {
  "use strict";

  var U = function () { return global.FieldryUtil; };
  var Life = function () { return global.WaypointFieldryLifeList; };

  function row(label, value) {
    if (value == null || value === "") return "";
    return (
      '<div class="fld-detail__row">' +
        '<dt class="fld-detail__label">' + U().escapeHtml(label) + "</dt>" +
        '<dd class="fld-detail__value">' + value + "</dd>" +
      "</div>"
    );
  }

  function weatherBlock(obs) {
    var snap = obs.context && obs.context.weatherSnapshot;
    if (!snap) return "";
    var parts = [];
    if (snap.conditions) parts.push(U().escapeHtml(snap.conditions));
    if (snap.temperatureF != null) parts.push(U().escapeHtml(snap.temperatureF + "°F"));
    if (snap.humidityPercent != null) parts.push(U().escapeHtml(snap.humidityPercent + "% humidity"));
    if (snap.capturedAt) parts.push('<span class="fld-detail__muted">Snapshot ' + U().escapeHtml(snap.capturedAt) + "</span>");
    return row("Weather snapshot", parts.join(" · ") || "—");
  }

  function mediaBlock(obs) {
    var ext = Life().fieldryExt(obs);
    var refs = ext.mediaRefs || [];
    var photos = (obs.media && obs.media.photos) || [];
    if (!photos.length && !refs.length) return "";
    return (
      '<div class="fld-media">' +
        (photos.length ? '<p class="fld-media__label">Photographs (' + photos.length + ")</p>" : "") +
        photos.map(function (p) {
          return '<p class="fld-media__item">' + U().escapeHtml(p.caption || p.id) + "</p>";
        }).join("") +
        (refs.length ? '<p class="fld-media__label">Media notes</p>' +
          refs.map(function (r) {
            return '<p class="fld-media__item">' + U().escapeHtml(r) + "</p>";
          }).join("") : "") +
      "</div>"
    );
  }

  function membershipHtml(obs) {
    var Stores = global.WDS && global.WDS.platform;
    if (!Stores || !Stores.Collections) return "";
    var cols = Stores.Collections.list().filter(function (c) {
      return (!c.appId || c.appId === "fieldry") && (c.itemIds || []).indexOf(obs.id) >= 0;
    });
    if (!cols.length) return "";
    return (
      '<p class="fld-hint fld-detail__membership">In: ' +
      cols.map(function (c) {
        var href = c.kind === "favorites"
          ? "#/history?favorites=1"
          : "#/history?collection=" + encodeURIComponent(c.id);
        return '<a href="' + href + '">' + U().escapeHtml(c.title) + "</a>";
      }).join(", ") +
      "</p>"
    );
  }

  function collectionActions(obs) {
    return (
      '<div class="fld-detail__collections">' +
        membershipHtml(obs) +
        '<div class="fld-detail__collection-actions">' +
          '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="fld-fav-obs">Save to favorites</button>' +
          '<a class="wds-btn wds-btn--ghost wds-btn--sm" href="#/history?favorites=1">View favorites</a>' +
        "</div>" +
        '<label class="fld-hint" for="fld-collection-select">Add to collection</label>' +
        '<div class="fld-detail__collection-row">' +
          '<select class="wds-select" id="fld-collection-select">' +
            '<option value="">Choose collection…</option>' +
          "</select>" +
          '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="fld-add-collection">Add</button>' +
        "</div>" +
        '<p class="fld-hint" id="fld-collection-status" role="status"></p>' +
        '<p class="fld-hint"><a href="#/collections">Manage collections</a></p>' +
      "</div>"
    );
  }

  function render(obs) {
    if (!obs) {
      return (
        '<section class="fld-detail fld-detail--missing">' +
          "<p>Observation not found on this device.</p>" +
          '<a class="wds-btn wds-btn--ghost" href="#/">Back to home</a>' +
        "</section>"
      );
    }

    var fieldry = Life().fieldryExt(obs);
    var species = obs.taxon && obs.taxon.commonName;
    var sci = obs.taxon && obs.taxon.scientificName;
    var tags = (fieldry.tags || []).join(", ");
    var knowledgeLink = fieldry.knowledgeId
      ? '<a href="#/knowledge/' + encodeURIComponent(fieldry.knowledgeId) + '">' +
          U().escapeHtml(fieldry.knowledgeCommon || fieldry.knowledgeId) + "</a>"
      : null;
    var precision = U().locationPrecision(obs);

    return (
      '<article class="fld-detail" aria-labelledby="fld-detail-title">' +
        '<header class="fld-detail__head">' +
          '<a class="fld-detail__back" href="#/history">← History</a>' +
          '<span class="fld-detail__type">' + U().escapeHtml(U().categoryLabel(obs)) + "</span>" +
          '<h1 class="fld-detail__title" id="fld-detail-title">' + U().escapeHtml(U().displayTitle(obs)) + "</h1>" +
          '<p class="fld-detail__when">' +
            U().escapeHtml(U().formatDate(obs.observedAt && obs.observedAt.date)) +
            (obs.observedAt && obs.observedAt.time ? " · " + U().escapeHtml(obs.observedAt.time) : "") +
          "</p>" +
          U().integrityFootnote(obs) +
        "</header>" +
        '<div class="fld-detail__grid">' +
          '<section class="fld-detail__section">' +
            '<h2 class="fld-detail__section-title">Record</h2>' +
            '<dl class="fld-detail__dl">' +
              row("Subject", species ? U().escapeHtml(species) : "—") +
              row("Scientific name", sci ? "<em>" + U().escapeHtml(sci) + "</em>" : "") +
              row("Category", U().escapeHtml(U().categoryLabel(obs))) +
              row("Identification", fieldry.unidentified || fieldry.identificationStatus === "unidentified"
                ? "Unidentified" : U().escapeHtml(fieldry.identificationStatus || "Identified")) +
              row("Confidence", U().escapeHtml(U().confidenceLabel(obs.record && obs.record.confidence))) +
              row("Count", fieldry.count != null ? U().escapeHtml(String(fieldry.count)) :
                (obs.record && obs.record.quantity != null ? U().escapeHtml(String(obs.record.quantity)) : "")) +
              row("Tags", tags ? U().escapeHtml(tags) : "") +
              row("Species profile", knowledgeLink) +
              row("Habitat", obs.habitat && obs.habitat.label ? U().escapeHtml(obs.habitat.label) : "") +
              row("Season", obs.context && obs.context.season ? U().escapeHtml(obs.context.season) : "") +
              row("Phenology", obs.context && obs.context.phenologyStage ? U().escapeHtml(obs.context.phenologyStage) : "") +
              weatherBlock(obs) +
            "</dl>" +
          "</section>" +
          '<section class="fld-detail__section">' +
            '<h2 class="fld-detail__section-title">Place &amp; privacy</h2>' +
            '<dl class="fld-detail__dl">' +
              row("Location", U().escapeHtml(U().formatLocation(obs))) +
              row("Location precision", U().escapeHtml(U().precisionLabel(precision))) +
              row("Privacy", "Private · this device") +
              (precision === "exact"
                ? row("Coordinates", obs.location && obs.location.latitude != null
                  ? U().escapeHtml(Number(obs.location.latitude).toFixed(5) + ", " + Number(obs.location.longitude).toFixed(5))
                  : "—")
                : "") +
            "</dl>" +
          "</section>" +
        "</div>" +
        (obs.record && obs.record.notes
          ? '<section class="fld-detail__notes"><h2>Observation notes</h2><p>' + U().escapeHtml(obs.record.notes) + "</p></section>"
          : "") +
        (fieldry.ethicalNotes
          ? '<section class="fld-detail__ethics"><h2>Ethical notes</h2><p>' + U().escapeHtml(fieldry.ethicalNotes) + "</p></section>"
          : "") +
        mediaBlock(obs) +
        '<section class="fld-detail__section"><h2>Collections</h2>' + collectionActions(obs) + "</section>" +
        '<details class="fld-detail__meta-details">' +
          '<summary>Record details</summary>' +
          '<dl class="fld-detail__dl fld-detail__dl--compact">' +
            row("Record ID", "<code>" + U().escapeHtml(obs.id) + "</code>") +
            row("Retention", "Local only on this device") +
          "</dl>" +
        "</details>" +
        U().ethicsHtml() +
        '<footer class="fld-detail__foot">' +
          '<a class="wds-btn wds-btn--primary" href="#/edit/' + encodeURIComponent(obs.id) + '">Edit record</a>' +
          '<button type="button" class="wds-btn wds-btn--ghost" id="fld-duplicate-obs">Duplicate</button>' +
          '<button type="button" class="wds-btn wds-btn--ghost fld-detail__delete" data-delete-id="' + U().escapeHtml(obs.id) + '">Delete</button>' +
        "</footer>" +
      "</article>"
    );
  }

  function bindCollections(mount, obs) {
    if (!mount || !obs) return;
    var Stores = global.WDS && global.WDS.platform;
    if (!Stores || !Stores.Collections) return;
    var select = mount.querySelector("#fld-collection-select");
    var status = mount.querySelector("#fld-collection-status");
    var collections = Stores.Collections.list().filter(function (c) {
      return !c.appId || c.appId === "fieldry";
    });
    if (select) {
      select.innerHTML = '<option value="">Choose collection…</option>' +
        collections.filter(function (c) { return c.kind !== "favorites"; }).map(function (c) {
          return '<option value="' + U().escapeHtml(c.id) + '">' + U().escapeHtml(c.title) + "</option>";
        }).join("") +
        '<option value="__new_backyard">+ Backyard Birds</option>' +
        '<option value="__new_mushrooms">+ Mushrooms to Revisit</option>' +
        '<option value="__new_trees">+ Favorite Trees</option>' +
        '<option value="__new_geology">+ Local Geology</option>' +
        '<option value="__new_unknown">+ Unknown Species to Identify</option>';
    }
    var favBtn = mount.querySelector("#fld-fav-obs");
    if (favBtn) {
      favBtn.addEventListener("click", function () {
        var fav = Stores.Collections.favorites("fieldry");
        Stores.Collections.addItem(fav.id, obs.id);
        if (status) {
          status.innerHTML = 'Saved to favorites. <a href="#/history?favorites=1">View favorites</a>';
        }
      });
    }
    var addBtn = mount.querySelector("#fld-add-collection");
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        var val = select && select.value;
        if (!val) {
          if (status) status.textContent = "Choose a collection first.";
          return;
        }
        var id = val;
        if (val.indexOf("__new_") === 0) {
          var titles = {
            __new_backyard: "Backyard Birds",
            __new_mushrooms: "Mushrooms to Revisit",
            __new_trees: "Favorite Trees",
            __new_geology: "Local Geology",
            __new_unknown: "Unknown Species to Identify"
          };
          var created = Stores.Collections.create({
            title: titles[val] || "Fieldry collection",
            appId: "fieldry",
            kind: "general",
            privacy: "private"
          });
          Stores.Collections.save(created);
          id = created.id;
        }
        Stores.Collections.addItem(id, obs.id);
        if (status) {
          status.innerHTML = 'Added to collection. <a href="#/history?collection=' +
            encodeURIComponent(id) + '">View collection</a>';
        }
      });
    }
  }

  global.FieldryDetail = {
    render: render,
    bindCollections: bindCollections
  };
})(typeof window !== "undefined" ? window : global);
