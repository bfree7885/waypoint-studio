(function (global) {
  "use strict";

  var Base = global.WaypointEffectBase;
  var rootEl = null;

  function syncDom(inst, ctx) {
    if (!rootEl) return;
    var p = Base.resolveParams(inst.getParams());
    var dur = Math.max(12, 110 - p.speed * 0.9);
    var angle = -15 + p.rand(12);

    rootEl.style.setProperty("--fx-opacity", String(p.alpha(0.05, 0.48)));
    rootEl.style.setProperty("--fx-speed", dur + "s");
    rootEl.style.setProperty("--fx-angle", angle + "deg");
    rootEl.style.setProperty("--fx-scale", String(p.sizeMul));
  }

  global.WaypointEffectRegistry.register({
    id: "lightRays",
    name: "Light Rays",
    description: "Cinematic sun beams from above",
    layer: "dom",
    zIndex: 20,
    defaults: { intensity: 40, speed: 25, opacity: 35, scale: 55, randomness: 30 },
    create: function () {
      return Base.createEffect({
        id: "lightRays",
        layer: "dom",
        zIndex: 20,
        defaults: { intensity: 40, speed: 25, opacity: 35, scale: 55, randomness: 30 },

        onEnable: function (inst, ctx) {
          if (!ctx.domRoot) return;
          if (!rootEl) {
            rootEl = document.createElement("div");
            rootEl.className = "fx-layer fx-light-rays";
            rootEl.setAttribute("data-effect-layer", "lightRays");
            rootEl.innerHTML =
              '<div class="fx-ray fx-ray-a"></div>' +
              '<div class="fx-ray fx-ray-b"></div>' +
              '<div class="fx-ray fx-ray-c"></div>';
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
