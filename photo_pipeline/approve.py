"""
Owner approval → website shared media catalog.

Never publishes automatically. Copies approved derivatives into data/media/approved/
and updates data/media/catalog.json. Originals stay in the photo library.
"""
from __future__ import annotations

import json
import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import catalog
from .paths import website_assets_dir, website_catalog_path

log = logging.getLogger("photo_pipeline.approve")

ALLOWED_STATUSES = {"approved", "rejected", "needs_editing", "hidden", "needs_review", "analyzed"}


def set_review_decision(
    asset_id: str,
    decision: str,
    *,
    library: Path | None = None,
    destinations: list[str] | None = None,
    accessibility_edits: dict | None = None,
    owner_notes: str | None = None,
    publish: bool = False,
) -> dict[str, Any]:
    """
    decision: approve | reject | needs_editing | hide
    publish=True only copies into website catalog when decision is approve.
    """
    status_map = {
        "approve": "approved",
        "approved": "approved",
        "reject": "rejected",
        "rejected": "rejected",
        "needs_editing": "needs_editing",
        "hide": "hidden",
        "hidden": "hidden",
    }
    status = status_map.get(decision)
    if not status:
        return {"ok": False, "error": f"unknown decision: {decision}"}

    with catalog.connect(library) as conn:
        asset = catalog.get_asset(conn, asset_id)
        if not asset:
            return {"ok": False, "error": "asset_not_found"}

        fields: dict[str, Any] = {"status": status}
        if owner_notes is not None:
            fields["owner_notes"] = owner_notes
        if destinations is not None:
            fields["destinations"] = [
                {"destination": d, "confidence": 1.0, "explanation": "Owner selected"}
                for d in destinations
            ]
        if accessibility_edits:
            merged = dict(asset.get("accessibility") or {})
            merged.update(accessibility_edits)
            merged["edited_by_owner"] = True
            fields["accessibility"] = merged
        if status == "approved":
            fields["approved_at"] = datetime.now(timezone.utc).isoformat()

        catalog.update_asset_fields(conn, asset_id, **fields)
        asset = catalog.get_asset(conn, asset_id)

        published = None
        if status == "approved" and publish:
            published = _publish_to_website(conn, asset)
            if published:
                catalog.update_asset_fields(
                    conn,
                    asset_id,
                    published_media_id=published["id"],
                    usage={"website": True, "published_at": published.get("approved_at")},
                )

    return {"ok": True, "asset_id": asset_id, "status": status, "published": published}


def _publish_to_website(conn, asset: dict) -> dict | None:
    """Copy derivatives into repo media store and upsert catalog.json entry."""
    media_id = asset.get("published_media_id") or asset["id"]
    dest_dir = website_assets_dir() / media_id
    dest_dir.mkdir(parents=True, exist_ok=True)

    versions = asset.get("versions") or {}
    derivatives = versions.get("derivatives") or {}
    web_versions: dict[str, Any] = {}
    for name, info in derivatives.items():
        src = Path(info["path"])
        if not src.exists():
            continue
        target = dest_dir / src.name
        shutil.copy2(src, target)
        entry = {
            "path": f"data/media/approved/{media_id}/{src.name}",
            "width": info.get("width"),
            "height": info.get("height"),
            "format": info.get("format"),
        }
        webp = info.get("webp")
        if webp and Path(webp).exists():
            wtarget = dest_dir / Path(webp).name
            shutil.copy2(webp, wtarget)
            entry["webp"] = f"data/media/approved/{media_id}/{Path(webp).name}"
        web_versions[name] = entry

    entry = {
        "id": media_id,
        "sha256": asset.get("sha256"),
        "status": "approved",
        "approved_at": asset.get("approved_at") or datetime.now(timezone.utc).isoformat(),
        "copyright": (asset.get("metadata") or {}).get("copyright"),
        "tags": (asset.get("accessibility") or {}).get("keywords") or [],
        "species": (asset.get("accessibility") or {}).get("species_guesses") or [],
        "location": (asset.get("metadata") or {}).get("gps"),
        "season": (asset.get("accessibility") or {}).get("season"),
        "apps": [
            d.get("destination") if isinstance(d, dict) else d
            for d in (asset.get("destinations") or [])
        ],
        "alt_text": (asset.get("accessibility") or {}).get("alt_text"),
        "caption": (asset.get("accessibility") or {}).get("caption"),
        "versions": web_versions,
        "original_library_path": asset.get("original_path"),
        "usage_history": asset.get("usage") or {},
    }

    catalog_path = website_catalog_path()
    data = {"version": 1, "updated_at": None, "assets": []}
    if catalog_path.exists():
        try:
            data = json.loads(catalog_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    assets = [a for a in data.get("assets", []) if a.get("id") != media_id]
    assets.append(entry)
    data["assets"] = assets
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    data["policy"] = {
        "auto_publish": False,
        "originals_never_modified": True,
        "requires_owner_approval": True,
    }
    catalog_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    log.info("Published media %s to website catalog (%d versions)", media_id, len(web_versions))
    return entry


def bulk_decide(
    asset_ids: list[str],
    decision: str,
    *,
    library: Path | None = None,
    publish: bool = False,
    only_safe: bool = False,
) -> dict[str, Any]:
    results = []
    with catalog.connect(library) as conn:
        ids = list(asset_ids)
        if only_safe:
            filtered = []
            for aid in ids:
                a = catalog.get_asset(conn, aid)
                if not a:
                    continue
                if (a.get("privacy") or {}).get("verdict") == "Safe":
                    filtered.append(aid)
            ids = filtered

    for aid in ids:
        results.append(
            set_review_decision(aid, decision, library=library, publish=publish)
        )
    return {"count": len(results), "results": results}
