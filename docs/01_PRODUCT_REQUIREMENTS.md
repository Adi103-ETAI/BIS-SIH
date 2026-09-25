# 01 — Product Requirements Document

**Product:** BIS AI — BIS-focused AI assistant (prototype)
**Status of inputs:** Current frontend behavior is taken from `FRONTEND_CODEBASE_ANALYSIS.md`. Anything not verifiable from it is marked CURRENT / REQUIRED / PLANNED / OPTIONAL / UNKNOWN / ASSUMPTION.
**Related:** [02 Backend PRD](./02_BACKEND_PRD.md), [23 Traceability Matrix](./23_TRACEABILITY_MATRIX.md)

---

## A. Problem

BIS-related knowledge is fragmented across standards PDFs, scheme guidelines, and portals. Consequences observed in the problem domain:

1. A manufacturer cannot reliably determine which Indian Standard applies to a product, or what a certification application requires, leading to abandoned or defective applications.
2. A consumer has no trustworthy, citation-backed way to check hallmarking/ISI-mark related information and consumer services.
3. Applicants fill BIS forms with no contextual help; field semantics ("what belongs here?") are opaque, and errors surface only after submission to an external process.
4. Generic LLM chatbots answer standards questions from unverified web text, hallucinate clause numbers, and provide no evidence trail.

BIS AI addresses these with grounded answers (citations to authorized knowledge) and an explicitly user-triggered, AI-assisted application experience (Action Mode) built on schema-driven forms.

## B. Users

Roles are product-facing categories **and** backend RBAC roles (see [06 Auth & RBAC](./06_AUTH_AND_RBAC.md)). Permissions differ per role; the table lists intent.

| Role | Description | Primary surfaces | Notes |
|---|---|---|---|
| Consumer | Verifies marks, asks consumer questions, uses consumer services | Chat, Vault, consumer services | Lowest-privilege authenticated role |
| Manufacturer | Applies for product certification, needs standards + scheme info | Chat, Vault, Services, Applications | Primary Action Mode user |
| Laboratory | Testing/recognition information and applications | Chat, Services, Applications | |
| Regulator / officer | Reference lookups now; application review is future scope | Chat, Vault | Review tooling = future (OD) |
| Researcher / Student | Standards discovery, evidence collection, export | Chat, Vault | Heavy export users |
| Admin | Manages knowledge, services, forms, users, audit | Admin APIs (05) | Backend-only in MVP; no admin frontend UI exists (CURRENT: none) |

**Frontend reality check (CURRENT):** role selection exists as a static, unpersisted select in `GeneralTab.tsx` (Manufacturer/Laboratory/Regulator/Consumer/Researcher/Student) and is consumed nowhere. No role is enforced anywhere today. `Admin` is a backend addition with no frontend surface in MVP.

## C. User Journeys

All journeys are written for the target state. "Existing" marks the parts already supported by the current frontend.

### Journey 1 — Ask a BIS question (EXISTING)
1. User opens `/`, types a question (or clicks an example chip).
2. Frontend POSTs `{query, top_k: 8}` to `/search` (existing contract, §D FR-001).
3. Backend retrieves, generates a grounded answer, returns citations.
4. User reads answer with `[N]` pills; clicks one → SourcesPanel opens with citations + query context.
5. User saves citations to the Vault.

### Journey 2 — Find a relevant standard
1. User asks "Which IS applies to 304-grade stainless steel cutlery?"
2. Retrieval prioritizes authorized BIS sources; answer lists candidate standard(s) with citations.
3. If evidence is insufficient, the assistant says so and suggests authoritative next steps instead of guessing (grounding rule, [07 §15](./07_AI_RAG_ARCHITECTURE.md)).
4. User saves the standard's citations to Vault; can export BibTeX/PDF (existing, localStorage-backed).

### Journey 3 — Understand a standard/clause
1. User asks a clause-level question ("What does clause 6.2 of IS X require?").
2. If chunk metadata includes clause/section, retrieval filters on it (PLANNED, additive citation fields).
3. Answer cites the specific chunk(s); evidence spans highlight the supporting text (PLANNED; current `Citation` has only `chunk_text` + `score`).

