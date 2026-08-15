/**
 * Waypoint Moving Scenes — simple user assist (brush / erase / direction)
 * Not a Photoshop-grade mask editor.
 */
(function (global) {
  "use strict";

  function createAssist(canvas) {
    var ctx = canvas.getContext("2d");
    var w = 0;
    var h = 0;
    var mask = null; // Float32Array values -1..1 (erase..paint)
    var painting = false;
    var mode = "paint"; // paint | erase
    var brush = 18;
    var dirty = false;

    function resize(nw, nh) {
      var old = mask;
      var ow = w;
      var oh = h;
      var wasDirty = dirty;
      w = nw;
      h = nh;
      canvas.width = nw;
      canvas.height = nh;
      mask = new Float32Array(nw * nh);
      if (old && ow > 0 && oh > 0) {
        if (ow === nw && oh === nh) {
          mask.set(old);
        } else {
          var y;
          var x;
          for (y = 0; y < nh; y++) {
            var sy = Math.min(oh - 1, Math.floor((y / nh) * oh));
            for (x = 0; x < nw; x++) {
              var sx = Math.min(ow - 1, Math.floor((x / nw) * ow));
              mask[y * nw + x] = old[sy * ow + sx];
            }
          }
        }
        dirty = wasDirty;
        if (!dirty) {
          var i;
          for (i = 0; i < mask.length; i++) {
            if (Math.abs(mask[i]) > 0.04) {
              dirty = true;
              break;
            }
          }
        }
      } else {
        dirty = false;
      }
      redraw();
    }

    function hasInclude() {
      if (!mask) return false;
      var i;
      for (i = 0; i < mask.length; i++) {
        if (mask[i] > 0.04) return true;
      }
      return false;
    }

    function redraw() {
      ctx.clearRect(0, 0, w, h);
      if (!mask) return;
      var img = ctx.createImageData(w, h);
      var i;
      for (i = 0; i < mask.length; i++) {
        var v = mask[i];
        if (Math.abs(v) < 0.05) continue;
        var o = i * 4;
        if (v > 0) {
          img.data[o] = 120;
          img.data[o + 1] = 180;
          img.data[o + 2] = 220;
          img.data[o + 3] = Math.round(90 * v);
        } else {
          img.data[o] = 200;
          img.data[o + 1] = 90;
          img.data[o + 2] = 80;
          img.data[o + 3] = Math.round(80 * -v);
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    function stamp(x, y) {
      if (!mask) return;
      var r = brush;
      var yy;
      var xx;
      for (yy = -r; yy <= r; yy++) {
        for (xx = -r; xx <= r; xx++) {
          if (xx * xx + yy * yy > r * r) continue;
          var px = Math.round(x + xx);
          var py = Math.round(y + yy);
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          var i = py * w + px;
          var fall = 1 - Math.sqrt(xx * xx + yy * yy) / r;
          if (mode === "paint") mask[i] = Math.min(1, mask[i] + 0.35 * fall);
          else mask[i] = Math.max(-1, mask[i] - 0.45 * fall);
        }
      }
      dirty = true;
      redraw();
    }

    function pos(ev) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: ((ev.clientX - rect.left) / rect.width) * w,
        y: ((ev.clientY - rect.top) / rect.height) * h
      };
    }

    canvas.addEventListener("pointerdown", function (ev) {
      painting = true;
      canvas.setPointerCapture(ev.pointerId);
      var p = pos(ev);
      stamp(p.x, p.y);
    });
    canvas.addEventListener("pointermove", function (ev) {
      if (!painting) return;
      var p = pos(ev);
      stamp(p.x, p.y);
    });
    canvas.addEventListener("pointerup", function () { painting = false; });
    canvas.addEventListener("pointercancel", function () { painting = false; });

    return {
      resize: resize,
      setMode: function (m) { mode = m === "erase" ? "erase" : "paint"; },
      setBrush: function (n) { brush = Math.max(4, Math.min(64, n)); },
      clear: function () {
        if (!mask) return;
        mask.fill(0);
        dirty = false;
        redraw();
      },
      getMask: function () { return mask; },
      getSize: function () { return { w: w, h: h }; },
      isDirty: function () { return dirty; },
      hasInclude: hasInclude,
      canvas: canvas
    };
  }

  global.WaypointMovingScenesAssist = {
    createAssist: createAssist
  };
})(typeof window !== "undefined" ? window : globalThis);
