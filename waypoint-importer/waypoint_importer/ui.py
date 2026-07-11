"""
CustomTkinter GUI for Waypoint Importer.

Future roadmap (architected, not implemented):
- Preferences window
- Background monitoring toggle
- Multiple camera profiles
- Automatic Photo Coach launch / batch analysis handoff
"""
from __future__ import annotations

import logging
import subprocess
import threading
import webbrowser
from pathlib import Path
from typing import Callable

import customtkinter as ctk

from .card_detector import CameraCard, detect_cards
from .config import (
    APP_NAME,
    APP_VERSION,
    Preferences,
    load_preferences,
    setup_logging,
)
from .drive_sync import rclone_available, rclone_remote_configured
from .duplicate_checker import DuplicateChecker
from .importer import Importer, ImportStats

log = logging.getLogger("waypoint_importer.ui")

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("green")


class WaypointImporterApp(ctk.CTk):
    def __init__(self) -> None:
        super().__init__()
        self.title(f"{APP_NAME}")
        self.geometry("520x640")
        self.minsize(460, 560)

        self.prefs: Preferences = load_preferences()
        self.duplicates = DuplicateChecker()
        self.importer = Importer(self.prefs, self.duplicates)

        self._card: CameraCard | None = None
        self._importing = False
        self._cancel = False
        self._last_stats: ImportStats | None = None
        self._poll_after_id: str | None = None

        self._build()
        self.after(200, self.refresh_card_state)
        self._schedule_poll()

    # ——— UI construction ———

    def _build(self) -> None:
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        root = ctk.CTkFrame(self, fg_color="transparent")
        root.grid(row=0, column=0, sticky="nsew", padx=24, pady=20)
        root.grid_columnconfigure(0, weight=1)

        title = ctk.CTkLabel(
            root,
            text=APP_NAME,
            font=ctk.CTkFont(size=26, weight="bold"),
        )
        title.grid(row=0, column=0, sticky="w", pady=(0, 4))

        subtitle = ctk.CTkLabel(
            root,
            text="Sony SD → Local Library → Google Drive",
            font=ctk.CTkFont(size=13),
            text_color=("gray30", "gray70"),
        )
        subtitle.grid(row=1, column=0, sticky="w", pady=(0, 18))

        # Camera card
        self.camera_frame = ctk.CTkFrame(root, corner_radius=12)
        self.camera_frame.grid(row=2, column=0, sticky="ew", pady=(0, 12))
        self.camera_frame.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(
            self.camera_frame,
            text="Camera",
            font=ctk.CTkFont(size=12, weight="bold"),
        ).grid(row=0, column=0, columnspan=2, sticky="w", padx=16, pady=(14, 4))

        self.camera_status = ctk.CTkLabel(
            self.camera_frame,
            text="○ Looking for SD card…",
            font=ctk.CTkFont(size=15),
            anchor="w",
        )
        self.camera_status.grid(row=1, column=0, columnspan=2, sticky="ew", padx=16, pady=(0, 14))

        # New photos
        self.stats_frame = ctk.CTkFrame(root, corner_radius=12)
        self.stats_frame.grid(row=3, column=0, sticky="ew", pady=(0, 12))
        self.stats_frame.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(
            self.stats_frame,
            text="New Photos",
            font=ctk.CTkFont(size=12, weight="bold"),
        ).grid(row=0, column=0, sticky="w", padx=16, pady=(14, 4))

        self.new_photos_label = ctk.CTkLabel(
            self.stats_frame,
            text="—",
            font=ctk.CTkFont(size=28, weight="bold"),
            anchor="w",
        )
        self.new_photos_label.grid(row=1, column=0, sticky="w", padx=16, pady=(0, 4))

        self.total_photos_label = ctk.CTkLabel(
            self.stats_frame,
            text="Scan a card to count new files (SHA256)",
            font=ctk.CTkFont(size=12),
            text_color=("gray30", "gray70"),
            anchor="w",
        )
        self.total_photos_label.grid(row=2, column=0, sticky="w", padx=16, pady=(0, 14))

        # Destination
        self.dest_frame = ctk.CTkFrame(root, corner_radius=12)
        self.dest_frame.grid(row=4, column=0, sticky="ew", pady=(0, 12))

        ctk.CTkLabel(
            self.dest_frame,
            text="Destination",
            font=ctk.CTkFont(size=12, weight="bold"),
        ).grid(row=0, column=0, sticky="w", padx=16, pady=(14, 6))

        self.local_dest_label = ctk.CTkLabel(
            self.dest_frame,
            text="○ Local Library",
            font=ctk.CTkFont(size=14),
            anchor="w",
        )
        self.local_dest_label.grid(row=1, column=0, sticky="ew", padx=16, pady=(0, 4))

        self.drive_dest_label = ctk.CTkLabel(
            self.dest_frame,
            text="○ Google Drive",
            font=ctk.CTkFont(size=14),
            anchor="w",
        )
        self.drive_dest_label.grid(row=2, column=0, sticky="ew", padx=16, pady=(0, 14))

        # Progress
        self.status_label = ctk.CTkLabel(
            root,
            text="Ready",
            font=ctk.CTkFont(size=13),
            anchor="w",
            text_color=("gray20", "gray80"),
        )
        self.status_label.grid(row=5, column=0, sticky="ew", pady=(4, 6))

        self.progress = ctk.CTkProgressBar(root, height=14)
        self.progress.grid(row=6, column=0, sticky="ew", pady=(0, 14))
        self.progress.set(0)

        # Import button
        self.import_btn = ctk.CTkButton(
            root,
            text="Import",
            height=44,
            font=ctk.CTkFont(size=16, weight="bold"),
            command=self.start_import,
        )
        self.import_btn.grid(row=7, column=0, sticky="ew", pady=(0, 12))

        # Results
        self.results_frame = ctk.CTkFrame(root, corner_radius=12)
        self.results_frame.grid(row=8, column=0, sticky="ew", pady=(0, 12))
        self.results_label = ctk.CTkLabel(
            self.results_frame,
            text="Imported: —\nSkipped: —\nUploaded: —",
            font=ctk.CTkFont(size=14),
            justify="left",
            anchor="w",
        )
        self.results_label.grid(row=0, column=0, sticky="ew", padx=16, pady=14)

        # Action buttons
        actions = ctk.CTkFrame(root, fg_color="transparent")
        actions.grid(row=9, column=0, sticky="ew")
        actions.grid_columnconfigure((0, 1), weight=1)

        self.open_local_btn = ctk.CTkButton(
            actions,
            text="Open Local Folder",
            command=self.open_local_folder,
            fg_color=("gray75", "gray35"),
            hover_color=("gray65", "gray45"),
        )
        self.open_local_btn.grid(row=0, column=0, sticky="ew", padx=(0, 6), pady=4)

        self.open_drive_btn = ctk.CTkButton(
            actions,
            text="Open Google Drive Folder",
            command=self.open_drive_folder,
            fg_color=("gray75", "gray35"),
            hover_color=("gray65", "gray45"),
        )
        self.open_drive_btn.grid(row=0, column=1, sticky="ew", padx=(6, 0), pady=4)

        self.coach_btn = ctk.CTkButton(
            root,
            text="Analyze in Photo Coach (coming soon)",
            command=self.open_photo_coach_placeholder,
            fg_color="transparent",
            border_width=1,
            text_color=("gray20", "gray80"),
        )
        self.coach_btn.grid(row=10, column=0, sticky="ew", pady=(8, 0))

        footer = ctk.CTkLabel(
            root,
            text=f"v{APP_VERSION} · SD card is never modified",
            font=ctk.CTkFont(size=11),
            text_color=("gray40", "gray60"),
        )
        footer.grid(row=11, column=0, sticky="w", pady=(16, 0))

        self._update_destination_status()

    # ——— Status helpers ———

    def _update_destination_status(self) -> None:
        lib = self.prefs.library_path()
        try:
            lib.mkdir(parents=True, exist_ok=True)
            local_ok = lib.exists()
        except OSError:
            local_ok = False

        self.local_dest_label.configure(
            text=("✓ Local Library" if local_ok else "✗ Local Library unavailable")
            + f"\n    {lib}"
        )

        drive_ok = rclone_available() and rclone_remote_configured(self.prefs.rclone_remote)
        if drive_ok:
            self.drive_dest_label.configure(
                text=f"✓ Google Drive\n    {self.prefs.rclone_remote}:{self.prefs.drive_root}/YYYY/MM-DD/"
            )
        elif not rclone_available():
            self.drive_dest_label.configure(text="✗ Google Drive — rclone not installed")
        else:
            self.drive_dest_label.configure(
                text=f"✗ Google Drive — remote “{self.prefs.rclone_remote}” not configured"
            )

    def _schedule_poll(self) -> None:
        if self._poll_after_id:
            try:
                self.after_cancel(self._poll_after_id)
            except Exception:  # noqa: BLE001
                pass
        interval_ms = int(max(1.0, self.prefs.poll_interval_sec) * 1000)
        self._poll_after_id = self.after(interval_ms, self._poll_tick)

    def _poll_tick(self) -> None:
        if not self._importing:
            self.refresh_card_state(scan_new=False)
        self._schedule_poll()

    def refresh_card_state(self, scan_new: bool = True) -> None:
        cards = detect_cards()
        if not cards:
            self._card = None
            self.camera_status.configure(text="○ No Sony SD card detected")
            self.new_photos_label.configure(text="—")
            self.total_photos_label.configure(text="Insert a card with a DCIM folder")
            self.import_btn.configure(state="disabled")
            return

        # Prefer previously selected card if still present
        card = cards[0]
        if self._card:
            for c in cards:
                if c.mount_path == self._card.mount_path:
                    card = c
                    break
        self._card = card
        self.camera_status.configure(
            text=f"✓ Sony SD Card Detected\n    {card.display_name} · {card.dcim_path}"
        )
        self.import_btn.configure(state="normal" if not self._importing else "disabled")

        if scan_new and not self._importing:
            self.total_photos_label.configure(text="Counting new photos…")
            threading.Thread(target=self._count_new_async, args=(card,), daemon=True).start()

    def _count_new_async(self, card: CameraCard) -> None:
        try:
            new_count, total = self.importer.preview_new_count(card)
        except Exception as exc:  # noqa: BLE001
            log.exception("Preview count failed")
            self.after(0, lambda: self.total_photos_label.configure(text=f"Scan error: {exc}"))
            return

        def apply() -> None:
            if self._card and self._card.mount_path == card.mount_path:
                self.new_photos_label.configure(text=str(new_count))
                self.total_photos_label.configure(
                    text=f"{total} media files on card · duplicates skipped by SHA256"
                )

        self.after(0, apply)

    # ——— Import ———

    def start_import(self) -> None:
        if self._importing or not self._card:
            return
        self._importing = True
        self._cancel = False
        self.import_btn.configure(state="disabled", text="Importing…")
        self.progress.set(0)
        self.status_label.configure(text="Starting import…")
        card = self._card
        threading.Thread(target=self._import_worker, args=(card,), daemon=True).start()

    def _import_worker(self, card: CameraCard) -> None:
        def on_progress(message: str, fraction: float, stats: dict) -> None:
            self.after(0, lambda: self._apply_progress(message, fraction, stats))

        try:
            stats = self.importer.import_card(
                card,
                progress=on_progress,
                should_cancel=lambda: self._cancel,
            )
            self._last_stats = stats
            self.after(0, lambda: self._import_finished(stats))
        except Exception as exc:  # noqa: BLE001
            log.exception("Import crashed")
            self.after(0, lambda: self._import_failed(str(exc)))

    def _apply_progress(self, message: str, fraction: float, stats: dict) -> None:
        self.status_label.configure(text=message)
        self.progress.set(max(0.0, min(1.0, fraction)))
        self.results_label.configure(
            text=(
                f"Imported: {stats.get('imported', 0)}\n"
                f"Skipped: {stats.get('skipped', 0)}\n"
                f"Uploaded: {stats.get('uploaded', 0)}"
            )
        )

    def _import_finished(self, stats: ImportStats) -> None:
        self._importing = False
        self.import_btn.configure(state="normal", text="Import")
        self.progress.set(1)
        self.results_label.configure(
            text=(
                f"Imported: {stats.imported}\n"
                f"Skipped: {stats.skipped}\n"
                f"Uploaded: {stats.uploaded}"
                + (f"\nUpload failed: {stats.upload_failed}" if stats.upload_failed else "")
            )
        )
        extra = ""
        if stats.errors:
            extra = f" · {len(stats.errors)} warning(s) — see log"
        self.status_label.configure(text=f"Done{extra}")
        self.refresh_card_state(scan_new=True)

    def _import_failed(self, message: str) -> None:
        self._importing = False
        self.import_btn.configure(state="normal", text="Import")
        self.status_label.configure(text=f"Import failed: {message}")

    # ——— Actions ———

    def open_local_folder(self) -> None:
        path = self.prefs.library_path()
        if self._last_stats and self._last_stats.last_local_dir:
            path = self._last_stats.last_local_dir
        path.mkdir(parents=True, exist_ok=True)
        self._open_path(path)

    def open_drive_folder(self) -> None:
        # Open Google Drive web UI for Waypoint Photos (best effort)
        webbrowser.open("https://drive.google.com/drive/search?q=Waypoint%20Photos")
        if self._last_stats and self._last_stats.last_yyyy and self._last_stats.last_mm_dd:
            dest = self.prefs.drive_dest(
                self._last_stats.last_yyyy,
                self._last_stats.last_mm_dd,
            )
            self.status_label.configure(text=f"Drive path: {dest}")

    def open_photo_coach_placeholder(self) -> None:
        """Placeholder for future Automatic Photo Coach launch / batch analysis."""
        url = self.prefs.photo_coach_url
        webbrowser.open(url)
        self.status_label.configure(
            text="Photo Coach handoff is a placeholder — batch analysis coming later."
        )

    @staticmethod
    def _open_path(path: Path) -> None:
        try:
            subprocess.Popen(["xdg-open", str(path)], start_new_session=True)
        except OSError as exc:
            log.error("Could not open %s: %s", path, exc)


def run_app() -> None:
    setup_logging()
    log.info("Starting %s v%s", APP_NAME, APP_VERSION)
    app = WaypointImporterApp()
    app.mainloop()
