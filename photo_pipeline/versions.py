"""
Website derivative versions — never touches originals.

Outputs under library/.waypoint-pipeline/versions/<asset_id>/
Formats: JPEG (+ WebP when possible).
"""
from __future__ import annotations

import logging
import subprocess
from pathlib import Path
from typing import Any

from .paths import versions_dir

log = logging.getLogger("photo_pipeline.versions")

SIZES = {
    "thumbnail": 320,
    "small": 640,
    "medium": 1280,
    "large": 2048,
    "hero": 2560,
    "background": 1920,
}


def generate_versions(
    asset_id: str,
    original: Path,
    *,
    library: Path | None = None,
    metadata: dict | None = None,
) -> dict[str, Any]:
    original = Path(original)
    out_root = versions_dir(library) / asset_id
    out_root.mkdir(parents=True, exist_ok=True)

    result: dict[str, Any] = {
        "original_path": str(original),
        "original_retained": True,
        "derivatives": {},
        "notes": [],
    }

    work = _raster_source(original)
    if work is None:
        result["notes"].append("No raster source for derivatives (video/RAW without preview).")
        return result

    try:
        from PIL import Image

        with Image.open(work) as im:
            im = im.convert("RGB")
            # Honor EXIF orientation if present
            try:
                from PIL import ImageOps

                im = ImageOps.exif_transpose(im) or im
            except Exception:  # noqa: BLE001
                pass

            for name, max_side in SIZES.items():
                variant = im.copy()
                variant.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
                jpg_path = out_root / f"{name}.jpg"
                variant.save(jpg_path, "JPEG", quality=82 if name != "thumbnail" else 75, optimize=True)
                entry: dict[str, Any] = {
                    "path": str(jpg_path),
                    "width": variant.width,
                    "height": variant.height,
                    "format": "jpeg",
                    "max_side": max_side,
                }
                webp_path = out_root / f"{name}.webp"
                try:
                    variant.save(webp_path, "WEBP", quality=80, method=4)
                    entry["webp"] = str(webp_path)
                except Exception:  # noqa: BLE001
                    pass
                result["derivatives"][name] = entry

            result["notes"].append("Derivatives written beside originals; originals unchanged.")
    except Exception as exc:  # noqa: BLE001
        log.exception("Version generation failed for %s", asset_id)
        result["notes"].append(f"Version error: {exc}")
    finally:
        if work != original and work.name.startswith("wp_preview_"):
            try:
                work.unlink(missing_ok=True)
            except OSError:
                pass

    return result


def _raster_source(path: Path) -> Path | None:
    ext = path.suffix.lower()
    if ext in {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}:
        return path
    if ext in {".heif", ".hif"}:
        # Pillow may need pillow-heif; try open, else skip
        try:
            from PIL import Image

            Image.open(path).verify()
            return path
        except Exception:  # noqa: BLE001
            return _exif_preview(path)
    if ext in {".arw", ".cr2", ".nef", ".dng"}:
        return _exif_preview(path)
    return None


def _exif_preview(path: Path) -> Path | None:
    import tempfile

    try:
        out = Path(tempfile.gettempdir()) / f"wp_preview_{path.stem}.jpg"
        for tag in ("PreviewImage", "JpgFromRaw"):
            proc = subprocess.run(
                ["exiftool", "-b", f"-{tag}", str(path)],
                check=False,
                capture_output=True,
                timeout=60,
            )
            if proc.returncode == 0 and proc.stdout and len(proc.stdout) > 1000:
                out.write_bytes(proc.stdout)
                return out
    except (OSError, subprocess.TimeoutExpired):
        pass
    return None
