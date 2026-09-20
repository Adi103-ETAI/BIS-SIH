"""Port interfaces (docs/03 §4, 07 §3). Swaps touch no application code."""

from typing import Protocol

from app.domain.knowledge import DocumentChunk


class EmbeddingProvider(Protocol):
    dim: int

    def embed(self, texts: list[str]) -> list[list[float]]: ...


class Generator(Protocol):
    """Produces the answer markdown from evidence. Extractive now, LLM later."""

    def generate(self, query: str, evidence: list[DocumentChunk]) -> str: ...


class KnowledgeStore(Protocol):
    def published_chunks(self) -> list[DocumentChunk]: ...
    def chunk_by_id(self, chunk_id: str) -> DocumentChunk | None: ...
