(function (global) {
  "use strict";

  var Base = global.WaypointEffectBase;

  function drawLeaf(ctx2, x, y, size, rotation, alpha) {
    ctx2.save();
    ctx2.translate(x, y);
    ctx2.rotate(rotation);
    ctx2.fillStyle = "rgba(160, 120, 70, " + alpha + ")";
    ctx2.beginPath();
    ctx2.ellipse(0, 0, size * 1.4, size * 0.55, 0, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.strokeStyle = "rgba(120, 85, 45, " + alpha * 0.8 + ")";
    ctx2.lineWidth = 0.6;
    ctx2.beginPath();
    ctx2.moveTo(-size * 1.2, 0);
    ctx2.lineTo(size * 1.2, 0);
    ctx2.stroke();
    ctx2.restore();
  }

  global.WaypointEffectRegistry.register({
    id: "leafDrift",
    name: "Leaf Drift",
    description: "Autumn leaves tumbling down",
    layer: "canvas",
    zIndex: 45,
    defaults: { intensity: 35, speed: 40, opacity: 50, scale: 50, randomness: 50 },
    create: function () {
      return Base.createEffect({
        id: "leafDrift",
        layer: "canvas",
        zIndex: 45,
        defaults: { intensity: 35, speed: 40, opacity: 50, scale: 50, randomness: 50 },

        reseed: function (inst, ctx) {
          var p = Base.resolveParams(inst.getParams());
          var count = p.count(4, 38);
          var leaves = [];
          var i;
          for (i = 0; i < count; i++) {
            leaves.push({
              x: Math.random() * ctx.width,
              y: Math.random() * ctx.height,
              size: (2 + Math.random() * 4) * p.sizeMul,
              rot: Math.random() * Math.PI * 2,
              rotSpeed: p.rand(0.05),
              speed: (0.4 + Math.random() * 2) * p.speedMul,
              sway: Math.random() * Math.PI * 2,
              drift: p.rand(0.5)
            });
          }
          return leaves;
        },

        onUpdate: function (inst, ctx, particles) {
          if (!particles) return particles;
          var p = Base.resolveParams(inst.getParams());

          particles.forEach(function (leaf) {
            leaf.x += leaf.drift + Math.sin(ctx.frame * 0.015 + leaf.sway) * 0.35 * p.jitter;
            leaf.y += leaf.speed;
            leaf.rot += leaf.rotSpeed;
            if (leaf.y > ctx.height + 12 || leaf.x < -20 || leaf.x > ctx.width + 20) {
              leaf.y = -10;
              leaf.x = Math.random() * ctx.width;
            }
          });
          return particles;
        },

        onRender: function (inst, ctx, particles) {
          if (!particles || !particles.length) return;
          var p = Base.resolveParams(inst.getParams());
          var alpha = p.alpha(0.2, 0.75);
          particles.forEach(function (leaf) {
            drawLeaf(ctx.ctx, leaf.x, leaf.y, leaf.size, leaf.rot, alpha);
          });
        }
      });
    }
  });
})(window);
