"""
Privacy detection — advisory flags only.

Never auto-publishes. Flags suggest Strip GPS / Needs review / Do not publish / Safe.
"""
from __future__ import annotations

from typing import Any


def assess_privacy(metadata: dict, analysis: dict | None = None) -> dict[str, Any]:
    flags: list[dict[str, str]] = []
    suggestions: list[str] = []

    gps = metadata.get("gps")
    if gps and gps.get("latitude") is not None:
        flags.append(
            {
                "id": "gps_present",
                "severity": "high",
                "label": "GPS coordinates embedded",
                "detail": f"lat={gps.get('latitude')}, lon={gps.get('longitude')}",
            }
        )
        suggestions.append("Strip GPS")
        suggestions.append("Needs review")

    # Heuristic: people tag elevated → faces possible
    content = (analysis or {}).get("content") or {}
    people = content.get("people") or {}
    if float(people.get("score") or 0) >= 0.4:
        flags.append(
            {
                "id": "possible_people",
                "severity": "medium",
                "label": "Possible people in frame",
                "detail": "Local heuristics only — no face model in V1. Review for recognizable faces.",
            }
        )
        suggestions.append("Needs review")

    screenshots = content.get("screenshots") or {}
    if float(screenshots.get("score") or 0) >= 0.5:
        flags.append(
            {
                "id": "computer_screen",
                "severity": "high",
                "label": "Possible computer screen / screenshot",
                "detail": "May contain private UI, documents, or credentials.",
            }
        )
        suggestions.append("Do not publish")
        suggestions.append("Needs review")

    documents = content.get("documents") or {}
    if float(documents.get("score") or 0) >= 0.45:
        flags.append(
            {
                "id": "document_like",
                "severity": "medium",
                "label": "Document-like frame",
                "detail": "Bright flat frame — check for addresses, IDs, or text.",
            }
        )
        suggestions.append("Needs review")

    # License plates / addresses / private property — not detectable reliably offline;
    # surface as review prompts when vehicles/buildings elevated
    vehicles = content.get("vehicles") or {}
    if float(vehicles.get("score") or 0) >= 0.4:
        flags.append(
            {
                "id": "possible_vehicles",
                "severity": "medium",
                "label": "Possible vehicles — check license plates",
                "detail": "Manual plate check required before publish.",
            }
        )
        suggestions.append("Needs review")

    buildings = content.get("buildings") or {}
    if float(buildings.get("score") or 0) >= 0.4:
        flags.append(
            {
                "id": "possible_buildings",
                "severity": "low",
                "label": "Possible buildings / private property",
                "detail": "Confirm permission and avoid identifiable addresses.",
            }
        )
        suggestions.append("Needs review")

    # Deduplicate suggestions preserving order
    seen: set[str] = set()
    uniq_suggestions: list[str] = []
    for s in suggestions:
        if s not in seen:
            seen.add(s)
            uniq_suggestions.append(s)

    if not flags:
        verdict = "Safe"
        uniq_suggestions = ["Safe"]
    elif any(f["severity"] == "high" for f in flags):
        verdict = "Needs review"
        if "Do not publish" in uniq_suggestions and len(flags) > 1:
            verdict = "Do not publish"
    else:
        verdict = "Needs review"

    return {
        "verdict": verdict,
        "flags": flags,
        "suggestions": uniq_suggestions,
        "auto_publish": False,
        "note": "Privacy is advisory. Owner approval is always required before website updates.",
    }
