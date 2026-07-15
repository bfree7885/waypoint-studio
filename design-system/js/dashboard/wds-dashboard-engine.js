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

  function educationalFallback(def, data, options) {
    var EF = global.WDS && global.WDS.educationalFallback;
    if (!EF) return '<p class="wdb-widget__empty">Data currently unavailable</p>';
    if (data && data.educationalHtml && !(options && options.forceUnavailable)) return data.educationalHtml;
    var topic = (data && data.educationalTopic) ||
      EF.topicForWidget(def && def.id, def && def.category);
    if (EF.renderUnavailable && !(options && options.pendingLive)) {
      return EF.renderUnavailable(topic, options || {});
    }
    return EF.render(topic, options || {});
  }

  function renderWidgetBody(def, data) {
    data = data || {};
    var html = "";

    if (data.status === "educational" || data.status === "unavailable") {
      return data.educationalHtml || educationalFallback(def, data);
    }

    if (data.mountKind) {
      var EF = global.WDS && global.WDS.educationalFallback;
      var loading = EF && EF.mountHtml
        ? EF.mountHtml(data.mountKind)
        : educationalFallback(def, data, { pendingLive: true });
      html += (
        '<div class="wdb-widget__mount wds-weather-mount" data-wds-weather-mount="' + escapeHtml(data.mountKind) + '" aria-live="polite" aria-busy="true">' +
        loading +
        "</div>"
      );
      return html;
    }
    if (data.status === "loading") {
      return educationalFallback(def, data, { pendingLive: true });
    }
    if (data.status === "error" || data.status === "placeholder") {
      return educationalFallback(def, data);
    }
    if (data.placeholder) {
      html += '<p class="wdb-widget__placeholder">' + escapeHtml(data.placeholder) + "</p>";
    }
    if (data.highlight) html += '<p class="wdb-widget__highlight">' + escapeHtml(data.highlight) + "</p>";
    if (data.body) html += '<p class="wdb-widget__body-text">' + escapeHtml(data.body) + "</p>";
    if (data.educationalHtml && data.status !== "ready") html += data.educationalHtml;
    if (data.groups) html += renderGroups(data.groups);
    else if (data.highlightItems) html += renderList(data.highlightItems);
    else if (data.items) html += renderList(data.items);
    if (!html && data.status === "empty") {
      return educationalFallback(def, data);
    }
    if (data.placeholder && !data.highlight && !data.body && !data.groups && !data.highlightItems && !data.items) {
      return educationalFallback(def, data);
    }
    if (!html) {
      return educationalFallback(def, data);
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
    var isGlance = def.id && def.id.indexOf("glance-") === 0;

    return (
      '<article class="wdb-widget wdb-widget--' + escapeHtml(def.id) + " wdb-widget--" + escapeHtml(size) +
        (def.tier === "vital" ? " wdb-widget--vital" : "") +
        (isGlance ? " wdb-widget--glance" : "") +
        (def.tier === "anchor" ? " wdb-widget--anchor" : "") +
        (size === "full" || def.size === "full"
          ? " wdb-widget--full" + (
            def.category === "wildlife" ? " wdb-widget--wildlife" :
            def.category === "trails" ? " wdb-widget--trail" :
            def.category === "water" ? " wdb-widget--water" :
            def.category === "flora" ? " wdb-widget--flora" :
            def.category === "foraging" ? " wdb-widget--foraging" :
            def.category === "safety" ? " wdb-widget--safety" :
            " wdb-widget--sky"
          )
          : "") +
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
        (data.metaFooter ? '<footer class="wdb-widget__meta">' + escapeHtml(data.metaFooter) + "</footer>" : "") +
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

  function renderSectionBlock(section, ctx, settings, opts) {
    opts = opts || {};
    if (!section.widgets || !section.widgets.length) return "";
    var collapsed = !!(settings.sectionCollapsed && settings.sectionCollapsed[section.id]);
    var icon = opts.icon ? '<span class="wdb-section__icon" aria-hidden="true">' + escapeHtml(opts.icon) + "</span>" : "";
    return (
      '<section class="wdb-section' + (opts.modifier ? " wdb-section--" + escapeHtml(opts.modifier) : "") +
        (collapsed ? " wdb-section--collapsed" : "") + '" id="wdb-section-' + escapeHtml(section.id) +
        '" data-section-id="' + escapeHtml(section.id) + '">' +
        '<header class="wdb-section__head">' +
          icon +
          '<h2 class="wdb-section__title">' + escapeHtml(section.label) + "</h2>" +
          '<button type="button" class="wdb-section__toggle" aria-expanded="' + (!collapsed) +
            '" aria-label="Toggle ' + escapeHtml(section.label) + ' section"></button>' +
        "</header>" +
        '<div class="wdb-grid wce-dash-board" data-wds-dashboard-grid>' +
          renderWidgetsHtml(section.widgets, ctx, settings) +
        "</div>" +
      "</section>"
    );
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
    var favorites = S.favoriteWidgets(settings);
    var customGroups = S.customGroupSections(settings);
    var sections = S.enabledWidgetsBySection(settings, standard);
    var html = "";

    if (anchor.length) {
      html += '<div class="wdb-anchor" data-wds-dashboard-anchor aria-label="Outdoor weather">';
      html += renderWidgetsHtml(anchor, ctx, settings);
      html += "</div>";
    }

    var Brief = global.WDS && global.WDS.dashboardBrief;
    if (Brief && Brief.render) {
      html += Brief.render(ctx);
    }

    var BP = global.WDS && global.WDS.briefingPackage;
    if (BP && BP.render) {
      html += BP.render(ctx);
    }

    if (vital.length) {
      html += '<div class="wdb-vitals" data-wds-dashboard-vitals aria-label="Current conditions at a glance">';
      html += renderWidgetsHtml(vital, ctx, settings);
      html += "</div>";
    }

    if (favorites.length) {
      html += renderSectionBlock(
        { id: "favorites", label: "Favorites", widgets: favorites },
        ctx,
        settings,
        { modifier: "favorites", icon: "★" }
      );
    }

    customGroups.forEach(function (group) {
      html += renderSectionBlock(group, ctx, settings, { modifier: "custom-group" });
    });

    sections.forEach(function (section) {
      html += renderSectionBlock(section, ctx, settings);
    });

    return html;
  }

  function mountWidgets(root, options) {
    if (!root) return Promise.resolve();
    options = options || {};
    var Rel = global.WDS && global.WDS.dashboardReliability;
    var weatherOpts = {
      location: options.location,
      hints: options.hints,
      root: root,
      fallback: false,
      intelligence: options.intelligence,
      platform: options.platform,
      bundle: options.bundle,
      package: options.platform && options.platform.weatherRef
    };
    var jobs = [];
    if (global.WDS && global.WDS.weatherUI && global.WDS.weatherUI.mountAll) {
      jobs.push(global.WDS.weatherUI.mountAll(root, weatherOpts));
    }
    if (global.WDS && global.WDS.happeningNow && global.WDS.happeningNow.mountAll &&
        root.querySelector("[data-wds-happening-now-mount]")) {
      jobs.push(Promise.resolve(global.WDS.happeningNow.mountAll(root, {
        bundle: options.bundle,
        location: options.location,
        intelligence: options.intelligence,
        platform: options.platform
      })));
    }
    var deadline = Rel && Rel.MOUNT_JOB_DEADLINE_MS != null ? Rel.MOUNT_JOB_DEADLINE_MS : 12000;
    var guarded = jobs.map(function (job) {
      return Rel && Rel.withDeadline ? Rel.withDeadline(job, deadline) : Promise.resolve(job).then(function (v) {
        return { ok: true, value: v };
      });
    });
    return Promise.all(guarded).then(function () {
      var BP = global.WDS && global.WDS.briefingPackage;
      if (BP && BP.refresh) {
        BP.refresh(root, {
          platform: options.platform,
          location: options.location,
          bundle: options.bundle
        });
      }
      applyPlatformTrustBadges(root, options.platform);
    }).finally(function () {
      settleStaleMounts(root, options);
    });
  }

  function applyPlatformTrustBadges(root, platform) {
    if (!root || !platform || !platform.meta) return;
    var Rel = global.WDS && global.WDS.dashboardReliability;
    if (!Rel || !Rel.classifyPackageTrust) return;
    var trust = Rel.classifyPackageTrust(platform);
    if (trust !== "partial" && trust !== "cached" && trust !== "offline") return;
    var WUI = global.WDS && global.WDS.weatherUI;
    if (!WUI || !WUI.updateWidgetTag) return;
    var nodes = root.querySelectorAll("[data-widget-id] .wdb-widget__tag--live");
    for (var i = 0; i < nodes.length; i++) {
      var article = nodes[i].closest("[data-widget-id]");
      if (!article) continue;
      WUI.updateWidgetTag(root, article.getAttribute("data-widget-id"), trust);
    }
  }

  /** After mount jobs finish, never leave widgets stuck on Loading. */
  function settleStaleMounts(root, options) {
    var EF = global.WDS && global.WDS.educationalFallback;
    var Rel = global.WDS && global.WDS.dashboardReliability;
    if (!root || !EF || !EF.renderUnavailable) return;
    var state = "provider-unavailable";
    if (Rel && !Rel.isOnline()) state = "offline";
    else if (options && options.platform && Rel && Rel.classifyPackageTrust) {
      var trust = Rel.classifyPackageTrust(options.platform);
      if (trust === "offline" || trust === "cached") state = trust;
    }
    var mounts = root.querySelectorAll("[data-wds-weather-mount][aria-busy='true']");
    for (var i = 0; i < mounts.length; i++) {
      var mount = mounts[i];
      var kind = mount.getAttribute("data-wds-weather-mount") || "";
      var topic = EF.topicForMount ? EF.topicForMount(kind) : "weather";
      var updatedAt = options && options.platform && options.platform.meta
        ? options.platform.meta.hydratedAt
        : null;
      mount.innerHTML = EF.renderUnavailable(topic, {
        state: state,
        mountKind: kind,
        updatedAt: updatedAt
      });
      mount.removeAttribute("aria-busy");
      var article = mount.closest("[data-widget-id]");
      if (article) {
        var tag = article.querySelector(".wdb-widget__tag");
        if (tag) {
          var info = Rel && Rel.tagFor ? Rel.tagFor(state) : {
            label: "Provider Unavailable",
            className: "wdb-widget__tag--unavailable"
          };
          tag.textContent = info.label;
          tag.className = "wdb-widget__tag " + info.className;
        }
      }
    }
  }

  function refreshWidget(root, widgetId, options) {
    if (!root || !widgetId) return Promise.resolve();
    options = options || {};
    var article = root.querySelector('[data-widget-id="' + widgetId + '"]');
    if (!article) return Promise.resolve();
    var mount = article.querySelector("[data-wds-weather-mount]");
    var job = Promise.resolve();
    if (mount) {
      var kind = mount.getAttribute("data-wds-weather-mount");
      if (kind === "outdoor-weather" && global.WDS.outdoorWeatherUI && global.WDS.outdoorWeatherUI.mount) {
        job = global.WDS.outdoorWeatherUI.mount(mount, Object.assign({}, options, { root: article }));
      } else if (kind === "sun-moon-dashboard" && global.WDS.skyDashboardUI && global.WDS.skyDashboardUI.mountSunMoon) {
        job = global.WDS.skyDashboardUI.mountSunMoon(mount, Object.assign({}, options, { root: article }));
      } else if (kind === "photography-dashboard" && global.WDS.skyDashboardUI && global.WDS.skyDashboardUI.mountPhotography) {
        job = global.WDS.skyDashboardUI.mountPhotography(mount, Object.assign({}, options, { root: article }));
      } else if (kind === "wildlife-dashboard" && global.WDS.wildlifeDashboardUI && global.WDS.wildlifeDashboardUI.mount) {
        job = global.WDS.wildlifeDashboardUI.mount(mount, Object.assign({}, options, { root: article }));
      } else if (kind === "trail-dashboard" && global.WDS.trailDashboardUI && global.WDS.trailDashboardUI.mount) {
        job = global.WDS.trailDashboardUI.mount(mount, Object.assign({}, options, { root: article }));
      } else if (kind === "water-dashboard" && global.WDS.waterDashboardUI && global.WDS.waterDashboardUI.mount) {
        job = global.WDS.waterDashboardUI.mount(mount, Object.assign({}, options, { root: article }));
      } else if (kind === "flora-dashboard" && global.WDS.floraDashboardUI && global.WDS.floraDashboardUI.mount) {
        job = global.WDS.floraDashboardUI.mount(mount, Object.assign({}, options, { root: article }));
      } else if (kind === "foraging-dashboard" && global.WDS.foragingDashboardUI && global.WDS.foragingDashboardUI.mount) {
        job = global.WDS.foragingDashboardUI.mount(mount, Object.assign({}, options, { root: article }));
      } else if (kind === "safety-dashboard" && global.WDS.safetyDashboardUI && global.WDS.safetyDashboardUI.mount) {
        job = global.WDS.safetyDashboardUI.mount(mount, Object.assign({}, options, { root: article }));
      } else if (global.WDS && global.WDS.weatherUI && global.WDS.weatherUI.mountAll) {
        var weatherOpts = Object.assign({}, options, { root: article });
        job = global.WDS.weatherUI.mountAll(article, weatherOpts);
      } else {
        job = refreshDashboard(root, options);
      }
    } else {
      job = refreshDashboard(root, options);
    }
    var Rel = global.WDS && global.WDS.dashboardReliability;
    var deadline = Rel && Rel.MOUNT_JOB_DEADLINE_MS != null ? Rel.MOUNT_JOB_DEADLINE_MS : 12000;
    var guarded = Rel && Rel.withDeadline ? Rel.withDeadline(job, deadline) : Promise.resolve(job).then(function (v) {
      return { ok: true, value: v };
    });
    return guarded.finally(function () {
      settleStaleMounts(article, options);
    });
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
      var sectionBtn = e.target.closest(".wdb-section__toggle");
      if (sectionBtn) {
        var section = sectionBtn.closest(".wdb-section");
        if (!section) return;
        var sectionId = section.getAttribute("data-section-id");
        var sectionCollapsed = section.classList.toggle("wdb-section--collapsed");
        sectionBtn.setAttribute("aria-expanded", sectionCollapsed ? "false" : "true");
        var Ssec = global.WDS && global.WDS.dashboardSettings;
        if (Ssec && sectionId) {
          var secSettings = Ssec.load();
          Ssec.toggleSectionCollapsed(secSettings, sectionId);
          Ssec.save(secSettings);
        }
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
    var C = global.WDS && global.WDS.dashboardCustomize;
    if (!C) return null;
    var panel = document.getElementById("wds-dashboard-settings");
    if (!panel) {
      document.body.insertAdjacentHTML("beforeend", C.renderPanel());
      panel = document.getElementById("wds-dashboard-settings");
    }
    C.bindPanel(root, onChange);
    var openBtn = root.querySelector("#wds-dashboard-settings-open");
    if (openBtn && panel) {
      if (!openBtn._wdbSettingsBound) {
        openBtn._wdbSettingsBound = true;
        openBtn.addEventListener("click", function () {
          if (C.refreshPanel) C.refreshPanel(panel);
          if (panel.showModal) panel.showModal();
        });
      }
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
    settleStaleMounts: settleStaleMounts,
    buildContext: buildContext
  };
})(window);
