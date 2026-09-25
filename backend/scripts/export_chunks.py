"""Export published file-store chunks for Kaggle embedding.

Source of truth for chunk TEXT is the file store (admin uploads land there).
The loader inserts text+vector together into pgvector, keyed by chunk id.

    uv run python scripts/export_chunks.py > chunks.jsonl

Output per line: {"id","document_id","version_id","text","section","ordinal"}.
"""

import json
import sys

sys.path.insert(0, ".")

from app.infra.knowledge_store import FileKnowledgeStore  # noqa: E402


def main() -> None:
    store = FileKnowledgeStore()
    n = 0
    for chunk in store.published_chunks():
        print(json.dumps({"id": chunk.id, "document_id": chunk.document_id,
                          "version_id": chunk.version_id, "text": chunk.chunk_text,
                          "section": chunk.section, "ordinal": chunk.ordinal}))
        n += 1
    print(f"exported {n} chunks", file=sys.stderr)


if __name__ == "__main__":
    main()
