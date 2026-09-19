# Frontend Codebase Analysis

**Repository:** BIS-SIH (BIS Chat) — `/home/sonic/workspace/BIS_AI`
**Date:** 2026-09-19
**Scope:** Read-only technical audit of the existing frontend. No source code was modified, created, or deleted to produce this report (the report file itself is the only artifact).
**Intended use:** Input for designing the backend and the missing BIS form/application-assistance ("ACTION MODE") functionality.

---

## 1. Executive Summary

- The frontend is a **Next.js App Router + React + TypeScript** single-page-style application ("BIS Chat"), converted from a Vite SPA. It implements **INFORMATION MODE only**: ask a question → single `POST /search` → grounded answer with clickable `[N]` citations → slide-over sources panel → save to a local vault.
- **No BIS form, service catalogue, application flow, field assistance, or Context Bridge exists.** Nothing in `src/` models a form, a service, a field, a draft, or form progress.
- There is **no real backend integration**: the only network call is one `fetch()` to a search endpoint whose base URL comes from env vars (defaulting to a same-origin Next.js proxy that forwards to an upstream, default `http://127.0.0.1:8000`). Chat SSE exists only as a **mock** (`GET /api/chat` emits `chunk-1..5` on a timer). No auth tokens, sessions, or protected routes exist — all account/security/billing/API-key UI is **local mock state with toasts**.
- State is **React Context + hooks + localStorage** (history, vault, collections, display name, theme). TanStack Query is installed and mounted but **never used for data fetching**. `react-hook-form` + `zod` are installed but **only referenced inside the unused shadcn `ui/form.tsx` primitive** — however, that plus 47 shadcn/Radix primitives gives the future BIS form a ready-made component foundation.
- The closest existing pattern to a future "Context Bridge" is `AnswerCard → onOpenSources(citations, queryContext) → SourcesPanel`: selected citations plus the originating query are lifted into a side panel. The future chat+form split screen can reuse the `react-resizable-panels` split layout already used on the home page.
- Biggest backend decisions left open: auth model (greenfield), real search/RAG contract (current contract is minimal and unvalidated), streaming intent (mock SSE suggests streaming was planned but the UI has no streaming renderer), source identity semantics (`mongoId`, `score`), and persistence (everything is localStorage today).

---

## 2. Technology Stack

| Technology | Version | Where Used | Evidence / File |
|---|---|---|---|
| Next.js (App Router) | `^15.3.4` in `package.json`; runtime banner `15.5.25` | Framework for routing, layouts, route handlers | `package.json`, `src/app/**/page.tsx`, `src/app/api/*/route.ts`, `next.config.mjs` (`reactStrictMode: true`) |
| React / React DOM | `^18.3.1` | All UI | `package.json`, every `*.tsx` |
| TypeScript | `^5.8.3`, `strict: false`, `strictNullChecks: false`, target ES2017, `@/*` → `./src/*` | All source | `tsconfig.json`, `src/**/*.ts(x)` |
| Tailwind CSS | `^3.4.17` | All styling, class-dark-mode, CSS-variable theme | `tailwind.config.ts`, `src/app/globals.css`, `postcss.config.js` |
| shadcn/ui + Radix UI | Radix packages `^1.1–^2.2`; `components.json` (`style: default`, `rsc: false`, `cssVariables: true`) | 47 primitives under `src/components/ui/` | `src/components/ui/*.tsx`, `components.json` |
| State: React Context + hooks + localStorage | React 18 built-ins | History, vault, collections, theme, display name | `src/contexts/StoreContext.tsx`, `src/hooks/use-store.ts`, `src/app/providers.tsx` |
| TanStack React Query | `^5.83.0` | **Installed and mounted only — zero data-fetching usage** | `src/app/providers.tsx` (`QueryClientProvider`); `grep useQuery/useMutation` hits only the unrelated `useQueryHistory` name |
| react-hook-form / Zod | `^7.61.1` / `^3.25.76` | **Only inside the unused `ui/form.tsx` primitive; no app code calls `useForm` or defines a schema** | `src/components/ui/form.tsx`; `grep useForm|zod` outside `ui/` returns nothing |
| react-markdown | `^10.1.0` | Answer body rendering with custom `a/h1/h2/h3` | `src/components/AnswerCard.tsx:4,100-145` |
| Split layout | `react-resizable-panels` (`^2.1.9`) | Home page chat + slide-over sources panel | `src/views/IndexView.tsx:5,168-240` |
| Toasts | Custom `use-toast` (TOAST_LIMIT 1) **and** `sonner` (both mounted) | All user feedback | `src/hooks/use-toast.ts`, `src/components/ui/sonner.tsx`, `src/app/providers.tsx:41-42` |
| Skeletons | `boneyard-js` | Loading fallbacks on vault/settings | `src/views/VaultView.tsx:9`, `src/views/SettingsView.tsx:8` |
| PDF export | `jspdf` (`^4.2.1`) | Vault → PDF | `src/lib/vault-export.ts:1` |
| Icons | `lucide-react` (`^0.462.0`) | Everywhere | `src/components/**/*.tsx` |
| Date util | `date-fns` | Relative timestamps in vault cards | `src/components/vault/VaultItemCard.tsx:5` |
| Charts lib | `recharts` (`^2.15.4`) | **Only inside unused `ui/chart.tsx`; no app usage** | `src/components/ui/chart.tsx` |
| Command palette lib | `cmdk` (`^1.1.1`) | **Only `ui/command.tsx`; no app usage** | `src/components/ui/command.tsx` |
| `next-themes` | `^0.3.0` | **Only read by `ui/sonner.tsx` (`useTheme`); no `ThemeProvider` mounted — app theming is manual class-based** | `src/components/ui/sonner.tsx:1,7`; `src/app/providers.tsx` |
| Testing | `vitest ^3.2.4` + jsdom + Testing Library (installed) | One placeholder test only | `src/test/example.test.ts` (`expect(true).toBe(true)`), `src/test/setup.ts`, `vitest.config.ts` |
| E2E | `@playwright/test ^1.57.0` | Configured (baseURL `localhost:3000`, chromium) but **no spec files exist** under `testDir: ./src/test` | `playwright.config.ts`, `playwright-fixture.ts` |
| Lint | ESLint 9 flat config + `typescript-eslint` + `react-hooks`; **`@typescript-eslint/no-unused-vars: off`** | `bun run lint` → `next lint` | `eslint.config.js`, `package.json` scripts |
| Formatting | **None configured** (no Prettier config found) | — | `ls .prettierrc*` → not found |
| Package managers | **Bun (primary per `AGENTS.md`)**, but `bun.lock` + `bun.lockb` + `package-lock.json` all present | Installs | repo root; `AGENTS.md` ("Package manager: Bun (primary); npm and pnpm supported via lockfiles") |
| Dev scripts | `dev: next dev`, `build: next build`, `start: next start`, `lint: next lint`, `test: vitest run` | — | `package.json` |
| BaaS / DB client | **None** (`@supabase/supabase-js` was removed during the Next.js conversion; no `supabase/` dir in this tree) | — | `package.json` (absent), `find src` (no supabase paths) |
| HTTP client | Native `fetch` only; no axios | 2 call sites | `src/views/IndexView.tsx:56`, `src/app/api/search/route.ts:19` |
| Realtime | **Mock SSE only** (`GET /api/chat`); no WebSocket, no `EventSource` client, no streaming renderer | Placeholder | `src/app/api/chat/route.ts` |

