"""Frozen POST /search + v1 shell (docs/05 §3–§4, roadmap Stage 2)."""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.application.query_orchestrator import answer_query
from app.core.errors import legacy_error
from app.domain.search import validate_search_request
from app.infra.rate_limit import check_rate_limit

router = APIRouter()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/search")
async def legacy_search(request: Request) -> JSONResponse:
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}

    try:
        query, top_k = validate_search_request(body.get("query", ""), body.get("top_k", 8))
    except ValueError as exc:
        return legacy_error(422, str(exc))

    allowed, retry_after = check_rate_limit("search_anon", _client_ip(request))
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"detail": "rate limit exceeded"},
            headers={"Retry-After": str(retry_after)},
        )

    try:
        result = await answer_query(query, top_k)
    except TimeoutError:
        return legacy_error(504, "search timed out")
    return JSONResponse(status_code=200, content=result.model_dump())


@router.get("/api/v1/search")
async def v1_search_shell() -> JSONResponse:
    """Shell until Stage 3 wires the real RAG pipeline (roadmap Stage 2)."""
    return JSONResponse(status_code=501, content={"detail": "v1 search not yet implemented"})
