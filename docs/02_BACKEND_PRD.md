# 02 — Backend PRD

**Scope:** What the backend must do — responsibilities, functional/non-functional requirements, frontend dependencies, and the frozen legacy `/search` contract.
**Related:** [01 Product Requirements](./01_PRODUCT_REQUIREMENTS.md) (product view), [03 Backend Architecture](./03_BACKEND_ARCHITECTURE.md) (how it is structured), [05 API Specification](./05_API_SPECIFICATION.md) (exact contracts).

---

## 1. Mission

Provide one backend system that (a) keeps the existing frontend working unchanged by honoring the current `/search` contract, and (b) supplies all missing capabilities (auth, persistence, knowledge, RAG, catalogue, forms, Context Bridge, validation, workflow, audit) needed to evolve the product from INFORMATION MODE to ACTION MODE.

## 2. Backend Responsibilities (by capability)

| # | Capability | Responsibility | Contract doc |
|---|---|---|---|
| 1 | API boundary | Single HTTP/JSON surface: legacy root paths (`/search`, `/health`) + versioned `/api/v1/*`; consistent auth, errors, pagination, request IDs | 05 |
| 2 | Search | Accept legacy `{query, top_k}`; orchestrate RAG; return legacy response shape with additive enrichment | 05 §3, 07 |
| 3 | Conversation | Persist conversations/messages; message lifecycle; history APIs | 10 |
| 4 | RAG / knowledge retrieval | Hybrid retrieval over versioned knowledge; reranking; grounding/citation validation; source-trust priority | 07, 08 |
| 5 | Citations | Generate, validate, serialize citations; preserve legacy fields; additive v2 metadata | 07 §11 |
| 6 | Service catalogue | CRUD-free publication model: services/categories/versions/eligibility/required docs/fees/workflow/external links as data | 12 |
| 7 | Forms | Publish immutable versioned form schemas (sections/fields/options/rules/help); serve to frontend | 13 |
| 8 | Drafts / applications | Create, update (values), resume, transition; bind to form version | 15 |
| 9 | Field assistance | `POST /api/v1/assist` with ContextEnvelope; scope retrieval to field/service/form; citation-backed answers; no silent mutations | 11, 14 |
| 10 | Validation | Client rule delivery + authoritative server validation (field, cross-field, document, business rule); results persisted | 15 |
| 11 | Workflow | Application state machine with guarded transitions and audit | 15 |
| 12 | Authentication | Register/login/logout/session; Argon2id; opaque session cookie; lockout; CSRF | 06 |
| 13 | Authorization | RBAC: 7 roles × permission matrix; ownership checks on conversations/applications | 06 |
| 14 | Audit | Append-only audit log for sensitive operations; never log secrets | 16 |
| 15 | Persistence | PostgreSQL for transactional + vector data; S3 for files; Redis for cache/queue/rate limits | 04 |
| 16 | External integrations | `ExternalBisAdapter` interface only; no unverified BIS APIs are called; all integration points marked TBD | 12 §9, 22 |
| 17 | Background jobs | Ingestion pipeline, embedding, maintenance, (future) notifications | 09 |
| 18 | Document ingestion | Controlled upload→extract→chunk→embed→index→validate→publish pipeline with quarantine | 09 |

**Explicit non-responsibilities (MVP):** billing/metering (mock UI exists in frontend — not a requirement), webhook delivery, push notifications, real BIS system integration, regulator review tooling.

## 3. The Current `/search` Contract (FROZEN)

Verified from `FRONTEND_CODEBASE_ANALYSIS.md` (`IndexView.tsx:51-106`, `types/api.ts`, `api/search/route.ts`). The backend **must** implement this exactly:

```text
POST /search
Content-Type: application/json            # no auth header today
Body:    { "query": "<raw user text>", "top_k": 8 }
```

Response `200` (frontend parses with defaults `answer=""`, `citations=[]`, `chunks_retrieved=0`; then hardcodes `model:"nim"`, `mode:"standard"` for display/history):

