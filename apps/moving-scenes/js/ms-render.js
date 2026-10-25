/**
 * Waypoint Moving Scenes — localized Canvas motion renderer
 * NEVER whole-image Ken Burns. Displacement only inside motion masks.
 *
 * Clouds (Fix 2): coherent advection + slow internal evolution + subtle
 * differential drift — atmospheric material through time, not UV-warped still.
 * Water / fog recipes frozen aside from shared field plumbing.
 * Seamless-friendly phase over durationSec (default 6s); natural > rubber loop.
 */
(function (global) {
  "use strict";

  var FIELD_STRIDE = 4;
  var MODE_NONE = 0;
  var MODE_CLOUD = 1;
  var MODE_WATER = 2;
  var MODE_FOG = 3;

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

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function hash2(ix, iy) {
    var n = ix * 374761393 + iy * 668265263;
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  function smoothNoise2(x, y) {
    var x0 = Math.floor(x);
    var y0 = Math.floor(y);
    var fx = x - x0;
    var fy = y - y0;
    var ux = fx * fx * (3 - 2 * fx);
    var uy = fy * fy * (3 - 2 * fy);
    var a = hash2(x0, y0);
    var b = hash2(x0 + 1, y0);
    var c = hash2(x0, y0 + 1);
    var d = hash2(x0 + 1, y0 + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  /** Looping low-frequency evolution in [-1, 1] — no high-freq shimmer. */
  function evolveNoise(x, y, phase, scale) {
    var s = scale || 1;
    var u = Math.cos(phase * Math.PI * 2);
    var v = Math.sin(phase * Math.PI * 2);
    var n =
      smoothNoise2(x * 0.018 * s + u * 1.35, y * 0.014 * s + v * 1.35) * 0.62 +
      smoothNoise2(x * 0.041 * s + u * 0.55 + 12.2, y * 0.033 * s + v * 0.55 + 7.1) * 0.38;
    return n * 2 - 1;
  }

  function cloudSeaLike(analysis) {
    var cov = (analysis && analysis.coverage) || {};
    var clouds = cov.clouds || 0;
    var sky = cov.sky || 0;
    var foliage = cov.foliage || 0;
    // Mid/lower soft vapor (cloud-sea) vs high open sky banks
    return clouds > 0.12 && sky < 0.42 && foliage < 0.12;
  }

  function buildMotionField(analysis, choice, userMask, tw, th) {
    var A = Analyze();
    var masks = analysis.masks;
    var sw = masks.width;
    var sh = masks.height;
    var classes = (choice && choice.classes) || [];
    var field = new Float32Array(tw * th * FIELD_STRIDE);
    var clouds = A.resizeMask(masks.clouds, sw, sh, tw, th);
    var water = A.resizeMask(masks.water, sw, sh, tw, th);
    var fog = A.resizeMask(masks.fog, sw, sh, tw, th);
    var haze = A.resizeMask(masks.haze, sw, sh, tw, th);
    var wildlife = A.resizeMask(masks.wildlife, sw, sh, tw, th);
    var stable = A.resizeMask(masks.stable, sw, sh, tw, th);
    var foliage = masks.foliage ? A.resizeMask(masks.foliage, sw, sh, tw, th) : null;
    var sky = masks.sky ? A.resizeMask(masks.sky, sw, sh, tw, th) : null;
    var assist = normalizeAssistMask(userMask, tw, th);
    var i;
    var x;
    var y;
    var hasClouds = classes.indexOf("clouds") >= 0;
    var hasWater = classes.indexOf("water") >= 0;
    var hasFog = classes.indexOf("fog") >= 0 || classes.indexOf("haze") >= 0;
    var seaLike = cloudSeaLike(analysis);
    // Dominant atmospheric wind (radians). Slight downward for perspective; cloud-sea flatter.
    var windAng = seaLike ? 0.04 : 0.11;
    var windCos = Math.cos(windAng);
    var windSin = Math.sin(windAng);

    for (y = 0; y < th; y++) {
      var ny = th > 1 ? y / (th - 1) : 0;
      for (x = 0; x < tw; x++) {
        i = y * tw + x;
        var nx = tw > 1 ? x / (tw - 1) : 0;
        var lock = Math.max(
          wildlife[i],
          stable[i] * 0.9,
          foliage ? foliage[i] * 0.88 : 0
        );
        var amp = 0;
        var dx = 0;
        var dy = 0;
        var mode = MODE_NONE;
        var best = 0;

        if (hasClouds) {
          var cRaw = clouds[i];
          // Clouds move through sky — do not slide clear / pale sky as a poster sheet
          if (sky && sky[i] > 0.55 && cRaw < 0.5) {
            cRaw *= 0.05;
          } else if (!seaLike && cRaw < 0.42) {
            cRaw *= 0.32;
          } else if (seaLike && cRaw < 0.28) {
            // Cloud-sea is soft vapor — keep weak material, only kill dust
            cRaw *= 0.55;
          }
          var c = cRaw * (1 - lock);
          // When Choice selected clouds (not water) but Perception left soft valley
          // vapor in the water mask, animate it as cloud-sea — not as lake.
          // Gate: seaLike + clouds-only. Real lakes keep hasWater and never enter.
          if (!hasWater && seaLike && water[i] > 0.2 && ny > 0.22 && ny < 0.68) {
            var vapor =
              water[i] *
              (1 - lock) *
              (1 - Math.min(1, stable[i] * 1.35)) *
              (1 - Math.min(1, (foliage ? foliage[i] : 0) * 0.9));
            if (vapor > c) c = vapor * 0.55;
          }
          if (c > best) {
            best = c;
            mode = MODE_CLOUD;
          }
          amp = Math.max(amp, c);
          // Coherent flow: shared wind + low-freq speed variation (not independent pixels)
          var layer =
            0.9 +
            0.12 * Math.sin(nx * 2.15 + ny * 0.65) +
            0.06 * Math.sin(nx * 4.8 - ny * 2.9 + 1.1);
          // Subtle differential by height — not dramatic parallax
          var heightBias = seaLike
            ? 0.96 + 0.06 * (1 - ny)
            : 0.9 + 0.14 * (1 - ny);
          var speed = layer * heightBias;
          // Vertical component restrained; cloud-sea mostly horizontal advection
          var vScale = seaLike ? 0.28 : 0.38;
          // Cloud-sea: favor the mid/lower vapor mass (valley) over thin high wash
          if (seaLike) {
            var midBoost = ny > 0.26 && ny < 0.78 ? 1.45 : 0.82;
            speed *= midBoost;
          }
          dx += windCos * speed * c;
          dy += windSin * speed * vScale * c;
        }
        if (hasWater) {
          var wv = water[i] * (1 - Math.max(wildlife[i], stable[i] * 0.25));
          if (wv * 0.9 > best) {
            best = wv * 0.9;
            mode = MODE_WATER;
          }
          amp = Math.max(amp, wv * 0.9);
          // Water recipe FROZEN (Attack 3 / Perception Fix 1)
          dx += wv * 0.15;
          dy += wv * 0.55;
        }
        if (hasFog) {
          var fv = Math.max(fog[i], haze[i]) * (1 - wildlife[i]);
          if (fv * 0.7 > best) {
            best = fv * 0.7;
            mode = MODE_FOG;
          }
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
            if (a > best && mode === MODE_NONE) {
              mode = MODE_CLOUD;
              best = a;
            }
          } else if (a < 0) {
            amp *= 1 + a;
          }
        }
        if (amp < 0.04) {
          amp = 0;
          dx = 0;
          dy = 0;
          mode = MODE_NONE;
        }
        var base = i * FIELD_STRIDE;
        field[base] = dx;
        field[base + 1] = dy;
        field[base + 2] = clamp(amp, 0, 1);
        field[base + 3] = mode;
      }
    }
    field._seaLike = seaLike;
    return field;
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
      seaLike: false,
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
      state.seaLike = false;
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
      state.seaLike = cloudSeaLike(analysis);
      state.field = resolveMotionField(analysis, choice, userMask, size.w, size.h);
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
      var minEdge = Math.min(w, h);
      // Water/fog: legacy restrained max (frozen)
      var maxPxLegacy = Math.max(2, minEdge * 0.012) * scale;
      // Clouds: less displacement than legacy warp, enough for readable drift
      // Cloud-sea: slightly larger horizontal travel (vapor sheet) vs high banks
      var cloudFrac = state.seaLike ? 0.0065 : 0.0055;
      var maxPxCloud = Math.max(1.25, minEdge * cloudFrac) * scale;
      var dir = state.directionDeg;
      var cos = dir == null ? 1 : Math.cos((dir * Math.PI) / 180);
      var sin = dir == null ? 0 : Math.sin((dir * Math.PI) / 180);
      var wave = Math.sin(phase * Math.PI * 2);
      var wave2 = Math.sin(phase * Math.PI * 2 + 1.7);
      // Multi-scale cloud time: large drift, medium evolution, tiny residual
      var driftLarge = Math.sin(phase * Math.PI * 2);
      var driftMed = Math.sin(phase * Math.PI * 2 + 0.85);
      var x;
      var y;
      var i;

      for (y = 0; y < h; y++) {
        for (x = 0; x < w; x++) {
          i = y * w + x;
          var base = i * FIELD_STRIDE;
          var amp = field[base + 2];
          var mode = field[base + 3];
          var sx = x;
          var sy = y;
          var dens = 1;
          if (amp > 0.02) {
            var fdx = field[base];
            var fdy = field[base + 1];
            var mx;
            var my;
            if (mode === MODE_CLOUD) {
              var mag = Math.sqrt(fdx * fdx + fdy * fdy) || 1;
              var ux = fdx / mag;
              var uy = fdy / mag;
              if (dir != null) {
                ux = cos;
                uy = sin;
              }
              // Large: coherent directional advection (shared wind)
              // Medium: slower secondary along same flow (differential layers)
              // Small: low-freq shape evolution — almost imperceptible
              var evol = evolveNoise(x, y, phase, 1);
              var evolMed = evolveNoise(x * 0.55 + 40, y * 0.55 + 18, phase + 0.17, 0.7);
              mx =
                ux * (0.72 * driftLarge + 0.22 * driftMed) +
                ux * evol * 0.1 +
                uy * evolMed * 0.04;
              my =
                uy * (0.68 * driftLarge + 0.2 * driftMed) +
                uy * evol * 0.08 +
                ux * evolMed * 0.03;
              sx = x + mx * maxPxCloud * amp;
              sy = y + my * maxPxCloud * amp;
              // Subtle density / edge soft change — no boil or pulse
              dens = 1 + 0.012 * amp * evolMed;
            } else if (mode === MODE_WATER) {
              // WATER RECIPE FROZEN
              if (dir == null) {
                mx = fdx * wave + fdy * 0.25 * wave2;
                my = fdy * wave + fdx * 0.12 * wave2;
              } else {
                var wmag = Math.sqrt(fdx * fdx + fdy * fdy) || 1;
                mx = cos * wmag * wave;
                my = sin * wmag * wave;
              }
              sx = x + mx * maxPxLegacy * amp;
              sy = y + my * maxPxLegacy * amp;
            } else if (mode === MODE_FOG) {
              // Fog: only when Choice selected fog/haze — restrained legacy drift
              if (dir == null) {
                mx = fdx * wave + fdy * 0.25 * wave2;
                my = fdy * wave + fdx * 0.12 * wave2;
              } else {
                var fmag = Math.sqrt(fdx * fdx + fdy * fdy) || 1;
                mx = cos * fmag * wave;
                my = sin * fmag * wave;
              }
              sx = x + mx * maxPxLegacy * amp;
              sy = y + my * maxPxLegacy * amp;
              dens = 1 + 0.012 * wave * amp;
            } else {
              // Assist / fallback: restrained cloud-like advection
              if (dir == null) {
                mx = fdx * driftLarge * 0.7;
                my = fdy * driftLarge * 0.7;
              } else {
                var amag = Math.sqrt(fdx * fdx + fdy * fdy) || 1;
                mx = cos * amag * driftLarge;
                my = sin * amag * driftLarge;
              }
              sx = x + mx * maxPxCloud * amp;
              sy = y + my * maxPxCloud * amp;
            }
          }
          var rgb = sample(sx, sy);
          var o = i * 4;
          od[o] = clamp(rgb[0] * dens, 0, 255);
          od[o + 1] = clamp(rgb[1] * dens, 0, 255);
          od[o + 2] = clamp(rgb[2] * dens, 0, 255);
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
    strengthScale: strengthScale,
    cloudSeaLike: cloudSeaLike,
    FIELD_STRIDE: FIELD_STRIDE,
    MODE_NONE: MODE_NONE,
    MODE_CLOUD: MODE_CLOUD,
    MODE_WATER: MODE_WATER,
    MODE_FOG: MODE_FOG
  };
})(typeof window !== "undefined" ? window : globalThis);
