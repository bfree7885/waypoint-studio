"""Response models. Extra fields are rejected so scores cannot slip through."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PanelBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["not_connected"]
    title: str
    detail: str


class Integrations(BaseModel):
    model_config = ConfigDict(extra="forbid")

    property_listings: Literal["not_connected"] = "not_connected"
    parcels: Literal["not_connected"] = "not_connected"
    vineyard_suitability: Literal["not_connected"] = "not_connected"
    grape_varieties: Literal["not_connected"] = "not_connected"
    climate_projections: Literal["not_connected"] = "not_connected"


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    service: Literal["savant-sommelier"]
    version: str
    status: Literal["ok"]
    database: Literal["not_configured", "configured_unused"]
    database_detail: str
    integrations: Integrations


class RegionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    status: Literal["map_frame_only"]
    west: float
    south: float
    east: float
    north: float
    note: str


class RegionListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    regions: list[RegionResponse]


class SearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1, max_length=200)

    @field_validator("query")
    @classmethod
    def clean_query(cls, value: str) -> str:
        cleaned = "".join(character for character in value.strip() if character.isprintable())
        cleaned = " ".join(cleaned.split())
        if not cleaned:
            raise ValueError("Enter a place or address.")
        return cleaned


class SearchResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str
    status: Literal["not_connected"]
    result_count: Literal[0] = 0
    message: str


class SubmittedCoordinate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lng: float
    lat: float
    source: Literal["submitted_coordinate"]


class ExtentStatus(BaseModel):
    model_config = ConfigDict(extra="forbid")

    relation: Literal["inside_initial_extent", "outside_initial_extent"]
    region_id: str
    region_name: str
    detail: str


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    location: SubmittedCoordinate
    extent: ExtentStatus
    parcel: PanelBlock
    suitability: PanelBlock
    varieties: PanelBlock
    climate: PanelBlock
