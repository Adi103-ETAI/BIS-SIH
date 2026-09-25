"""Export chunks awaiting vectors: published chunks with no embedding yet.

Run against the backend DB (Supabase pooler when live, SQLite dev file ok
for the export side — vectors join later by chunk id):

    BIS_DATABASE_URL=<db> uv run python scripts/export_chunks.py > chunks.jsonl

Output: one JSON object per line: {"id": ..., "text": ...}.
Upload chunks.jsonl to Kaggle alongside kaggle/embed_job.py.
"""

import json
import sys

sys.path.insert(0, ".")

from app.infra.db import get_engine, init_db  # noqa: E402
from app.infra.knowledge_store import FileKnowledgeStore  # noqa: E402


def main() -> None:
    try:
        engine = get_engine()
        init_db(engine)
        from sqlalchemy import text as _text

        with engine.connect() as conn:
            has_table = conn.execute(
                _text("SELECT 1 FROM document_chunks LIMIT 1")
            )
            _ = has_table
            pg_mode = True
    except Exception:
        pg_mode = False

    if pg_mode:
        from sqlalchemy import text

        with engine.connect() as conn:
            rows = conn.execute(
                text("SELECT id, chunk_text FROM document_chunks WHERE embedding IS NULL")
            ).all()
        for chunk_id, chunk_text in rows:
            print(json.dumps({"id": chunk_id, "text": chunk_text}))
        return

    # File-store fallback (dev): export published chunks not yet tracked.
    store = FileKnowledgeStore()
    for chunk in store.published_chunks():
        print(json.dumps({"id": chunk.id, "text": chunk.chunk_text}))


if __name__ == "__main__":
    main()
