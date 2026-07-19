"""
Local heuristic image analysis (no cloud AI).

Uses Pillow + numpy-free stats from pixel samples.
Estimates technical qualities and content tags with confidence scores.
Never permanently rejects — results are advisory for owner review.
"""
from __future__ import annotations

import logging
import math
import subprocess
import tempfile
from pathlib import Path
from typing import Any

log = logging.getLogger("photo_pipeline.analyze")

CONTENT_TAGS = (
    "sky",
    "water",
    "flowers",
    "mushrooms",
    "trees",
    "birds",
    "mammals",
    "macro",
    "landscape",
    "night",
    "weather",
    "trail",
    "river",
    "lake",
    "mountain",
    "people",
    "vehicles",
    "buildings",
    "dogs",
    "screenshots",
    "documents",
)

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".heif", ".hif", ".webp", ".tif", ".tiff"}
RAW_EXTS = {".arw", ".cr2", ".nef", ".dng", ".orf", ".rw2"}
VIDEO_EXTS = {".mov", ".mp4"}


def analyze_image(path: Path, metadata: dict | None = None) -> dict[str, Any]:
    """
    Analyze a still image (or RAW via embedded preview).
    Returns structured estimates with confidences and explanations.
    """
    path = Path(path)
    metadata = metadata or {}
    ext = path.suffix.lower()

    result: dict[str, Any] = {
        "engine": "waypoint-local-heuristics-v1",
        "source": str(path),
        "analyzable": False,
        "technical": {},
        "composition": {},
        "content": {},
        "notes": [],
    }

    if ext in VIDEO_EXTS:
        result["notes"].append("Video file — still analysis skipped; review manually.")
        result["content"] = {t: {"score": 0.0, "confidence": 0.0} for t in CONTENT_TAGS}
        return result

    work = _openable_image_path(path, ext)
    if work is None:
        result["notes"].append(
            "Could not open image for analysis (RAW without preview or unsupported)."
        )
        result["content"] = {t: {"score": 0.0, "confidence": 0.0} for t in CONTENT_TAGS}
        return result

    try:
        from PIL import Image, ImageFilter, ImageStat

        with Image.open(work) as im:
            im = im.convert("RGB")
            # Downsample for speed
            max_side = 640
            w, h = im.size
            scale = min(1.0, max_side / max(w, h))
            if scale < 1.0:
                im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.BILINEAR)
            w, h = im.size
            pixels = list(im.getdata())
            n = len(pixels) or 1

            # Luminance / exposure
            luminances = [(0.299 * r + 0.587 * g + 0.114 * b) / 255.0 for r, g, b in pixels]
            mean_l = sum(luminances) / n
            var_l = sum((x - mean_l) ** 2 for x in luminances) / n
            std_l = math.sqrt(var_l)

            # Exposure score: prefer mid-tones, penalize crush/clip
            dark = sum(1 for x in luminances if x < 0.05) / n
            bright = sum(1 for x in luminances if x > 0.95) / n
            exposure_score = max(0.0, min(1.0, 1.0 - dark * 1.5 - bright * 1.5 - abs(mean_l - 0.45) * 0.8))
            exposure_label = "balanced"
            if dark > 0.25:
                exposure_label = "underexposed"
            elif bright > 0.2:
                exposure_label = "overexposed"
            elif mean_l < 0.25:
                exposure_label = "dark"
            elif mean_l > 0.7:
                exposure_label = "bright"

            # Contrast from luminance std
            contrast_score = max(0.0, min(1.0, std_l / 0.28))

            # Sharpness via Laplacian-ish (edge filter variance)
            edges = im.filter(ImageFilter.FIND_EDGES)
            edge_stat = ImageStat.Stat(edges)
            edge_mean = sum(edge_stat.mean) / 3.0
            sharpness = max(0.0, min(1.0, edge_mean / 40.0))
            blur_score = 1.0 - sharpness

            # Noise proxy: high-frequency residual on small patch
            noise = _noise_estimate(im)
            noise_score = max(0.0, min(1.0, noise))

            result["technical"] = {
                "sharpness": {
                    "score": round(sharpness, 3),
                    "confidence": 0.65,
                    "explanation": f"Edge energy ≈ {edge_mean:.1f}; higher usually means sharper detail.",
                },
                "blur": {
                    "score": round(blur_score, 3),
                    "confidence": 0.65,
                    "explanation": "Inverse of sharpness estimate (motion/focus blur proxy).",
                },
                "noise": {
                    "score": round(noise_score, 3),
                    "confidence": 0.45,
                    "explanation": "Local pixel variation residual; elevated ISO often raises this.",
                },
                "exposure": {
                    "score": round(exposure_score, 3),
                    "confidence": 0.7,
                    "label": exposure_label,
                    "mean_luminance": round(mean_l, 3),
                    "clipped_dark_pct": round(dark * 100, 1),
                    "clipped_bright_pct": round(bright * 100, 1),
                    "explanation": f"Histogram suggests {exposure_label} (mean L={mean_l:.2f}).",
                },
                "contrast": {
                    "score": round(contrast_score, 3),
                    "confidence": 0.6,
                    "explanation": f"Luminance std={std_l:.3f}; mid-high contrast usually reads better on web.",
                },
            }

            # Composition heuristics
            third = _rule_of_thirds_interest(luminances, w, h)
            leading = _leading_lines_proxy(edges, w, h)
            subject = max(
                0.0,
                min(1.0, sharpness * 0.5 + third * 0.3 + (1 - noise_score) * 0.2),
            )

            result["composition"] = {
                "composition": {
                    "score": round(third, 3),
                    "confidence": 0.4,
                    "explanation": "Interest near thirds intersections (coarse proxy).",
                },
                "leading_lines": {
                    "score": round(leading, 3),
                    "confidence": 0.35,
                    "explanation": "Directional edge energy suggests line structure.",
                },
                "subject_isolation": {
                    "score": round(subject, 3),
                    "confidence": 0.35,
                    "explanation": "Blend of sharpness, thirds interest, and low noise.",
                },
            }

            # Content tags from color + EXIF cues (not ML classifiers)
            result["content"] = _content_tags(im, luminances, metadata, mean_l, sharpness, w, h)
            result["analyzable"] = True
            result["preview_used"] = str(work) != str(path)
            result["sample_size"] = {"width": w, "height": h}

    except Exception as exc:  # noqa: BLE001
        log.exception("Analysis failed for %s", path)
        result["notes"].append(f"Analysis error: {exc}")
        result["content"] = {t: {"score": 0.0, "confidence": 0.0} for t in CONTENT_TAGS}
    finally:
        if work and work != path and work.name.startswith("wp_preview_"):
            try:
                work.unlink(missing_ok=True)
            except OSError:
                pass

    return result


