/**
 * Waypoint Studio — shared application boot shell
 *
 * Replaces bare "Opening…" / empty busy mounts with branded context,
 * progress, timeout detection, and retry.
 *
 *   WDS.platformBoot.html(options)
 *   WDS.platformBoot.mount(el, options)
 *   WDS.platformBoot.fail(el, options)
 *   WDS.platformBoot.watch(el, options)  — timeout → fail UI
 *   WDS.platformBoot.clear(el)
 */
(function (global) {
  "use strict";

  var DEFAULT_TIMEOUT_MS = 18000;

  function esc(str) {
    if (global.WDS && WDS.escapeHtml) return WDS.escapeHtml(str);
    if (global.WDS && WDS.platformUi && WDS.platformUi.escapeHtml) {
      return WDS.platformUi.escapeHtml(str);
    }
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function html(options) {
    options = options || {};
    var product = options.product || "Waypoint Studio";
    var title = options.title || "Loading";
    var detail =
      options.detail ||
      "Preparing this application. Your data stays on this device unless you choose otherwise.";
    var status = options.status || "Loading…";
    var showProgress = options.progress !== false;

    return (
      '<div class="wds-boot" role="status" aria-live="polite" data-wds-boot="1">' +
      '<p class="wds-boot__eyebrow">' +
      esc(product) +
      "</p>" +
      '<p class="wds-boot__title">' +
      esc(title) +
      "</p>" +
      '<p class="wds-boot__detail">' +
      esc(detail) +
      "</p>" +
      (showProgress
        ? '<div class="wds-boot__track" aria-hidden="true"><span class="wds-boot__bar"></span></div>'
        : "") +
      '<p class="wds-boot__status">' +
      esc(status) +
      "</p>" +
      "</div>"
    );
  }

  function failHtml(options) {
    options = options || {};
    var product = options.product || "Waypoint Studio";
    var title = options.title || "Could not finish loading";
    var detail =
      options.detail ||
      "Something took too long or failed. You can retry, or return to Studio home.";
    var retryLabel = options.retryLabel || "Retry";
    var homeHref = options.homeHref || "../../";
    var supportHref = options.supportHref || "../../support.html";

    return (
      '<div class="wds-boot wds-boot--fail" role="alert" data-wds-boot="1">' +
      '<p class="wds-boot__eyebrow">' +
      esc(product) +
      "</p>" +
      '<p class="wds-boot__title">' +
      esc(title) +
      "</p>" +
      '<p class="wds-boot__detail">' +
      esc(detail) +
      "</p>" +
      '<p class="wds-boot__actions">' +
      '<button type="button" class="wds-btn wds-btn--primary wds-btn--sm" data-wds-boot-retry>' +
      esc(retryLabel) +
      "</button> " +
      '<a class="wds-btn wds-btn--secondary wds-btn--sm" href="' +
      esc(homeHref) +
      '">Studio home</a> ' +
      '<a class="wds-btn wds-btn--ghost wds-btn--sm" href="' +
      esc(supportHref) +
      '">Support</a>' +
      "</p>" +
      (options.providerHint
        ? '<p class="wds-honesty">' + esc(options.providerHint) + "</p>"
        : "") +
      "</div>"
    );
  }

  function mount(el, options) {
    if (!el) return null;
    el.setAttribute("aria-busy", "true");
    el.innerHTML = html(options);
    return el.querySelector("[data-wds-boot]");
  }

  function fail(el, options) {
    if (!el) return null;
    el.setAttribute("aria-busy", "false");
    el.innerHTML = failHtml(options);
    var btn = el.querySelector("[data-wds-boot-retry]");
    if (btn) {
      btn.addEventListener("click", function () {
        if (options && typeof options.onRetry === "function") options.onRetry();
        else if (typeof location !== "undefined") location.reload();
      });
    }
    return el.querySelector("[data-wds-boot]");
  }

  function clear(el) {
    if (!el) return;
    el.removeAttribute("aria-busy");
    if (el._wdsBootTimer) {
      clearTimeout(el._wdsBootTimer);
      el._wdsBootTimer = null;
    }
  }

  /** Update the status line on an existing boot shell (no remount). */
  function status(el, text) {
    if (!el) return;
    var line = el.querySelector(".wds-boot__status");
    if (line) line.textContent = String(text == null ? "" : text);
  }

  /**
   * If the mount still has a boot shell after timeoutMs, show failure UI.
   */
  function watch(el, options) {
    options = options || {};
    if (!el) return function () {};
    var ms = options.timeoutMs != null ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
    if (el._wdsBootTimer) clearTimeout(el._wdsBootTimer);
    el._wdsBootTimer = setTimeout(function () {
      el._wdsBootTimer = null;
      if (!el.querySelector || !el.querySelector("[data-wds-boot]:not(.wds-boot--fail)")) return;
      // Still showing loading boot
      if (el.getAttribute("aria-busy") === "true" || el.querySelector(".wds-boot:not(.wds-boot--fail)")) {
        fail(el, options);
      }
    }, ms);
    return function () {
      if (el._wdsBootTimer) {
        clearTimeout(el._wdsBootTimer);
        el._wdsBootTimer = null;
      }
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.platformBoot = {
    version: "1.0.1",
    DEFAULT_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
    html: html,
    failHtml: failHtml,
    mount: mount,
    fail: fail,
    clear: clear,
    status: status,
    watch: watch
  };
})(typeof window !== "undefined" ? window : globalThis);
