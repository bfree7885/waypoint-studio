(function (global) {
  "use strict";

  /**
   * Premium interactive parallax — eased motion, card tilt, drift, tilt + pointer fallback.
   */
  var LAYER_FACTORS = [0.32, 0.62, 1];

  var state = {
    running: false,
    raf: null,
    lastTime: 0,
    viewport: null,
    stage: null,
    layers: [],
    imageUrl: null,
    getSettings: null,

    pointerX: 0,
    pointerY: 0,
    tiltX: 0,
    tiltY: 0,
    driftX: 0,
    driftY: 0,
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    cardTiltX: 0,
    cardTiltY: 0,

    tiltGranted: false,
    tiltAvailable: false,
    tiltBaseline: null,
    usingTilt: false,
    lastOrientationTime: 0,

    handlers: {}
  };

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function scale(value, min, max) {
    return min + (clamp(Number(value) || 0, 0, 100) / 100) * (max - min);
  }

  function expSmooth(current, target, lambda, dt) {
    return current + (target - current) * (1 - Math.exp(-lambda * dt));
  }

  function getSettings() {
    return state.getSettings ? state.getSettings() : {};
  }

  function pointerActive() {
    var settings = getSettings();
    if (!settings.tiltEnabled || !state.tiltAvailable || !state.tiltGranted) return true;
    var orientationFresh = performance.now() - state.lastOrientationTime < 600;
    return !orientationFresh;
  }

  function updateTarget(now) {
    var settings = getSettings();
    var sensitivity = scale(settings.sensitivity, 0.18, 0.95);
    var inputX = 0;
    var inputY = 0;
    var orientationFresh = now - state.lastOrientationTime < 600;

    if (settings.tiltEnabled && state.tiltAvailable && state.tiltGranted && orientationFresh) {
      state.usingTilt = true;
      inputX = state.tiltX * sensitivity;
      inputY = state.tiltY * sensitivity;
    } else {
      state.usingTilt = false;
      inputX = state.pointerX * sensitivity;
      inputY = state.pointerY * sensitivity;
    }

    if (settings.autoDrift) {
      state.driftX += (state.driftTargetX - state.driftX) * 0.015;
      state.driftY += (state.driftTargetY - state.driftY) * 0.015;
      inputX += state.driftX;
      inputY += state.driftY;
    } else {
      state.driftX = expSmooth(state.driftX, 0, 4, 0.016);
      state.driftY = expSmooth(state.driftY, 0, 4, 0.016);
    }

    state.targetX = clamp(inputX, -0.42, 0.42);
    state.targetY = clamp(inputY, -0.42, 0.42);
  }

  function updateDriftTargets(now) {
    var t = now * 0.001;
    state.driftTargetX = Math.sin(t * 0.11) * 0.07 + Math.sin(t * 0.06 + 1.4) * 0.035;
    state.driftTargetY = Math.cos(t * 0.085) * 0.055 + Math.sin(t * 0.048 + 0.6) * 0.028;
  }

  function applyTransforms() {
    if (!state.layers.length) return;
    var settings = getSettings();
    var strength = scale(settings.strength, 0.6, 3.2);
    var zoom = scale(settings.zoom, 1.04, 1.16);
    var depth = scale(settings.depthStrength, 0.35, 1.45);

    var tx = state.currentX * strength;
    var ty = state.currentY * strength;

    state.layers.forEach(function (layer, i) {
      var factor = LAYER_FACTORS[i] * depth;
      var el = layer.el;
      if (!el) return;
      el.style.setProperty("--px-zoom", zoom.toFixed(4));
      el.style.transform =
        "scale(var(--px-zoom)) translate3d(" +
        (tx * factor).toFixed(3) + "%, " +
        (ty * factor).toFixed(3) + "%, 0)";
    });

    if (state.stage) {
      var cardY = state.cardTiltY * 3.2;
      var cardX = state.cardTiltX * 3.8;
      state.stage.style.transform =
        "rotateX(" + (-cardY).toFixed(3) + "deg) rotateY(" + cardX.toFixed(3) + "deg)";
    }
  }

  function tick(now) {
    if (!state.running) return;

    var dt = state.lastTime ? Math.min((now - state.lastTime) / 1000, 0.05) : 0.016;
    state.lastTime = now;

    var settings = getSettings();
    if (settings.autoDrift) updateDriftTargets(now);
    updateTarget(now);

    var smooth = getSettings().smoothing;
    var lambda = scale(smooth, 5.5, 16);
    state.currentX = expSmooth(state.currentX, state.targetX, lambda, dt);
    state.currentY = expSmooth(state.currentY, state.targetY, lambda, dt);

    var cardLambda = lambda * 0.85;
    state.cardTiltX = expSmooth(state.cardTiltX, state.currentX, cardLambda, dt);
    state.cardTiltY = expSmooth(state.cardTiltY, state.currentY, cardLambda, dt);

    applyTransforms();
    state.raf = requestAnimationFrame(tick);
  }

  function setPointerNorm(nx, ny) {
    state.pointerX = clamp(nx, -0.5, 0.5);
    state.pointerY = clamp(ny, -0.5, 0.5);
  }

  function pointerFromClient(clientX, clientY) {
    if (!state.viewport) return;
    var rect = state.viewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setPointerNorm(
      (clientX - rect.left) / rect.width - 0.5,
      (clientY - rect.top) / rect.height - 0.5
    );
  }

  function bindPointer() {
    if (!state.viewport) return;
    var vp = state.viewport;

    state.handlers.mousemove = function (e) {
      if (!pointerActive()) return;
      pointerFromClient(e.clientX, e.clientY);
    };

    state.handlers.mouseleave = function () {
      if (!pointerActive()) return;
      setPointerNorm(0, 0);
    };

    state.handlers.touchstart = function (e) {
      if (!pointerActive() || !e.touches.length) return;
      pointerFromClient(e.touches[0].clientX, e.touches[0].clientY);
    };

    state.handlers.touchmove = function (e) {
      if (!pointerActive() || !e.touches.length) return;
      pointerFromClient(e.touches[0].clientX, e.touches[0].clientY);
    };

    state.handlers.touchend = function () {
      if (!pointerActive()) return;
      setPointerNorm(0, 0);
    };

    vp.addEventListener("mousemove", state.handlers.mousemove);
    vp.addEventListener("mouseleave", state.handlers.mouseleave);
    vp.addEventListener("touchstart", state.handlers.touchstart, { passive: true });
    vp.addEventListener("touchmove", state.handlers.touchmove, { passive: true });
    vp.addEventListener("touchend", state.handlers.touchend);
    vp.addEventListener("touchcancel", state.handlers.touchend);

    state.handlers.orientation = function (e) {
      var settings = getSettings();
      if (!settings.tiltEnabled || !state.tiltGranted) return;
      if (e.gamma == null || e.beta == null) return;

      if (!state.tiltBaseline) {
        state.tiltBaseline = { beta: e.beta, gamma: e.gamma };
      }

      var dx = (e.gamma - state.tiltBaseline.gamma) / 38;
      var dy = (e.beta - state.tiltBaseline.beta) / 52;
      state.tiltX = clamp(dx, -0.5, 0.5);
      state.tiltY = clamp(dy, -0.5, 0.5);
      state.lastOrientationTime = performance.now();
    };

    state.tiltAvailable = typeof window.DeviceOrientationEvent !== "undefined";
    if (state.tiltAvailable) {
      window.addEventListener("deviceorientation", state.handlers.orientation);
    }
  }

  function unbindPointer() {
    if (!state.viewport) return;
    var vp = state.viewport;
    var h = state.handlers;
    if (h.mousemove) vp.removeEventListener("mousemove", h.mousemove);
    if (h.mouseleave) vp.removeEventListener("mouseleave", h.mouseleave);
    if (h.touchstart) vp.removeEventListener("touchstart", h.touchstart);
    if (h.touchmove) vp.removeEventListener("touchmove", h.touchmove);
    if (h.touchend) {
      vp.removeEventListener("touchend", h.touchend);
      vp.removeEventListener("touchcancel", h.touchend);
    }
    if (h.orientation) window.removeEventListener("deviceorientation", h.orientation);
  }

  function init(config) {
    state.viewport = config.viewport;
    state.stage = config.stage || null;
    state.layers = config.layers || [];
    state.getSettings = config.getSettings;
    state.driftTargetX = 0;
    state.driftTargetY = 0;
    bindPointer();
  }

  function requestTiltAccess() {
    return new Promise(function (resolve) {
      if (!state.tiltAvailable) {
        state.tiltGranted = false;
        resolve(false);
        return;
      }

      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission()
          .then(function (result) {
            state.tiltGranted = result === "granted";
            if (state.tiltGranted) state.tiltBaseline = null;
            resolve(state.tiltGranted);
          })
          .catch(function () {
            state.tiltGranted = false;
            resolve(false);
          });
      } else {
        state.tiltGranted = true;
        state.tiltBaseline = null;
        resolve(true);
      }
    });
  }

  function setTiltEnabled(enabled) {
    if (!enabled) {
      state.tiltBaseline = null;
      state.tiltX = 0;
      state.tiltY = 0;
      return Promise.resolve(false);
    }
    return requestTiltAccess();
  }

  function isTiltAvailable() {
    return state.tiltAvailable;
  }

  function isTiltActive() {
    return state.usingTilt;
  }

  function setImage(url) {
    state.imageUrl = url;
    state.layers.forEach(function (layer) {
      if (layer.img) {
        layer.img.src = url;
        layer.img.hidden = false;
      }
    });
  }

  function clearImage() {
    state.layers.forEach(function (layer) {
      if (layer.img) {
        layer.img.removeAttribute("src");
        layer.img.hidden = true;
      }
    });
    state.imageUrl = null;
    reset();
  }

  function start() {
    if (state.running) return;
    state.running = true;
    state.lastTime = 0;
    state.raf = requestAnimationFrame(tick);
  }

  function stop() {
    state.running = false;
    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = null;
    }
  }

  function reset() {
    state.pointerX = 0;
    state.pointerY = 0;
    state.tiltX = 0;
    state.tiltY = 0;
    state.driftX = 0;
    state.driftY = 0;
    state.targetX = 0;
    state.targetY = 0;
    state.currentX = 0;
    state.currentY = 0;
    state.cardTiltX = 0;
    state.cardTiltY = 0;
    state.tiltBaseline = null;
    applyTransforms();
  }

  function destroy() {
    stop();
    unbindPointer();
  }

  global.WaypointParallax = {
    init: init,
    setImage: setImage,
    clearImage: clearImage,
    start: start,
    stop: stop,
    reset: reset,
    destroy: destroy,
    requestTiltAccess: requestTiltAccess,
    setTiltEnabled: setTiltEnabled,
    isTiltAvailable: isTiltAvailable,
    isTiltActive: isTiltActive
  };
})(window);
