"""Catalogue service: published reads + admin versioning (docs/12)."""

from datetime import datetime

from sqlalchemy.orm import Session as DbSession

from app.domain.catalogue import Service, ServiceCategory, ServiceVersion
from app.infra.seeds_services import seed_catalogue


def _now() -> datetime:
    return datetime.utcnow()


def published_service(db: DbSession, service_key: str) -> tuple[Service | None, ServiceVersion | None]:
    """Published-only read — drafts/deprecated never disclose (404 either way)."""
    svc = db.query(Service).filter(Service.key == service_key, Service.status == "published").first()
    if svc is None or svc.current_version_number is None:
        return None, None
    ver = (
        db.query(ServiceVersion)
        .filter(ServiceVersion.service_key == service_key,
                ServiceVersion.version_number == svc.current_version_number,
                ServiceVersion.status == "published")
        .first()
    )
    return svc, ver


def list_published(db: DbSession, *, category: str | None, q: str | None) -> list[tuple[Service, ServiceVersion | None]]:
    seed_catalogue(db)
    query = db.query(Service).filter(Service.status == "published")
    if category:
        query = query.filter(Service.category_key == category)
    if q:
        like = f"%{q}%"
        query = query.filter((Service.name.ilike(like)) | (Service.description.ilike(like)))
    services = query.order_by(Service.name.asc()).all()
    out = []
    for svc in services:
        _, ver = published_service(db, svc.key)
        out.append((svc, ver))
    return out


def create_service(db: DbSession, data: dict) -> Service:
    svc = Service(
        key=data["service_key"], name=data.get("name", data["service_key"]),
        category_key=data.get("category_key", "product-certification"),
        description=data.get("description", ""), status="draft",
    )
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc


def patch_service(db: DbSession, svc: Service, data: dict) -> Service:
    for field in ("name", "description", "category_key", "status"):
        if data.get(field) is not None:
            setattr(svc, field, data[field])
    if svc.status not in ("draft", "published", "deprecated"):
        raise ValueError("status must be draft|published|deprecated")
    svc.updated_at = _now()
    db.commit()
    return svc


def create_version(db: DbSession, svc: Service, data: dict) -> ServiceVersion:
    latest = (
        db.query(ServiceVersion).filter(ServiceVersion.service_key == svc.key)
        .order_by(ServiceVersion.version_number.desc()).first()
    )
    number = (latest.version_number + 1) if latest else 1
    ver = ServiceVersion(
        service_key=svc.key, version_number=number, summary=data.get("summary", ""),
        eligibility=data.get("eligibility", []), fees=data.get("fees", []),
        required_documents=data.get("required_documents", []),
        workflow_ref=data.get("workflow_ref", ""), external_link=data.get("external_link"),
        integration_status=data.get("integration_status", "manual_only"),
        source_refs=data.get("source_refs", []),
        allowed_roles=data.get("allowed_roles", []),
        form_key=data.get("form_key"), status="draft",
    )
    db.add(ver)
    db.commit()
    db.refresh(ver)
    return ver


def publish_version(db: DbSession, svc: Service, version_number: int) -> ServiceVersion | None:
    ver = (
        db.query(ServiceVersion)
        .filter(ServiceVersion.service_key == svc.key,
                ServiceVersion.version_number == version_number,
                ServiceVersion.status == "draft")
        .first()
    )
    if ver is None:
        return None
    ver.status = "published"
    ver.published_at = _now()
    svc.current_version_number = version_number
    if svc.status == "draft":
        svc.status = "published"
    svc.updated_at = _now()
    db.commit()
    return ver


def category_name(db: DbSession, key: str) -> str:
    cat = db.query(ServiceCategory).filter(ServiceCategory.key == key).first()
    return cat.name if cat else key
