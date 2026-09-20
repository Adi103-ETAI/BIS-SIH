"""Null embedding provider (OD-008 OPEN). Dense retrieval disabled until configured."""

from app.application.ports import EmbeddingProvider


class NullEmbeddings:
    dim = 0

    def embed(self, texts: list[str]) -> list[list[float]]:
        raise RuntimeError("no embedding provider configured (OD-008)")


def get_embedding_provider() -> EmbeddingProvider:
    return NullEmbeddings()  # type: ignore[return-value]
