# Hidden Landscapes — Science Audit

**Date:** 2026-08-16  
**Product:** Hidden Landscapes + Animal Vision (Scenes EXPLORE)

For each feature: input data → transform → can claim → cannot claim.

## Epistemic vocabulary

| Label | Meaning |
|-------|---------|
| MEASURED | Present in file/EXIF when available |
| COMPUTED | Derived from RGB pixels |
| SIMULATED | Research-informed human-viewable approximation |
| INFERRED | Estimated from cues; not measured |
| UNAVAILABLE | Required signal absent from RGB source |

---

## Light — Luminance

| | |
|--|--|
| **Input** | Decoded sRGB pixels |
| **Transform** | sRGB → linear → Rec. 709 relative luminance → display gamma grayscale |
| **Can claim** | COMPUTED relative brightness structure of this file |
| **Cannot claim** | Scene luminance in cd/m², RAW highlight recovery, illuminant spectra |

## Light — Tonal structure

| | |
|--|--|
| **Input** | Luminance histogram of JPEG/PNG/WebP decode |
| **Transform** | Zone classification + near-clip count (Y ≥ 0.98) |
| **Can claim** | COMPUTED distribution within this file |
| **Cannot claim** | RAW recoverability, sensor full-well capacity |

## Light — Concentration

| | |
|--|--|
| **Input** | Luminance field |
| **Transform** | Soft spatial emphasis of high-Y regions |
| **Can claim** | COMPUTED where bright energy gathers in-frame |
| **Cannot claim** | Light direction as a physical vector field |

## Color — Families / warm-cool / saturation

| | |
|--|--|
| **Input** | RGB → HSL |
| **Transform** | Hue family histograms, warm/cool split, saturation map |
| **Can claim** | COMPUTED chromatic organization of the photograph |
| **Cannot claim** | Named real-world materials, palette “recommendations,” perceptual appearance under different illuminants |

## Structure — Edges / texture / local contrast

| | |
|--|--|
| **Input** | Luminance |
| **Transform** | Sobel magnitude; local variance; local mean deviation |
| **Can claim** | COMPUTED spatial change / roughness proxies |
| **Cannot claim** | Semantic object detection, true material ID |

## Structure — Estimated depth

| | |
|--|--|
| **Input** | Luminance + vertical position |
| **Transform** | Heuristic near/far cue |
| **Can claim** | INFERRED depth *cue* only |
| **Cannot claim** | Metric depth, stereo/LiDAR depth |

## Animal Vision — Deer / Canine

| | |
|--|--|
| **Input** | RGB photograph |
| **Transform** | sRGB → XYZ → HPE LMS → dichromat plane projection (Brettel-inspired) with species cone assumptions → sRGB; mild acuity soften |
| **Can claim** | SIMULATED dichromatic color approximation grounded in cited research |
| **Cannot claim** | Exact subjective experience, FOV panorama, motion vision, UV |

## Animal Vision — Bee UV / Bird UV

| | |
|--|--|
| **Input** | RGB only (no UV channel) |
| **Transform** | None on user pixels |
| **Can claim** | UNAVAILABLE — educational honesty |
| **Cannot claim** | Reconstructed nectar guides, UV plumage, “bee photo” of the user’s flower |

## Spectral (UV / IR / thermal / polarization / hyperspectral)

| | |
|--|--|
| **Input** | Ordinary RGB |
| **Transform** | None presented as capture |
| **Can claim** | UNAVAILABLE from this source |
| **Cannot claim** | Any “true” beyond-visible photograph derived only from RGB |

## Auto Edit relationship

Analytic defaults use **Original**. Waypoint Edit is optional and labeled when selected.

## Privacy

All analysis runs locally in-browser. No silent upload. No cloud vision API in this attack.
