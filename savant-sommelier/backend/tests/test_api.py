"""The foundation must run without data services and must not invent results."""

import json

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.copy import CONTRACT_PATH, honesty
from app.main import app
from app.schemas import PanelBlock

client = TestClient(app)

DENYLIST = (
    "riesling",
    "cabernet",
    "chardonnay",
    "pinot",
    "merlot",
    "suitability score:",
    "listing price",
)


def test_contract_names_no_varieties_or_scores():
    text = CONTRACT_PATH.read_text(encoding="utf-8").lower()
    for word in DENYLIST:
        assert word not in text


def test_health_without_database(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "not_configured"
    assert set(body["integrations"].values()) == {"not_connected"}


def test_health_does_not_echo_a_database_url(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:secret-token@localhost/savant")
    response = client.get("/api/v1/health")
    body = response.json()
    assert body["database"] == "configured_unused"
    assert "secret-token" not in response.text
    assert "postgresql://" not in response.text


def test_regions_are_a_map_frame_only():
    response = client.get("/api/v1/regions")
    assert response.status_code == 200
    regions = response.json()["regions"]
    assert len(regions) == 1
    assert regions[0]["id"] == "ny-pa"
    assert regions[0]["status"] == "map_frame_only"
    assert "parcel" in regions[0]["note"].lower()


def test_search_returns_no_listings():
    response = client.post("/api/v1/search", json={"query": "Finger Lakes"})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "not_connected"
    assert body["result_count"] == 0
    assert body["query"] == "Finger Lakes"
    assert "results" not in body
    assert body["message"] == honesty()["search_message"]


def test_blank_search_is_rejected():
    response = client.post("/api/v1/search", json={"query": "   "})
    assert response.status_code == 422


def test_analysis_inside_frame_has_no_scores():
    response = client.get("/api/v1/analysis", params={"lng": -76.88, "lat": 40.27})
    assert response.status_code == 200
    body = response.json()
    assert body["extent"]["relation"] == "inside_initial_extent"
    assert "not a state boundary" in body["extent"]["detail"]
    for key in ("parcel", "suitability", "varieties", "climate"):
        assert body[key]["status"] == "not_connected"
        assert "score" not in body[key]
    assert body["varieties"]["detail"] == honesty()["panels"]["varieties"]["detail"]
    encoded = json.dumps(body).lower()
    assert "riesling" not in encoded
    assert "price" not in encoded


def test_analysis_outside_frame_is_still_not_connected():
    response = client.get("/api/v1/analysis", params={"lng": -119.79, "lat": 36.74})
    assert response.status_code == 200
    body = response.json()
    assert body["extent"]["relation"] == "outside_initial_extent"
    assert body["suitability"]["status"] == "not_connected"
    assert body["climate"]["status"] == "not_connected"


def test_analysis_rejects_impossible_coordinates():
    response = client.get("/api/v1/analysis", params={"lng": 200, "lat": 40})
    assert response.status_code == 422


def test_panel_model_rejects_a_score_field():
    with pytest.raises(ValidationError):
        PanelBlock.model_validate(
            {
                "status": "not_connected",
                "title": "Vineyard suitability",
                "detail": "Not connected.",
                "score": 88,
            }
        )
