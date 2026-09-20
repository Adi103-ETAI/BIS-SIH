"""Health + middleware contract tests (Stage 1 gates)."""

from fastapi.testclient import TestClient

from app.main import create_app

client = TestClient(create_app(), base_url="https://test")


def test_health_ok():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert "X-Request-ID" in r.headers


def test_readiness_reports_deps():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["dependencies"].keys() == {"postgres", "redis", "s3"}
    # No compose stack on this machine -> degraded, never a crash.
    assert body["status"] in ("ok", "degraded")


def test_request_id_echo():
    r = client.get("/health", headers={"X-Request-ID": "abc123"})
    assert r.headers["X-Request-ID"] == "abc123"
