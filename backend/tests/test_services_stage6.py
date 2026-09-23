"""SRV-* (docs/19 §3, 05 §5.6/§5.10, 12)."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.application import identity_service as ident
from app.domain.auth import Base
from app.infra.db import session_factory
from app.infra.knowledge_store import reset_store
from app.infra.rate_limit import reset_rate_limits
from app.main import create_app


@pytest.fixture()
def c(tmp_path, monkeypatch):
    from sqlalchemy import create_engine as _ce

    engine = _ce(f"sqlite:///{tmp_path}/srv.db", connect_args={"check_same_thread": False})
    from app.infra.db import init_db

    init_db(engine)
    from app.infra import db as db_module

    real_sf = db_module.session_factory
    monkeypatch.setattr(db_module, "session_factory", lambda e=None: real_sf(engine))
    reset_store(directory=tmp_path)
    ident.reset_lockouts()
    reset_rate_limits()
    client = TestClient(create_app(), base_url="https://test")
    client.post("/api/v1/auth/register",
                json={"email": "admin@x.com", "password": "longpassword1", "display_name": "A"},
                headers={"X-Forwarded-For": "t-" + uuid.uuid4().hex[:8]})
    client._csrf = client.cookies.get("bis_csrf", "")
    return client


def _h(c, extra=None):
    h = {"X-CSRF-Token": c._csrf}  # noqa: SLF001
    if extra:
        h.update(extra)
    return h


def test_srv_001_seed_list_public(c):
    r = c.get("/api/v1/services")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 2
    keys = {i["service_key"] for i in body["items"]}
    assert "product-certification" in keys
    assert all(i["status"] == "published" for i in body["items"])


def test_srv_002_detail_and_filters(c):
    r = c.get("/api/v1/services/product-certification")
    assert r.status_code == 200
    v = r.json()["current_version"]
    assert v["integration_status"] == "manual_only" and v["fees"][0]["amount"] is None
    assert c.get("/api/v1/services?category=hallmarking").json()["total"] == 1
    assert c.get("/api/v1/services?q=ISI+mark").json()["total"] >= 1
    assert c.get("/api/v1/services/nope").status_code == 404


def test_srv_003_schema_gates(c):
    # anonymous → 401; authed on published service without form → 409
    c.cookies.clear()
    assert c.get("/api/v1/services/product-certification/schema").status_code == 401
    c.post("/api/v1/auth/register",
           json={"email": "u@x.com", "password": "longpassword1", "display_name": "U"},
           headers={"X-Forwarded-For": "t-" + uuid.uuid4().hex[:8]})
    r = c.get("/api/v1/services/product-certification/schema")
    assert r.status_code == 409 and r.json()["error"]["code"] == "SERVICE_HAS_NO_FORM"


def test_srv_004_draft_invisible(c):
    r = c.post("/api/v1/admin/services", json={"service_key": "draft-svc", "name": "Draft"},
               headers=_h(c))
    assert r.status_code == 201
    assert c.get("/api/v1/services/draft-svc").status_code == 404  # no disclosure
    assert "draft-svc" not in {i["service_key"] for i in c.get("/api/v1/services").json()["items"]}


def test_srv_005_version_publish_flow(c):
    h = _h(c)
    assert c.post("/api/v1/admin/services", json={"service_key": "flow-svc", "name": "Flow"},
                  headers=h).status_code == 201
    r = c.post("/api/v1/admin/services/flow-svc/versions", json={"summary": "v1 summary"},
               headers=h)
    assert r.status_code == 201 and r.json()["version_number"] == 1
    r = c.post("/api/v1/admin/services/flow-svc/versions/1/publish", headers=h)
    assert r.status_code == 200
    assert c.get("/api/v1/services/flow-svc").status_code == 200
    # non-admin cannot manage
    c.post("/api/v1/auth/register",
           json={"email": "u2@x.com", "password": "longpassword1", "display_name": "U2"},
           headers={"X-Forwarded-For": "t-" + uuid.uuid4().hex[:8]})
    assert c.post("/api/v1/admin/services", json={"service_key": "x", "name": "X"},
                  headers=_h(c)).status_code == 403
