/**
 * Experience visual identity — flexible hero/image slots for owner photography.
 * Reads assets/images/identity/manifest.json. Placeholders are temporary only.
 */
(function (global) {
  "use strict";

  var MANIFEST = "assets/images/identity/manifest.json";
  var cache = null;

  function depthPrefix() {
    try {
      var path = String(global.location && global.location.pathname || "");
      if (/\/apps\/[^/]+\/.+/.test(path) && !/index\.html?$/.test(path.split("/").pop() || "")) {
        return "../../../";
      }
      if (/\/apps\//.test(path)) return "../../";
      if (/\/articles\//.test(path)) return "../";
      return "";
    } catch (e) {
      return "";
    }
  }

  function resolveSrc(src) {
    if (!src) return "";
    if (/^(https?:|data:|\/)/i.test(src)) return src;
    return depthPrefix() + src.replace(/^\.\//, "");
  }

  function loadManifest() {
    if (cache) return Promise.resolve(cache);
    return fetch(resolveSrc(MANIFEST), { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("identity manifest");
        return r.json();
      })
      .then(function (data) {
        cache = data;
        return data;
      });
  }

  function entryFor(id) {
    return loadManifest().then(function (data) {
      var exp = (data && data.experiences && data.experiences[id]) || null;
      if (!exp) return null;
      return {
        id: id,
        label: exp.label || id,
        mood: exp.mood || "",
        src: resolveSrc(exp.src),
        alt: exp.alt || "",
        credit: exp.credit || "",
        placeholder: !!exp.placeholder
      };
    });
  }

  function applyToImg(img, entry) {
    if (!img || !entry || !entry.src) return;
    img.src = entry.src;
    if (entry.alt != null) img.alt = entry.alt;
    if (entry.placeholder) img.setAttribute("data-placeholder", "true");
    else img.removeAttribute("data-placeholder");
    img.setAttribute("data-identity", entry.id || "");
  }

  function applyCredit(el, entry) {
    if (!el || !entry) return;
    var text = entry.credit || "";
    if (entry.placeholder && text && text.indexOf("Placeholder") < 0) {
      text = "Placeholder · " + text;
    }
    el.textContent = text;
    el.hidden = !text;
  }

  /**
   * Mount identity imagery.
   * @param {string} experienceId home|dashboard|scenes|sheds|volunteer
   * @param {ParentNode} [root]
   */
  function mount(experienceId, root) {
    root = root || document;
    var nodes = root.querySelectorAll("[data-identity-img=\"" + experienceId + "\"], [data-identity-img='" + experienceId + "']");
    if (!nodes.length && root.querySelector) {
      var single = root.matches && root.matches("[data-identity-img]") ? root : null;
      if (single && single.getAttribute("data-identity-img") === experienceId) nodes = [single];
    }
    return entryFor(experienceId).then(function (entry) {
      if (!entry) return null;
      Array.prototype.forEach.call(nodes, function (img) {
        applyToImg(img, entry);
      });
      var credit = root.querySelector
        ? root.querySelector("[data-identity-credit=\"" + experienceId + "\"]")
        : null;
      if (credit) applyCredit(credit, entry);
      var stage = root.querySelector
        ? root.querySelector("[data-identity-stage=\"" + experienceId + "\"]")
        : null;
      if (stage && entry.src) {
        stage.style.backgroundImage = 'url("' + entry.src.replace(/"/g, "") + '")';
        stage.setAttribute("data-placeholder", entry.placeholder ? "true" : "false");
      }
      return entry;
    }).catch(function () {
      return null;
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.experienceIdentity = {
    mount: mount,
    entryFor: entryFor,
    loadManifest: loadManifest,
    resolveSrc: resolveSrc
  };
})(typeof window !== "undefined" ? window : globalThis);
