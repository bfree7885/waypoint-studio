(function (global) {
  "use strict";

  var Base = global.WaypointEffectBase;

  global.WaypointEffectRegistry.register({
    id: "fireflies",
    name: "Fireflies",
    description: "Evening fireflies",
    layer: "canvas",
    zIndex: 40,
    defaults: { intensity: 45, speed: 30, opacity: 55, scale: 50, randomness: 50 },
    create: function () {
      return Base.createEffect({
        id: "fireflies",
        layer: "canvas",
        zIndex: 40,
        defaults: { intensity: 45, speed: 30, opacity: 55, scale: 50, randomness: 50 },

        reseed: function (inst, ctx) {
          var p = Base.resolveParams(inst.getParams());
          var count = p.count(5, 28);
          var flies = [];
          var i;
          for (i = 0; i < count; i++) {
            flies.push({
              x: Math.random() * ctx.width,
              y: Math.random() * ctx.height,
              phase: Math.random() * Math.PI * 2,
              radius: (1 + Math.random() * 2) * p.sizeMul,
              vx: p.rand(0.25),
              vy: p.rand(0.2),
              blinkRate: 0.02 + Math.random() * 0.04 * p.jitter
            });
          }
          return flies;
        },

        onUpdate: function (inst, ctx, particles) {
          if (!particles) return particles;
          var p = Base.resolveParams(inst.getParams());
          var drift = 0.08 * p.speedMul;

          particles.forEach(function (f) {
            f.phase += 0.0015 * p.speedMul;
            f.x += f.vx + Math.sin(ctx.frame * 0.018 + f.phase) * drift;
            f.y += f.vy + Math.cos(ctx.frame * 0.016 + f.phase) * drift * 0.85;
            f.vx += Math.sin(ctx.frame * 0.01 + f.phase) * 0.002 * p.jitter;
            f.vy += Math.cos(ctx.frame * 0.012 + f.phase) * 0.0015 * p.jitter;
            f.vx *= 0.98;
            f.vy *= 0.98;
            if (f.x < -6) f.x = ctx.width + 6;
            if (f.x > ctx.width + 6) f.x = -6;
            if (f.y < -6) f.y = ctx.height + 6;
            if (f.y > ctx.height + 6) f.y = -6;
          });
          return particles;
        },

        onRender: function (inst, ctx, particles) {
          if (!particles || !particles.length) return;
          var p = Base.resolveParams(inst.getParams());
          var ctx2 = ctx.ctx;

          particles.forEach(function (f) {
            var glow = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(ctx.frame * f.blinkRate * 60 + f.phase));
            var alpha = glow * p.alpha(0.12, 0.75);
            ctx2.beginPath();
            ctx2.arc(f.x, f.y, f.radius * 2.2, 0, Math.PI * 2);
            ctx2.fillStyle = "rgba(200, 230, 140, " + alpha * 0.22 + ")";
            ctx2.fill();
            ctx2.beginPath();
            ctx2.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
            ctx2.fillStyle = "rgba(220, 245, 160, " + alpha + ")";
            ctx2.fill();
          });
        }
      });
    }
  });
})(window);
