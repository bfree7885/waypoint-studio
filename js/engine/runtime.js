(function (global) {
  "use strict";

  var Registry = global.WaypointEffectRegistry;
  var Base = global.WaypointEffectBase;

  var runtime = {
    raf: null,
    frame: 0,
    width: 0,
    height: 0,
    dpr: 1,
    stage: null,
    domRoot: null,
    canvas: null,
    ctx: null,
    bgInner: null,
    bgMotion: null,
    camera: Base.defaultCamera(),
    instances: {},
    lastConfig: null
  };

  function buildContext() {
    return {
      width: runtime.width,
      height: runtime.height,
      dpr: runtime.dpr,
      stage: runtime.stage,
      domRoot: runtime.domRoot,
      canvas: runtime.canvas,
      ctx: runtime.ctx,
      frame: runtime.frame
    };
  }

  function ensureInstances() {
    Registry.getAll().forEach(function (def) {
      if (!runtime.instances[def.id]) {
        runtime.instances[def.id] = Registry.createInstance(def.id);
      }
    });
  }

  function resizeCanvas(canvas, stage) {
    if (!canvas || !stage) return null;
    var rect = stage.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    var ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: rect.width, height: rect.height, dpr: dpr };
  }

  function applyCamera(cameraState) {
    var cam = Object.assign({}, Base.defaultCamera(), cameraState || {});
    var inner = runtime.bgInner;
    if (!inner) return;

    var zoomAmt = Base.scale(cam.zoomAmount || 0, 0, 0.14);
    var driftX = Base.scale(cam.horizontalDrift || 0, 0, 2.8);
    var driftY = Base.scale(cam.verticalDrift || 0, 0, 2);
    var rot = Base.scale(cam.rotation || 0, 0, 1.4);
    var active =
      (cam.zoomAmount || 0) > 0 ||
      (cam.horizontalDrift || 0) > 0 ||
      (cam.verticalDrift || 0) > 0 ||
      (cam.rotation || 0) > 0;

    inner.classList.toggle("is-camera-motion", active);
    inner.style.setProperty("--cam-zoom-min", String(1 + zoomAmt * 0.2));
    inner.style.setProperty("--cam-zoom-max", String(1 + zoomAmt));
    inner.style.setProperty("--cam-drift-x", driftX.toFixed(2) + "%");
    inner.style.setProperty("--cam-drift-y", driftY.toFixed(2) + "%");
    inner.style.setProperty("--cam-rot", rot.toFixed(2) + "deg");
    inner.style.setProperty(
      "--cam-duration",
      String(Math.max(48, 140 - (cam.horizontalDrift || 0) * 0.35)) + "s"
    );
  }

  function syncEffectState(effectState) {
    ensureInstances();
    var ctx = buildContext();
    var id;

    Registry.ids().forEach(function (id) {
      var inst = runtime.instances[id];
      var state = effectState[id] || {};
      var wasEnabled = inst.isEnabled();
      var shouldEnable = !!state.enabled;

      inst.setParams({
        intensity: state.intensity != null ? state.intensity : inst.getParams().intensity,
        speed: state.speed != null ? state.speed : inst.getParams().speed,
        opacity: state.opacity != null ? state.opacity : inst.getParams().opacity,
        scale: state.scale != null ? state.scale : inst.getParams().scale,
        randomness: state.randomness != null ? state.randomness : inst.getParams().randomness
      });

      if (shouldEnable && !wasEnabled) inst.enable(ctx);
      if (!shouldEnable && wasEnabled) inst.disable(ctx);
      if (shouldEnable && wasEnabled && inst.layer === "dom") {
        var def = Registry.get(id);
        if (inst.setParams) {
          /* DOM layers re-sync via registry hooks on param change */
        }
      }
    });

    /* Re-sync enabled DOM layers after state push */
    Registry.getAll().forEach(function (def) {
      var inst = runtime.instances[def.id];
      if (inst && inst.isEnabled() && inst.layer === "dom") {
        inst.resize(ctx);
      }
    });
  }

  function needsCanvasLoop() {
    return Registry.getAll().some(function (def) {
      var inst = runtime.instances[def.id];
      return inst && inst.isEnabled() && inst.layer === "canvas";
    });
  }

  function tick() {
    var ctx = buildContext();
    var anyCanvas = false;

    runtime.frame++;
    if (runtime.ctx) {
      runtime.ctx.clearRect(0, 0, runtime.width, runtime.height);
    }

    Registry.getAll().forEach(function (def) {
      var inst = runtime.instances[def.id];
      if (!inst || !inst.isEnabled() || inst.layer !== "canvas") return;
      anyCanvas = true;
      inst.ensureParticles(ctx);
      inst.update(ctx);
      inst.render(ctx);
    });

    if (anyCanvas) {
      runtime.raf = requestAnimationFrame(tick);
    } else {
      runtime.raf = null;
    }
  }

  function startLoop() {
    if (runtime.raf) return;
    if (!needsCanvasLoop()) return;
    runtime.raf = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (runtime.raf) {
      cancelAnimationFrame(runtime.raf);
      runtime.raf = null;
    }
  }

  function apply(config) {
    runtime.lastConfig = config;
    runtime.stage = config.stage;
    runtime.domRoot = config.domRoot;
    runtime.canvas = config.canvas;
    runtime.bgInner = config.bgInner;
    runtime.bgMotion = config.bgMotion;
    runtime.camera = Object.assign({}, Base.defaultCamera(), config.camera || {});

    var sizeChanged = false;
    if (config.canvas && config.stage) {
      var dims = resizeCanvas(config.canvas, config.stage);
      if (dims) {
        sizeChanged =
          dims.width !== runtime.width ||
          dims.height !== runtime.height ||
          dims.dpr !== runtime.dpr;
        runtime.width = dims.width;
        runtime.height = dims.height;
        runtime.dpr = dims.dpr;
        runtime.ctx = config.canvas.getContext("2d");
      }
    }

    applyCamera(runtime.camera);

    var effectState = config.effectState || {};
    if (sizeChanged) {
      ensureInstances();
      Registry.ids().forEach(function (id) {
        runtime.instances[id].invalidateParticles();
      });
    }

    syncEffectState(effectState);

    var ctx = buildContext();
    Registry.getAll().forEach(function (def) {
      var inst = runtime.instances[def.id];
      if (inst) inst.resize(ctx);
    });

    var canvasActive = needsCanvasLoop();
    if (config.canvas) {
      config.canvas.hidden = !canvasActive;
    }

    if (canvasActive) {
      startLoop();
    } else {
      stopLoop();
      if (runtime.ctx) {
        runtime.ctx.clearRect(0, 0, runtime.width, runtime.height);
      }
    }
  }

  function stopAll() {
    stopLoop();
    var ctx = buildContext();
    Registry.ids().forEach(function (id) {
      var inst = runtime.instances[id];
      if (inst && inst.isEnabled()) inst.disable(ctx);
    });
    runtime.frame = 0;
  }

  function coverDimensions(iw, ih, tw, th) {
    var ir = iw / ih;
    var tr = tw / th;
    var dw, dh;
    if (ir > tr) {
      dh = th;
      dw = dh * ir;
    } else {
      dw = tw;
      dh = dw / ir;
    }
    return { dw: dw, dh: dh };
  }

  function bgMotionScale() {
    var zoomAmt = Base.scale(runtime.camera.zoomAmount || 0, 0, 0.14);
    return 1.04 + zoomAmt;
  }

  function captureFrame(config) {
    var stage = config.stage;
    var exportCanvas = config.exportCanvas;
    if (!stage || !exportCanvas) return null;

    apply(config);

    var rect = stage.getBoundingClientRect();
    var w = Math.min(1280, Math.floor(rect.width * 2));
    var h = Math.floor(w * (rect.height / rect.width));
    exportCanvas.width = w;
    exportCanvas.height = h;

    var ctx2 = exportCanvas.getContext("2d");
    if (!ctx2) return null;

    var img = config.sceneImg;
    if (img && img.src && img.naturalWidth) {
      var scale = bgMotionScale();
      var cover = coverDimensions(img.naturalWidth, img.naturalHeight, w * scale, h * scale);
      ctx2.drawImage(img, (w - cover.dw) / 2, (h - cover.dh) / 2, cover.dw, cover.dh);
    } else {
      ctx2.fillStyle = "#111";
      ctx2.fillRect(0, 0, w, h);
    }

    var exportCtx = {
      width: w,
      height: h,
      dpr: 1,
      ctx: ctx2,
      frame: runtime.frame
    };

    Registry.getAll().forEach(function (def) {
      var inst = runtime.instances[def.id];
      if (!inst || !inst.isEnabled()) return;
      if (inst.layer === "canvas") {
        inst.ensureParticles(exportCtx);
        inst.renderExport(exportCtx);
      } else if (def.id === "fog") {
        var p = Base.resolveParams(inst.getParams());
        var alpha = p.alpha(0.06, 0.2);
        var grad = ctx2.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, "rgba(220,230,240,0)");
        grad.addColorStop(0.5, "rgba(220,230,240," + alpha + ")");
        grad.addColorStop(1, "rgba(220,230,240,0)");
        ctx2.fillStyle = grad;
        ctx2.fillRect(0, 0, w, h);
      }
    });

    if (config.canvas && !config.canvas.hidden) {
      ctx2.drawImage(config.canvas, 0, 0, w, h);
    }

    return exportCanvas;
  }

  function onResize(config, getState) {
    return function () {
      if (config.stage && config.stage.offsetParent !== null) {
        apply(getState());
      }
    };
  }

  function getDefaultStateForId(id) {
    var def = Registry.get(id);
    if (!def) {
      return {
        enabled: false,
        intensity: 50,
        speed: 50,
        opacity: 55,
        scale: 50,
        randomness: 35
      };
    }
    var defaults = Base.defaultParams(def.defaults);
    return {
      enabled: false,
      intensity: defaults.intensity,
      speed: defaults.speed,
      opacity: defaults.opacity,
      scale: defaults.scale,
      randomness: defaults.randomness
    };
  }

  function getDefaultCamera() {
    return Base.defaultCamera();
  }

  global.WaypointEngine = {
    apply: apply,
    stopAll: stopAll,
    captureFrame: captureFrame,
    onResize: onResize,
    getDefaultStateForId: getDefaultStateForId,
    getDefaultCamera: getDefaultCamera,
    getRegistry: function () {
      return Registry;
    }
  };
})(window);