```json
{
  "answer": "markdown with [1]-style [N] markers",
  "citations": [
    {
      "index": 1,
      "title": "IS 4119:2019 — Title",
      "source_type": "bis",
      "chunk_text": "…raw chunk text…",
      "score": 0.87,
      "mongo_id": "opaque legacy chunk identifier"
    }
  ],
  "chunks_retrieved": 8,
  "query": "…echoed query (optional, frontend tolerates absence)",
  "model": "nim (frontend hardcodes; backend may supply real value)",
  "mode": "standard (same)"
}
```

Error contract (non-2xx): frontend reads JSON field `{ "detail": "<message>" }` (FastAPI-style) or falls back to "API error". The proxy translates transport failure to `502 { "detail": "<message>" }`. The proxy's default upstream is `http://127.0.0.1:8000` (overridable via `BIS_SIH_API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL`) — the new backend must be reachable at that resolution chain unchanged.

**Behavioral requirements implied by the frontend:**

| Frontend behavior | Backend implication |
|---|---|
| `chunks_retrieved === 0` → "empty" state | Return `200` with `chunks_retrieved: 0`, empty `citations`, `answer` empty string (do NOT 404/500 for "no results") |
| Non-OK → error state + retry button | Return meaningful non-2xx with `{detail}`; keep it stable |
| No timeout/AbortController client-side | Backend must enforce its own timeout budget and return before proxy/browser defaults |
| `top_k: 8` always sent | Treat as max citations/chunks hint; validate range 1–20; default 8 if absent |
| Citation `[N]` markers parsed from answer | Answer body must contain `[N]` markers that map to `citations[].index`; the citation-validation pass (07 §14) guarantees this |
| `source_type` badge fallback | Only `bis|iso|iec` guaranteed today; additional registry keys allowed (frontend falls back gracefully) |
| `mongo_id` used as stable citation key (vault) | Value must be a **stable, unique, non-empty string** per chunk (legacy name kept; semantics = chunk_id, see 22 OD-003) |

**Versioning strategy:** legacy root `POST /search` stays frozen. The enriched v1 search is `POST /api/v1/search` (superset). Deprecation (if ever) follows [05 §2.6](./05_API_SPECIFICATION.md) with a minimum 2-release overlap.

## 4. Backend Functional Requirements

Stable IDs `BE-FR-xxx`. Product counterparts in [01 §D](./01_PRODUCT_REQUIREMENTS.md); traceability in [23](./23_TRACEABILITY_MATRIX.md).

### 4.1 Search & RAG

| ID | Requirement |
|---|---|
| BE-FR-001 | Implement `POST /search` with the frozen contract of §3, backed by the real RAG pipeline (not a stub). |
| BE-FR-002 | Enforce a server-side timeout budget (default 30 s) and return `{detail}` errors on failure; never hang past proxy expectations. |
| BE-FR-003 | Validate `query` (1–2000 chars after trim) and `top_k` (1–20, default 8); reject others with 422 `{detail}` (legacy format on legacy path). |
| BE-FR-004 | Retrieve via hybrid search (dense + lexical) over published knowledge versions only; apply source-trust priority and metadata filters. |
| BE-FR-005 | Guarantee citation validity: every emitted citation index appears in the answer body; every citation maps to a stored chunk; validation failure forces regeneration or an insufficient-evidence response. |
| BE-FR-006 | Provide `POST /api/v1/search` superset: adds `request_id` echo, optional `conversation_id` binding, optional metadata filters, `context_envelope` (optional), richer citations, per-chunk scores. |
| BE-FR-007 | Record retrieval quality signals (scores, model, latency, token usage) for observability and evaluation. |

### 4.2 Conversations & messages

| ID | Requirement |
|---|---|
| BE-FR-010 | CRUD + list APIs for conversations (per-user ownership), paginated messages, message lifecycle statuses (`created → processing → retrieved → generated → completed | failed | cancelled`). |
| BE-FR-011 | Asking a question through v1 persists both the user message and the assistant message (with citations JSONB) atomically-enough for consistency (single transaction on completion). |
| BE-FR-012 | Support regeneration of the last assistant message (new attempt, prior message retained per audit need). |
| BE-FR-013 | Provide conversation summarization when context exceeds token budget (summarized older turns). |
| BE-FR-014 | Migration support: import endpoint/CLI to move localStorage history into server conversations (one-time per user; idempotent by client-generated IDs). |