---

## 3. Repository Structure

Actual top-level layout (`find src public -type f` = 113 files):

```text
src/
├── app/                        # Next.js App Router: routes, layouts, route handlers, global CSS
│   ├── api/chat/route.ts       # Mock SSE (GET only) — placeholder, no backend
│   ├── api/search/route.ts     # Proxy: POST → ${API_BASE}/search
│   ├── page.tsx                # → IndexView (home/chat)
│   ├── vault/page.tsx          # → VaultView (+ error.tsx, loading.tsx)
│   ├── help/page.tsx           # → HelpView (+ error.tsx, loading.tsx)
│   ├── settings/[[...slug]]/   # → SettingsView (tab from URL slug) (+ layout, error, loading)
│   ├── layout.tsx              # Root layout: metadata, favicon, viewport themeColor
│   ├── providers.tsx           # Client providers (QueryClient, Tooltip, Store, 2×Toaster) + theme bootstrap
│   ├── globals.css             # Theme tokens (:root/.dark), utilities, responsive settings CSS
│   ├── error.tsx / loading.tsx / not-found.tsx
├── assets/                     # 6 avatar PNGs only (old product logo PNGs were deleted)
├── components/
│   ├── ui/                     # 47 shadcn/Radix primitives (button, dialog, form, select, tabs, …)
│   ├── settings/               # General/Account/Security/Notifications/Billing/Privacy (+ApiTab unused by nav)
│   ├── vault/                  # CollectionsSidebar, VaultItemCard
│   ├── Layout.tsx / Sidebar.tsx / QueryZone.tsx / AnswerCard.tsx / CitationCard.tsx
│   ├── SourcesPanel.tsx / EmptyState.tsx / ErrorState.tsx / LoadingState.tsx
│   ├── Logo.tsx / NavLink.tsx / AppLink.tsx / Footer.tsx
├── contexts/StoreContext.tsx   # Composes useQueryHistory + useVault + useCollections → useStore()
├── hooks/use-store.ts          # History/vault/collections hooks + HistoryEntry/VaultItem/Collection types + localStorage
├── hooks/use-toast.ts          # Re-export of custom toast system; use-mobile.tsx (breakpoint hook)
├── lib/router.ts               # Thin wrapper re-exporting next/navigation (push/replace only)
├── lib/sources.ts              # SourceType → {label, badge class} map (BIS/ISO/IEC)
├── lib/utils.ts                # shadcn `cn()` helper (UNVERIFIED beyond standard scaffold — not fully read)
├── lib/vault-export.ts         # BibTeX + jsPDF export, file download helper
├── types/api.ts                # SourceType, Citation, QueryResponse (the backend-facing contract)
├── types/assets.d.ts           # *.png/jpg/jpeg module declarations
├── views/                      # Route-level view components: IndexView, VaultView, HelpView, SettingsView, NotFoundView
├── test/                       # example.test.ts (placeholder), setup.ts
public/                         # favicon.svg, bis-logo.svg, favicon.ico, robots.txt, placeholder.svg
```

Entry points: `src/app/layout.tsx` (root) → `src/app/providers.tsx` → `src/components/Layout.tsx` (sidebar shell) → per-route `page.tsx` → `src/views/*`.

---

## 4. Routes and Pages

