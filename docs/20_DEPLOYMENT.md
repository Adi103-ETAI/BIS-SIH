# 20 — Deployment Design

**Principle:** MVP deployment is deliberately small and honest; production-scale deployment is described as the growth path, not pretend-built. Do not over-engineer the MVP (prompt §24).
**Related:** [03 §6](./03_BACKEND_ARCHITECTURE.md), [05 §2](./05_API_SPECIFICATION.md), [17 Security](./17_SECURITY.md)

---

## 1. Environments

| Env | Purpose | Topology | Data |
|---|---|---|---|
| **Development** | daily work | docker-compose on dev machine: postgres+pgvector, redis, minio, backend (reload), worker, frontend (`next dev`) | seed data (04 §8); mocked LLM adapter optional |
| **Staging** | integration, evals, demos | single VM (4 vCPU/8 GB) or small compose host; real LLM endpoint with budget cap | anonymized/seed; nightly eval runs (19 §1) |
| **Production (MVP)** | SIH demo / pilot | single VM or small managed setup: compose stack behind reverse proxy (Caddy/Nginx) with TLS; managed Postgres optional | real users (pilot scale) |
| **Production (scale path)** | growth | managed Postgres (HA), 2+ API replicas, 2+ workers, managed Redis, object storage CDN; blue-green | documented, not built now |

## 2. Components per Environment

| Component | Dev | Staging | Prod MVP |
|---|---|---|---|
| frontend (Next.js) | `next dev` | container | container (or static behind proxy) |
| backend API (uvicorn) | reload | container | container ×1 (×2 scale path) |
| worker (RQ) | 1 | 1 | 1 (queues: ingest, embed, maintain) |
| PostgreSQL 16 + pgvector | container | container/volume | managed or tuned container + WAL archiving |
| Redis 7 | container | container | container (persistence on) |
| MinIO / S3 | MinIO | MinIO | S3-compatible |
| LLM/embedding endpoints | stub or real | real (budget-capped) | real |
| reverse proxy | — | Caddy (TLS) | Caddy/Nginx + HSTS |
| monitoring | logs | Prometheus + Grafana (light) | same + alerts |

## 3. Environment Variables & Secrets

Convention: 12-factor, `.env` in dev; secret store / managed env vars in staging+prod; **no secrets in the repo**; `.env.example` lists names with placeholders.

| Variable | Purpose |
|---|---|
| `DATABASE_URL`, `REDIS_URL`, `S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY` | data stores |
| `BIS_SIH_API_BASE_URL` | existing proxy upstream resolution (kept; legacy default `http://127.0.0.1:8000`) |
| `NEXT_PUBLIC_API_BASE_URL` | existing client base override (kept) |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_CONTEXT_WINDOW` | LLM gateway (OD-007) |
| `EMBEDDING_BASE_URL`, `EMBEDDING_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_DIM` | embeddings (OD-008) |
| `RERANKER_ENABLED`, `RERANKER_MODEL` | rerank flag (07 §5.3) |
| `SESSION_TTL_DAYS`, `ARGON2_PARAMS` | auth tuning |
| `RATE_LIMIT_*` | per-class limits (05 §2.7) |
| `MAIL_*` | password-reset delivery adapter (OD-022) |
| `LOG_LEVEL` | observability |

Frontend env unchanged from the analysis (`BIS_SIH_API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`) — plus `BIS_SIH_BACKEND_URL` for new `/api/v1` proxying (one more route-handler convention, same pattern).

## 4. Network & Security Posture (prod MVP)

- Only the reverse proxy ports public (80/443 → 443 redirect, HSTS). Postgres/Redis/MinIO bound to the private interface/docker network. Backend egress restricted to LLM/embedding hosts + mail relay (17 §10, §5 SSRF). Containers non-root, read-only FS where feasible; images scanned in CI.

## 5. Frontend/Proxy Changes Required for Deployment (small, enumerable)

1. Proxy cookies/CSRF through the existing route-handler pattern for `/api/v1/*` (auth injection point, 05 §2.3).
2. Add `/api/v1` proxy route handler(s) mirroring `api/search/route.ts`.
3. CSP headers + security headers at the Next.js layer (17 §4).
4. No other frontend changes are deployment-blocking (the frozen contract keeps the current build working).

## 6. Data: Migrations, Backups, Restore

- Migrations: Alembic run as a release job (before new API version goes live; backward-compatible two-step pattern for breaking schema changes: expand → migrate code → contract).
- Backups: nightly `pg_dump` (logical) + continuous WAL archiving (prod) → S3; object storage versioning on; Redis is disposable (queue re-drives from DB; caches rebuilt).
- RPO 24 h / RTO 1 h (MVP targets, BE-NFR-006); quarterly restore drill in staging (documented checklist; test DB-REST-*).

## 7. Health, Readiness, Release

- `GET /health` (legacy), `GET /api/v1/health/ready` checks PG/Redis/S3/LLM reachability (05 §5.11).
- Release: build images → migrate DB → rolling deploy API (readiness-gated) → workers → frontend → smoke suite (`API-LEG-*` + health).
- Rollback: previous image tags redeployed; DB migrations are expand-only by default (contract step safe to roll back); feature flags (`RERANKER_ENABLED`, auth-on-search) as runtime levers.

## 8. Observability & Operations

- Structured JSON logs w/ `request_id` (16 §3 correlation); no secrets (16 §6).
- Metrics (Prometheus): request rate/latency per route class, LLM tokens/cost, retrieval & rerank latency, citation-validation failures, insufficient-evidence rate, ingestion job durations, queue depth, DB pool saturation, error rates by code (07 §19, prompt §34).
- Tracing: OpenTelemetry optional in MVP (flag); request_id correlation suffices at this scale.
- Alerts: p95 latency breach, error-rate spike, insufficient-evidence spike, queue backlog, disk/memory, certificate expiry, backup failure.

## 9. Cost Considerations (SIH reality)

LLM tokens dominate variable cost (per-request usage logged, BE-NFR-007) — mitigate: evidence budgets, `top_k` clamps, caching of identical queries (short TTL), reranker off by default. Hosting: single VM MVP ≈ minimal; managed Postgres is the first paid upgrade when reliability matters. Embedding cost is batch/offline (ingestion only).

## 10. MVP vs Production-Scale (explicit)

| Concern | MVP now | Production-scale later |
|---|---|---|
| Compute | 1 VM compose | replicas + orchestrator |
| Database | single PG + WAL | managed HA + read replicas |
| Vector scale | pgvector to ~10⁶ chunks | re-evaluate dedicated vector DB (OD-010) |
| Observability | metrics + logs | OTel traces, SLO dashboards, on-call |
| DR | nightly backup + drill | multi-AZ, PITR, documented RTO/RPO SLOs |
| Security | baseline (17) | pen-test, cert rotation automation, WAF |
