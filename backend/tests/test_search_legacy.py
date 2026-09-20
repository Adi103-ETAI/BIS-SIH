"""API-LEG-001..006 — frozen POST /search contract suite (docs/19 §3).

Breaks = reject. Runs against the real backend build (TestClient = ASGI).
"""

from fastapi.testclient import TestClient

from app.application import query_orchestrator
from app.infra.rate_limit import reset_rate_limits
from app.main import create_app

client = TestClient(create_app())


def _search(body, ip="leg-1"):
    return client.post("/search", json=body, headers={"X-Forwarded-For": ip})


def test_api_leg_001_exact_shape():
    r = _search({"query": "Which IS applies to cutlery?", "top_k": 8})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"answer", "citations", "chunks_retrieved", "query", "model", "mode"}
    assert body["query"] == "Which IS applies to cutlery?"
    assert "X-Request-ID" in r.headers


def test_api_leg_002_top_k_defaults_and_limits():
    assert _search({"query": "q"}, ip="leg-2a").status_code == 200  # default 8
    for bad in (0, 21, "eight", 2.5, True):
        r = _search({"query": "q", "top_k": bad}, ip="leg-2b")
        assert r.status_code == 422, bad


def test_api_leg_003_empty_state_is_200():
    r = _search({"query": "unindexed query"}, ip="leg-3")
    assert r.status_code == 200
    assert r.json()["chunks_retrieved"] == 0
    assert r.json()["answer"] == ""
    assert r.json()["citations"] == []


def test_api_leg_004_detail_error_shape():
    for body in ({}, {"query": ""}, {"query": "   "}, {"query": "x" * 2001}):
        r = _search(body, ip="leg-4")
        assert r.status_code == 422
        assert set(r.json()) == {"detail"}


def test_api_leg_005_timeout_budget(monkeypatch):
    assert query_orchestrator.SEARCH_TIMEOUT_SECONDS == 30.0

    import app.api.routes_search as routes_search

    async def boom(query, top_k):
        raise TimeoutError("search timed out")

    monkeypatch.setattr(routes_search, "answer_query", boom)
    r = _search({"query": "q"}, ip="leg-5")
    assert r.status_code == 504
    assert set(r.json()) == {"detail"}


def test_api_leg_006_rate_limit():
    reset_rate_limits()
    ip = "leg-6"
    for _ in range(10):
        assert _search({"query": "q"}, ip=ip).status_code == 200
    r = _search({"query": "q"}, ip=ip)
    assert r.status_code == 429
    assert set(r.json()) == {"detail"}
    assert "Retry-After" in r.headers
    reset_rate_limits()
