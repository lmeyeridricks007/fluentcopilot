# Authentication — Per-Feature Integration Specification

**Feature**: E-01 Authentication  
**Source**: docs/features/deep-dives/authentication.md; docs/final/feature-domain-breakdown.md (FD-01 references auth)

---

## 1. Purpose

Specifies **integrations used by the Authentication feature**: identity/auth provider (session/JWT + OAuth Google/Apple), email (verification, password reset), analytics, and observability. Enables sign-up, login, logout, reset, and optional social login.

---

## 2. Feature Reference

- **Epic**: E-01 Authentication. **Scope**: Sign-up (email/password), login, logout, password reset, optional OAuth (Google, Apple). Session or JWT; consent and profile linkage for downstream features.

---

## 3. Integrations Used (Summary)

| Integration | Role | Criticality |
|-------------|------|-------------|
| **Identity / Auth provider** | Session or JWT; OAuth code exchange and id_token verify; create/link user | Critical |
| **Email** | Verification email on signup; password reset link | High |
| **Cache (Redis)** | Session store (if server-side session); session invalidation on logout | High |
| **Analytics** | identify, alias (anonymous→user on login); optional login/signup events | High |
| **Observability** | Errors (Sentry); logs (request_id); health | High |

---

## 4. Per-Integration Detail

- **Identity**: Login/signup validate credentials or OAuth; create session (Redis) or sign JWT. Reset: token creation, email link, validate token, update password. See [identity-auth-provider.md](../../identity-auth-provider.md). **Local**: Redis + dev OAuth credentials or mock OAuth.
- **Email**: Send verification and reset links (async job preferred). See [email-provider.md](../../email-provider.md). **Local**: Mock adapter (log/capture).
- **Cache**: Session storage and TTL; DEL on logout. See [cache-session-store.md](../../cache-session-store.md). **Local**: Redis local.
- **Analytics**: alias(anonymous_id, user_id) on login; identify(user_id, traits). See [analytics-provider.md](../../analytics-provider.md). **Local**: Mock or disable.
- **Observability**: Capture auth errors; structured logs; no PII. See [observability-monitoring.md](../../observability-monitoring.md).

---

## 5. Implementation Implications

- **Backend**: Auth service (login, signup, forgotPassword, resetPassword, logout); OAuth routes (callback, exchange); SessionStore/Redis; EmailAdapter. **DB**: users, sessions (or stateless JWT), verification_tokens, password_reset_tokens. **UI**: Login, signup, forgot-password, reset-password pages; OAuth buttons. **Testing**: Mock OAuth and email; integration with Redis and test user; E2E login/logout.

---

## 6. Summary

Authentication uses **Identity** (session/JWT + OAuth), **Email** (verification, reset), **Cache** (session), **Analytics** (identify/alias), and **Observability**. Full detail in the referenced integration deep-dives.
