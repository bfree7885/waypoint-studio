"""
EXIF / metadata helpers via exiftool.

Never modifies source files on the SD card — read-only invocations.
"""
from __future__ import annotations

import json
import logging
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

log = logging.getLogger("waypoint_importer.metadata")


def exiftool_available() -> bool:
    return shutil.which("exiftool") is not None


def _parse_datetime(value: str | None) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    text = value.strip()
    # Common exiftool forms: "2024:07:10 18:22:01" or with timezone
    for fmt in (
        "%Y:%m:%d %H:%M:%S%z",
        "%Y:%m:%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S%z",
    ):
        try:
            cleaned = text
            if fmt.endswith("%z") and len(text) >= 5 and text[-5] in "+-" and ":" == text[-3]:
                # +00:00 → +0000
                cleaned = text[:-3] + text[-2:]
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    return None


def get_capture_datetime(path: Path) -> datetime | None:
    """
    Return capture datetime from EXIF when available.
    Falls back to file mtime if exiftool is missing or tags are absent.
    """
    if not path.exists():
        return None

    if not exiftool_available():
        log.warning("exiftool not found; using file mtime for %s", path.name)
        return datetime.fromtimestamp(path.stat().st_mtime)

    try:
        proc = subprocess.run(
            [
                "exiftool",
                "-json",
                "-n",
                "-DateTimeOriginal",
                "-CreateDate",
                "-MediaCreateDate",
                "-FileModifyDate",
                str(path),
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=60,
        )
        if proc.returncode != 0 or not proc.stdout.strip():
            log.debug("exiftool failed for %s: %s", path.name, proc.stderr.strip())
            return datetime.fromtimestamp(path.stat().st_mtime)

        rows = json.loads(proc.stdout)
        if not rows:
            return datetime.fromtimestamp(path.stat().st_mtime)
        row = rows[0]
        for key in ("DateTimeOriginal", "CreateDate", "MediaCreateDate", "FileModifyDate"):
            dt = _parse_datetime(row.get(key))
            if dt:
                return dt
    except (subprocess.TimeoutExpired, json.JSONDecodeError, OSError) as exc:
        log.warning("Metadata read failed for %s: %s", path.name, exc)

    return datetime.fromtimestamp(path.stat().st_mtime)


def folder_parts_from_datetime(dt: datetime) -> tuple[str, str]:
    """Return (YYYY, MM-DD) for library / Drive layout."""
    return dt.strftime("%Y"), dt.strftime("%m-%d")
