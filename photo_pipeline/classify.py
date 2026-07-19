"""
Waypoint destination classification — multi-label suggestions.
"""
from __future__ import annotations

from typing import Any

DESTINATIONS = (
    "Waypoint Studio",
    "Scenes",
    "Fieldry",
    "Sheds",
    "ForageCast",
    "SignalTerrain",
    "Steepleaf",
    "LeafTurn",
    "Hidden Landscapes",
    "Photography Gallery",
    "Dashboard backgrounds",
    "Homepage hero",
    "Article illustration",
)


def classify_destinations(
    analysis: dict,
    scores: dict | None = None,
    privacy: dict | None = None,
) -> dict[str, Any]:
    content = analysis.get("content") or {}
    tech = analysis.get("technical") or {}
    scores = scores or {}
    privacy = privacy or {}

    def c(tag: str) -> float:
        return float((content.get(tag) or {}).get("score") or 0)

    def t(name: str) -> float:
        return float((tech.get(name) or {}).get("score") or 0)

    preds: list[dict[str, Any]] = []

    def add(dest: str, conf: float, why: str) -> None:
        if conf < 0.2:
            return
        preds.append(
            {
                "destination": dest,
                "confidence": round(min(1.0, conf), 3),
                "explanation": why,
            }
        )

    landscape = c("landscape")
    nature = max(c("trees"), c("sky"), c("water"), c("flowers"), c("mushrooms"))
    sharpness = t("sharpness")
    exposure = t("exposure")
    night = c("night")
    mushrooms = c("mushrooms")
    flowers = c("flowers")
    macro = c("macro")
    trail = c("trail")

    web = float((scores.get("website_suitability") or {}).get("score") or (sharpness * 0.5 + exposure * 0.5))
    hero = float((scores.get("hero_suitability") or {}).get("score") or 0)
    bg = float((scores.get("background_suitability") or {}).get("score") or 0)
    art = float((scores.get("article_suitability") or {}).get("score") or 0)

    add("Photography Gallery", 0.35 + nature * 0.4 + sharpness * 0.2, "Nature/technical signals for gallery.")
    add("Scenes", 0.3 + landscape * 0.45, "Landscape cues for Scenes.")
    add("Hidden Landscapes", 0.25 + landscape * 0.4 + night * 0.2, "Atmospheric / landscape leaning.")
    add("Fieldry", 0.2 + max(flowers, mushrooms, macro) * 0.55, "Field / forage / macro cues.")
    add("ForageCast", 0.15 + mushrooms * 0.6 + flowers * 0.3, "Forage-relevant subject cues.")
    add("LeafTurn", 0.2 + flowers * 0.3 + c("trees") * 0.35, "Foliage / seasonal plant cues.")
    add("Steepleaf", 0.2 + c("trees") * 0.4 + macro * 0.2, "Plant / forest detail.")
    add("Sheds", 0.15 + trail * 0.3 + landscape * 0.2, "Outdoor / trail leaning (weak).")
    add("SignalTerrain", 0.15 + (0.25 if bg > 0.55 else 0), "UI background potential.")
    add("Dashboard backgrounds", bg * 0.9, "Background suitability score.")
    add("Homepage hero", hero * 0.95, "Hero suitability score.")
    add("Article illustration", art * 0.9, "Article suitability score.")
    add("Waypoint Studio", 0.25 + web * 0.5, "General website suitability.")

    # Privacy dampens publish destinations
    verdict = privacy.get("verdict")
    if verdict in ("Do not publish", "Needs review"):
        for p in preds:
            if p["destination"] in (
                "Homepage hero",
                "Dashboard backgrounds",
                "Waypoint Studio",
                "Photography Gallery",
            ):
                p["confidence"] = round(p["confidence"] * 0.5, 3)
                p["explanation"] += " (dampened: privacy review needed)"

    preds.sort(key=lambda x: x["confidence"], reverse=True)
    return {
        "destinations": preds,
        "multi_label": True,
        "note": "Suggestions only — owner chooses destinations on approval.",
    }
