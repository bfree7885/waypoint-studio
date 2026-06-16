(function (global) {
  "use strict";

  var Base = global.WaypointEffectBase;

  global.WaypointEffectRegistry.register({
    id: "rain",
    name: "Rain",
    description: "Rain on the lens",
    layer: "canvas",
    zIndex: 30,
    defaults: { intensity: 55, speed: 60, opacity: 55, scale: 45, randomness: 40 },
    create: function () {
      return Base.createEffect({
        id: "rain",
        layer: "canvas",
        zIndex: 30,
        defaults: { intensity: 55, speed: 60, opacity: 55, scale: 45, randomness: 40 },

        reseed: function (inst, ctx) {
          var p = Base.resolveParams(inst.getParams());
          var count = p.count(25, 140);
          var drops = [];
          var i;
          for (i = 0; i < count; i++) {
            drops.push({
              x: Math.random() * ctx.width,
              y: Math.random() * ctx.height,
              len: (6 + Math.random() * 14) * p.sizeMul * (0.75 + Math.random() * 0.5),
              speed: (2 + Math.random() * 7 * p.speedMul) * (0.8 + Math.random() * 0.4),
              skew: p.rand(0.8)
            });
          }
          return drops;
        },

        onUpdate: function (inst, ctx, particles) {
          if (!particles || !particles.length) return particles;
          var p = Base.resolveParams(inst.getParams());

          particles.forEach(function (d) {
            d.x += (-0.3 + d.skew) * p.speedMul * (0.85 + Math.sin(ctx.frame * 0.02 + d.y * 0.01) * 0.15);
            d.y += d.speed * (0.92 + Math.sin(ctx.frame * 0.03 + d.x * 0.008) * 0.12);
            if (d.y > ctx.height + 20 || d.x < -20 || d.x > ctx.width + 20) {
              d.y = -10;
              d.x = Math.random() * ctx.width;
            }
          });
          return particles;
        },

        onRender: function (inst, ctx, particles) {
          if (!particles || !particles.length) return;
          var p = Base.resolveParams(inst.getParams());
          var alpha = p.alpha(0.06, 0.38);
          var ctx2 = ctx.ctx;

          ctx2.strokeStyle = "rgba(180, 200, 220, " + alpha + ")";
          ctx2.lineWidth = Math.max(0.5, p.sizeMul * 0.6);
          particles.forEach(function (d) {
            ctx2.beginPath();
            ctx2.moveTo(d.x, d.y);
            ctx2.lineTo(d.x - 1.2 + d.skew, d.y + d.len);
            ctx2.stroke();
          });
        }
      });
    }
  });
})(window);
