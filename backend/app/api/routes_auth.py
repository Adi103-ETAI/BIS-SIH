"""Auth + profile endpoints (docs/05 §5.1–§5.2)."""

import re

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.application import identity_service as ident
from app.application.rbac import CSRF_COOKIE, SESSION_COOKIE, get_current_user, require_user
from app.core.errors import v1_error
from app.infra.db import db_session, init_db, session_factory
from app.infra.rate_limit import check_rate_limit

router = APIRouter()

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
LOCALES = {"en", "hi"}

init_db()  # ensure tables + role seeds on boot (Alembic owns evolution on Supabase)


class RegisterBody(BaseModel):
    email: str = ""
    password: str = ""
    display_name: str = ""


class LoginBody(BaseModel):
    email: str = ""
    password: str = ""


class PasswordChangeBody(BaseModel):
    current_password: str = ""
    new_password: str = ""


class ResetRequestBody(BaseModel):
    email: str = ""


class ResetConfirmBody(BaseModel):
    token: str = ""
    new_password: str = ""


class ProfilePatchBody(BaseModel):
    display_name: str | None = None
    locale: str | None = None


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _auth_limited(request: Request):
    allowed, retry_after = check_rate_limit("auth", _client_ip(request))
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"error": {"code": "RATE_LIMITED", "message": "Rate limit exceeded",
                               "request_id": getattr(request.state, "request_id", "-")}},
            headers={"Retry-After": str(retry_after)},
        )
    return None


def _set_session_cookies(resp: JSONResponse, session_token: str, csrf_token: str) -> None:
    resp.set_cookie(SESSION_COOKIE, session_token, max_age=14 * 86400, httponly=True,
                    secure=True, samesite="lax", path="/")
    resp.set_cookie(CSRF_COOKIE, csrf_token, max_age=14 * 86400, httponly=False,
                    secure=True, samesite="lax", path="/")


def _public_user(user) -> dict:  # type: ignore[no-untyped-def]
    return {"user_id": user.id, "email": user.email, "display_name": user.display_name,
            "role": user.role_code, "locale": user.locale}


@router.post("/api/v1/auth/register")
async def register(request: Request, body: RegisterBody, db=Depends(db_session)) -> JSONResponse:
    limited = _auth_limited(request)
    if limited is not None:
        return limited
    email = body.email.strip()
    if not EMAIL_RE.match(email):
        return v1_error(request, 422, "VALIDATION_FAILED", "Invalid email address")
    if (msg := ident.check_password_rules(body.password)) is not None:
        return v1_error(request, 422, "VALIDATION_FAILED", msg)
    name = body.display_name.strip()
    if not (1 <= len(name) <= 80):
        return v1_error(request, 422, "VALIDATION_FAILED", "display_name must be 1-80 characters")
    if ident.get_user_by_email(db, email) is not None:
        return v1_error(request, 409, "AUTH_EMAIL_TAKEN", "Email already registered")
    user = ident.create_user(db, email=email, password=body.password, display_name=name)
    session_token, csrf_token = ident.create_session(db, user)
    resp = JSONResponse(status_code=201, content={"user_id": user.id, "email": user.email,
                                                  "display_name": user.display_name})
    _set_session_cookies(resp, session_token, csrf_token)
    return resp


@router.post("/api/v1/auth/login")
async def login(request: Request, body: LoginBody, db=Depends(db_session)) -> JSONResponse:
    limited = _auth_limited(request)
    if limited is not None:
        return limited
    email = body.email.strip()
    ip = _client_ip(request)
    if ident.is_locked(email, ip):
        return v1_error(request, 423, "AUTH_LOCKED", "Too many failed attempts. Try again later.")
    user = ident.get_user_by_email(db, email)
    if user is None or not ident.verify_password(user.password_hash, body.password):
        ident.record_failure(email, ip)
        return v1_error(request, 401, "AUTH_INVALID_CREDENTIALS", "Invalid email or password")
    ident.clear_failures(email, ip)
    session_token, csrf_token = ident.create_session(db, user)
    resp = JSONResponse(status_code=200, content={"user": _public_user(user)})
    _set_session_cookies(resp, session_token, csrf_token)
    return resp


