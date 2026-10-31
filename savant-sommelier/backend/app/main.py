"""Local analysis API. It runs without a database or outside data services."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analysis, health, regions, search

app = FastAPI(
    title="Savant Sommelier",
    version="0.1.0",
    summary="Foundation API. Listings, parcels, suitability, and climate are not connected.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(regions.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1")


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "savant-sommelier",
        "ui": "http://127.0.0.1:5173",
        "health": "/api/v1/health",
    }
