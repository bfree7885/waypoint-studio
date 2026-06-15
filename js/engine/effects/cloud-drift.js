(function (global) {
  "use strict";

  var Base = global.WaypointEffectBase;
  var rootEl = null;
  var clouds = [];

  function syncDom(inst, ctx) {
    if (!rootEl) return;
    var p = Base.resolveParams(inst.getParams());
    var dur = Math.max(20, 170 - p.speed * 1.25);
    var count = Math.max(2, Math.round(Base.scale(p.intensity, 2, 6)));

    rootEl.style.setProperty("--fx-opacity", String(p.alpha(0.04, 0.38)));
    rootEl.style.setProperty("--fx-speed", dur + "s");
    rootEl.style.setProperty("--fx-random", String(p.jitter));

    while (clouds.length < count) {
      var cloud = document.createElement("div");
      cloud.className = "fx-cloud";
      rootEl.appendChild(cloud);
      clouds.push(cloud);
    }
    while (clouds.length > count) {
      var removed = clouds.pop();
      if (removed && removed.parentNode) removed.parentNode.removeChild(removed);
    }

    clouds.forEach(function (el, i) {
      var size = (28 + (i % 3) * 14) * p.sizeMul;
      el.style.width = size + "%";
      el.style.height = size * 0.45 + "%";
      el.style.top = 5 + i * 12 + p.rand(3) + "%";
      el.style.animationDelay = -(i * 7 + p.rand(5)) + "s";
      el.style.animationDuration = dur + (i * 8) + "s";
    });
  }

  global.WaypointEffectRegistry.register({
    id: "cloudDrift",
    name: "Cloud Drift",
    description: "Soft clouds sliding overhead",
    layer: "dom",
    zIndex: 15,
    defaults: { intensity: 45, speed: 30, opacity: 40, scale: 50, randomness: 35 },
    create: function () {
      return Base.createEffect({
        id: "cloudDrift",
        layer: "dom",
        zIndex: 15,
        defaults: { intensity: 45, speed: 30, opacity: 40, scale: 50, randomness: 35 },

        onEnable: function (inst, ctx) {
          if (!ctx.domRoot) return;
          if (!rootEl) {
            rootEl = document.createElement("div");
            rootEl.className = "fx-layer fx-clouds";
            rootEl.setAttribute("data-effect-layer", "cloudDrift");
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