def _openable_image_path(path: Path, ext: str) -> Path | None:
    if ext in IMAGE_EXTS:
        return path
    if ext in RAW_EXTS:
        # Extract embedded JPEG via exiftool when available
        preview = _extract_raw_preview(path)
        return preview
    return None


def _extract_raw_preview(path: Path) -> Path | None:
    try:
        out = Path(tempfile.gettempdir()) / f"wp_preview_{path.stem}.jpg"
        for tag in ("PreviewImage", "JpgFromRaw", "ThumbnailImage"):
            proc = subprocess.run(
                ["exiftool", "-b", f"-{tag}", str(path)],
                check=False,
                capture_output=True,
                timeout=60,
            )
            if proc.returncode == 0 and proc.stdout and len(proc.stdout) > 1000:
                out.write_bytes(proc.stdout)
                return out
    except (OSError, subprocess.TimeoutExpired) as exc:
        log.debug("RAW preview extract failed: %s", exc)
    return None


def _noise_estimate(im) -> float:
    from PIL import Image, ImageFilter

    small = im.resize((128, 128), Image.Resampling.BILINEAR)
    blurred = small.filter(ImageFilter.GaussianBlur(radius=1.2))
    a = list(small.getdata())
    b = list(blurred.getdata())
    n = len(a) or 1
    diff = sum(
        abs(a[i][0] - b[i][0]) + abs(a[i][1] - b[i][1]) + abs(a[i][2] - b[i][2])
        for i in range(n)
    ) / (n * 3 * 255)
    return min(1.0, diff * 8.0)


