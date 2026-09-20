# BIS AI backend — Stage 1 foundation

Modular monolith (FastAPI). Blueprint: `docs/00`–`docs/23`; build order: `docs/21_IMPLEMENTATION_ROADMAP.md`.

## Run (lightweight — no DB needed for Stage 1)

```sh
cd backend
uv venv && uv pip install -e ".[dev]"   # or: python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
uv run pytest                            # gates: health + request-id
uv run uvicorn app.main:app --port 8000  # matches frontend proxy default 127.0.0.1:8000
```

`GET /api/v1/health` reports `degraded` until postgres/redis/s3 run
(`docker compose up -d postgres redis` — only when a later stage needs it).

## Layout (docs/03 §8)

`app/{api,application,domain,infra,core}` · `worker/` (Stage 3+) · `migrations/` (Alembic) · `tests/`

## Stage 3 notes
- Retrieval is lexical over published file-backed knowledge (`data/*.json`,
  illustrative seeds auto-created). Dense vectors + pgvector arrive with the
  compose stack + OD-008; the `KnowledgeStore`/`EmbeddingProvider` ports keep
  that swap clean.
- Generation is extractive (`ExtractiveComposer`); an LLM plugs into the
  `Generator` port at OD-007 with no route changes.
- Admin knowledge endpoints are open in dev; Stage 4 gates them with sessions.

## Hosting decision — cloud (local-RAM friendly)

| Layer | Choice | Wiring |
|---|---|---|
| Postgres + pgvector | Supabase (free tier, pgvector built in) | `BIS_DATABASE_URL` = pooler string |
| Redis (cache/queue/rate-limit) | Upstash (free tier) | `BIS_REDIS_URL` = `rediss://…` URL |
| LLM + embeddings | API endpoint (OD-007/008, TBD) | `BIS_LLM_*` / `BIS_EMBEDDING_*` |
| Object storage | Local MinIO for now; R2 later if PDFs grow | `BIS_S3_ENDPOINT_URL` |

Code stays provider-agnostic (ports/adapters) — cloud vs local is config-only.
Migrations run `CREATE EXTENSION IF NOT EXISTS vector` (works on Supabase).
Docs `docs/` blueprint unchanged; this decision refines OD-009/010.

## Stage 4 notes

- Auth runs on SQLAlchemy today: SQLite file on laptop, Supabase URL when set.
  No code change needed when keys land — just `BIS_DATABASE_URL`.
- `GET/POST` auth endpoints are public; all other non-GET `/api/v1` writes
  require the `X-CSRF-Token` header matching the `bis_csrf` cookie.
- First registered user bootstraps as `admin`; admin knowledge endpoints
  enforce it. Login UI is still mock (frontend slice, not this stage).
