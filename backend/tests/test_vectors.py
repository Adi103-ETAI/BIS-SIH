"""Vector layer: query-shape tests run everywhere; live tests need Supabase.

Live tests activate when BIS_DATABASE_URL points at reachable Postgres
(pooler URL). They create + drop a scratch table, never touching app tables.
"""

import os

import pytest

from app.infra.vector_store import PgVectorStore, similarity_query


def _pg_url() -> str:
    url = os.environ.get("BIS_DATABASE_URL", "")
    if not url:
        from app.core.settings import get_settings

        url = get_settings().database_url
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def _pg_reachable() -> bool:
    url = _pg_url()
    if not url.startswith("postgresql"):
        return False
    try:
        from sqlalchemy import create_engine, text

        with create_engine(url, connect_args={"connect_timeout": 5}).connect() as c:
            c.execute(text("select 1"))
        return True
    except Exception:
        return False


def test_similarity_query_shape():
    q = similarity_query()
    assert "embedding <=>" in q  # cosine distance operator
    assert "version_id = ANY(:versions)" in q  # published-only scoping
    assert "ORDER BY distance ASC LIMIT :top_k" in q


def test_dim_mismatch_rejected():
    store = PgVectorStore(engine=None, dim=4)  # type: ignore[arg-type]
    with pytest.raises(ValueError):
        store.search([0.1, 0.2], top_k=3)


@pytest.mark.skipif(not _pg_reachable(), reason="needs live Supabase/Postgres")
def test_live_upsert_search_roundtrip():
    from sqlalchemy import create_engine, text

    from app.domain.knowledge import DocumentChunk

    engine = create_engine(_pg_url())
    with engine.begin() as c:
        c.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        c.execute(text("DROP TABLE IF EXISTS scratch_vec"))
        c.execute(text("CREATE TABLE scratch_vec (LIKE document_chunks INCLUDING ALL)"))
    store = PgVectorStore(engine, dim=3)
    chunks = [DocumentChunk(id="s1", document_id="d", version_id="v",
                            chunk_text="hello world", ordinal=0)]
    assert store.upsert(chunks, [[1.0, 0.0, 0.0]], model="test") == 1
    hits = store.search([1.0, 0.0, 0.0], top_k=1, version_ids=["v"])
    assert hits and hits[0][0] == "s1" and hits[0][1] < 1e-6
    with engine.begin() as c:
        c.execute(text("DROP TABLE scratch_vec"))
