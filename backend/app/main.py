"""App factory. API layer stays thin; domain/application/infra fill in later stages."""

from fastapi import FastAPI

from app.api.middleware import RequestIdMiddleware
from app.api.routes_health import router as health_router
from app.core.errors import unhandled_exception_handler
from app.core.logging import configure_logging
from app.core.settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)
    app = FastAPI(title=settings.app_name, version="0.1.0-stage1")
    app.add_middleware(RequestIdMiddleware)
    app.add_exception_handler(Exception, unhandled_exception_handler)
    app.include_router(health_router)
    return app


app = create_app()
