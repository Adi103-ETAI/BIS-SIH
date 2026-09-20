"""CSRF double-submit guard (docs/06): X-CSRF-Token on cookie-authenticated
non-GET /api/v1 writes. Registration/login/reset endpoints are exempt."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.application import identity_service as ident
from app.application.rbac import CSRF_COOKIE, CSRF_EXEMPT, CSRF_HEADER, SESSION_COOKIE
from app.core.errors import v1_error
from app.infra import db as db_module


def _deny(request: Request):  # type: ignore[no-untyped-def]
    return v1_error(request, 403, "CSRF_FAILED", "CSRF check failed")


class CsrfMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        if (
            request.method != "GET"
            and request.url.path.startswith("/api/v1/")
            and (request.method, request.url.path) not in CSRF_EXEMPT
        ):
            session_token = request.cookies.get(SESSION_COOKIE, "")
            header_token = request.headers.get(CSRF_HEADER, "")
            cookie_token = request.cookies.get(CSRF_COOKIE, "")
            # Double-submit: header is mandatory and must equal the cookie.
            if not session_token or not header_token or header_token != cookie_token:
                return _deny(request)
            csrf_token = header_token
            if not session_token or not csrf_token:
                return _deny(request)
            db = db_module.session_factory()()
            try:
                row, _ = ident.get_session_user(db, session_token)
            finally:
                db.close()
            if row is None or not ident.csrf_valid(row, csrf_token):
                return _deny(request)
        return await call_next(request)
