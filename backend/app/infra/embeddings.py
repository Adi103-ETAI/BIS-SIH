"""Embedding providers: HF Inference (live) with Null fallback (docs/07 §3).

The query-time model MUST match the batch model (bge-m3) — mismatched spaces
break retrieval silently. Vectors are L2-normalized to match the Kaggle export.
"""

import math
import urllib.request
import json

from app.application.ports import EmbeddingProvider
from app.core.settings import get_settings


class NullEmbeddings:
    dim = 0

    def embed(self, texts: list[str]) -> list[list[float]]:
        raise RuntimeError("no embedding provider configured (OD-008)")


class HfApiEmbeddings:
    def __init__(self, model: str, token: str, dim: int) -> None:
        self.model = model
        self.token = token
        self.dim = dim

    def embed(self, texts: list[str]) -> list[list[float]]:
        from app.infra._http import post_json

        vectors = post_json(
            f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.model}",
            {"inputs": texts, "options": {"wait_for_model": True}},
            {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"},
        )
        out = []
        for vec in vectors:
            if isinstance(vec[0], list):  # token-level -> mean pool (shouldn't happen for bge-m3)
                vec = [sum(c) / len(c) for c in zip(*vec)]
            norm = math.sqrt(sum(x * x for x in vec)) or 1.0
            out.append([x / norm for x in vec])
        return out


def get_embedding_provider() -> EmbeddingProvider:
    s = get_settings()
    if s.hf_api_token and s.embedding_model:
        return HfApiEmbeddings(s.embedding_model, s.hf_api_token, s.embedding_dim)
    return NullEmbeddings()  # type: ignore[return-value]
