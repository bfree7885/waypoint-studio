/**
 * Daily Learn — rotating outdoor education by day of year.
 */
(function (global) {
  "use strict";

  var LESSONS = [
    { topic: "Ecology", title: "Ecotone effect", body: "Where forest meets field, species from both habitats overlap. Look for higher diversity within 30 meters of an edge than deep inside either habitat.", source: "Waypoint field guide" },
    { topic: "Biology", title: "Cold-blooded timing", body: "Reptiles and amphibians need external warmth to move. Morning sun on south-facing rocks is often the first activity zone after a cool night.", source: "Waypoint field guide" },
    { topic: "Geology", title: "Reading valley shape", body: "U-shaped valleys were carved by glaciers; V-shaped valleys by rivers. The cross-section tells you which force dominated.", source: "Waypoint field guide" },
    { topic: "Weather", title: "Dew point and comfort", body: "When dew point approaches air temperature, humidity feels oppressive. Below 55°F dew point, most people find outdoor air comfortable.", source: "Waypoint field guide" },
    { topic: "Photography", title: "Inverse square law", body: "Light falls off quickly with distance. A subject twice as far from a flash or campfire receives one-quarter the illumination.", source: "Waypoint photography guide" },
    { topic: "Conservation", title: "Stay on durable surfaces", body: "Rock, sand, and dry grass tolerate foot traffic. Wet meadows and cryptobiotic soil crusts can take decades to recover from one off-trail step.", source: "Leave No Trace principles" },
    { topic: "Ecology", title: "Keystone species", body: "Some species disproportionately shape ecosystems. Beavers create wetlands used by dozens of other species — their dams are habitat engineering.", source: "Waypoint field guide" },
    { topic: "Biology", title: "Migration fuel", body: "Long-distance migrants build fat reserves before departure. A warbler may double its body weight before a Gulf crossing.", source: "Waypoint field guide" },
    { topic: "Geology", title: "Bedding planes", body: "Sedimentary rock layers reveal ancient environments. Horizontal beds mean calm deposition; tilted beds mean tectonic forces acted later.", source: "Waypoint field guide" },
    { topic: "Weather", title: "Cumulus growth", body: "Fair-weather cumulus that grows vertically after noon can signal instability. Watch tops for hard edges — a sign of building convection.", source: "Waypoint field guide" },
    { topic: "Photography", title: "Hyperfocal distance", body: "Focusing at the hyperfocal distance keeps everything from half that distance to infinity acceptably sharp — essential for landscape depth.", source: "Waypoint photography guide" },
    { topic: "Conservation", title: "Wildlife distance", body: "If an animal changes behavior because of you — stops feeding, looks up repeatedly, moves away — you are too close. Back off.", source: "Waypoint outdoor ethics" }
  ];

  function dayIndex(date) {
    date = date || new Date();
    var start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000) % LESSONS.length;
  }

  function build(ctx) {
    var lesson = LESSONS[dayIndex()];
    var dateLabel = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
    return {
      status: "ready",
      tag: { label: "Regional", className: "wdb-widget__tag--editorial" },
      summary: lesson.topic + " · " + lesson.title,
      body: lesson.body,
      metaFooter: lesson.source + " · " + dateLabel
    };
  }

  function generate(ctx) {
    return build(ctx);
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardLearn = { build: build, generate: generate, all: LESSONS };
})(window);
