# Agents.md - BIS-SIH UI Agents Instructions

## Scope

This file defines agent responsibilities, hard file locks, and coordination rules for the BIS-SIH UI project. These rules apply repository-wide. Per-folder AGENTS.md files take precedence over this one if they exist.

## Required Git Rules

- Commit every turn of work
- Do not amend commits
- Do not change branches without explicit user permission
- Do not push, pull, or rebase unless explicitly requested

## Commit Expectations

- Focused commits scoped to the requested task
- Conventional commit messages (feat:, fix:, refactor:, chore:, docs:, test:)
- No generated-with lines, attribution blocks, or command transcripts in commit messages

## Validation

```
bun install
bun run lint
bun run build
```

## Safety

- Do not revert user-authored or unrelated local changes unless explicitly requested
- Avoid destructive git commands unless explicitly requested
- Never modify `bun.lockb` manually — use `bun install` to manage dependencies
- Never edit `tailwind.config.ts` or `components.json` without understanding impact on all shadcn/ui components
- Do not drop or modify the `src/app` directory structure without updating routing references; files in this directory define all page routes
- Do not modify `next.config.mjs` or `tsconfig.json` compiler options without testing the full build
- Do not delete or rename files in `src/contexts`, `src/hooks`, or `src/lib` without checking all dependents first — these are highly connected

## Project Overview

BIS-SIH is a premium AI-powered clinical intelligence platform that provides evidence-based medical answers backed by verifiable citations. It offers a research-first interface with features including multi-source medical knowledge synthesis, intelligent citations from trusted sources (PubMed, Cochrane, WHO, CDC), a research vault for saving discoveries, and flexible aesthetics with Modern and Classic design modes. Built with Next.js, React, and Tailwind CSS, it prioritizes journal-grade readability for healthcare professionals and researchers.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser / Client                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Next.js App Router (Layout + Pages)         │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ /                  /vault            /help           │   │
│  │ /settings/...      (+ 404, error, loading)          │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   React Components (Client-Side, "use client")      │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ - Layout (Sidebar, NavLinks, Footer)                │   │
│  │ - QueryZone (user queries)                          │   │
│  │ - AnswerCard (display results with citations)       │   │
│  │ - SourcesPanel (manage sources)                     │   │
│  │ - Settings (tabs: Account, API, Billing, etc.)      │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   Providers + State Management                      │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ - QueryClientProvider (@tanstack/react-query)      │   │
│  │ - StoreContext (custom context for app state)       │   │
│  │ - ThemeProvider (next-themes)                       │   │
│  │ - Sonner (toast notifications)                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   UI Components (shadcn/ui + Radix UI)             │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ - Button, Card, Dialog, Tabs, Accordion             │   │
│  │ - Forms (react-hook-form + Zod validation)          │   │
│  │ - Charts (recharts), Icons (lucide-react)           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│           Network / API Boundary (localhost:3000)            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      Next.js API Routes (src/app/api/)              │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ - /api/chat (SSE streaming for AI responses)        │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   External Services (AI Backend, Medical APIs)      │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ - PubMed, Cochrane, WHO, CDC, StatPearls, ICMR     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Multi-Agent Role Table

| Agent | Role | Leads On | Hard Restrictions |
|-------|------|----------|-------------------|
| GitHub Copilot | Assist | — | AGENTS.md, TASKS.md, bun.lockb, tsconfig.json, next.config.mjs |
| Cursor Agent | Feature Implementation | src/components/, src/hooks/, src/views/, src/pages/ | AGENTS.md, TASKS.md, bun.lockb, tsconfig.json, next.config.mjs, src/app/api/, src/lib/router.ts |
| OpenCode | Architecture & Core Wiring | src/app/, src/contexts/, src/lib/, src/app/api/ | AGENTS.md, TASKS.md, bun.lockb, tsconfig.json, next.config.mjs, package.json |
| BlackboxAI | Config & Tooling | tailwind.config.ts, eslint.config.js, postcss.config.js, vitest.config.ts, playwright.config.ts | AGENTS.md, TASKS.md, bun.lockb, tsconfig.json, next.config.mjs |

## Project Structure

| Path | Purpose |
|------|---------|
| src/app | Next.js App Router pages and layouts (index, vault, help, settings, api routes) |
| src/components | React components (Layout, QueryZone, AnswerCard, CitationCard, SourcesPanel, Settings tabs, shadcn/ui) |
| src/components/ui | shadcn/ui primitives (Button, Card, Dialog, Tabs, Forms, etc.) |
| src/components/vault | Vault-specific components |
| src/contexts | React Context providers (StoreContext, QueryClientProvider setup) |
| src/hooks | Custom hooks (use-store, use-toast, use-mobile) |
| src/lib | Utility functions (router.ts, sources.ts, utils.ts, vault-export.ts) |
| src/types | TypeScript type definitions (api.ts, assets.d.ts) |
| src/views | Legacy view components (HelpView, IndexView, VaultView, etc.) — being migrated to src/app |
| src/test | Test configuration and example tests (vitest setup, playwright fixtures) |
| public | Static assets (robots.txt, images) |

