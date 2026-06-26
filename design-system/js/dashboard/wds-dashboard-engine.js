/**
 * Waypoint Dashboard Engine — customizable outdoor mission control
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function humanizeStatus(status) {
    var RI = global.WDS && (global.WDS.researchIntegrity || global.WDS.provenance);
    if (RI && RI.humanizeSpeciesStatus) return RI.humanizeSpeciesStatus(status);
    return String(status || "").replace(/-/g, " ");
  }

  function renderList(items) {
    if (!items || !items.length) return "";
    return (
      "<ul class=\"wdb-widget__list\">" +
        items.map(function (item) {
          if (typeof item === "string") return "<li>" + escapeHtml(item) + "</li>";
          if (item.text && item.kind) {
            var kindLabel = item.kind === "forecast" ? "Forecast" :
              item.kind === "observation" ? "Observation" : "Interpretation";
            return (
              "<li class=\"wdb-widget__highlight-row\">" +
                '<span class="wdb-widget__highlight-kind">' + escapeHtml(kindLabel) + "</span>" +
                "<span>" + escapeHtml(item.text) + "</span>" +
              "</li>"
            );
          }
          var line = "<strong>" + escapeHtml(item.name) + "</strong>";
          if (item.status) line += ' <span class="wdb-widget__status">' + escapeHtml(humanizeStatus(item.status)) + "</span>";
          if (item.note) line += " — " + escapeHtml(item.note);
          return "<li>" + line + "</li>";
        }).join("") +
      "</ul>"
    );
  }

  function renderGroups(groups) {
    if (!groups || !groups.length) return "";
    return groups.map(function (group) {
      return (
        '<div class="wdb-widget__group">' +
          '<p class="wdb-widget__group-label">' + escapeHtml(group.label) + "</p>" +
          renderList(group.items) +
        "</div>"
      );
    }).join("");
  }

  function renderWidgetBody(def, data) {
    var html = "";
    if (data.mountKind) {
      var WUI = global.WDS && global.WDS.weatherUI;
      var loading = WUI && WUI.renderLoading
        ? WUI.renderLoading(data.mountKind)
        : '<p class="wdb-widget__loading">Loading…</p>';
      html += (
        '<div class="wdb-widget__mount wds-weather-mount" data-wds-weather-mount="' + escapeHtml(data.mountKind) + '" aria-live="polite" aria-busy="true">' +
        loading +
        "</div>"
      );
      return html;
    }
    if (data.status === "loading") {
      return '<p class="wdb-widget__loading">Loading regional data…</p>';
    }
    if (data.status === "error") {
      return '<p class="wdb-widget__error">' + escapeHtml(data.error || "Could not load this widget.") + "</p>";
    }
    if (data.placeholder) {
      html += '<p class="wdb-widget__placeholder">' + escapeHtml(data.placeholder) + "</p>";
    }
    if (data.highlight) html += '<p class="wdb-widget__highlight">' + escapeHtml(data.highlight) + "</p>";
    if (data.body) html += '<p class="wdb-widget__body-text">' + escapeHtml(data.body) + "</p>";
    if (data.groups) html += renderGroups(data.groups);
    else if (data.highlightItems) html += renderList(data.highlightItems);
    else if (data.items) html += renderList(data.items);
    if (!html && data.status === "empty") {
      html = '<p class="wdb-widget__empty">Nothing to show yet.</p>';
    }
    return html;
  }

  function renderWidget(def, data, userConfig) {
    userConfig = userConfig || {};
    var collapsed = !!userConfig.collapsed;
    var tag = data.tag || { label: "—", className: "" };
    var link = data.link || (def.detailHref ? { href: def.detailHref, label: "Learn more" } : null);
    var size = def.size || "md";
    var summary = data.summary || def.defaultSummary || "";

    return (
      '<article class="wdb-widget wdb-widget--' + escapeHtml(def.id) + " wdb-widget--" + escapeHtml(size) +
        (def.tier === "vital" ? " wdb-widget--vital" : "") +
        (def.tier === "anchor" ? " wdb-widget--anchor" : "") +
        (size === "full" || def.size === "full" ? " wdb-widget--full wdb-widget--sky" : "") +
        (collapsed ? " wdb-widget--collapsed" : "") + '" id="widget-' + escapeHtml(def.id) + '" data-widget-id="' + escapeHtml(def.id) + '">' +
        '<header class="wdb-widget__head">' +
          '<span class="wdb-widget__icon" aria-hidden="true">' + escapeHtml(def.icon) + "</span>" +
          '<div class="wdb-widget__titles">' +
            '<h3 class="wdb-widget__title">' + escapeHtml(def.title) + "</h3>" +
            (summary ? '<p class="wdb-widget__summary">' + escapeHtml(summary) + "</p>" : "") +
          "</div>" +
          '<span class="wdb-widget__tag ' + escapeHtml(tag.className) + '">' + escapeHtml(tag.label) + "</span>" +
          '<button type="button" class="wdb-widget__refresh" data-widget-refresh="' + escapeHtml(def.id) + '" aria-label="Refresh ' + escapeHtml(def.title) + '" title="Refresh">↻</button>' +
          (def.tier !== "anchor"
            ? '<button type="button" class="wdb-widget__toggle" aria-expanded="' + (!collapsed) + '" aria-label="Toggle ' + escapeHtml(def.title) + '"></button>'
            : "") +
        "</header>" +
        '<div class="wdb-widget__body">' + renderWidgetBody(def, data) + "</div>" +
        (link
          ? '<footer class="wdb-widget__foot"><a class="wdb-widget__link" href="' + escapeHtml(link.href) + '">' + escapeHtml(link.label) + "</a></footer>"
          : "") +
      "</article>"
    );
  }

  function buildContext(options) {
    options = options || {};
    return {
      platform: options.platform || null,
      bundle: options.bundle || {},
      location: options.location || null
    };
  }

  function renderWidgetsHtml(defs, ctx, settings) {
    return defs.map(function (def) {
      var data = def.getData ? def.getData(ctx) : { status: "empty" };
      var cfg = (settings.widgets && settings.widgets[def.id]) || {};
      return renderWidget(def, data, cfg);
    }).join("");
  }

  function renderGrid(options) {
    return renderDashboard(options);
  }

  function renderDashboard(options) {
    var W = global.WDS && global.WDS.dashboardWidgets;
    var S = global.WDS && global.WDS.dashboardSettings;
    if (!W || !S) return "";
    var settings = options.settings || S.load();
    var ctx = buildContext(options);
    var enabled = S.enabledWidgets(settings);
    var anchor = enabled.filter(function (d) { return d.tier === "anchor"; });
    var vital = enabled.filter(function (d) { return d.tier === "vital"; });
    var standard = enabled.filter(function (d) {
      return d.tier !== "vital" && d.tier !== "anchor";
    });
    var sections = S.enabledWidgetsBySection(settings, standard);
    var html = "";

    if (anchor.length) {
      html += '<div class="wdb-anchor" data-wds-dashboard-anchor aria-label="Outdoor weather">';
      html += renderWidgetsHtml(anchor, ctx, settings);
      html += "</div>";
    }

    if (vital.length) {
      html += '<div class="wdb-vitals" data-wds-dashboard-vitals aria-label="Today at a glance">';
      html += renderWidgetsHtml(vital, ctx, settings);
      html += "</div>";
    }

    sections.forEach(function (section) {
      if (!section.widgets.length) return;
      html += (
        '<section class="wdb-section" id="wdb-section-' + escapeHtml(section.id) + '" data-section-id="' + escapeHtml(section.id) + '">' +
          '<header class="wdb-section__head">' +
            '<h2 class="wdb-section__title">' + escapeHtml(section.label) + "</h2>" +
          "</header>" +
          '<div class="wdb-grid wce-dash-board" data-wds-dashboard-grid>' +
            renderWidgetsHtml(section.widgets, ctx, settings) +
          "</div>" +
        "</section>"
      );
    });

    return html;
  }

  function mountWidgets(root, options) {
    if (!root) return Promise.resolve();
    options = options || {};
    var weatherOpts = {
      location: options.location,
      hints: options.hints,
      root: root,
      fallback: false,
      intelligence: options.intelligence,
      platform: options.platform,
      package: options.platform && options.platform.weatherRef
    };
    var jobs = [];
    if (global.WDS && global.WDS.weatherUI && global.WDS.weatherUI.mountAll) {
      jobs.push(global.WDS.weatherUI.mountAll(root, weatherOpts));
    }
    if (global.WDS && global.WDS.happeningNow && global.WDS.happeningNow.mountAll) {
      jobs.push(Promise.resolve(global.WDS.happeningNow.mountAll(root, {
        bundle: options.bundle,
        location: options.location,
        intelligence: options.intelligence,
        platform: options.platform
      })));
    }
    return Promise.all(jobs);
  }

  function refreshWidget(root, widgetId, options) {
    if (!root || !widgetId) return Promise.resolve();
    var article = root.querySelector('[data-widget-id="' + widgetId + '"]');
    if (!article) return Promise.resolve();
    var mount = article.querySelector("[data-wds-weather-mount]");
    if (mount) {
      var kind = mount.getAttribute("data-wds-weather-mount");
      if (kind === "outdoor-weather" && global.WDS.outdoorWeatherUI && global.WDS.outdoorWeatherUI.mount) {
        return global.WDS.outdoorWeatherUI.mount(mount, Object.assign({}, options, { root: article }));
      }
      if (kind === "sun-moon-dashboard" && global.WDS.skyDashboardUI && global.WDS.skyDashboardUI.mountSunMoon) {
        return global.WDS.skyDashboardUI.mountSunMoon(mount, Object.assign({}, options, { root: article }));
      }
      if (kind === "photography-dashboard" && global.WDS.skyDashboardUI && global.WDS.skyDashboardUI.mountPhotography) {
        return global.WDS.skyDashboardUI.mountPhotography(mount, Object.assign({}, options, { root: article }));
      }
      if (global.WDS && global.WDS.weatherUI && global.WDS.weatherUI.mountAll) {
        var weatherOpts = Object.assign({}, options, { root: article });
        return global.WDS.weatherUI.mountAll(article, weatherOpts);
      }
    }
    return refreshDashboard(root, options);
  }

  function bindInteractions(root) {
    if (!root) return;
    root.addEventListener("click", function (e) {
      var refreshBtn = e.target.closest("[data-widget-refresh]");
      if (refreshBtn) {
        var rid = refreshBtn.getAttribute("data-widget-refresh");
        refreshBtn.classList.add("wdb-widget__refresh--spin");
        var opts = root._wdbMountOpts || {};
        refreshWidget(root, rid, opts).finally(function () {
          refreshBtn.classList.remove("wdb-widget__refresh--spin");
        });
        return;
      }
      var btn = e.target.closest(".wdb-widget__toggle");
      if (!btn) return;
      var article = btn.closest(".wdb-widget");
      if (!article) return;
      var collapsed = article.classList.toggle("wdb-widget--collapsed");
      btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      var id = article.getAttribute("data-widget-id");
      var S = global.WDS && global.WDS.dashboardSettings;
      if (S && id) {
        var settings = S.load();
        if (!settings.widgets[id]) settings.widgets[id] = {};
        settings.widgets[id].collapsed = collapsed;
        S.save(settings);
      }
    });
  }

  function bindSettings(root, onChange) {
    var S = global.WDS && global.WDS.dashboardSettings;
    if (!S) return null;
    S.bindPanel(root, onChange);
    var openBtn = root.querySelector("#wds-dashboard-settings-open");
    var panel = root.querySelector("#wds-dashboard-settings");
    if (!panel) {
      root.insertAdjacentHTML("beforeend", S.renderPanel());
      panel = root.querySelector("#wds-dashboard-settings");
    }
    if (openBtn) {
      openBtn.addEventListener("click", function () {
        if (panel && panel.showModal) panel.showModal();
      });
    }
    return panel;
  }

  function refreshDashboard(root, options) {
    var host = root.querySelector("[data-wds-dashboard-root]");
    if (!host) return Promise.resolve();
    host.innerHTML = renderDashboard(options);
    bindInteractions(root);
    return mountWidgets(root, options);
  }

  function refreshGrid(root, options) {
    return refreshDashboard(root, options);
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardEngine = {
    renderGrid: renderGrid,
    renderDashboard: renderDashboard,
    mountWidgets: mountWidgets,
    bindInteractions: bindInteractions,
    bindSettings: bindSettings,
    refreshGrid: refreshGrid,
    refreshDashboard: refreshDashboard,
    refreshWidget: refreshWidget,
    buildContext: buildContext
  };
})(window);
