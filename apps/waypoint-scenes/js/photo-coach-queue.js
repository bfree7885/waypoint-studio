/**
 * Photo Coach — Analysis queue (in-memory, cancelable).
 * Processes one image at a time; yields to the UI between items.
 * Does not persist the queue across reloads (analyses persist via Shoot storage).
 */
(function (global) {
  "use strict";

  function fingerprint(file) {
    if (!file) return "";
    return [
      file.name || "",
      file.size != null ? file.size : "",
      file.lastModified != null ? file.lastModified : ""
    ].join("::");
  }

  /**
   * Deduplicate File objects; preserves first occurrence order.
   * @returns {{ unique: File[], skippedDuplicates: number }}
   */
  function dedupeFiles(files) {
    var seen = Object.create(null);
    var unique = [];
    var skippedDuplicates = 0;
    (files || []).forEach(function (file) {
      var key = fingerprint(file);
      if (!key || seen[key]) {
        skippedDuplicates++;
        return;
      }
      seen[key] = true;
      unique.push(file);
    });
    return { unique: unique, skippedDuplicates: skippedDuplicates };
  }

  /**
   * @param {object} options
   * @param {File[]} options.files
   * @param {(file: File, index: number, total: number) => Promise<*>} options.processItem
   * @param {(state: object) => void} [options.onProgress]
   * @param {(result: object) => void} [options.onComplete]
   * @param {(err: Error) => void} [options.onError]
   */
  function createQueue(options) {
    options = options || {};
    var files = (options.files || []).slice();
    var processItem = options.processItem;
    var onProgress = options.onProgress || function () {};
    var onComplete = options.onComplete || function () {};
    var timings = [];
    var state = {
      status: "idle",
      index: 0,
      total: files.length,
      currentFileName: null,
      remaining: files.length,
      cancelled: false,
      failed: 0,
      completed: 0,
      startedAt: null,
      estimatedMsRemaining: null
    };

    function estimate() {
      if (!timings.length || state.remaining <= 0) {
        state.estimatedMsRemaining = null;
        return;
      }
      var sum = timings.reduce(function (a, b) { return a + b; }, 0);
      var avg = sum / timings.length;
      state.estimatedMsRemaining = Math.round(avg * state.remaining);
    }

    function tick() {
      onProgress(getState());
    }

    function getState() {
      return {
        status: state.status,
        index: state.index,
        total: state.total,
        currentFileName: state.currentFileName,
        remaining: state.remaining,
        cancelled: state.cancelled,
        failed: state.failed,
        completed: state.completed,
        estimatedMsRemaining: state.estimatedMsRemaining,
        percent: state.total
          ? Math.round((state.index / state.total) * 100)
          : 0
      };
    }

    function cancel() {
      if (state.status === "running") {
        state.cancelled = true;
        state.status = "cancelling";
        tick();
      }
    }

    function start() {
      if (state.status === "running") return Promise.resolve(getState());
      state.status = "running";
      state.startedAt = Date.now();
      state.cancelled = false;
      tick();

      return new Promise(function (resolve) {
        function next() {
          if (state.cancelled) {
            state.status = "cancelled";
            state.remaining = Math.max(0, state.total - state.index);
            tick();
            var cancelledResult = { status: "cancelled", state: getState() };
            onComplete(cancelledResult);
            resolve(cancelledResult);
            return;
          }
          if (state.index >= state.total) {
            state.status = "complete";
            state.remaining = 0;
            state.currentFileName = null;
            state.estimatedMsRemaining = 0;
            tick();
            var doneResult = { status: "complete", state: getState() };
            onComplete(doneResult);
            resolve(doneResult);
            return;
          }

          var file = files[state.index];
          state.currentFileName = file && file.name ? file.name : "photo";
          state.remaining = state.total - state.index;
          estimate();
          tick();

          var t0 = Date.now();
          Promise.resolve()
            .then(function () {
              return processItem(file, state.index, state.total);
            })
            .then(function (ok) {
              timings.push(Date.now() - t0);
              if (ok === false) state.failed++;
              else state.completed++;
            })
            .catch(function () {
              timings.push(Date.now() - t0);
              state.failed++;
            })
            .then(function () {
              state.index++;
              state.remaining = Math.max(0, state.total - state.index);
              estimate();
              tick();
              setTimeout(next, 24);
            });
        }
        next();
      });
    }

    return {
      start: start,
      cancel: cancel,
      getState: getState,
      fingerprint: fingerprint
    };
  }

  function formatEta(ms) {
    if (ms == null || !isFinite(ms) || ms < 0) return null;
    if (ms < 1500) return "a moment";
    var sec = Math.round(ms / 1000);
    if (sec < 60) return "about " + sec + "s";
    var min = Math.round(sec / 60);
    return "about " + min + " min";
  }

  global.WaypointPhotoCoachQueue = {
    createQueue: createQueue,
    dedupeFiles: dedupeFiles,
    fingerprint: fingerprint,
    formatEta: formatEta
  };
})(typeof window !== "undefined" ? window : globalThis);
