#!/usr/bin/env python3
"""Waypoint Importer — entry point."""
from __future__ import annotations

import sys


def main() -> int:
    try:
        from waypoint_importer.ui import run_app
    except ImportError:
        # Allow running from source tree without install
        from pathlib import Path

        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from waypoint_importer.ui import run_app

    run_app()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
