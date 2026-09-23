"""Service catalogue models (docs/04 §4.4, 12). Content, not code."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.auth import _new_id, _utcnow
from app.domain.auth import Base  # noqa: F401 (single metadata)


class ServiceCategory(Base):
    __tablename__ = "service_categories"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))


class Service(Base):
    __tablename__ = "services"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)  # kebab-case public id
    name: Mapped[str] = mapped_column(String(200))
    category_key: Mapped[str] = mapped_column(ForeignKey("service_categories.key"))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default="draft")  # draft|published|deprecated
    current_version_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)


class ServiceVersion(Base):
    __tablename__ = "service_versions"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_new_id)
    service_key: Mapped[str] = mapped_column(ForeignKey("services.key"), index=True)
    version_number: Mapped[int] = mapped_column(Integer)
    summary: Mapped[str] = mapped_column(Text, default="")
    eligibility: Mapped[list] = mapped_column(JSON, default=list)
    fees: Mapped[list] = mapped_column(JSON, default=list)
    required_documents: Mapped[list] = mapped_column(JSON, default=list)
    workflow_ref: Mapped[str] = mapped_column(String(128), default="")
    external_link: Mapped[str | None] = mapped_column(String(512), nullable=True)
    integration_status: Mapped[str] = mapped_column(String(32), default="manual_only")
    source_refs: Mapped[list] = mapped_column(JSON, default=list)
    allowed_roles: Mapped[list] = mapped_column(JSON, default=list)
    form_key: Mapped[str | None] = mapped_column(String(64), nullable=True)  # bound at Stage 7
    status: Mapped[str] = mapped_column(String(16), default="draft")  # draft|published
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