| Route | Purpose | Main Components | Data consumed | API calls | Auth | Status |
|---|---|---|---|---|---|---|
| `/` | AI chat home (INFORMATION MODE) | `views/IndexView`, `QueryZone`, `AnswerCard`, `LoadingState`, `EmptyState`, `ErrorState`, `SourcesPanel`, `Footer`, `Layout/Sidebar` | `useStore()` history (restore only); local component message list | `POST {API_BASE}/search` (`src/views/IndexView.tsx:56`) | None | Working (200, builds) |
| `/vault` | Standards Vault: search/filter/tag/collections/export saved citations | `views/VaultView`, `CollectionsSidebar`, `VaultItemCard`, `vault-export` | `useStore()` vaultItems/collections (localStorage) | None (fully local) | None | Working |
| `/help` | Help: quick start, shortcuts, FAQs, changelog, support form (toast-only) | `views/HelpView` | Static in-file data | None | None | Working |
| `/settings`, `/settings/<tab>` | Settings shell; tab resolved from URL slug (`general/account/security/notifications/billing/privacy`) | `views/SettingsView` + 6 tab components | Local state; profile NOT persisted (see §9) | None | None (UI-only) | Working |
| `/api/search` (POST) | Same-origin proxy to upstream search service | `src/app/api/search/route.ts` | Forwards client JSON body | `POST ${BIS_SIH_API_BASE_URL \|\| NEXT_PUBLIC_API_BASE_URL \|\| http://127.0.0.1:8000}/search` | None (no headers forwarded) | Proxy; upstream UNDETERMINED |
| `/api/chat` (GET) | **Mock SSE** emitting `chunk-1..5` then `done`; **no client consumes it** | `src/app/api/chat/route.ts` | None | None | None | Placeholder |
| 404 | `app/not-found.tsx` + `views/NotFoundView` | — | — | — | — | Present |

Navigation: `Sidebar` (`router.push("/?new=1")`, `/vault`, `/settings`), `AppLink`/`NavLink` wrappers, `HelpView` back-link to `/settings`. No middleware, no route guards — **NOT FOUND IN CURRENT CODEBASE**.

---

## 5. Component Architecture

