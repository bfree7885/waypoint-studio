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
      w = nw;
      h = nh;
      canvas.width = nw;
      canvas.height = nh;
      mask = new Float32Array(nw * nh);
      dirty = false;
      redraw();
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
      isDirty: function () { return dirty; },
      canvas: canvas
    };
  }

  global.WaypointMovingScenesAssist = {
    createAssist: createAssist
  };
})(typeof window !== "undefined" ? window : globalThis);
