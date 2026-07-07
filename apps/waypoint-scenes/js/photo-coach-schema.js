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
      fieldAssignment: null,
      nextShootChallenge: null
    };
  }

  function sampleCritique(imageName, exif, outdoorContext) {
    var EditIntel = global.WaypointPhotoCoachEditIntel;
    var editPlan = EditIntel && EditIntel.sampleEditPlan ? EditIntel.sampleEditPlan() : null;
    return {
      version: SCHEMA_VERSION,
      engineStatus: ENGINE_STATUS.disconnected,
      isSample: true,
      analyzedAt: new Date().toISOString(),
      imageName: imageName || "your-photo.jpg",
      outdoorContext: outdoorContext || null,
      captureMetadata: exif && exif.hasExif ? {
        source: "EXIF",
        trust: "Live",
        make: exif.make,
        model: exif.model,
        iso: exif.iso,
        focalLengthMm: exif.focalLengthMm,
        exposureTimeSec: exif.exposureTimeSec,
        fNumber: exif.fNumber,
        dateTime: exif.dateTime,
        gps: exif.gps
      } : { source: "None", trust: "Not yet available" },
      overallScore: 72,
      overallAssessment: {
        summary: "A thoughtful outdoor frame with clear subject intent and recoverable shadow detail — ready for portfolio consideration after crop and gentle processing.",
        strengths: ["Cohesive natural mood", "Honest light", "Clear subject anchor"],
        improvements: ["Remove competing edge brightness", "Recover shadow texture", "Tighten crop for print"],
        why: "The image succeeds on atmosphere and subject placement; technical polish and crop will unlock print and series potential."
      },
      portfolioRecommendation: "Strong keeper for a personal portfolio series — pair with two tighter compositions from the same outing before publishing a gallery.",
      printRecommendation: "Worthy of a test print at 8×12 after a gentle crop; avoid large-format until shadow detail is recovered in post.",
      subject: feedbackBlock(
        "A single dominant natural anchor holds the frame — likely rock or tree form.",
        ["Clear silhouette", "Subject separated from sky"],
        ["Move 2 steps left to clear the bright edge from the subject"],
        "Subject isolation is the foundation of outdoor storytelling — viewers need one clear anchor."
      ),
      composition: feedbackBlock(
        "The main subject sits on the lower third with a clean leading line, but the far edge competes for attention.",
        ["Clear visual anchor", "Breathing room in the sky"],
        ["Crop 8% from the left to remove the bright edge", "Lower the horizon slightly for more foreground weight"],
        "Lower-third placement follows classical balance — the competing edge breaks that balance."
      ),
      foreground: feedbackBlock(
        "Foreground texture adds depth but is slightly underexposed.",
        ["Layered depth from near to far"],
        ["Lift shadows locally to reveal texture without flattening"],
        "Foreground anchors create a path into the image — underexposure hides that invitation."
      ),
      background: feedbackBlock(
        "Sky is clean with restrained saturation — supports rather than competes.",
        ["No blown highlights", "Natural gradient"],
        ["Watch for a faint hotspot at upper right after crop"],
        "A quiet background lets the subject carry emotional weight."
      ),
      lighting: feedbackBlock(
        "Directional side light with soft shadow transition — characteristic of late afternoon, not golden hour peak.",
        ["Natural modeling on the subject", "No blown highlights in the sky"],
        ["Lift shadow depth slightly without flattening texture", "Watch for cool cast in deep shade"],
        "Side light reveals form through shadow — front light would flatten the subject."
      ),
      color: feedbackBlock(
        "Earth greens and warm highlights are harmonious; minor magenta in deep shadows.",
        ["Cohesive natural palette", "Sky saturation is restrained"],
        ["Neutralize shadow cast before global contrast", "Optional subtle split-tone warmth in highlights only"],
        "Shadow magenta often comes from open shade under blue sky — correct before global edits."
      ),
      exposure: feedbackBlock(
        "Histogram weighted to midtones; highlight headroom preserved.",
        ["No clipped highlights", "Recoverable shadow detail"],
        ["+0.25 EV in shadows after crop"],
        "Outdoor scenes have wide dynamic range — protecting highlights preserves sky credibility."
      ),
      technical: feedbackBlock(
        "Sharp on the primary subject; corners soften at 100% — acceptable for web, worth checking for print.",
        ["Good focus on subject", "Clean noise for outdoor ISO"],
        ["Verify edge sharpness after crop", "Export sRGB for web; ProPhoto only if printing"],
        "Technical quality gates print size — always verify at 100% on the cropped area."
      ),
      sharpness: feedbackBlock(
        "Acceptable center sharpness; edge falloff visible wide open.",
        ["Subject eyes/anchor in focus"],
        ["Check corners after crop at 100%"],
        "Sharpness requirements rise with print size — web masks mild softness."
      ),
      noise: feedbackBlock(
        "Low visible noise for typical outdoor ISO.",
        ["Clean sky", "Smooth shadow transitions"],
        ["Use luminance NR only in out-of-focus areas if needed"],
        "Noise in focus areas is more distracting than noise in bokeh or sky."
      ),
      storytelling: feedbackBlock(
        "The frame suggests quiet observation rather than spectacle — appropriate for a contemplative series.",
        ["Mood is consistent", "No conflicting elements"],
        ["Add one human-scale element (trail, footprint) to deepen narrative"],
        "Storytelling is what separates a snapshot from a photograph worth keeping."
      ),
      distractions: [
        "Bright branch intruding upper right",
        "Small specular hotspot on rock — draws the eye off the subject"
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
      editIntelligence: editPlan,
      learningNote: "Side light rewards patience — wait for the subject to turn into the light rather than chasing front-lit snapshots.",
      fieldAssignment: "Return to this location at the opposite golden hour and shoot the same composition with the sun behind you — compare how shadow direction changes the story.",
      nextShootChallenge: "Shoot the same scene 20 minutes earlier and 20 minutes later; compare how shadow length changes composition."
    };
  }

  global.WaypointPhotoCoachSchema = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    ENGINE_STATUS: ENGINE_STATUS,
    emptyCritique: emptyCritique,
    sampleCritique: sampleCritique,
    feedbackBlock: feedbackBlock
  };
})(window);
