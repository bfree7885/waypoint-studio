/**
 * Photo Coach → Scene Builder bridge.
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function sceneOptions(critique) {
    var sug = critique && critique.sceneSuggestion;
    return [
      { id: "living-scene", label: "Living Scene", status: "live", desc: "Atmosphere, drift, and animated weather layers." },
      { id: "parallax", label: "Parallax Scene", status: "live", desc: "Depth and presence — tilt and wander." },
      { id: "cinematic", label: "Cinematic Loop", status: "pending", desc: "Coming later — still export works today." },
      { id: "3d", label: "3D Scene", status: "pending", desc: "Coming later." },
      { id: "wallpaper", label: "Wallpaper export", status: "pending", desc: "Coming later — still export works today." }
    ].map(function (opt) {
      if (opt.id === "living-scene" && sug && sug.presetId) {
        opt.recommended = true;
        opt.desc += " Suggested mood: " + sug.style + ".";
      }
      return opt;
    });
  }

  function renderBringToLife(critique) {
    var opts = sceneOptions(critique);
    var html = '<section class="coach-card coach-card--scene" aria-labelledby="coach-scene-title">' +
      '<h3 class="coach-card__title" id="coach-scene-title">Bring it to life</h3>' +
      '<p class="coach-card__note">Send this frame into Scene Builder with critique context attached.</p>' +
      '<ul class="coach-scene-options">';
    opts.forEach(function (opt) {
      var statusClass = opt.status === "live" ? "live" : "pending";
      html += '<li class="coach-scene-opt coach-scene-opt--' + statusClass + '">' +
        '<div class="coach-scene-opt__copy">' +
          '<strong>' + escapeHtml(opt.label) + "</strong>" +
          (opt.recommended ? ' <span class="coach-trust coach-trust--live">Suggested</span>' : "") +
          (opt.status === "pending" ? ' <span class="coach-trust coach-trust--pending">Coming later</span>' : "") +
          '<p>' + escapeHtml(opt.desc) + "</p>" +
        "</div>";
      if (opt.status === "live") {
        html += '<button type="button" class="btn btn-secondary btn-sm coach-scene-btn" data-scene-action="' +
          escapeHtml(opt.id) + '">Open</button>';
      }
      html += "</li>";
    });
    html += "</ul>" +
      '<p class="coach-scene-roadmap-title">What works today</p>' +
      '<ul class="coach-scene-roadmap">' +
        '<li><span class="coach-trust coach-trust--live">Ready</span> Fog, rain, snow, cloud drift, parallax</li>' +
        '<li><span class="coach-trust coach-trust--live">Ready</span> Leaf drift (wind), light rays, fireflies</li>' +
        '<li><span class="coach-trust coach-trust--pending">Later</span> Animated water, stars, aurora</li>' +
        '<li><span class="coach-trust coach-trust--pending">Later</span> Desktop/phone wallpaper, cinematic loop, 3D scene</li>' +
      "</ul>" +
      '<button type="button" class="btn btn-primary coach-scene-primary" id="btn-coach-send-builder">' +
        "Create Living Scene</button>" +
      "</section>";
    return html;
  }

  function sendToBuilder(imageUrl, file, critique, exif) {
    var App = global.WaypointSceneApp;
    if (!App || !imageUrl) return false;

    if (App.setProductMode) App.setProductMode("builder");
    else {
      document.querySelectorAll("[data-product-mode]").forEach(function (btn) {
        if (btn.getAttribute("data-product-mode") === "builder") btn.click();
      });
    }

    var ctx = global.WaypointSceneContext && global.WaypointSceneContext.createContext
      ? global.WaypointSceneContext.createContext({
          imageUrl: imageUrl,
          imageName: file ? file.name : "photo",
          exif: exif,
          critique: critique,
          weather: critique && critique.outdoorContext ? critique.outdoorContext.weather : null,
          sceneSuggestion: critique && critique.sceneSuggestion
        })
      : { critique: critique, exif: exif, sceneSuggestion: critique && critique.sceneSuggestion };

    if (App.setSceneContext) App.setSceneContext(ctx);
    if (App.showCoachImportBanner) App.showCoachImportBanner(critique);

    App.loadPhotoForLivingScene(imageUrl, file ? file.name : "photo");

    if (critique && critique.sceneSuggestion && critique.sceneSuggestion.presetId &&
        global.WaypointSceneApp && global.WaypointSceneApp.applyPreset) {
      setTimeout(function () {
        global.WaypointSceneApp.applyPreset(critique.sceneSuggestion.presetId);
      }, 400);
    }
    return true;
  }

  function bindActions(mount, callbacks) {
    if (!mount) return;
    callbacks = callbacks || {};
    var primary = mount.querySelector("#btn-coach-send-builder");
    if (primary) {
      primary.onclick = function () {
        if (callbacks.onSendBuilder) callbacks.onSendBuilder("living-scene");
      };
    }
    mount.querySelectorAll(".coach-scene-btn").forEach(function (btn) {
      btn.onclick = function () {
        var action = btn.getAttribute("data-scene-action");
        if (callbacks.onSendBuilder) callbacks.onSendBuilder(action);
      };
    });
  }

  global.WaypointPhotoCoachSceneBridge = {
    sceneOptions: sceneOptions,
    renderBringToLife: renderBringToLife,
    sendToBuilder: sendToBuilder,
    bindActions: bindActions
  };
})(window);
