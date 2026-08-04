/**
 * Photo Coach 2.0 — deterministic fixtures for local tests (no AI, no network).
 */
(function (global) {
  "use strict";

  var FIXTURE_EXIF = {
    make: "Sony",
    model: "ILCE-6700",
    lens: "E 18-135mm F3.5-5.6 OSS",
    focalLengthMm: 35,
    fNumber: 5.6,
    iso: 400,
    exposureTimeSec: 0.008,
    dateTimeOriginal: "2026:07:20 06:42:11",
    orientation: "landscape",
    width: 4000,
    height: 3000
  };

  /**
   * Complete observation set covering every review section with region/EXIF cites.
   */
  function woodlandDawnObservations() {
    return {
      overallImpression: {
        summary: "A quiet woodland dawn with a clear subject and soft directional light.",
        items: [
          {
            text: "The frame feels calm and intentional — mist and a single tree hold the eye.",
            zone: "center",
            regionLabel: "central tree",
            confidence: 0.82
          }
        ]
      },
      composition: {
        summary: "Subject sits near the intersection of thirds with breathing room on the left.",
        items: [
          {
            text: "The tree anchors the right-center; negative space on the left supports a quiet read.",
            zone: "right-third",
            regionLabel: "subject tree",
            confidence: 0.78
          },
          {
            text: "Horizon line sits in the lower third, keeping sky weight light.",
            zone: "horizon",
            regionLabel: "horizon band",
            confidence: 0.74
          }
        ]
      },
      light: {
        summary: "Side-lit mist softens contrast without flattening the trunk.",
        items: [
          {
            text: "Directional light from camera-left models the trunk; mist lifts midtones.",
            zone: "center",
            regionLabel: "lit trunk",
            exifFields: ["exposureTimeSec", "iso"],
            confidence: 0.8
          }
        ]
      },
      color: {
        summary: "Cool blues in the mist contrast with warmer bark.",
        items: [
          {
            text: "Cool atmospheric blues separate from warmer foreground bark tones.",
            zone: "background",
            regionLabel: "mist backdrop",
            confidence: 0.76
          }
        ]
      },
      subject: {
        summary: "A single dominant tree reads clearly against the mist.",
        items: [
          {
            text: "Isolation is strong — competing stems are soft or cropped out.",
            zone: "center",
            regionLabel: "primary subject",
            confidence: 0.84
          }
        ]
      },
      story: {
        summary: "The photograph suggests early arrival and patience more than drama.",
        items: [
          {
            text: "Mist and low sun imply a short window — the story is presence at first light.",
            zone: "upper-third",
            regionLabel: "mist canopy",
            exifFields: ["dateTimeOriginal"],
            confidence: 0.7
          }
        ]
      },
      technicalQuality: {
        summary: "Exposure and sharpness are sound for the conditions.",
        items: [
          {
            text: "1/125s at ISO 400 and f/5.6 is a sensible handheld compromise in dim woods.",
            zone: "full-frame",
            regionLabel: "full frame",
            exifFields: ["exposureTimeSec", "iso", "fNumber", "focalLengthMm"],
            confidence: 0.88
          }
        ]
      },
      whatWorks: {
        summary: "Clear subject, supportive negative space, and coherent cool/warm palette.",
        items: [
          {
            text: "Subject isolation against mist works — the eye knows where to rest.",
            zone: "center",
            regionLabel: "subject",
            confidence: 0.85
          },
          {
            text: "Color temperature split between mist and bark adds quiet depth.",
            zone: "background",
            regionLabel: "atmosphere",
            confidence: 0.77
          }
        ]
      },
      whatWeakensIt: {
        summary: "A bright corner and slight foreground clutter compete for attention.",
        items: [
          {
            text: "A bright patch near the upper-left edge pulls away from the tree.",
            zone: "upper-left",
            regionLabel: "bright edge",
            confidence: 0.72
          },
          {
            text: "Low fern tips along the bottom edge add mild visual noise.",
            zone: "lower-third",
            regionLabel: "foreground edge",
            confidence: 0.68
          }
        ]
      },
      suggestedEdits: {
        summary: "Gentle crop and local darkening — guidance only, not pixel edits.",
        items: [
          {
            text: "Consider a slight crop from the left to reduce the bright edge pull.",
            zone: "left-third",
            regionLabel: "left margin",
            confidence: 0.71,
            actionable: true
          },
          {
            text: "A soft vignette or local darken on the upper-left highlight would re-center attention.",
            zone: "upper-left",
            regionLabel: "bright corner",
            confidence: 0.69,
            actionable: true
          }
        ]
      },
      whatToPracticeNext: {
        summary: "Practice edge control and pre-visualizing negative space.",
        items: [
          {
            text: "Before the next mist shoot, scan all four edges for bright distractions before pressing the shutter.",
            zone: "edges",
            regionLabel: "frame edges",
            confidence: 0.8,
            actionable: true
          },
          {
            text: "Try one frame at a slightly longer focal length to simplify competing stems.",
            zone: "full-frame",
            regionLabel: "full frame",
            exifFields: ["focalLengthMm"],
            confidence: 0.75,
            actionable: true
          }
        ]
      }
    };
  }

  function sampleImageContext(overrides) {
    overrides = overrides || {};
    return {
      imageId: overrides.imageId || "fixture-woodland-dawn",
      imageName: overrides.imageName || "woodland-dawn.jpg",
      exif: overrides.exif || Object.assign({}, FIXTURE_EXIF),
      observations: overrides.observations || woodlandDawnObservations(),
      isSample: overrides.isSample !== false,
      isPlaceholder: !!overrides.isPlaceholder
    };
  }

  global.WaypointPhotoCoach2Fixtures = {
    FIXTURE_EXIF: FIXTURE_EXIF,
    woodlandDawnObservations: woodlandDawnObservations,
    sampleImageContext: sampleImageContext
  };
})(typeof window !== "undefined" ? window : globalThis);
