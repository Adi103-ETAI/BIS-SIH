"""Load Kaggle-embedded vectors into pgvector (joins on chunk id).

    BIS_DATABASE_URL=<pooler> uv run python scripts/load_vectors.py vectors.json

Input: {"chunk_id": [float, ...], ...} as produced by kaggle/embed_job.py.
Model label and dim come from settings (BIS_EMBEDDING_MODEL/_DIM).
"""

import json
import sys

sys.path.insert(0, ".")

from app.core.settings import get_settings  # noqa: E402
from app.domain.knowledge import DocumentChunk  # noqa: E402
from app.infra.db import get_engine  # noqa: E402
from app.infra.vector_store import PgVectorStore  # noqa: E402


def main() -> None:
    settings = get_settings()
    payload = json.load(open(sys.argv[1]))
    engine = get_engine()
    store = PgVectorStore(engine, dim=settings.embedding_dim)

    # Rebuild chunk shells (text already in PG via ingestion) for the upsert.
    from sqlalchemy import text

    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, document_id, version_id, chunk_text, section, ordinal "
                 "FROM document_chunks WHERE id = ANY(:ids)"),
            {"ids": list(payload.keys())},
        ).all()
    by_id = {r[0]: r for r in rows}
    missing = set(payload) - set(by_id)
    if missing:
        print(f"skip {len(missing)} ids with no chunk row (ingest first)")
    chunks, vectors = [], []
    for chunk_id, vector in payload.items():
        if chunk_id not in by_id:
            continue
        r = by_id[chunk_id]
        chunks.append(DocumentChunk(id=r[0], document_id=r[1], version_id=r[2],
                                    chunk_text=r[3], section=r[4], ordinal=r[5]))
        vectors.append(vector)
    n = store.upsert(chunks, vectors, model=settings.embedding_model)
    print(f"upserted {n} vectors (model={settings.embedding_model}, dim={settings.embedding_dim})")


if __name__ == "__main__":
    main()
