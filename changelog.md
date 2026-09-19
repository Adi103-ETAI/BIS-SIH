# Changelog

All notable changes to BIS-SIH are tracked here. Newest first.

## 2026-06-15 — Profile, Security & Password Reset

### General Settings (cloud-wired)
- **Profile loads from `profiles` table** when signed in (display name, specialty, avatar).
- **Email field** now reflects the real authenticated email (from Supabase Auth).
- **Save button** writes back to `profiles` via owner-scoped RLS (`auth.uid() = id`).
- **Custom avatar upload**: new "Upload custom" button uploads to the `avatars` storage bucket under `<user_id>/avatar-<ts>.<ext>`, then stores the public URL in `profiles.avatar_url`.
  - 2 MB size cap, image-only validation.
  - Cartoon picks are stored as compact tokens (`cartoon:1`..`cartoon:6`) so they don't bloat the row.
  - Avatar removal continues to work (writes `null`).
- Falls back gracefully to local-only behavior when signed out.

### Security tab
- **Real password change** via `supabase.auth.updateUser({ password })`.
  - Current password is re-verified with `signInWithPassword` before update (defense against session-jacking on shared devices).
  - Minimum 8 chars + strength meter (must score "Good" or higher to submit).
- 2FA section replaced with an honest "Coming soon" notice (TOTP not wired yet).
- Activity log replaced with a placeholder until real audit tracking is added.

### Forgot / reset password
- New route **`/auth/forgot-password`** — calls `resetPasswordForEmail` with redirect to `/auth/reset-password`.
- New route **`/auth/reset-password`** — listens for the `PASSWORD_RECOVERY` event from Supabase, then lets the user set a new password (`updateUser({ password })`).
  - Shows "invalid or expired link" state when no recovery session is present.
  - Auto-redirects home on success (user is signed in by the recovery token).
- **"Forgot?"** link added next to the password field on the sign-in form.

### Files touched
- `src/App.tsx` — new routes for `/auth/forgot-password` and `/auth/reset-password`.
- `src/views/AuthView.tsx` — forgot-password link.
- `src/views/ForgotPasswordView.tsx` — new.
- `src/views/ResetPasswordView.tsx` — new.
- `src/components/settings/GeneralTab.tsx` — cloud wiring + avatar upload.
- `src/components/settings/SecurityTab.tsx` — real password change.

---

## Earlier (summary)

### Backend foundation
- Lovable Cloud (Supabase) enabled. Tables: `profiles`, `user_roles`, `query_history`, `vault_items`, `collections`, `api_keys`, `subscriptions`, `usage_counters` — all with owner-scoped RLS + GRANTs.
- `handle_new_user` trigger seeds `profiles` + free `subscriptions` + default `user` role on signup.
- `has_role(uuid, app_role)` SECURITY DEFINER function for safe role checks.
- `avatars` storage bucket (public read, owner write).
- `delete-account` edge function for hard account removal.

### Auth
- `AuthProvider` + `ProtectedRoute` (Settings and Vault gated; `/` and `/help` stay public for dev).
- `/auth` page with Email+password tabs and Google OAuth via Lovable managed broker.
- Sidebar shows real user / "Guest — Not signed in" with sign-in / log-out actions.

### Sync layer
- `use-store.ts` reads/writes Cloud when signed in, localStorage when signed out.
- One-time `migrateLocalToCloud` on first sign-in (idempotent via `profiles.migrated_at`).

### API + Billing
- API keys tab: SHA-256 hashed storage, full key shown once.
- Billing tab reads `subscriptions` + monthly count from `query_history`.

### FastAPI bridge
- Frontend attaches `Authorization: Bearer <jwt>` to `/query` when signed in.
- Backend verifies via JWKS (`SUPABASE_JWKS` secret already configured).
