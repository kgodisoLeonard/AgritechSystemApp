import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_predict_rejects_single_point_history():
    resp = client.post("/predict", json={"history": [100.0]})
    assert resp.status_code == 422  # pydantic min_length validation


def test_predict_returns_forecast():
    resp = client.post("/predict", json={"history": [1000.0, 1200.0, 900.0, 1500.0, 1700.0]})
    assert resp.status_code == 200
    body = resp.json()
    assert "forecastNextMonth" in body
    assert body["monthsUsed"] == 5
    assert isinstance(body["forecastNextMonth"], float)
