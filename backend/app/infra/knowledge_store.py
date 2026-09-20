"""File-backed knowledge store (Stage 3 laptop adapter).

Persists sources/documents/versions/chunks as JSON under BIS_DATA_DIR.
pgvector replaces this adapter when the compose stack runs — the
KnowledgeStore port keeps application code untouched.
"""

import json
import os
from pathlib import Path

from app.core.settings import get_settings
from app.domain.knowledge import Document, DocumentChunk, DocumentVersion, Source

FILES = ("sources", "documents", "versions", "chunks")


def data_dir() -> Path:
    d = Path(os.environ.get("BIS_DATA_DIR", Path(__file__).resolve().parents[2] / "data"))
    d.mkdir(parents=True, exist_ok=True)
    return d


class FileKnowledgeStore:
    def __init__(self, directory: Path | None = None) -> None:
        self.directory = directory or data_dir()
        self.sources: dict[str, Source] = {}
        self.documents: dict[str, Document] = {}
        self.versions: dict[str, DocumentVersion] = {}
        self.chunks: dict[str, DocumentChunk] = {}
        self.load()

    # -- persistence -----------------------------------------------------
    def _path(self, name: str) -> Path:
        return self.directory / f"{name}.json"

    def load(self) -> None:
        models = {"sources": Source, "documents": Document, "versions": DocumentVersion, "chunks": DocumentChunk}
        targets = {"sources": self.sources, "documents": self.documents, "versions": self.versions, "chunks": self.chunks}
        for name in FILES:
            p = self._path(name)
            if not p.exists():
                continue
            for raw in json.loads(p.read_text()):
                obj = models[name](**raw)
                key = obj.key if name == "sources" else obj.id
                targets[name][key] = obj

    def save(self) -> None:
        payloads = {
            "sources": [s.model_dump() for s in self.sources.values()],
            "documents": [d.model_dump() for d in self.documents.values()],
            "versions": [v.model_dump() for v in self.versions.values()],
            "chunks": [c.model_dump() for c in self.chunks.values()],
        }
        for name, rows in payloads.items():
            self._path(name).write_text(json.dumps(rows, indent=1))

    # -- port ------------------------------------------------------------
    def published_chunks(self) -> list[DocumentChunk]:
        published_versions = {v.id for v in self.versions.values() if v.status == "published"}
        return [c for c in self.chunks.values() if c.version_id in published_versions]

    def chunk_by_id(self, chunk_id: str) -> DocumentChunk | None:
        return self.chunks.get(chunk_id)

    # -- catalogue helpers (ingestion service) ---------------------------
    def upsert_source(self, source: Source) -> None:
        self.sources[source.key] = source
        self.save()

    def add_document(self, doc: Document, version: DocumentVersion, chunks: list[DocumentChunk]) -> None:
        self.documents[doc.id] = doc
        self.versions[version.id] = version
        for c in chunks:
            self.chunks[c.id] = c
        self.save()

    def set_version_status(self, version_id: str, status: str) -> None:
        self.versions[version_id].status = status  # type: ignore[assignment]
        self.save()


_store: FileKnowledgeStore | None = None


def get_store() -> FileKnowledgeStore:
    global _store
    if _store is None:
        _store = FileKnowledgeStore()
        _seed_if_empty(_store)
    return _store


def reset_store(directory: Path | None = None) -> FileKnowledgeStore:
    """Test hook: fresh store, optionally in a tmp dir."""
    global _store
    _store = FileKnowledgeStore(directory=directory)
    if not _store.sources:
        _seed_if_empty(_store)
    return _store


def _seed_if_empty(store: FileKnowledgeStore) -> None:
    from app.infra.seeds import SEED_SOURCES, seed_documents

    if store.sources:
        return
    for src in SEED_SOURCES:
        store.sources[src.key] = src
    for doc, version, chunks in seed_documents():
        store.documents[doc.id] = doc
        store.versions[version.id] = version
        for c in chunks:
            store.chunks[c.id] = c
    store.save()
    _ = get_settings  # settings available for future seed toggles
