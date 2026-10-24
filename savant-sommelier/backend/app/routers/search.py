from fastapi import APIRouter

from app.copy import honesty
from app.schemas import SearchRequest, SearchResponse

router = APIRouter(tags=["search"])


@router.post("/search", response_model=SearchResponse)
def search_properties(body: SearchRequest) -> SearchResponse:
    return SearchResponse(
        query=body.query,
        status="not_connected",
        result_count=0,
        message=str(honesty()["search_message"]),
    )
