/**
 * Waypoint Studio — Research Integrity framework
 *
 * Reusable trust signals: provenance, confidence, citations, evidence quality,
 * verification, uncertainty, and educational disclaimers.
 *
 * Integrates with Outdoor Intelligence Platform slices and WOS observations.
 *
 *   WDS.researchIntegrity.fromOipSlice(name, slice, platform)
 *   WDS.researchIntegrity.fromObservation(obs)
 *   WDS.researchIntegrity.annotatePackage(platform)
 *   WDS.researchIntegrity.renderFootnote(ctx)
 *   WDS.researchIntegrity.renderDisclaimer(opts)
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";

  var PROVENANCE = Object.freeze({
    observation: {
      label: "Observation",
      short: "Obs",
      title: "Field observation — verification may be pending",
      css: "wds-prov--observation"
    },
    prediction: {
      label: "Educational index",
      short: "Index",
      title: "Model estimate — confirm outdoors",
      css: "wds-prov--prediction"
    },
    educational: {
      label: "Editorial",
      short: "Editorial",
      title: "Curated field guide content — not live detection",
      css: "wds-prov--educational"
    },
    verified: {
      label: "Verified",
      short: "Verified",
      title: "Reviewed or officially sourced — see citation",
      css: "wds-prov--verified"
    },
    placeholder: {
      label: "Preview",
      short: "Preview",
      title: "Placeholder — live data not yet connected",
      css: "wds-prov--placeholder"
    },
    live: {
      label: "Live forecast",
      short: "Live",
      title: "Current forecast from weather provider",
      css: "wds-prov--live"
    }
  });

  var CONFIDENCE_LABELS = Object.freeze({
    certain: { label: "Certain", title: "Observer rated identification as certain" },
    likely: { label: "Likely", title: "Reasonably confident — still verify field marks" },
    possible: { label: "Possible", title: "Tentative identification or presence" },
    uncertain: { label: "Uncertain", title: "Low confidence — treat as a lead" },
    not_recorded: { label: null, title: null }
  });

  var EVIDENCE_LABELS = Object.freeze({
    excellent: { label: "Strong evidence", title: "Photos, audio, or notes strongly support the record" },
    good: { label: "Good evidence", title: "Adequate supporting media or detail" },
    fair: { label: "Fair evidence", title: "Some support — more detail would help" },
    poor: { label: "Weak evidence", title: "Limited supporting detail" },
    none: { label: "No evidence", title: "No supporting media attached" },
    not_assessed: { label: null, title: null }
  });

  var VERIFICATION_LABELS = Object.freeze({
    unverified: { label: "Unverified", title: "Not yet reviewed" },
    self_verified: { label: "Self-checked", title: "Observer verified their own record" },
    community: { label: "Community review", title: "Reviewed by community participants" },
    expert: { label: "Expert review", title: "Reviewed by a knowledgeable reviewer" },
    research_confirmed: { label: "Research confirmed", title: "Accepted for research use" },
    disputed: { label: "Disputed", title: "Identification or details contested" },
    rejected: { label: "Rejected", title: "Record not accepted" }
  });

  var SPECIES_STATUS = Object.freeze({
    active: "editorial watch",
    opening: "may be opening",
    "peaking-low": "may be peaking (low elevations)",
    fading: "may be fading",
    ending: "may be ending",
    "ending-low": "may be ending (low elevations)",
    watch: "on watch",
    possible: "possible — verify ID",
    spotty: "spotty reports",
    "not-local": "not expected locally"
  });

  var GROUP_LABELS = Object.freeze({
    activeNow: "Likely this week",
    ending: "May be ending",
    comingSoon: "On watch"
  });

  var OIP_SLICE_DEFAULTS = Object.freeze({
    weather: { provenance: "live", uncertainty: "Forecasts change — check time of observation" },
    daylight: { provenance: "editorial", uncertainty: "Editorial or calculated — verify for precise planning" },
    phenology: { provenance: "educational", uncertainty: "Phenology varies by elevation and aspect" },
    species: { provenance: "educational", uncertainty: "Editorial watch list — not a survey" },
    observations: { provenance: "educational", disclaimer: "Editorial field notes — not user observations" },
    conservation: { provenance: "educational", disclaimer: "Verify project details with official sources" },
    research: { provenance: "educational", disclaimer: "Plain-language summary — read cited sources" },
    rainfall: { provenance: "editorial", uncertainty: "Rainfall summaries may be editorial placeholders" },
    elevation: { provenance: "editorial", uncertainty: "Elevation may be approximate" },
    geography: { provenance: "editorial" }
  });

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pickEnum(val, map, fallback) {
    if (val != null && map[val]) return val;
    return fallback;
  }

  function provenanceMeta(kind) {
    return PROVENANCE[kind] || PROVENANCE.educational;
  }

  function provenanceFromOipStatus(status, sliceName) {
    if (status === "live") return "live";
    if (status === "placeholder") return "placeholder";
    if (sliceName === "observations") return "educational";
    if (sliceName === "research" && status === "editorial") return "educational";
    return "educational";
  }

  function normalizeSource(source) {
    if (!source) return null;
    if (typeof source === "string") {
      return { label: source, url: null, accessedAt: null };
    }
    return {
      label: source.label || source.name || source.title || null,
      url: source.url || source.href || null,
      accessedAt: source.accessedAt || source.date || null
    };
  }

  function buildContext(spec) {
    spec = spec || {};
    return {
      provenance: pickEnum(spec.provenance, PROVENANCE, "educational"),
      source: normalizeSource(spec.source),
      confidence: spec.confidence || null,
      evidence: spec.evidence || null,
      verification: spec.verification || null,
      uncertainty: spec.uncertainty || null,
      disclaimer: spec.disclaimer || null,
      citation: spec.citation || null
    };
  }

  function fromOipSlice(sliceName, slice, platform) {
    slice = slice || {};
    var defaults = OIP_SLICE_DEFAULTS[sliceName] || {};
    var status = slice.status;
    var provenance = provenanceFromOipStatus(status, sliceName);

    if (sliceName === "weather" && slice.isLive) provenance = "live";
    if (sliceName === "weather" && status === "placeholder") provenance = "placeholder";

    var source = null;
    if (slice.source) source = { label: slice.source };
    else if (sliceName === "weather" && slice.isLive && platform && platform.weatherRef && platform.weatherRef.meta) {
      source = { label: platform.weatherRef.meta.provider || "open-meteo" };
    } else if (platform && platform.meta && platform.meta.contentBundleId) {
      source = { label: "Regional bundle · " + platform.meta.contentBundleId };
    }

    var ctx = buildContext({
      provenance: provenance,
      source: source,
      uncertainty: status === "placeholder" ? "Preview content — live data not connected" : defaults.uncertainty,
      disclaimer: defaults.disclaimer || null
    });

    if (sliceName === "research" && slice.current && slice.current.source) {
      ctx.source = normalizeSource(slice.current.source);
      if (/placeholder/i.test(String(slice.current.source))) {
        ctx.provenance = "placeholder";
      }
    }

    return ctx;
  }

  function fromOipPackage(platform) {
    if (!platform) return {};
    var map = {};
    ["weather", "daylight", "phenology", "species", "observations", "conservation", "research", "rainfall", "elevation", "geography"].forEach(function (name) {
      map[name] = fromOipSlice(name, platform[name], platform);
    });
    map.meta = buildContext({
      provenance: platform.meta && platform.meta.isFallbackLocation ? "educational" : "educational",
      source: platform.meta && platform.meta.contentBundleId
        ? { label: platform.meta.contentBundleId, accessedAt: platform.meta.assembledAt }
        : null,
      uncertainty: platform.meta && platform.meta.isFallbackLocation
        ? "Location approximate — editorial bundle may not match your county"
        : null
    });
    return map;
  }

  function annotatePackage(platform) {
    if (!platform) return platform;
    platform.integrity = fromOipPackage(platform);
    return platform;
  }

  function fromObservation(obs) {
    var O = global.WDS && global.WDS.observations;
    if (O && O.normalizeObservation) obs = O.normalizeObservation(obs);
    if (!obs) return buildContext({ provenance: "observation" });

    var provenance = "observation";
    if (obs.verification && obs.verification.status === "research_confirmed") {
      provenance = "verified";
    } else if (obs.verification && ["expert", "community"].indexOf(obs.verification.status) >= 0) {
      provenance = "verified";
    }

    return buildContext({
      provenance: provenance,
      source: obs.observer && !obs.observer.anonymous && obs.observer.displayName
        ? { label: obs.observer.displayName }
        : null,
      confidence: obs.record && obs.record.confidence,
      evidence: obs.record && obs.record.evidenceQuality,
      verification: obs.verification && obs.verification.status,
      uncertainty: obs.location && obs.location.privacy && obs.location.privacy.precision !== "exact"
        ? "Location shared at " + obs.location.privacy.precision + " precision"
        : null,
      citation: obs.license && obs.license.code !== "waypoint-private"
        ? { label: obs.license.code, url: obs.license.url }
        : null
    });
  }

  function renderBadge(kind, options) {
    options = options || {};
    var meta = provenanceMeta(kind);
    var text = options.label || meta.label;
    var title = options.title || meta.title;
    var tag = options.tag || "span";
    return (
      "<" + tag + ' class="wds-prov ' + meta.css + (options.className ? " " + options.className : "") + '"' +
      ' title="' + escapeHtml(title) + '">' +
      escapeHtml(text) +
      "</" + tag + ">"
    );
  }

  function renderStrip(kind, detail, options) {
    options = options || {};
    var badge = renderBadge(kind, options);
    if (!detail) return '<p class="wds-ri-footnote">' + badge + "</p>";
    return (
      '<p class="wds-ri-footnote' + (options.className ? " " + escapeHtml(options.className) : "") + '">' +
      badge +
      '<span class="wds-ri-footnote__text">' + escapeHtml(detail) + "</span></p>"
    );
  }

  function renderMetaChip(label, title, className) {
    if (!label) return "";
    return (
      '<span class="wds-ri-meta' + (className ? " " + className : "") + '"' +
      (title ? ' title="' + escapeHtml(title) + '"' : "") + ">" +
      escapeHtml(label) +
      "</span>"
    );
  }

  function renderConfidence(level, options) {
    options = options || {};
    var meta = CONFIDENCE_LABELS[level];
    if (!meta || !meta.label) return "";
    if (options.compact === false) {
      return '<span class="wds-ri-confidence" title="' + escapeHtml(meta.title) + '">Confidence: ' + escapeHtml(meta.label) + "</span>";
    }
    return renderMetaChip(meta.label, meta.title, "wds-ri-meta--confidence");
  }

  function renderEvidence(level, options) {
    options = options || {};
    var meta = EVIDENCE_LABELS[level];
    if (!meta || !meta.label) return "";
    if (options.compact === false) {
      return '<span class="wds-ri-evidence" title="' + escapeHtml(meta.title) + '">Evidence: ' + escapeHtml(meta.label) + "</span>";
    }
    return renderMetaChip(meta.label, meta.title, "wds-ri-meta--evidence");
  }

  function renderVerification(status, options) {
    options = options || {};
    var meta = VERIFICATION_LABELS[status];
    if (!meta || !meta.label) return "";
    if (status === "unverified" && options.hideUnverified) return "";
    return renderMetaChip(meta.label, meta.title, "wds-ri-meta--verification");
  }

  function renderCitation(source, options) {
    options = options || {};
    source = normalizeSource(source);
    if (!source || !source.label) return "";
    var text = options.prefix ? options.prefix + source.label : source.label;
    if (source.url) {
      return (
        '<cite class="wds-ri-citation">' +
        (options.prefix ? escapeHtml(options.prefix) : "") +
        '<a href="' + escapeHtml(source.url) + '" rel="noopener noreferrer">' + escapeHtml(source.label) + "</a>" +
        (source.accessedAt ? '<span class="wds-ri-citation__date"> · ' + escapeHtml(source.accessedAt) + "</span>" : "") +
        "</cite>"
      );
    }
    return '<cite class="wds-ri-citation">' + escapeHtml(text) + "</cite>";
  }

  function renderUncertainty(text, options) {
    options = options || {};
    if (!text) return "";
    var prefix = options.prefix !== false ? "~ " : "";
    return (
      '<span class="wds-ri-uncertainty" title="' + escapeHtml(text) + '">' +
      escapeHtml(prefix + text) +
      "</span>"
    );
  }

  function renderDisclaimer(options) {
    options = options || {};
    var kind = options.provenance || options.kind || "educational";
    var text = options.text || options.disclaimer;
    if (!text) {
      var meta = provenanceMeta(kind);
      text = meta.title;
    }
    var badge = options.showBadge === false ? "" : renderBadge(kind, { className: "wds-ri-disclaimer__badge" });
    return (
      '<p class="wds-ri-disclaimer" role="note">' +
      badge +
      '<span class="wds-ri-disclaimer__text">' + escapeHtml(text) + "</span>" +
      "</p>"
    );
  }

  function renderFootnote(ctx, options) {
    options = options || {};
    ctx = ctx && ctx.provenance ? ctx : buildContext(ctx || {});
    var parts = [];
    var showBadge = options.showBadge !== false;

    if (showBadge) parts.push(renderBadge(ctx.provenance, { tag: "span" }));

    if (ctx.disclaimer) {
      parts.push('<span class="wds-ri-footnote__text">' + escapeHtml(ctx.disclaimer) + "</span>");
    } else if (ctx.uncertainty) {
      parts.push('<span class="wds-ri-footnote__text wds-ri-footnote__text--uncertain">' + escapeHtml(ctx.uncertainty) + "</span>");
    } else if (ctx.source && ctx.source.label && options.showSource !== false) {
      parts.push('<span class="wds-ri-footnote__text">' + escapeHtml(ctx.source.label) + "</span>");
    }

    var meta = [];
    if (options.showConfidence !== false && ctx.confidence) meta.push(renderConfidence(ctx.confidence));
    if (options.showEvidence !== false && ctx.evidence) meta.push(renderEvidence(ctx.evidence));
    if (options.showVerification !== false && ctx.verification) {
      meta.push(renderVerification(ctx.verification, { hideUnverified: options.hideUnverified }));
    }
    if (meta.length) {
      parts.push('<span class="wds-ri-footnote__meta">' + meta.filter(Boolean).join("") + "</span>");
    }

    if (!parts.length) return "";

    return (
      '<p class="wds-ri-footnote' + (options.className ? " " + escapeHtml(options.className) : "") + '" role="note">' +
      parts.join("") +
      "</p>"
    );
  }

  function renderBlock(ctx, options) {
    options = options || {};
    var html = renderFootnote(ctx, options);
    if (ctx.citation || (ctx.source && options.citation !== false)) {
      html += renderCitation(ctx.citation || ctx.source, { prefix: options.citationPrefix || "Source: " });
    }
    return html;
  }

  function dashboardTag(card) {
    if (!card) return { label: "Editorial", className: "wce-dash-card__tag--regional", kind: "educational" };
    if (card.id === "weather" || card.id === "sun-moon") {
      if (card.source === "live") {
        return { label: "Live forecast", className: "wce-dash-card__tag--live", kind: "live" };
      }
      return { label: "Loading", className: "wce-dash-card__tag--soon", kind: "placeholder" };
    }
    if (card.source === "placeholder") {
      return { label: "Preview", className: "wce-dash-card__tag--soon", kind: "placeholder" };
    }
    if (card.source === "live") {
      return { label: "Live forecast", className: "wce-dash-card__tag--live", kind: "live" };
    }
    if (card.sourceLabel) {
      return { label: card.sourceLabel, className: "wce-dash-card__tag--regional", kind: "educational" };
    }
    return { label: "Editorial", className: "wce-dash-card__tag--regional", kind: "educational" };
  }

  function humanizeSpeciesStatus(status) {
    if (status == null || status === "") return "";
    var key = String(status).toLowerCase();
    if (SPECIES_STATUS[key]) return SPECIES_STATUS[key];
    return String(status).replace(/-/g, " ");
  }

  function groupLabel(key) {
    return GROUP_LABELS[key] || key;
  }

  function readinessBandLabel(level) {
    if (global.ForageCastHeat && global.ForageCastHeat.bandLabel) {
      return global.ForageCastHeat.bandLabel(level);
    }
    if (level === "high") return "Stronger signal";
    if (level === "low") return "Weaker signal";
    return "Mixed signal";
  }

  function citizenScienceNote(text) {
    var prefix = "Coming soon — observation submission not yet available. ";
    if (!text) return prefix.trim();
    return prefix + text;
  }

  function labelConfidence(level) {
    var m = CONFIDENCE_LABELS[level];
    return m && m.label ? m.label : null;
  }

  function labelEvidence(level) {
    var m = EVIDENCE_LABELS[level];
    return m && m.label ? m.label : null;
  }

  function labelVerification(status) {
    var m = VERIFICATION_LABELS[status];
    return m && m.label ? m.label : null;
  }

  var api = {
    VERSION: VERSION,
    PROVENANCE: PROVENANCE,
    KINDS: PROVENANCE,
    CONFIDENCE_LABELS: CONFIDENCE_LABELS,
    EVIDENCE_LABELS: EVIDENCE_LABELS,
    VERIFICATION_LABELS: VERIFICATION_LABELS,
    SPECIES_STATUS: SPECIES_STATUS,
    GROUP_LABELS: GROUP_LABELS,
    buildContext: buildContext,
    provenanceFromOipStatus: provenanceFromOipStatus,
    fromOipSlice: fromOipSlice,
    fromOipPackage: fromOipPackage,
    annotatePackage: annotatePackage,
    fromObservation: fromObservation,
    renderBadge: renderBadge,
    renderStrip: renderStrip,
    renderConfidence: renderConfidence,
    renderEvidence: renderEvidence,
    renderVerification: renderVerification,
    renderCitation: renderCitation,
    renderUncertainty: renderUncertainty,
    renderDisclaimer: renderDisclaimer,
    renderFootnote: renderFootnote,
    renderBlock: renderBlock,
    labelConfidence: labelConfidence,
    labelEvidence: labelEvidence,
    labelVerification: labelVerification,
    humanizeSpeciesStatus: humanizeSpeciesStatus,
    groupLabel: groupLabel,
    readinessBandLabel: readinessBandLabel,
    dashboardTag: dashboardTag,
    citizenScienceNote: citizenScienceNote,
    kindMeta: provenanceMeta
  };

  global.WDS = global.WDS || {};
  global.WDS.researchIntegrity = api;
})(window);
