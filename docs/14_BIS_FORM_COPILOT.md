# 14 — BIS Form Copilot (AI assistance inside forms)

> **Prime directive:** the copilot **assists**; it does **not automate**. It never silently fabricates or submits information, never mutates user data without explicit user action, and never becomes the source of validation truth (architecture principles #5–#7, #17, #19).
**Related:** [11 Context Bridge](./11_CONTEXT_BRIDGE.md), [07 AI/RAG](./07_AI_RAG_ARCHITECTURE.md), [15 Validation](./15_VALIDATION_AND_WORKFLOW.md), [05 §5.9](./05_API_SPECIFICATION.md)

---

## 1. Supported Assistance Behaviors

| Behavior | request_kind | What it does | Evidence used |
|---|---|---|---|
| Explain field | `field_explain` | What this field means, what belongs in it, in the context of the active service | field `help_text`/`description`/`ai_help_topic` docs, scheme guidance |
| Explain requirement | `requirement_explain` | Why the field/section is required; eligibility/requirement context | service info, required documents, source_refs |
| Explain terminology | `terminology` | BIS/standards terms (e.g., "ISI mark", "BIS license") | glossary + authorized knowledge |
| Identify required documents | `required_documents` | Lists required docs for the service/section, mandatory flags, formats | service_required_documents |
| Clarify instructions | `section_summary` | Summarizes a section's instructions | section help_content |
| Explain validation errors | `error_explain` | Human explanation of a server/client validation error + how to fix | validation_results + field rules + knowledge |
| Source-backed guidance | all of the above | Every answer carries citations (legacy fields + additive) | retrieval pipeline (07) |
| Summarize section | `section_summary` | What a section collects; completeness state (counts, missing required) | schema + application values (counts only) |
| Help user understand what belongs in a field | `field_explain` | Examples (generic, clearly illustrative), formatting guidance | help content |

**Out of scope (rejected request kinds):** `mutate` (write values), `submit` (submit application) — server returns `403 OPERATION_NOT_ALLOWED` (BE-FR-035). There is no copilot path that changes application state in MVP.

## 2. ASSISTANCE vs AUTOMATION (the boundary, made operational)

| Capability | Class | Rule |
|---|---|---|
| "Explain what this field means." | SAFE | answer with citations |
| "Which document is required here?" | SAFE | answer from required documents + citations |
| "Why is this field invalid?" | SAFE | read validation_results + rules; explain; **no changes** |
| "Use the address from my profile." | SUGGEST (potentially allowed with explicit user action) | returns `suggested_value` + evidence; frontend renders "Apply suggestion?" — value is written **only** when the user confirms, and the write is a normal PATCH (audited with `updated_by_message_id` provenance, 04 §4.6) |
| "Submit the application." | FORBIDDEN for the copilot | 403; submission exists only as the explicit user action (15 §7); auto-submission only if/when a verified workflow/integration exists **and** the user explicitly confirms (future) |
| "Fill everything for me." | FORBIDDEN in MVP | no bulk-write path |

## 3. Request Flow (field-level)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Form panel + Chat
    participant API as POST /api/v1/assist
    participant CB as ContextBridgeService
    participant R as RagOrchestrator
    participant DB as Server state

    U->>FE: focus field F, ask question
    FE->>API: ContextEnvelope (conversation, user, service, form, field F, application) + question + request_kind
    Note over FE,API: Envelope keys (canonical, 11 §3): envelope_version, conversation_context, user_context, service_context, form_context, field_context, application_context, evidence_context
    API->>API: auth + rate limit (assist)
    API->>CB: validate envelope schema + verify identifiers
    CB->>DB: service/form/field in pinned version? application owned? status writable?
    alt invalid/stale/foreign
        CB-->>API: 422/403 (18 §4 codes)
    end
    CB->>R: scoped retrieval: ai_help_topic + service scope + help_content (authority floor)
    R-->>CB: evidence + draft answer
    CB->>CB: safety pass (no mutation semantics; suggestions only via suggest kind)
    CB-->>FE: answer + citations + allowed_operations ["explain"|"suggest"]
    FE-->>U: answer in chat (form visible); suggestion (if any) requires explicit "Apply"
```

Notes: the assistant message is persisted to the bound conversation (10); `error_explain` reads the latest `validation_results` for the referenced field server-side — the client never supplies the "error" as truth.

## 4. Allowed Operations Model (server-enforced)

`allowed_operations` returned per response: `["explain"]` always when grounded; `["explain","suggest"]` when the request_kind is suggestible and evidence supports a value; `mutate`/`submit` never returned in MVP. Suggestion application path (the **only** write route): user clicks Apply → frontend `PATCH /applications/{id}` with `expected_version` → normal validation/audit — identical to manual edits (principle #19: no silent changes).

## 5. Field-Level Knowledge Scoping (retrieval side)

Priority order for assist retrieval (07 §13): ① field `help_text`/`description` + section `help_content` (as `controlled_reference`+ evidence blocks); ② documents matching `ai_help_topic`; ③ service-scoped documents (service_info/guidance); ④ general corpus above authority floor. PII: prompts include only the focused field's value (never the full values map, 17 §8).

## 6. Provenance & Audit

- Every assist request: audit `assistance.requested` (16 §4) with request_kind + envelope hashes (not full values).
- Suggestion applied: `application.value_updated` event with `updated_by_message_id` → full lineage "this value came from an AI suggestion the user confirmed" (04 §4.6; AI-DERIVED data class, 11 §4).
- Answers are AI-derived content — always rendered with the assistant identity and citations, never as form instructions.

## 7. Uncertainty & Refusals

- No supporting evidence → insufficient-evidence response directing to authoritative sources (07 §10); the copilot must not guess what belongs in a BIS field (principle #18).
- Questions outside the active service/field scope → answered generically via normal chat path or politely redirected; no fabricated specificity.
- Compliance/legal certainty questions → refusal template ("confirm with the official BIS source/office").

## 8. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-COP-1 | Field question with envelope returns field-scoped, citation-backed answer (CB-*). |
| AC-COP-2 | `mutate`/`submit` kinds → 403 always (COP-SAF-002). |
| AC-COP-3 | Suggestion flow: no DB change until user Apply → PATCH; provenance recorded (COP-SUG-003). |
| AC-COP-4 | `error_explain` matches server validation_results content, not client claims (COP-ERR-004). |
| AC-COP-5 | No-evidence field questions produce insufficient-evidence responses, not guesses (COP-GND-005). |
