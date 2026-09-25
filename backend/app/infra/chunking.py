"""Shared chunking (docs/09 §7). Single implementation used by the API ingestion
path AND the Kaggle batch job (kaggle/embed_job.py mirrors these constants) —
chunk boundaries must match so vector exports join 1:1 on chunk id.
"""

CHUNK_WORDS_MIN = 40
CHUNK_WORDS_MAX = 120
CHUNK_OVERLAP = 18


def chunk_text(text: str) -> list[str]:
    """Word-window chunking with overlap (token-budget approx of 09 §7)."""
    words = text.split()
    if len(words) <= CHUNK_WORDS_MAX:
        return [" ".join(words)] if words else []
    chunks, start = [], 0
    while start < len(words):
        end = min(start + CHUNK_WORDS_MAX, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = end - CHUNK_OVERLAP
    return chunks
