/**
 * Waypoint Moving Scenes — STILL | MOVING comparison
 */
(function (global) {
  "use strict";

  function mountCompare(root) {
    if (!root) return null;
    root.innerHTML =
      '<div class="ms-compare" data-mode="toggle">' +
        '<div class="ms-compare__stage" tabindex="0" role="img" aria-label="Still and moving photograph comparison">' +
          '<img class="ms-compare__still" alt="Still photograph" draggable="false">' +
          '<canvas class="ms-compare__moving" aria-label="Moving scene preview"></canvas>' +
          '<span class="ms-compare__label ms-compare__label--s">Still</span>' +
          '<span class="ms-compare__label ms-compare__label--m">Moving</span>' +
        "</div>" +
        '<div class="ms-compare__controls" role="group" aria-label="Compare modes">' +
          '<button type="button" class="ms-chip" data-compare="toggle" aria-pressed="true">Toggle</button>' +
          '<button type="button" class="ms-chip" data-compare="side" aria-pressed="false">Side by side</button>' +
          '<button type="button" class="ms-chip" data-compare="hold" aria-pressed="false">Hold still</button>' +
        "</div>" +
      "</div>";

    var stage = root.querySelector(".ms-compare__stage");
    var still = root.querySelector(".ms-compare__still");
    var canvas = root.querySelector(".ms-compare__moving");
    var mode = "toggle";
    var stillUrl = null;
    var showMoving = true;

    function setMode(next) {
      mode = next;
      root.querySelector(".ms-compare").setAttribute("data-mode", mode);
      root.querySelectorAll("[data-compare]").forEach(function (btn) {
        btn.setAttribute("aria-pressed", btn.getAttribute("data-compare") === mode ? "true" : "false");
      });
      if (mode === "side") {
        still.style.opacity = "1";
        canvas.style.opacity = "1";
      } else if (mode === "hold") {
        still.style.opacity = "0";
        canvas.style.opacity = "1";
        showMoving = true;
      } else {
        still.style.opacity = showMoving ? "0" : "1";
        canvas.style.opacity = "1";
      }
    }

    root.querySelectorAll("[data-compare]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setMode(btn.getAttribute("data-compare"));
      });
    });

    stage.addEventListener("pointerdown", function () {
      if (mode === "hold") {
        still.style.opacity = "1";
        return;
      }
      if (mode === "toggle") {
        showMoving = !showMoving;
        still.style.opacity = showMoving ? "0" : "1";
      }
    });
    stage.addEventListener("pointerup", function () {
      if (mode === "hold") still.style.opacity = "0";
    });
    stage.addEventListener("pointercancel", function () {
      if (mode === "hold") still.style.opacity = "0";
    });
    stage.addEventListener("keydown", function (ev) {
      if (mode === "toggle" && (ev.key === " " || ev.key === "Enter")) {
        ev.preventDefault();
        showMoving = !showMoving;
        still.style.opacity = showMoving ? "0" : "1";
      }
    });

    function setStill(blob) {
      if (stillUrl) {
        try { URL.revokeObjectURL(stillUrl); } catch (e) { /* ignore */ }
      }
      stillUrl = URL.createObjectURL(blob);
      still.src = stillUrl;
      setMode(mode);
    }

    function destroy() {
      if (stillUrl) {
        try { URL.revokeObjectURL(stillUrl); } catch (e) { /* ignore */ }
      }
      root.innerHTML = "";
    }

    setMode("toggle");
    return {
      canvas: canvas,
      setStill: setStill,
      setMode: setMode,
      destroy: destroy
    };
  }

  global.WaypointMovingScenesCompare = {
    mountCompare: mountCompare
  };
})(typeof window !== "undefined" ? window : globalThis);
