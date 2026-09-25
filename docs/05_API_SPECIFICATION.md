# 05 — API Specification

**Status:** Proposed API design (v1) + **frozen legacy contract**. Paths under `/api/v1/*` are the proposed, stable surface; exact spelling may still be adjusted before Stage 1 implementation, but naming, shapes, and conventions are the contract for all other documents (RULE 7).
**Related:** [02 Backend PRD §3](./02_BACKEND_PRD.md), [04 Database Design](./04_DATABASE_DESIGN.md), [11 Context Bridge](./11_CONTEXT_BRIDGE.md), [18 Error Handling](./18_ERROR_HANDLING.md)

---

## 1. Endpoint Catalog (complete list)

| Group | Endpoints | Auth | Doc § |
|---|---|---|---|
| Legacy (frozen) | `POST /search`, `GET /health` | No | §3 |
| Auth | register, login, logout, password change/reset | mixed | §5.1 |
| Users | `GET/PATCH /api/v1/users/me` | Yes | §5.2 |
| Search (v1) | `POST /api/v1/search` | Optional→Yes | §5.3 |
| Conversations | 5 conversation endpoints + 3 message endpoints | Yes | §5.4 |
| Sources | `GET /api/v1/sources` | Public | §5.5 |
| Services | 3 public catalogue endpoints | Public | §5.6 |
| Forms | 2 schema endpoints | Yes | §5.7 |
| Applications | 9 endpoints (CRUD + validate/submit/withdraw/discard/events/validation-results) | Yes | §5.8 |
| Assistance | `POST /api/v1/assist` | Yes | §5.9 |
| Admin | 16 endpoints (knowledge, services, forms, audit, users) | admin | §5.10 |
| Health | `GET /api/v1/health`, `GET /api/v1/health/ready` | Public | §5.11 |

## 2. API Conventions

### 2.1 Base URL & versioning
- Backend serves at its own origin (default `http://127.0.0.1:8000` per the frontend proxy default). The browser reaches it through the Next.js same-origin proxy convention `/api/*` (existing) or directly when `NEXT_PUBLIC_API_BASE_URL` is set.
- **Legacy root paths** (`/search`, `/health`) exist only for the frozen contract (§3). All new functionality is versioned `/api/v1/*`. Breaking changes require `/api/v2/*` (see 2.6).

### 2.2 Naming
- JSON fields: `snake_case` everywhere (matches existing frontend contract: `top_k`, `source_type`, `chunks_retrieved`, `mongo_id`).
- URL identifiers: `service_key`, `form_key` (stable kebab-case strings), `conversation_id`, `message_id`, `application_id` (UUIDs). DB primary keys stay UUID; the *_key columns are the public URL identifiers (04 §3).
- `field_id` values are `{section_key}.{field_key}` (04 §4.5).

### 2.3 Authentication & authorization
- Browser clients: opaque session cookie `bis_session` (`HttpOnly; Secure; SameSite=Lax`) set by `/api/v1/auth/login`. CSRF token required on state-changing cookie-authenticated requests (header `X-CSRF-Token`).
- Non-browser clients (future): `Authorization: Bearer <session token>` accepted; same session store.
- **Frontend change required (Stage 4, small):** the Next.js proxy (`src/app/api/search/route.ts` pattern) must forward cookies to the backend and inject the CSRF header; per-component auth is explicitly avoided (analysis §23.5, frontend constraint §"No auth headers can be sent today").
- Authorization is role-based + ownership-based (matrix: [06 §7](./06_AUTH_AND_RBAC.md)).

### 2.4 Request IDs & correlation
- Every request may supply `X-Request-ID` (any ≤64-char unique string); backend generates one (UUID) when absent and always returns it in `X-Request-ID`. It propagates into logs, audit rows, and error envelopes (BE-FR-060, FR-075).

### 2.5 Pagination, filtering, sorting
- List endpoints use `?page=1&limit=20` (limits: default 20, max 100) and return `{"items": [...], "page": 1, "limit": 20, "total": 123}`.
- Filtering: documented per endpoint (`?status=`, `?q=`, `?category=`). Sorting: `?sort=created_at&order=desc` (whitelisted fields only).

