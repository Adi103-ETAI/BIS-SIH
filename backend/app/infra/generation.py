"""Extractive answer composer (no-LLM generation for Stage 3).

Composes deterministic answers from retrieved evidence with [N] markers.
An LLM generator (OD-007) plugs into the Generator port later.
"""

from app.domain.knowledge import DocumentChunk


class ExtractiveComposer:
    def generate(self, query: str, evidence: list[DocumentChunk]) -> str:
        lines = ["Based on the available BIS knowledge:"]
        for i, chunk in enumerate(evidence, start=1):
            snippet = " ".join(chunk.chunk_text.split())
            if len(snippet) > 400:
                snippet = snippet[:397].rsplit(" ", 1)[0] + "…"
            lines.append(f"{snippet} [{i}].")
        return "\n\n".join(lines)


INSUFFICIENT_EVIDENCE_ANSWER = (
    "I don't have sufficient evidence in the current knowledge base "
    "to answer this reliably."
)