### 4.3 Services & forms

| ID | Requirement |
|---|---|
| BE-FR-020 | Publish/serve catalogue: `GET /api/v1/services`, `GET /api/v1/services/{service_key}`, `GET /api/v1/services/{service_key}/schema` (published form schema for the service). |
| BE-FR-021 | Admin APIs to create/patch services and publish form versions; schemas validated at publish time (unknown field types/invalid rules rejected). |
| BE-FR-022 | Immutable published form versions: edits create a new draft version; published versions never change; applications pin `form_version_id`. |
| BE-FR-023 | Serve client validation rules derived from the schema (for frontend zod) while server remains authoritative. |

### 4.4 Applications, assistance, validation, workflow

| ID | Requirement |
|---|---|
| BE-FR-030 | Application CRUD: create (from service+form version), read, patch values, list own; human-readable `application_number` generated server-side. |
| BE-FR-031 | `POST /api/v1/applications/{id}/validate` runs server validation tiers (field → cross-field → business rule → document presence) and persists `validation_results`; returns field-addressable errors/warnings. |
| BE-FR-032 | State machine enforcement: only legal transitions succeed (15 §4); illegal attempts → 409; all transitions audited. |
| BE-FR-033 | `POST .../submit` allowed only from `USER_REVIEW` after successful validation; sets `SUBMITTED`, binds immutable snapshot of values + form version. |
| BE-FR-034 | `POST /api/v1/assist` accepts ContextEnvelope (11 §3): verifies service/form/field identifiers against server state; scopes retrieval; returns grounded answer + citations; never mutates application data. |
| BE-FR-035 | Assistance safety modes: `explain` (default, safe), `suggest` (returns suggested value + evidence, requires explicit user confirmation client-side), `mutate`/`submit` (**forbidden** in MVP — request rejected 403). |
| BE-FR-036 | Draft resumption: application values survive across sessions/devices; idle-draft cleanup per retention policy (NFR-010). |

### 4.5 Identity & access

| ID | Requirement |
|---|---|
| BE-FR-040 | Register/login/logout/me endpoints; Argon2id password hashing; opaque session tokens (random ≥ 32 bytes) stored server-side; cookie `HttpOnly; Secure; SameSite=Lax`. |
| BE-FR-041 | RBAC permission checks at the API boundary (middleware/dependency) + ownership checks in services; permission matrix in 06 §7. |
| BE-FR-042 | Brute-force protection: per-account lockout/backoff and per-IP limits; audit login failures. |
| BE-FR-043 | CSRF protection for cookie-authenticated state-changing requests (double-submit token). |
| BE-FR-044 | Password reset via single-use, short-TTL tokens (email delivery adapter; provider TBD — OD). |

### 4.6 Knowledge & ingestion

| ID | Requirement |
|---|---|
| BE-FR-050 | Admin upload of source documents to S3 with metadata (source, version, effective dates); creates ingestion job. |
| BE-FR-051 | Worker pipeline: file validation → text extraction (OCR if needed) → structure detection → metadata extraction → chunking → embedding → indexing → validation → publish; idempotent, retryable, quarantining. |
| BE-FR-052 | Retrieval uses only `PUBLISHED` document versions; unpublished/failed content is invisible to search. |
| BE-FR-053 | Duplicate/version detection (content hash + declared standard number/version) with explicit admin resolution. |
| BE-FR-054 | Source registry management (add/retire sources; trust levels; badge keys for frontend). |

### 4.7 Cross-cutting

