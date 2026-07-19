"""
Enqueue imported files into the photo pipeline catalog + write import manifest.
Called from Waypoint Importer after a successful batch (optional).
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import catalog
from .paths import manifests_dir

log = logging.getLogger("photo_pipeline.enqueue")


def hash_file(path: Path, chunk: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            block = f.read(chunk)
            if not block:
                break
            h.update(block)
    return h.hexdigest()


def enqueue_imported_files(
    files: list[Path | str],
    *,
    library: Path | None = None,
    card_name: str = "unknown",
    stats: dict | None = None,
    known_hashes: dict[str, str] | None = None,
) -> dict[str, Any]:
    """
    Register imported originals in the media DB and analysis queue.
    known_hashes: optional map path -> sha256 from importer ledger.
    """
    library = library or Path.home() / "Pictures" / "Waypoint Library"
    asset_ids: list[str] = []
    with catalog.connect(library) as conn:
        mid = catalog.save_manifest(
            conn,
            card_name=card_name,
            library_root=str(library),
            stats=stats or {},
            asset_ids=[],  # filled below
        )
        for raw in files:
            path = Path(raw)
            if not path.exists():
                log.warning("Skip missing import path: %s", path)
                continue
            digest = (known_hashes or {}).get(str(path)) or hash_file(path)
            aid = catalog.upsert_asset(
                conn,
                sha256=digest,
                original_path=str(path.resolve()),
                source_name=path.name,
                extension=path.suffix.lower(),
                size_bytes=path.stat().st_size,
                import_manifest_id=mid,
            )
            asset_ids.append(aid)

        conn.execute(
            "UPDATE import_manifests SET asset_ids_json = ? WHERE id = ?",
            (json.dumps(asset_ids), mid),
        )

    # Also write JSON manifest for humans / Photo Coach
    manifest = {
        "id": mid,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "card_name": card_name,
        "library_root": str(library),
        "stats": stats or {},
        "asset_ids": asset_ids,
        "files": [str(Path(f).resolve()) for f in files if Path(f).exists()],
    }
    out = manifests_dir(library) / f"{mid}.json"
    out.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    log.info("Enqueue complete: manifest=%s assets=%d", mid, len(asset_ids))
    return manifest
