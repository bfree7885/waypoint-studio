"""
Import orchestration: scan → hash → copy locally → optional Drive upload.

Never deletes or modifies files on the SD card.
"""
from __future__ import annotations

import logging
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from .card_detector import CameraCard, iter_media_files
from .config import Preferences
from .drive_sync import upload_file
from .duplicate_checker import DuplicateChecker
from .metadata import folder_parts_from_datetime, get_capture_datetime

log = logging.getLogger("waypoint_importer.importer")

ProgressCallback = Callable[[str, float, dict], None]
# message, fraction 0..1, stats dict


@dataclass
class ImportStats:
    scanned: int = 0
    imported: int = 0
    skipped: int = 0
    uploaded: int = 0
    upload_failed: int = 0
    errors: list[str] = field(default_factory=list)
    last_yyyy: str | None = None
    last_mm_dd: str | None = None
    last_local_dir: Path | None = None
    imported_paths: list[str] = field(default_factory=list)
    imported_hashes: dict[str, str] = field(default_factory=dict)
    pipeline_manifest_id: str | None = None

    def as_dict(self) -> dict:
        return {
            "scanned": self.scanned,
            "imported": self.imported,
            "skipped": self.skipped,
            "uploaded": self.uploaded,
            "upload_failed": self.upload_failed,
            "errors": list(self.errors),
            "last_yyyy": self.last_yyyy,
            "last_mm_dd": self.last_mm_dd,
            "last_local_dir": str(self.last_local_dir) if self.last_local_dir else None,
            "imported_count_paths": len(self.imported_paths),
            "pipeline_manifest_id": self.pipeline_manifest_id,
        }


def unique_dest_path(directory: Path, filename: str) -> Path:
    """Avoid overwriting local files when names collide (different content)."""
    dest = directory / filename
    if not dest.exists():
        return dest
    stem = Path(filename).stem
    suffix = Path(filename).suffix
    n = 2
    while True:
        candidate = directory / f"{stem}_{n}{suffix}"
        if not candidate.exists():
            return candidate
        n += 1


class Importer:
    def __init__(
        self,
        prefs: Preferences,
        duplicates: DuplicateChecker | None = None,
    ) -> None:
        self.prefs = prefs
        self.duplicates = duplicates or DuplicateChecker()

    def preview_new_count(self, card: CameraCard) -> tuple[int, int]:
        """Return (new_files, total_media) without importing."""
        files = iter_media_files(card.dcim_path)
        new_count = 0
        for path in files:
            try:
                digest = self.duplicates.hash_file(path)
                if not self.duplicates.is_imported(digest):
                    new_count += 1
            except OSError as exc:
                log.debug("Preview hash failed for %s: %s", path, exc)
        return new_count, len(files)

    def import_card(
        self,
        card: CameraCard,
        *,
        upload: bool | None = None,
        progress: ProgressCallback | None = None,
        should_cancel: Callable[[], bool] | None = None,
    ) -> ImportStats:
        stats = ImportStats()
        do_upload = self.prefs.auto_upload if upload is None else upload
        library = self.prefs.library_path()
        library.mkdir(parents=True, exist_ok=True)

        files = iter_media_files(card.dcim_path)
        stats.scanned = len(files)
        if not files:
            if progress:
                progress("No media files found on card.", 1.0, stats.as_dict())
            return stats

        log.info(
            "Importing from %s — %d media file(s), upload=%s",
            card.display_name,
            len(files),
            do_upload,
        )

        for index, src in enumerate(files):
            if should_cancel and should_cancel():
                log.info("Import cancelled by user.")
                break

            frac = index / max(len(files), 1)
            if progress:
                progress(f"Scanning {src.name}…", frac, stats.as_dict())

            try:
                digest = self.duplicates.hash_file(src)
            except OSError as exc:
                msg = f"Hash failed for {src.name}: {exc}"
                log.error(msg)
                stats.errors.append(msg)
                continue

            if self.duplicates.is_imported(digest):
                stats.skipped += 1
                continue

            # New file — copy locally (SD card untouched)
            try:
                captured = get_capture_datetime(src)
                if captured is None:
                    from datetime import datetime

                    captured = datetime.now()
                yyyy, shoot_date = folder_parts_from_datetime(captured)
                dest_dir = library / yyyy / shoot_date
                dest_dir.mkdir(parents=True, exist_ok=True)
                dest = unique_dest_path(dest_dir, src.name)

                if progress:
                    progress(
                        f"Copying {src.name} → {yyyy}/{shoot_date}/",
                        frac,
                        stats.as_dict(),
                    )

                shutil.copy2(src, dest)
                # Verify we did not alter source (copy2 is read of source only)
                self.duplicates.record(
                    digest,
                    source_name=src.name,
                    size_bytes=src.stat().st_size,
                    local_path=dest,
                )
                stats.imported += 1
                stats.imported_paths.append(str(dest))
                stats.imported_hashes[str(dest)] = digest
                stats.last_yyyy = yyyy
                stats.last_mm_dd = shoot_date
                stats.last_local_dir = dest_dir
                log.info("Imported %s → %s", src.name, dest)

                if do_upload:
                    if progress:
                        progress(f"Uploading {dest.name}…", frac, stats.as_dict())
                    result = upload_file(dest, yyyy, shoot_date, self.prefs)
                    if result.ok:
                        stats.uploaded += 1
                    else:
                        stats.upload_failed += 1
                        stats.errors.append(f"Upload {dest.name}: {result.message}")

            except OSError as exc:
                msg = f"Import failed for {src.name}: {exc}"
                log.error(msg)
                stats.errors.append(msg)

        # Queue local photo pipeline analysis (never publishes; originals untouched)
        if getattr(self.prefs, "enable_photo_pipeline", True) and stats.imported_paths:
            try:
                from .pipeline_hook import after_import_batch

                manifest = after_import_batch(
                    [Path(p) for p in stats.imported_paths],
                    library=library,
                    card_name=card.display_name,
                    stats=stats.as_dict(),
                    hashes=stats.imported_hashes,
                )
                if manifest and manifest.get("id"):
                    stats.pipeline_manifest_id = manifest["id"]
                    log.info("Photo pipeline queued: %s", manifest["id"])
            except Exception as exc:  # noqa: BLE001
                msg = f"Photo pipeline enqueue failed: {exc}"
                log.warning(msg)
                stats.errors.append(msg)

        if progress:
            progress("Import complete.", 1.0, stats.as_dict())
        log.info(
            "Done — imported=%d skipped=%d uploaded=%d errors=%d",
            stats.imported,
            stats.skipped,
            stats.uploaded,
            len(stats.errors),
        )
        return stats
