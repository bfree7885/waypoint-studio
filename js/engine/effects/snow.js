(function (global) {
  "use strict";

  var Base = global.WaypointEffectBase;

  global.WaypointEffectRegistry.register({
    id: "snow",
    name: "Snow",
    description: "Light snowfall with drift",
    layer: "canvas",
    zIndex: 35,
    defaults: { intensity: 50, speed: 35, opacity: 50, scale: 50, randomness: 45 },
    create: function () {
      return Base.createEffect({
        id: "snow",
        layer: "canvas",
        zIndex: 35,
        defaults: { intensity: 50, speed: 35, opacity: 50, scale: 50, randomness: 45 },

        reseed: function (inst, ctx) {
          var p = Base.resolveParams(inst.getParams());
          var count = p.count(20, 100);
          var flakes = [];
          var i;
          for (i = 0; i < count; i++) {
            flakes.push({
              x: Math.random() * ctx.width,
              y: Math.random() * ctx.height,
              r: (0.6 + Math.random() * 2.2) * p.sizeMul,
              speed: (0.3 + Math.random() * 1.4) * p.speedMul,
              wobble: Math.random() * Math.PI * 2,
              drift: p.rand(0.5)
            });
          }
          return flakes;
        },

        onUpdate: function (inst, ctx, particles) {
          if (!particles) return particles;
          var p = Base.resolveParams(inst.getParams());

          particles.forEach(function (f) {
            f.x += f.drift + Math.sin(f.y * 0.018 + f.wobble) * 0.15 * p.jitter;
            f.y += f.speed;
            if (f.y > ctx.height + 8 || f.x < -8 || f.x > ctx.width + 8) {
              f.y = -4;
              f.x = Math.random() * ctx.width;
            }
          });
          return particles;
        },

        onRender: function (inst, ctx, particles) {
          if (!particles || !particles.length) return;
          var p = Base.resolveParams(inst.getParams());
          var alpha = p.alpha(0.15, 0.65);
          var ctx2 = ctx.ctx;

          particles.forEach(function (f) {
            ctx2.beginPath();
            ctx2.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx2.fillStyle = "rgba(240, 245, 255, " + alpha + ")";
            ctx2.fill();
          });
        }
      });
    }
  });
})(window);
