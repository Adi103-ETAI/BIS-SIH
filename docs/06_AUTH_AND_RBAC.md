# 06 — Authentication & RBAC Design

**Current state (from `FRONTEND_CODEBASE_ANALYSIS.md` §10):** authentication is **not implemented** — no login/signup pages, no tokens/sessions/guards/middleware; logout, 2FA log, password change, SSO hints are UI toasts with hardcoded data; the profile is a hardcoded mock (`BIS User`, `user@bis-chat.in`) and not persisted; roles are a static select consumed nowhere. **Any auth is greenfield on both ends.**
**Related:** [05 API Specification §5.1](./05_API_SPECIFICATION.md), [04 Database §4.1](./04_DATABASE_DESIGN.md), [17 Security](./17_SECURITY.md)

---

## 1. Requirements Recap

| Concern | Requirement |
|---|---|
| Identity | Email + password accounts for all users (MVP); profile server-side |
| Sessions | Browser SPA on same-origin proxy → cookie-based sessions |
| Authorization | RBAC, 7 roles, permission matrix, resource ownership |
| Abuse resistance | Rate limiting, brute-force lockout, CSRF protection |
| Recovery | Password reset via single-use tokens |
| Audit | Login/logout/failures/role changes audited ([16](./16_AUDIT_LOGGING.md)) |

## 2. Mechanism Options Considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Opaque server-side session in HttpOnly cookie** | Instant revocation; no token in JS-reachable storage; smallest trusted computing base; trivial CSRF model with double-submit; works with the existing same-origin proxy | Server-side lookup per request (cheap: indexed PK); horizontal scale needs shared store (Postgres/Redis — already present) | **CHOSEN for MVP** |
| JWT (stateless bearer) | No session lookup; good for multi-service | Cannot revoke before expiry without a denylist (→ stateful again); XSS risk if stored in JS; token sprawl for SPA; overkill for one service | Rejected for MVP; documented migration path §8 |
| OAuth 2.0 / OIDC (own IdP or provider) | Standard, SSO-ready | Heavy for prototype; needs IdP hosting + redirect flows; no requirement for federated identity yet | Future (OD-011) |
| External identity provider (e.g., government SSO) | Would match a future BIS-facing system | No verified BIS/government IdP available; inventing one violates RULE 3 | "TBD / requires verification" (OD-015) |

**Why cookies win here:** the frontend is a browser SPA talking through a same-origin Next.js proxy; HttpOnly+SameSite cookies eliminate token storage in JS, and session revocation (logout, password change, admin suspend) is immediate — which JWT cannot offer without extra state. The per-request session lookup is a primary-key read, acceptable at MVP scale (BE-NFR-004).

## 3. Authentication Design

### 3.1 Credentials
- Identifier: email (citext, unique). Passwords: **Argon2id** (memory 64 MB, iterations 3, parallelism 1 — tuned at implementation), rehashed on login when parameters change.
- Password policy: ≥ 10 chars; checked against a small common-password list; no composition rules (NIST SP 800-63B style). Never logged; only the hash is stored (`users.password_hash`).
- Registration: `POST /api/v1/auth/register` (05 §5.1) — no email verification in MVP (flagged OD-023); the field exists (`users.status`), verification is a post-MVP toggle.

### 3.2 Sessions (lifecycle)
- Token: 32+ random bytes (secrets module), base64url; **only the SHA-256 hash is stored** (`sessions.token_hash`).
- Cookie: `bis_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1209600`.
- TTL: 14 days sliding — activity extends `expires_at`; hard cap 30 days per session.
- Rotation: token regenerated on login; not rotated per request (documented trade-off; CSRF + HttpOnly mitigate).
- Revocation: logout (current), password change/reset (all others), admin suspend (all), `sessions.revoked_at`.
- Cleanup: daily worker deletes expired/revoked sessions older than 7 days.

### 3.3 Logout & recovery
- Logout: revoke + clear cookie (`POST /api/v1/auth/logout`, idempotent, audited). The frontend's current toast-only logout becomes real in Stage 4 (frontend change: call the API, then clear local history/vault per user choice).
- Password change: requires current password (05 §5.1). Password reset: request → always 202 (no enumeration) → single-use token (30 min TTL, hashed at rest) → confirm sets new hash + revokes sessions. Delivery via `MailAdapter`; email provider is an open decision (OD-022). Account recovery beyond password reset (lost email access): **out of scope MVP** — manual admin process.

