/**
 * Photo Coach 2.0 — analysis provider interface + placeholder / heuristic providers.
 * Future AI models implement the same analyze(context) → ReviewDocument contract.
 * No LLM, cloud inference, or image generation here.
 */
(function (global) {
  "use strict";

  var Schema = global.WaypointPhotoCoach2Schema;
  var Modules = global.WaypointPhotoCoach2Modules;
  var Fixtures = global.WaypointPhotoCoach2Fixtures;
  if (!Schema || !Modules) {
    throw new Error("Schema and Modules must load before providers.js");
  }

  var registry = Object.create(null);

  function registerProvider(provider) {
    if (!provider || !provider.id || typeof provider.analyze !== "function") {
      throw new Error("Provider requires id and analyze()");
    }
    registry[provider.id] = provider;
    return provider;
  }

  function getProvider(id) {
    return registry[id] || null;
  }

  function listProviders() {
    return Object.keys(registry).map(function (k) { return registry[k]; });
  }

  /**
   * Compose a ReviewDocument from module output + provider metadata.
   */
  function composeReview(context, providerMeta) {
    context = context || {};
    providerMeta = providerMeta || {};
    var sections = Modules.runAll({
      exif: context.exif || null,
      observations: context.observations || {},
      providerId: providerMeta.id || null,
      isPlaceholder: !!context.isPlaceholder || !!providerMeta.isPlaceholder
    });

    var engineStatus = Schema.ENGINE_STATUS.ready;
    if (context.isPlaceholder || providerMeta.isPlaceholder) {
      engineStatus = Schema.ENGINE_STATUS.placeholder;
    }

    return Schema.createReviewDocument({
      imageId: context.imageId || null,
      imageName: context.imageName || null,
      providerId: providerMeta.id || null,
      providerLabel: providerMeta.label || null,
      engineStatus: engineStatus,
      isSample: !!context.isSample,
      isPlaceholder: !!context.isPlaceholder || !!providerMeta.isPlaceholder,
      exif: context.exif || null,
      sections: sections,
      meta: Object.assign({}, context.meta || {}, {
        moduleCount: Modules.MODULE_COUNT,
        providerCapabilities: providerMeta.capabilities || []
      })
    });
  }

  /**
   * Placeholder provider — reserves the full review shape for a future AI model.
   * Returns structured empty/placeholder sections without inventing critique.
   */
  var placeholderProvider = {
    id: "placeholder.ai-ready",
    label: "AI-ready placeholder (no model attached)",
    isPlaceholder: true,
    capabilities: ["review-document", "section-hooks", "evidence-schema"],
    analyze: function (context) {
      context = context || {};
      var emptyObs = {};
      Schema.SECTION_IDS.forEach(function (id) {
        emptyObs[id] = {
          summary: null,
          items: []
        };
      });
      return composeReview({
        imageId: context.imageId || null,
        imageName: context.imageName || null,
        exif: context.exif || null,
        observations: emptyObs,
        isSample: false,
        isPlaceholder: true,
        meta: { reason: "No analysis model configured" }
      }, this);
    }
  };

  /**
   * Deterministic heuristic / fixture provider for local demos and tests.
   */
  var heuristicFixtureProvider = {
    id: "heuristic.fixture",
    label: "On-device heuristic fixture (deterministic)",
    isPlaceholder: false,
    capabilities: ["review-document", "region-evidence", "exif-evidence", "fixtures"],
    analyze: function (context) {
      context = context || {};
      var base = Fixtures
        ? Fixtures.sampleImageContext(context)
        : context;
      // Allow callers to override observations / exif while keeping fixture defaults.
      var merged = {
        imageId: context.imageId || base.imageId,
        imageName: context.imageName || base.imageName,
        exif: context.exif || base.exif,
        observations: context.observations || base.observations,
        isSample: context.isSample != null ? context.isSample : true,
        isPlaceholder: false,
        meta: Object.assign({ fixture: "woodland-dawn" }, context.meta || {})
      };
      return composeReview(merged, this);
    }
  };

  registerProvider(placeholderProvider);
  registerProvider(heuristicFixtureProvider);

  /**
   * Provider contract documentation (runtime-readable).
   */
  var PROVIDER_CONTRACT = {
    version: Schema.SCHEMA_VERSION,
    requiredMethods: ["analyze"],
    analyzeInput: {
      imageId: "string|null",
      imageName: "string|null",
      exif: "object|null",
      observations: "optional map of sectionId → { summary, items[] }",
      isSample: "boolean",
      isPlaceholder: "boolean",
      meta: "object"
    },
    analyzeOutput: "ReviewDocument (WaypointPhotoCoach2Schema)",
    notes: [
      "Do not call remote LLMs from providers in this architecture layer.",
      "Every recommendation should cite a region and/or EXIF field when possible.",
      "Placeholder provider must preserve section order without inventing critique."
    ]
  };

  global.WaypointPhotoCoach2Providers = {
    registerProvider: registerProvider,
    getProvider: getProvider,
    listProviders: listProviders,
    composeReview: composeReview,
    placeholderProvider: placeholderProvider,
    heuristicFixtureProvider: heuristicFixtureProvider,
    PROVIDER_CONTRACT: PROVIDER_CONTRACT,
    DEFAULT_PROVIDER_ID: "heuristic.fixture"
  };
})(typeof window !== "undefined" ? window : globalThis);
