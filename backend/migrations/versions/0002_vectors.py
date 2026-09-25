"""Vector schema (docs/04 knowledge domain). Dimension is a deployment parameter
(OD-008): set BIS_EMBEDDING_DIM before migrating. Default 1024.

    BIS_DATABASE_URL=<pooler> BIS_EMBEDDING_DIM=1024 uv run alembic upgrade head
"""

import os

from alembic import op

revision = "0002_vectors"
down_revision = "0001_baseline"

DIM = int(os.environ.get("BIS_EMBEDDING_DIM", "1024"))


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute(
        f"""CREATE TABLE IF NOT EXISTS document_chunks (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            version_id TEXT NOT NULL,
            chunk_text TEXT NOT NULL,
            section TEXT NOT NULL DEFAULT '',
            ordinal INTEGER NOT NULL DEFAULT 0,
            embedding vector({DIM}),
            embedding_model TEXT NOT NULL DEFAULT ''
        )"""
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_chunks_version ON document_chunks (version_id)")
    # HNSW index is created by a follow-up migration once rows exist
    # (CONCURRENTLY cannot run inside the migration transaction):
    #   CREATE INDEX CONCURRENTLY ix_chunks_embedding
    #   ON document_chunks USING hnsw (embedding vector_cosine_ops);


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS document_chunks")
