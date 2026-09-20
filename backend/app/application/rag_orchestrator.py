"""RAG orchestration, Stage 3 scope (docs/07 §2).

Pipeline now: normalize → lexical retrieval (dense slot reserved for OD-008)
→ assemble → extractive compose → citation validate.
`top_k` caps evidence; scores are lexical overlap ratios in [0, 1].
"""

import re

from app.domain.knowledge import DocumentChunk
from app.domain.search import Citation, SearchResponse
from app.infra.generation import INSUFFICIENT_EVIDENCE_ANSWER, ExtractiveComposer

MIN_SCORE = 0.12

_STOPWORDS = frozenset(
    "a an the is are was were be been to of in on for and or with what which who whom "
    "whose how why when where does do did can could should would i me my we you your "
    "it its this that these those as at by from into about tell me explain "
    "bis isi indian standard standards".split()
)


def tokenize(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in _STOPWORDS}


def lexical_score(query_tokens: set[str], chunk_tokens: set[str]) -> float:
    if not query_tokens or not chunk_tokens:
        return 0.0
    overlap = query_tokens & chunk_tokens
    # blend of query coverage and overlap coefficient
    return 0.7 * len(overlap) / len(query_tokens) + 0.3 * len(overlap) / len(chunk_tokens)


class RagOrchestrator:
    def __init__(self, store, composer: ExtractiveComposer | None = None) -> None:
        self.store = store
        self.composer = composer or ExtractiveComposer()

    def retrieve(self, query: str, top_k: int) -> list[tuple[DocumentChunk, float]]:
        qtokens = tokenize(query)
        scored = [
            (c, lexical_score(qtokens, tokenize(c.chunk_text)))
            for c in self.store.published_chunks()
        ]
        scored = [(c, s) for c, s in scored if s >= MIN_SCORE]
        scored.sort(key=lambda item: item[1], reverse=True)
        return scored[:top_k]

    def answer(self, query: str, top_k: int) -> SearchResponse:
        hits = self.retrieve(query.strip(), top_k)
        if not hits:
            return SearchResponse(
                answer=INSUFFICIENT_EVIDENCE_ANSWER,
                citations=[],
                chunks_retrieved=0,
                query=query.strip(),
                model="extractive",
                mode="standard",
            )
        evidence = [c for c, _ in hits]
        answer = self.composer.generate(query.strip(), evidence)
        citations = [
            Citation(
                index=i,
                title=self._chunk_title(c),
                source_type=self._chunk_source(c),
                chunk_text=c.chunk_text,
                score=round(s, 4),
                mongo_id=c.id,
            )
            for i, (c, s) in enumerate(hits, start=1)
        ]
        validated = self.validate_citations(answer, citations)
        return SearchResponse(
            answer=answer,
            citations=validated,
            chunks_retrieved=len(hits),
            query=query.strip(),
            model="extractive",
            mode="standard",
        )

    @staticmethod
    def validate_citations(answer: str, citations: list[Citation]) -> list[Citation]:
        """CIT: every [N] marker must map to a citation index (docs/07 §11)."""
        markers = {int(n) for n in re.findall(r"\[(\d+)\]", answer)}
        valid = {c.index for c in citations}
        assert markers <= valid, f"orphan citation markers: {markers - valid}"
        return citations

    # -- provenance helpers (store-backed) --------------------------------
    def _chunk_title(self, chunk: DocumentChunk) -> str:
        doc = self.store.documents.get(chunk.document_id)
        return doc.title if doc else chunk.document_id

    def _chunk_source(self, chunk: DocumentChunk) -> str:  # type: ignore[return]
        doc = self.store.documents.get(chunk.document_id)
        if doc:
            src = self.store.sources.get(doc.source_key)
            if src:
                return src.source_type
        return "bis"
