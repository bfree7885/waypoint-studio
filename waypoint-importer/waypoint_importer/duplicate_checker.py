"""
SHA256-based duplicate detection.

Filenames are ignored — only content hashes decide whether a file
has already been imported.
"""
from __future__ import annotations

import hashlib
import logging
import sqlite3
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from .config import HASH_DB_PATH, ensure_dirs

log = logging.getLogger("waypoint_importer.duplicate_checker")

CHUNK_SIZE = 1024 * 1024  # 1 MiB


@dataclass(frozen=True)
class HashRecord:
    sha256: str
    source_name: str
    size_bytes: int
    imported_at: str
    local_path: str | None = None


class DuplicateChecker:
    """Persistent store of imported file content hashes."""

    def __init__(self, db_path: Path | None = None) -> None:
        ensure_dirs()
        self.db_path = db_path or HASH_DB_PATH
        self._lock = threading.Lock()
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._lock:
            conn = self._connect()
            try:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS imported_files (
                        sha256 TEXT PRIMARY KEY,
                        source_name TEXT NOT NULL,
                        size_bytes INTEGER NOT NULL,
                        imported_at TEXT NOT NULL,
                        local_path TEXT
                    )
                    """
                )
                conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_imported_at
                    ON imported_files(imported_at)
                    """
                )
                conn.commit()
            finally:
                conn.close()

    @staticmethod
    def hash_file(path: Path) -> str:
        """Compute SHA256 of file contents."""
        h = hashlib.sha256()
        with path.open("rb") as fh:
            while True:
                chunk = fh.read(CHUNK_SIZE)
                if not chunk:
                    break
                h.update(chunk)
        return h.hexdigest()

    def is_imported(self, sha256: str) -> bool:
        with self._lock:
            conn = self._connect()
            try:
                row = conn.execute(
                    "SELECT 1 FROM imported_files WHERE sha256 = ? LIMIT 1",
                    (sha256,),
                ).fetchone()
                return row is not None
            finally:
                conn.close()

    def record(
        self,
        sha256: str,
        source_name: str,
        size_bytes: int,
        local_path: Path | None = None,
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            conn = self._connect()
            try:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO imported_files
                    (sha256, source_name, size_bytes, imported_at, local_path)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        sha256,
                        source_name,
                        size_bytes,
                        now,
                        str(local_path) if local_path else None,
                    ),
                )
                conn.commit()
            finally:
                conn.close()
        log.debug("Recorded hash %s… for %s", sha256[:12], source_name)

    def count(self) -> int:
        with self._lock:
            conn = self._connect()
            try:
                row = conn.execute("SELECT COUNT(*) AS n FROM imported_files").fetchone()
                return int(row["n"]) if row else 0
            finally:
                conn.close()
