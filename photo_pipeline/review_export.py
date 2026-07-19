"""
Export review JSON for the local review UI.
"""
from __future__ import annotations

import json
from pathlib import Path

from . import catalog
from .hooks import future_hooks_manifest
from .paths import review_export_dir


def export_review_bundle(*, library: Path | None = None, limit: int = 500) -> Path:
    with catalog.connect(library) as conn:
        assets = catalog.list_assets(conn, limit=limit)
        # Prefer items awaiting review
        pending = [a for a in assets if a.get("status") in ("needs_review", "analyzed", "queued")]
        others = [a for a in assets if a not in pending]
        ordered = pending + others

    bundle = {
        "version": 1,
        "title": "Waypoint Studio Photo Pipeline — Review",
        "policy": {
            "auto_publish": False,
            "originals_sacred": True,
            "owner_approval_required": True,
        },
        "future_hooks": future_hooks_manifest(),
        "assets": [
            {
                "id": a["id"],
                "status": a.get("status"),
                "original_path": a.get("original_path"),
                "source_name": a.get("source_name"),
                "sha256": a.get("sha256"),
                "imported_at": a.get("imported_at"),
                "metadata": a.get("metadata"),
                "analysis": a.get("analysis"),
                "privacy": a.get("privacy"),
                "scores": a.get("scores"),
                "classification": a.get("classification"),
                "accessibility": a.get("accessibility"),
                "versions": a.get("versions"),
                "destinations": a.get("destinations"),
                "thumbnail": ((a.get("versions") or {}).get("derivatives") or {}).get("thumbnail", {}).get("path"),
                "preview": ((a.get("versions") or {}).get("derivatives") or {}).get("medium", {}).get("path")
                or ((a.get("versions") or {}).get("derivatives") or {}).get("small", {}).get("path"),
            }
            for a in ordered
        ],
        "keyboard": {
            "a": "Approve",
            "r": "Reject",
            "e": "Needs Editing",
            "h": "Hide",
            "n": "Next",
            "p": "Previous",
            "/": "Search focus",
        },
    }
    out = review_export_dir(library) / "review-queue.json"
    out.write_text(json.dumps(bundle, indent=2) + "\n", encoding="utf-8")
    # Convenience copy for static review app
    try:
        from .paths import REPO_ROOT

        app_data = REPO_ROOT / "apps" / "photo-pipeline" / "data"
        app_data.mkdir(parents=True, exist_ok=True)
        (app_data / "review-queue.json").write_text(out.read_text(encoding="utf-8"), encoding="utf-8")
    except OSError:
        pass
    return out
