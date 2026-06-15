(function (global) {
  "use strict";

  var TAB_IDS = ["living-scene", "parallax", "photography", "learn", "export"];
  var activeTab = "living-scene";
  var onChange = null;

  function init(config) {
    var tablist = config.tablist;
    if (!tablist) return;
    onChange = config.onChange || null;

    tablist.querySelectorAll("[data-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTo(btn.getAttribute("data-tab"));
      });
    });

    switchTo(activeTab, true);
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
    getActive: getActive
  };
})(window);
