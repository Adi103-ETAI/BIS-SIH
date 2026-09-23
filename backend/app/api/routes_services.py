"""Service catalogue routes: public trio + admin management (docs/05 §5.6, §5.10)."""

import re

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.application import catalogue_service as cat
from app.application.rbac import get_current_user, require_admin
from app.core.errors import v1_error
from app.infra.db import db_session

router = APIRouter()

KEY_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _iso(dt):  # type: ignore[no-untyped-def]
    return dt.isoformat() + "Z" if dt else None


def _list_item(db, svc, ver) -> dict:  # type: ignore[no-untyped-def]
    return {"service_key": svc.key, "name": svc.name,
            "category": {"key": svc.category_key, "name": cat.category_name(db, svc.category_key)},
            "summary": ver.summary if ver else "", "status": "published",
            "current_version": {"version_number": svc.current_version_number,
                                "published_at": _iso(ver.published_at) if ver else None}}


def _detail(db, svc, ver) -> dict:  # type: ignore[no-untyped-def]
    return {"service_key": svc.key, "name": svc.name,
            "category": {"key": svc.category_key, "name": cat.category_name(db, svc.category_key)},
            "description": svc.description, "status": svc.status,
            "current_version": {
                "version_number": ver.version_number, "summary": ver.summary,
                "eligibility": ver.eligibility, "fees": ver.fees,
                "required_documents": ver.required_documents, "workflow_ref": ver.workflow_ref,
                "external_link": ver.external_link, "integration_status": ver.integration_status,
                "source_refs": ver.source_refs, "allowed_roles": ver.allowed_roles,
                "form_key": ver.form_key},
            "published_at": _iso(ver.published_at)}


def _admin_or_deny(admin):  # type: ignore[no-untyped-def]
    return None if hasattr(admin, "role_code") else admin


# -- public ---------------------------------------------------------------
@router.get("/api/v1/services")
async def list_services(request: Request, category: str | None = None, q: str | None = None,
                        page: int = 1, limit: int = 20, sort: str = "name",
                        db=Depends(db_session)) -> JSONResponse:
    if sort != "name":
        return v1_error(request, 422, "VALIDATION_FAILED", "sort must be name")
    limit = max(1, min(limit, 100))
    rows = cat.list_published(db, category=category, q=q)
    total = len(rows)
    items = [_list_item(db, svc, ver) for svc, ver in rows[(page - 1) * limit:page * limit]]
    return JSONResponse(status_code=200,
                        content={"items": items, "page": page, "limit": limit, "total": total})


@router.get("/api/v1/services/{service_key}")
async def service_detail(request: Request, service_key: str,
                         db=Depends(db_session)) -> JSONResponse:
    svc, ver = cat.published_service(db, service_key)
    if svc is None or ver is None:
        return v1_error(request, 404, "SERVICE_NOT_FOUND", "Service not found")
    return JSONResponse(status_code=200, content=_detail(db, svc, ver))


@router.get("/api/v1/services/{service_key}/schema")
async def service_schema(request: Request, service_key: str, db=Depends(db_session),
                         current=Depends(get_current_user)) -> JSONResponse:
    _, user = current
    if user is None:
        return v1_error(request, 401, "UNAUTHENTICATED", "Authentication required")
    svc, ver = cat.published_service(db, service_key)
    if svc is None or ver is None:
        return v1_error(request, 404, "SERVICE_NOT_FOUND", "Service not found")
    # Forms land in Stage 7 — no form bound yet, by design (roadmap Stage 6).
    return v1_error(request, 409, "SERVICE_HAS_NO_FORM", "Service has no published form yet")


# -- admin ----------------------------------------------------------------
class ServiceBody(BaseModel):
    service_key: str = ""
    name: str = ""
    category_key: str = "product-certification"
    description: str = ""


class ServicePatchBody(BaseModel):
    name: str | None = None
    description: str | None = None
    category_key: str | None = None
    status: str | None = None


class VersionBody(BaseModel):
    summary: str = ""
    eligibility: list = []
    fees: list = []
    required_documents: list = []
    workflow_ref: str = ""
    external_link: str | None = None
    integration_status: str = "manual_only"
    source_refs: list = []
    allowed_roles: list = []
    form_key: str | None = None


@router.post("/api/v1/admin/services")
async def admin_create(request: Request, body: ServiceBody, db=Depends(db_session),
                       admin=Depends(require_admin)) -> JSONResponse:
    if (denied := _admin_or_deny(admin)) is not None:
        return denied
    if not KEY_RE.match(body.service_key):
        return v1_error(request, 422, "VALIDATION_FAILED", "service_key must be kebab-case")
    from app.domain.catalogue import Service

    if db.query(Service).filter(Service.key == body.service_key).first() is not None:
        return v1_error(request, 409, "SERVICE_KEY_TAKEN", "Service key already exists")
    svc = cat.create_service(db, body.model_dump())
    return JSONResponse(status_code=201, content={"service_key": svc.key, "status": svc.status})


@router.patch("/api/v1/admin/services/{service_key}")
async def admin_patch(request: Request, service_key: str, body: ServicePatchBody,
                      db=Depends(db_session), admin=Depends(require_admin)) -> JSONResponse:
    if (denied := _admin_or_deny(admin)) is not None:
        return denied
    from app.domain.catalogue import Service

    svc = db.query(Service).filter(Service.key == service_key).first()
    if svc is None:
        return v1_error(request, 404, "SERVICE_NOT_FOUND", "Service not found")
    try:
        svc = cat.patch_service(db, svc, body.model_dump())
    except ValueError as exc:
        return v1_error(request, 422, "VALIDATION_FAILED", str(exc))
    return JSONResponse(status_code=200, content={"service_key": svc.key, "status": svc.status})


@router.post("/api/v1/admin/services/{service_key}/versions")
async def admin_new_version(request: Request, service_key: str, body: VersionBody,
                            db=Depends(db_session),
                            admin=Depends(require_admin)) -> JSONResponse:
    if (denied := _admin_or_deny(admin)) is not None:
        return denied
    from app.domain.catalogue import Service

    svc = db.query(Service).filter(Service.key == service_key).first()
    if svc is None:
        return v1_error(request, 404, "SERVICE_NOT_FOUND", "Service not found")
    ver = cat.create_version(db, svc, body.model_dump())
    return JSONResponse(status_code=201, content={"service_key": svc.key,
                                                  "version_number": ver.version_number,
                                                  "status": ver.status})


@router.post("/api/v1/admin/services/{service_key}/versions/{version_number}/publish")
async def admin_publish(request: Request, service_key: str, version_number: int,
                        db=Depends(db_session), admin=Depends(require_admin)) -> JSONResponse:
    if (denied := _admin_or_deny(admin)) is not None:
        return denied
    from app.domain.catalogue import Service

    svc = db.query(Service).filter(Service.key == service_key).first()
    if svc is None:
        return v1_error(request, 404, "SERVICE_NOT_FOUND", "Service not found")
    ver = cat.publish_version(db, svc, version_number)
    if ver is None:
        return v1_error(request, 404, "SERVICE_VERSION_NOT_FOUND", "No such draft version")
    return JSONResponse(status_code=200, content={"service_key": svc.key,
                                                  "version_number": ver.version_number,
                                                  "status": ver.status})