### 2.6 Errors, validation, deprecation
- **v1 error envelope** (all `/api/v1/*`):

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Request body is invalid.", "details": { "fields": [{"field_id": "applicant.email", "code": "FORMAT_INVALID"}] }, "request_id": "9f2c…" } }
```

- **Legacy error format** (`/search` only): `{"detail": "human readable message"}` — required by the current frontend parser (02 §3). Non-OK status + stable messages.
- Validation failures: HTTP 422 with code `VALIDATION_FAILED` (legacy path: 422 `{detail}`).
- Full code taxonomy & frontend behavior: [18 Error Handling](./18_ERROR_HANDLING.md).
- Deprecation: `Deprecation` + `Sunset` headers; minimum 2-release overlap before shutdown of any public path.

### 2.7 Rate limits
- Classes (defaults, tunable via env): `search_anon` 10/min/IP; `search_auth` 30/min/user; `assist` 20/min/user; `auth` 10/min/IP + lockout on failures; `write` 60/min/user; `admin` 120/min/user; `ingest` 60 jobs/hour/admin.
- Exceeded → `429` with `Retry-After` (seconds) and error code `RATE_LIMITED`.

### 2.8 Idempotency & side effects
- `POST /api/v1/applications` and `POST .../submit` accept `Idempotency-Key` header (UUID); duplicate keys within 24 h return the original response (`IDEMPOTENT_REPLAY` behavior), preventing accidental duplicate applications/submissions.
- All other POSTs are naturally retry-safe or protected by optimistic concurrency (`expected_version`).

### 2.9 Content & format
- `Content-Type: application/json; charset=utf-8` (file upload endpoints: `multipart/form-data`).
- Timestamps: ISO 8601 UTC. UUIDs: canonical hyphenated lowercase.
- All responses on success are the resource JSON directly (no `{data: …}` wrapper) except paginated lists (§2.5 envelope).

---

## 3. LEGACY CONTRACT — `POST /search` (FROZEN)

Verified against `FRONTEND_CODEBASE_ANALYSIS.md` (§6, §19) — this exact behavior is **required** for the current frontend (02 §3):

- **Method/Path:** `POST /search` (also reachable via the frontend's same-origin proxy `POST /api/search`).
- **Auth:** none today; optional session accepted but never required on this path (OD-012 decides long-term policy).
- **Request body:**

```json
{ "query": "Which IS applies to stainless steel cutlery?", "top_k": 8 }
```

- **Validation:** `query` 1–2000 chars trimmed (else 422 `{detail}`); `top_k` integer 1–20, default 8.
- **Success `200`:**

```json
{
  "answer": "The applicable standard is **IS 4119** … [1]. …",
  "citations": [
    {
      "index": 1,
      "title": "IS 4119:2019 — Stainless steel cutlery — Specification",
      "source_type": "bis",
      "chunk_text": "This standard covers requirements of stainless steel cutlery …",
      "score": 0.87,
      "mongo_id": "3f6a2c8e-…"
    }
  ],
  "chunks_retrieved": 8,
  "query": "Which IS applies to stainless steel cutlery?",
  "model": "nim",
  "mode": "standard"
}
```

  - `answer`: markdown containing `[N]` markers mapping to `citations[].index` (validated by the pipeline, 07 §14).
  - `citations[]`: legacy fields exactly as above; `mongo_id` = stable chunk identifier string (semantics: legacy alias of `chunk_id`, OD-003). Backend MAY add extra fields (additive, ignored by current frontend).
  - `chunks_retrieved`: number of chunks actually retrieved (may exceed `len(citations)`); **`0` means "empty" state** — return 200, empty `answer`, empty `citations`.
  - `query`: echo of the input. `model`/`mode`: real values ("nim"/"standard" shown are what the frontend hardcodes today; backend supplies its configured values).
- **Errors:** non-2xx with body `{"detail": "<stable message>"}`; e.g. `422 {"detail": "query must be 1-2000 characters"}`, `503 {"detail": "search is temporarily unavailable"}`, `504 {"detail": "search timed out"}`. Transport-level proxy failures surface as `502 {"detail": …}` (proxy behavior, unchanged).
- **Side effects:** audit event `search.query` (query text stored per retention policy NFR-010); rate limit class `search_anon`/`search_auth`.
- **Idempotency:** read-only semantics; safe to retry.
- **Deprecation:** none scheduled; superseded functionally by `POST /api/v1/search` which MUST remain response-compatible (superset).

## 4. Enriched Search — `POST /api/v1/search`

| Aspect | Spec |
|---|---|
| Purpose | Same RAG pipeline with richer request/response; supports conversation binding and scoped retrieval |
| Auth | Optional (anonymous allowed while OD-012 = open); rate class `search_auth` when authenticated |
| Authz | none beyond auth |
| Request | see below |
| Response | 200 `SearchResponse` (legacy fields + additive) |
| Errors | v1 envelope: `VALIDATION_FAILED`, `RETRIEVAL_FAILED`, `LLM_FAILED`, `RATE_LIMITED`, `INTERNAL_ERROR` |
| Validation | same as legacy + optional fields validated |
| Side effects | persists conversation/messages when `conversation_id` supplied; audit `search.query` |
| Idempotency | safe to retry (may create duplicate assistant messages when conversation-bound — retry with same request only on transport failure) |

```json
// Request
{
  "query": "What is the renewal fee for hallmarking registration?",
  "top_k": 8,
  "conversation_id": "5b0e…",            // optional: bind Q&A to a conversation
  "context_envelope": { },               // optional ContextEnvelope (11 §3) for scoped retrieval
  "filters": {                            // optional
    "source_keys": ["bis"],
    "authority_min": "verified_official",
    "document_version_status": "published",
    "tags": ["hallmarking"]
  },
  "stream": false                         // reserved; true → 501 STREAMING_NOT_AVAILABLE (post-MVP)
}
// Response (superset of legacy; all legacy fields present)
{
  "answer": "…markdown with [1]…",
  "citations": [
    {
      "index": 1,
      "title": "IS 4119:2019 — …",
      "source_type": "bis",
      "chunk_text": "…",
      "score": 0.87,
      "mongo_id": "3f6a…",
      "chunk_id": "3f6a…",              // canonical new name (same value)
      "document_id": "ab12…",
      "document_version": "2019 + Amd 1",
      "section_title": "6.2 Renewal",
      "clause_number": "6.2",
      "page_number": 12,
      "evidence_span": {"start_char": 0, "end_char": 214},
      "url": "https://…",               // only if source registry provides it
      "authority": "authoritative",
      "retrieval_score": 0.91,
      "rerank_score": 0.87
    }
  ],
  "query": "…",
  "model": "configured-model-id",
  "chunks_retrieved": 8,
  "mode": "standard",
  "request_id": "9f2c…",
  "message_id": "c3d4…",               // when conversation-bound
  "conversation_id": "5b0e…",
  "grounding": {"status": "grounded", "confidence": 0.78}   // or "insufficient_evidence"
}
```

## 5. Endpoint Specifications

Format per endpoint: purpose / auth / authz / request / response / errors / validation / side effects / idempotency.

### 5.1 Auth

#### `POST /api/v1/auth/register`
| Aspect | Spec |
|---|---|
| Purpose | Create account |
| Auth | none (public); rate class `auth` |
| Request | `{"email": "user@example.com", "password": "…", "display_name": "…"}` |
| Validation | email format + uniqueness; password ≥ 10 chars, not in common list; display_name 1–80 |
| Response | `201 {"user_id": "…", "email": "…", "display_name": "…"}` + session cookie (auto-login) |
| Errors | `409 AUTH_EMAIL_TAKEN`, `422 VALIDATION_FAILED`, `429 RATE_LIMITED` |
| Side effects | user row; audit `auth.register.success` |
| Idempotency | no (duplicate → 409) |

#### `POST /api/v1/auth/login`
| Aspect | Spec |
|---|---|
| Request | `{"email": "…", "password": "…"}` |
| Response | `200 {"user": {"user_id","email","display_name","role","locale"}}` + `Set-Cookie: bis_session=…; HttpOnly; Secure; SameSite=Lax; Path=/` |
| Errors | `401 AUTH_INVALID_CREDENTIALS` (stable message, no user-existence disclosure); `423 AUTH_LOCKED` after 5 failures/15 min (progressive backoff) |
| Side effects | session row; audit `auth.login.success` / `auth.login.failure` |
| Idempotency | creates independent session each call |

#### `POST /api/v1/auth/logout`
Revokes current session (sets `revoked_at`), clears cookie, audit `auth.logout`. Response `204`. Idempotent.

#### `POST /api/v1/auth/password-change`
Auth required. `{"current_password": "…", "new_password": "…"}` → `204`. Revokes all other sessions. Audit `auth.password.changed`.

#### `POST /api/v1/auth/password-reset/request`
Public. `{"email": "…"}` → always `202` (no existence disclosure). Creates single-use token (TTL 30 min) → `MailAdapter`. Audit `auth.password.reset_requested`.

#### `POST /api/v1/auth/password-reset/confirm`
Public. `{"token": "…", "new_password": "…"}` → `204` or `422 AUTH_TOKEN_INVALID_OR_EXPIRED`. Revokes sessions. Audit `auth.password.reset_completed`.

### 5.2 Users

#### `GET /api/v1/users/me` — auth required; returns profile incl. role, locale, display name (backend truth; migrates the currently unpersisted frontend profile).
#### `PATCH /api/v1/users/me` — auth; partial `{"display_name"?,"locale"?}` → 200 updated. Validation: display_name 1–80; locale in `{en, hi}` (extensible). Audit `user.profile.updated` (no old values for PII beyond name).

### 5.3 Search — see §4 (`POST /api/v1/search`).

### 5.4 Conversations & Messages

| Endpoint | Purpose | Auth/Authz | Notes |
|---|---|---|---|
| `POST /api/v1/conversations` | Create empty conversation | user; owner | `{"title"?}` → 201; title auto-generated when omitted |
| `GET /api/v1/conversations` | List own | user; owner | `?status=active|archived&page&limit` → paginated, sorted `last_message_at desc` |
| `GET /api/v1/conversations/{conversation_id}` | Get with metadata | user; **owner or 404** | includes `message_count` |
| `PATCH /api/v1/conversations/{conversation_id}` | Rename / archive | user; owner | `{"title"?,"status"?}` → 200; audit `conversation.updated` |
| `DELETE /api/v1/conversations/{conversation_id}` | Soft delete | user; owner | → 204; audit `conversation.deleted` |
| `POST /api/v1/conversations/{conversation_id}/messages` | **Ask a question** (persisted Q&A) | user; owner | request `{"query": "…", "top_k"?: 8, "context_envelope"?: {…}}` → 201 assistant message (see example) |
| `GET /api/v1/conversations/{conversation_id}/messages` | List messages | user; owner | `?page&limit&order=asc` → items with `role, content, citations, status, created_at` |
| `POST /api/v1/conversations/{conversation_id}/messages/{message_id}/regenerate` | Regenerate assistant answer | user; owner; message must be assistant & in same conversation | creates **new** assistant message (prior retained); 201 |
| `POST /api/v1/conversations/import` | One-time import of localStorage history (`bis-sih_history` export) | user | body `{"entries": [{"client_id", "query", "title", "timestamp", "response"?}]}` (≤ 50 per call); idempotent by `client_id` → `201 {"imported": n, "skipped": m}`; audit `conversation.imported` (BE-FR-014, 10 §8) |

Ask example:

```json
// POST /api/v1/conversations/{id}/messages  → 201
{
  "message_id": "c3d4…",
  "conversation_id": "5b0e…",
  "role": "assistant",
  "status": "completed",
  "content": "…markdown with [1]…",
  "citations": [ { "index": 1, "title": "…", "source_type": "bis", "chunk_text": "…", "score": 0.87, "mongo_id": "…" } ],
  "grounding": {"status": "grounded", "confidence": 0.81},
  "created_at": "2026-09-20T08:15:00Z",
  "completed_at": "2026-09-20T08:15:04Z"
}
```

Errors: `404 NOT_FOUND` (foreign conversation), `422 VALIDATION_FAILED`, `429`, `RETRIEVAL_FAILED`/`LLM_FAILED` (assistant message persisted with `status=failed` + `error` payload, HTTP 502/504). Side effects: two message rows, conversation counters, audit `message.created`.

**Reserved (future) paths under this group** — documented, not implemented in MVP: `POST /api/v1/conversations/{conversation_id}/messages:stream` → `501 STREAMING_NOT_AVAILABLE` until the frontend ships a renderer (OD-019, 10 §7); `POST /api/v1/conversations/{conversation_id}/messages/{message_id}/cancel` → designed for cooperative cancellation (10 §6), added with the streaming work.

### 5.5 Sources

#### `GET /api/v1/sources`
Public. Returns badge registry consumed by frontend `getSourceConfig` (tolerant fallback today): `[{"key": "bis", "name": "Bureau of Indian Standards", "badge_label": "BIS", "authority": "authoritative", "status": "active"}, …]`. Sort `key asc`. No auth; cacheable (`Cache-Control: public, max-age=3600`).

### 5.6 Services (public catalogue)

#### `GET /api/v1/services`
| Aspect | Spec |
|---|---|
| Purpose | List published services |
| Auth | public (read-only) |
| Request | `?category={category_key}&q={text}&page&limit&sort=name` |
| Response | paginated: `items: [{"service_key","name","category": {"key","name"},"summary","status":"published","current_version":{"version_number","published_at"}}]` |
| Errors | none beyond `VALIDATION_FAILED` (bad query params) |
| Side effects | none (schema-cached) |

#### `GET /api/v1/services/{service_key}`
Public. Full published service detail: name, description, category, `current_version` {version_number, summary, eligibility[], fees[], required_documents[], workflow_ref, external_link, integration_status, source_refs}, status, published_at. Errors: `404 SERVICE_NOT_FOUND` (unknown key **or** not published — no existence disclosure of drafts). Idempotent read.

#### `GET /api/v1/services/{service_key}/schema`
| Aspect | Spec |
|---|---|
| Purpose | Published form schema for the service (drives the ACTION MODE form panel) |
| Auth | required (sessions required before anyone gets application surfaces) |
| Authz | any authenticated role (create permission checked at application creation, not schema read) |
| Response | 200 `{service_key, form_key, form_version: 2, sections: [ {key, title, description, sort_order, fields: [ {field_id, field_key, field_type, label, placeholder, description, help_text, required, required_condition, visibility_condition, validation, options: [{value,label}], ai_help_topic, sort_order, max_occurrences} ] } ], conditional_rules, validation_rules, help_content}` |
| Errors | `404 SERVICE_NOT_FOUND`, `409 SERVICE_HAS_NO_FORM` (service exists, no form bound), `422` |
| Side effects | none |
| Idempotency | pure read |

### 5.7 Forms

#### `GET /api/v1/forms/{form_key}` — current published version summary (same shape as service schema's form part). Errors: `404 FORM_NOT_FOUND`, `409 FORM_NOT_PUBLISHED`.
#### `GET /api/v1/forms/{form_key}/versions/{version_number}` — exact historical version (used when resuming an application pinned to an older version; returns 410 FORM_VERSION_RETIRED when archived without replacement). Client validation is derived from `validation` + `validation_rules` in this payload (BE-FR-023); zod on the frontend (already installed, currently unused).

### 5.8 Applications

#### `POST /api/v1/applications`
| Aspect | Spec |
|---|---|
| Purpose | Start a draft application for a service |
| Auth/Authz | session; permission `application:create` (all non-admin roles per 06 §7) |
| Request | `{"service_key": "product-certification", "form_version_number"?: 2}` (omit version → current published) |
| Response | `201 {"application_id","application_number","status":"DRAFT","service_key","form_key","form_version":2,"version":1,"created_at"}` |
| Errors | `404 SERVICE_NOT_FOUND`, `409 SERVICE_HAS_NO_FORM`, `403 PERMISSION_DENIED` |
| Validation | service published; form version published |
| Side effects | application row (pinned service_version + form_version), `application.created` event, audit `application.created` |
| Idempotency | `Idempotency-Key` honored (2.8) |

#### `GET /api/v1/applications`
Own list; `?status=&service_key=&page&limit&sort=updated_at`; items: `{application_id, application_number, service_key, form_version, status, updated_at, completion_hint}`. Authz: owner-only (regulator review listing is future).

#### `GET /api/v1/applications/{application_id}`
Owner (or 404). Full detail: identity block (above) + `values` (field_id → value map) + `validation_summary` (latest run counts) + `events` link.

#### `PATCH /api/v1/applications/{application_id}`
| Aspect | Spec |
|---|---|
| Purpose | Save values / discard draft |
| Authz | owner; permission `application:update` |
| Request | `{"expected_version": 3, "values": {"applicant.organization_type": "manufacturer", "applicant.address": {"line1": "…", "city": "…"}}, "discard"?: false}` |
| Response | `200 {…application, "version": 4, "status": "IN_PROGRESS", "saved_fields": ["applicant.organization_type", "applicant.address"]}` |
| Errors | `409 VERSION_CONFLICT` (optimistic concurrency), `409 INVALID_STATE` (e.g. editing after SUBMITTED), `422 VALIDATION_FAILED` (schema/type-level: unknown field_id, wrong type — **not** business validation), `403` |
| Validation at this tier | field_id exists in pinned form version; type/format checks (field tier only). Business/cross-field checks run via /validate |
| Side effects | application_values upserts; status DRAFT→IN_PROGRESS on first saved value; `value_updated` application_events (04 §4.6); audit `application.updated` (redacted diff, 16 §6) |
| Idempotency | via expected_version; repeated same patch → same result |

#### `POST /api/v1/applications/{application_id}/validate`
Authz owner. Runs server validation tiers (field → cross-field → business_rule → document, 15 §5). Sets status: `VALIDATION_PENDING` → `VALIDATION_FAILED` (any error) or `READY_FOR_REVIEW` (no errors; warnings allowed). Response: `{"run_number": 2, "status": "VALIDATION_FAILED", "errors": [{"field_id": "applicant.gstin", "code": "FORMAT_INVALID", "message": "GSTIN must be 15 characters", "severity": "error", "tier": "field"}], "warnings": [...]}`. Errors: `409 INVALID_STATE` (not DRAFT/IN_PROGRESS/VALIDATION_FAILED). Side effects: validation_results rows, application_event, audit `application.validated`. Idempotent (same state → same run outcome, new run_number).

#### `POST /api/v1/applications/{application_id}/submit`
| Aspect | Spec |
|---|---|
| Purpose | Explicit final submission (Journey 10) |
| Authz | owner; permission `application:submit` |
| Preconditions | status `USER_REVIEW` (user has reviewed READY_FOR_REVIEW snapshot) and latest validation run has zero errors |
| Request | `{"confirmation": true}` — literal confirmation flag required |
| Response | `200 {…application, "status": "SUBMITTED", "submitted_at": "…"}` |
| Errors | `409 INVALID_STATE`, `409 VALIDATION_REQUIRED` (no clean run), `403` |
| Side effects | immutability snapshot (values + context_snapshot + form version pin); `application.submitted` event; audit `application.submitted`; adapter hand-off = **manual/NoOp in MVP** (`integration_status: manual_only`) |
| Idempotency | `Idempotency-Key` honored; double-submit → replay |

#### `POST /api/v1/applications/{application_id}/withdraw` — from SUBMITTED/EXTERNAL_PROCESSING; `{"reason"?}` → status `WITHDRAWN`; audited; external hand-off implications documented in 15 §7.
#### `POST /api/v1/applications/{application_id}/discard` — from DRAFT/IN_PROGRESS/VALIDATION_FAILED → `DISCARDED` (soft terminal; values retained for retention window).
#### `GET /api/v1/applications/{application_id}/events` — chronological domain events (actor, type, payload); owner-readable.
#### `GET /api/v1/applications/{application_id}/validation-results` — latest run (`?run_number=` for history); owner-readable.

### 5.9 Assistance

#### `POST /api/v1/assist`
The Context Bridge endpoint (full semantics: [11 Context Bridge](./11_CONTEXT_BRIDGE.md), [14 Form Copilot](./14_BIS_FORM_COPILOT.md)).

| Aspect | Spec |
|---|---|
| Purpose | Field/section/general assistance with scoped, citation-backed answers. **Envelope schema is canonical in [11 §3](./11_CONTEXT_BRIDGE.md)**: `envelope_version`, `conversation_context`, `user_context`, `service_context`, `form_context`, `field_context`, `application_context`, `evidence_context` — sub-objects nullable per active surface |
| Auth/Authz | session; owner of any referenced application; rate class `assist` |
| Request | `{"context_envelope": {…}, "question": "What should I enter here?", "request_kind": "field_explain"}` (`request_kind`: field_explain / requirement_explain / terminology / required_documents / error_explain / section_summary / general) |
| Response | `200 {"answer": "…markdown with [1]…", "citations": [ …legacy fields + additive… ], "grounding": {"status":"grounded","confidence":0.74}, "allowed_operations": ["explain"], "request_id": "…"}` — for `suggest` kind additionally `{"suggested_value": …, "requires_user_confirmation": true}` |
| Errors | `422 CONTEXT_INVALID` (schema), `422 CONTEXT_STALE` (form version mismatch), `422 CONTEXT_UNKNOWN_FIELD` (field not in form version), `403 PERMISSION_DENIED` (not owner), `403 OPERATION_NOT_ALLOWED` (mutate/submit kinds), `429`, `RETRIEVAL_FAILED`, `LLM_FAILED` |
| Validation | envelope schema + server-side identifier verification (11 §6) |
| Side effects | assistant message persisted to `context_envelope.conversation_context.conversation_id` when present; audit `assistance.requested` |
| Idempotency | retry-safe; each call creates its own assistant message |

### 5.10 Admin (permission `admin:*`; role admin only)

| Endpoint | Purpose / notes |
|---|---|
| `POST /api/v1/admin/knowledge/documents` | Multipart upload `{file, source_key, standard_code?, version_label, effective_date?, publication_date?, doc_kind}` → creates document_version (draft) + ingestion job → `202 {"job_id","document_version_id"}`. Validation: mime whitelist (pdf, scanned pdf, png/jpg, txt/md), size ≤ 100 MB, file_hash duplicate check (`409 DUPLICATE_DOCUMENT` with existing pointer). Audit `knowledge.document_uploaded` |
| `GET /api/v1/admin/knowledge/documents` | List with `?status=&q=&page&limit` incl. ingestion state |
| `GET /api/v1/admin/knowledge/ingestion-jobs/{job_id}` | Job detail: stage, attempts, error payload |
| `POST /api/v1/admin/knowledge/ingestion-jobs/{job_id}/retry` | Retry failed job (budget 3 attempts) → 202; `409 MAX_RETRIES_EXCEEDED` |
| `POST /api/v1/admin/knowledge/ingestion-jobs/{job_id}/publish` | Validate → set document_version PUBLISHED → atomically becomes retrievable; audit `knowledge.source_published` |
| `GET/POST /api/v1/admin/knowledge/sources` , `PATCH …/{source_id}` | Source registry management (key, authority, trust_score, badge_label, status); audit `knowledge.source_updated` |
| `POST /api/v1/admin/services` , `PATCH /api/v1/admin/services/{service_key}` | Catalogue management (04 §4.4 shape); audit `service.updated` |
| `POST /api/v1/admin/services/{service_key}/versions` + `POST …/versions/{v}/publish` | Draft a new service version; publish it |
| `POST /api/v1/admin/forms` , `POST /api/v1/admin/forms/{form_key}/versions` + `POST …/versions/{v}/publish` | Form schema management; **publish-time schema validation** (unknown field_type, invalid rule refs, orphan conditions → 422 SCHEMA_INVALID); audit `form.published` |
| `GET /api/v1/admin/audit-logs` | Filter `?actor=&action=&resource_type=&from=&to=&page&limit`; read-only |
| `GET /api/v1/admin/users` / `PATCH /api/v1/admin/users/{user_id}` | List (email partial search); change `status`/`role` — audit `rbac.role_changed` with before/after |

### 5.11 Health

- `GET /health` (legacy-compatible, public): `{"status": "ok"}`.
- `GET /api/v1/health` liveness; `GET /api/v1/health/ready` readiness — checks Postgres, Redis, LLM gateway reachability; returns `503` with failing component list (used by deploys/monitoring, 20 §7).

## 6. Cross-Endpoint Invariants (audit checklist anchors)

1. Every path above exists exactly once; legacy paths are only `/search` + `/health` (02 §3).
2. Every authenticated endpoint enforces RBAC via the matrix in [06 §7](./06_AUTH_AND_RBAC.md).
3. Every state-changing endpoint emits an audit event ([16 §4](./16_AUDIT_LOGGING.md)).
4. Every error response uses the taxonomy in [18 §4](./18_ERROR_HANDLING.md) (legacy format on `/search` only).
5. Every list endpoint uses the §2.5 pagination envelope; every write uses optimistic concurrency or idempotency keys where specified.

