"""
Process analysis queue: metadata → analyze → privacy → scores → classify →
versions → accessibility. Updates catalog; never modifies originals.
"""
from __future__ import annotations

import logging
from pathlib import Path

from . import catalog
from .accessibility import generate_accessibility
from .analyze import analyze_image
from .classify import classify_destinations
from .metadata_extract import extract_metadata
from .privacy import assess_privacy
from .scores import score_image
from .versions import generate_versions

log = logging.getLogger("photo_pipeline.process")


def process_asset(conn, asset_id: str, *, library: Path | None = None) -> dict:
    asset = catalog.get_asset(conn, asset_id)
    if not asset:
        return {"ok": False, "error": "asset_not_found"}

    original = Path(asset["original_path"])
    if not original.exists():
        catalog.update_asset_fields(
            conn,
            asset_id,
            status="needs_review",
            analysis={"error": "original_missing", "notes": ["Original path missing on disk."]},
        )
        catalog.dequeue(conn, asset_id)
        return {"ok": False, "error": "original_missing"}

    metadata = extract_metadata(original)
    analysis = analyze_image(original, metadata)
    privacy = assess_privacy(metadata, analysis)
    scores = score_image(analysis, metadata)
    classification = classify_destinations(analysis, scores, privacy)
    versions = generate_versions(asset_id, original, library=library, metadata=metadata)
    accessibility = generate_accessibility(metadata, analysis, classification)

    status = "analyzed"
    if privacy.get("verdict") in ("Needs review", "Do not publish"):
        status = "needs_review"
    else:
        status = "needs_review"  # always owner review before approve

    catalog.update_asset_fields(
        conn,
        asset_id,
        status=status,
        metadata=metadata,
        analysis=analysis,
        privacy=privacy,
        scores=scores,
        classification=classification,
        versions=versions,
        accessibility=accessibility,
        destinations=classification.get("destinations"),
    )
    catalog.dequeue(conn, asset_id)
    log.info("Processed %s → %s", asset_id, status)
    return {"ok": True, "asset_id": asset_id, "status": status}


def process_queue(*, library: Path | None = None, limit: int = 25) -> dict:
    processed = []
    errors = []
    with catalog.connect(library) as conn:
        rows = catalog.queue_pending(conn, limit=limit)
        # Materialize ids before processing (rows are live)
        ids = [r["id"] for r in rows]
        for asset_id in ids:
            try:
                result = process_asset(conn, asset_id, library=library)
                processed.append(result)
                if not result.get("ok"):
                    errors.append(result)
            except Exception as exc:  # noqa: BLE001
                log.exception("Failed processing %s", asset_id)
                errors.append({"asset_id": asset_id, "error": str(exc)})
                conn.execute(
                    "UPDATE analysis_queue SET attempts = attempts + 1, last_error = ? WHERE asset_id = ?",
                    (str(exc), asset_id),
                )
    return {
        "processed": len(processed),
        "errors": errors,
        "results": processed,
    }
