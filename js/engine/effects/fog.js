(function (global) {
  "use strict";

  var Base = global.WaypointEffectBase;
  var rootEl = null;

  function syncDom(inst, ctx) {
    if (!rootEl) return;
    var p = Base.resolveParams(inst.getParams());
    var dur = Math.max(8, 130 - p.speed * 1.1);

    rootEl.style.setProperty("--fx-opacity", String(p.alpha(0.06, 0.72)));
    rootEl.style.setProperty("--fx-speed", dur + "s");
    rootEl.style.setProperty("--fx-density", String(p.sizeMul));
    rootEl.style.setProperty("--fx-random", String(p.jitter));
  }

  global.WaypointEffectRegistry.register({
    id: "fog",
    name: "Fog",
    description: "Mist drifting across the frame",
    layer: "dom",
    zIndex: 10,
    defaults: { intensity: 55, speed: 35, opacity: 50, scale: 55, randomness: 40 },
    create: function () {
      return Base.createEffect({
        id: "fog",
        layer: "dom",
        zIndex: 10,
        defaults: { intensity: 55, speed: 35, opacity: 50, scale: 55, randomness: 40 },

        onEnable: function (inst, ctx) {
          if (!ctx.domRoot) return;
          if (!rootEl) {
            rootEl = document.createElement("div");
            rootEl.className = "fx-layer fx-fog";
            rootEl.setAttribute("data-effect-layer", "fog");
            rootEl.innerHTML =
              '<div class="fx-fog-sheet fx-fog-a"></div>' +
              '<div class="fx-fog-sheet fx-fog-b"></div>';
            ctx.domRoot.appendChild(rootEl);
          }
          rootEl.hidden = false;
          syncDom(inst, ctx);
        },

        onDisable: function () {
          if (rootEl) rootEl.hidden = true;
        },

        onParamsChange: function (inst, ctx) {
          if (ctx) syncDom(inst, ctx);
        },

        onResize: function (inst, ctx) {
          if (ctx) syncDom(inst, ctx);
        }
      });
    }
  });
})(window);
