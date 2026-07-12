/**
 * Fieldry personal statistics — reflective, never comparative.
 */
(function (global) {
  "use strict";

  var LL = function () { return global.WaypointFieldryLifeList; };

  function monthKey(dateStr) {
    if (!dateStr || dateStr.length < 7) return null;
    return dateStr.slice(0, 7);
  }

  function privacyLevel(obs) {
    var ext = LL().fieldryExt(obs);
    return ext.privacyLevel || "private";
  }

  function derive(observations) {
    var Life = LL();
    var list = observations || [];
    var summary = Life.summarizeLifeList(list);
    var life = Life.deriveLifeList(list);
    var byMonth = {};
    var identified = 0;
    var unidentified = 0;
    var privateCount = 0;
    var sharedCount = 0;
    var firstDiscoveries = 0;
    var repeats = 0;

    list.forEach(function (obs) {
      var mk = monthKey(obs.observedAt && obs.observedAt.date);
      if (mk) byMonth[mk] = (byMonth[mk] || 0) + 1;
      if (Life.isUnidentified(obs)) unidentified += 1;
      else identified += 1;
      var p = privacyLevel(obs);
      if (p === "private" || p === "anonymized") privateCount += 1;
      else sharedCount += 1;
    });

    life.forEach(function (e) {
      if (e.count === 1) firstDiscoveries += 1;
      else repeats += e.count - 1;
    });

    var months = Object.keys(byMonth).sort().map(function (k) {
      return { month: k, count: byMonth[k] };
    });

    return {
      totalObservations: list.length,
      uniqueSubjects: life.length,
      categoriesExplored: summary.categoriesExplored,
      byCategory: summary.byCategory.filter(function (c) { return c.count > 0; }),
      byMonth: months,
      firstDiscoveries: firstDiscoveries,
      repeatObservations: repeats,
      identified: identified,
      unidentified: unidentified,
      privateRecords: privateCount,
      sharedOrPublicRecords: sharedCount,
      uniqueDays: summary.uniqueDays
    };
  }

  global.FieldryStats = {
    derive: derive
  };
})(typeof window !== "undefined" ? window : global);