### 3.4 CSRF
- Double-submit cookie: non-HttpOnly `bis_csrf` random value + `X-CSRF-Token` header must match `sessions.csrf_token_hash`; required on all non-GET `/api/v1/*` requests. SameSite=Lax is the second layer; origin check on state-changing requests is the third (17 §5).

### 3.5 Rate limiting & brute force
| Control | Rule |
|---|---|
| Login rate | 10/min/IP (`auth` class) |
| Brute force | 5 failed logins per account / 15 min → `423 AUTH_LOCKED` with progressive backoff (5→15→30 min); audited |
| Reset requests | 5/hour/email (silent 202 even when suppressed) |
| Session token space | 256-bit random; online guessing infeasible; no additional lockout needed |

## 4. Roles (CURRENT vs PLANNED)

**CURRENT (frontend):** a static, unpersisted `<select>` in `GeneralTab.tsx` offering Manufacturer/Laboratory/Regulator/Consumer/Researcher/Student — selection is not stored, not sent to any API, and not enforced anywhere. There is **no Admin** concept and no auth.

**PLANNED (backend RBAC):** `consumer`, `manufacturer`, `laboratory`, `regulator`, `researcher`, `student`, `admin` — registered at signup (user picks; changeable by admin only, audited `rbac.role_changed`). Role is stored on `users.role_code`; the roles/permissions/role_permissions tables (04 §4.1) are the enforcement source of truth, seeded by migration.

## 5. Authorization Model

- **RBAC check** at the API boundary (FastAPI dependency): resolves session → user → role → permission set; denies with `403 PERMISSION_DENIED` (or `401` when unauthenticated).
- **Resource ownership** checked in the service layer: conversations and applications are owner-scoped; foreign resources return `404` (existence hiding, 17 §3).
- **Admin access:** role `admin` grants `admin:*`; admin endpoints are a separate router with mandatory audit.
- **Regulator review:** role exists but has no review permission in MVP (`application:review` reserved); documented to avoid implying current functionality (RULE 2).

## 6. Permission Matrix

Legend: ✅ allowed, ➖ future (permission defined, not granted in MVP), ❌ denied. Permissions are codes in `permissions`; the matrix is seeded data (single source of truth).

| Permission | consumer | manufacturer | laboratory | regulator | researcher | student | admin |
|---|---|---|---|---|---|---|---|
| `search:query` (legacy + v1) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `conversation:manage` (own) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `service:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `form:schema:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `application:create` | ✅ (consumer services) | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| `application:update` (own) | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| `application:submit` (own) | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| `application:review` (others') | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ✅ (read-only via admin) |
| `assistance:request` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `knowledge:ingest` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `knowledge:publish` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `catalogue:manage` (services/forms) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `user:manage` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `audit:read` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

Notes: anonymous users may use legacy `/search` only while OD-012 = open; schema reads require a session (05 §5.6). `application:create` for consumer is scoped to consumer-category services at the service level (12 §4 `allowed_roles`).

## 7. Anonymous / Unauthenticated Access

- Legacy `POST /search` must keep working without a session (frozen contract).
- All `/api/v1/*` except auth endpoints, health, sources, and services-list/detail require a session (05 §2.3). The long-term policy (chat behind login?) is OD-012; the architecture supports either by toggling auth requirements on the search routes only.

## 8. Future Migration: JWT / OIDC

If/when a second client (mobile) or external IdP arrives: introduce OIDC via a configured provider, issue short-lived access JWTs + refresh-token rotation for that client, keep cookie sessions for the web SPA, and map IdP claims → `role_code`. No schema change is needed (sessions table already abstracts token storage); the auth dependency is the single seam.

## 9. Open Items

- Email verification at signup: recommended post-MVP toggle (OD-023).
- Email delivery provider (OD-022).
- Whether anonymous chat persists behind a login wall long-term (OD-012).
- Government/IdP integration: "TBD / requires verification" (OD-015).
