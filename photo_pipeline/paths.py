"""
Pipeline paths — library sidecars + repo media catalog.

Originals live in Waypoint Library (untouched).
Derivatives and DB live under library/.waypoint-pipeline/.
Approved website catalog lives in the repo under data/media/.
"""
from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

# Defaults align with waypoint-importer
DEFAULT_LIBRARY = Path.home() / "Pictures" / "Waypoint Library"

# Sidecar root inside the photo library (never inside shoot folders as peers to originals
# — uses a single hidden directory at library root)
PIPELINE_DIRNAME = ".waypoint-pipeline"


def library_root() -> Path:
    env = os.environ.get("WAYPOINT_LIBRARY")
    if env:
        return Path(env).expanduser()
    return DEFAULT_LIBRARY


def pipeline_root(library: Path | None = None) -> Path:
    root = (library or library_root()) / PIPELINE_DIRNAME
    root.mkdir(parents=True, exist_ok=True)
    return root


def db_path(library: Path | None = None) -> Path:
    return pipeline_root(library) / "media.sqlite3"


def queue_dir(library: Path | None = None) -> Path:
    d = pipeline_root(library) / "queue"
    d.mkdir(parents=True, exist_ok=True)
    return d


def manifests_dir(library: Path | None = None) -> Path:
    d = pipeline_root(library) / "manifests"
    d.mkdir(parents=True, exist_ok=True)
    return d


def versions_dir(library: Path | None = None) -> Path:
    d = pipeline_root(library) / "versions"
    d.mkdir(parents=True, exist_ok=True)
    return d


def review_export_dir(library: Path | None = None) -> Path:
    """JSON export the local review UI can load (file:// or static server)."""
    d = pipeline_root(library) / "review"
    d.mkdir(parents=True, exist_ok=True)
    return d


def repo_media_dir() -> Path:
    d = REPO_ROOT / "data" / "media"
    d.mkdir(parents=True, exist_ok=True)
    return d


def website_catalog_path() -> Path:
    return repo_media_dir() / "catalog.json"


def website_assets_dir() -> Path:
    d = repo_media_dir() / "approved"
    d.mkdir(parents=True, exist_ok=True)
    return d
