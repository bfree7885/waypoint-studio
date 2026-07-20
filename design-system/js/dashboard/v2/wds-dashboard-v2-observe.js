/**
 * Dashboard V2 — Observe Today (mission-connected, evidence-based).
 */
(function (global) {
  "use strict";

  function cards(model) {
    model = model || {};
    var out = [];
    var c = model.weather.current || {};
    var cond = String(c.conditions || "").toLowerCase();
    var dl = model.daylight || {};
    var Sky = global.WDS && global.WDS.skyDashboardIntel;
    var sky = Sky && Sky.analyze && model.platform ? Sky.analyze(model.platform.weatherRef, model.platform) : null;

    if (sky && sky.fogPotential && /likely|possible/i.test(sky.fogPotential.headline)) {
      out.push({
        text: "Watch for fog in low valleys after sunrise — soft light and simplified backgrounds.",
        link: { href: "../../apps/hidden-landscapes/", label: "Landscape Interpretation" },
        rule: "fog-potential"
      });
    }
    if (dl.sunrise && c.windMph != null && c.windMph < 10) {
      out.push({
        text: "Listen for increased bird activity during the calm morning period near sunrise.",
        link: { href: "../../apps/fieldry/", label: "Fieldry" },
        rule: "calm-morning-birding"
      });
    }
    if (model.rainfall && model.rainfall.recent && Number(model.rainfall.recent.amount) > 0.05) {
      out.push({
        text: "Observe how streams respond after recent rainfall — note color, flow, and debris lines.",
        link: { href: "../../apps/fieldry/", label: "Fieldry" },
        rule: "post-rain-hydrology"
      });
    }
    if (c.windMph != null && c.windMph < 8 && /rain|shower/.test(cond) === false) {
      out.push({
        text: "Photograph reflections on still water before winds pick up later in the day.",
        link: { href: "../../apps/photo-coach/", label: "Photo Coach" },
        rule: "calm-reflections"
      });
    }
    if (model.season === "spring" && c.tempF != null && c.tempF >= 50) {
      out.push({
        text: "Look for new plant growth following warmer nights — note species and location carefully.",
        link: { href: "../../apps/foragecast/", label: "ForageCast" },
        rule: "spring-greenup"
      });
    }
    if (c.cloudPct != null && c.cloudPct >= 40 && c.cloudPct <= 85) {
      out.push({
        text: "Record cloud transitions through the afternoon — useful for reading approaching fronts.",
        link: { href: "../../apps/scenes/", label: "Scenes" },
        rule: "cloud-transitions"
      });
    }
    if (model.moon.illumination != null && model.moon.illumination >= 70) {
      out.push({
        text: "Bright moonlight tonight — try a moonlit landscape exposure study.",
        link: { href: "../../apps/photo-coach/", label: "Photo Coach" },
        rule: "moonlight"
      });
    }

    return out.slice(0, 5);
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2Observe = { cards: cards };
})(window);
