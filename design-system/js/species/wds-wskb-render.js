/**
 * WSKB — species profile page renderer
 */
(function (global) {
  "use strict";

  var KB = function () { return global.WDS && global.WDS.wskb; };

  function esc(str) {
    return KB() ? KB().escapeHtml(str) : String(str == null ? "" : str);
  }

  function provBadge(section, record) {
    var prov = record.meta && record.meta.provenance && record.meta.provenance[section];
    if (!prov) return "";
    var labels = {
      verified: "Verified",
      educational: "Educational",
      regional: "Regional note",
      unknown: "Unknown",
      future: "Future"
    };
    return '<span class="wskb-prov wskb-prov--' + esc(prov) + '" title="Content provenance">' + esc(labels[prov] || prov) + "</span>";
  }

  function section(id, title, body, record, provKey) {
    if (!body) return "";
    return (
      '<section class="wskb-section" id="' + esc(id) + '">' +
        '<header class="wskb-section__head">' +
          '<h2 class="wskb-section__title">' + esc(title) + "</h2>" +
          provBadge(provKey || id, record) +
        "</header>" +
        '<div class="wskb-section__body">' + body + "</div>" +
      "</section>"
    );
  }

  function listItems(items) {
    if (!items || !items.length) return "";
    if (typeof items === "string") return "<p>" + esc(items) + "</p>";
    return "<ul class=\"wskb-list\">" + items.map(function (i) {
      return "<li>" + esc(i) + "</li>";
    }).join("") + "</ul>";
  }

  function renderHero(record) {
    var media = (record.media && record.media[0]) || {};
    var visual = media.placeholder !== false
      ? (
        '<div class="wskb-hero__media wskb-hero__media--placeholder" role="img" aria-label="' + esc(media.alt || record.names.common) + '">' +
          '<span class="wskb-hero__media-badge">Species photograph · placeholder</span>' +
        "</div>"
      )
      : '<img class="wskb-hero__media" src="' + esc(media.src) + '" alt="' + esc(media.alt) + '">';

    return (
      '<header class="wskb-hero">' +
        visual +
        '<div class="wskb-hero__text">' +
          '<p class="wds-eyebrow">Species profile · WSKB</p>' +
          '<h1 class="wskb-hero__common">' + esc(record.names.common) + "</h1>" +
          '<p class="wskb-hero__sci"><em>' + esc(record.names.scientific) + "</em></p>" +
          (record.education && record.education.summary
            ? '<p class="wskb-hero__hook">' + esc(record.education.summary) + "</p>"
            : "") +
        "</div>" +
      "</header>"
    );
  }

  function renderQuickFacts(record) {
    var tax = record.taxonomy || {};
    var range = record.range || {};
    return (
      '<aside class="wskb-facts" aria-label="Quick facts">' +
        '<h2 class="wskb-facts__title">Quick facts</h2>' +
        '<dl class="wskb-facts__dl">' +
          (tax.family ? "<div><dt>Family</dt><dd>" + esc(tax.family) + "</dd></div>" : "") +
          (range.nativeStatus ? "<div><dt>Status</dt><dd>" + esc(range.nativeStatus) + " · " + esc(range.conservationStatus || "") + "</dd></div>" : "") +
          (record.habitat && record.habitat.summary ? "<div><dt>Habitat</dt><dd>" + esc(record.habitat.summary) + "</dd></div>" : "") +
          (record.phenology && record.phenology.activePeriod ? "<div><dt>Season</dt><dd>" + esc(record.phenology.activePeriod) + "</dd></div>" : "") +
          (range.geographicRange ? "<div><dt>Range</dt><dd>" + esc(range.geographicRange) + "</dd></div>" : "") +
        "</dl>" +
      "</aside>"
    );
  }

  function renderTaxonomy(record) {
    var tax = record.taxonomy || {};
    var rows = ["kingdom", "phylum", "class", "order", "family", "genus", "species"].filter(function (k) {
      return tax[k];
    }).map(function (k) {
      return "<div><dt>" + esc(k.charAt(0).toUpperCase() + k.slice(1)) + "</dt><dd>" + esc(tax[k]) + "</dd></div>";
    }).join("");
    if (!rows) return "";
    return '<dl class="wskb-taxonomy">' + rows + "</dl>";
  }

  function renderLookalikes(list) {
    if (!list || !list.length) return "";
    return (
      "<ul class=\"wskb-lookalikes\">" +
        list.map(function (la) {
          var link = la.speciesId && KB()
            ? ' <a href="' + esc(KB().profileHref(la.speciesId)) + '">Profile</a>'
            : "";
          return "<li><strong>" + esc(la.name) + "</strong> — " + esc(la.distinction) + link + "</li>";
        }).join("") +
      "</ul>"
    );
  }

  function renderRelated(list) {
    if (!list || !list.length) return "";
    return (
      '<div class="wskb-related">' +
        list.map(function (r) {
          if (!r.speciesId || !KB()) return "";
          var rec = KB().getSync(r.speciesId);
          var name = rec && rec.names ? rec.names.common : r.speciesId;
          return (
            '<a class="wskb-related__card" href="' + esc(KB().profileHref(r.speciesId)) + '">' +
              '<span class="wskb-related__name">' + esc(name) + "</span>" +
              '<span class="wskb-related__rel">' + esc(r.relationship || "") + "</span>" +
            "</a>"
          );
        }).join("") +
      "</div>"
    );
  }

  function renderEthics(record) {
    var OE = global.WDS && global.WDS.outdoorEthics;
    var ethicsHtml = OE && OE.renderReminder
      ? OE.renderReminder("wildlife", { className: "wskb-ethics-block" })
      : "";
    var eth = record.ethics || {};
    return (
      ethicsHtml +
      listItems(eth.leaveNoTrace) +
      (eth.conservation ? '<p class="wskb-ethics-summary">' + esc(eth.conservation) + "</p>" : "")
    );
  }

  function renderProfile(record, options) {
    options = options || {};
    if (!record) {
      return '<p class="wskb-missing">Species profile not found.</p>';
    }

    var regional = record.phenology && record.phenology.regionalNotes;
    var regionalNote = regional && options.regionId ? regional[options.regionId] : null;

    var html = '<article class="wskb-profile" data-species-id="' + esc(record.id) + '">';
    html += renderHero(record);

    html += '<div class="wskb-profile__layout">';
    html += '<div class="wskb-profile__main">';

    html += section("overview", "Overview", "<p>" + esc(record.education && record.education.overview) + "</p>", record, "overview");

    html += section(
      "identification",
      "Identification",
      (record.identification && record.identification.summary ? "<p>" + esc(record.identification.summary) + "</p>" : "") +
        listItems(record.identification && record.identification.fieldMarks) +
        (record.identification && record.identification.lookAlikes && record.identification.lookAlikes.length
          ? "<h3 class=\"wskb-subhead\">Look-alikes</h3>" + renderLookalikes(record.identification.lookAlikes)
          : ""),
      record,
      "identification"
    );

    html += section(
      "habitat",
      "Habitat",
      "<p>" + esc(record.habitat && record.habitat.summary) + "</p>" +
        listItems(record.habitat && record.habitat.preferred) +
        (record.habitat && record.habitat.substrate ? "<p><strong>Substrate:</strong> " + esc(record.habitat.substrate) + "</p>" : ""),
      record,
      "overview"
    );

    html += section(
      "ecology",
      "Ecology",
      "<p>" + esc(record.ecology && record.ecology.role) + "</p>" +
        (record.ecology && record.ecology.associatedSpecies && record.ecology.associatedSpecies.length
          ? "<h3 class=\"wskb-subhead\">Associated species</h3>" +
            "<ul class=\"wskb-list\">" +
            record.ecology.associatedSpecies.map(function (a) {
              var link = a.speciesId && KB()
                ? '<a href="' + esc(KB().profileHref(a.speciesId)) + '">' + esc(a.name || a.speciesId) + "</a>"
                : esc(a.name);
              return "<li>" + link + " — " + esc(a.relationship) + "</li>";
            }).join("") +
            "</ul>"
          : ""),
      record,
      "overview"
    );

    html += section(
      "seasonality",
      "Seasonality",
      "<p>" + esc(record.phenology && record.phenology.seasonality) + "</p>" +
        (record.phenology && record.phenology.activePeriod ? "<p><strong>Active period:</strong> " + esc(record.phenology.activePeriod) + "</p>" : "") +
        (regionalNote ? '<p class="wskb-regional"><strong>Regional note:</strong> ' + esc(regionalNote) + "</p>" : ""),
      record,
      "phenology"
    );

    html += section("observation", "Observation tips", listItems(record.ethics && record.ethics.observation), record, "overview");
    html += section("conservation", "Conservation", renderEthics(record), record, "conservation");
    html += section("facts", "Interesting facts", listItems(record.education && record.education.interestingFacts), record, "educational");
    html += section("field-notes", "Field notes", listItems(record.education && record.education.fieldNotes), record, "educational");

    if (record.safety && record.safety.considerations && record.safety.considerations.length) {
      html += section("safety", "Safety considerations", listItems(record.safety.considerations), record, "safety");
    }

    if (record.photography && record.photography.tips && record.photography.tips.length) {
      html += section("photography", "Photography tips", listItems(record.photography.tips), record, "educational");
    }

    html += section("related", "Related species", renderRelated(record.relatedSpecies), record, "educational");

  var futureBlock = "";
    if (record.futureObservations && record.futureObservations.length) {
      futureBlock += "<h3 class=\"wskb-subhead\">Suggested future observations</h3>" + listItems(record.futureObservations);
    }
    if (record.unknowns && record.unknowns.length) {
      futureBlock += "<h3 class=\"wskb-subhead\">Known unknowns</h3>" + listItems(record.unknowns);
    }
    html += section("future", "Future observations & unknowns", futureBlock, record, "unknown");

    if (record.observationTemplate) {
      html += section(
        "observe-template",
        "Observation template",
        "<p class=\"wskb-hint\">For Fieldry — suggested prompts when recording this species.</p>" +
          listItems(record.observationTemplate.prompts),
        record,
        "future"
      );
    }

    html += section(
      "taxonomy-detail",
      "Taxonomy",
      renderTaxonomy(record) +
        (record.names && record.names.aliases && record.names.aliases.length
          ? "<p><strong>Also known as:</strong> " + esc(record.names.aliases.join(", ")) + "</p>"
          : "") +
        '<p class="wskb-hint">Synonyms — future enrichment slot.</p>',
      record,
      "taxonomy"
    );

    var RI = global.WDS && global.WDS.researchIntegrity;
    if (RI && RI.renderDisclaimer) {
      html += '<footer class="wskb-foot">' + RI.renderDisclaimer({
        provenance: "educational",
        text: "Species profile from Waypoint Species Knowledge Base — educational interpretation for field learning, not a legal harvest guide or medical advice.",
        showBadge: true
      }) + "</footer>";
    }

    html += "</div>";
    html += renderQuickFacts(record);
    html += "</div>";
    html += "</article>";

    return html;
  }

  global.WDS = global.WDS || {};
  global.WDS.wskbRender = {
    renderProfile: renderProfile
  };
})(typeof window !== "undefined" ? window : global);
