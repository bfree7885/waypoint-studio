(function (global) {
  "use strict";

  var Base = global.WaypointEffectBase;

  global.WaypointEffectRegistry.register({
    id: "dustParticles",
    name: "Dust Particles",
    description: "Floating dust motes in light",
    layer: "canvas",
    zIndex: 25,
    defaults: { intensity: 45, speed: 20, opacity: 40, scale: 45, randomness: 55 },
    create: function () {
      return Base.createEffect({
        id: "dustParticles",
        layer: "canvas",
        zIndex: 25,
        defaults: { intensity: 45, speed: 20, opacity: 40, scale: 45, randomness: 55 },

        reseed: function (inst, ctx) {
          var p = Base.resolveParams(inst.getParams());
          var count = p.count(15, 85);
          var motes = [];
          var i;
          for (i = 0; i < count; i++) {
            motes.push({
              x: Math.random() * ctx.width,
              y: Math.random() * ctx.height,
              r: (0.4 + Math.random() * 1.2) * p.sizeMul,
              phase: Math.random() * Math.PI * 2,
              speed: (0.08 + Math.random() * 0.45) * p.speedMul,
              drift: p.rand(0.35)
            });
          }
          return motes;
        },

        onUpdate: function (inst, ctx, particles) {
          if (!particles) return particles;
          var p = Base.resolveParams(inst.getParams());

          particles.forEach(function (m) {
            m.x += m.drift + Math.sin(ctx.frame * 0.008 + m.phase) * 0.08 * p.jitter;
            m.y += m.speed + Math.cos(ctx.frame * 0.01 + m.phase) * 0.06 * p.jitter;
            if (m.x < 0) m.x = ctx.width;
            if (m.x > ctx.width) m.x = 0;
            if (m.y < 0) m.y = ctx.height;
            if (m.y > ctx.height) m.y = 0;
          });
          return particles;
        },

        onRender: function (inst, ctx, particles) {
          if (!particles || !particles.length) return;
          var p = Base.resolveParams(inst.getParams());
          var alpha = p.alpha(0.08, 0.42);
          var ctx2 = ctx.ctx;

          particles.forEach(function (m) {
            var twinkle = 0.6 + 0.4 * Math.sin(ctx.frame * 0.02 + m.phase);
            ctx2.beginPath();
            ctx2.arc(m.x, m.y, m.r, 0, Math.PI * 2);
            ctx2.fillStyle = "rgba(255, 248, 230, " + alpha * twinkle + ")";
            ctx2.fill();
          });
        }
      });
    }
  });
})(window);
