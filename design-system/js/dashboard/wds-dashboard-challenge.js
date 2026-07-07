/**
 * Today's Challenge — one outdoor activity, rotated daily.
 */
(function (global) {
  "use strict";

  var CHALLENGES = [
    { type: "Photography", title: "Find three textures in one frame", body: "Photograph bark, water, and stone without moving more than ten steps. Notice how side light reveals texture.", why: "Texture exercises your eye for detail and teaches how light direction shapes surfaces." },
    { type: "Birding", title: "Five-minute sound map", body: "Stand still for five minutes. Sketch or list every bird call you hear and its direction.", why: "Sound mapping builds field awareness faster than scanning with binoculars alone." },
    { type: "Hiking", title: "Pace check on a climb", body: "On your next uphill section, count breaths per 20 steps. Slow until you can speak in full sentences.", why: "Pacing prevents overheating and keeps observation quality high on ascents." },
    { type: "Ecology", title: "Edge habitat survey", body: "Walk a forest edge or field margin. Record three plants and one sign of animal use (track, scat, browse).", why: "Edges concentrate biodiversity — they are where species from two habitats meet." },
    { type: "Nature journaling", title: "One square meter study", body: "Choose one square meter of ground. Draw it and label every living thing you can identify in ten minutes.", why: "Small-plot studies reveal complexity that wide views hide." },
    { type: "Photography", title: "Blue hour bracket", body: "Arrive 25 minutes before sunrise or after sunset. Make three exposures: -1, 0, +1 EV on the same composition.", why: "Blue hour has narrow dynamic range — bracketing teaches exposure judgment for low light." },
    { type: "Birding", title: "Silhouette ID", body: "Identify one bird by shape and flight pattern only — no color or song.", why: "Silhouette skills help in dawn fog and backlit conditions." },
    { type: "Hiking", title: "Water crossing protocol", body: "At your next stream, find the widest, shallowest crossing. Unbuckle your pack hip belt before entering.", why: "Most trail injuries near water involve slips — protocol reduces entrapment risk." },
    { type: "Ecology", title: "Phenology pin", body: "Photograph one bud, bloom, or leaf-out stage with date and GPS. Compare to last year if you have records.", why: "Phenology is one of the clearest climate signals you can record locally." },
    { type: "Nature journaling", title: "Weather sketch", body: "Draw cloud types and note wind direction, temperature, and humidity at one location.", why: "Linking sky form to felt conditions builds weather literacy in the field." },
    { type: "Photography", title: "Foreground anchor", body: "Every shot today needs a foreground element within six feet of your lens.", why: "Foreground anchors create depth and pull viewers into the frame." },
    { type: "Conservation", title: "Leave No Trace audit", body: "On your outing, pick up three pieces of litter and note one trail impact you could avoid next time.", why: "Small stewardship actions compound across millions of outdoor visits." }
  ];

  function dayIndex(date) {
    date = date || new Date();
    var start = new Date(date.getFullYear(), 0, 0);
    var diff = date - start;
    var day = Math.floor(diff / 86400000);
    return day % CHALLENGES.length;
  }

  function build(ctx) {
    var c = CHALLENGES[dayIndex()];
    var dateLabel = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
    return {
      status: "ready",
      tag: { label: "Editorial", className: "wdb-widget__tag--editorial" },
      summary: c.type + " · " + c.title,
      body: c.body,
      items: ["Why: " + c.why],
      metaFooter: "Waypoint editorial · " + dateLabel
    };
  }

  function generate(ctx) {
    return build(ctx);
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardChallenge = { build: build, generate: generate, all: CHALLENGES };
})(window);