## Key Files

| Path | Purpose |
|------|---------|
| package.json | Project metadata, dependencies, scripts (dev, build, start, lint, test) |
| next.config.mjs | Next.js configuration (reactStrictMode: true) |
| tsconfig.json | TypeScript compiler options (ES2017 target, @ path alias, strict: false) |
| tailwind.config.ts | Tailwind CSS theme config with custom colors, fonts, and dark mode |
| vite.config.ts | Vite build configuration (legacy, being replaced by Next.js) |
| vitest.config.ts | Vitest test runner (jsdom environment, glob includes) |
| playwright.config.ts | Playwright e2e test config (baseURL: localhost:3000, Chromium only) |
| eslint.config.js | ESLint rules for TypeScript and React Hooks |
| postcss.config.js | PostCSS with Tailwind and Autoprefixer |
| components.json | shadcn/ui component registry and path aliases |
| src/app/layout.tsx | Root layout with global styles and providers |
| src/app/providers.tsx | Client-side provider wrapper (QueryClient, Store, Themes, Sonner) |
| src/app/page.tsx | Home page component |
| src/app/api/chat/route.ts | Server-Sent Events streaming endpoint for chat |
| src/contexts/StoreContext.tsx | Central store context for app state |
| src/hooks/use-store.ts | Store context hook |
| src/lib/router.ts | Route definitions and navigation helpers |
| src/types/api.ts | API request/response type definitions |

## Development

```
bun install
bun run dev
bun run build
bun run start
bun run lint
bun run test
bun run test:watch
```

## Testing

Unit and integration tests:
```
bun run test
bun run test:watch
```

E2E tests (requires dev server running on localhost:3000):
```
bun run dev
# In another terminal:
npx playwright test
```

Test style rules:
- Assertion library: Vitest built-in expect()
- Test file naming: `*.test.ts` or `*.spec.ts` in `src/**`
- Test environment: jsdom (browser-like DOM)
- Setup files: `src/test/setup.ts` — included automatically by vitest.config.ts
- Test location convention: tests live alongside source files or in `src/test/`

## Build Requirements

- **Node.js / Bun:** Bun (no specific version pinned in package.json)
- **Language version:** TypeScript ES2017 target, React 18.3.1, Next.js 15.3.4
- **Package manager:** Bun (primary); npm and pnpm supported via lockfiles
- **Build tools:** Next.js build system (no separate build tool required)
- **System dependencies:** None beyond Node/Bun runtime

## Conventions

- **Formatter:** Prettier (not explicitly configured in repo; infer from `.prettierrc` if present, else defaults apply)
- **Linter:** ESLint with TypeScript support; rules in eslint.config.js (no-unused-vars disabled)
- **Type checker:** TypeScript with strict: false (lenient mode); path alias @ → src/
- **Naming conventions:**
  - Components: PascalCase (e.g., QueryZone, AnswerCard, CitationCard)
  - Hooks: camelCase with `use` prefix (e.g., useStore, useMobile, useToast)
  - Utilities and helpers: camelCase (e.g., router, sources, utils)
  - Type definitions: PascalCase interfaces/types (e.g., ApiResponse, StorageState)
- **File organization:**
  - Page components in src/app/[route]/page.tsx
  - Shared components in src/components/
  - UI primitives in src/components/ui/ (auto-generated by shadcn/cli)
  - Hooks in src/hooks/
  - Utilities in src/lib/
  - Context providers in src/contexts/
- **Tailwind:** Dark mode via class selector, custom color palette with HSL variables, responsive breakpoints via Tailwind defaults

## Next.js App Router & SSE Streaming

The application uses Next.js App Router (file-based routing in src/app/). All interactive components must include `"use client"` directive. API routes in src/app/api/ handle server-side logic including Server-Sent Events (SSE) streaming for real-time chat responses from external AI backends. Route Handlers use standard Web Streams API for streaming responses.

## Multi-Source Medical Data Integration

The application fetches medical knowledge from multiple global repositories: PubMed, Cochrane Library, WHO, CDC, StatPearls, and ICMR. All external API integrations and data synthesis must preserve citation metadata from the original source. Do not strip or modify source attribution in API responses or components that display citations (CitationCard, SourcesPanel). Response formatting must maintain the structure expected by the CitationCard component and AnswerCard rendering logic.

## Local Storage & Research Vault

The Research Vault (src/components/vault/, src/app/vault/page.tsx) persists user research data locally using browser storage or server-side session state. Do not delete or modify vault export functions (vault-export.ts) or schema without testing round-trip import/export. Vault data structure is managed by StoreContext; all vault mutations must go through the store, not direct state modifications.

## Pull Requests / Handoffs

- Update TASKS.md before stopping and before switching agents
- No test plans or checklists in commit messages or PR descriptions
- When handing off work to another agent, describe which files changed, why, and which tests validate the change in TASKS.md

