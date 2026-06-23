/**
 * Waypoint Studio — lightweight pan/zoom for schematic map viewports (SVG or HTML heat layers)
 */
(function (global) {
  "use strict";

  var MIN_SCALE = 0.45;
  var MAX_SCALE = 5;
  var WHEEL_FACTOR = 1.12;
  var DRAG_THRESHOLD = 6;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function controlsHtml() {
    return (
      '<div class="wds-map-controls" aria-label="Map controls">' +
        '<button type="button" class="wds-map-btn" data-map-zoom-in aria-label="Zoom in"><span aria-hidden="true">+</span></button>' +
        '<button type="button" class="wds-map-btn" data-map-zoom-out aria-label="Zoom out"><span aria-hidden="true">−</span></button>' +
        '<button type="button" class="wds-map-btn" data-map-reset aria-label="Reset view"><span aria-hidden="true">⟲</span></button>' +
        '<button type="button" class="wds-map-btn" data-map-fullscreen aria-label="Fullscreen"><span aria-hidden="true">⛶</span></button>' +
      "</div>"
    );
  }

  function MapView(viewport) {
    this.viewport = viewport;
    this.stage = viewport.querySelector(".wds-map-stage");
    this.scale = 1;
    this.tx = 0;
    this.ty = 0;
    this.pointers = {};
    this.pointerCount = 0;
    this.dragging = false;
    this.dragged = false;
    this.dragStart = null;
    this.lastPinchDist = 0;
    this._handlers = {};
    this._resizeTimer = null;
  }

  MapView.prototype.apply = function () {
    if (!this.stage) return;
    this.stage.style.transform =
      "translate3d(" + this.tx + "px," + this.ty + "px,0) scale(" + this.scale + ")";
  };

  MapView.prototype.fit = function () {
    if (!this.stage || !this.viewport) return;
    var sw = this.stage.offsetWidth;
    var sh = this.stage.offsetHeight;
    var vw = this.viewport.clientWidth;
    var vh = this.viewport.clientHeight;
    if (!sw || !sh || !vw || !vh) return;
    this.scale = clamp(Math.min(vw / sw, vh / sh), MIN_SCALE, 1);
    this.tx = (vw - sw * this.scale) / 2;
    this.ty = (vh - sh * this.scale) / 2;
    this.apply();
  };

  MapView.prototype.zoomAt = function (clientX, clientY, factor) {
    var rect = this.viewport.getBoundingClientRect();
    var px = clientX - rect.left;
    var py = clientY - rect.top;
    var next = clamp(this.scale * factor, MIN_SCALE, MAX_SCALE);
    var ratio = next / this.scale;
    this.tx = px - ratio * (px - this.tx);
    this.ty = py - ratio * (py - this.ty);
    this.scale = next;
    this.apply();
  };

  MapView.prototype.zoomBy = function (factor) {
    var rect = this.viewport.getBoundingClientRect();
    this.zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  };

  MapView.prototype.onWheel = function (e) {
    e.preventDefault();
    var factor = e.deltaY < 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR;
    this.zoomAt(e.clientX, e.clientY, factor);
  };

  MapView.prototype.pointerList = function () {
    var self = this;
    return Object.keys(this.pointers).map(function (id) {
      return self.pointers[id];
    });
  };

  MapView.prototype.onPointerDown = function (e) {
    if (e.button > 0 || e.target.closest(".wds-map-controls")) return;
    this.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    this.pointerCount = Object.keys(this.pointers).length;
    this.dragging = true;
    this.dragged = false;
    this.dragStart = { x: e.clientX, y: e.clientY, tx: this.tx, ty: this.ty };
    this.lastPinchDist = 0;
    this.viewport.classList.add("is-dragging");
    try {
      this.viewport.setPointerCapture(e.pointerId);
    } catch (err) { /* ignore */ }
  };

  MapView.prototype.onPointerMove = function (e) {
    if (!this.pointers[e.pointerId]) return;
    this.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var pts = this.pointerList();

    if (pts.length >= 2) {
      var dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.lastPinchDist > 0) {
        var midX = (pts[0].x + pts[1].x) / 2;
        var midY = (pts[0].y + pts[1].y) / 2;
        this.zoomAt(midX, midY, dist / this.lastPinchDist);
        this.dragged = true;
      }
      this.lastPinchDist = dist;
      return;
    }

    if (!this.dragStart) return;
    var dx = e.clientX - this.dragStart.x;
    var dy = e.clientY - this.dragStart.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      this.dragged = true;
    }
    this.tx = this.dragStart.tx + dx;
    this.ty = this.dragStart.ty + dy;
    this.apply();
  };

  MapView.prototype.onPointerUp = function (e) {
    delete this.pointers[e.pointerId];
    this.pointerCount = Object.keys(this.pointers).length;
    if (this.pointerCount < 2) this.lastPinchDist = 0;
    if (this.pointerCount === 0) {
      this.dragging = false;
      this.dragStart = null;
      this.viewport.classList.remove("is-dragging");
    }
    try {
      this.viewport.releasePointerCapture(e.pointerId);
    } catch (err) { /* ignore */ }
  };

  MapView.prototype.onClickCapture = function (e) {
    if (this.dragged) {
      e.preventDefault();
      e.stopPropagation();
      this.dragged = false;
    }
  };

  MapView.prototype.toggleFullscreen = function () {
    var el = this.viewport;
    var doc = document;
    if (!doc.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(function () { /* unsupported */ });
    } else if (doc.exitFullscreen) {
      doc.exitFullscreen().catch(function () { /* ignore */ });
    }
  };

  MapView.prototype.attach = function () {
    var self = this;
    if (!this.stage) return;

    this._handlers.wheel = function (e) { self.onWheel(e); };
    this._handlers.pointerdown = function (e) { self.onPointerDown(e); };
    this._handlers.pointermove = function (e) { self.onPointerMove(e); };
    this._handlers.pointerup = function (e) { self.onPointerUp(e); };
    this._handlers.pointercancel = function (e) { self.onPointerUp(e); };
    this._handlers.click = function (e) { self.onClickCapture(e); };
    this._handlers.resize = function () {
      clearTimeout(self._resizeTimer);
      self._resizeTimer = setTimeout(function () { self.fit(); }, 120);
    };

    this.viewport.addEventListener("wheel", this._handlers.wheel, { passive: false });
    this.viewport.addEventListener("pointerdown", this._handlers.pointerdown);
    this.viewport.addEventListener("pointermove", this._handlers.pointermove);
    this.viewport.addEventListener("pointerup", this._handlers.pointerup);
    this.viewport.addEventListener("pointercancel", this._handlers.pointercancel);
    this.viewport.addEventListener("click", this._handlers.click, true);
    window.addEventListener("resize", this._handlers.resize);

    var zoomIn = this.viewport.querySelector("[data-map-zoom-in]");
    var zoomOut = this.viewport.querySelector("[data-map-zoom-out]");
    var reset = this.viewport.querySelector("[data-map-reset]");
    var fullscreen = this.viewport.querySelector("[data-map-fullscreen]");

    if (zoomIn) {
      zoomIn.addEventListener("click", function (e) {
        e.stopPropagation();
        self.zoomBy(WHEEL_FACTOR);
      });
    }
    if (zoomOut) {
      zoomOut.addEventListener("click", function (e) {
        e.stopPropagation();
        self.zoomBy(1 / WHEEL_FACTOR);
      });
    }
    if (reset) {
      reset.addEventListener("click", function (e) {
        e.stopPropagation();
        self.fit();
      });
    }
    if (fullscreen) {
      fullscreen.addEventListener("click", function (e) {
        e.stopPropagation();
        self.toggleFullscreen();
      });
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { self.fit(); });
    });
  };

  MapView.prototype.destroy = function () {
    if (!this.viewport) return;
    this.viewport.removeEventListener("wheel", this._handlers.wheel);
    this.viewport.removeEventListener("pointerdown", this._handlers.pointerdown);
    this.viewport.removeEventListener("pointermove", this._handlers.pointermove);
    this.viewport.removeEventListener("pointerup", this._handlers.pointerup);
    this.viewport.removeEventListener("pointercancel", this._handlers.pointercancel);
    this.viewport.removeEventListener("click", this._handlers.click, true);
    window.removeEventListener("resize", this._handlers.resize);
    clearTimeout(this._resizeTimer);
    delete this.viewport._wdsMapView;
  };

  function bind(viewport) {
    if (!viewport) return null;
    if (viewport._wdsMapView) {
      viewport._wdsMapView.destroy();
    }
    var mv = new MapView(viewport);
    viewport._wdsMapView = mv;
    mv.attach();
    return mv;
  }

  MapView.prototype.centerOnStagePoint = function (x, y, zoom) {
    if (!this.viewport) return;
    var vw = this.viewport.clientWidth;
    var vh = this.viewport.clientHeight;
    if (zoom != null) {
      this.scale = clamp(zoom, MIN_SCALE, MAX_SCALE);
    }
    this.tx = vw / 2 - x * this.scale;
    this.ty = vh / 2 - y * this.scale;
    this.apply();
  };

  MapView.prototype.setUserMarker = function (point) {
    if (!this.stage) return;
    var existing = this.stage.querySelector(".wds-map-user-marker");
    if (existing) existing.remove();
    var svg = this.stage.querySelector("svg.fc-terrain-svg");
    if (svg) {
      var old = svg.querySelector(".wds-map-user-marker-svg");
      if (old) old.remove();
      if (!point) return;
      var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("class", "wds-map-user-marker-svg");
      circle.setAttribute("cx", String(point.x));
      circle.setAttribute("cy", String(point.y));
      circle.setAttribute("r", "6");
      circle.setAttribute("aria-label", "Your location");
      svg.appendChild(circle);
      return;
    }
    if (!point) return;
    var marker = document.createElement("div");
    marker.className = "wds-map-user-marker";
    marker.setAttribute("aria-label", "Your location");
    marker.style.left = point.x + "px";
    marker.style.top = point.y + "px";
    this.stage.appendChild(marker);
  };

  function applyLocationToViewport(viewport, loc, region) {
    if (!viewport || !loc || !global.WDS || !global.WDS.location) return;
    var mv = viewport._wdsMapView;
    if (!mv) return;

    region = region || global.WDS.location.getRegionForProjection(loc, null);
    if (!region || loc.lat == null || loc.lng == null) return;

    var svg = viewport.querySelector("svg.fc-terrain-svg");
    var viewBox = svg
      ? { width: 420, height: 300 }
      : { width: mv.stage.offsetWidth || 400, height: mv.stage.offsetHeight || 300 };

    var point = global.WDS.location.projectToSchematic(loc.lat, loc.lng, region, viewBox);
    if (!point) return;

    mv.fit();
    mv.setUserMarker(point);
    mv.centerOnStagePoint(point.x, point.y, Math.max(mv.scale, 1.15));
  }

  function applyLocation(root, loc, options) {
    if (!loc || !global.WDS || !global.WDS.location) return Promise.resolve();
    options = options || {};
    var base = options.base || "design-system/content-engine/";
    var scope = root || document;
    var viewports = scope.querySelectorAll("[data-wds-map-view]");
    if (!viewports.length) return Promise.resolve();

    return global.WDS.location.loadIndex(base).then(function (index) {
      var region = global.WDS.location.getRegionForProjection(loc, index);
      viewports.forEach(function (viewport) {
        applyLocationToViewport(viewport, loc, region);
      });
    }).catch(function () {
      viewports.forEach(function (viewport) {
        applyLocationToViewport(viewport, loc, global.WDS.location.getRegionForProjection(loc, null));
      });
    });
  }

  function bindAll(root, loc, options) {
    var scope = root || document;
    scope.querySelectorAll("[data-wds-map-view]").forEach(bind);
    if (loc) {
      requestAnimationFrame(function () {
        applyLocation(scope, loc, options);
      });
    }
  }

  function reset(viewport) {
    if (viewport && viewport._wdsMapView) {
      viewport._wdsMapView.fit();
    }
  }

  global.WDS = global.WDS || {};
  global.WDS.mapView = {
    controlsHtml: controlsHtml,
    bind: bind,
    bindAll: bindAll,
    reset: reset,
    applyLocation: applyLocation
  };
})(window);
