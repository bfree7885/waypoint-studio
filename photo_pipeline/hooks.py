"""
Future expansion hooks — architecture only (not implemented).

Infrared, UV, full spectrum, animal vision, phenology, time-lapse,
Hidden Landscapes spectral modes.
"""
from __future__ import annotations

from typing import Any

FUTURE_MODES = {
    "infrared": {
        "status": "hook",
        "description": "NIR capture ingest, false-color derivatives, vegetation indices.",
    },
    "ultraviolet": {
        "status": "hook",
        "description": "UV reflectance / fluorescence pipelines for flora and materials.",
    },
    "full_spectrum": {
        "status": "hook",
        "description": "Unfiltered sensor workflow with channel remapping presets.",
    },
    "animal_vision": {
        "status": "hook",
        "description": "Simulated dichromatic / tetrachromatic previews for education.",
    },
    "phenology": {
        "status": "hook",
        "description": "Seasonal series linking shoots to LeafTurn / Fieldry calendars.",
    },
    "time_lapse": {
        "status": "hook",
        "description": "Sequence grouping, interval metadata, export to motion.",
    },
    "hidden_landscapes": {
        "status": "hook",
        "description": "Spectral + place storytelling destination already classified in V1.",
    },
}


def future_hooks_manifest() -> dict[str, Any]:
    return {
        "version": 1,
        "implemented": [],
        "hooks": FUTURE_MODES,
        "extension_point": "photo_pipeline.hooks.register_mode(name, handler)",
        "note": "V1 records architecture only — do not claim these pipelines exist.",
    }


def register_mode(name: str, handler: Any = None) -> dict[str, Any]:
    """Placeholder registration API for future plugins."""
    if name not in FUTURE_MODES:
        FUTURE_MODES[name] = {"status": "custom_hook", "description": "User-registered mode."}
    return {
        "registered": name,
        "handler_bound": handler is not None,
        "active": False,
        "message": "Hook recorded; runtime not implemented in V1.",
    }
