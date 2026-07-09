/**
 * Photo Coach — field opportunities from OIE photography rules + season
 */
(function (global) {
  "use strict";

  var U = function () { return global.PhotoCoachUtil; };

  function briefingFromPlatform(platform, location) {
    var OIE = global.WDS && global.WDS.outdoorIntelligenceEngine;
    if (!OIE || !OIE.build) return null;
    return OIE.build({ platform: platform, location: location || {} });
  }

  function genreFromBlock(bl) {
    var w = bl.what || "";
    var idx = w.indexOf(":");
    if (idx > 0 && idx < 32) return w.slice(0, idx);
    return bl.category || "Field opportunity";
  }

  function renderOppBlock(bl) {
    var util = U();
    if (!bl) return "";
    var genre = genreFromBlock(bl);
    return (
      '<article class="pc-opp">' +
        '<p class="pc-opp__genre">' + util.escapeHtml(genre) + "</p>" +
        '<p class="pc-opp__what">' + util.escapeHtml(bl.what || "") + "</p>" +
        (bl.why ? '<p class="pc-opp__why"><strong>Why:</strong> ' + util.escapeHtml(bl.why) + "</p>" : "") +
        (bl.whatToDo ? '<p class="pc-opp__action"><strong>In the field:</strong> ' + util.escapeHtml(bl.whatToDo) + "</p>" : "") +
        (bl.whatToLookFor ? '<p class="pc-opp__action"><strong>Look for:</strong> ' + util.escapeHtml(bl.whatToLookFor) + "</p>" : "") +
        (bl.trust ? '<span class="pc-card__trust">' + util.escapeHtml(bl.trust) + (bl.source ? " · " + util.escapeHtml(bl.source) : "") + "</span>" : "") +
      "</article>"
    );
  }

  function render(ctx) {
    ctx = ctx || {};
    var util = U();
    var platform = ctx.platform;
    var location = ctx.location || {};
    var html = "";

    if (!platform || !platform.weatherRef || !platform.weatherRef.current) {
      return (
        '<div class="pc-unavailable">' +
          "Opportunity guidance needs live weather for your location. Set your region to see what conditions favor today — fog, waterfalls, wildlife, and more." +
        "</div>"
      );
    }

    var briefing = briefingFromPlatform(platform, location);
    var blocks = briefing && briefing.photoFieldGuide ? briefing.photoFieldGuide : [];

    if (blocks.length) {
      blocks.forEach(function (bl) {
        html += renderOppBlock(bl);
      });
    } else {
      html += '<div class="pc-unavailable">No active opportunities match current conditions. Check back as weather changes.</div>';
    }

    var seasonal = global.PhotoCoachContent && global.PhotoCoachContent.getSeasonalForDate();
    if (seasonal && seasonal.length) {
      html += '<div class="pc-section__head" style="margin-top:2rem"><h3 class="pc-section__title">Seasonal watchlist</h3>' +
        '<p class="pc-section__lead">What this time of year often rewards — independent of today’s weather.</p></div>';
      seasonal.forEach(function (opp) {
        html += (
          '<article class="pc-opp">' +
            '<p class="pc-opp__genre">Seasonal</p>' +
            '<p class="pc-opp__what">' + util.escapeHtml(opp.title) + "</p>" +
            '<p class="pc-opp__why">' + util.escapeHtml(opp.note) + "</p>" +
          "</article>"
        );
      });
    }

    return html;
  }

  global.PhotoCoachOpportunities = {
    render: render,
    briefingFromPlatform: briefingFromPlatform
  };
})(window);
