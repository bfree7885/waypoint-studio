/**
 * Waypoint Auto Edit — Original | Edited comparison helpers
 */
(function (global) {
  "use strict";

  function mountCompare(root) {
    if (!root) return null;
    root.innerHTML =
      '<div class="ae-compare" data-mode="split">' +
        '<div class="ae-compare__stage" tabindex="0" role="img" aria-label="Original and edited photograph comparison">' +
          '<img class="ae-compare__img ae-compare__img--edited" alt="Waypoint edited photograph" draggable="false">' +
          '<img class="ae-compare__img ae-compare__img--original" alt="Original photograph" draggable="false">' +
          '<span class="ae-compare__label ae-compare__label--o">Original</span>' +
          '<span class="ae-compare__label ae-compare__label--e">Waypoint Edit</span>' +
        "</div>" +
        '<div class="ae-compare__controls" role="group" aria-label="Compare modes">' +
          '<button type="button" class="ae-chip" data-compare="split" aria-pressed="true">Slider</button>' +
          '<button type="button" class="ae-chip" data-compare="toggle" aria-pressed="false">Toggle</button>' +
          '<button type="button" class="ae-chip" data-compare="hold" aria-pressed="false">Hold original</button>' +
          '<label class="ae-compare__slider-label" for="ae-compare-range">Compare position</label>' +
          '<input id="ae-compare-range" class="ae-compare__range" type="range" min="0" max="100" value="50" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-label="Reveal edited photograph">' +
        "</div>" +
      "</div>";

    var stage = root.querySelector(".ae-compare__stage");
    var imgO = root.querySelector(".ae-compare__img--original");
    var imgE = root.querySelector(".ae-compare__img--edited");
    var range = root.querySelector(".ae-compare__range");
    var mode = "split";
    var urls = { original: null, edited: null };
    var reveal = 50;

    function setPos(pct) {
      reveal = Math.max(0, Math.min(100, pct));
      // clip original from the right so left shows original, right shows edited underneath
      imgO.style.clipPath = "inset(0 " + (100 - reveal) + "% 0 0)";
      range.value = String(reveal);
      range.setAttribute("aria-valuenow", String(Math.round(reveal)));
    }

    function setMode(next) {
      mode = next;
      root.querySelector(".ae-compare").setAttribute("data-mode", mode);
      root.querySelectorAll("[data-compare]").forEach(function (btn) {
        btn.setAttribute("aria-pressed", btn.getAttribute("data-compare") === mode ? "true" : "false");
      });
      if (mode === "toggle") {
        imgO.style.clipPath = "none";
        imgO.style.opacity = "0";
      } else if (mode === "hold") {
        imgO.style.clipPath = "none";
        imgO.style.opacity = "0";
      } else {
        imgO.style.opacity = "1";
        setPos(reveal);
      }
    }

    root.querySelectorAll("[data-compare]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setMode(btn.getAttribute("data-compare"));
      });
    });

    range.addEventListener("input", function () {
      if (mode !== "split") setMode("split");
      setPos(Number(range.value));
    });

    stage.addEventListener("pointerdown", function (ev) {
      if (mode === "hold") {
        imgO.style.opacity = "1";
        return;
      }
      if (mode === "toggle") {
        imgO.style.opacity = imgO.style.opacity === "1" ? "0" : "1";
        return;
      }
      var rect = stage.getBoundingClientRect();
      setPos(((ev.clientX - rect.left) / rect.width) * 100);
      stage.setPointerCapture(ev.pointerId);
    });
    stage.addEventListener("pointermove", function (ev) {
      if (mode !== "split" || !stage.hasPointerCapture(ev.pointerId)) return;
      var rect = stage.getBoundingClientRect();
      setPos(((ev.clientX - rect.left) / rect.width) * 100);
    });
    stage.addEventListener("pointerup", function () {
      if (mode === "hold") imgO.style.opacity = "0";
    });
    stage.addEventListener("pointercancel", function () {
      if (mode === "hold") imgO.style.opacity = "0";
    });
    stage.addEventListener("keydown", function (ev) {
      if (mode === "toggle" && (ev.key === " " || ev.key === "Enter")) {
        ev.preventDefault();
        imgO.style.opacity = imgO.style.opacity === "1" ? "0" : "1";
      }
      if (mode === "split" && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) {
        ev.preventDefault();
        setPos(reveal + (ev.key === "ArrowLeft" ? -5 : 5));
      }
    });

    function revoke() {
      ["original", "edited"].forEach(function (k) {
        if (urls[k]) {
          try { URL.revokeObjectURL(urls[k]); } catch (e) { /* ignore */ }
          urls[k] = null;
        }
      });
    }

    function setImages(originalBlob, editedBlob) {
      revoke();
      urls.original = URL.createObjectURL(originalBlob);
      urls.edited = URL.createObjectURL(editedBlob);
      imgO.src = urls.original;
      imgE.src = urls.edited;
      setPos(50);
      setMode("split");
    }

    setPos(50);
    return {
      setImages: setImages,
      setMode: setMode,
      destroy: function () {
        revoke();
        root.innerHTML = "";
      }
    };
  }

  global.WaypointAutoEditCompare = {
    mountCompare: mountCompare
  };
})(typeof window !== "undefined" ? window : globalThis);
