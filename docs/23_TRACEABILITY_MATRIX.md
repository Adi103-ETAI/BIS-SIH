# 23 — Traceability Matrix

**Connects:** Product Requirement (FR) → Backend Requirement (BE-FR) → Architecture/Module → Database → API → Frontend (actual files/symbols from `FRONTEND_CODEBASE_ANALYSIS.md`) → Tests.
**Frontend symbols referenced:** `IndexView.tsx` (`handleQuery`, `handleRetry`, `ChatMessage`, `API_BASE`), `types/api.ts` (`SourceType`, `Citation`, `QueryResponse`), `app/api/search/route.ts` (proxy), `app/api/chat/route.ts` (mock SSE), `AnswerCard.tsx` (`processedAnswer`, `onOpenSources`), `CitationCard.tsx`, `SourcesPanel.tsx`, `QueryZone.tsx` (`EXAMPLES`), `use-store.ts` (`HistoryEntry`, `VaultItem`, `Collection`, `useQueryHistory`, `useVault`, `useCollections`), `StoreContext.tsx` (`StoreProvider`, `useStore`), `lib/sources.ts` (`getSourceConfig`), `lib/vault-export.ts` (`vaultToBibtex`, `vaultToPdf`), `settings/GeneralTab.tsx` (role select, profile mock), `components/ui/form.tsx` (unused RHF+zod scaffold), `views/IndexView.tsx` (`PanelGroup` split).

---

## 1. Existing Capabilities (frozen contract & local features)

| Requirement | Backend Req | Architecture | Database | API | Frontend | Tests |
|---|---|---|---|---|---|---|
| FR-001 natural-language Q&A | BE-FR-001 | QueryOrchestrator (03 §5.1) | document_chunks (read) | `POST /search` | `IndexView.handleQuery`, `QueryZone` | API-LEG-001, E2E-001 |
| FR-002 grounded-only answers | BE-FR-005 | RagOrchestrator grounding (07 §14) | document_versions.published filter | `POST /search` | `AnswerCard` | RET-EVAL-003, AC-004 |
| FR-003 `[N]` citations | BE-FR-005 | Citation validation (07 §11) | document_chunks | `POST /search` | `AnswerCard.processedAnswer` | CIT-001 |
| FR-004 legacy citation fields | BE-FR-001 | Legacy serializer (07 §11.1) | document_chunks.id ↔ `mongo_id` | `POST /search` | `types/api.ts Citation`, `CitationCard` | API-LEG-002 |
| FR-005 badge tolerance | — (n/a) | source registry superset (08 §4) | sources.badge_label | `GET /api/v1/sources` | `lib/sources.ts getSourceConfig` | API-SRC-001 |
| FR-006 empty state | BE-FR-001/003 | empty-result semantics (18 §5) | — | `POST /search` | `IndexView` status="empty" | API-LEG-005 |
| FR-007 retry/regenerate | BE-FR-012 | ConversationService.regenerate | messages | `POST …/messages/{id}/regenerate` | `handleRetry`, `AnswerCard.onRegenerate` | CONV-REG-005 |
| FR-010 history restore | BE-FR-010 | ConversationService | conversations, messages | `GET /conversations/{id}/messages` | sidebar, `?historyId=` in `IndexView` | CONV-001 |
| FR-020 vault (local) | — (future sync FR-022) | — | — (chunk_id stability BE-FR-005) | — | `useVault`, `VaultItemCard`, `vault-export.ts` | E2E-001 (save flow) |
| FR-021 export compatibility | — | — | — | — | `vaultToBibtex`/`vaultToPdf` | E2E-001 |

## 2. Authentication Gap → Planned Auth

| Requirement | Backend Req | Architecture | Database | API | Frontend | Tests |
|---|---|---|---|---|---|---|
| FR-070 auth exists (CURRENT: none) | BE-FR-040 | IdentityService, session middleware (06 §3) | users, sessions | `/api/v1/auth/*` | new login UI; proxy cookie forwarding (`api/search/route.ts` pattern) | SEC-AUTH-*, AC-005 |
| FR-071 RBAC (CURRENT: static unpersisted role select) | BE-FR-041 | RBAC dependency (06 §5) | roles, permissions, role_permissions | all v1 | `GeneralTab` role select → server role | SEC-AUTHZ-* |
| session lifecycle/lockout | BE-FR-040/042 | 06 §3.5 | sessions | auth endpoints | — | SEC-AUTH-002/003 |
| audit of auth events | BE-FR-063 | AuditService (16 §4) | audit_logs | — | — | AUD-001 |

## 3. Conversation Persistence (localStorage → server)

| Requirement | Backend Req | Architecture | Database | API | Frontend | Tests |
|---|---|---|---|---|---|---|
| FR-011/012 server conversations | BE-FR-010/011 | ConversationService (10 §3) | conversations, messages | `/api/v1/conversations*` | `useQueryHistory` demoted; sidebar | CONV-001..005 |
| FR-013 per-message states | BE-FR-011 | message lifecycle (10 §2) | messages.status | messages API | `ChatMessage.status` mapping | CONV-ERR-002 |
| FR-014 memory/summarization | BE-FR-013 | 07 §12, 10 §4 | conversations (summary cache) | ask endpoint | — | CONV-MEM-003 |
| localStorage import | BE-FR-014 | migration (10 §8) | conversations | `POST /conversations/import` | `bis-sih_history` reader | CONV-MIG-004 |
| mock SSE → future streaming | — (reserved) | 10 §7 | — | `…/messages:stream` (501) | `app/api/chat/route.ts` replaced later | OD-019 |

