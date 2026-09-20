"""Health endpoints (Stage 1). Readiness reflects dependency reachability."""

import socket

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.settings import get_settings

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str = "0.1.0-stage1"


class ReadinessResponse(HealthResponse):
    dependencies: dict[str, str]


def _tcp_reachable(host: str, port: int, timeout: float = 0.3) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


@router.get("/health")
def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(status="ok", environment=settings.environment)


@router.get("/api/v1/health", response_model=ReadinessResponse)
def readiness() -> ReadinessResponse:
    """Liveness + dependency checks. 'degraded' until compose stack runs (Stage 1)."""
    settings = get_settings()
    deps = {
        "postgres": "up" if _tcp_reachable("localhost", 5432) else "down",
        "redis": "up" if _tcp_reachable("localhost", 6379) else "down",
        "s3": "up" if _tcp_reachable("localhost", 9000) else "down",
    }
    status = "ok" if all(v == "up" for v in deps.values()) else "degraded"
    return ReadinessResponse(
        status=status, environment=settings.environment, dependencies=deps
    )
