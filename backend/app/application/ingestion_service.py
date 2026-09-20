"""Ingestion MVP: manual upload → chunk → draft → admin-gated publish (docs/09).

Synchronous processing (small files on laptop). Job states mirror the doc
lifecycle subset: pending → running → published | failed | quarantined.
"""

import uuid
from dataclasses import dataclass, field

from app.domain.knowledge import Document, DocumentChunk, DocumentVersion
from app.infra.seeds import new_ids

CHUNK_WORDS_MIN = 40
CHUNK_WORDS_MAX = 120
CHUNK_OVERLAP = 18


def chunk_text(text: str) -> list[str]:
    """Word-window chunking with overlap (token-budget approx of 09 §7)."""
    words = text.split()
    if len(words) <= CHUNK_WORDS_MAX:
        return [" ".join(words)] if words else []
    chunks, start = [], 0
    while start < len(words):
        end = min(start + CHUNK_WORDS_MAX, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = end - CHUNK_OVERLAP
    return chunks


@dataclass
class IngestionJob:
    id: str
    file_name: str
    title: str
    source_key: str
    stage: str = "pending"
    stage_detail: str = "queued"
    document_id: str = ""
    version_id: str = ""
    error: str = ""


_jobs: dict[str, IngestionJob] = {}


def get_job(job_id: str) -> IngestionJob | None:
    return _jobs.get(job_id)


def ingest_text(store, *, file_name: str, title: str, source_key: str, text: str) -> IngestionJob:
    job = IngestionJob(id=uuid.uuid4().hex[:12], file_name=file_name, title=title, source_key=source_key)
    _jobs[job.id] = job
    try:
        job.stage, job.stage_detail = "running", "validating"
        clean = text.strip()
        if not clean:
            raise ValueError("empty document")
        if source_key not in store.sources:
            raise ValueError(f"unknown source_key: {source_key}")
        job.stage_detail = "chunking"
        pieces = chunk_text(clean)
        doc_id, version_id = new_ids(title.lower().replace(" ", "-")[:24] or "doc")
        version = DocumentVersion(id=version_id, document_id=doc_id, version=1, status="draft")
        doc = Document(id=doc_id, source_key=source_key, title=title, current_version_id=version_id)
        chunks = [
            DocumentChunk(id=f"{doc_id}-c{i}", document_id=doc_id, version_id=version_id,
                          chunk_text=p, ordinal=i)
            for i, p in enumerate(pieces)
        ]
        job.stage_detail = "indexing"
        store.add_document(doc, version, chunks)
        job.document_id, job.version_id = doc_id, version_id
        job.stage, job.stage_detail = "published", "awaiting admin publish (draft)"
    except Exception as exc:
        job.stage, job.error = "failed", str(exc)
    return job


def publish_version(store, version_id: str) -> bool:
    """Admin gate: draft → published. Only published versions are retrieved."""
    version = store.versions.get(version_id)
    if version is None or version.status != "draft":
        return False
    store.set_version_status(version_id, "published")
    return True
