/**
 * Waypoint Studio — Local notification inbox (no push, no engagement tricks)
 *
 * Quiet, on-device reminders the user opts into via platform Settings.
 * Worth Noticing remains separate (anti-notification).
 *
 *   WDS.platformNotifications.list()
 *   WDS.platformNotifications.add(item)
 *   WDS.platformNotifications.markRead(id)
 *   WDS.platformNotifications.clear()
 *   WDS.platformNotifications.isEnabled()
 */
(function (global) {
  "use strict";

  var KEY = "waypoint-platform-notifications-v1";
  var MAX = 40;

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function write(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
      return true;
    } catch (e) {
      return false;
    }
  }

  function isEnabled() {
    var S = global.WDS && global.WDS.platform && global.WDS.platform.Settings;
    if (!S) return false;
    var s = S.load();
    return !!(s.notifications && s.notifications.enabled);
  }

  function list() {
    return read().slice().sort(function (a, b) {
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
  }

  function add(item) {
    item = item || {};
    if (!item.title) return null;
    // Respect opt-in except for critical system offline notes (kind=system always allowed as inbox records)
    if (!isEnabled() && item.kind !== "system") return null;
    var row = {
      id: item.id || ("ntf_" + Date.now().toString(36)),
      kind: item.kind || "reminder",
      title: String(item.title),
      body: item.body || null,
      href: item.href || null,
      appId: item.appId || null,
      createdAt: new Date().toISOString(),
      read: false,
      honesty: item.honesty || "Local reminder on this device. Not a push notification."
    };
    var all = read();
    all.unshift(row);
    write(all);
    return row;
  }

  function markRead(id) {
    var all = read().map(function (n) {
      if (n.id === id) n.read = true;
      return n;
    });
    return write(all);
  }

  function clear() {
    return write([]);
  }

  function unreadCount() {
    return read().filter(function (n) { return !n.read; }).length;
  }

  global.WDS = global.WDS || {};
  global.WDS.platformNotifications = {
    version: "1.0.0",
    KEY: KEY,
    list: list,
    add: add,
    markRead: markRead,
    clear: clear,
    isEnabled: isEnabled,
    unreadCount: unreadCount
  };
})(typeof window !== "undefined" ? window : globalThis);
