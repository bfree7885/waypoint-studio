/**
 * Waypoint Studio Design System — Core
 * Motion, accessibility, and shared utilities for all products.
 */
(function (global) {
  "use strict";

  var reducedMotion = false;
  var listeners = [];

  function init() {
    reducedMotion = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var mq = global.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.addEventListener) {
      mq.addEventListener("change", function (e) {
        reducedMotion = e.matches;
        notifyMotionChange();
      });
    }
  }

  function notifyMotionChange() {
    listeners.forEach(function (fn) {
      try { fn(reducedMotion); } catch (err) { /* noop */ }
    });
  }

  function prefersReducedMotion() {
    return reducedMotion;
  }

  function onMotionPreferenceChange(fn) {
    if (typeof fn === "function") listeners.push(fn);
  }

  /**
   * Smooth scroll respecting reduced-motion.
   */
  function scrollTo(el, options) {
    if (!el) return;
    var opts = options || {};
    el.scrollIntoView({
      behavior: reducedMotion ? "auto" : (opts.behavior || "smooth"),
      block: opts.block || "start",
      inline: opts.inline || "nearest"
    });
  }

  /**
   * Trap focus inside a modal dialog for keyboard users.
   */
  function trapFocus(container) {
    if (!container) return function () {};

    var focusable = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    var nodes = Array.prototype.slice.call(container.querySelectorAll(focusable));
    if (!nodes.length) return function () {};

    var first = nodes[0];
    var last = nodes[nodes.length - 1];

    function onKeydown(e) {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    container.addEventListener("keydown", onKeydown);
    first.focus();

    return function release() {
      container.removeEventListener("keydown", onKeydown);
    };
  }

  /**
   * Announce text to screen readers via live region.
   */
  var liveRegion = null;
  function announce(message, politeness) {
    if (!message) return;
    if (!liveRegion) {
      liveRegion = document.createElement("div");
      liveRegion.className = "wds-sr-only";
      liveRegion.setAttribute("aria-live", politeness || "polite");
      liveRegion.setAttribute("aria-atomic", "true");
      document.body.appendChild(liveRegion);
    }
    liveRegion.setAttribute("aria-live", politeness || "polite");
    liveRegion.textContent = "";
    global.requestAnimationFrame(function () {
      liveRegion.textContent = message;
    });
  }

  /**
   * Validate file against common image constraints.
   */
  function validateImageFile(file, options) {
    var opts = options || {};
    var maxBytes = opts.maxBytes || 20 * 1024 * 1024;
    var types = opts.accept || ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

    if (!file) return { ok: false, message: "No file selected." };
    if (types.indexOf(file.type) === -1) {
      return { ok: false, message: "Use JPG, PNG, or WebP." };
    }
    if (file.size > maxBytes) {
      var mb = Math.round(maxBytes / (1024 * 1024));
      return { ok: false, message: "File must be under " + mb + " MB." };
    }
    return { ok: true };
  }

  /**
   * Read CSS custom property from :root or element.
   */
  function getToken(name, el) {
    return getComputedStyle(el || document.documentElement).getPropertyValue(name).trim();
  }

  /**
   * Set data-product on <html> for accent theming.
   */
  function setProduct(slug) {
    document.documentElement.setAttribute("data-product", slug);
  }

  function getProduct() {
    return document.documentElement.getAttribute("data-product") || "scenes";
  }

  init();

  global.WDS = global.WDS || {};
  global.WDS.core = {
    prefersReducedMotion: prefersReducedMotion,
    onMotionPreferenceChange: onMotionPreferenceChange,
    scrollTo: scrollTo,
    trapFocus: trapFocus,
    announce: announce,
    validateImageFile: validateImageFile,
    getToken: getToken,
    setProduct: setProduct,
    getProduct: getProduct
  };
})(window);
