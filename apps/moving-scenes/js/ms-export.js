/**
 * Waypoint Moving Scenes — export WebM (primary) + still poster PNG
 * Local MediaRecorder from canvas. No cloud generative video.
 */
(function (global) {
  "use strict";

  function Models() {
    return global.WaypointMovingScenesModels;
  }

  function pickMime() {
    var candidates = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4"
    ];
    if (!global.MediaRecorder) return null;
    var i;
    for (i = 0; i < candidates.length; i++) {
      if (global.MediaRecorder.isTypeSupported && global.MediaRecorder.isTypeSupported(candidates[i])) {
        return candidates[i];
      }
    }
    return "video/webm";
  }

  /**
   * Record a seamless loop from an existing renderer.
   * @returns {Promise<{blob:Blob, mime:string, ext:string, posterBlob:Blob}>}
   */
  function exportLoop(renderer, options) {
    options = options || {};
    var durationSec = options.durationSec || Models().DEFAULT_DURATION_SEC;
    var fps = options.fps || 24;
    var canvas = renderer.getCanvas();
    if (!canvas) return Promise.reject(new Error("Nothing to export."));

    // Poster still (first frame)
    var posterBlobP = new Promise(function (resolve) {
      renderer.renderAt(0);
      if (canvas.toBlob) {
        canvas.toBlob(function (b) { resolve(b); }, "image/png");
      } else {
        resolve(null);
      }
    });

    if (!global.MediaRecorder || typeof canvas.captureStream !== "function") {
      return posterBlobP.then(function (poster) {
        if (!poster) throw new Error("Export is not available in this browser.");
        return {
          blob: poster,
          mime: "image/png",
          ext: "png",
          posterBlob: poster,
          note: "Video recording unavailable — saved a still poster instead."
        };
      });
    }

    var mime = pickMime();
    var stream = canvas.captureStream(fps);
    var chunks = [];
    var recorder;
    try {
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 2500000 } : undefined);
    } catch (e) {
      recorder = new MediaRecorder(stream);
      mime = recorder.mimeType || "video/webm";
    }

    var wasPlaying = renderer.isPlaying();
    renderer.pause();

    return posterBlobP.then(function (posterBlob) {
      return new Promise(function (resolve, reject) {
        recorder.ondataavailable = function (ev) {
          if (ev.data && ev.data.size) chunks.push(ev.data);
        };
        recorder.onerror = function () {
          cleanup();
          reject(new Error("Recording failed."));
        };
        recorder.onstop = function () {
          cleanup();
          var type = mime || (chunks[0] && chunks[0].type) || "video/webm";
          var blob = new Blob(chunks, { type: type });
          var ext = type.indexOf("mp4") >= 0 ? "mp4" : type.indexOf("png") >= 0 ? "png" : "webm";
          resolve({
            blob: blob,
            mime: type,
            ext: ext,
            posterBlob: posterBlob,
            note: null
          });
        };

        function cleanup() {
          stream.getTracks().forEach(function (t) {
            try { t.stop(); } catch (err) { /* ignore */ }
          });
          if (wasPlaying) renderer.play();
        }

        recorder.start(100);
        renderer.play();
        global.setTimeout(function () {
          try {
            recorder.stop();
          } catch (err) {
            cleanup();
            reject(err);
          }
        }, Math.round(durationSec * 1000) + 120);
      });
    });
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    global.setTimeout(function () {
      try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
    }, 2000);
  }

  global.WaypointMovingScenesExport = {
    pickMime: pickMime,
    exportLoop: exportLoop,
    downloadBlob: downloadBlob
  };
})(typeof window !== "undefined" ? window : globalThis);
