/**
 * Learn pillar — seamless photography workflow (existing modules only).
 *
 * Importer → Photo Library → Scene Library → Photo Coach →
 * Portfolio Assistant → Portfolio Coach → Portfolio Builder → Portfolio Health
 *
 * Shared navigation + empty-library gate. No new AI features.
 */
(function (global) {
  "use strict";

  var LIBRARY_INDEX_KEY = "waypoint-photo-library-index-v1";
  var PROTOCOL = "learn-pillar-workflow-v1";

  /**
   * @typedef {{
   *   id: string,
   *   label: string,
   *   shortLabel: string,
   *   summary: string,
   *   pathFromApps: string,
   *   requiresLibrary: boolean
   * }} LearnStep
   */

  /** @type {LearnStep[]} */
  var STEPS = [
    {
      id: "importer",
      label: "Importer",
      shortLabel: "Import",
      summary: "Bring frames onto this device (desktop Importer or browser import).",
      pathFromApps: "photo-library/",
      requiresLibrary: false
    },
    {
      id: "photo-library",
      label: "Photo Library",
      shortLabel: "Library",
      summary: "Private catalog — the shared index every later step reads.",
      pathFromApps: "photo-library/",
      requiresLibrary: false
    },
    {
      id: "scene-library",
      label: "Scene Library",
      shortLabel: "Scenes",
      summary: "Every imported shoot becomes a Scene you can reopen without re-upload.",
      pathFromApps: "waypoint-scenes/library/",
      requiresLibrary: true
    },
    {
      id: "photo-coach",
      label: "Photo Coach",
      shortLabel: "Coach",
      summary: "Review a shoot — what works, what to try next — on this device.",
      pathFromApps: "photo-coach/",
      requiresLibrary: true
    },
    {
      id: "portfolio-assistant",
      label: "Portfolio Assistant",
      shortLabel: "Assist",
      summary: "Review candidates from your library; you decide what belongs.",
      pathFromApps: "scenes/portfolio/assistant.html",
      requiresLibrary: true
    },
    {
      id: "portfolio-coach",
      label: "Portfolio Coach",
      shortLabel: "Compare",
      summary: "Compare near-duplicates with calm, evidence-based mentoring.",
      pathFromApps: "scenes/portfolio/assistant.html#coach",
      requiresLibrary: true
    },
    {
      id: "portfolio-builder",
      label: "Portfolio Builder",
      shortLabel: "Build",
      summary: "Assemble an ordered purpose set from real library photographs.",
      pathFromApps: "scenes/portfolio/builder.html",
      requiresLibrary: true
    },
    {
      id: "portfolio-health",
      label: "Portfolio Health",
      shortLabel: "Health",
      summary: "Check balance, repetition, and gaps across portfolios you already made.",
      pathFromApps: "scenes/portfolio/health.html",
      requiresLibrary: true
    }
  ];

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * @param {number} shellDepth levels below site root (apps/foo = 2, apps/scenes/portfolio = 3)
   */
  function prefixFromShellDepth(shellDepth) {
    var n = Math.max(0, Number(shellDepth) || 0);
    if (n <= 0) return "";
    return new Array(n + 1).join("../");
  }

  function hrefFor(stepId, shellDepth) {
    var step = STEPS.find(function (s) {
      return s.id === stepId;
    });
    if (!step) return "#";
    return prefixFromShellDepth(shellDepth) + "apps/" + step.pathFromApps;
  }

  function libraryIndex() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(LIBRARY_INDEX_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.images)) return parsed.images;
      if (parsed && Array.isArray(parsed.items)) return parsed.items;
      return [];
    } catch (e) {
      return [];
    }
  }

  function libraryCount() {
    return libraryIndex().length;
  }

  function hasLibraryPhotos() {
    return libraryCount() > 0;
  }

  /**
   * Gate copy when a step needs photographs but the index is empty.
   */
  function emptyLibraryHtml(shellDepth) {
    var libHref = hrefFor("photo-library", shellDepth);
    return (
      '<p class="lpw-empty" role="status">' +
      "<strong>Start with imported photographs.</strong> " +
      "This step reads your private Photo Library index on this device. " +
      '<a href="' +
      escapeHtml(libHref) +
      '">Open Photo Library</a> to import frames first — nothing here invents photographs.' +
      "</p>"
    );
  }

  /**
   * Render the Learn workflow rail into a mount element.
   * @param {HTMLElement|string} mount
   * @param {{ current?: string, shellDepth?: number, title?: string, compact?: boolean }} [options]
   */
  function renderRail(mount, options) {
    options = options || {};
    var el =
      typeof mount === "string" ? global.document.getElementById(mount) : mount;
    if (!el) return null;

    var current = options.current || null;
    var depth = options.shellDepth != null ? options.shellDepth : 2;
    var title = options.title || "Learn workflow";
    var count = libraryCount();
    var compact = !!options.compact;

    var items = STEPS.map(function (step, idx) {
      var isCurrent = step.id === current;
      var href = hrefFor(step.id, depth);
      var gated = step.requiresLibrary && count === 0 && !isCurrent;
      var cls =
        "lpw-step" +
        (isCurrent ? " is-current" : "") +
        (gated ? " is-gated" : "");
      var label = compact ? step.shortLabel : step.label;
      var inner = isCurrent
        ? "<span class=\"lpw-step__label\">" + escapeHtml(label) + "</span>"
        : '<a class="lpw-step__label" href="' +
          escapeHtml(href) +
          '">' +
          escapeHtml(label) +
          "</a>";
      return (
        '<li class="' +
        cls +
        '" data-step="' +
        escapeHtml(step.id) +
        '">' +
        '<span class="lpw-step__num" aria-hidden="true">' +
        (idx + 1) +
        "</span>" +
        inner +
        (compact
          ? ""
          : '<span class="lpw-step__summary">' +
            escapeHtml(step.summary) +
            "</span>") +
        "</li>"
      );
    }).join("");

    el.classList.add("lpw");
    el.innerHTML =
      '<div class="lpw-head">' +
      "<h2 class=\"lpw-title\">" +
      escapeHtml(title) +
      "</h2>" +
      '<p class="lpw-meta" role="status">' +
      (count
        ? escapeHtml(String(count)) +
          " photograph" +
          (count === 1 ? "" : "s") +
          " in your private library index"
        : "Library index empty — import photographs to unlock Scene → Portfolio steps") +
      "</p>" +
      "</div>" +
      '<ol class="lpw-list" aria-label="' +
      escapeHtml(title) +
      '">' +
      items +
      "</ol>";

    if (current) {
      var step = STEPS.find(function (s) {
        return s.id === current;
      });
      if (step && step.requiresLibrary && count === 0) {
        var gate = global.document.createElement("div");
        gate.innerHTML = emptyLibraryHtml(depth);
        el.appendChild(gate.firstChild);
      }
    }

    return { count: count, current: current };
  }

  function list() {
    return STEPS.slice();
  }

  function step(id) {
    return (
      STEPS.find(function (s) {
        return s.id === id;
      }) || null
    );
  }

  global.WaypointLearnPillarWorkflow = {
    PROTOCOL: PROTOCOL,
    LIBRARY_INDEX_KEY: LIBRARY_INDEX_KEY,
    STEPS: STEPS,
    list: list,
    step: step,
    hrefFor: hrefFor,
    libraryCount: libraryCount,
    hasLibraryPhotos: hasLibraryPhotos,
    emptyLibraryHtml: emptyLibraryHtml,
    renderRail: renderRail,
    prefixFromShellDepth: prefixFromShellDepth
  };
})(typeof window !== "undefined" ? window : globalThis);
