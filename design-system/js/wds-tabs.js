/**
 * Waypoint Studio Design System — Tabs
 * Accessible tablist pattern for any product workspace.
 *
 * Usage:
 *   WDS.tabs.init({
 *     tablist: document.getElementById("workspace-tabs"),
 *     panelPrefix: "tab-",
 *     tabAttr: "data-tab",
 *     onChange: function (from, to) {}
 *   });
 */
(function (global) {
  "use strict";

  var tablist = null;
  var panelPrefix = "tab-";
  var tabAttr = "data-tab";
  var onChange = null;
  var activeTab = null;
  var syncSelectors = [];

  function syncExternalTabs(tabId) {
    syncSelectors.forEach(function (rule) {
      document.querySelectorAll(rule.selector || "").forEach(function (el) {
        var id = el.getAttribute(rule.attr || "data-tab");
        el.classList.toggle(rule.activeClass || "is-active", id === tabId);
      });
    });
  }

  function getTabButtons() {
    if (!tablist) return [];
    return Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
  }

  function getTabId(btn) {
    return btn.getAttribute(tabAttr) || btn.getAttribute("data-wds-tab");
  }

  function getPanel(tabId) {
    return document.getElementById(panelPrefix + tabId);
  }

  function switchTo(tabId, silent) {
    var buttons = getTabButtons();
    var found = buttons.some(function (btn) { return getTabId(btn) === tabId; });
    if (!found) return;

    var prev = activeTab;
    activeTab = tabId;

    buttons.forEach(function (btn) {
      var id = getTabId(btn);
      var on = id === tabId;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.setAttribute("tabindex", on ? "0" : "-1");

      var panel = getPanel(id);
      if (panel) {
        panel.classList.toggle("is-active", on);
        panel.hidden = !on;
      }
    });

    syncExternalTabs(tabId);

    if (!silent && onChange && prev !== tabId) {
      onChange(prev, tabId);
    }
  }

  function handleKeydown(e) {
    var buttons = getTabButtons();
    if (!buttons.length) return;

    var current = buttons.indexOf(document.activeElement);
    if (current === -1) return;

    var next = current;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (current + 1) % buttons.length;
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (current - 1 + buttons.length) % buttons.length;
      e.preventDefault();
    } else if (e.key === "Home") {
      next = 0;
      e.preventDefault();
    } else if (e.key === "End") {
      next = buttons.length - 1;
      e.preventDefault();
    } else {
      return;
    }

    buttons[next].focus();
    switchTo(getTabId(buttons[next]));
  }

  function init(config) {
    config = config || {};
    tablist = config.tablist;
    if (!tablist) return;

    panelPrefix = config.panelPrefix || "tab-";
    tabAttr = config.tabAttr || "data-tab";
    onChange = config.onChange || null;
    syncSelectors = config.syncSelectors || [];

    var buttons = getTabButtons();
    var initial = config.initialTab || getTabId(buttons[0]) || null;

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTo(getTabId(btn));
      });
    });

    tablist.addEventListener("keydown", handleKeydown);

    if (initial) switchTo(initial, true);
  }

  function getActive() {
    return activeTab;
  }

  function focusTab(tabId) {
    if (!tablist) return;
    var btn = tablist.querySelector("[" + tabAttr + '="' + tabId + '"]');
    if (btn) btn.focus();
  }

  global.WDS = global.WDS || {};
  global.WDS.tabs = {
    init: init,
    switchTo: switchTo,
    getActive: getActive,
    focusTab: focusTab
  };
})(window);
