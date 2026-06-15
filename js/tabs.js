(function (global) {
  "use strict";

  var TAB_IDS = ["living-scene", "parallax", "photography", "learn", "export"];
  var activeTab = "living-scene";
  var onChange = null;
  var tablist = null;

  function getTabButtons() {
    if (!tablist) return [];
    return Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
  }

  function focusTabButton(tabId) {
    var btn = tablist && tablist.querySelector('[data-tab="' + tabId + '"]');
    if (btn) btn.focus();
  }

  function init(config) {
    tablist = config.tablist;
    if (!tablist) return;
    onChange = config.onChange || null;

    getTabButtons().forEach(function (btn, index) {
      btn.setAttribute("tabindex", index === 0 ? "0" : "-1");
      btn.addEventListener("click", function () {
        switchTo(btn.getAttribute("data-tab"));
      });
    });

    tablist.addEventListener("keydown", handleKeydown);
    switchTo(activeTab, true);
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

    buttons.forEach(function (btn, i) {
      btn.setAttribute("tabindex", i === next ? "0" : "-1");
    });
    buttons[next].focus();
    switchTo(buttons[next].getAttribute("data-tab"));
  }

  function switchTo(tabId, silent) {
    if (TAB_IDS.indexOf(tabId) === -1) return;
    var prev = activeTab;
    activeTab = tabId;

    TAB_IDS.forEach(function (id) {
      var panel = document.getElementById("tab-" + id);
      var btn = document.querySelector('#workspace-tabs [data-tab="' + id + '"]');
      var topBtn = document.querySelector('.topbar-tab-link[data-tab="' + id + '"]');
      var on = id === tabId;
      if (panel) {
        panel.classList.toggle("is-active", on);
        panel.hidden = !on;
      }
      if (btn) {
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
        btn.setAttribute("tabindex", on ? "0" : "-1");
      }
      if (topBtn) {
        topBtn.classList.toggle("is-active", on);
      }
    });

    if (!silent && onChange && prev !== tabId) {
      onChange(prev, tabId);
    }
  }

  function getActive() {
    return activeTab;
  }

  global.WaypointTabs = {
    TAB_IDS: TAB_IDS,
    init: init,
    switchTo: switchTo,
    getActive: getActive,
    focusTabButton: focusTabButton
  };
})(window);
