/**
 * Studio Settings page controller
 */
(function (global) {
  "use strict";

  function esc(s) {
    if (global.WDS && WDS.escapeHtml) return WDS.escapeHtml(s);
    if (global.WDS && WDS.platformUi) return WDS.platformUi.escapeHtml(s);
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function paintPlaces() {
    var el = document.getElementById("wps-places");
    if (!el || !global.WDS || !WDS.platformPlaces) return;
    var saved = WDS.platformPlaces.saved();
    var recent = WDS.platformPlaces.recent().slice(0, 5);
    if (!saved.length && !recent.length) {
      el.innerHTML = '<p class="wds-honesty">No saved places yet. Use “Save current location” after setting your region in any app.</p>';
      return;
    }
    var html = "";
    if (saved.length) {
      html += "<h3>Saved</h3><ul>" + saved.map(function (p) {
        return "<li><strong>" + esc(p.label) + "</strong> — " +
          esc([p.city, p.county, p.state].filter(Boolean).join(", ") || "coordinates on device") +
          "</li>";
      }).join("") + "</ul>";
    }
    if (recent.length) {
      html += "<h3>Recent</h3><ul>" + recent.map(function (p) {
        return "<li>" + esc(p.label) + "</li>";
      }).join("") + "</ul>";
    }
    el.innerHTML = html;
  }

  function paintCollections() {
    var el = document.getElementById("wps-collections");
    if (!el || !WDS.platform || !WDS.platform.Collections) return;
    var cols = WDS.platform.Collections.list();
    if (!cols.length) {
      el.innerHTML = '<p class="wds-honesty">No collections yet. Favorites from your field notes appear here when you save them.</p>';
      return;
    }
    el.innerHTML = "<ul>" + cols.map(function (c) {
      return "<li><strong>" + esc(c.title) + "</strong> — " +
        (c.itemIds || []).length + " items" +
        (c.appId && WDS.platformObservations && WDS.platformObservations.sourceLabel
          ? " · " + esc(WDS.platformObservations.sourceLabel(c.appId))
          : c.appId && !/fieldry|foragecast|volunteer|steepleaf|savant|signalterrain|terrainbound|landscape|openroad/i.test(c.appId)
            ? " · " + esc(c.appId)
            : "") + "</li>";
    }).join("") + "</ul>";
  }

  function paintObs() {
    var statsEl = document.getElementById("wps-obs-stats");
    var listEl = document.getElementById("wps-obs-recent");
    if (!WDS.platformObservations) return;
    var stats = WDS.platformObservations.stats();
    if (statsEl) {
      statsEl.textContent =
        stats.total + " private records · " +
        stats.distinctTaxa + " distinct labels · " +
        stats.honesty;
    }
    if (listEl) {
      var recent = WDS.platformObservations.recent(8);
      if (!recent.length) {
        listEl.innerHTML = '<p class="wds-honesty">No cross-app observations on this device yet.</p>';
        return;
      }
      listEl.innerHTML = "<ul>" + recent.map(function (o) {
        var link = o.href
          ? '<a href="' + esc(o.href) + '">' + esc(o.title) + "</a>"
          : esc(o.title);
        return "<li>" + link + " <span class=\"wds-honesty\">" + esc(o.sourceLabel || "notes") + "</span></li>";
      }).join("") + "</ul>";
    }
  }

  function paintNtf() {
    var el = document.getElementById("wps-ntf-list");
    if (!el || !WDS.platformNotifications) return;
    var rows = WDS.platformNotifications.list().slice(0, 8);
    if (!rows.length) {
      el.innerHTML = '<p class="wds-honesty">Inbox empty.</p>';
      return;
    }
    el.innerHTML = "<ul>" + rows.map(function (n) {
      return "<li><strong>" + esc(n.title) + "</strong>" +
        (n.body ? " — " + esc(n.body) : "") + "</li>";
    }).join("") + "</ul>";
  }

  function paintSearch(q) {
    var el = document.getElementById("wps-search-results");
    if (!el || !WDS.platformSearch) return;
    if (!q) {
      el.innerHTML = "";
      return;
    }
    var res = WDS.platformSearch.search(q, { depth: 0, limit: 24 });
    if (!res.total) {
      el.innerHTML = '<p class="wds-honesty">No matches. ' + esc(res.honesty) + "</p>";
      return;
    }
    el.innerHTML =
      '<p class="wds-honesty">' + esc(res.honesty) + "</p><ul>" +
      res.results.map(function (h) {
        var title = h.href
          ? '<a href="' + esc(h.href) + '">' + esc(h.title) + "</a>"
          : esc(h.title);
        return "<li>" + title +
          (h.subtitle ? " — " + esc(h.subtitle) : "") +
          ' <span class="wds-honesty">' + esc(h.group) + "</span></li>";
      }).join("") + "</ul>";
  }

  function bind() {
    if (!global.WDS || !WDS.platform) return;
    if (WDS.platformIdentity) WDS.platformIdentity.ensure();

    var profile = WDS.platform.Profile.load();
    var settings = WDS.platform.Settings.load();

    var nameEl = document.getElementById("wps-display-name");
    if (nameEl) {
      nameEl.value = profile.displayName || "";
      nameEl.addEventListener("change", function () {
        WDS.platform.Profile.setDisplayName(nameEl.value.trim() || null);
      });
    }

    var units = document.getElementById("wps-units");
    if (units) {
      units.value = (settings.units && settings.units.measurementSystem) || "imperial";
      units.addEventListener("change", function () {
        WDS.platform.Settings.patch({ units: { measurementSystem: units.value } });
        var p = WDS.platform.Profile.load();
        p.preferences = p.preferences || {};
        p.preferences.measurementSystem = units.value;
        WDS.platform.Profile.save(p);
      });
    }

    var theme = document.getElementById("wps-theme");
    if (theme) {
      theme.value = (settings.theme && settings.theme.mode) || "system";
      theme.addEventListener("change", function () {
        WDS.platform.Settings.patch({ theme: { mode: theme.value } });
        if (WDS.platformIdentity) WDS.platformIdentity.applyTheme();
      });
    }

    var motion = document.getElementById("wps-reduce-motion");
    if (motion) {
      motion.checked = !!(settings.accessibility && settings.accessibility.reduceMotion);
      motion.addEventListener("change", function () {
        WDS.platform.Settings.patch({ accessibility: { reduceMotion: motion.checked } });
        if (WDS.platformIdentity) WDS.platformIdentity.applyTheme();
      });
    }

    var ntf = document.getElementById("wps-ntf-enabled");
    if (ntf) {
      ntf.checked = !!(settings.notifications && settings.notifications.enabled);
      ntf.addEventListener("change", function () {
        WDS.platform.Settings.patch({ notifications: { enabled: ntf.checked, localRemindersOnly: true } });
      });
    }

    var saveCur = document.getElementById("wps-save-current");
    if (saveCur) {
      saveCur.addEventListener("click", function () {
        if (WDS.platformPlaces && WDS.platformPlaces.saveCurrent) {
          var place = WDS.platformPlaces.saveCurrent();
          if (!place) {
            alert("Set a location in Dashboard first, then save it here.");
          }
          paintPlaces();
        }
      });
    }

    var search = document.getElementById("wps-search");
    if (search) {
      var run = function () { paintSearch(search.value); };
      if (WDS.resilience && WDS.resilience.debounce) run = WDS.resilience.debounce(run, 140);
      search.addEventListener("input", run);
    }

    if (WDS.platformGraph && WDS.platformGraph.deriveFromObservations) {
      try { WDS.platformGraph.deriveFromObservations(); } catch (e) { /* ignore */ }
    }

    paintPlaces();
    paintCollections();
    paintObs();
    paintNtf();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})(typeof window !== "undefined" ? window : globalThis);
