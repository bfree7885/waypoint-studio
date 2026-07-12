/**
 * SignalTerrain — receiver & incident foundations.
 */
(function (global) {
  "use strict";

  var RECEIVER_KEY = "waypoint-signalterrain-receivers-v1";
  var INCIDENT_KEY = "waypoint-signalterrain-incidents-v1";

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  }

  function read(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function createReceiver(partial) {
    partial = partial || {};
    return {
      schemaVersion: "1.0.0",
      id: "rx_" + uuid(),
      label: partial.label || "Receiver",
      frequencyHz: partial.frequencyHz != null ? partial.frequencyHz : null,
      mode: partial.mode || null,
      locationPrivacy: "private",
      plugins: [],
      createdAt: new Date().toISOString()
    };
  }

  function createIncident(partial) {
    partial = partial || {};
    return {
      schemaVersion: "1.0.0",
      id: "inc_" + uuid(),
      title: partial.title || "Incident",
      startedAt: partial.startedAt || new Date().toISOString(),
      endedAt: partial.endedAt || null,
      confidence: partial.confidence || "uncertain",
      notes: partial.notes || null,
      receiverId: partial.receiverId || null,
      privacy: "private",
      createdAt: new Date().toISOString()
    };
  }

  global.WaypointSignalTerrain = {
    RECEIVER_KEY: RECEIVER_KEY,
    INCIDENT_KEY: INCIDENT_KEY,
    createReceiver: createReceiver,
    createIncident: createIncident,
    listReceivers: function () { return read(RECEIVER_KEY); },
    listIncidents: function () { return read(INCIDENT_KEY); },
    saveReceiver: function (rx) {
      var all = read(RECEIVER_KEY).filter(function (r) { return r.id !== rx.id; });
      all.unshift(rx);
      return write(RECEIVER_KEY, all.slice(0, 100));
    },
    saveIncident: function (inc) {
      var all = read(INCIDENT_KEY).filter(function (i) { return i.id !== inc.id; });
      all.unshift(inc);
      return write(INCIDENT_KEY, all.slice(0, 200));
    }
  };
})(window);
