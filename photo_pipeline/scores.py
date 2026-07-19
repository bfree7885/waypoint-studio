"""
Explainable quality scores — no mysterious single AI number.
"""
from __future__ import annotations

from typing import Any


def score_image(analysis: dict, metadata: dict | None = None) -> dict[str, Any]:
    tech = analysis.get("technical") or {}
    comp = analysis.get("composition") or {}
    content = analysis.get("content") or {}
    metadata = metadata or {}

    def s(block: dict, key: str) -> float:
        return float((block.get(key) or {}).get("score") or 0)

    sharpness = s(tech, "sharpness")
    blur = s(tech, "blur")
    noise = s(tech, "noise")
    exposure = s(tech, "exposure")
    contrast = s(tech, "contrast")
    composition = s(comp, "composition")
    leading = s(comp, "leading_lines")
    isolation = s(comp, "subject_isolation")

    technical = (
        sharpness * 0.3
        + (1 - blur) * 0.1
        + (1 - noise) * 0.15
        + exposure * 0.25
        + contrast * 0.2
    )
    artistic = composition * 0.4 + leading * 0.25 + isolation * 0.35

    educational_tags = ("mushrooms", "flowers", "birds", "mammals", "trees", "macro", "weather")
    edu_raw = max(float((content.get(t) or {}).get("score") or 0) for t in educational_tags)
    educational = edu_raw * 0.7 + sharpness * 0.3

    website = technical * 0.55 + artistic * 0.25 + exposure * 0.2
    # Backgrounds prefer softer / wider / less busy — favor landscape + mid sharpness
    landscape = float((content.get("landscape") or {}).get("score") or 0)
    background = landscape * 0.45 + (1 - isolation) * 0.2 + exposure * 0.2 + contrast * 0.15
    # Heroes need strong tech + composition + landscape/sky
    sky = float((content.get("sky") or {}).get("score") or 0)
    hero = technical * 0.4 + artistic * 0.3 + max(landscape, sky) * 0.3
    article = educational * 0.5 + technical * 0.3 + artistic * 0.2

    dims = metadata.get("dimensions") or {}
    w, h = dims.get("width") or 0, dims.get("height") or 0
    if w and h and max(w, h) < 1200:
        website *= 0.85
        hero *= 0.7
        note_res = "Resolution below typical web-hero size."
    else:
        note_res = "Resolution adequate for most web uses." if w else "Dimensions unknown."

    def pack(name: str, value: float, explanation: str) -> dict[str, Any]:
        return {
            "score": round(max(0.0, min(1.0, value)), 3),
            "explanation": explanation,
            "scale": "0–1 (higher is better for this use)",
        }

    return {
        "technical": pack(
            "technical",
            technical,
            f"Weighted sharpness, exposure, contrast, and inverse noise/blur. {note_res}",
        ),
        "artistic": pack(
            "artistic",
            artistic,
            "Composition thirds interest, leading-line proxy, and subject isolation heuristics.",
        ),
        "educational": pack(
            "educational",
            educational,
            "Elevated when nature/subject tags (flora/fauna/macro/weather) combine with sharpness.",
        ),
        "website_suitability": pack(
            "website_suitability",
            website,
            "Blend of technical quality, artistic heuristics, and exposure balance for general site use.",
        ),
        "background_suitability": pack(
            "background_suitability",
            background,
            "Favors landscape/sky atmosphere and less subject isolation (text-friendly backgrounds).",
        ),
        "hero_suitability": pack(
            "hero_suitability",
            hero,
            "Requires strong technical + composition and landscape/sky presence.",
        ),
        "article_suitability": pack(
            "article_suitability",
            article,
            "Educational subject cues plus solid technical/artistic basics for inline illustration.",
        ),
        "method": "waypoint-explainable-scores-v1",
    }
