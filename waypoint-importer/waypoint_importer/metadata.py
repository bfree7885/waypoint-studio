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
    Return capture datetime from EXIF DateTimeOriginal when available.
    Falls back to file modification time only when DateTimeOriginal is unavailable.
    """
    if not path.exists():
        return None

    mtime = datetime.fromtimestamp(path.stat().st_mtime)

    if not exiftool_available():
        log.warning("exiftool not found; using file mtime for %s", path.name)
        return mtime

    try:
        proc = subprocess.run(
            [
                "exiftool",
                "-json",
                "-n",
                "-DateTimeOriginal",
                str(path),
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=60,
        )
        if proc.returncode != 0 or not proc.stdout.strip():
            log.debug(
                "exiftool DateTimeOriginal unavailable for %s; using mtime",
                path.name,
            )
            return mtime

        rows = json.loads(proc.stdout)
        if not rows:
            return mtime
        dt = _parse_datetime(rows[0].get("DateTimeOriginal"))
        if dt:
            return dt
        log.debug("No DateTimeOriginal for %s; using mtime", path.name)
    except (subprocess.TimeoutExpired, json.JSONDecodeError, OSError) as exc:
        log.warning("Metadata read failed for %s: %s", path.name, exc)

    return mtime


def folder_parts_from_datetime(dt: datetime) -> tuple[str, str]:
    """
    Return (YYYY, YYYY-MM-DD) for library / Drive shoot folders.

    Example: 2026-07-10 → ("2026", "2026-07-10")
    """
    return dt.strftime("%Y"), dt.strftime("%Y-%m-%d")


def local_shoot_dir(library_root: Path, dt: datetime) -> Path:
    """~/Pictures/Waypoint Library/YYYY/YYYY-MM-DD/"""
    yyyy, shoot_date = folder_parts_from_datetime(dt)
    return library_root / yyyy / shoot_date


def drive_shoot_path(remote: str, drive_root: str, dt: datetime) -> str:
    """gdrive:Waypoint Photos/YYYY/YYYY-MM-DD/"""
    yyyy, shoot_date = folder_parts_from_datetime(dt)
    root = drive_root.strip("/")
    return f"{remote}:{root}/{yyyy}/{shoot_date}"


def extract_full_metadata(path: Path) -> dict:
    """
    Prefer photo_pipeline full extractor when available; otherwise date-focused fallback.
    Read-only — never writes EXIF back to the file.
    """
    try:
        import sys

        repo = Path(__file__).resolve().parents[2]
        if str(repo) not in sys.path:
            sys.path.insert(0, str(repo))
        from photo_pipeline.metadata_extract import extract_metadata

        return extract_metadata(path)
    except Exception as exc:  # noqa: BLE001
        log.debug("Full metadata via pipeline unavailable (%s); minimal fallback", exc)
        dt = get_capture_datetime(path)
        return {
            "path": str(path),
            "filename": path.name,
            "date": dt.isoformat(sep=" ") if dt else None,
            "fallback": True,
        }
