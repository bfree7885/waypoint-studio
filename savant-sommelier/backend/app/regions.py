"""Initial map frame. A rectangle for the camera, not a state boundary."""

from __future__ import annotations

from typing import Literal

from app.copy import honesty

ExtentRelation = Literal["inside_initial_extent", "outside_initial_extent"]


def initial_region() -> dict[str, object]:
    region = honesty()["initial_region"]
    if not isinstance(region, dict):
        raise RuntimeError("Initial region is missing from the honesty contract.")
    return region


def classify_extent(lng: float, lat: float) -> ExtentRelation:
    region = initial_region()
    west = float(region["west"])
    south = float(region["south"])
    east = float(region["east"])
    north = float(region["north"])
    inside = west <= lng <= east and south <= lat <= north
    if inside:
        return "inside_initial_extent"
    return "outside_initial_extent"
