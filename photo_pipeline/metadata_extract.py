"""
Full metadata extraction (exiftool + Pillow).

Read-only. Never writes tags back to originals.
"""
from __future__ import annotations

import json
import logging
import shutil
import subprocess
from pathlib import Path
from typing import Any

log = logging.getLogger("photo_pipeline.metadata")

EXIF_TAGS = [
    "Make",
    "Model",
    "LensModel",
    "LensID",
    "DateTimeOriginal",
    "CreateDate",
    "GPSLatitude",
    "GPSLongitude",
    "GPSAltitude",
    "ExposureTime",
    "ShutterSpeedValue",
    "FNumber",
    "ISO",
    "ISOSpeed",
    "FocalLength",
    "FocalLengthIn35mmFormat",
    "Orientation",
    "ImageWidth",
    "ImageHeight",
    "ExifImageWidth",
    "ExifImageHeight",
    "ColorSpace",
    "ProfileDescription",
    "Copyright",
    "Artist",
    "Keywords",
    "Subject",
    "ImageDescription",
    "Software",
    "Flash",
    "WhiteBalance",
    "MeteringMode",
    "ExposureProgram",
    "FileType",
    "MIMEType",
]


def exiftool_available() -> bool:
    return shutil.which("exiftool") is not None


def extract_metadata(path: Path) -> dict[str, Any]:
    """Return normalized metadata dict for an original file."""
    path = Path(path)
    out: dict[str, Any] = {
        "path": str(path),
        "filename": path.name,
        "extension": path.suffix.lower(),
        "size_bytes": path.stat().st_size if path.exists() else None,
        "camera": None,
        "make": None,
        "model": None,
        "lens": None,
        "date": None,
        "gps": None,
        "exposure": None,
        "iso": None,
        "shutter": None,
        "aperture": None,
        "focal_length": None,
        "orientation": None,
        "dimensions": None,
        "color_profile": None,
        "copyright": None,
        "keywords": [],
        "raw": {},
    }

    if not path.exists():
        out["error"] = "file_missing"
        return out

    raw: dict[str, Any] = {}
    if exiftool_available():
        try:
            args = ["exiftool", "-json", "-n", "-G1"] + [f"-{t}" for t in EXIF_TAGS] + [str(path)]
            # Simpler: dump common tags without -G1 for easier keys
            proc = subprocess.run(
                ["exiftool", "-json", "-n"] + [f"-{t}" for t in EXIF_TAGS] + [str(path)],
                check=False,
                capture_output=True,
                text=True,
                timeout=90,
            )
            if proc.returncode == 0 and proc.stdout.strip():
                rows = json.loads(proc.stdout)
                if rows:
                    raw = {k: v for k, v in rows[0].items() if k != "SourceFile"}
        except (subprocess.TimeoutExpired, json.JSONDecodeError, OSError) as exc:
            log.warning("exiftool failed for %s: %s", path.name, exc)
            out["exiftool_error"] = str(exc)
    else:
        out["exiftool"] = "unavailable"

    out["raw"] = raw
    make = raw.get("Make")
    model = raw.get("Model")
    out["make"] = make
    out["model"] = model
    if make or model:
        out["camera"] = " ".join(str(x) for x in (make, model) if x)

    out["lens"] = raw.get("LensModel") or raw.get("LensID")
    out["date"] = raw.get("DateTimeOriginal") or raw.get("CreateDate")

    lat, lon = raw.get("GPSLatitude"), raw.get("GPSLongitude")
    if lat is not None and lon is not None:
        out["gps"] = {
            "latitude": lat,
            "longitude": lon,
            "altitude": raw.get("GPSAltitude"),
        }

    shutter = raw.get("ExposureTime") or raw.get("ShutterSpeedValue")
    aperture = raw.get("FNumber")
    iso = raw.get("ISO") or raw.get("ISOSpeed")
    out["shutter"] = shutter
    out["aperture"] = aperture
    out["iso"] = iso
    if shutter is not None or aperture is not None or iso is not None:
        out["exposure"] = {
            "shutter": shutter,
            "aperture": aperture,
            "iso": iso,
        }

    fl = raw.get("FocalLength") or raw.get("FocalLengthIn35mmFormat")
    out["focal_length"] = fl
    out["orientation"] = raw.get("Orientation")

    w = raw.get("ImageWidth") or raw.get("ExifImageWidth")
    h = raw.get("ImageHeight") or raw.get("ExifImageHeight")
    if w and h:
        out["dimensions"] = {"width": int(w), "height": int(h)}

    out["color_profile"] = raw.get("ProfileDescription") or raw.get("ColorSpace")
    out["copyright"] = raw.get("Copyright") or raw.get("Artist")

    kw = raw.get("Keywords") or raw.get("Subject") or []
    if isinstance(kw, str):
        kw = [k.strip() for k in kw.split(",") if k.strip()]
    elif not isinstance(kw, list):
        kw = [str(kw)] if kw else []
    out["keywords"] = kw

    # Pillow dimensions fallback for openable formats
    if not out["dimensions"]:
        dims = _pillow_dims(path)
        if dims:
            out["dimensions"] = dims

    return out


def _pillow_dims(path: Path) -> dict[str, int] | None:
    try:
        from PIL import Image

        with Image.open(path) as im:
            return {"width": im.width, "height": im.height}
    except Exception:  # noqa: BLE001
        return None
