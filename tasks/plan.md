# Implementation Plan: Chat UI Upgrades (UI-only, backend-agnostic)

## Overview
Upgrade the INFORMATION MODE chat (`/` → `IndexView` → `QueryZone` + `AnswerCard` + `SourcesPanel`) without changing the frozen `POST /search` contract (`{query, top_k: 8}` → `{answer, citations, chunks_retrieved}`). All work is frontend-only so it lands while backend work is in-flight. No new dependencies; reuse `react-markdown`, `lucide-react`, `react-resizable-panels`, shadcn primitives.

## Architecture Decisions
- Keep request/response (no streaming renderer in v1); add abort/timeout so slow backend calls are cancellable. Streaming is deferred to avoid a half-built SSE client.
- Extend `AnswerCard` markdown renderers (tables, code, lists) instead of swapping libraries — smallest diff to `src/components/AnswerCard.tsx:100`.
- Citation interaction stays as `(citations, queryContext)` lift into `SourcesPanel` (`src/views/IndexView.tsx:40`); hover preview reuses `CitationCard`, no store change.
- No changes to `src/types/api.ts` contract fields; richer citation fields (clause/page) are additive-only later.
- No `package.json`, `bun.lockb`, `tsconfig.json`, `next.config.mjs` changes.

## Task List

### Phase 1: Foundation (transport safety)
- [ ] Task 1: Abort + timeout + real error surfacing
- [ ] Task 2: Error/Empty states show actionable detail

### Checkpoint: Foundation
- [ ] `bun run lint` clean, `bun run build` succeeds, abort/timeout manually verified

### Phase 2: Reading (answer + sources)
- [ ] Task 3: Markdown tables/code/lists in AnswerCard
- [ ] Task 4: Citation hover preview + Esc to close + pill a11y

### Checkpoint: Core reading
- [ ] Tables/code render, preview works on desktop, panel closes on Esc, no `types/api.ts` break

### Phase 3: Input (querying)
- [ ] Task 5: Real example prompts + follow-up chips + `/` shortcut + stop button

### Checkpoint: Input
- [ ] Examples submit real BIS queries, chips re-query, stop cancels fetch

### Phase 4: Feedback + history polish
- [ ] Task 6: Thumbs feedback (local-only) + copy-as-markdown + history search filter

### Checkpoint: Complete
- [ ] All acceptance criteria met, `bun run test` passes, manual pass on desktop + mobile widths

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend latency varies while backend work ongoing | Med | Abort + 30s timeout with friendly error; no hard-coded timing assumptions |
| `react-markdown` custom renderers break prose styling | Low | Scope styles to `prose-journal`, snapshot before/after with 3 fixtures (table, code, list) |
| Touch devices have no hover | Low | Preview is hover-only enhancement; tap still opens `SourcesPanel` |
| Scope creep into streaming/auth | Med | Explicitly out of scope; contract frozen per `docs/01_PRODUCT_REQUIREMENTS.md` FR-074 |

## Open Questions
- Do we want streaming in v2 (`GET /api/chat` mock exists but no renderer)? If yes, needs separate plan + backend contract.
- Which 4 real example queries should ship (need BIS-domain pick, e.g. IS 10500, ISI mark, hallmarking)?
- Should thumbs feedback persist to localStorage or just toast for now?

Tasks tracked in `tasks/todo.md`.