## 4. Service Catalogue (gap → new)

| Requirement | Backend Req | Architecture | Database | API | Frontend | Tests |
|---|---|---|---|---|---|---|
| FR-030 browse services | BE-FR-020 | CatalogueService (12 §2) | services, service_versions, service_categories | `/api/v1/services*` | new service surfaces (planned) | SRV-001, AC-007 |
| FR-031 explicit Action Mode | BE-FR-034 | intent flow (03 §5.3) | — | `/api/v1/assist` | new confirm UI (no auto-open) | CB-001 |
| FR-033 data-driven services | BE-FR-021 | admin publishing (12 §6) | catalogue tables | admin services APIs | — | SRV-SEED-005 |

## 5. Forms & Applications (gap → new)

| Requirement | Backend Req | Architecture | Database | API | Frontend | Tests |
|---|---|---|---|---|---|---|
| FR-040 schema-driven forms | BE-FR-021/022 | FormEngine (13) | forms, form_versions, form_sections, form_fields, field_options | `/api/v1/services/{key}/schema`, `/api/v1/forms*` | `ui/form.tsx` + primitives (first use) | FORM-001..006 |
| FR-042 conditional logic | BE-FR-023 | rule DSL (13 §6) | visibility/required conditions | schema payload | zod derivation | FORM-COND-002 |
| FR-050 authoritative validation | BE-FR-031 | ValidationService (15 §5) | validation_results | `/validate` | inline errors | WF-SEV-004 |
| FR-051 draft persistence (CURRENT: nothing persisted) | BE-FR-030/036 | WorkflowService (15 §8) | applications, application_values | `/applications*` | `useFormDraft` (new hook, StoreContext) | FORM-DRAFT-005, WF-RES-006 |
| FR-052 lifecycle | BE-FR-032 | state machine (15 §4) | applications.status, application_events | status transition endpoints | review UI | WF-001/002 |
| FR-053 version pinning | BE-FR-022 | immutability (13 §7) | form_versions, applications.form_version_id | applications create | — | FORM-VER-004/006 |
| FR-054 explainable errors | BE-FR-031/034 | copilot error_explain (14 §2) | validation_results | `/assist` | field error links | COP-ERR-004 |

## 6. Context Bridge & Assistance (gap → new; nearest existing pattern noted)

| Requirement | Backend Req | Architecture | Database | API | Frontend | Tests |
|---|---|---|---|---|---|---|
| FR-043 field assistance | BE-FR-034 | ContextBridgeService (11 §5–6) | messages, sources scoping | `POST /api/v1/assist` | envelope builder (`lib/context-bridge.ts` planned); analogue: `onOpenSources(citations, queryContext)` | CB-001..003, AC-009 |
| FR-044 no silent mutation | BE-FR-035 | safety modes (14 §3–4) | application_values.updated_by_message_id | assist 403s | Apply-suggestion UI | COP-SAF-002/003 |
| FR-045 chat+form split | — (frontend-led) | PanelGroup reuse (analysis §14/§23.3) | — | — | `PanelGroup` split (existing pattern) | E2E-003 |
| context envelope contract | BE-FR-034 | 11 §3 schema | applications.context_snapshot | assist/search bodies | envelope builder | CB-VAL-*, CB-SEC-005 |

## 7. Knowledge, Ingestion, Cross-Cutting

| Requirement | Backend Req | Architecture | Database | API | Frontend | Tests |
|---|---|---|---|---|---|---|
| FR-060/062/063 ingestion | BE-FR-050..053 | IngestionService + worker (09) | sources, documents, document_versions, document_chunks, ingestion_jobs | admin knowledge APIs | none (admin API only) | ING-001..005 |
| FR-061 versioned knowledge | BE-FR-052 | visibility rules (08 §9) | document_versions lifecycle | publish endpoint | — | KB-VER-002 |
| FR-008 source priority | BE-FR-004 | 07 §9 | sources.authority/trust_score | filters | — | RET-ORDER-003 |
| FR-072 audit | BE-FR-063 | AuditService (16) | audit_logs | admin audit-logs | — | AUD-001..005 |
| FR-074 frozen contract | BE-FR-001 | 02 §3 | — | `POST /search` | `IndexView`, `api/search/route.ts` | API-LEG-* |
| FR-075 request IDs | BE-FR-060 | middleware (03 §5.7) | audit_logs.request_id | `X-Request-ID` | — | AUD-CORR-005 |
| FR-073 multilingual (design) | — | 07 §16 | language columns | — | — | future eval |

## 8. Coverage Check (against prompt §27 list)

| Item | Covered in |
|---|---|
| existing `/search` | §1 rows FR-001..006, FR-074 |
| citations | §1 FR-003/004; §7 FR-008 |
| source panel | §1 via `SourcesPanel`/`onOpenSources` (§6 analogue row) |
| history | §1 FR-010; §3 |
| vault | §1 FR-020/021 |
| authentication gap | §2 |
| service catalogue | §4 |
| forms | §5 |
| Context Bridge | §6 |
| field assistance | §6 |
| validation | §5 FR-050/054 |
| applications | §5 FR-051/052/053 |
