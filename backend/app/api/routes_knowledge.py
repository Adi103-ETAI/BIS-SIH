"""Knowledge + enriched search routes (docs/05 §4–§5, §5.10 admin).

Admin endpoints are open in dev; session auth gates them at Stage 4 (TODO).
"""

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import JSONResponse

from app.application.ingestion_service import get_job, ingest_text, publish_version
from app.application.rag_orchestrator import RagOrchestrator
from app.core.errors import legacy_error, v1_error
from app.domain.search import validate_search_request
from app.infra.knowledge_store import get_store

router = APIRouter()


def _orchestrator() -> RagOrchestrator:
    return RagOrchestrator(get_store())


# -- public ---------------------------------------------------------------
@router.get("/api/v1/sources")
async def list_sources() -> JSONResponse:
    store = get_store()
    return JSONResponse(
        status_code=200,
        content={
            "items": [s.model_dump() for s in store.sources.values()],
            "page": 1,
            "limit": 100,
            "total": len(store.sources),
        },
    )


@router.post("/api/v1/search")
async def v1_search(request: Request) -> JSONResponse:
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    try:
        query, top_k = validate_search_request(body.get("query", ""), body.get("top_k", 8))
    except ValueError as exc:
        return v1_error(request, 422, "VALIDATION_FAILED", str(exc))
    try:
        result = _orchestrator().answer(query, top_k)
    except AssertionError:
        return v1_error(request, 502, "RETRIEVAL_FAILED", "Citation validation failed")
    payload = result.model_dump()
    payload["grounding"] = "grounded" if result.citations else "insufficient_evidence"
    return JSONResponse(status_code=200, content=payload)


# -- admin (Stage 4 TODO: require session + admin role) --------------------
@router.post("/api/v1/admin/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    source_key: str = Form(...),
) -> JSONResponse:
    name = file.filename or "upload"
    if not name.lower().endswith((".txt", ".md", ".pdf")):
        return JSONResponse(status_code=422, content={"detail": "only .txt, .md, .pdf accepted"})
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        return JSONResponse(status_code=422, content={"detail": "file too large (5 MB max)"})
    if name.lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader

            reader = PdfReader(__import__("io").BytesIO(raw))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            return JSONResponse(status_code=422, content={"detail": "unreadable PDF"})
    else:
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            return JSONResponse(status_code=422, content={"detail": "file must be UTF-8 text"})
    job = ingest_text(get_store(), file_name=name, title=title.strip(), source_key=source_key, text=text)
    status = 201 if job.stage == "published" else 422
    return JSONResponse(
        status_code=status,
        content={"job_id": job.id, "stage": job.stage, "detail": job.stage_detail,
                 "document_id": job.document_id, "version_id": job.version_id, "error": job.error},
    )


@router.get("/api/v1/admin/jobs/{job_id}")
async def job_status(job_id: str) -> JSONResponse:
    job = get_job(job_id)
    if job is None:
        return JSONResponse(status_code=404, content={"detail": "unknown job"})
    return JSONResponse(status_code=200, content={"job_id": job.id, "stage": job.stage,
                                                  "detail": job.stage_detail, "error": job.error})


@router.post("/api/v1/admin/documents/{version_id}/publish")
async def publish_document(version_id: str) -> JSONResponse:
    if not publish_version(get_store(), version_id):
        return JSONResponse(status_code=404, content={"detail": "no such draft version"})
    return JSONResponse(status_code=200, content={"version_id": version_id, "status": "published"})


async def _unused() -> None:
    _ = legacy_error  # re-export guard: legacy shape stays owned by routes_search
