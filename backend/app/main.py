"""App factory. API layer stays thin; domain/application/infra fill in later stages."""

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError

from app.api.middleware import RequestIdMiddleware
from app.api.middleware_csrf import CsrfMiddleware
from app.api.routes_auth import router as auth_router
from app.api.routes_health import router as health_router
from app.api.routes_knowledge import router as knowledge_router
from app.api.routes_search import router as search_router
from app.core.errors import legacy_error, unhandled_exception_handler
from app.core.logging import configure_logging
from app.core.settings import get_settings


async def validation_exception_handler(request, exc: RequestValidationError):  # type: ignore[no-untyped-def]
    # Frozen contract: validation failures on /search are 422 {detail}.
    if request.url.path == "/search":
        return legacy_error(422, "query must be 1-2000 characters")
    from app.core.errors import v1_error

    return v1_error(request, 422, "VALIDATION_FAILED", "Request validation failed")


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)
    app = FastAPI(title=settings.app_name, version="0.1.0-stage1")
    app.add_middleware(CsrfMiddleware)
    app.add_middleware(RequestIdMiddleware)
    app.add_exception_handler(Exception, unhandled_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(search_router)
    app.include_router(knowledge_router)
    return app


app = create_app()
