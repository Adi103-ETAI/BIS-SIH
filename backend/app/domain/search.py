"""Legacy /search contract models (docs/05 §3 — frozen, byte-compatible).

Field names, shapes, and validation ranges are part of the frozen contract.
Do not rename, remove, or tighten without a formal contract change.
"""

from typing import Literal

from pydantic import BaseModel, Field

SourceType = Literal["bis", "iso", "iec"]

QUERY_MIN_LEN = 1
QUERY_MAX_LEN = 2000
TOP_K_MIN = 1
TOP_K_MAX = 20
TOP_K_DEFAULT = 8


class SearchRequest(BaseModel):
    query: str
    top_k: int = TOP_K_DEFAULT


class Citation(BaseModel):
    index: int
    title: str
    source_type: SourceType
    chunk_text: str
    score: float
    mongo_id: str  # legacy alias of chunk_id (OD-003)


class SearchResponse(BaseModel):
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    chunks_retrieved: int
    query: str
    model: str
    mode: str


def validate_search_request(raw_query: object, raw_top_k: object) -> tuple[str, int]:
    """Shared validation. Returns (query, top_k) or raises ValueError with the
    stable legacy message used in the 422 {detail} body."""
    query = raw_query if isinstance(raw_query, str) else ""
    query = query.strip()
    if not (QUERY_MIN_LEN <= len(query) <= QUERY_MAX_LEN):
        raise ValueError("query must be 1-2000 characters")
    try:
        top_k = raw_top_k
        if isinstance(top_k, bool) or not isinstance(top_k, int):
            raise ValueError("top_k must be an integer 1-20")
    except ValueError:
        raise ValueError("top_k must be an integer 1-20")
    if not (TOP_K_MIN <= top_k <= TOP_K_MAX):
        raise ValueError("top_k must be an integer 1-20")
    return query, top_k
