"""
Bridge: Waypoint Importer → Photo Pipeline enqueue.

Safe no-op if photo_pipeline is not importable. Never modifies SD or originals.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

log = logging.getLogger("waypoint_importer.pipeline_hook")


def after_import_batch(
    imported_paths: list[Path],
    *,
    library: Path,
    card_name: str,
    stats: dict[str, Any],
    hashes: dict[str, str] | None = None,
) -> dict[str, Any] | None:
    if not imported_paths:
        return None
    try:
        # Repo root: .../waypoint-scenes/waypoint-importer/waypoint_importer/pipeline_hook.py
        import sys

        repo = Path(__file__).resolve().parents[2]
        if str(repo) not in sys.path:
            sys.path.insert(0, str(repo))
        from photo_pipeline.enqueue import enqueue_imported_files

        return enqueue_imported_files(
            imported_paths,
            library=library,
            card_name=card_name,
            stats=stats,
            known_hashes=hashes,
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("Photo pipeline enqueue skipped: %s", exc)
        return {"ok": False, "error": str(exc)}
