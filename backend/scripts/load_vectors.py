"""Load Kaggle-embedded vectors into pgvector (full rows, keyed by chunk id).

Text comes from the export manifest, so PG needs no prior chunk rows —
this script mirrors file-store chunks into document_chunks WITH embeddings.

    BIS_DATABASE_URL=<pooler> uv run python scripts/load_vectors.py vectors.json chunks.jsonl

vectors.json: {"chunk_id": [float, ...]} from kaggle/embed_job.py.
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
    manifest = {}
    with open(sys.argv[2]) as fh:
        for line in fh:
            row = json.loads(line)
            manifest[row["id"]] = row
    store = PgVectorStore(get_engine(), dim=settings.embedding_dim)
    chunks, vectors = [], []
    for chunk_id, vector in payload.items():
        meta = manifest.get(chunk_id)
        if meta is None:
            continue
        chunks.append(DocumentChunk(id=chunk_id, document_id=meta["document_id"],
                                    version_id=meta["version_id"], chunk_text=meta["text"],
                                    section=meta.get("section", ""), ordinal=meta.get("ordinal", 0)))
        vectors.append(vector)
    n = store.upsert(chunks, vectors, model=settings.embedding_model)
    print(f"upserted {n}/{len(payload)} vectors "
          f"(model={settings.embedding_model}, dim={settings.embedding_dim})")


if __name__ == "__main__":
    main()
