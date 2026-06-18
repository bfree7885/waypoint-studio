/**
 * ForageCast — shared location bootstrap (uses WDS.location + localStorage)
 */
(function (global) {
  "use strict";

  var ENGINE_BASE = "../../design-system/content-engine/";

  function bootstrapLocation() {
    return new Promise(function (resolve) {
      function tryBoot() {
        if (!global.WDS || !global.WDS.location) {
          requestAnimationFrame(tryBoot);
          return;
        }
        global.WDS.location
          .bootstrap({
            base: ENGINE_BASE,
            promptMount: document.getElementById("wds-location-prompt")
          })
          .then(resolve)
          .catch(function () {
            var stored = global.ForageCastLocation ? global.ForageCastLocation.read() : null;
            resolve(stored || (global.ForageCastLocation && global.ForageCastLocation.DEFAULT));
          });
      }
      tryBoot();
    });
  }

  function bindRegionChange(mount, onChange) {
    if (!mount || !global.WDS || !global.WDS.location) return;
    var changeBtn = mount.querySelector("#fc-loc-change");
    var form = mount.querySelector("#fc-loc-change-form");
    if (!changeBtn || !form) return;

    changeBtn.addEventListener("click", function () {
      form.classList.toggle("is-hidden");
      global.WDS.location.loadIndex(ENGINE_BASE).then(function (index) {
        var list = form.querySelector("#fc-loc-list");
        if (list) {
          list.innerHTML = (index.regions || []).map(function (r) {
            return '<option value="' + r.name + ", " + r.stateCode + '">';
          }).join("");
        }
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector("#fc-loc-input");
      var q = (input && input.value || "").toLowerCase().trim();
      if (!q) return;
      global.WDS.location.loadIndex(ENGINE_BASE).then(function (index) {
        var found = (index.regions || []).find(function (r) {
          var label = (r.name + ", " + r.stateCode).toLowerCase();
          return label === q || r.name.toLowerCase() === q;
        });
        if (!found) {
          found = (index.regions || []).find(function (r) {
            return r.name.toLowerCase().indexOf(q) !== -1;
          });
        }
        if (found) {
          var state = global.WDS.location.resolveManual(found.id, index);
          global.WDS.location.writeStored(state);
          if (onChange) onChange(state);
        }
      });
    });

    var retryBtn = mount.querySelector("#fc-loc-retry");
    if (retryBtn) {
      retryBtn.addEventListener("click", function () {
        global.WDS.location.requestGeolocationAndSave(ENGINE_BASE).then(function (state) {
          if (onChange) onChange(state);
        });
      });
    }
  }

  global.ForageCastBoot = {
    ENGINE_BASE: ENGINE_BASE,
    bootstrapLocation: bootstrapLocation,
    bindRegionChange: bindRegionChange
  };
})(window);
