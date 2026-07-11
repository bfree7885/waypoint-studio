"""
Google Drive sync via rclone.

Uploads to: gdrive:Waypoint Photos/YYYY/MM-DD/
Never deletes remote files; never touches the SD card.
"""
from __future__ import annotations

import logging
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from .config import Preferences

log = logging.getLogger("waypoint_importer.drive_sync")


@dataclass
class UploadResult:
    ok: bool
    remote_dest: str
    message: str = ""


def rclone_available() -> bool:
    return shutil.which("rclone") is not None


def rclone_remote_configured(remote: str) -> bool:
    if not rclone_available():
        return False
    try:
        proc = subprocess.run(
            ["rclone", "listremotes"],
            check=False,
            capture_output=True,
            text=True,
            timeout=30,
        )
        if proc.returncode != 0:
            return False
        remotes = {line.strip().rstrip(":") for line in proc.stdout.splitlines() if line.strip()}
        return remote in remotes
    except (OSError, subprocess.TimeoutExpired) as exc:
        log.warning("rclone listremotes failed: %s", exc)
        return False


def upload_file(
    local_path: Path,
    yyyy: str,
    mm_dd: str,
    prefs: Preferences,
) -> UploadResult:
    """
    Upload a single local file into remote YYYY/MM-DD/.
    Uses rclone copyto to preserve the filename.
    """
    dest_dir = prefs.drive_dest(yyyy, mm_dd)
    remote_file = f"{dest_dir}/{local_path.name}"

    if not rclone_available():
        return UploadResult(False, remote_file, "rclone not found on PATH")

    if not local_path.is_file():
        return UploadResult(False, remote_file, "Local file missing")

    try:
        # Ensure remote directory exists (mkdir is idempotent)
        subprocess.run(
            ["rclone", "mkdir", dest_dir],
            check=False,
            capture_output=True,
            text=True,
            timeout=120,
        )
        proc = subprocess.run(
            [
                "rclone",
                "copyto",
                str(local_path),
                remote_file,
                "--retries",
                "3",
                "--low-level-retries",
                "5",
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=600,
        )
        if proc.returncode != 0:
            err = (proc.stderr or proc.stdout or "rclone upload failed").strip()
            log.error("Upload failed for %s: %s", local_path.name, err)
            return UploadResult(False, remote_file, err)
        log.info("Uploaded %s → %s", local_path.name, remote_file)
        return UploadResult(True, remote_file, "ok")
    except subprocess.TimeoutExpired:
        return UploadResult(False, remote_file, "rclone timed out")
    except OSError as exc:
        return UploadResult(False, remote_file, str(exc))


def open_drive_folder(yyyy: str | None, mm_dd: str | None, prefs: Preferences) -> str:
    """
    Best-effort: open Drive in a browser via rclone link, or return the path string.
    Future: deeper Drive UI integration.
    """
    if yyyy and mm_dd:
        return prefs.drive_dest(yyyy, mm_dd)
    root = prefs.drive_root.strip("/")
    return f"{prefs.rclone_remote}:{root}"
