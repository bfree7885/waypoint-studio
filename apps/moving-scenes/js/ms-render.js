/**
 * Waypoint Moving Scenes — localized Canvas motion renderer
 * NEVER whole-image Ken Burns. Displacement only inside motion masks.
 * Seamless loop via sinusoidal phase over durationSec (default 6s).
 */
(function (global) {
  "use strict";

  function Models() {
    return global.WaypointMovingScenesModels;
  }
  function Analyze() {
    return global.WaypointMovingScenesAnalyze;
  }

  function strengthScale(id) {
    var list = Models().STRENGTHS;
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i].scale;
    }
    return 1;
  }

  function loadImage(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Could not decode photograph."));
      };
      img.src = url;
    });
  }

  function fitSize(iw, ih, maxEdge) {
    var scale = Math.min(1, maxEdge / Math.max(iw, ih));
    return {
      w: Math.max(2, Math.round(iw * scale)),
      h: Math.max(2, Math.round(ih * scale))
    };
  }

  function buildMotionField(analysis, choice, userMask, tw, th) {
    var A = Analyze();
    var masks = analysis.masks;
    var sw = masks.width;
    var sh = masks.height;
    var classes = (choice && choice.classes) || [];
    var field = new Float32Array(tw * th * 3); // dxScale, dyScale, amp
    var clouds = A.resizeMask(masks.clouds, sw, sh, tw, th);
    var water = A.resizeMask(masks.water, sw, sh, tw, th);
    var fog = A.resizeMask(masks.fog, sw, sh, tw, th);
    var haze = A.resizeMask(masks.haze, sw, sh, tw, th);
    var wildlife = A.resizeMask(masks.wildlife, sw, sh, tw, th);
    var stable = A.resizeMask(masks.stable, sw, sh, tw, th);
    var assist = normalizeAssistMask(userMask, tw, th);
    var i;
    var x;
    var y;
    var hasClouds = classes.indexOf("clouds") >= 0;
    var hasWater = classes.indexOf("water") >= 0;
    var hasFog = classes.indexOf("fog") >= 0 || classes.indexOf("haze") >= 0;

    for (y = 0; y < th; y++) {
      for (x = 0; x < tw; x++) {
        i = y * tw + x;
        var lock = Math.max(wildlife[i], stable[i] * 0.9);
        var amp = 0;
        var dx = 0;
        var dy = 0;
        if (hasClouds) {
          var c = clouds[i] * (1 - lock);
          amp = Math.max(amp, c);
          dx += c * 1;
          dy += c * 0.08;
        }
        if (hasWater) {
          var wv = water[i] * (1 - Math.max(wildlife[i], stable[i] * 0.25));
          amp = Math.max(amp, wv * 0.9);
          dx += wv * 0.15;
          dy += wv * 0.55;
        }
        if (hasFog) {
          var fv = Math.max(fog[i], haze[i]) * (1 - wildlife[i]);
          amp = Math.max(amp, fv * 0.7);
          dx += fv * 0.35;
          dy += fv * 0.12;
        }
        if (assist) {
          var a = assist[i] || 0;
          if (a > 0) {
            amp = Math.max(amp, a);
            dx += a * 0.6;
            dy += a * 0.2;
          } else if (a < 0) {
            // erase
            amp *= 1 + a; // a in [-1,0]
          }
        }
        if (amp < 0.04) {
          amp = 0;
          dx = 0;
          dy = 0;
        }
        field[i * 3] = dx;
        field[i * 3 + 1] = dy;
        field[i * 3 + 2] = clamp(amp, 0, 1);
      }
    }
    return field;
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function maskHasInclude(userMask) {
    var data = userMask && userMask.data ? userMask.data : userMask;
    if (!data || !data.length) return false;
    var i;
    for (i = 0; i < data.length; i++) {
      if (data[i] > 0.04) return true;
    }
    return false;
  }

  function normalizeAssistMask(userMask, tw, th) {
    if (!userMask) return null;
    var data = userMask.data || userMask;
    var sw = userMask.width;
    var sh = userMask.height;
    if (sw > 0 && sh > 0 && data) {
      if (sw === tw && sh === th) return data;
      return Analyze().resizeMask(data, sw, sh, tw, th);
    }
    if (data && data.length === tw * th) return data;
    return null;
  }

  function resolveMotionField(analysis, choice, userMask, tw, th) {
    if (choice && choice.noMotion && !maskHasInclude(userMask)) return null;
    return buildMotionField(analysis, choice, userMask, tw, th);
  }

  /**
   * Create a live renderer bound to a canvas.
   */
  function createRenderer(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d", { alpha: false });
    var state = {
      source: null,
      srcCanvas: null,
      srcCtx: null,
      srcData: null,
      field: null,
      w: 0,
      h: 0,
      durationSec: Models().DEFAULT_DURATION_SEC,
      strength: "natural",
      directionDeg: null,
      playing: false,
      raf: 0,
      startTs: 0,
      preview: !!opts.preview,
      onFrame: opts.onFrame || null
    };

    function disposeSource() {
      state.source = null;
      state.srcCanvas = null;
      state.srcCtx = null;
      state.srcData = null;
      state.field = null;
    }

    function prepare(img, analysis, choice, userMask) {
      var maxEdge = state.preview ? Models().PREVIEW_MAX : Models().FINAL_MAX;
      var iw = img.naturalWidth || img.width;
      var ih = img.naturalHeight || img.height;
      var size = fitSize(iw, ih, maxEdge);
      state.w = size.w;
      state.h = size.h;
      canvas.width = size.w;
      canvas.height = size.h;

      var off = document.createElement("canvas");
      off.width = size.w;
      off.height = size.h;
      var octx = off.getContext("2d", { willReadFrequently: true });
      octx.drawImage(img, 0, 0, size.w, size.h);
      state.srcCanvas = off;
      state.srcCtx = octx;
      state.srcData = octx.getImageData(0, 0, size.w, size.h);
      state.source = img;
      state.durationSec = (choice && choice.durationSec) || Models().DEFAULT_DURATION_SEC;
      state.strength = (choice && choice.strength) || "natural";
      state.directionDeg = choice && choice.directionDeg != null ? choice.directionDeg : null;
      state.field = resolveMotionField(analysis, choice, userMask, size.w, size.h);
      // draw still first frame
      ctx.putImageData(state.srcData, 0, 0);
    }

    function sample(sx, sy) {
      var w = state.w;
      var h = state.h;
      var x0 = Math.floor(sx);
      var y0 = Math.floor(sy);
      var x1 = Math.min(w - 1, x0 + 1);
      var y1 = Math.min(h - 1, y0 + 1);
      var fx = sx - x0;
      var fy = sy - y0;
      x0 = clamp(x0, 0, w - 1);
      y0 = clamp(y0, 0, h - 1);
      var data = state.srcData.data;
      function pix(x, y) {
        var i = (y * w + x) * 4;
        return [data[i], data[i + 1], data[i + 2]];
      }
      var p00 = pix(x0, y0);
      var p10 = pix(x1, y0);
      var p01 = pix(x0, y1);
      var p11 = pix(x1, y1);
      return [
        p00[0] * (1 - fx) * (1 - fy) + p10[0] * fx * (1 - fy) + p01[0] * (1 - fx) * fy + p11[0] * fx * fy,
        p00[1] * (1 - fx) * (1 - fy) + p10[1] * fx * (1 - fy) + p01[1] * (1 - fx) * fy + p11[1] * fx * fy,
        p00[2] * (1 - fx) * (1 - fy) + p10[2] * fx * (1 - fy) + p01[2] * (1 - fx) * fy + p11[2] * fx * fy
      ];
    }

    function renderAt(phase) {
      if (!state.srcData) return;
      if (!state.field) {
        ctx.putImageData(state.srcData, 0, 0);
        return;
      }
      var w = state.w;
      var h = state.h;
      var out = ctx.createImageData(w, h);
      var od = out.data;
      var field = state.field;
      var scale = strengthScale(state.strength);
      // max displacement in pixels — restrained
      var maxPx = Math.max(2, Math.min(w, h) * 0.012) * scale;
      var dir = state.directionDeg;
      var cos = dir == null ? 1 : Math.cos((dir * Math.PI) / 180);
      var sin = dir == null ? 0 : Math.sin((dir * Math.PI) / 180);
      // seamless: sin(2π phase) and cos for secondary ripple
      var wave = Math.sin(phase * Math.PI * 2);
      var wave2 = Math.sin(phase * Math.PI * 2 + 1.7);
      var x;
      var y;
      var i;
      // Step every pixel for final; for preview can skip — keep full for quality
      for (y = 0; y < h; y++) {
        for (x = 0; x < w; x++) {
          i = y * w + x;
          var amp = field[i * 3 + 2];
          var sx = x;
          var sy = y;
          if (amp > 0.02) {
            var fdx = field[i * 3];
            var fdy = field[i * 3 + 1];
            var mx;
            var my;
            if (dir == null) {
              mx = fdx * wave + fdy * 0.25 * wave2;
              my = fdy * wave + fdx * 0.12 * wave2;
            } else {
              var mag = Math.sqrt(fdx * fdx + fdy * fdy) || 1;
              mx = cos * mag * wave;
              my = sin * mag * wave;
            }
            sx = x + mx * maxPx * amp;
            sy = y + my * maxPx * amp;
            // fog: slight brightness breathe without inventing weather particles
            // (applied after sample)
          }
          var rgb = sample(sx, sy);
          var o = i * 4;
          var breathe = 1;
          if (amp > 0.05 && Math.abs(field[i * 3]) < 0.4 && Math.abs(field[i * 3 + 1]) < 0.25) {
            // fog/haze-ish: gentle luma pulse ±1.2%
            breathe = 1 + 0.012 * wave * amp;
          }
          od[o] = clamp(rgb[0] * breathe, 0, 255);
          od[o + 1] = clamp(rgb[1] * breathe, 0, 255);
          od[o + 2] = clamp(rgb[2] * breathe, 0, 255);
          od[o + 3] = 255;
        }
      }
      ctx.putImageData(out, 0, 0);
      if (state.onFrame) state.onFrame(phase);
    }

    function tick(ts) {
      if (!state.playing) return;
      if (!state.startTs) state.startTs = ts;
      var elapsed = (ts - state.startTs) / 1000;
      var phase = (elapsed % state.durationSec) / state.durationSec;
      renderAt(phase);
      state.raf = global.requestAnimationFrame(tick);
    }

    function play() {
      if (state.playing) return;
      state.playing = true;
      state.startTs = 0;
      state.raf = global.requestAnimationFrame(tick);
    }

    function pause() {
      state.playing = false;
      if (state.raf) {
        global.cancelAnimationFrame(state.raf);
        state.raf = 0;
      }
    }

    function stop() {
      pause();
      renderAt(0);
    }

    function destroy() {
      pause();
      disposeSource();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return {
      prepare: prepare,
      renderAt: renderAt,
      play: play,
      pause: pause,
      stop: stop,
      destroy: destroy,
      isPlaying: function () { return state.playing; },
      getCanvas: function () { return canvas; },
      getSize: function () { return { w: state.w, h: state.h }; },
      setStrength: function (id) { state.strength = id; },
      setDirection: function (deg) { state.directionDeg = deg; },
      setDuration: function (sec) { state.durationSec = sec; },
      setPreview: function (v) { state.preview = !!v; }
    };
  }

  global.WaypointMovingScenesRender = {
    loadImage: loadImage,
    createRenderer: createRenderer,
    buildMotionField: buildMotionField,
    resolveMotionField: resolveMotionField,
    maskHasInclude: maskHasInclude,
    fitSize: fitSize,
    strengthScale: strengthScale
  };
})(typeof window !== "undefined" ? window : globalThis);
