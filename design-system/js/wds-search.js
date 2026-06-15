/**
 * Waypoint Studio Design System — Search
 * Filter lists with debounced input and accessible clear control.
 *
 * Usage:
 *   WDS.search.bind({
 *     input: document.querySelector(".wds-search__input"),
 *     clear: document.querySelector(".wds-search__clear"),
 *     onQuery: function (query) { filterItems(query); },
 *     debounceMs: 180
 *   });
 */
(function (global) {
  "use strict";

  function debounce(fn, ms) {
    var timer = null;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function bind(config) {
    config = config || {};
    var input = config.input;
    if (!input) return;

    var clearBtn = config.clear;
    var delay = typeof config.debounceMs === "number" ? config.debounceMs : 180;

    function emit() {
      var q = (input.value || "").trim();
      if (clearBtn) clearBtn.hidden = !q;
      if (config.onQuery) config.onQuery(q);
    }

    var debounced = debounce(emit, delay);

    input.addEventListener("input", debounced);
    input.addEventListener("search", emit);

    if (clearBtn) {
      clearBtn.hidden = !(input.value || "").trim();
      clearBtn.addEventListener("click", function () {
        input.value = "";
        input.focus();
        emit();
      });
    }
  }

  /**
   * Simple client-side filter for elements with data-search-text.
   */
  function filterElements(container, query, itemSelector) {
    if (!container) return 0;
    var q = (query || "").toLowerCase();
    var items = container.querySelectorAll(itemSelector || "[data-search-text]");
    var visible = 0;

    items.forEach(function (el) {
      var text = (el.getAttribute("data-search-text") || el.textContent || "").toLowerCase();
      var show = !q || text.indexOf(q) !== -1;
      el.hidden = !show;
      if (show) visible += 1;
    });

    return visible;
  }

  global.WDS = global.WDS || {};
  global.WDS.search = {
    bind: bind,
    filterElements: filterElements
  };
})(window);
