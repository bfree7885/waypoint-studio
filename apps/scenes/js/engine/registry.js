(function (global) {
  "use strict";

  var definitions = {};

  global.WaypointEffectRegistry = {
    register: function (definition) {
      if (!definition || !definition.id) {
        throw new Error("Effect definition requires an id");
      }
      definitions[definition.id] = definition;
    },

    get: function (id) {
      return definitions[id] || null;
    },

    getAll: function () {
      return Object.keys(definitions)
        .map(function (id) {
          return definitions[id];
        })
        .sort(function (a, b) {
          return (a.zIndex || 0) - (b.zIndex || 0);
        });
    },

    ids: function () {
      return Object.keys(definitions);
    },

    createInstance: function (id) {
      var def = definitions[id];
      if (!def || !def.create) return null;
      return def.create();
    }
  };
})(window);

/**
 * To add a new effect:
 * 1. Create js/engine/effects/your-effect.js
 * 2. Call WaypointEffectRegistry.register({ id, name, description, layer, zIndex, defaults, create })
 * 3. Add a <script> tag in index.html after effect-base.js and before runtime.js
 */
