"""
Waypoint Importer — shared configuration and paths.

Architected for future: preferences window, multiple cameras,
background monitoring, and Photo Coach handoff.
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import asdict, dataclass, field, fields
from pathlib import Path
from typing import Any

APP_NAME = "Waypoint Importer"
APP_ID = "waypoint-importer"
APP_VERSION = "0.1.0"

# Media extensions (case-insensitive match)
MEDIA_EXTENSIONS = {
    ".arw",
    ".jpg",
    ".jpeg",
    ".png",
    ".heif",
    ".hif",
    ".mov",
    ".mp4",
}

DCIM_DIR_NAME = "DCIM"

# rclone remote path prefix (remote:path)
DEFAULT_RCLONE_REMOTE = "gdrive"
DEFAULT_DRIVE_ROOT = "Waypoint Photos"

# Local library root
DEFAULT_LIBRARY_ROOT = Path.home() / "Pictures" / "Waypoint Library"

# App data (hashes, prefs, logs)
DATA_DIR = Path.home() / ".local" / "share" / APP_ID
CONFIG_DIR = Path.home() / ".config" / APP_ID
LOG_DIR = DATA_DIR / "logs"
HASH_DB_PATH = DATA_DIR / "imported_hashes.sqlite3"
PREFS_PATH = CONFIG_DIR / "preferences.json"

# Future: Photo Coach / batch analysis handoff
PHOTO_COACH_URL_DEFAULT = "https://waypointstudio.org/apps/photo-coach/"
PHOTO_COACH_LOCAL_HINT = Path.home() / "projects" / "waypoint-scenes" / "apps" / "photo-coach"


@dataclass
class Preferences:
    """User preferences — foundation for a future Preferences window."""

    library_root: str = field(default_factory=lambda: str(DEFAULT_LIBRARY_ROOT))
    rclone_remote: str = DEFAULT_RCLONE_REMOTE
    drive_root: str = DEFAULT_DRIVE_ROOT
    auto_upload: bool = True
    poll_interval_sec: float = 3.0
    # Future roadmap (not implemented yet)
    background_monitoring: bool = False
    auto_launch_photo_coach: bool = False
    photo_coach_url: str = PHOTO_COACH_URL_DEFAULT
    camera_profiles: list[dict[str, Any]] = field(default_factory=list)
    # Automated Photo Pipeline V1 — enqueue analysis after import (no auto-publish)
    enable_photo_pipeline: bool = True

    def library_path(self) -> Path:
        return Path(self.library_root).expanduser()

    def drive_dest(self, yyyy: str, shoot_date: str) -> str:
        """rclone destination: remote:Waypoint Photos/YYYY/YYYY-MM-DD/"""
        root = self.drive_root.strip("/")
        return f"{self.rclone_remote}:{root}/{yyyy}/{shoot_date}"


def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    DEFAULT_LIBRARY_ROOT.mkdir(parents=True, exist_ok=True)


def setup_logging(level: int = logging.INFO) -> logging.Logger:
    ensure_dirs()
    logger = logging.getLogger("waypoint_importer")
    if logger.handlers:
        return logger
    logger.setLevel(level)
    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    fh = logging.FileHandler(LOG_DIR / "importer.log", encoding="utf-8")
    fh.setFormatter(fmt)
    fh.setLevel(level)
    sh = logging.StreamHandler()
    sh.setFormatter(fmt)
    sh.setLevel(level)
    logger.addHandler(fh)
    logger.addHandler(sh)
    return logger


def load_preferences() -> Preferences:
    ensure_dirs()
    if not PREFS_PATH.exists():
        prefs = Preferences()
        save_preferences(prefs)
        return prefs
    try:
        data = json.loads(PREFS_PATH.read_text(encoding="utf-8"))
        known = {f.name for f in fields(Preferences)}
        filtered = {k: v for k, v in data.items() if k in known}
        return Preferences(**filtered)
    except Exception as exc:  # noqa: BLE001
        logging.getLogger("waypoint_importer").warning(
            "Failed to load preferences (%s); using defaults.", exc
        )
        return Preferences()


def save_preferences(prefs: Preferences) -> None:
    ensure_dirs()
    PREFS_PATH.write_text(
        json.dumps(asdict(prefs), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def media_mount_roots() -> list[Path]:
    """Common removable-media mount parents on Linux Mint / Ubuntu."""
    user = os.environ.get("USER") or Path.home().name
    candidates = [
        Path("/media") / user,
        Path("/run/media") / user,
        Path("/media"),
        Path("/mnt"),
    ]
    return [p for p in candidates if p.exists()]
