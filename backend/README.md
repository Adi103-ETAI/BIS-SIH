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
