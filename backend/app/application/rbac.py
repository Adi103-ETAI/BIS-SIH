"""RBAC dependencies (docs/06): session cookie → user; admin gate; owner guard."""

from fastapi import Depends, Request

from app.application import identity_service as ident
from app.core.errors import v1_error
from app.domain.auth import Session, User
from app.infra.db import db_session, session_factory

SESSION_COOKIE = "bis_session"
CSRF_COOKIE = "bis_csrf"
CSRF_HEADER = "X-CSRF-Token"

# Paths that create a session (or need none) — exempt from CSRF token checks.
CSRF_EXEMPT = {
    ("POST", "/api/v1/auth/register"),
    ("POST", "/api/v1/auth/login"),
    ("POST", "/api/v1/auth/logout"),  # idempotent; no state worth forging
    ("POST", "/api/v1/auth/password-reset/request"),
    ("POST", "/api/v1/auth/password-reset/confirm"),
}


def get_current_user(request: Request, db=Depends(db_session)) -> tuple[Session | None, User | None]:
    token = request.cookies.get(SESSION_COOKIE, "")
    if not token:
        return None, None
    return ident.get_session_user(db, token)


def require_user(result=Depends(get_current_user)):
    _, user = result
    return user


def require_admin(request: Request, result=Depends(get_current_user)):
    _, user = result
    if user is None:
        return v1_error(request, 401, "UNAUTHENTICATED", "Authentication required")
    if user.role_code != "admin":
        return v1_error(request, 403, "PERMISSION_DENIED", "Admin role required")
    return user
