(function (global) {
  "use strict";

  var TAB_IDS = ["living-scene", "parallax", "photography", "learn", "export"];

  function init(config) {
    if (global.WDS && global.WDS.tabs) {
      global.WDS.tabs.init({
        tablist: config.tablist,
        panelPrefix: "tab-",
        tabAttr: "data-tab",
        initialTab: "living-scene",
        syncSelectors: [
          { selector: ".topbar-tab-link", attr: "data-tab", activeClass: "is-active" }
        ],
        onChange: config.onChange || null
      });
      return;
    }

    console.warn("[WaypointTabs] WDS.tabs not loaded.");
  }

  function switchTo(tabId, silent) {
    if (global.WDS && global.WDS.tabs) {
      global.WDS.tabs.switchTo(tabId, silent);
    }
  }

  function getActive() {
    return global.WDS && global.WDS.tabs ? global.WDS.tabs.getActive() : "living-scene";
  }

  function focusTabButton(tabId) {
    if (global.WDS && global.WDS.tabs) {
      global.WDS.tabs.focusTab(tabId);
    }
  }

  global.WaypointTabs = {
    TAB_IDS: TAB_IDS,
    init: init,
    switchTo: switchTo,
    getActive: getActive,
    focusTabButton: focusTabButton
  };
})(window);
