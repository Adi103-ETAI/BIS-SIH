# Migrate Vite React App to Next.js In-Place

This plan details the process of migrating the existing React (Vite) application to Next.js (App Router) while preserving the exact same UI and Tailwind/Shadcn setup, and introducing Server-Sent Events (SSE) streaming capabilities.

## User Review Required

> [!WARNING]
> This is an **in-place migration**. This means we will modify your `package.json` to replace Vite with Next.js, and reorganize your `src` folder structure. Ensure your current branch is pushed to git before we begin.

> [!IMPORTANT]
> Next.js uses different routing (`next/navigation` instead of `react-router-dom`). I will systematically replace all `react-router-dom` imports (like `<Link>` and `useNavigate`) with Next.js equivalents.

## Proposed Changes

### 1. Dependencies and Configuration

Update the project configuration to run Next.js instead of Vite.

#### [MODIFY] `package.json`
- Remove `vite`, `vite-plugin-react-swc`, `react-router-dom`.
- Add `next` to dependencies.
- Update scripts:
  - `"dev": "next dev"`
  - `"build": "next build"`
  - `"start": "next start"`

#### [NEW] `next.config.mjs`
Create a standard Next.js configuration file.

#### [DELETE] `vite.config.ts`
#### [DELETE] `index.html`
#### [DELETE] `src/vite-env.d.ts`

---

### 2. Global Providers and Layout (Next.js App Router)

Next.js uses a global `layout.tsx` file to wrap all pages, replacing `App.tsx` and `main.tsx`.

#### [DELETE] `src/App.tsx`
#### [DELETE] `src/main.tsx`

#### [NEW] `src/app/layout.tsx`
- Define the root HTML structure (`<html>`, `<body>`).
- Import global CSS (`import "../index.css"`).
- Include the main layout wrapper and metadata.

#### [NEW] `src/app/providers.tsx`
- A client-side wrapper with `"use client"` that includes your `QueryClientProvider`, `TooltipProvider`, `StoreProvider`, `Toaster`, and `Sonner`. This ensures all React Context providers work perfectly in Next.js Server Components.

---

### 3. Routing Migration

Migrate `react-router-dom` routes into the Next.js file-based routing system inside `src/app/`.

#### [NEW] `src/app/page.tsx`
- Moved from `src/pages/Index.tsx`.

#### [NEW] `src/app/vault/page.tsx`
- Moved from `src/pages/Vault.tsx`.

#### [NEW] `src/app/help/page.tsx`
- Moved from `src/pages/Help.tsx`.

#### [NEW] `src/app/settings/[[...slug]]/page.tsx`
- Moved from `src/pages/Settings.tsx`. Handles nested settings routes.

#### [NEW] `src/app/not-found.tsx`
- Moved from `src/pages/NotFound.tsx`.

#### [MODIFY] Existing `src/pages/*`
- They will be converted to client components (`"use client"`) or integrated into the `src/app` routes directly.

---

### 4. Components & Hooks Adjustments

Since Next.js App Router defaults to Server Components, we must mark interactive components.

#### [MODIFY] All interactive components (e.g., `src/components/*`)
- Add `"use client"` to the top of the file so hooks like `useState` and `useEffect` continue to work exactly as they did in Vite.

#### [MODIFY] `react-router-dom` usages
- Replace `useNavigate` with `import { useRouter } from 'next/navigation'`.
- Replace `useLocation` with `import { usePathname } from 'next/navigation'`.
- Replace `<Link to="...">` with `import Link from 'next/link'` and `<Link href="...">`.

---

### 5. SSE Streaming Setup

Next.js Route Handlers are perfect for Server-Sent Events (SSE) out of the box using standard Web Streams.

#### [NEW] `src/app/api/chat/route.ts`
- Implement an example SSE streaming endpoint using Next.js Route Handlers (`Response` with a `ReadableStream`). This gives you the exact setup needed for AI text streaming.

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure the Next.js build completes successfully without TypeScript or dependency errors.

### Manual Verification
- Start the development server (`npm run dev`).
- Verify the main UI renders identically to the Vite app.
- Click through all navigation links (Home, Vault, Settings, Help) to ensure Next.js routing is fully functional.
- Test the SSE streaming endpoint (if applicable) or verify the `api/chat` route exists and returns stream headers.
