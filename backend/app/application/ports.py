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


class VectorStore(Protocol):
    """Dense retrieval over pgvector (docs/07 §5). File store covers dev/test."""

    dim: int

    def upsert(self, chunks: list[DocumentChunk], vectors: list[list[float]],
               model: str) -> int: ...
    def search(self, vector: list[float], top_k: int,
               version_ids: list[str] | None = None) -> list[tuple[str, float]]: ...
    """Returns (chunk_id, cosine_distance) ascending — caller maps to chunks."""
