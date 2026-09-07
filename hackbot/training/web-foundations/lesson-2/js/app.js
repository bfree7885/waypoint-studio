/**
 * Trail Supply client script — local training only.
 * Prevents navigation so inspection stays on this page.
 */
(function () {
  "use strict";

  var statusEl = document.getElementById("store-status");

  function note(message) {
    if (statusEl) statusEl.textContent = message;
  }

  function bindSynthetic(form, message) {
    if (!form) return;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      note(message);
    });
  }

  bindSynthetic(
    document.getElementById("search-form"),
    "Synthetic search. A real browser would send GET /search with the q parameter."
  );
  bindSynthetic(
    document.getElementById("login-form"),
    "Synthetic sign-in. A real browser would POST to /login. No credentials are sent."
  );

  Array.prototype.forEach.call(document.querySelectorAll("a[href^='/']"), function (link) {
    link.addEventListener("click", function (ev) {
      ev.preventDefault();
      note("Synthetic link: " + link.getAttribute("href") + " — this training page does not navigate away.");
    });
  });

  note("Trail Supply script loaded (js/app.js). Inspect the page — do not treat this as a live shop.");
})();
