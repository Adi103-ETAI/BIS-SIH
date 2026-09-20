"""Query orchestration behind POST /search (docs/02 BE-FR-001..007, docs/03 §5.1).

Stage 2: stub RAG — no knowledge indexed, so every valid query returns the
contract "empty" state (200, empty answer, empty citations, chunks_retrieved=0).
Stage 3 replaces `StubRagPipeline` with the real hybrid RAG orchestrator behind
the same interface; the route layer does not change.
"""

import asyncio
import time

from app.domain.search import SearchResponse

# End-to-end timeout budget for /search (BE-FR-002).
SEARCH_TIMEOUT_SECONDS = 30.0

# Display values until Stage 3 wires real providers (OD-003..006 analogues).
STUB_MODEL = "stub"
STUB_MODE = "standard"


class StubRagPipeline:
    async def run(self, query: str, top_k: int) -> SearchResponse:
        await asyncio.sleep(0)  # yield point where retrieval/generation will go
        return SearchResponse(
            answer="",
            citations=[],
            chunks_retrieved=0,
            query=query,
            model=STUB_MODEL,
            mode=STUB_MODE,
        )


async def answer_query(query: str, top_k: int) -> SearchResponse:
    start = time.monotonic()
    try:
        result = await asyncio.wait_for(
            StubRagPipeline().run(query, top_k), timeout=SEARCH_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError:
        raise TimeoutError("search timed out")
    _ = time.monotonic() - start  # latency hook for BE-FR observability (Stage 3+)
    return result
