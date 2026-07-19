"""
Accessibility + editorial text — stored separately for owner editing.

Heuristic / template-based (local). Not a substitute for human captions.
"""
from __future__ import annotations

from typing import Any


SEASONS_N = {
    12: "winter",
    1: "winter",
    2: "winter",
    3: "spring",
    4: "spring",
    5: "spring",
    6: "summer",
    7: "summer",
    8: "summer",
    9: "autumn",
    10: "autumn",
    11: "autumn",
}


def generate_accessibility(
    metadata: dict,
    analysis: dict,
    classification: dict | None = None,
) -> dict[str, Any]:
    content = analysis.get("content") or {}
    camera = metadata.get("camera") or "camera"
    date = metadata.get("date")
    season = _season_from_date(date)
    tod = _time_of_day(date)

    top_tags = sorted(
        (
            (name, float((blob or {}).get("score") or 0))
            for name, blob in content.items()
        ),
        key=lambda x: x[1],
        reverse=True,
    )
    primary = [n for n, s in top_tags if s >= 0.35][:5]
    weather = "overcast or soft light" if float((content.get("weather") or {}).get("score") or 0) > 0.3 else None
    if float((content.get("night") or {}).get("score") or 0) > 0.5:
        weather = "night / low light"

    species = []
    for tag in ("mushrooms", "flowers", "birds", "mammals", "dogs", "trees"):
        if float((content.get(tag) or {}).get("score") or 0) >= 0.4:
            species.append(
                {
                    "guess": tag,
                    "confidence": float((content.get(tag) or {}).get("score") or 0),
                    "note": "Heuristic tag only — not a species ID.",
                }
            )

    subject = ", ".join(primary) if primary else "outdoor scene"
    alt = f"Photograph of {subject}"
    if season:
        alt += f" in {season}"
    if tod:
        alt += f" ({tod})"
    alt += "."

    caption = alt
    if camera and camera != "camera":
        caption += f" Captured with {camera}."
    if weather:
        caption += f" Appears to show {weather}."

    keywords = list(dict.fromkeys(primary + (metadata.get("keywords") or [])))
    if season:
        keywords.append(season)
    if tod:
        keywords.append(tod)

    topics = []
    for dest in (classification or {}).get("destinations") or []:
        if dest.get("confidence", 0) >= 0.35:
            topics.append(f"Content for {dest['destination']}")

    if "mushrooms" in primary:
        topics.append("Foraging / fungi field notes")
    if "landscape" in primary:
        topics.append("Landscape essay / place story")
    if "trail" in primary or "mountain" in primary:
        topics.append("Trail conditions / outing report")

    return {
        "alt_text": alt,
        "caption": caption,
        "keywords": keywords,
        "description": caption,
        "possible_article_topics": topics[:8],
        "species_guesses": species,
        "weather_guess": weather,
        "season": season,
        "time_of_day": tod,
        "editable": True,
        "source": "waypoint-accessibility-heuristics-v1",
        "note": "All fields are drafts for owner editing before publish.",
    }


def _season_from_date(date: Any) -> str | None:
    if not date or not isinstance(date, str):
        return None
    # "2024:07:10 18:22:01" or ISO
    parts = date.replace("T", " ").replace("-", ":").split(" ")[0].split(":")
    try:
        month = int(parts[1])
        return SEASONS_N.get(month)
    except (IndexError, ValueError):
        return None


def _time_of_day(date: Any) -> str | None:
    if not date or not isinstance(date, str):
        return None
    try:
        time_part = date.replace("T", " ").split(" ")[1]
        hour = int(time_part.split(":")[0])
    except (IndexError, ValueError):
        return None
    if hour < 5 or hour >= 21:
        return "night"
    if hour < 8:
        return "early morning"
    if hour < 11:
        return "morning"
    if hour < 14:
        return "midday"
    if hour < 17:
        return "afternoon"
    if hour < 21:
        return "evening"
    return "night"
