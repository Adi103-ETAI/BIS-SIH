# 18 — Error Handling Design

**Related:** [05 §2.6](./05_API_SPECIFICATION.md), [16 Audit](./16_AUDIT_LOGGING.md), [19 Testing](./19_TESTING.md)
**Golden rule:** errors never leak sensitive information (stack traces, SQL, secrets, internal hosts); every error carries a stable machine code + `request_id`; the frontend behavior for each major error is defined below.

---

## 1. Two Shapes (contract reality)

| Shape | Where | Why |
|---|---|---|
| **Legacy**: `{"detail": "<stable message>"}` | `POST /search` (frozen path) only | current frontend parser (02 §3); changing it breaks the error UI |
| **Unified envelope** | all `/api/v1/*` | machine-actionable, correlated, extensible |

## 2. Standard Error Envelope (v1)

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request body is invalid.",
    "details": {
      "fields": [
        {"field_id": "applicant.organization_type", "code": "REQUIRED_FIELD_EMPTY", "message": "This field is required."}
      ]
    },
    "request_id": "9f2c1e…"
  }
}
```

- `code`: stable, machine-readable (taxonomy §4). `message`: human-readable, safe to display. `details`: structured, endpoint-specific (e.g., `fields[]` for validation; `job_id` for ingestion). `request_id`: echoes `X-Request-ID`.
- HTTP status mapping: 400 malformed / 401 unauthenticated / 403 denied / 404 not found (incl. existence hiding) / 409 conflict (state/version/duplicate) / 410 gone (retired form version) / 422 validation & context errors / 423 locked / 429 rate limited / 500 unexpected / 502 upstream failure / 503 dependency unavailable / 504 timeout.

## 3. Error Classes → Responses

| Class | Trigger | HTTP + code | Frontend behavior |
|---|---|---|---|
| **API/validation** | schema violations | 422 `VALIDATION_FAILED` (details.fields) | inline field errors / toast |
| **Authentication** | no/invalid session | 401 `AUTH_REQUIRED` | redirect to login (once login UI exists) |
| **Authorization** | role/ownership denial | 403 `PERMISSION_DENIED` / `OPERATION_NOT_ALLOWED` | polite denial, no retry spam |
| **Not found / hidden** | unknown or foreign resource | 404 `NOT_FOUND` (+`SERVICE_NOT_FOUND`, `FORM_NOT_FOUND`…) | not-found state |
| **Conflict** | `VERSION_CONFLICT`, `INVALID_STATE`, `VALIDATION_REQUIRED`, `DUPLICATE_DOCUMENT`, `SERVICE_HAS_NO_FORM` | 409 | reload/merge UI; guidance message |
| **Retrieval failure** | vector/db search down | 502 `RETRIEVAL_FAILED` (legacy `/search`: 502 `{detail}`) | error state + retry (existing) |
| **LLM failure** | provider error/timeout | 504 `LLM_FAILED` | error state + retry |
| **Citation failure** | grounding validation failed after retry | 200 with `grounding.status="insufficient_evidence"` (not an HTTP error — it is a truthful answer class, 07 §10) | "insufficient evidence" presentation |
| **Ingestion failure** | pipeline stage errors | job state + admin API (not HTTP errors to end users); upload-time failures 422/409 | admin job UI |
| **Form errors** | schema unknown at runtime, version retired | 409/410 `FORM_*` | re-fetch schema / version-mismatch UX |
| **External integration failure** | adapter misconfigured/unavailable | 503 `INTEGRATION_UNAVAILABLE` | "external service unavailable" note |
| **Database failure** | connectivity/constraints | 503 `INTERNAL_DEPENDENCY` (unexpected constraint bugs → 500 `INTERNAL_ERROR`) | generic error + request_id |
| **Timeout** | server-side budget exceeded (30 s search / 15 s LLM) | 504 (`SEARCH_TIMEOUT`/`LLM_FAILED`) | error state + retry |
| **Rate limit** | class exceeded | 429 `RATE_LIMITED` + `Retry-After` | backoff message |

## 4. Error Code Taxonomy (namespaces)

`AUTH_*`, `USER_*`, `VALIDATION_*` (incl. `CONTEXT_INVALID`, `CONTEXT_STALE`, `CONTEXT_UNKNOWN_FIELD`, `CONTEXT_TOO_LARGE`, `SCHEMA_INVALID`), `RETRIEVAL_*`, `LLM_*`, `INGESTION_*`, `FORM_*`, `APPLICATION_*`/workflow (`INVALID_STATE`, `VERSION_CONFLICT`, `VALIDATION_REQUIRED`), `INTEGRATION_*`, `RATE_LIMITED`, `IDEMPOTENT_REPLAY` (success-class), `INTERNAL_ERROR`, `INTERNAL_DEPENDENCY`. Full endpoint-by-endpoint codes live in [05](./05_API_SPECIFICATION.md); this doc owns the namespace rules: `UPPER_SNAKE`, `_<QUALIFIER>` suffixes (e.g., `_TIMEOUT`, `_UNAVAILABLE`), no free-form codes.

**Codes in use across the API surface (each maps to a namespace above):** `AUTH_REQUIRED`, `AUTH_INVALID_CREDENTIALS`, `AUTH_LOCKED`, `AUTH_EMAIL_TAKEN`, `AUTH_TOKEN_INVALID_OR_EXPIRED`, `PERMISSION_DENIED`, `OPERATION_NOT_ALLOWED`, `NOT_FOUND`, `SERVICE_NOT_FOUND`, `FORM_NOT_FOUND`, `SERVICE_HAS_NO_FORM`, `FORM_VERSION_RETIRED`, `FORM_NOT_PUBLISHED`, `VERSION_CONFLICT`, `INVALID_STATE`, `VALIDATION_REQUIRED`, `VALIDATION_FAILED`, `FORMAT_INVALID`, `REQUIRED_FIELD_EMPTY`, `VALUE_UNVERIFIED`, `CONTEXT_INVALID`, `CONTEXT_STALE`, `CONTEXT_UNKNOWN_FIELD`, `CONTEXT_TOO_LARGE`, `SCHEMA_INVALID`, `RETRIEVAL_FAILED`, `LLM_FAILED`, `SEARCH_TIMEOUT`, `INTEGRATION_UNAVAILABLE`, `DUPLICATE_DOCUMENT`, `MAX_RETRIES_EXCEEDED`, `RATE_LIMITED`, `IDEMPOTENT_REPLAY`, `STREAMING_NOT_AVAILABLE`, `INTERNAL_DEPENDENCY`, `INTERNAL_ERROR`.

## 5. Non-Error "Empty" States (not failures)

- `chunks_retrieved: 0` on search → 200 + empty answer/citations → frontend "empty" state (existing).
- `grounding.status = insufficient_evidence` → 200 with explanatory answer (07 §10).
- Distinguishing these from errors is critical to keep the existing per-message status model (loading/success/empty/error) truthful (analysis §6).

## 6. Internal Handling Rules

1. Fail fast at the boundary (Pydantic) → 422 with field details; domain errors raised as typed exceptions mapped 1:1 to codes at the API layer.
2. Unexpected exceptions → 500 `INTERNAL_ERROR`; **stack traces logged server-side only**, `request_id` returned; metrics + alert (20 §8).
3. Retry policy: idempotent reads retried client-side with backoff; POSTs retried only with idempotency keys or `expected_version` (05 §2.8); LLM/retrieval internal retry ≤ 1 (bounded latency).
4. Timeouts: every dependency call has one (LLM 15 s, retrieval 5 s, DB 30 s statement); the server always answers within 30 s so the frontend's no-timeout fetch cannot hang forever (02 §6.7).
5. Partial failures in workflows: validation runs are atomic per run_number; state transitions transactional (15 §5/§7) — no ambiguous mid-states.
6. Logging of errors: structured, redacted (16 §6); correlated by `request_id` (AUD-CORR-005).

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-ERR-1 | Legacy path errors are always `{"detail"}` with stable messages (API-LEG-005/006). |
| AC-ERR-2 | v1 errors always carry code/message/request_id; no stack traces or internals in any payload (ERR-001). |
| AC-ERR-3 | Empty/insufficient-evidence classes return 200 and map to non-error UI states (ERR-EMPTY-003). |
| AC-ERR-4 | 429 includes Retry-After; clients can back off (ERR-RATE-004). |
| AC-ERR-5 | Every error code in docs exists in the implemented taxonomy (ERR-TAX-005 — consistency-audit item, prompt §42.1). |
