"""
Shared media database (SQLite).

Stores import records, metadata, analysis, scores, privacy, accessibility,
versions, approval state. Originals are referenced by path + hash — never moved.
"""
from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from .paths import db_path

SCHEMA = """
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL UNIQUE,
  original_path TEXT NOT NULL,
  source_name TEXT,
  extension TEXT,
  size_bytes INTEGER,
  imported_at TEXT,
  import_manifest_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  -- queued | analyzed | needs_review | approved | rejected | needs_editing | hidden
  metadata_json TEXT,
  analysis_json TEXT,
  privacy_json TEXT,
  classification_json TEXT,
  scores_json TEXT,
  accessibility_json TEXT,
  versions_json TEXT,
  destinations_json TEXT,
  usage_json TEXT,
  owner_notes TEXT,
  approved_at TEXT,
  published_media_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_sha ON assets(sha256);

CREATE TABLE IF NOT EXISTS import_manifests (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  card_name TEXT,
  library_root TEXT,
  stats_json TEXT,
  asset_ids_json TEXT
);

CREATE TABLE IF NOT EXISTS analysis_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL UNIQUE,
  enqueued_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _json(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True)


def _loads(text: str | None, default: Any = None) -> Any:
    if not text:
        return default if default is not None else {}
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return default if default is not None else {}


@contextmanager
def connect(library: Path | None = None) -> Iterator[sqlite3.Connection]:
    path = db_path(library)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def new_asset_id() -> str:
    return f"wpmedia_{uuid.uuid4().hex[:16]}"


def upsert_asset(
    conn: sqlite3.Connection,
    *,
    sha256: str,
    original_path: str,
    source_name: str | None = None,
    extension: str | None = None,
    size_bytes: int | None = None,
    import_manifest_id: str | None = None,
    metadata: dict | None = None,
) -> str:
    """Insert asset if new hash; return asset id. Never overwrite original_path if already present."""
    row = conn.execute(
        "SELECT id, original_path FROM assets WHERE sha256 = ?", (sha256,)
    ).fetchone()
    if row:
        return row["id"]

    asset_id = new_asset_id()
    now = _now()
    ext = extension or Path(original_path).suffix.lower()
    conn.execute(
        """
        INSERT INTO assets (
          id, sha256, original_path, source_name, extension, size_bytes,
          imported_at, import_manifest_id, status, metadata_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)
        """,
        (
            asset_id,
            sha256,
            original_path,
            source_name or Path(original_path).name,
            ext,
            size_bytes,
            now,
            import_manifest_id,
            _json(metadata or {}),
            now,
            now,
        ),
    )
    conn.execute(
        """
        INSERT OR IGNORE INTO analysis_queue (asset_id, enqueued_at)
        VALUES (?, ?)
        """,
        (asset_id, now),
    )
    return asset_id


def update_asset_fields(conn: sqlite3.Connection, asset_id: str, **fields: Any) -> None:
    allowed = {
        "status",
        "metadata_json",
        "analysis_json",
        "privacy_json",
        "classification_json",
        "scores_json",
        "accessibility_json",
        "versions_json",
        "destinations_json",
        "usage_json",
        "owner_notes",
        "approved_at",
        "published_media_id",
    }
    sets: list[str] = []
    values: list[Any] = []
    for key, value in fields.items():
        col = key if key.endswith("_json") or key in allowed else f"{key}_json"
        if key in allowed:
            col = key
        elif not key.endswith("_json"):
            # convenience: pass dicts as analysis=, privacy=, etc.
            col = f"{key}_json" if f"{key}_json" in allowed else None
            if col is None:
                continue
            value = _json(value) if not isinstance(value, str) else value
        if col not in allowed:
            continue
        if col.endswith("_json") and not isinstance(value, str):
            value = _json(value)
        sets.append(f"{col} = ?")
        values.append(value)
    if not sets:
        return
    sets.append("updated_at = ?")
    values.append(_now())
    values.append(asset_id)
    conn.execute(f"UPDATE assets SET {', '.join(sets)} WHERE id = ?", values)


def set_status(conn: sqlite3.Connection, asset_id: str, status: str) -> None:
    update_asset_fields(conn, asset_id, status=status)


def dequeue(conn: sqlite3.Connection, asset_id: str) -> None:
    conn.execute("DELETE FROM analysis_queue WHERE asset_id = ?", (asset_id,))


def queue_pending(conn: sqlite3.Connection, limit: int = 50) -> list[sqlite3.Row]:
    return list(
        conn.execute(
            """
            SELECT a.* FROM analysis_queue q
            JOIN assets a ON a.id = q.asset_id
            ORDER BY q.enqueued_at ASC
            LIMIT ?
            """,
            (limit,),
        )
    )


def get_asset(conn: sqlite3.Connection, asset_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()
    return row_to_dict(row) if row else None


def list_assets(
    conn: sqlite3.Connection,
    *,
    status: str | None = None,
    limit: int = 500,
    offset: int = 0,
) -> list[dict]:
    if status:
        rows = conn.execute(
            "SELECT * FROM assets WHERE status = ? ORDER BY imported_at DESC LIMIT ? OFFSET ?",
            (status, limit, offset),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM assets ORDER BY imported_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
    return [row_to_dict(r) for r in rows]


def row_to_dict(row: sqlite3.Row | None) -> dict:
    if row is None:
        return {}
    d = dict(row)
    for key in (
        "metadata_json",
        "analysis_json",
        "privacy_json",
        "classification_json",
        "scores_json",
        "accessibility_json",
        "versions_json",
        "destinations_json",
        "usage_json",
    ):
        short = key.replace("_json", "")
        d[short] = _loads(d.get(key))
    return d


def save_manifest(
    conn: sqlite3.Connection,
    *,
    card_name: str,
    library_root: str,
    stats: dict,
    asset_ids: list[str],
) -> str:
    mid = f"imp_{uuid.uuid4().hex[:12]}"
    conn.execute(
        """
        INSERT INTO import_manifests (id, created_at, card_name, library_root, stats_json, asset_ids_json)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (mid, _now(), card_name, library_root, _json(stats), _json(asset_ids)),
    )
    return mid
