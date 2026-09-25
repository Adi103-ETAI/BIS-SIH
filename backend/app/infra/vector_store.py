"""pgvector-backed VectorStore (Supabase). No local Postgres required to import;
all SQL is plain text so the query shape is unit-testable without a live DB.

Published-only reads: the caller passes published version_ids (verified
server-side), so withdrawn drafts can never surface through this path.
"""

from sqlalchemy import text


def similarity_query(table: str = "document_chunks") -> str:
    return (
        "SELECT id, embedding <=> CAST(:vector AS vector) AS distance "
        f"FROM {table} "
        "WHERE embedding IS NOT NULL AND version_id = ANY(:versions) "
        "ORDER BY distance ASC LIMIT :top_k"
    )


class PgVectorStore:
    def __init__(self, engine, dim: int, table: str = "document_chunks") -> None:
        self.engine = engine
        self.dim = dim
        self.table = table

    def upsert(self, chunks, vectors, model: str) -> int:  # type: ignore[no-untyped-def]
        if len(chunks) != len(vectors):
            raise ValueError("chunks and vectors length mismatch")
        for chunk, vector in zip(chunks, vectors):
            if len(vector) != self.dim:
                raise ValueError(f"expected dim {self.dim}, got {len(vector)}")
        rows = 0
        with self.engine.begin() as conn:
            for chunk, vector in zip(chunks, vectors):
                conn.execute(
                    text(
                        "INSERT INTO " + self.table + " "
                        "(id, document_id, version_id, chunk_text, section, ordinal, "
                        " embedding, embedding_model) "
                        "VALUES (:id, :doc, :ver, :text, :sec, :ord, "
                        " CAST(:vec AS vector), :model) "
                        "ON CONFLICT (id) DO UPDATE SET embedding = EXCLUDED.embedding, "
                        "embedding_model = EXCLUDED.embedding_model"
                    ),
                    {"id": chunk.id, "doc": chunk.document_id, "ver": chunk.version_id,
                     "text": chunk.chunk_text, "sec": chunk.section, "ord": chunk.ordinal,
                     "vec": "[" + ",".join(map(str, vector)) + "]", "model": model},
                )
                rows += 1
        return rows

    def search(self, vector: list[float], top_k: int,
               version_ids: list[str] | None = None) -> list[tuple[str, float]]:
        if len(vector) != self.dim:
            raise ValueError(f"expected dim {self.dim}, got {len(vector)}")
        with self.engine.connect() as conn:
            result = conn.execute(
                text(similarity_query(self.table)),
                {"vector": "[" + ",".join(map(str, vector)) + "]",
                 "versions": version_ids or [], "top_k": top_k},
            )
            return [(row[0], float(row[1])) for row in result]
