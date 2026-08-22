/**
 * Auto Edit worker — reserved for OffscreenCanvas final export path.
 * Main thread currently runs previews + finish; worker can take heavy passes later.
 */
self.onmessage = function (ev) {
  var msg = ev.data || {};
  if (msg.type === "ping") {
    self.postMessage({ type: "pong", engine: "ae-worker-1.0.0" });
    return;
  }
  // V1: processing stays on main with chunked batch yields; worker handshake only.
  self.postMessage({
    type: "deferred",
    note: "Heavy OffscreenCanvas export path reserved; main pipeline is authoritative in V1."
  });
};
