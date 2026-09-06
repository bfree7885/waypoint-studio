/**
 * Hackbot AI provider abstraction.
 * UI talks only to Hackbot.Provider — never to a specific backend.
 *
 * Planned implementations:
 *   MockProvider (current)
 *   ApiProvider (not implemented)
 *   LocalModelProvider (not implemented)
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});
  var current = null;

  function notImplemented(name) {
    return Promise.reject(new Error(name + " is not available in this Hackbot build."));
  }

  function normalizeImpl(impl) {
    impl = impl || {};
    return {
      id: impl.id || "unknown",
      chat: typeof impl.chat === "function" ? impl.chat.bind(impl) : function () {
        return notImplemented("chat");
      },
      evaluateLearnerResponse:
        typeof impl.evaluateLearnerResponse === "function"
          ? impl.evaluateLearnerResponse.bind(impl)
          : function () {
              return notImplemented("evaluateLearnerResponse");
            }
    };
  }

  Hackbot.Provider = {
    set: function (impl) {
      current = normalizeImpl(impl);
      return current;
    },
    get: function () {
      if (!current) {
        throw new Error("No AI provider registered.");
      }
      return current;
    },
    chat: function (context) {
      return this.get().chat(context || {});
    },
    evaluateLearnerResponse: function (context) {
      return this.get().evaluateLearnerResponse(context || {});
    }
  };
})(window);