| ID | Requirement |
|---|---|
| BE-FR-060 | Structured JSON logging with `request_id` propagation; no secrets/PII beyond necessity in logs. |
| BE-FR-061 | Health/readiness endpoints (`/health` legacy-compatible, `/api/v1/health`), metrics endpoint for internal scraping. |
| BE-FR-062 | Rate limiting per endpoint class (anonymous search, authenticated search, assist, admin, auth) via Redis. |
| BE-FR-063 | Audit events emitted in-process for all actions in 16 §4 with actor/action/resource/before-after/request_id/result. |
| BE-FR-064 | Error model: unified envelope on `/api/v1/*`; legacy `{detail}` on legacy paths (18 §3). |
| BE-FR-065 | All external integrations behind `ExternalBisAdapter` interface with a NoOp/manual implementation in MVP. |

## 5. Backend Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| BE-NFR-001 | Search latency (legacy `/search`, warmed cache) | p50 ≤ 3 s; p95 ≤ 8 s; hard timeout 30 s |
| BE-NFR-002 | Field assistance latency | p50 ≤ 4 s; p95 ≤ 10 s |
| BE-NFR-003 | Catalogue/schema/validation reads | p95 ≤ 300 ms (schema cached) |
| BE-NFR-004 | Throughput (MVP sizing) | 20 concurrent searches; 5 concurrent assists; 100 rps read APIs on one node |
| BE-NFR-005 | Availability | 99% chat path monthly; readiness gates deploys |
| BE-NFR-006 | Data durability | Postgres WAL + daily backups + PITD target 24 h RPO / 1 h RTO MVP |
| BE-NFR-007 | Token/cost observability | Per-request token usage logged; monthly cost report query available |
| BE-NFR-008 | Security baseline | No plaintext secrets; TLS everywhere; secrets via env/secret store; dependency scanning in CI |
| BE-NFR-009 | Test coverage gates | ≥ 80% lines on core modules (validation, workflow, RBAC, citation validation); eval suite green in CI for RAG golden set |

## 6. Dependencies on the Frontend

The backend is designed around the **real** frontend, not a hypothetical one:

1. **Frozen contract** — §3. Any backend change must keep `POST /search` byte-compatible.
2. **Auth injection point** — the frontend cannot send auth headers today; the Next.js proxy (`src/app/api/search/route.ts` pattern) is where the session cookie flows same-origin. Backend accepts cookie sessions (and `Authorization: Bearer` for non-browser clients later). Frontend change required (Stage 4): forward cookies in proxy; add login UI.
3. **No streaming renderer** — v1 conversation APIs return complete messages; streaming endpoints are designed (10 §9) but not required until the frontend ships a renderer (post-MVP).
4. **localStorage-first UX** — server persistence APIs must support one-time import + concurrent local use during migration (BE-FR-014).
5. **Type seam** — new DTOs mirror `src/types/api.ts` conventions (snake_case JSON) so the frontend can extend its types without breaking existing ones (analysis §23.1).
6. **Mock UI ≠ requirements** — billing/API-keys/webhooks/notifications tabs are decorative; no APIs are built for them in MVP.
7. **Transport safety gap** — client has no timeout; the backend must always respond within 30 s and use stable `{detail}` errors so the existing error UI behaves.

## 7. External Integrations

| Integration | Status | Approach |
|---|---|---|
| LLM provider | ASSUMPTION: OpenAI-compatible endpoint, env-configured; actual provider UNKNOWN (OD-007) | `LlmGateway` interface; provider adapters |
| Embedding model | Configurable; dimension is a DB parameter (OD-008) | `EmbeddingProvider` interface |
| BIS official systems/APIs | **UNKNOWN — not assumed to exist** (OD-015) | `ExternalBisAdapter` NoOp in MVP; all official interactions manual |
| Email delivery | REQUIRED for password reset; provider TBD | `MailAdapter` (console/smtp) |
| OCR | REQUIRED for scanned PDFs; engine TBD (OD) | `OcrEngine` interface; may be no-op with clear failure status |

## 8. Acceptance (backend-level)

The backend is "done for MVP" when every BE-FR item above is implemented **and** [19 Testing](./19_TESTING.md) suites pass, including the frozen-contract suite (API-LEG-*) and the golden RAG evaluation set.
