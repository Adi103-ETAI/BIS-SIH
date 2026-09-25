# 15 — Validation & Application Workflow

**Related:** [04 §4.6](./04_DATABASE_DESIGN.md), [05 §5.8](./05_API_SPECIFICATION.md), [13 Form Engine](./13_BIS_FORM_ENGINE.md), [16 Audit](./16_AUDIT_LOGGING.md)
**Current state:** nothing exists — no form models, no validation, no workflow (analysis §16). This document is greenfield design.

---

## 1. Separation of Validation Layers

| Layer | Where | Authority | Purpose |
|---|---|---|---|
| **Client validation** | frontend (zod, derived from schema — first real use of the installed stack) | advisory/UX | instant feedback; **never** the gate |
| **Server field validation** | ValidationService on save (PATCH) | **authoritative** for format/type | reject unknown `field_id`s, wrong types at write time (05 §5.8) |
| **Business-rule validation** | ValidationService on /validate | **authoritative** | cross-field + conditional requirements + registry checks |
| **External validation** | `ExternalBisAdapter` | n/a in MVP | reserved for verified integrations (OD-015); adapter returns "not configured" and the tier is skipped with a warning |

**Rule (architecture principle #6/#7):** AI can explain rules (14 §2 `error_explain`) but is never the sole source of validation; server validation is authoritative; client validation is convenience.

## 2. Drafts = Applications in DRAFT (ADR-05 recap)

There is no separate drafts table. `applications` rows in `DRAFT`/`IN_PROGRESS` are the drafts; "save" is `PATCH` (values upsert + status progression to `IN_PROGRESS`); "resume" is `GET` + render pinned `form_version`. This removes the classic draft-migration bug class and keeps one lifecycle (04 §4.6 note).

## 3. Workflow Model

- Each service version references a workflow template (`workflow_ref`, e.g., `standard-application-v1`). MVP ships exactly one template (below); additional templates are data (12 §6).
- Transitions are **guarded** in `WorkflowService`: precondition checks (validation state, ownership, role) + optimistic concurrency (`version`) + audit + domain events (`application_events`).

## 4. Application State Machine (canonical)

```mermaid
stateDiagram-v2
    [*] --> DRAFT: POST /applications
    DRAFT --> IN_PROGRESS: first value saved
    DRAFT --> DISCARDED: user discards
    IN_PROGRESS --> VALIDATION_PENDING: POST /validate
    VALIDATION_PENDING --> VALIDATION_FAILED: any error
    VALIDATION_PENDING --> READY_FOR_REVIEW: no errors (warnings allowed)
    VALIDATION_FAILED --> IN_PROGRESS: user edits
    VALIDATION_FAILED --> VALIDATION_PENDING: re-validate
    READY_FOR_REVIEW --> USER_REVIEW: user opens review
    USER_REVIEW --> IN_PROGRESS: user revises (back to editing)
    USER_REVIEW --> SUBMITTED: POST /submit (confirmation: true)
    SUBMITTED --> EXTERNAL_PROCESSING: adapter hand-off (future; manual note in MVP)
    EXTERNAL_PROCESSING --> COMPLETED: adapter confirmation (future)
    SUBMITTED --> WITHDRAWN: user withdraws
    EXTERNAL_PROCESSING --> WITHDRAWN: user withdraws
    COMPLETED --> [*]
    WITHDRAWN --> [*]
    DISCARDED --> [*]
```

State semantics:

| State | Meaning | Editable? |
|---|---|---|
| `DRAFT` | created, no values yet | yes |
| `IN_PROGRESS` | ≥1 value saved | yes |
| `VALIDATION_PENDING` | validation running (synchronous in MVP) | no (transient) |
| `VALIDATION_FAILED` | last run had blocking errors | yes (edit path) |
| `READY_FOR_REVIEW` | clean run; awaiting user review | no (read-only snapshot; edit → back to IN_PROGRESS) |
| `USER_REVIEW` | user is reviewing | read-only; explicit transitions out |
| `SUBMITTED` | user submitted; immutable snapshot | no |
| `EXTERNAL_PROCESSING` | handed off externally (future adapter) | no |
| `COMPLETED` | external lifecycle done (future) / internal completion ack | no |
| `WITHDRAWN` / `DISCARDED` | terminal user actions | no |

**Adoption note:** the prompt's lifecycle is adopted verbatim, with two terminal additions justified: `WITHDRAWN` (user-initiated exit after submission — otherwise SUBMITTED would be a dead end with no user recourse) and `DISCARDED` (clean removal of abandoned drafts; without it, abandoned drafts accumulate in active lists forever). Both are audited and reversible only by admin policy, not by the user.

## 5. Validation Tiers in Detail

### 5.1 Field tier (on save + on validate)
For each saved `field_id`: exists in pinned form version; type-correct value shape (13 §2); schema constraints (`validation` JSON: length, pattern, min/max, precision, date bounds, item counts). Errors → per-field `validation_results` rows (`severity=error`, `tier=field`).

### 5.2 Conditional tier
Re-evaluate `visibility_condition`/`required_condition` against **stored values** (authoritative): visible∧required∧empty → error; hidden-with-value → value ignored (and flagged warning). This closes the client-bypass hole (user might submit hidden fields or skip conditionally-required ones).

### 5.3 Cross-field tier
`form_versions.validation_rules` (13 §5.3): `when → assert` rules with `rule_id`, message, severity. Example (**generic**): `{"rule_id": "date_order", "when": {"field_id": "unit.commissioning_date", "operator": "is_not_empty"}, "assert": {"field_id": "unit.installation_date", "operator": "gte", "value_field": "unit.commissioning_date"}}`.

### 5.4 Document tier
For each mandatory `service_required_documents` entry: an `application_documents` row with `scan_status=clean` must exist (file upload is post-MVP; until then the tier emits a **warning** "documents must be attached at external submission" rather than a blocking error — explicit MVP accommodation, revisited in Stage 10+).

### 5.5 Business-rule tier (registry checks)
Only **schema-own or registry-own** rules (e.g., pincode format list, state registry). **No invented BIS business rules** (RULE 3): anything resembling official scheme logic enters only as verified content decisions (OD-014) and lives in the rules JSON, not code.

### 5.6 AI-assisted validation (advisory only)
The copilot may *explain* validation failures (`error_explain`, 14 §2) and flag likely mistakes ("this date precedes the license issue date") as **warnings with citations**; AI output never creates blocking errors and never mutates state. Implemented as suggestion-tier findings stored outside `validation_results` (in the assist message), preserving the authoritative/derived separation (11 §4).

## 6. Error & Warning Model (validation payloads)

```json
{
  "run_number": 2,
  "status": "VALIDATION_FAILED",
  "errors": [
    {"field_id": "applicant.gstin", "code": "FORMAT_INVALID", "severity": "error", "tier": "field",
     "message": "GSTIN must be 15 characters.", "blocking": true, "context": {"rule": "pattern"}}
  ],
  "warnings": [
    {"field_id": "product.applicable_standard", "code": "VALUE_UNVERIFIED", "severity": "warning", "tier": "field",
     "message": "Standard code could not be verified against the registry.", "blocking": false}
  ]
}
```

- `blocking` errors gate `READY_FOR_REVIEW`; warnings never gate.
- Codes are the taxonomy in [18 §4](./18_ERROR_HANDLING.md) (`VALIDATION_*` namespace) + rule ids from schema.
- Results persist per run (`run_number` monotonic; old runs retained for audit, 04 §4.6).

## 7. Transitions, Permissions & Audit

| Transition | Actor | Permission | Guards | Audit |
|---|---|---|---|---|
| create → DRAFT | user | `application:create` + service `allowed_roles` | service published, form bound | `application.created` |
| save (→IN_PROGRESS) | user (owner) | `application:update` | optimistic `expected_version`; field tier pass | `application.updated` |
| → VALIDATION_PENDING → terminal | user (owner) | `application:update` | state ∈ editable set | `application.validated` |
| READY_FOR_REVIEW → USER_REVIEW | user | `application:update` | — | `application.status_changed` |
| USER_REVIEW → SUBMITTED | user | `application:submit` | zero blocking errors; `confirmation: true`; idempotency key | `application.submitted` |
| SUBMITTED/EXTERNAL_PROCESSING → WITHDRAWN | user | `application:update` | — | `application.withdrawn` |
| editable → DISCARDED | user | `application:update` | — | `application.discarded` |
| EXTERNAL_PROCESSING → COMPLETED | system/adapter | system | adapter only (future) | `application.completed` |

Illegal transitions → `409 INVALID_STATE`; concurrent edit → `409 VERSION_CONFLICT`. Every transition writes `application_events` (domain view) **and** audit_logs (security view) — two logs, two audiences (04 §4.6, 16 §2).

## 8. Resume-Later Behavior

1. Draft values live server-side (`application_values`), keyed by `field_id`, versioned by optimistic `version`.
2. Resume = `GET /applications/{id}` → values + pinned `form_version` schema → render exactly the state left behind (13 §7).
3. Client offline cache (future) mirrors values locally but treats server as truth on conflict (`VERSION_CONFLICT` → merge UI).
4. Inactive-draft cleanup per retention policy (NFR-010, OD-024): reminder + purge after window; purge audited.
5. Submitted snapshots: values + form version + `context_snapshot` frozen; later form versions never affect them.

## 9. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-WF-1 | Legal path DRAFT→…→SUBMITTED succeeds; each transition persisted in events + audit (WF-*). |
| AC-WF-2 | Illegal transition (e.g., DRAFT→SUBMITTED) → 409 (WF-002). |
| AC-WF-3 | Hidden-with-value and missing-conditionally-required cases behave per §5.2 (WF-COND-003). |
| AC-WF-4 | Warnings never block; errors always block READY_FOR_REVIEW (WF-SEV-004). |
| AC-WF-5 | Optimistic concurrency: stale `expected_version` → 409, no lost updates (WF-CONC-005). |
| AC-WF-6 | Resume after 3 days renders identical state on another device (WF-RES-006). |
