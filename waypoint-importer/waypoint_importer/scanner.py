"""
Lightweight scan of new files without full import.

Used by the UI to show “New Photos” counts. Hashing large cards can take
time — runs off the UI thread.
"""
from __future__ import annotations

# Re-export helper for clarity in architecture docs / future services.
from .card_detector import count_new_media, detect_cards, iter_media_files

__all__ = ["count_new_media", "detect_cards", "iter_media_files"]
