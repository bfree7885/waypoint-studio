#!/usr/bin/env python3
"""
Inject USGS 3DEP-derived aspectCardinal into an existing Sheds GIS pack.

Does not rewrite nlcd/edgeM/slopeDeg. Uses the same bbox/size as the pack.
Requires: numpy, tifffile, network (unless --elev is provided).
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import math
import os
import urllib.request
from collections import Counter

import numpy as np
import tifffile

ASPECT_DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
ASPECT_MIN_SLOPE = 2.0


def b64(arr: np.ndarray) -> str:
    return base64.b64encode(arr.tobytes()).decode("ascii")


def decode_u8(s: str) -> np.ndarray:
    return np.frombuffer(base64.b64decode(s), dtype=np.uint8)


def fetch(url: str, path: str) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "WaypointShedsGIS/2.0"})
    with urllib.request.urlopen(req, timeout=180) as r, open(path, "wb") as f:
        f.write(r.read())


def aspect_from_elev(elev: np.ndarray, west: float, south: float, east: float, north: float) -> np.ndarray:
    h, w = elev.shape
    lat_m = 111320.0
    lon_m = 111320.0 * math.cos(math.radians((north + south) / 2))
    dx = abs(east - west) / w * lon_m
    dy = abs(north - south) / h * lat_m
    gy, gx = np.gradient(elev.astype(np.float64), dy, dx)
    slope = np.clip(np.degrees(np.arctan(np.sqrt(gx * gx + gy * gy))), 0, 90)
    aspect_deg = (np.degrees(np.arctan2(-gx, gy)) + 360.0) % 360.0
    aspect_ix = (np.rint(aspect_deg / 45.0).astype(np.int16) % 8) + 1
    aspect_code = np.where(slope >= ASPECT_MIN_SLOPE, aspect_ix, 0).astype(np.uint8)
    aspect_code = np.where(~np.isfinite(elev), 0, aspect_code).astype(np.uint8)
    return aspect_code, slope


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--pack", required=True, help="Existing pack JSON path")
    p.add_argument("--out", required=True)
    p.add_argument("--elev", default="", help="Optional local elev GeoTIFF")
    p.add_argument("--workdir", default="/tmp/sheds-gis-build")
    args = p.parse_args()

    with open(args.pack, encoding="utf-8") as f:
        pack = json.load(f)

    b = pack["bounds"]
    rows, cols = int(pack["rows"]), int(pack["cols"])
    west, south, east, north = b["west"], b["south"], b["east"], b["north"]
    size = rows
    assert rows == cols, "square pack expected"

    os.makedirs(args.workdir, exist_ok=True)
    elev_path = args.elev or os.path.join(args.workdir, "elev-aspect.tif")
    elev_url = (
        "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage"
        f"?bbox={west},{south},{east},{north}&bboxSR=4326&imageSR=4326"
        f"&size={size},{size}&format=tiff&pixelType=F32"
        "&interpolation=RSP_BilinearInterpolation&f=image"
    )
    if not args.elev:
        print("Fetching 3DEP…", elev_url[:80], "…")
        fetch(elev_url, elev_path)

    elev = tifffile.imread(elev_path)
    if elev.ndim > 2:
        elev = elev[0]
    elev = np.asarray(elev, dtype=np.float64)
    if elev.shape != (rows, cols):
        raise SystemExit(f"elev shape {elev.shape} != pack {(rows, cols)}")

    aspect_code, slope_live = aspect_from_elev(elev, west, south, east, north)
    slope_pack = decode_u8(pack["slopeDeg"]).reshape(rows, cols)

    # Prefer pack slope for flat gate so steep/aspect eligibility matches shipped slopeDeg.
    aspect_code = np.where(slope_pack >= ASPECT_MIN_SLOPE, aspect_code, 0).astype(np.uint8)
    # Keep live slope only for nodata override already applied

    hist = dict(Counter(aspect_code.flatten().tolist()))
    southish = int(np.sum(np.isin(aspect_code, [4, 5, 6])))  # SE,S,SW
    steep = int(np.sum(slope_pack >= 22))
    unknown = int(hist.get(0, 0))

    pack["version"] = "1.1.0"
    pack.setdefault("sources", {})["aspect"] = {
        "method": "numpy.gradient on USGS 3DEP elev → atan2(-gx, gy) → 8-way cardinal",
        "class": "SOURCE_FACT derived",
        "provider": "USGS 3DEP",
        "license": "US public domain",
        "precisionNote": "Coarse ~90 m orientation for RADAR; raw DEM not shipped",
        "encodingCodes": {
            "0": "unknown/flat",
            "1": "N",
            "2": "NE",
            "3": "E",
            "4": "SE",
            "5": "S",
            "6": "SW",
            "7": "W",
            "8": "NW",
        },
        "downloadUrlTemplate": elev_url,
    }
    pack.setdefault("encoding", {})["aspectCardinal"] = (
        "uint8 row-major base64; 0=unknown/flat, 1=N … 8=NW"
    )
    pack["aspectCardinal"] = b64(aspect_code)
    pack["aspectHistogram"] = {str(k): v for k, v in sorted(hist.items())}
    pack.pop("sha256", None)
    blob = json.dumps({k: v for k, v in pack.items() if k != "sha256"}, sort_keys=True).encode()
    pack["sha256"] = hashlib.sha256(blob).hexdigest()

    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(pack, f, separators=(",", ":"))

    print("wrote", args.out, "bytes", os.path.getsize(args.out))
    print("dims", rows, cols, "cells", rows * cols)
    print("aspectHistogram", pack["aspectHistogram"])
    print("southish", southish, "steep_slope>=22", steep, "unknown/flat", unknown)
    print("mean_|slope_pack-live|", float(np.mean(np.abs(slope_pack.astype(float) - slope_live))))


if __name__ == "__main__":
    main()
