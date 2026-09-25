"""OpenRouter generator (OD-007, OpenAI-compatible). Evidence-grounded, T=0.2.

The model MUST cite only as [N] markers in evidence order. Downstream
validate_citations rejects anything else — a failed validation surfaces as
insufficient-evidence, never as fabricated text (docs/07 §11).
"""

import json
import urllib.request

from app.core.settings import get_settings
from app.domain.knowledge import DocumentChunk

SYSTEM = (
    "You answer questions about Indian Standards and BIS regulations using ONLY "
    "the evidence blocks below. Every factual claim must end with a citation "
    "marker like [1], [2] referring to the EVIDENCE number. If the evidence is "
    "insufficient, say so plainly and use no markers. Never invent standards, "
    "clause numbers, or requirements."
)


class OpenRouterGenerator:
    def __init__(self, model: str = "", api_key: str = "", base_url: str = "") -> None:
        s = get_settings()
        self.model = model or s.llm_model
        self.api_key = api_key or s.llm_api_key
        self.base_url = (base_url or s.llm_base_url or "https://openrouter.ai/api/v1").rstrip("/")

    def generate(self, query: str, evidence: list[DocumentChunk]) -> str:
        from app.infra._http import post_json

        blocks = "\n\n".join(f"[EVIDENCE {i}]\n{c.chunk_text}" for i, c in enumerate(evidence, 1))
        resp = post_json(
            f"{self.base_url}/chat/completions",
            {"model": self.model, "temperature": 0.2, "max_tokens": 1024,
             "messages": [
                 {"role": "system", "content": SYSTEM},
                 {"role": "user", "content": f"Evidence:\n{blocks}\n\nQuestion: {query}"},
             ]},
            {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json",
             "HTTP-Referer": "http://localhost:3000", "X-Title": "BIS AI"},
        )
        return resp["choices"][0]["message"]["content"].strip()


def generator_configured() -> bool:
    s = get_settings()
    return bool(s.llm_api_key and s.llm_model)
