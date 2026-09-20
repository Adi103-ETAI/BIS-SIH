"""CONV-* (docs/19 §3, 05 §5.4, 10)."""

import pytest
from fastapi.testclient import TestClient

from app.application import identity_service as ident
from app.domain.auth import Base
from app.domain.conversation import Conversation, Message
from app.infra.db import session_factory
from app.infra.knowledge_store import reset_store
from app.infra.rate_limit import reset_rate_limits
from app.main import create_app


@pytest.fixture()
def c(tmp_path, monkeypatch):
    from sqlalchemy import create_engine as _ce

    engine = _ce(f"sqlite:///{tmp_path}/conv.db", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    from app.domain.auth import ROLES, Role

    Session = session_factory(engine)
    with Session() as s:
        for code in ROLES:
            s.add(Role(code=code, description=code))
        s.commit()
    from app.infra import db as db_module

    real_sf = db_module.session_factory
    monkeypatch.setattr(db_module, "session_factory", lambda e=None: real_sf(engine))
    monkeypatch.setattr("app.infra.knowledge_store._store", None, raising=False)
    import app.infra.knowledge_store as ks

    monkeypatch.setattr(ks, "_store", None)
    reset_store(directory=tmp_path)
    ident.reset_lockouts()
    reset_rate_limits()
    client = TestClient(create_app(), base_url="https://test")
    import uuid as _uuid

    client.post("/api/v1/auth/register",
                json={"email": "u@x.com", "password": "longpassword1", "display_name": "U"},
                headers={"X-Forwarded-For": "t-" + _uuid.uuid4().hex[:8]})
    client._csrf = client.cookies.get("bis_csrf", "")
    return client


def _h(c, extra=None):
    h = {"X-CSRF-Token": c._csrf}  # noqa: SLF001
    if extra:
        h.update(extra)
    return h


def test_conv_001_crud_lifecycle(c):
    r = c.post("/api/v1/conversations", json={}, headers=_h(c))
    assert r.status_code == 201
    cid = r.json()["conversation_id"]
    assert c.get(f"/api/v1/conversations/{cid}").status_code == 200
    r = c.patch(f"/api/v1/conversations/{cid}", json={"title": "Renamed"},
                headers=_h(c))
    assert r.json()["title"] == "Renamed"
    r = c.get("/api/v1/conversations")
    assert r.json()["total"] == 1
    assert c.delete(f"/api/v1/conversations/{cid}", headers=_h(c)).status_code == 204
    assert c.get(f"/api/v1/conversations/{cid}").status_code == 404


def test_conv_002_ask_persists_two_rows(c):
    cid = c.post("/api/v1/conversations", json={}, headers=_h(c)).json()["conversation_id"]
    r = c.post(f"/api/v1/conversations/{cid}/messages",
               json={"query": "How do I verify HUID on gold jewellery?", "top_k": 3},
               headers=_h(c))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["role"] == "assistant" and body["status"] == "completed"
    assert body["citations"] and body["grounding"]["status"] == "grounded"
    msgs = c.get(f"/api/v1/conversations/{cid}/messages").json()
    assert [m["role"] for m in msgs["items"]] == ["user", "assistant"]


def test_conv_003_owner_isolation(c):
    cid = c.post("/api/v1/conversations", json={}, headers=_h(c)).json()["conversation_id"]
    c.post("/api/v1/auth/register", json={"email": "other@x.com", "password": "longpassword1",
                                           "display_name": "O"})
    # second user (fresh session in same jar) must see 404, not 403/200
    assert c.get(f"/api/v1/conversations/{cid}").status_code == 404


def test_conv_004_regenerate_keeps_prior(c):
    cid = c.post("/api/v1/conversations", json={}, headers=_h(c)).json()["conversation_id"]
    mid = c.post(f"/api/v1/conversations/{cid}/messages",
                 json={"query": "What karat options are hallmarked?"},
                 headers=_h(c)).json()["message_id"]
    r = c.post(f"/api/v1/conversations/{cid}/messages/{mid}/regenerate", headers=_h(c))
    assert r.status_code == 201 and r.json()["message_id"] != mid
    msgs = c.get(f"/api/v1/conversations/{cid}/messages").json()["items"]
    assert [m["role"] for m in msgs] == ["user", "assistant", "assistant"]


def test_conv_005_import_idempotent(c):
    payload = {"entries": [
        {"client_id": "h1", "query": "What is HUID?", "title": "HUID",
         "timestamp": 1720000000000,
         "response": {"answer": "HUID is … [1].",
                      "citations": [{"index": 1, "title": "T", "source_type": "bis",
                                     "chunk_text": "x", "score": 0.5, "mongo_id": "m1"}]}},
        {"client_id": "h2", "query": "ISI licence?", "title": "ISI", "timestamp": 1720000001000},
    ]}
    r = c.post("/api/v1/conversations/import", json=payload, headers=_h(c))
    assert r.json() == {"imported": 2, "skipped": 0}
    r = c.post("/api/v1/conversations/import", json=payload, headers=_h(c))
    assert r.json() == {"imported": 0, "skipped": 2}
    assert c.get("/api/v1/conversations").json()["total"] == 2
