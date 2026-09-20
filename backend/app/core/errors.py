"""Error models: unified v1 envelope vs frozen legacy {detail} (docs/18_ERROR_HANDLING.md)."""

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None
    request_id: str


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


def v1_error(request: Request, status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content=ErrorEnvelope(
            error=ErrorDetail(
                code=code,
                message=message,
                request_id=getattr(request.state, "request_id", "-"),
            )
        ).model_dump(),
    )


def legacy_error(status: int, message: str) -> JSONResponse:
    """Frozen legacy shape: exactly {detail}. Used only on /search + proxy paths."""
    return JSONResponse(status_code=status, content={"detail": message})


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Never leak stack traces (docs/17_SECURITY.md). request_id lets ops correlate.
    if request.url.path == "/search":
        return legacy_error(500, "Internal error")
    return v1_error(request, 500, "INTERNAL_ERROR", "Internal error")
