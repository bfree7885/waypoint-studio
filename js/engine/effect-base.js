(function (global) {
  "use strict";

  /**
   * Shared helpers for all effect modules.
   * Studio params: intensity, speed, opacity, scale, randomness (each 0–100).
   */
  var Base = {
    PARAM_KEYS: ["intensity", "speed", "opacity", "scale", "randomness"],

    defaultParams: function (overrides) {
      var base = {
        intensity: 50,
        speed: 50,
        opacity: 55,
        scale: 50,
        randomness: 35
      };
      var key;
      if (overrides) {
        for (key in overrides) {
          if (Object.prototype.hasOwnProperty.call(overrides, key)) {
            base[key] = overrides[key];
          }
        }
      }
      return base;
    },

    defaultCamera: function (overrides) {
      var base = {
        zoomAmount: 45,
        horizontalDrift: 40,
        verticalDrift: 30,
        rotation: 15
      };
      var key;
      if (overrides) {
        for (key in overrides) {
          if (Object.prototype.hasOwnProperty.call(overrides, key)) {
            base[key] = overrides[key];
          }
        }
      }
      return base;
    },

    clamp: function (n, min, max) {
      return Math.max(min, Math.min(max, n));
    },

    scale: function (value, min, max) {
      var t = Base.clamp(Number(value) || 0, 0, 100) / 100;
      return min + t * (max - min);
    },

    /** Resolved studio params for rendering. */
    resolveParams: function (params) {
      var p = params || Base.defaultParams();
      var jitter = Base.scale(p.randomness, 0, 1);
      return {
        intensity: p.intensity,
        speed: p.speed,
        opacity: p.opacity,
        scale: p.scale,
        randomness: p.randomness,
        count: function (min, max) {
          return Math.floor(Base.scale(p.intensity, min, max));
        },
        alpha: function (min, max) {
          return Base.scale(p.opacity, min, max);
        },
        sizeMul: Base.scale(p.scale, 0.45, 2.2),
        speedMul: Base.scale(p.speed, 0.25, 2.8),
        jitter: jitter,
        rand: function (spread) {
          return (Math.random() - 0.5) * 2 * spread * jitter;
        }
      };
    },

    createEffect: function (def) {
      var params = Base.defaultParams(def.defaults);
      var enabled = false;
      var particles = null;
      var RESEED_KEYS = ["intensity", "scale", "randomness"];

      var instance = {
        id: def.id,
        layer: def.layer || "canvas",
        zIndex: def.zIndex != null ? def.zIndex : 50,

        isEnabled: function () {
          return enabled;
        },

        getParams: function () {
          return {
            intensity: params.intensity,
            speed: params.speed,
            opacity: params.opacity,
            scale: params.scale,
            randomness: params.randomness
          };
        },

        setParam: function (key, value) {
          if (Base.PARAM_KEYS.indexOf(key) === -1) return;
          var next = Base.clamp(Number(value) || 0, 0, 100);
          if (params[key] === next) return;
          params[key] = next;
          if (RESEED_KEYS.indexOf(key) !== -1) particles = null;
          if (enabled && def.onParamsChange) def.onParamsChange(instance, instance._ctx);
        },

        setParams: function (next) {
          var key;
          if (!next) return;
          for (key in next) {
            if (Object.prototype.hasOwnProperty.call(next, key)) {
              instance.setParam(key, next[key]);
            }
          }
        },

        enable: function (ctx) {
          if (enabled) return;
          enabled = true;
          instance._ctx = ctx;
          if (def.onEnable) def.onEnable(instance, ctx);
        },

        disable: function (ctx) {
          if (!enabled) return;
          enabled = false;
          if (def.onDisable) def.onDisable(instance, ctx);
          instance._ctx = null;
          particles = null;
        },

        resize: function (ctx) {
          if (def.onResize) def.onResize(instance, ctx);
          if (enabled && def.reseed) {
            particles = def.reseed(instance, ctx);
          }
        },

        ensureParticles: function (ctx) {
          if (!enabled) return null;
          if (!particles && def.reseed) {
            particles = def.reseed(instance, ctx);
          }
          return particles;
        },

        getParticles: function () {
          return particles;
        },

        invalidateParticles: function () {
          particles = null;
        },

        update: function (ctx) {
          if (!enabled || !def.onUpdate) return;
          particles = def.onUpdate(instance, ctx, particles);
        },

        render: function (ctx) {
          if (!enabled || !def.onRender) return;
          def.onRender(instance, ctx, particles);
        },

        renderExport: function (ctx) {
          if (!enabled) return;
          if (def.onRenderExport) {
            def.onRenderExport(instance, ctx, particles);
          } else if (def.onRender) {
            def.onRender(instance, ctx, particles);
          }
        }
      };

      return instance;
    }
  };

  global.WaypointEffectBase = Base;
})(window);
