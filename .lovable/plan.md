# Backend Plan: Auth + User Data (Lovable Cloud)

Keep FastAPI as-is for the RAG `/query` pipeline. Add Lovable Cloud for everything user-related: auth, profile, history sync, vault sync, billing/plan. FastAPI accepts requests both with and without a logged-in user during dev (no breaking change to your ingestion work).

## What gets built

### 1. Enable Lovable Cloud
One click. Provisions Postgres + Auth + Storage + Edge Functions. No Supabase account needed, no env keys to copy.

### 2. Auth
- Email + password (with verification email)
- Google sign-in (one-click)
- Pages: `/auth` (login + signup tabs), `/auth/reset-password`, `/auth/forgot-password`
- Session managed via `onAuthStateChange` + `getSession()` listener in a top-level `AuthProvider`
- Header avatar shows logged-in user; "Sign out" in user menu
- Routes stay public for now (so dev work isn't blocked); a `<ProtectedRoute>` wrapper is added but only applied to Settings/Vault. Index/Help remain public.

### 3. Database tables (with RLS — every table owner-scoped)

```text
profiles            id (=auth.users.id), display_name, specialty, avatar_url, created_at
user_roles          id, user_id, role (enum: admin, user)        -- separate table, never on profiles
query_history       id, user_id, query, response_json, created_at
vault_items         id, user_id, collection_id?, title, chunk_text, source_type, mongo_id, score, saved_at
collections         id, user_id, name, color, created_at
api_keys            id, user_id, name, key_hash, last_used_at, created_at
subscriptions       id, user_id, plan (free|pro), status, current_period_end, stripe_customer_id?
usage_counters      id, user_id, period_start, query_count
```

Trigger: on `auth.users` insert → create `profiles` row + default `subscriptions` row (plan=free) + assign `user` role.

### 4. Sync layer (replaces localStorage)
`use-store.ts` is rewritten to read/write Cloud when logged in, and fall back to localStorage when logged out (so the app keeps working during dev). On first login, local data is migrated up to Cloud once.

### 5. FastAPI ↔ Cloud bridge (dev-friendly: works both ways)
- Frontend always sends `Authorization: Bearer <jwt>` to FastAPI **when a user is logged in**; sends nothing when logged out.
- FastAPI middleware: if header present → verify with Supabase JWKS, attach `user_id`; if absent → mark as `anonymous` (still serves the query).
- Per-user usage counter only increments when `user_id` is present.
- This way you can keep hitting `/query` from anywhere during dev, and gating can be flipped on later by changing one line.

### 6. Settings page wiring
- General tab → reads/writes `profiles` (display name, specialty, avatar via Storage bucket `avatars`)
- Account tab → email change, delete account
- Security tab → password change, 2FA (already scaffolded UI)
- API tab → list/create/revoke `api_keys` rows
- Billing tab → reads `subscriptions` + `usage_counters`. Stripe integration deferred to a later plan.

## What's NOT in this plan
- Stripe billing wiring (separate plan once you're ready to charge)
- Admin dashboard
- Team/org features
- Custom auth email templates (default Cloud emails are fine for dev)

## Technical notes
- Roles live in `user_roles` + `has_role(uuid, app_role)` SECURITY DEFINER function (prevents RLS recursion).
- All RLS policies use `auth.uid() = user_id` for owner scoping.
- FastAPI verifies JWT via `https://<project>.supabase.co/auth/v1/.well-known/jwks.json` (cache the JWKS).
- Storage bucket `avatars` is public-read, owner-write.
- localStorage → Cloud migration runs once per user, idempotent (checks a `migrated_at` flag in `profiles`).

## Why Lovable Cloud over Convex (short)
Native integration in Lovable: one-click enable, managed auth UI, RLS scanner, managed email, no SDK setup, no extra account. Convex would mean external account + manual SDK + separate auth provider + losing the Lovable security/email tooling. Your stack stays simpler.

## Suggested build order
1. Enable Cloud + create schema + RLS + trigger
2. Auth pages + AuthProvider + header wiring
3. Profile (General tab) + Storage bucket
4. Sync layer for history + vault + collections (with localStorage fallback)
5. FastAPI JWT verification middleware (optional header)
6. API keys tab
7. Subscriptions table (Stripe wiring later)