### Journey 4 — Ask about certification (INFORMATION MODE)
1. User asks "How does product certification work?"
2. System answers from scheme documentation with citations. **No form opens automatically** (architecture principle #16).

### Journey 5 — Find a BIS service (PLANNED)
1. User asks "What services exist for hallmarking?" or browses the service catalogue.
2. Backend returns published services from the catalogue (GET /api/v1/services).
3. User opens a service detail: eligibility, required documents, fees (as modelled), workflow, external link.

### Journey 6 — Start a service application (PLANNED — explicit Action Mode)
1. User says "I want to start the application."
2. System detects ACTION intent, identifies the service, shows a confirmation.
3. User confirms → Chat|Form split view opens; `FormVersion` schema is loaded; an `application` in `DRAFT` is created.
4. Context Bridge establishes ServiceContext + FormContext.

### Journey 7 — Complete a form with AI assistance (PLANNED)
1. User fills fields; each save PATCHes the application (server persists values; autosave/periodic).
2. User can ask the copilot about any field; answers are grounded in help content + authorized knowledge, citation-backed.
3. The assistant never silently changes values; any "apply suggested value" action is explicit user confirmation (ASSISTANCE vs AUTOMATION, [14](./14_BIS_FORM_COPILOT.md)).

### Journey 8 — Ask a field-level question (PLANNED)
1. Field focused → frontend builds FieldContext.
2. `POST /api/v1/assist` with ContextEnvelope (conversation + service + form + field).
3. Backend validates the envelope identifiers against server state, retrieves scoped knowledge, answers for that field with citations.

### Journey 9 — Review application (PLANNED)
1. User requests validation (`POST .../validate`): client validation already ran; server validation is authoritative.
2. Blocking errors → `VALIDATION_FAILED` with field-level errors; warnings are non-blocking.
3. Application reaches `READY_FOR_REVIEW`; user reviews a read-only summary and full values.

### Journey 10 — Submit / hand off (PLANNED)
1. User explicitly submits (`POST .../submit`) from `USER_REVIEW`; state → `SUBMITTED` (audited).
2. In MVP, submission terminates in a controlled internal state and hands off via **manual external process**; `EXTERNAL_PROCESSING`/`COMPLETED` are reserved for a verified integration (TBD — adapter interface only).

### Journey 11 — Handle uncertainty / conflicting information (EXISTING behavior strengthened)
1. Retrieval confidence low or sources conflict → the assistant says available sources are insufficient/conflicting, names the conflict, and directs to an authoritative source.
2. System never fabricates clause numbers or requirements (AI safety rules, [07 §15](./07_AI_RAG_ARCHITECTURE.md)).

## D. Functional Requirements

Legend: **[CURRENT]** = works today (frontend+contract), **[GAP-B]** = backend must provide for existing UI, **[PLANNED]** = new product capability. Stable IDs: `FR-xxx`; backend counterparts `BE-FR-xxx` in [02](./02_BACKEND_PRD.md); traceability in [23](./23_TRACEABILITY_MATRIX.md).

### D.1 Question answering & retrieval

| ID | Requirement | Status |
|---|---|---|
| FR-001 | User can ask natural-language BIS questions in a chat UI and receive one grounded answer per question (non-streamed request/response). | CURRENT |
| FR-002 | Answers are generated only from retrieved knowledge chunks; unanswered-from-corpus questions produce an explicit "insufficient evidence" response, not a hallucinated answer. | REQUIRED (backend) |
| FR-003 | Each answer includes machine-checkable citations bound to retrieved chunks; `[N]` markers in the answer body map to the citation list. | CURRENT (contract) / REQUIRED (validation) |
| FR-004 | Citations expose at minimum the legacy fields `index, title, source_type ("bis"\|"iso"\|"iec"), chunk_text, score, mongo_id`; richer fields are additive and optional. | CURRENT contract |
| FR-005 | Source badges tolerate unknown `source_type` values with a graceful fallback (frontend `getSourceConfig` fallback). | CURRENT |
| FR-006 | Empty result sets are a first-class state: `chunks_retrieved === 0` renders "empty", not an error. | CURRENT |
| FR-007 | Failed/empty answers can be retried; answers regenerated (frontend already implements both; backend must support idempotent re-query). | CURRENT |
| FR-008 | Retrieval respects source trust priority and document version currency (authorized > verified official > controlled reference > secondary; superseded documents deprioritized or excluded by default). | PLANNED |

### D.2 Conversation & history

| ID | Requirement | Status |
|---|---|---|
| FR-010 | Conversation history is visible in the sidebar and restorable by ID (existing `?historyId=` restore must keep working). | CURRENT (local) |
| FR-011 | History and conversations migrate to server persistence per-user without breaking the local restore flow; localStorage remains a cache/fallback during migration. | PLANNED |
| FR-012 | Conversations are listed, renamed, archived, deleted; messages are listed with pagination. | PLANNED |
| FR-013 | Per-message states (loading/empty/error) are preserved; backend maps outcomes accordingly (success/empty via `chunks_retrieved`, error via legacy `{detail}` on `/search`). | CURRENT |
| FR-014 | Conversation memory: follow-up questions consider recent turns within token limits (summarization when needed). | PLANNED |

### D.3 Vault (standards library)

| ID | Requirement | Status |
|---|---|---|
| FR-020 | Users can save citations, tag them, organize into collections, add notes, and export BibTeX/PDF. | CURRENT (localStorage) |
| FR-021 | Vault model stays export-compatible: exports consume `title, sourceType, chunkText, score, savedAt, queryContext, tags, notes`. | CURRENT constraint |
| FR-022 | Server-side vault sync is future scope; the backend API shape must not preclude it (stable citation IDs such as `chunk_id`). | PLANNED (future) |

### D.4 Service discovery & Action Mode

| ID | Requirement | Status |
|---|---|---|
| FR-030 | Users can browse/search published BIS services with category, description, eligibility, required documents, fees (as modelled), status, version. | PLANNED |
| FR-031 | Action Mode opens **only** on explicit user intent (typed intent detected or UI action); informational queries never open forms. | PLANNED |
| FR-032 | Service detail shows source references tying descriptions to ingested documents where available. | PLANNED |
| FR-033 | Services/forms are data-driven: adding a service requires no backend code change (admin-published catalogue + form schemas). | PLANNED |

### D.5 Forms & assistance

| ID | Requirement | Status |
|---|---|---|
| FR-040 | Forms render from server-published versioned schemas (sections, fields, options, conditional rules, validation rules, help content) — not hardcoded React forms. | PLANNED |
| FR-041 | Field types supported: text, textarea, number, decimal, date, select, multiselect, radio, checkbox, file, address, repeatable group. | PLANNED |
| FR-042 | Conditional logic (show/hide, require) evaluated from schema rules (example: `organization_type = manufacturer` → `manufacturer_license` visible). Generic example; actual BIS rules TBD. | PLANNED |
| FR-043 | Field-level AI assistance: explain field/requirement/terminology, identify required documents, explain validation errors, summarize section — all citation-backed. | PLANNED |
| FR-044 | Assistance is separate from automation: no silent value mutation, no auto-submit; suggestions require explicit user action. | PLANNED |
| FR-045 | Chat remains visible next to the form (split view) during completion. | PLANNED (frontend reuses resizable panel pattern) |

### D.6 Validation, drafts & application state

| ID | Requirement | Status |
|---|---|---|
| FR-050 | Client validation (derived from schema) and server validation (authoritative) both exist; server wins on conflict. | PLANNED |
| FR-051 | Drafts persist server-side and are resumable across devices/sessions; local draft state is a cache. | PLANNED |
| FR-052 | Applications follow the documented lifecycle (`DRAFT → … → COMPLETED`, incl. `VALIDATION_PENDING/FAILED`, `READY_FOR_REVIEW`, `USER_REVIEW`, `SUBMITTED`, `EXTERNAL_PROCESSING`, terminal `COMPLETED/WITHDRAWN/DISCARDED`). | PLANNED |
| FR-053 | A submitted application is permanently bound to the `FormVersion` used at submission (immutability). | PLANNED |
| FR-054 | Validation errors/warnings are field-addressable and machine-readable (the copilot can explain them). | PLANNED |

### D.7 Knowledge & ingestion

| ID | Requirement | Status |
|---|---|---|
| FR-060 | Admins can upload source documents (PDF, scanned PDF, images, structured text) that pass through a controlled ingestion pipeline before publication. | PLANNED |
| FR-061 | Knowledge documents are versioned; supersession/effective dates respected; retrieval defaults to current versions. | PLANNED |
| FR-062 | Ingestion failures are visible, retryable, and quarantined when unsafe (duplicate/failed/partial handling). | PLANNED |
| FR-063 | Knowledge updates do not take effect for retrieval until published (no half-indexed answers). | PLANNED |

### D.8 Cross-cutting

| ID | Requirement | Status |
|---|---|---|
| FR-070 | Authentication (register/login/logout/session) exists; unauthenticated users keep read-only chat if configured, otherwise everything protected — decision OD-011/OD-012. | PLANNED |
| FR-071 | RBAC with roles: consumer, manufacturer, laboratory, regulator, researcher, student, admin; enforced server-side per permission matrix. | PLANNED |
| FR-072 | Sensitive operations are audit-logged (login, submission, admin changes, ingestion, permission changes). | PLANNED |
| FR-073 | Multilingual interaction: English in MVP; query-language detection, translated retrieval, and response localization are designed but post-MVP. | PLANNED (design) / OPTIONAL (MVP) |
| FR-074 | The legacy `/search` contract is preserved verbatim until a controlled versioning decision (OD/05 §3). | REQUIRED |
| FR-075 | Request IDs propagate end-to-end (client → proxy → backend → logs → error envelopes). | PLANNED |

## E. Non-Functional Requirements

Stable IDs `NFR-xxx`. Values are **proposed targets** (see [07 §20](./07_AI_RAG_ARCHITECTURE.md) / [20 Deployment](./20_DEPLOYMENT.md)); adjust after measurement.

| ID | Category | Requirement (target) |
|---|---|---|
| NFR-001 | Latency | Legacy `/search` p50 ≤ 3 s, p95 ≤ 8 s (retrieval+generation). Form schema load p95 ≤ 300 ms. Validation p95 ≤ 200 ms. Field assistance p50 ≤ 4 s, p95 ≤ 10 s. |
| NFR-002 | Availability | MVP ≥ 99% monthly on the chat path (single-node acceptable); graceful degradation to "search unavailable" messaging, not silent failures. |
| NFR-003 | Scalability | Stateless API pods scale horizontally; Postgres/pgvector sized for 10⁵ chunks MVP; queue absorbs ingestion bursts. No premature microservices. |
| NFR-004 | Security | All endpoints authenticated unless explicitly public; RBAC enforced server-side; OWASP Top 10 + AI-specific threats addressed (17). |
| NFR-005 | Observability | Structured JSON logs with request IDs; latency/error/token metrics; retrieval & citation failure metrics (34 in prompt; see 02 §NFR / 20). |
| NFR-006 | Maintainability | Modular monolith with strict module boundaries; migrations via Alembic; contracts documented (this set). |
| NFR-007 | Accessibility | Frontend keeps shadcn/Radix a11y baseline; forms must be keyboard-navigable with labelled fields (WCAG 2.1 AA as target). |
| NFR-008 | Internationalization | UI copy separation (i18n-ready); knowledge stays English MVP; response localization designed (07 §18). |
| NFR-009 | Privacy | PII minimized; application data encrypted at rest; no PII in logs/prompts beyond necessity; DPDP-style handling documented (17 §PII). |
| NFR-010 | Data retention | Conversations/applications retained per configurable policy; drafts purged after inactivity window (default 180 days; OD-024); audit logs ≥ 1 year. |
| NFR-011 | Auditability | Every sensitive action yields an audit event with actor, action, resource, before/after, request ID (16). |
| NFR-012 | Transport safety | Client/proxy timeouts, retries with backoff, AbortController support — fixes for frontend technical debt §21.2 (requires small frontend change; documented in 05 §2.4). |
| NFR-013 | Grounding | No answer without citations unless explicitly an "insufficient evidence" response; citation validation pass mandatory (07 §14). |

## F. Acceptance Criteria

Measurable criteria; test IDs refer to [19 Testing](./19_TESTING.md).

| AC ID | Feature | Acceptance criteria |
|---|---|---|
| AC-001 | Legacy search compat | Existing frontend build sends `{"query": "...", "top_k": 8}` to `POST /search` and renders the answer + citations without any frontend change (API-LEG-001..004). |
| AC-002 | Empty & error states | `chunks_retrieved: 0` renders empty state; non-OK returns `{detail}` and renders error state with retry working (API-LEG-005/006). |
| AC-003 | Citation integrity | 100% of `[N]` markers resolve to a citation index in the returned list; every citation's `chunk_text` matches a retrieved chunk ID stored server-side (CIT-001..003). |
| AC-004 | Grounding | For a golden eval set, unsupported questions produce "insufficient evidence" responses ≥ 90% of the time; zero fabricated clause numbers in spot-audit (RET-EVAL-*). |
| AC-005 | Auth | Register→login→logout round-trip works; protected endpoints return 401 without session; 5 failed logins trigger lockout window (SEC-AUTH-*). |
| AC-006 | Conversation persistence | Ask via v1 API → conversation + message rows exist; re-login on another client shows the same history (CONV-*). |
| AC-007 | Service catalogue | Published service appears in `GET /api/v1/services` without any code deploy (SRV-*). |
| AC-008 | Form engine | A published form version renders section-by-section in the form panel; conditional example rule toggles the dependent field; unknown field types fail schema validation at publish time (FORM-*). |
| AC-009 | Context Bridge | Field-focused assist request with envelope returns a field-scoped answer; stale/malicious/mismatched identifiers are rejected 422 (CB-*). |
| AC-010 | Validation & drafts | Save → reload → values restored; invalid draft cannot reach `READY_FOR_REVIEW`; server rejects client-bypassed state transitions (WF-*). |
| AC-011 | Form versioning | Application created on FormVersion N remains on N after version N+1 publishes; N is immutable post-submission (FORM-VER-*). |
| AC-012 | Audit | Submission, login failure, form publish, ingestion publish each produce exactly one audit row with correct actor/action/request_id (AUD-*). |
| AC-013 | Ingestion | Uploaded PDF becomes retrievable chunks only after publish; failed job visible with reason and retryable (ING-*). |
| AC-014 | Security headers/limits | Rate limit exceeds return 429 with `Retry-After`; no stack traces/secrets in any error payload (SEC-*). |

## G. Frontend Compatibility Notes (from the analysis)

- `/search` request/response contract is frozen (FR-074); evolution is additive fields only.
- The frontend hardcodes `model: "nim"`, `mode: "standard"` after parsing; the backend may return real values, but the frontend will ignore them until updated (non-breaking either way).
- Auth cannot be added per-component; it must be injected at the `/api` proxy layer (frontend change, small, documented in 05 §2.4 and 21 Stage 4).
- localStorage remains source of truth for history/vault until migration stages land (10 §8).
- The current `VaultItem.sourceType: string` vs `Citation.source_type` union inconsistency is frontend tech debt; the backend always sends lowercase keys from the known set plus tolerance for extension (source registry).

## H. Open Questions

See [22 Open Decisions](./22_OPEN_DECISIONS.md): first services/forms to model (OD-013/014), unauthenticated chat policy (OD-012), multilingual MVP scope (OD-018), citation granularity availability (OD-017), streaming (OD-019).
