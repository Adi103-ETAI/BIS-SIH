# 16 — Audit Logging Design

**Related:** [04 §4.7](./04_DATABASE_DESIGN.md), [15 §7](./15_VALIDATION_AND_WORKFLOW.md), [17 Security](./17_SECURITY.md)
**Principle:** every sensitive operation produces an immutable audit record. Two logs, two audiences: `audit_logs` (security/compliance trail — this document) and `application_events` (domain history surfaced in UI — 15/04 §4.6).

---

## 1. Goals

1. Answer "who did what to what, when, from where, with what result" for every sensitive action.
2. Detect abuse (brute force, scraping, admin misuse) via queryable history.
3. Never log secrets or unnecessary PII (§6).

## 2. Audit vs Domain Events

| | audit_logs | application_events |
|---|---|---|
| Audience | security/admin | users + product features |
| Scope | system-wide (auth, knowledge, admin, applications) | per-application lifecycle |
| Mutability | append-only, no update/delete grants | append-only |
| Retention | ≥ 1 year (NFR-010) | lifetime of application |
| PII | redacted (§6) | operational payload |

## 3. Record Anatomy

| Field | Content | Notes |
|---|---|---|
| actor_user_id | user or null (anonymous/system) | resolved server-side — **never from client** |
| action | namespaced event code (§4) | closed catalogue; unknown codes rejected at write |
| resource_type / resource_id | e.g., `application` / uuid | |
| before / after | JSONB diffs where meaningful | redacted per §6 |
| request_id | propagated from API boundary (05 §2.4) | joins audit ↔ logs ↔ traces |
| ip_hash / user_agent_hash | salted SHA-256 | pseudonymized; raw IPs never stored |
| result | `success` / `failure` / `denied` | `denied` = authorization refusal |
| failure_reason | stable code/message | no stack traces, no payloads with secrets |
| created_at | UTC | |

## 4. Event Catalogue (canonical action codes)

| Domain | Actions |
|---|---|
| Auth | `auth.register.success`, `auth.login.success`, `auth.login.failure`, `auth.logout`, `auth.lockout.triggered`, `auth.password.changed`, `auth.password.reset_requested`, `auth.password.reset_completed` |
| Search & chat | `search.query` (query text per retention policy; no citations payload), `conversation.created`, `conversation.updated`, `conversation.deleted`, `conversation.imported`, `message.created` |
| Assistance | `assistance.requested` (request_kind, envelope summary/hashes — not full values) |
| Applications | `application.created`, `application.updated` (redacted value diff), `application.validated` (counts by severity), `application.submitted`, `application.withdrawn`, `application.discarded` |
| Knowledge | `knowledge.document_uploaded`, `knowledge.ingestion_completed`, `knowledge.ingestion_failed`, `knowledge.quarantined`, `knowledge.source_published`, `knowledge.source_updated` |
| Catalogue | `service.updated`, `form.published` |
| Administration | `rbac.role_changed` (before/after role), `user.status_changed`, `admin.audit_viewed` |
| Exports/future | `export.generated` (vault PDF/BibTeX when server-side later) |

## 5. Capture Mechanics

- In-process `AuditService.emit()` called inside the same transaction as the action where possible (application lifecycle), else immediately after (auth, search) — with a documented at-least-once semantic; a failed audit write of a **sensitive** action (submit, role change) fails the request (fail-closed), while for `search.query` it degrades to a log warning (fail-open, availability-first) — explicit, intentional asymmetry.
- Request middleware stamps `request_id`; service layer passes it to emit.
- Background/worker actions use `actor_user_id = null` + `resource_type` context.

## 6. Redaction Rules (no secrets, minimal PII)

| Never logged | Instead |
|---|---|
| passwords, tokens, session ids, CSRF values, API keys (none exist) | hashes/prefixes where diagnosis needs them |
| full application values | `changed_fields: [field_id…]` list; value hashes; before/after only for non-PII fields (e.g., `status`) |
| full conversation text | message count / char counts |
| raw IPs / user agents | salted hashes (90-day correlation window, NFR-009) |
| prompt/evidence dumps | retrieval metadata (scores, latency, model ids) |

Redaction is implemented in `AuditService` serializers (single choke point), unit-tested (19 §8 AUD-REDACT-*).

## 7. Access & Retention

- Read: admin only (`GET /api/v1/admin/audit-logs`, 05 §5.10) with filters (actor, action, resource, time range); user-facing views use `application_events`, not audit.
- Retention: ≥ 1 year online (NFR-010); older partitions archived to cold storage before deletion; deletion is a scheduled, logged operation.
- Integrity: append-only DB role (no UPDATE/DELETE grants); optional hash-chain per day (future) for tamper evidence.

## 8. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-AUD-1 | Login success/failure, submit, form publish, ingestion publish each produce exactly one correct audit row (AUD-*). |
| AC-AUD-2 | `denied` rows exist for 403/401 on protected resources (AUD-DENY-002). |
| AC-AUD-3 | No password/token/secret/full-value strings appear in any audit row (AUD-REDACT-003). |
| AC-AUD-4 | Audit write failure blocks `application.submitted` (fail-closed) but not `search.query` (fail-open) (AUD-SEM-004). |
| AC-AUD-5 | request_id joins an audit row to its structured log line and error envelope (AUD-CORR-005). |