- **Route views** (`src/views/`): `IndexView` (chat orchestrator), `VaultView`, `HelpView`, `SettingsView`, `NotFoundView`. Thin `page.tsx` files delegate to these.
- **Chat feature components**: `QueryZone` (greeting + input + example chips), `AnswerCard` (badges + markdown + toolbar), `CitationCard` (badge + relevance + vault toggle), `SourcesPanel` (slide-over), `LoadingState`/`EmptyState`/`ErrorState` (per-message status UI).
- **Shell**: `Layout` (flex `h-screen`, sidebar + main), `Sidebar` (collapsible, history list, user menu with mock logout toast), `Footer` (static "SentArc Labs" caption — pre-existing brand remnant, UI-only).
- **Settings tabs**: 6 mounted tabs; `ApiTab` (API keys/webhooks UI) exists in code but is **not registered** in `SettingsView.TABS` — dead UI, evidence the settings area is aspirational mock.
- **Reusable for the future form**: all 47 `ui/` primitives, notably `ui/form.tsx` (react-hook-form + zod scaffold, currently unused), `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `label`, `tabs`, `accordion`, `dialog`, `sheet`, `progress`, `card`, `button`, `tooltip`, `sonner/toaster`. No stepper/wizard, no file-input, no date-picker-beyond-calendar, no data-table usage found.
- **Logo**: `Logo.tsx` — inline SVG hexagon-seal mark + `BIS/Chat` wordmark, Classic/Modern font switch via `bis-sih_logo_style` localStorage key + `logostylechange` window event.

---

## 6. Chat Architecture

File: `src/views/IndexView.tsx`; types: `src/types/api.ts`, `src/hooks/use-store.ts`.

- **No roles array, no thread object.** Chat state is a component-local list:
  `ChatMessage = { id: string; query: string; response?: QueryResponse; status: "loading"|"success"|"empty"|"error"; timestamp: number }` (`IndexView.tsx:18-24`).
- Each user submit appends one message with `status: "loading"` and fires **one non-streamed POST** (`IndexView.tsx:51-106`); response replaces status with `success` (`chunks_retrieved > 0`), `empty` (`=== 0`), or `error` (throw).
- **Retry** (`handleRetry`) removes the failed/empty message and re-submits the same query string; **Regenerate** (`AnswerCard onRegenerate`) does the same (`IndexView.tsx:159-162`, `AnswerCard.tsx:160-170`).
- **History is separate from messages**: on success, `addHistoryEntry(query, json)` persists `{id: Date.now(), query, title: generateTitle(query), timestamp, sourcesUsed, model, response}` capped at 50, newest-first (`use-store.ts:87-98`). Sidebar "Recent Conversations" restores via URL params: `?historyId=` (replay stored response or re-query), `?query=` (fresh submit), `?new=1` (clear) (`IndexView.tsx:108-157`).
- **Persistence: localStorage only** (`bis-sih_history`, `bis-sih_vault`, `bis-sih_collections`); no server sync, no pagination, silent 50-item cap.
- **Rendering**: `AnswerCard` rewrites `[N]` in the answer to superscript pills (`AnswerCard.tsx:25-28`); clicking opens `SourcesPanel` with `(citations, queryContext)`. Markdown via `react-markdown` with custom `a/h1/h2/h3` only — **no code-block renderer, no tables/footnotes config beyond the custom link hack**.
- **Suggested questions**: static `EXAMPLES` chips in `QueryZone.tsx:7-11` (submit their labels verbatim).
- **Streaming: NOT IMPLEMENTED** in UI (loading skeleton per message instead). The mock SSE route suggests streaming was anticipated — see §24.
- **Attachments/file upload in chat: NOT FOUND IN CURRENT CODEBASE.**

Exact backend-facing message types (`src/types/api.ts:1-19`):

```ts
export type SourceType = "bis" | "iso" | "iec";
export interface Citation { index: number; title: string; source_type: SourceType; chunk_text: string; score: number; mongo_id: string; }
export interface QueryResponse { answer: string; citations: Citation[]; query: string; model: string; chunks_retrieved: number; mode: string; }
```

---

## 7. State Management

| Layer | Mechanism | Evidence |
|---|---|---|
| Global app state | `StoreContext` composing three hooks, consumed via `useStore()` (throws outside provider) | `src/contexts/StoreContext.tsx:14-64` |
| History/vault/collections | `useState` + `useEffect` JSON sync to localStorage; IDs from `Date.now()` (+ random suffix for vault/collections) | `src/hooks/use-store.ts:80-179` |
| Server cache | `QueryClientProvider` mounted, **never queried** — no `useQuery`/`useMutation` in app code | `src/app/providers.tsx:38`; grep §2 |
| Chat messages | Local `useState<ChatMessage[]>` in `IndexView` — lost on navigation/reload (history restore is the only rehydration) | `src/views/IndexView.tsx:31` |
| Sources panel selection | Local `useState<{citations, queryContext} \| null>` — **the existing "context passing" pattern** | `src/views/IndexView.tsx:40`, `AnswerCard.tsx:114,196` |
| Settings tab | `useState` synced from pathname; tab switches `router.push(tab.path)` | `src/views/SettingsView.tsx:43-58` |
| Theme | `localStorage "theme"` (`light/dark/system`, default dark), class on `<html>`/`<body>`, applied in `Providers` effect + `GeneralTab` | `src/app/providers.tsx:10-36`, `GeneralTab.tsx:63-87` |
| Display name | `localStorage "bis-sih_display_name"` (+ `bis-sih_logo_style` for fonts) | `GeneralTab.tsx:42-49`, `Logo.tsx` (`LOGO_STYLE_KEY`) |
| Profile form | **Local `useState` only — NOT persisted** (save only fires a toast) | `GeneralTab.tsx:50-58,89-96` |
| Toasts | Custom reducer store (`TOAST_LIMIT = 1`) + Sonner, both mounted | `src/hooks/use-toast.ts`, `providers.tsx:41-42` |
| URL as state | `?query=`, `?historyId=`, `?new=1` (chat restore), `/settings/<tab>` (settings tab) via thin `lib/router.ts` wrapper | `IndexView.tsx:108-157`, `SettingsView.tsx:37-41` |

---

## 8. API / Backend Integration

### API inventory (complete — only 3 network touchpoints found)

**1. `POST {API_BASE}/search` (client → backend-or-proxy)**
File: `src/views/IndexView.tsx:16,56-60`
- URL: `` `${process.env.NEXT_PUBLIC_API_BASE_URL || "/api"}/search` ``
- Body: `{ query: string, top_k: 8 }` (both hardcoded shape and value)
- Headers: `Content-Type: application/json` only — **no auth headers**
- No timeout, no `AbortController`, no retry at transport level
- Success parse: `{ answer = "", citations = [], chunks_retrieved = 0 }`, then hardcoded `model: "nim", mode: "standard"` (`IndexView.tsx:74-81`)
- Error parse: `{ detail }` JSON field or fallback `"API error"` on non-OK

**2. `POST /api/search` → upstream (Next.js proxy)**
File: `src/app/api/search/route.ts:4-38`
- Upstream: `` `${process.env.BIS_SIH_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"}`.replace(/\/+$/, "") + `/search` ``
- Forwards the client JSON body verbatim; returns upstream body text with upstream status and upstream-or-fallback content-type; on fetch failure returns `502 { detail: message }`
- **No validation, no auth injection, no logging beyond passthrough**

**3. `GET /api/chat` — mock SSE, no consumers**
File: `src/app/api/chat/route.ts:9-49`
- Emits `event: status {message:"connected"}`, five `event: message {token:"chunk-N",done:false}` at 350 ms, then `event: done`. Abort-aware. **Nothing in `src/` calls it** (verified by fetch grep).

### Placeholders / mocks / hardcoded
- Chat SSE: placeholder. API-keys tab, webhooks, usage stats, invoices, security log, notifications, billing plans, support form, logout, avatar/profile: **all local mock state + toasts, zero network**.
- `model: "nim"`, `mode: "standard"`, `top_k: 8`: hardcoded in `IndexView`.
- Backend implementation behind `/search`: **UNDETERMINED FROM AVAILABLE CODE** (URL-only; default points at localhost:8000, suggesting a Python service, but that is inference, not evidence).

---

## 9. Data Models and Types

| Model | Defined in | Used in | Fields | Frontend-only vs backend-facing |
|---|---|---|---|---|
| `QueryResponse` | `src/types/api.ts:12-18` | `IndexView`, `AnswerCard`, history | `answer, citations, query, model, chunks_retrieved, mode` | **Backend-facing** (parsed from `/search`) |
| `Citation` | `src/types/api.ts:3-10` | `AnswerCard`, `CitationCard`, `SourcesPanel`, vault save | `index, title, source_type, chunk_text, score, mongo_id` | **Backend-facing** |
| `SourceType` | `src/types/api.ts:1` | `sources.ts`, badges, filters | `"bis" \| "iso" \| "iec"` | Backend-facing (union) |
| `HistoryEntry` | `src/hooks/use-store.ts:6-14` | Sidebar, history restore | `id, query, title, timestamp, sourcesUsed, model?, response?` | Frontend-only (localStorage) |
| `VaultItem` | `src/hooks/use-store.ts:16-28` | Vault UI, export | `id, title, sourceType: string (!), chunkText, score, savedAt, queryContext, mongoId?, tags?, collectionId?, notes?` | Frontend-only; **`sourceType` is `string`, not `SourceType` — type inconsistency (see §21)** |
| `Collection` | `src/hooks/use-store.ts:30-35` | Vault sidebar | `id, name, color?, createdAt` | Frontend-only |
| `ChatMessage` | `src/views/IndexView.tsx:18-24` | Chat render loop | `id, query, response?, status, timestamp` | Frontend-only |
| `ApiKey` | `src/components/settings/ApiTab.tsx:10-16` | Mock keys table | `id, name, key, created, lastUsed` | Mock-only, no backend |
| User / session / token / role models | — | — | — | **NOT FOUND IN CURRENT CODEBASE** |
| Form / service / field / draft models | — | — | — | **NOT FOUND IN CURRENT CODEBASE** |
| Zod schemas | — (dependency only) | — | — | **NOT FOUND IN CURRENT CODEBASE** (only inside unused `ui/form.tsx`) |

---

## 10. Authentication

**Verdict: UI ONLY — no authentication is implemented.**

| Concern | Status | Evidence |
|---|---|---|
| Login / signup pages | NOT FOUND | No routes, no forms; `find src` shows no auth pages |
| Logout | UI toast only | `Sidebar.tsx:185` → `toast({title: "Logged out"})`, no state/API change |
| Password change / 2FA log / Google SSO hint | UI toasts + hardcoded log rows | `SecurityTab.tsx:22-56` (password mismatch/weak toasts; static event list) |
| Session / JWT / tokens / cookies | NOT FOUND | No token storage, no `Authorization` header, no middleware, no route guards |
| Protected routes | NOT FOUND | All routes render unconditionally |
| User profile | Hardcoded mock (`BIS User`, `user@bis-chat.in`), not persisted | `GeneralTab.tsx:50-58`; save only toasts (`:89-96`) |
| Roles | Static select options (Manufacturer/Laboratory/Regulator/Consumer/Researcher/Student), selection not consumed anywhere | `GeneralTab.tsx:259-272` |

---

## 11. File / Document Handling

- Upload (PDF/image/document), drag-and-drop, `<input type="file">`, previews, OCR UI, document library/history: **NOT FOUND IN CURRENT CODEBASE** (grep for `type="file"`, `drag`, `drop`, `upload` returns only false positives: CSS classes, dropdown-menu imports, toast copy).
- Download direction only: `downloadFile()` (Blob + anchor) for BibTeX; `jsPDF` for vault PDF export (`src/lib/vault-export.ts:37-47,50-177`; filenames `bis-chat-vault.*`).
- Static assets: 6 avatar PNGs, 2 logo SVGs, favicon, `robots.txt`, `placeholder.svg` (unreferenced by app code — UNDETERMINED usage).

---

## 12. Source / Citation Handling

**Present and functional (UI + local model; backend data required):**

- Badge registry: `getSourceConfig(type)` → `{label, colorClass}` with fallback `{label: type.toUpperCase(), colorClass: "bg-muted"}` for unknown types (`src/lib/sources.ts:13-15`) — tolerant of future source keys.
- `AnswerCard` (`src/components/AnswerCard.tsx`): unique-source badges row; `[N]` → superscript pills that open `SourcesPanel`; copy / regenerate / Web-Share-or-clipboard / save-all-to-vault toolbar; `{chunks_retrieved} sources` footer.
- `CitationCard` (`src/components/CitationCard.tsx`): numbered badge, title, source pill, relevance bar (`score×100%`), 120-char truncation with expand, per-citation vault bookmark toggle. External source links were removed (no stable BIS deep-URL pattern known).
- `SourcesPanel` (`src/components/SourcesPanel.tsx`): slide-over listing citations via `CitationCard`, opened with `(citations, queryContext)`.
- Vault cards (`VaultItemCard`): tags, notes, collections, remove; export preserves `sourceType.toUpperCase()`, relevance, dates, query context.
- Missing vs the brief's vision: page numbers, clause numbers, document sections, evidence spans — **NOT FOUND** (current `Citation` has only `chunk_text` + `score`).

---

## 13. Design System

- **Palette**: warm parchment light theme (`--background: 53 100% 96.9%`), warm dark theme, **BIS blue accents** (`--primary: 201 100% 36%` light / pale cyan dark); source badges BIS-blue/ISO-cyan/IEC-indigo; semantic red/green/amber retained (`src/app/globals.css:8-122`).
- **Typography**: Google Fonts import (Inter / Playfair Display / Manrope / Montserrat); `--font-heading`/`--font-body` swapped at runtime by Classic/Modern setting (`Logo.tsx:22-33`); headings `font-heading semibold` via base layer.
- **Shape/elevation**: `--radius: 0.75rem`; utilities `glassmorphism`, `gradient-primary`, `journal-shadow`, `journal-ring`; `animate-fade-up`, `skeleton-shimmer`, thin custom scrollbars (`globals.css:141-163`).
- **Library**: 47 shadcn/Radix primitives (`button` variants, `dialog`, `sheet`, `tabs`, `accordion`, `select`, `dropdown-menu`, `sonner`, `tooltip`, …) — the visual language to preserve for the future form side.
- **Icons**: `lucide-react` exclusively. **Dark/light**: class strategy, default dark, persisted (`providers.tsx`, `GeneralTab`).

---

## 14. Responsive Architecture

- **Shell**: `Layout.tsx` + `use-mobile.tsx`: sidebar open on desktop, closed + floating open-button on mobile; mobile backdrop to close (`Layout.tsx:14-42`, `Sidebar.tsx:50-52`).
- **Chat**: `QueryZone` scales (`text-[32px]→48px` logo, `h-12→14` input), message column `max-w-3xl→5xl`, toolbar labels hidden on mobile (`hidden sm:inline`).
- **Sources split**: `PanelGroup` horizontal with `minSize/maxSize`; on narrow screens the panel overlays content width — workable but **no stacked/toggle chat↔panel mobile pattern exists**.
- **Settings**: `.settings-sidebar` becomes a horizontal scroll tab bar under 767px (`globals.css:416-458`).
- **Vault**: `lg:` two-column (collections + items), single column below.
- **Capability verdict for future Chat|Form**: desktop split is proven by the existing chat|sources resizable split; mobile will need a new toggle/stack pattern (NOT IMPLEMENTED); no `useIsTablet`-style breakpoints beyond `use-mobile`.

---

## 15. Existing BIS Functionality

- INFORMATION MODE chat over BIS/ISO/IEC citation badges (UI + contract; backend unknown).
- Standards Vault (local): save/tag/organize/export citations.
- Settings/help/profile/billing shells (mock data, UI-only).
- Theming, history, toasts, skeletons, empty/error/loading states per message.
- **No service catalogue, no application forms, no field-level logic, no certification workflow, no BIS number lookup beyond free-text chat.**

---

## 16. Missing BIS Form Functionality

| Concept | Status | Note |
|---|---|---|
| Active BIS service / service catalogue | NOT IMPLEMENTED | No service list, cards, or detail views |
| Form schema / sections / fields | NOT IMPLEMENTED | No schema, no field components in app code (primitives exist unused) |
| Current field / field metadata / validation | NOT IMPLEMENTED | No focus tracking, no zod schemas in app code |
| Form progress / draft state / autosave | NOT IMPLEMENTED | Nothing persisted except chat/vault/settings |
| Explicit INFORMATION → ACTION transition | NOT IMPLEMENTED | No buttons, routes, or state for opening a service |
| Chat + form coexistence (split view) | NOT IMPLEMENTED | Only chat + sources-panel split exists (reusable pattern) |
| Context Bridge (conversation + service + form + field) | NOT IMPLEMENTED | See §17 for nearest existing hooks |
| File upload for applications/documents | NOT FOUND | See §11 |

---

## 17. Context Bridge Readiness

Existing concepts that could feed a future `{conversation_context, service_context, form_context, field_context}` object:

| Future context | Existing analogue (EXISTS) | Location |
|---|---|---|
| `conversation_context` | Full `ChatMessage[]` in memory (query+response+status+timestamp); restorable `HistoryEntry` (query+response+title+sources) | `IndexView.tsx:31`, `use-store.ts:87-98` |
| Selected-evidence context | `onOpenSources(citations, queryContext)` — citations + originating query lifted together into a side panel | `AnswerCard.tsx:114,196`, `IndexView.tsx:40` |
| Route/page context | Pathname-driven settings tabs; `?historyId/?query/?new` chat intents | `SettingsView.tsx:37-41`, `IndexView.tsx:108-157` |
| User context | `bis-sih_display_name` (persisted), role/sector/country (selected but **not persisted, not consumed**) | `GeneralTab.tsx:42-58` |
| UI selection state | Vault search/filter/tag/collection, notification source toggles | `VaultView.tsx:40-44`, `NotificationsTab.tsx` |
| `service_context` / `form_context` / `field_context` | **NOT IMPLEMENTED** — no active-service state, no form model, no field-focus tracking | — |

Natural accommodation points: new `useBISService`/`useFormDraft` hooks beside `use-store.ts` composed into `StoreContext`; a new `service_context` prop threaded through the existing `onOpenSources`-style callback pattern; URL params (`?service=`, `?field=`) mirroring the existing `?historyId=` restore pattern; the `PanelGroup` split for Chat|Form.

---

## 18. Backend Requirements Implied by Frontend

**A. REQUIRED NOW** (current UI breaks without it): `POST /search` accepting `{query, top_k}` and returning `{answer, citations[{index,title,source_type,chunk_text,score,mongo_id}], query?, model?, chunks_retrieved}` — INFERRED FROM FRONTEND (`IndexView.tsx:51-106`, `types/api.ts`).

**B. REQUIRED FOR EXISTING UI** (same as A; everything else is local): nothing else — vault, history, settings, exports are 100% client-side.

**C. REQUIRED FOR FUTURE BIS FORM FEATURE** (INFERRED FROM FRONTEND gaps — no code supports these yet): service catalogue metadata; form schemas per service; draft create/read/update; field-level help content source; validation rules endpoint (or client schemas); submission + status; auth/session (currently greenfield).

**D. FUTURE / OPTIONAL**: streaming chat (mock SSE hints at intent but UI can't render streams today); push/webhook delivery (copy only); usage metering/billing APIs (mock UI); file ingestion for knowledge base (no UI exists).

---

## 19. Current API Contract

```text
Client (IndexView) ──POST {NEXT_PUBLIC_API_BASE_URL || "/api"}/search──▶ Next proxy (/api/search)
  body:    { "query": "<raw user text>", "top_k": 8 }
  headers: Content-Type: application/json (no auth)

Next proxy ──POST {BIS_SIH_API_BASE_URL || NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"}/search──▶ Upstream
  body:    forwarded verbatim
  returns: upstream status + body (expects {answer, citations[], chunks_retrieved}); 502 {detail} on transport failure
```

Client hardcodes `model: "nim"`, `mode: "standard"` post-parse. Error shape consumed: `{detail?: string}`. No versioning, no pagination, no auth, no timeouts, no request IDs. `GET /api/chat` mock SSE is unconsumed.

---

## 20. Future API Requirements for Form Assistance

Derived from gaps (all INFERRED FROM FRONTEND absence — no endpoints exist):

1. `GET /services` + `GET /services/{id}/schema` — catalogue and form definition (sections, fields, types, required, help text).
2. `POST/PUT /applications` (+ `GET`) — draft persistence to replace the current localStorage-only pattern.
3. `POST /assist/field` (or extended `/search` with context envelope) — accepting `{query, conversation_context, service_context, form_context {values}, field_context {id, value}}`.
4. Validation source: server rules or published schemas for client-side zod (zod already installed).
5. Auth/session endpoints — completely greenfield (see §10).
6. Optional later: streaming answers (requires a new renderer; current UI is request/response), file upload for supporting documents (no UI), status/submission tracking.

---

## 21. Technical Debt / Risks

1. **Type inconsistency**: `VaultItem.sourceType: string` vs `Citation.source_type: SourceType` (`use-store.ts:19`, `api.ts:1`) — same concept, different strictness; will bite when form/vault code shares source types.
2. **No transport safety**: client `fetch` has no timeout/`AbortController`; proxy has no validation/rate-limiting; upstream status/body passed through blindly (`IndexView.tsx:56`, `api/search/route.ts`).
3. **Collision-prone IDs**: `Date.now().toString()` for history/keys; vault/collections add only a 4-char random suffix (`use-store.ts:88,122,161`).
4. **Unpersisted profile**: role/sector/country/avatar edits vanish on reload (only display name + theme persist) — the future Context Bridge cannot rely on profile state as-is (`GeneralTab.tsx:50-96`).
5. **Dead/duplicate code**: `ApiTab` unmounted (not in `TABS`); two toast systems mounted; `sonner` reads `next-themes useTheme` with no `ThemeProvider` (theming actually manual — decoupling UNVERIFIED for breakage but intentional-looking); unused `ui/{form,chart,command,calendar,…}` surface area to maintain.
6. **Silent caps/limits**: history truncated to 50, toast limit 1, no pagination in vault.
7. **Dual lockfiles** (`bun.lock` + `bun.lockb` + `package-lock.json`) risk install drift; `next lint` is deprecated upstream (script still references it).
8. **Mock-heavy settings** (billing, API keys, security log, notifications) could mislead backend scoping — they imply APIs that do not exist.
9. **`@typescript-eslint/no-unused-vars: off`** + `strict: false` reduce compiler safety net for the coming form work.
10. **No tests of value**: one placeholder vitest test; Playwright configured with zero specs.

---

## 22. Important Files and Symbols

| File | Key symbols | Why it matters |
|---|---|---|
| `src/views/IndexView.tsx` | `IndexView`, `ChatMessage`, `handleQuery`, `handleRetry`, `API_BASE` | Entire chat behavior + backend call |
| `src/types/api.ts` | `SourceType`, `Citation`, `QueryResponse` | Backend-facing contract |
| `src/app/api/search/route.ts` | `API_BASE`, `POST` | Proxy + env resolution |
| `src/app/api/chat/route.ts` | `GET`, `createSseEvent` | Mock SSE placeholder |
| `src/hooks/use-store.ts` | `HistoryEntry`, `VaultItem`, `Collection`, `useQueryHistory`, `useVault`, `useCollections`, `generateTitle` | All persisted models |
| `src/contexts/StoreContext.tsx` | `StoreProvider`, `useStore` | Global state composition point (extend here) |
| `src/components/AnswerCard.tsx` | `AnswerCard`, `processedAnswer`, `handleSaveAll` | Markdown + citations + vault bridge |
| `src/components/SourcesPanel.tsx` | `SourcesPanel` | Side-panel context pattern to imitate |
| `src/lib/sources.ts` | `SOURCE_CONFIG`, `getSourceConfig` | Source badge registry (tolerant fallback) |
| `src/lib/vault-export.ts` | `vaultToBibtex`, `vaultToPdf`, `downloadFile` | Export formats backend must remain compatible with |
| `src/components/settings/*` | 6 tabs + orphan `ApiTab` | Settings scope; mostly mock |
| `src/app/providers.tsx` | `Providers`, `applyPersistedTheme` | Provider stack + theme bootstrap |
| `src/lib/router.ts` | `useRouter`, `usePathname`, `useSearchParams` | Navigation choke point |
| `tailwind.config.ts` / `src/app/globals.css` | `source-*`, `terracotta`, prose/settings/vault CSS | Design tokens + responsive patterns |
| `AGENTS.md` / `TASKS.md` / `implementation_plan.md` | conventions, queue, history | Repo working agreements |

---

## 23. Recommended Integration Boundaries

1. **Keep `types/api.ts` as the contract seam** — extend `Citation` (clause/page/section) and add form/context DTOs here first.
2. **Extend state via new hooks + `StoreContext`** (`useBISService`, `useFormDraft`) mirroring `useVault` (localStorage-first, backend sync later) — do not entangle chat message state.
3. **Reuse the `AnswerCard → onOpenSources → PanelGroup` pattern** for Chat|Form: form panel receives a context object the way `SourcesPanel` receives `(citations, queryContext)`.
4. **Build the form on `ui/form.tsx` + primitives** (first real use of the installed react-hook-form/zod stack); drive tab/section switching off the proven `SettingsView` pathname pattern.
5. **Put the context envelope behind `lib/` functions** (new `lib/context-bridge.ts`-style module) rather than prop-drilling, and route it through the existing `/api` proxy convention with auth injection added in one place (`api/search/route.ts` pattern).
6. **Do not reuse mock tabs** (billing/API keys/security log) as backend scope — treat as UI-only until specified.

---

## 24. Open Questions / Unknowns

1. What is the real upstream behind `/search` (framework, hosting, auth)? — UNDETERMINED FROM AVAILABLE CODE.
2. Is streaming actually desired? Mock SSE exists but no client/streaming renderer does.
3. What do `mongo_id` and `score` mean to the future backend (legacy RAG fields?) — producer unknown.
4. Which source keys beyond `bis|iso|iec` must the badge fallback support?
5. Auth model, multi-user vs single-user, and whether vault/history must move server-side.
6. Which BIS services/forms come first, and their schemas/validation/approval flows.
7. Whether `top_k: 8`, `model: "nim"`, `mode: "standard"` are intentional contract fields or scaffolding.
8. Do citations need page/clause/section granularity the current `Citation` type lacks?

---

## 25. Final Frontend Architecture Summary

A Next.js 15 / React 18 / TS (lenient) / Tailwind-3 / shadcn application implementing a complete, polished **information-mode** standards chatbot: single-shot grounded Q&A with citations, slide-over sources, local vault with export, history, settings, and help — backed by exactly one real endpoint (`POST /search` via a thin proxy) and zero auth. State is local-first (Context + localStorage); server-state, form, upload, and realtime tooling is either installed-but-unused or mocked. The architecture is **horizontally extensible**: new hooks compose into the existing store, new panels fit the existing resizable split, and a large unused form-capable primitive set awaits the ACTION MODE work. The Context Bridge, BIS services, and all backend capabilities except `/search` are greenfield.

---

# BACKEND DESIGN INPUT

## Existing Frontend Expectations

- One synchronous Q&A call: `{query, top_k: 8}` → `{answer (markdown with `[N]` markers), citations[], chunks_retrieved}`; empty results (`chunks_retrieved === 0`) and errors are first-class UI states. No streaming expected today.
- Same-origin proxy convention (`/api/*`) with env-resolved upstream; client falls back to `/api` when `NEXT_PUBLIC_API_BASE_URL` is unset.

## Existing API Dependencies

- `POST /search` (real, upstream unknown — defaults to `http://127.0.0.1:8000`, overridable via `BIS_SIH_API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL`).
- `GET /api/chat` mock SSE (unconsumed; streaming intent only).

## Existing Data Structures

- `QueryResponse {answer, citations[], query, model, chunks_retrieved, mode}`; `Citation {index, title, source_type: bis|iso|iec, chunk_text, score, mongo_id}`; `HistoryEntry`; `VaultItem` (note `sourceType: string`); `Collection`. All client models in `src/types/api.ts`, `src/hooks/use-store.ts`. No user/session/form models exist.

## Existing Authentication Expectations

- None. No tokens, sessions, guards, or login flows. Any auth is a greenfield backend+frontend addition; current account UI is decorative.

## Existing Chat Requirements

- Request/response (no streaming renderer), per-message loading/empty/error/retry/regenerate, markdown answers with `[N]` citation markers, relevance scores, vault bookmarking, history restore by ID, export-safe citation text.

## Existing Document Requirements

- None inbound (no upload/ingestion UI). Outbound only: BibTeX and PDF vault exports that consume `title, sourceType, chunkText, score, savedAt, queryContext, tags, notes`.

## Future BIS Form Requirements

- Service catalogue + per-service form schemas, draft persistence, validation (client has unused zod + form primitives), field-level help, submission/status, and an explicit user-triggered INFORMATION→ACTION transition with a Chat|Form split reusing the existing panel pattern.

## Future Context Bridge Requirements

- A combinable context object (`conversation + service + form + field`) with no existing implementation; nearest raw materials are in-memory `ChatMessage[]`, restorable `HistoryEntry`, `(citations, queryContext)` panel passing, URL intents, and (unpersisted) profile/sector state.

## Frontend Constraints

- No auth headers can be sent today; proxy forwards body only — add auth in the `/api` layer, not per-component.
- Lenient TS (`strict: false`, unused-vars off) — backend contracts should be enforced by runtime validation, not assumed from types.
- Everything persists to localStorage under `bis-sih_*` keys — server persistence is a migration, not an extension.
- Dual toasts, dead `ApiTab`, mock settings tabs: do not treat as API requirements.

## Backend Questions That Must Be Resolved

1. Real `/search` implementation, hosting, auth, timeouts, and rate limits.
2. Streaming: yes/no (UI renderer must be built if yes).
3. Citation granularity (page/clause/section?) and stable source URLs/IDs (`mongo_id` semantics).
4. AuthN/Z model and whether history/vault go server-side.
5. First BIS services, their schemas, validation, drafts, submission lifecycle.
6. Meaning and stability of `model: "nim"`, `mode: "standard"`, `top_k: 8`.
