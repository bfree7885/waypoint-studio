/**
 * Photo Coach — structured critique schema (v1).
 * AI analysis engine plugs in here; until then use sampleCritique() only when labeled.
 */
(function (global) {
  "use strict";

  var ENGINE_STATUS = {
    disconnected: "disconnected",
    analyzing: "analyzing",
    ready: "ready",
    error: "error"
  };

  function emptyCritique() {
    return {
      version: "1.0.0",
      engineStatus: ENGINE_STATUS.disconnected,
      isSample: false,
      analyzedAt: null,
      imageName: null,
      overallScore: null,
      portfolioRecommendation: null,
      printRecommendation: null,
      composition: null,
      lighting: null,
      color: null,
      technical: null,
      distractions: [],
      suggestedCrop: null,
      editRecipe: [],
      learningNote: null,
      nextShootChallenge: null
    };
  }

  function sampleCritique(imageName) {
    return {
      version: "1.0.0",
      engineStatus: ENGINE_STATUS.disconnected,
      isSample: true,
      analyzedAt: new Date().toISOString(),
      imageName: imageName || "your-photo.jpg",
      overallScore: 72,
      portfolioRecommendation: "Strong keeper for a personal portfolio series — pair with two tighter compositions from the same outing before publishing a gallery.",
      printRecommendation: "Worthy of a test print at 8×12 after a gentle crop; avoid large-format until shadow detail is recovered in post.",
      composition: {
        summary: "The main subject sits on the lower third with a clean leading line, but the far edge competes for attention.",
        strengths: ["Clear visual anchor", "Breathing room in the sky"],
        improvements: ["Crop 8% from the left to remove the bright edge", "Lower the horizon slightly for more foreground weight"]
      },
      lighting: {
        summary: "Directional side light with soft shadow transition — characteristic of late afternoon, not golden hour peak.",
        strengths: ["Natural modeling on the subject", "No blown highlights in the sky"],
        improvements: ["Lift shadow depth slightly without flattening texture", "Watch for cool cast in deep shade"]
      },
      color: {
        summary: "Earth greens and warm highlights are harmonious; minor magenta in deep shadows.",
        strengths: ["Cohesive natural palette", "Sky saturation is restrained"],
        improvements: ["Neutralize shadow cast before global contrast", "Optional subtle split-tone warmth in highlights only"]
      },
      technical: {
        summary: "Sharp on the primary subject; corners soften at 100% — acceptable for web, worth checking for print.",
        strengths: ["Good focus on subject", "Clean noise for outdoor ISO"],
        improvements: ["Verify edge sharpness after crop", "Export sRGB for web; ProPhoto only if printing"]
      },
      distractions: [
        "Bright branch intruding upper right",
        "Small specular hotspot on rock — draw the eye off the subject"
      ],
      suggestedCrop: {
        aspectRatio: "4:5",
        description: "Tighten left and top ~8% to center the subject on a vertical portrait crop.",
        reason: "Removes competing edge brightness and strengthens the leading line."
      },
      editRecipe: [
        { step: "Crop", action: "4:5 vertical, −8% left, −5% top", why: "Removes distractions and strengthens subject dominance." },
        { step: "Exposure", action: "+0.25 EV shadows, −0.15 EV highlights", why: "Recovers depth without a flat HDR look." },
        { step: "White balance", action: "Shadow tint toward green −3", why: "Corrects magenta cast in shade." },
        { step: "Clarity", action: "+8 on subject mask only", why: "Adds presence without crunchy global texture." },
        { step: "Vignette", action: "Subtle −10 post-crop", why: "Keeps the eye on the anchor after crop." }
      ],
      learningNote: "Side light rewards patience — wait for the subject to turn into the light rather than chasing front-lit snapshots.",
      nextShootChallenge: "Shoot the same scene 20 minutes earlier and 20 minutes later; compare how shadow length changes composition."
    };
  }

  global.WaypointPhotoCoachSchema = {
    ENGINE_STATUS: ENGINE_STATUS,
    emptyCritique: emptyCritique,
    sampleCritique: sampleCritique
  };
})(window);
