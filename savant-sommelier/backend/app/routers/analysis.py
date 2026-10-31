from fastapi import APIRouter, Query

from app.copy import honesty
from app.regions import classify_extent, initial_region
from app.schemas import AnalysisResponse, ExtentStatus, PanelBlock, SubmittedCoordinate

router = APIRouter(tags=["analysis"])


def _panel(key: str) -> PanelBlock:
    raw = honesty()["panels"][key]
    return PanelBlock(status="not_connected", title=str(raw["title"]), detail=str(raw["detail"]))


@router.get("/analysis", response_model=AnalysisResponse)
def analyze_coordinate(
    lng: float = Query(..., ge=-180, le=180),
    lat: float = Query(..., ge=-90, le=90),
) -> AnalysisResponse:
    contract = honesty()
    region = initial_region()
    relation = classify_extent(lng, lat)
    return AnalysisResponse(
        location=SubmittedCoordinate(lng=lng, lat=lat, source="submitted_coordinate"),
        extent=ExtentStatus(
            relation=relation,
            region_id=str(region["id"]),
            region_name=str(region["name"]),
            detail=str(contract["extent_detail"][relation]),
        ),
        parcel=_panel("parcel"),
        suitability=_panel("suitability"),
        varieties=_panel("varieties"),
        climate=_panel("climate"),
    )
