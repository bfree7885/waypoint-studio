#!/usr/bin/env python3
"""
Sheds Phase 2 — build a compact PA habitat GIS pack from public NLCD + 3DEP.

Example (Milford / Pike):
  python3 scripts/sheds-gis/build-pack.py \\
    --west -74.90 --south 41.26 --east -74.70 --north 41.40 \\
    --pack-id pa-pike-milford-v1 \\
    --region "Pike County / Milford-area Pennsylvania" \\
    --out apps/shed-hunting/gis/packs/pa-pike-milford-v1.json

Requires: GDAL Python bindings, numpy, network access to MRLC + USGS.
Does not commit source GeoTIFFs — only the compact JSON pack.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import math
import os
import urllib.request
from collections import Counter, deque
from datetime import datetime, timezone

import numpy as np
from osgeo import gdal

RGB_TO_NLCD = {
    (71, 107, 160): 11,
    (221, 201, 201): 21,
    (216, 147, 130): 22,
    (237, 0, 0): 23,
    (170, 0, 0): 24,
    (178, 173, 163): 31,
    (104, 170, 99): 41,
    (28, 99, 48): 42,
    (181, 201, 142): 43,
    (204, 186, 124): 52,
    (226, 226, 193): 71,
    (219, 216, 61): 81,
    (170, 112, 40): 82,
    (186, 216, 234): 90,
    (112, 163, 186): 95,
}
FOREST = {41, 42, 43, 90}


def nearest_nlcd(rgb):
    best, bd = 0, 1e18
    for k, v in RGB_TO_NLCD.items():
        d = (rgb[0] - k[0]) ** 2 + (rgb[1] - k[1]) ** 2 + (rgb[2] - k[2]) ** 2
        if d < bd:
            bd, best = d, v
    return best if bd < 2500 else 0


def fetch(url: str, path: str) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "WaypointShedsGIS/2.0"})
    with urllib.request.urlopen(req, timeout=180) as r, open(path, "wb") as f:
        f.write(r.read())


def b64(arr: np.ndarray) -> str:
    return base64.b64encode(arr.tobytes()).decode("ascii")


def build(args: argparse.Namespace) -> dict:
    size = args.size
    west, south, east, north = args.west, args.south, args.east, args.north
    work = args.workdir
    os.makedirs(work, exist_ok=True)
    nlcd_path = os.path.join(work, "nlcd.tif")
    elev_path = os.path.join(work, "elev.tif")

    nlcd_url = (
        "https://www.mrlc.gov/geoserver/mrlc_display/wms"
        "?service=WMS&version=1.1.1&request=GetMap"
        "&layers=mrlc_display:NLCD_2021_Land_Cover_L48"
        f"&bbox={west},{south},{east},{north}&width={size}&height={size}"
        "&srs=EPSG:4326&format=image/geotiff&styles="
    )
    elev_url = (
        "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage"
        f"?bbox={west},{south},{east},{north}&bboxSR=4326&imageSR=4326"
        f"&size={size},{size}&format=tiff&pixelType=F32"
        "&interpolation=RSP_BilinearInterpolation&f=image"
    )
    if not args.reuse or not os.path.exists(nlcd_path):
        print("Fetching NLCD…")
        fetch(nlcd_url, nlcd_path)
    if not args.reuse or not os.path.exists(elev_path):
        print("Fetching 3DEP…")
        fetch(elev_url, elev_path)

    nds = gdal.Open(nlcd_path)
    band = nds.GetRasterBand(1)
    idx = band.ReadAsArray()
    ct = band.GetColorTable()
    nlcd = np.zeros(idx.shape, dtype=np.uint8)
    for i in np.unique(idx):
        c = ct.GetColorEntry(int(i))
        nlcd[idx == i] = nearest_nlcd((c[0], c[1], c[2]))

    eds = gdal.Open(elev_path)
    elev = eds.GetRasterBand(1).ReadAsArray().astype(np.float64)
    gt = nds.GetGeoTransform()
    lat_m = 111320.0
    lon_m = 111320.0 * math.cos(math.radians((north + south) / 2))
    dx = abs(gt[1]) * lon_m
    dy = abs(gt[5]) * lat_m
    gy, gx = np.gradient(elev, dy, dx)
    slope = np.clip(np.degrees(np.arctan(np.sqrt(gx * gx + gy * gy))), 0, 90)

    forest = np.isin(nlcd, list(FOREST))
    pad = np.pad(forest.astype(np.uint8), 1, mode="edge")
    edge_mask = np.zeros_like(forest, dtype=bool)
    h, w = forest.shape
    for y in range(h):
        for x in range(w):
            win = pad[y : y + 3, x : x + 3]
            if win.min() != win.max():
                edge_mask[y, x] = True
    dist = np.full((h, w), 255, dtype=np.uint8)
    q = deque()
    for y in range(h):
        for x in range(w):
            if edge_mask[y, x]:
                dist[y, x] = 0
                q.append((y, x))
    while q:
        y, x = q.popleft()
        d = int(dist[y, x])
        if d >= 254:
            continue
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and dist[ny, nx] > d + 1:
                dist[ny, nx] = d + 1
                q.append((ny, nx))
    edge_m = np.minimum(dist.astype(np.float32) * ((dx + dy) / 2), 255).astype(np.uint8)
    slope_q = np.clip(np.round(slope), 0, 90).astype(np.uint8)

    meta = {
        "packId": args.pack_id,
        "version": "1.0.0",
        "region": args.region,
        "bounds": {"west": west, "south": south, "east": east, "north": north},
        "rows": int(h),
        "cols": int(w),
        "cellSizeMApprox": round((dx + dy) / 2, 1),
        "crs": "EPSG:4326",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "sources": {
            "nlcd": {
                "provider": "USGS/MRLC",
                "product": "NLCD_2021_Land_Cover_L48",
                "access": "MRLC WMS GetMap GeoTIFF; palette remapped to NLCD codes via RGB",
                "license": "US public domain",
                "nominalResolutionM": 30,
                "year": 2021,
                "downloadUrlTemplate": nlcd_url,
            },
            "elevation": {
                "provider": "USGS 3DEP",
                "product": "3DEPElevation ImageServer exportImage",
                "license": "US public domain",
                "nominalResolutionM": "multi (~10–30 source)",
                "downloadUrlTemplate": elev_url,
            },
            "edge": {
                "method": "Chebyshev cell distance to forest↔non-forest transition; forest={41,42,43,90}",
                "class": "WAYPOINT_HEURISTIC",
            },
            "slope": {
                "method": "numpy.gradient on 3DEP elev → degrees",
                "class": "SOURCE_FACT derived",
            },
        },
        "encoding": {
            "nlcd": "uint8 row-major base64 NLCD codes",
            "edgeM": "uint8 meters to transition cap 255",
            "slopeDeg": "uint8 degrees 0-90",
        },
        "nlcd": b64(nlcd),
        "edgeM": b64(edge_m),
        "slopeDeg": b64(slope_q),
        "classHistogram": dict(Counter(nlcd.flatten().tolist())),
    }
    blob = json.dumps({k: v for k, v in meta.items() if k != "sha256"}, sort_keys=True).encode()
    meta["sha256"] = hashlib.sha256(blob).hexdigest()
    return meta


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--west", type=float, required=True)
    p.add_argument("--south", type=float, required=True)
    p.add_argument("--east", type=float, required=True)
    p.add_argument("--north", type=float, required=True)
    p.add_argument("--size", type=int, default=180)
    p.add_argument("--pack-id", required=True)
    p.add_argument("--region", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--workdir", default="/tmp/sheds-gis-build")
    p.add_argument("--reuse", action="store_true")
    args = p.parse_args()
    meta = build(args)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(meta, f, separators=(",", ":"))
    print("wrote", args.out, "bytes", os.path.getsize(args.out))
    print("unique NLCD", sorted(meta["classHistogram"]))


if __name__ == "__main__":
    main()
