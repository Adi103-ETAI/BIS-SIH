"""API-AUTH-* + SEC-AUTH-* (docs/19 §3, 05 §5.1–§5.2, 06)."""

import pytest
import uuid


def _uid():
    return 't-' + uuid.uuid4().hex[:8]
from fastapi.testclient import TestClient

from app.application import identity_service as ident
from app.domain.auth import Base
from app.infra import db as db_module
from app.infra.db import session_factory
from app.infra.rate_limit import reset_rate_limits
from app.main import create_app


@pytest.fixture()
def c(tmp_path, monkeypatch):
    from sqlalchemy import create_engine as _ce

    engine = _ce(f"sqlite:///{tmp_path}/auth.db", connect_args={"check_same_thread": False})
    from app.infra.db import init_db

    init_db(engine)
    from app.infra import db as db_module

    real_sf = db_module.session_factory
    monkeypatch.setattr(db_module, "session_factory", lambda e=None: real_sf(engine))
    ident.reset_lockouts()
    reset_rate_limits()
    return TestClient(create_app(), base_url="https://test")


def _register(c, email="u@example.com", password="longpassword1", name="U", ip=None):
    ip = ip or _uid()
    return c.post("/api/v1/auth/register",
                  json={"email": email, "password": password, "display_name": name},
                  headers={"X-Forwarded-For": ip})


def _login(c, email="u@example.com", password="longpassword1", ip=None):
    ip = ip or _uid()
    return c.post("/api/v1/auth/login", json={"email": email, "password": password},
                  headers={"X-Forwarded-For": ip})


def test_api_auth_001_register_login_me_logout(c):
    assert _register(c).status_code == 201
    assert _login(c).status_code == 200
    me = c.get("/api/v1/users/me")
    assert me.status_code == 200 and me.json()["email"] == "u@example.com"
    assert c.post("/api/v1/auth/logout").status_code == 204
    assert c.get("/api/v1/users/me").status_code == 401


def test_api_auth_002_validation_and_conflicts(c):
    assert _register(c, email="bad").status_code == 422
    assert _register(c, email="ok@x.com", password="short").status_code == 422
    assert _register(c).status_code == 201
    r = _register(c, ip="a2")  # same email again
    assert r.status_code == 409 and r.json()["error"]["code"] == "AUTH_EMAIL_TAKEN"


def test_api_auth_003_profile_patch(c):
    _register(c)
    r = c.patch("/api/v1/users/me", json={"display_name": "New Name", "locale": "hi"},
                headers={"X-CSRF-Token": c.cookies.get("bis_csrf", "")})
    assert r.status_code == 200 and r.json()["display_name"] == "New Name"
    assert c.patch("/api/v1/users/me", json={"locale": "xx"},
                   headers={"X-CSRF-Token": c.cookies.get("bis_csrf", "")}).status_code == 422


def test_sec_auth_001_lockout(c):
    ip = "lock-" + uuid.uuid4().hex[:8]
    _register(c, ip=ip)
    for i in range(5):
        r = _login(c, password="wrongpassword", ip=ip)
        assert r.status_code == 401, i
    r = _login(c, password="wrongpassword", ip=ip)
    assert r.status_code == 423 and r.json()["error"]["code"] == "AUTH_LOCKED"


def test_sec_auth_002_csrf_required(c):
    _register(c)
    c.headers.clear()
    r = c.patch("/api/v1/users/me", json={"display_name": "X"})  # no token at all
    assert r.status_code == 403
    r = c.patch("/api/v1/users/me", json={"display_name": "X"},
                headers={"X-CSRF-Token": "wrong"})
    assert r.status_code == 403


def test_sec_auth_003_password_change_rotates(c):
    _register(c, password="longpassword1")
    csrf = c.cookies.get("bis_csrf", "")
    r = c.post("/api/v1/auth/password-change",
               json={"current_password": "longpassword1", "new_password": "anotherlong2"},
               headers={"X-CSRF-Token": csrf})
    assert r.status_code == 204
    c.post("/api/v1/auth/logout")
    assert _login(c, password="anotherlong2").status_code == 200


def test_sec_auth_004_reset_flow(c):
    _register(c)
    assert c.post("/api/v1/auth/password-reset/request",
                  json={"email": "u@example.com"}).status_code == 202
    assert c.post("/api/v1/auth/password-reset/request",
                  json={"email": "nobody@x.com"}).status_code == 202  # no disclosure
    assert c.post("/api/v1/auth/password-reset/confirm",
                  json={"token": "bogus", "new_password": "brandnewlong3"}).status_code == 422


def test_sec_auth_005_admin_gate(c):
    # anonymous → 401 on admin surface
    with open(__file__, "rb") as fh:
        r = c.post("/api/v1/admin/documents/upload",
                   files={"file": ("t.txt", fh, "text/plain")},
                   data={"title": "T", "source_key": "bis-illustrative"})
    assert r.status_code in (401, 403)
    # first registered user is admin → allowed with CSRF
    _register(c, email="admin@x.com")
    csrf = c.cookies.get("bis_csrf", "")
    with open(__file__, "rb") as fh:
        r = c.post("/api/v1/admin/documents/upload",
                   files={"file": ("t.txt", fh, "text/plain")},
                   data={"title": "T", "source_key": "bis-illustrative"},
                   headers={"X-CSRF-Token": csrf})
    assert r.status_code == 201, r.text
