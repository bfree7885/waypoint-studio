from fastapi import APIRouter

from app.regions import initial_region
from app.schemas import RegionListResponse, RegionResponse

router = APIRouter(tags=["regions"])


@router.get("/regions", response_model=RegionListResponse)
def list_regions() -> RegionListResponse:
    region = initial_region()
    return RegionListResponse(
        regions=[
            RegionResponse(
                id=str(region["id"]),
                name=str(region["name"]),
                status="map_frame_only",
                west=float(region["west"]),
                south=float(region["south"]),
                east=float(region["east"]),
                north=float(region["north"]),
                note=str(region["frame_note"]),
            )
        ]
    )