@router.post("/api/v1/auth/logout")
async def logout(request: Request, db=Depends(db_session)) -> JSONResponse:
    row, _ = ident.get_session_user(db, request.cookies.get(SESSION_COOKIE, ""))
    if row is not None:
        ident.revoke_session(db, row)
    resp = JSONResponse(status_code=204, content=None)
    resp.delete_cookie(SESSION_COOKIE, path="/")
    resp.delete_cookie(CSRF_COOKIE, path="/")
    return resp


@router.post("/api/v1/auth/password-change")
async def password_change(request: Request, body: PasswordChangeBody, db=Depends(db_session),
                          current=Depends(get_current_user)) -> JSONResponse:
    _, user = current
    if user is None:
        return v1_error(request, 401, "UNAUTHENTICATED", "Authentication required")
    if not ident.verify_password(user.password_hash, body.current_password):
        return v1_error(request, 401, "AUTH_INVALID_CREDENTIALS", "Invalid email or password")
    if (msg := ident.check_password_rules(body.new_password)) is not None:
        return v1_error(request, 422, "VALIDATION_FAILED", msg)
    user.password_hash = ident.hash_password(body.new_password)
    db.commit()
    row, _ = ident.get_session_user(db, request.cookies.get(SESSION_COOKIE, ""))
    ident.revoke_user_sessions(db, user.id, except_id=row.id if row else "")
    return JSONResponse(status_code=204, content=None)


@router.post("/api/v1/auth/password-reset/request")
async def reset_request(request: Request, body: ResetRequestBody, db=Depends(db_session)) -> JSONResponse:
    limited = _auth_limited(request)
    if limited is not None:
        return limited
    ident.request_reset(db, body.email.strip())  # always 202 — no existence disclosure
    return JSONResponse(status_code=202, content={"status": "accepted"})


@router.post("/api/v1/auth/password-reset/confirm")
async def reset_confirm(request: Request, body: ResetConfirmBody, db=Depends(db_session)) -> JSONResponse:
    if (msg := ident.check_password_rules(body.new_password)) is not None:
        return v1_error(request, 422, "VALIDATION_FAILED", msg)
    if not ident.confirm_reset(db, body.token, body.new_password):
        return v1_error(request, 422, "AUTH_TOKEN_INVALID_OR_EXPIRED", "Reset token invalid or expired")
    return JSONResponse(status_code=204, content=None)


@router.get("/api/v1/users/me")
async def users_me(request: Request, current=Depends(get_current_user)) -> JSONResponse:
    _, user = current
    if user is None:
        return v1_error(request, 401, "UNAUTHENTICATED", "Authentication required")
    return JSONResponse(status_code=200, content=_public_user(user))


@router.patch("/api/v1/users/me")
async def users_me_patch(request: Request, body: ProfilePatchBody, db=Depends(db_session),
                         current=Depends(get_current_user)) -> JSONResponse:
    _, user = current
    if user is None:
        return v1_error(request, 401, "UNAUTHENTICATED", "Authentication required")
    if body.display_name is not None:
        name = body.display_name.strip()
        if not (1 <= len(name) <= 80):
            return v1_error(request, 422, "VALIDATION_FAILED", "display_name must be 1-80 characters")
        user.display_name = name
    if body.locale is not None:
        if body.locale not in LOCALES:
            return v1_error(request, 422, "VALIDATION_FAILED", "locale must be one of: en, hi")
        user.locale = body.locale
    db.commit()
    return JSONResponse(status_code=200, content=_public_user(user))


async def _unused() -> None:
    _ = require_user  # re-export guard: user gate used by later stages
