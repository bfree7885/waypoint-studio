/**
 * Waypoint Volunteer — private personal impact dashboard (local only).
 * No public scores, streaks as pressure, or leaderboards.
 * "Streak" here means calm consecutive weeks with any completed help — never shaming.
 */
(function (global) {
  "use strict";

  var KEY = "waypoint-volunteer-impact-v1";

  var DEFAULT = {
    version: 1,
    events: [],
    totals: {
      hours: 0,
      organizations: {},
      causes: {},
      trailMiles: 0,
      treesPlanted: 0,
      mealsPacked: 0,
      animalsHelped: 0,
      observations: 0,
      completedCount: 0
    }
  };

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function load() {
    try {
      var ls = global.localStorage;
      var raw = ls && ls.getItem(KEY);
      if (!raw) return clone(DEFAULT);
      var parsed = JSON.parse(raw);
      var out = clone(DEFAULT);
      out.events = parsed.events || [];
      out.totals = Object.assign(out.totals, parsed.totals || {});
      return out;
    } catch (e) {
      return clone(DEFAULT);
    }
  }

  function persist(state) {
    try {
      if (global.localStorage) global.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
    return state;
  }

  function recompute(state) {
    var totals = clone(DEFAULT.totals);
    state.events.forEach(function (ev) {
      totals.hours += Number(ev.hours) || 0;
      totals.trailMiles += Number(ev.trailMiles) || 0;
      totals.treesPlanted += Number(ev.treesPlanted) || 0;
      totals.mealsPacked += Number(ev.mealsPacked) || 0;
      totals.animalsHelped += Number(ev.animalsHelped) || 0;
      totals.observations += Number(ev.observations) || 0;
      totals.completedCount += 1;
      if (ev.organizationId) {
        totals.organizations[ev.organizationId] =
          (totals.organizations[ev.organizationId] || 0) + 1;
      }
      (ev.causes || []).forEach(function (c) {
        totals.causes[c] = (totals.causes[c] || 0) + 1;
      });
    });
    state.totals = totals;
    return state;
  }

  function recordCompletion(opp, org) {
    var i = (opp && opp.intelligence && opp.intelligence.impactMetrics) || {};
    var ev = {
      id: "ev_" + Date.now(),
      opportunityId: opp.id,
      organizationId: opp.organizationId,
      title: opp.title,
      orgName: org ? org.name : opp.organizationId,
      at: new Date().toISOString(),
      hours: i.hours != null ? i.hours : (opp.estimatedDuration && opp.estimatedDuration.minutes / 60) || 1,
      trailMiles: i.trailMiles || 0,
      treesPlanted: i.treesPlanted || 0,
      mealsPacked: i.mealsPacked || 0,
      animalsHelped: i.animalsHelped || 0,
      observations: i.observations || 0,
      causes: (opp.categories || []).slice()
    };
    var state = load();
    state.events.unshift(ev);
    return persist(recompute(state));
  }

  function calmStreakWeeks(state) {
    state = state || load();
    var weeks = {};
    state.events.forEach(function (ev) {
      var d = new Date(ev.at);
      var onejan = new Date(d.getFullYear(), 0, 1);
      var week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
      weeks[d.getFullYear() + "-W" + week] = true;
    });
    var keys = Object.keys(weeks).sort();
    if (!keys.length) return 0;
    return keys.length;
  }

  function summary() {
    var state = load();
    var orgCount = Object.keys(state.totals.organizations || {}).length;
    var causeCount = Object.keys(state.totals.causes || {}).length;
    return {
      state: state,
      organizationCount: orgCount,
      causeCount: causeCount,
      weeksWithHelp: calmStreakWeeks(state),
      honesty: "private-local"
    };
  }

  function clear() {
    try {
      if (global.localStorage) global.localStorage.removeItem(KEY);
    } catch (e) {}
    return clone(DEFAULT);
  }

  global.WDS = global.WDS || {};
  global.WDS.volunteerImpact = {
    KEY: KEY,
    load: load,
    recordCompletion: recordCompletion,
    summary: summary,
    calmStreakWeeks: calmStreakWeeks,
    clear: clear
  };
})(window);
