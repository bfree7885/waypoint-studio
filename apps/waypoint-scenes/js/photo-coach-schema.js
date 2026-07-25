/**
 * Photo Coach — structured critique schema (v2).
 * AI analysis engine plugs in via analyze(file, metadata) → critique.
 */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = "2.1.0";

  var ENGINE_STATUS = {
    disconnected: "disconnected",
    analyzing: "analyzing",
    ready: "ready",
    error: "error"
  };

  function feedbackBlock(summary, strengths, improvements, why) {
    return {
      summary: summary || null,
      strengths: strengths || [],
      improvements: improvements || [],
      why: why || null
    };
  }

  function emptyCritique() {
    return {
      version: SCHEMA_VERSION,
      engineStatus: ENGINE_STATUS.disconnected,
      isSample: false,
      analyzedAt: null,
      imageName: null,
      captureMetadata: null,
      overallScore: null,
      overallAssessment: null,
      portfolioRecommendation: null,
      printRecommendation: null,
      composition: null,
      lighting: null,
      color: null,
      exposure: null,
      technical: null,
      sharpness: null,
      noise: null,
      storytelling: null,
      subject: null,
      foreground: null,
      background: null,
      distractions: [],
      suggestedCrop: null,
      editRecipe: [],
      editIntelligence: null,
      outdoorContext: null,
      learningNote: null,
      nextObservation: null,
      fieldSuggestion: null,
      /** @deprecated consumer alias — prefer nextObservation */
      fieldAssignment: null,
      nextShootChallenge: null
    };
  }

  function sampleCritique(imageName, exif, outdoorContext) {
    var Demo = global.WaypointPhotoCoachDemo;
    if (Demo && Demo.analyzeFromSignals) {
      var signals = {
        width: 4000, height: 3000, aspectRatio: 4 / 3, orientation: "landscape",
        brightness: 120, contrast: 45, warmth: 0.15, coolness: 0.08,
        darkFraction: 0.18, brightFraction: 0.03, edgeDensity: 0.1,
        vignetteLeft: 0.05, vignetteRight: 0.05, skyBrightness: 0.3, dominantWarm: true
      };
      return Demo.analyzeFromSignals(signals, { name: imageName }, exif, outdoorContext);
    }
    return emptyCritique();
  }

  global.WaypointPhotoCoachSchema = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    ENGINE_STATUS: ENGINE_STATUS,
    emptyCritique: emptyCritique,
    sampleCritique: sampleCritique,
    feedbackBlock: feedbackBlock
  };
})(window);