def _rule_of_thirds_interest(luminances: list[float], w: int, h: int) -> float:
    if w < 3 or h < 3:
        return 0.3
    # Sample 4 thirds intersections — local contrast around them
    xs = [w // 3, 2 * w // 3]
    ys = [h // 3, 2 * h // 3]
    scores = []
    for y in ys:
        for x in xs:
            idx = y * w + x
            if 0 <= idx < len(luminances):
                # neighborhood variance proxy: single pixel vs mean (weak) — use nearby
                neigh = []
                for dy in (-2, 0, 2):
                    for dx in (-2, 0, 2):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            neigh.append(luminances[ny * w + nx])
                if neigh:
                    m = sum(neigh) / len(neigh)
                    v = sum((v - m) ** 2 for v in neigh) / len(neigh)
                    scores.append(min(1.0, math.sqrt(v) * 4))
    return sum(scores) / len(scores) if scores else 0.3


def _leading_lines_proxy(edges_im, w: int, h: int) -> float:
    from PIL import ImageStat

    # Compare edge energy in center band vs edges — directional bias crude proxy
    stat = ImageStat.Stat(edges_im)
    mean = sum(stat.mean) / 3.0
    return max(0.0, min(1.0, mean / 35.0))


def _content_tags(im, luminances, metadata: dict, mean_l: float, sharpness: float, w: int, h: int) -> dict:
    from PIL import ImageStat

    stat = ImageStat.Stat(im)
    r, g, b = stat.mean
    # Hue proxies
    blue_dom = b > r * 1.15 and b > g * 1.05
    green_dom = g > r * 1.1 and g > b * 1.05
    warm = r > g * 1.05 and r > b * 1.1

    top = luminances[: max(1, (h // 3) * w)]
    top_mean = sum(top) / len(top) if top else mean_l
    bottom = luminances[-(h // 3) * w :] if h >= 3 else luminances
    bottom_mean = sum(bottom) / len(bottom) if bottom else mean_l

    aspect = w / max(h, 1)
    landscape_aspect = aspect > 1.2

    tags: dict[str, dict[str, float | str]] = {}

    def put(name: str, score: float, conf: float, why: str) -> None:
        tags[name] = {
            "score": round(max(0.0, min(1.0, score)), 3),
            "confidence": round(conf, 3),
            "explanation": why,
        }

    put("sky", 0.75 if (blue_dom and top_mean > mean_l + 0.05) else (0.4 if blue_dom else 0.15), 0.4, "Blue dominance in upper third.")
    put("water", 0.55 if blue_dom and bottom_mean > 0.35 else 0.12, 0.3, "Blue + brighter lower third.")
    put("trees", 0.65 if green_dom else 0.2, 0.35, "Green channel dominance.")
    put("flowers", 0.5 if warm and sharpness > 0.4 else 0.1, 0.25, "Warm colors + relative sharpness.")
    put("mushrooms", 0.2 if warm and mean_l < 0.45 else 0.05, 0.15, "Weak warm/dark heuristic only.")
    put("birds", 0.15, 0.1, "No local bird detector — low default; review manually.")
    put("mammals", 0.12, 0.1, "No local mammal detector — low default.")
    put("dogs", 0.1, 0.1, "No local dog detector — low default.")
    put("macro", 0.55 if sharpness > 0.55 and not landscape_aspect else 0.2, 0.3, "High sharpness + non-wide aspect.")
    put("landscape", 0.7 if landscape_aspect and (blue_dom or green_dom) else 0.25, 0.45, "Wide aspect + nature color cues.")
    put("night", 0.8 if mean_l < 0.18 else 0.1, 0.55, "Very low mean luminance.")
    put("weather", 0.35 if mean_l > 0.55 and std_soft(luminances) < 0.15 else 0.15, 0.2, "Flat bright histogram may indicate overcast.")
    put("trail", 0.2, 0.1, "Not inferred from pixels alone.")
    put("river", 0.3 if blue_dom and landscape_aspect else 0.1, 0.2, "Water-like colors in landscape.")
    put("lake", 0.35 if blue_dom and bottom_mean > top_mean else 0.1, 0.2, "Blue mass toward bottom.")
    put("mountain", 0.25 if landscape_aspect and top_mean > bottom_mean else 0.1, 0.2, "Brighter upper frame in wide shots.")
    put("people", 0.15, 0.1, "No face model in V1 — privacy module may flag separately.")
    put("vehicles", 0.1, 0.1, "Not inferred.")
    put("buildings", 0.2 if not green_dom and std_soft(luminances) > 0.2 else 0.1, 0.15, "High contrast non-green scenes.")
    # Screenshots / documents from EXIF software or very sharp flat UI colors
    soft = str((metadata or {}).get("raw", {}).get("Software") or "")
    is_screen = any(x in soft.lower() for x in ("screenshot", "snipping", "grab"))
    put("screenshots", 0.9 if is_screen else 0.05, 0.7 if is_screen else 0.2, "Software tag or low default.")
    put("documents", 0.4 if mean_l > 0.75 and std_soft(luminances) < 0.12 else 0.05, 0.25, "Very bright low-contrast frame.")

    # Focal length cue for macro
    fl = metadata.get("focal_length") if metadata else None
    if isinstance(fl, (int, float)) and fl > 90 and sharpness > 0.5:
        tags["macro"]["score"] = round(min(1.0, float(tags["macro"]["score"]) + 0.15), 3)

    return tags


def std_soft(values: list[float]) -> float:
    if not values:
        return 0.0
    m = sum(values) / len(values)
    return math.sqrt(sum((x - m) ** 2 for x in values) / len(values))
