from fastapi import APIRouter

from app.schemas import HealthResponse, Integrations
from app.status import database_status

router = APIRouter(tags=["health"])

VERSION = "0.1.0"


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    database, detail = database_status()
    return HealthResponse(
        service="savant-sommelier",
        version=VERSION,
        status="ok",
        database=database,
        database_detail=detail,
        integrations=Integrations(),
    )
