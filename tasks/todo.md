# Chat UI Upgrades — Task List (UI-only)

## Task 1: Abort + timeout + real error surfacing

**Description:** Make `handleQuery` in `IndexView` cancellable with `AbortController`, 30s timeout, and propagate the backend `{detail}` message to `ErrorState` instead of a generic string.

**Acceptance criteria:**
- [ ] Pending request can be cancelled (Stop button or new submit aborts previous fetch)
- [ ] Request exceeding 30s shows error state, no hung `LoadingState`
- [ ] Non-OK response surfaces backend `detail` text in error UI

**Verification:**
- [ ] Tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Manual check: submit query, trigger Stop; block network and confirm error text appears

**Dependencies:** None

**Files likely touched:**
- `src/views/IndexView.tsx`
- `src/components/QueryZone.tsx`
- `src/components/ErrorState.tsx`

**Estimated scope:** Small: 1-2 files (plus ErrorState props)

## Task 2: Error/Empty states show actionable detail

**Description:** Extend `ErrorState`/`EmptyState` to accept `message` + `onRetry`, add "rephrase hint" with IS-number example, keep retry working for both failed and empty answers.

**Acceptance criteria:**
- [ ] Error card shows specific message (e.g. timeout vs 502 detail), not only "temporarily unavailable"
- [ ] Empty card keeps current copy and adds one concrete rephrase example
- [ ] Retry re-submits the same query string

**Verification:**
- [ ] Tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Manual check: force 502 from proxy, confirm detail renders; force `chunks_retrieved: 0`, confirm empty copy

**Dependencies:** Task 1

**Files likely touched:**
- `src/components/ErrorState.tsx`
- `src/components/EmptyState.tsx`
- `src/views/IndexView.tsx`

**Estimated scope:** Small: 1-2 files

## Checkpoint: Foundation
- [ ] All tests pass
- [ ] Application builds without errors
- [ ] Abort/timeout/error-detail manually verified
- [ ] Review with human before proceeding

## Task 3: Markdown tables/code/lists in AnswerCard

**Description:** Add `table`, `pre/code`, `ul/ol`, `p`, `blockquote` renderers to the existing `ReactMarkdown` in `AnswerCard` using current Tailwind/shadcn tokens; no new markdown library.

**Acceptance criteria:**
- [ ] Tables render with header row + horizontal scroll on mobile, no layout break
- [ ] Code blocks render monospace with copy affordance or at minimum readable wrapping
- [ ] Existing `[N]` citation pills still open `SourcesPanel`

**Verification:**
- [ ] Tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Manual check: render 3 fixtures (table answer, code answer, list answer)

**Dependencies:** None (parallelizable with Task 1-2)

**Files likely touched:**
- `src/components/AnswerCard.tsx`

**Estimated scope:** Small: 1 file

## Task 4: Citation hover preview + Esc to close + pill a11y

**Description:** Add desktop hover preview of the cited chunk (reuse `CitationCard` compact), `Esc` closes `SourcesPanel`, citation pills get keyboard focus + aria-labels.

**Acceptance criteria:**
- [ ] Hovering a `[N]` pill on desktop shows chunk title + first ~200 chars
- [ ] `Esc` closes the sources panel; focus returns to the answer region
- [ ] Pills are keyboard-focusable with `aria-label="Open citation N"`

**Verification:**
- [ ] Tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Manual check: keyboard-only flow (Tab to pill, Enter opens, Esc closes)

**Dependencies:** Task 3 (same file region, do sequentially)

**Files likely touched:**
- `src/components/AnswerCard.tsx`
- `src/components/SourcesPanel.tsx`
- `src/views/IndexView.tsx`

**Estimated scope:** Medium: 3-5 files

## Checkpoint: Core reading
- [ ] End-to-end read flow works (ask → table/code answer → hover → open sources → Esc)
- [ ] No change to `src/types/api.ts` contract

## Task 5: Real example prompts + follow-up chips + `/` shortcut + stop button

**Description:** Replace placeholder `EXAMPLES` in `QueryZone` with 3-4 real BIS queries, add follow-up chips under successful answers, `/` focuses input, Stop button aborts in-flight request (wires into Task 1 controller).

**Acceptance criteria:**
- [ ] Home shows real queries (e.g. IS-code lookup, ISI certification, hallmarking) that submit verbatim
- [ ] After success, 2-3 follow-up chips appear and submit on click
- [ ] `/` focuses the input when not already typing; Stop button visible only while loading

**Verification:**
- [ ] Tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Manual check: click each example, click a follow-up chip, press `/`, press Stop mid-request

**Dependencies:** Task 1 (abort wiring)

**Files likely touched:**
- `src/components/QueryZone.tsx`
- `src/components/AnswerCard.tsx`
- `src/views/IndexView.tsx`

**Estimated scope:** Medium: 3-5 files

## Checkpoint: Input
- [ ] Examples, chips, shortcut, and stop manually verified on desktop + mobile widths

## Task 6: Thumbs feedback (local-only) + copy-as-markdown + history search filter

**Description:** Add thumbs up/down per answer (localStorage-only counts, toast confirm, no backend call), copy answer as markdown with sources footer, and a filter input atop Recent Conversations in `Sidebar` (client-side filter of existing history).

**Acceptance criteria:**
- [ ] Thumbs toggle persists across reload via localStorage, never calls backend
- [ ] Copy includes answer + `Sources: N` footer or full citation titles
- [ ] History filter narrows the grouped list without breaking `?historyId=` restore

**Verification:**
- [ ] Tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Manual check: rate, reload, confirm state; filter history by keyword

**Dependencies:** None (parallelizable after Task 5)

**Files likely touched:**
- `src/components/AnswerCard.tsx`
- `src/components/Sidebar.tsx`
- `src/hooks/use-store.ts` (read-only check; prefer local key in component if possible)

**Estimated scope:** Medium: 3-5 files

## Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] `bun run lint`, `bun run test`, `bun run build` all green
- [ ] Manual pass: full chat loop on desktop + 390px mobile
- [ ] Ready for review
