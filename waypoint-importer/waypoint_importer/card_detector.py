"""
Removable SD card detection.

Looks for mounted volumes that contain a DCIM folder (Sony and most cameras).
Does not write to the card.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from .config import DCIM_DIR_NAME, MEDIA_EXTENSIONS, media_mount_roots

log = logging.getLogger("waypoint_importer.card_detector")


@dataclass(frozen=True)
class CameraCard:
    """A detected removable volume with a DCIM tree."""

    label: str
    mount_path: Path
    dcim_path: Path

    @property
    def display_name(self) -> str:
        return self.label or self.mount_path.name


def _is_probably_removable(path: Path) -> bool:
    """Heuristic: under /media or /run/media, not the home disk root."""
    try:
        resolved = path.resolve()
    except OSError:
        return False
    parts = resolved.parts
    if len(parts) < 3:
        return False
    if parts[1] in {"media", "mnt"}:
        return True
    if len(parts) >= 3 and parts[1] == "run" and parts[2] == "media":
        return True
    return False


def find_dcim(root: Path) -> Path | None:
    """Return DCIM path if present at root or one level down."""
    direct = root / DCIM_DIR_NAME
    if direct.is_dir():
        return direct
    try:
        for child in root.iterdir():
            if not child.is_dir():
                continue
            candidate = child / DCIM_DIR_NAME
            if candidate.is_dir():
                return candidate
    except PermissionError as exc:
        log.debug("Permission denied scanning %s: %s", root, exc)
    return None


def detect_cards() -> list[CameraCard]:
    """Scan mount roots for volumes containing DCIM."""
    found: list[CameraCard] = []
    seen: set[Path] = set()

    for parent in media_mount_roots():
        try:
            entries = list(parent.iterdir())
        except PermissionError:
            continue

        # /media/user/<volume> or /run/media/user/<volume>
        candidates: list[Path] = []
        if parent.name in {"media", "mnt"} and parent.parent == Path("/"):
            # /media/<user>/<vol> already handled when parent is /media/user
            for entry in entries:
                if entry.is_dir() and entry.name not in {"cdrom", "floppy"}:
                    # Could be username dir
                    try:
                        for vol in entry.iterdir():
                            if vol.is_dir():
                                candidates.append(vol)
                    except PermissionError:
                        candidates.append(entry)
        else:
            candidates.extend(e for e in entries if e.is_dir())

        for vol in candidates:
            try:
                resolved = vol.resolve()
            except OSError:
                continue
            if resolved in seen:
                continue
            if not _is_probably_removable(vol):
                continue
            dcim = find_dcim(vol)
            if not dcim:
                continue
            seen.add(resolved)
            card = CameraCard(
                label=vol.name,
                mount_path=vol,
                dcim_path=dcim,
            )
            found.append(card)
            log.info("Detected camera card: %s (%s)", card.display_name, dcim)

    return found


def iter_media_files(dcim_path: Path) -> list[Path]:
    """Recursively list supported media files under DCIM (read-only)."""
    files: list[Path] = []
    if not dcim_path.is_dir():
        return files
    try:
        for path in dcim_path.rglob("*"):
            if not path.is_file():
                continue
            if path.name.startswith("."):
                continue
            if path.suffix.lower() in MEDIA_EXTENSIONS:
                files.append(path)
    except PermissionError as exc:
        log.error("Cannot read DCIM tree %s: %s", dcim_path, exc)
    files.sort(key=lambda p: str(p).lower())
    return files


def count_new_media(dcim_path: Path, is_new_fn) -> tuple[int, int]:
    """
    Return (new_count, total_count) using a callback is_new_fn(path) -> bool.
    Used for UI preview without importing.
    """
    files = iter_media_files(dcim_path)
    new_count = 0
    for path in files:
        try:
            if is_new_fn(path):
                new_count += 1
        except Exception as exc:  # noqa: BLE001
            log.debug("Preview skip %s: %s", path.name, exc)
    return new_count, len(files)
