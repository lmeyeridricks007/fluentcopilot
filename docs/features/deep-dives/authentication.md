# Authentication — Deep-Dive Specification

## 1. Purpose

Authentication enables learners to create an account, sign in (email/password or social), maintain a secure session, and sign out. It is the foundation for all personalized features: profile, progress, entitlements, and activity tracking. This spec defines what the feature is, how it behaves, what it owns, and how it integrates with the rest of the system.

## 2. Core Concept

- **Identity**: A unique user account (email or linked social id) that the system can attribute actions and data to.
- **Session**: A time-bound, revocable proof of identity (session cookie or JWT) that the API uses to authorize requests.
- **No business logic**: Auth does not implement learning, entitlements, or profile; it only establishes *who* the user is. Authorization (what they can do) is handled by Entitlements and Profile/Consent.

## 3. Why This Feature Exists

- **Personalization**: Profile, progress, and recommendations require a stable identity.
- **Monetization**: Subscriptions and trials are tied to a user account.
- **Security and compliance**: Secure, revocable sessions and clear logout support GDPR and security expectations.

## 4. User / Business Problems Solved

- Users can create an account and return to the same progress and subscription.
- Business can attribute usage, conversion, and retention to a known user.
- System can enforce per-user rate limits, entitlements, and consent.

## 5. Scope

### 6. In Scope

- Sign-up (email + password; optional social OAuth).
- Login (email/password, social).
- Session management: create session on login, validate on each request, optional refresh.
- Logout: invalidate session/token; client clears storage.
- Password reset (request and complete flow).
- Integration with onboarding: after first sign-up, redirect to onboarding; after login, redirect to home or deep link.

### 7. Out of Scope

- Profile data (Onboarding & Profile).
- Entitlement checks (Entitlements & Subscription).
- MFA/2FA (future enhancement).
- Account deletion (handled in Settings/Data; invalidation of session is in scope).

## 8. Main User Personas

- **New learner**: Signs up via email or Google/Apple to start learning.
- **Returning learner**: Logs in to continue; may use “Remember me” or re-auth each visit.
- **Support/Legal**: Needs ability to invalidate sessions (e.g. logout all devices) for security or compliance.

## 9. Main User Journeys

| Journey | Steps |
|--------|--------|
| **Sign-up** | Landing → Sign up → Email/password or OAuth → Account created → Redirect to onboarding. |
| **Login** | App open (logged out) → Log in → Email/password or OAuth → Session created → Redirect to home (or last route). |
| **Logout** | Profile/Settings → Log out → Session invalidated → Redirect to login or landing. |
| **Password reset** | Login screen → “Forgot password” → Enter email → Receive link → Set new password → Redirect to login. |

## 10. Triggering Events / Inputs

- **Sign-up**: User submits sign-up form (email, password, optional accept terms). Or: user completes OAuth flow (provider redirect + callback).
- **Login**: User submits login form (email, password) or completes OAuth.
- **Request**: Every API request from the client (cookie or `Authorization: Bearer <token>`).
- **Logout**: User taps Log out; or admin/support revokes session.

## 11. States / Lifecycle

- **Anonymous**: No session; only public endpoints (e.g. marketing, login page) allowed.
- **Authenticated**: Valid session; `user_id` attached to request; full app access subject to entitlements.
- **Session expired**: Token/session no longer valid; client receives 401; client redirects to login.
- **Revoked**: Session explicitly invalidated (logout or admin); same as expired from client perspective.

**Lifecycle**: Sign-up/Login → Session created (stored in Redis or encoded in JWT) → Each request validated → Logout or expiry → Anonymous.

## 12. Business Rules

- **BR (implicit)**: Only authenticated users can access learner-specific data and premium flows.
- Session or JWT expiry: configurable (e.g. 7 days for “remember me”; 24h for strict).
- Passwords: hashed (e.g. bcrypt); never stored or logged in plain text.
- OAuth: trust provider’s identity; link to existing account by email if match, else create new.

## 13. Configuration Model

- **Session store**: Redis (EU) for session-based auth; or stateless JWT with secret and expiry.
- **JWT**: Issuer, audience, expiry, subject (`user_id`); optional refresh token with longer expiry.
- **OAuth**: Client ID/secret per provider (Google, Apple); redirect URIs; optional scopes (email, profile).
- **Password policy**: Min length, complexity (product decision); rate limit on failed attempts.

## 14. Data Model

- **users** (or equivalent): `id` (UUID), `email` (unique), `password_hash` (nullable if OAuth-only), `created_at`, `updated_at`. Optional: `email_verified_at`.
- **oauth_accounts** (if social): `user_id`, `provider`, `provider_user_id`, `created_at`.
- **sessions** (if server-side): `id`, `user_id`, `token_hash`, `expires_at`, `created_at`, `revoked_at`. Or: no table if JWT-only; revocation via blacklist in Redis.
- **password_reset_tokens** (optional): `user_id`, `token_hash`, `expires_at`; one-time use.

## 15. Read Model / Projection Needs

- No separate read model; “current user” is derived from session/JWT (`user_id`). Optional: cache `user_id` + `locale` + `entitlement_tier` on API layer for fast 403/redirect without hitting DB every time.

## 16. APIs / Contracts

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/v1/auth/signup` | Register with email/password | `{ "email", "password", "accept_terms"? }` | 201 + session/token; 400 validation; 409 email exists |
| POST | `/v1/auth/login` | Login email/password | `{ "email", "password" }` | 200 + session/token; 401 invalid |
| POST | `/v1/auth/logout` | Invalidate current session | — | 204 |
| POST | `/v1/auth/refresh` | Refresh JWT (if refresh token used) | `{ "refresh_token" }` or cookie | 200 + new tokens; 401 invalid |
| GET  | `/v1/auth/oauth/:provider` | Redirect to OAuth provider | — | 302 redirect |
| GET  | `/v1/auth/oauth/:provider/callback` | OAuth callback | Query: code, state | 302 to app + set session/token; or 400 error |
| POST | `/v1/auth/forgot-password` | Request reset email | `{ "email" }` | 202 accepted (always, for privacy) |
| POST | `/v1/auth/reset-password` | Set new password with token | `{ "token", "new_password" }` | 200 or 400 invalid/expired |

**Auth on requests**: Cookie `session_id` or header `Authorization: Bearer <access_token>`. Response 401 if missing or invalid.

## 17. Events / Async Flows

- **user_created**: Emit after sign-up (for analytics, welcome email, or onboarding trigger). Payload: `user_id`, `email`, `source: email|oauth`, `created_at`.
- **user_logged_in**: Optional analytics event.
- **user_logged_out**: Optional; for audit.
- No async dependency for core login flow; session creation is synchronous.

## 18. UI / UX Design

- **Sign-up**: Form with email, password, confirm password, terms checkbox. Optional: “Sign up with Google/Apple.” Clear validation errors; no pre-fill of password.
- **Login**: Email, password; “Remember me” checkbox; “Forgot password?” link. Social buttons if offered.
- **Logout**: In profile or settings; single tap; confirm optional. After logout: redirect to login or marketing.
- **Password reset**: Email input → “Email sent” message; reset link opens app or web page with token; new password form → success → redirect to login.
- **Session expired**: On 401, show “Session expired, please log in again” and redirect to login; preserve intended destination for post-login redirect.

## 19. Main Screens / Components

- **SignUpScreen**: Form, validation, submit, link to login.
- **LoginScreen**: Form, validation, submit, link to sign-up and forgot-password.
- **AuthGuard / RequireAuth**: Wraps protected routes; redirects to login if no valid session; shows loading while validating.
- **LogoutButton**: Trigger logout API and redirect.
- **OAuthButton**: Redirect to `/v1/auth/oauth/:provider` or open popup.

## 20. Permissions / Security Rules

- **Server**: Validate every protected route: session or JWT valid, not expired, not revoked. Attach `user_id` to context.
- **Client**: Store session cookie (httpOnly, secure, SameSite) or token in memory/secure storage; never log tokens.
- **HTTPS only**: All auth endpoints and API over TLS.
- **Rate limiting**: Stricter on login/sign-up/forgot-password (e.g. 5/min per IP) to prevent abuse.

## 21. Notifications / Alerts / Side Effects

- **Welcome email**: Optional; triggered by `user_created` (out of scope for auth module; integration point only).
- **Password reset email**: Sent by backend when processing forgot-password; link contains one-time token.
- **Session revoked**: If “Log out all devices” is implemented, invalidate all sessions for user; clients get 401 on next request.

## 22. Integrations / Dependencies

- **Profile / Onboarding**: After first sign-up, app redirects to onboarding; onboarding reads `user_id` from auth context.
- **Entitlements**: All premium endpoints check auth first, then entitlement (403 if not entitled).
- **OAuth providers**: Google, Apple (or others); redirect flow and callback; user creation or link by email.
- **Email provider**: For password reset and optional welcome email (Integrations doc).

## 23. Edge Cases / Failure Cases

- **Email already registered**: Sign-up returns 409; message “An account with this email already exists. Log in or reset password.”
- **Invalid credentials**: Login returns 401; generic message “Invalid email or password.”
- **OAuth callback with no email**: Provider may not return email; handle (e.g. prompt in-app or reject).
- **Token expired mid-request**: Return 401; client refreshes token if possible or redirects to login.
- **Redis/session store down**: If session-based, login and validation fail; return 503; client retry or show “Try again later.”
- **Password reset token expired**: Return 400; “Link expired. Request a new reset link.”

## 24. Non-Functional Requirements

- **Latency**: Login/sign-up response < 2s p95.
- **Availability**: Auth endpoints critical; same SLA as API (e.g. 99.5%).
- **Security**: Passwords hashed with industry-standard algorithm; secrets in env/vault; no PII in logs (log only `user_id` or request id).

## 25. Analytics / Auditability Requirements

- **Events**: `signup_completed`, `login_completed`, `logout`, `password_reset_requested`, `password_reset_completed`. Include `user_id` (or hashed), `source` (email/oauth), no password or token.
- **Audit**: Optional audit log for “session revoked by admin” or “logout all devices.”

## 26. Testing Requirements

- Unit: Password hashing, token generation/validation, expiry logic.
- Integration: Sign-up → 201 and session; login with wrong password → 401; logout → 401 on next request; JWT expiry → 401; OAuth callback with mock provider.
- E2E: Full sign-up, login, logout, password reset flow in UI.

## 27. Recommended Architecture

- **API layer**: Middleware that runs first: resolve session or JWT → set `req.userId` (and optionally `req.locale`). Protected routes require `req.userId`.
- **Auth service/module**: Sign-up (create user + session), login (validate credentials + session), logout (invalidate), refresh (issue new token), password reset (token generation + email trigger). OAuth: redirect URL builder + callback handler (create/link user + session).
- **Session store**: Redis in EU; key = session_id, value = user_id + metadata; TTL = session expiry. Or: stateless JWT + optional Redis blacklist for logout.

## 28. Recommended Technical Design

- **Stack**: Same as backend (e.g. Node/Express or equivalent). Use established libraries for JWT (sign/verify), OAuth (passport or provider SDKs), password hashing (bcrypt or argon2).
- **Cookie vs header**: For web, httpOnly cookie avoids XSS token theft; for mobile/native later, Bearer token in header. Support both if needed.
- **CORS**: Allow credentials for cookie-based auth; restrict origin to app domain(s).

## 29. Suggested Implementation Phasing

- **Phase 1**: Email/password sign-up, login, logout; session in Redis or JWT; auth middleware; redirect to onboarding after sign-up.
- **Phase 2**: Forgot password / reset; optional refresh token.
- **Phase 3**: OAuth (Google, Apple); account linking by email.
- **Phase 4**: Optional “Log out all devices”; audit events.

## 30. Summary

Authentication provides identity and session management for the AI Dutch Coach. It covers sign-up (email and OAuth), login, logout, and password reset. It does not implement profile, entitlements, or learning logic; it only establishes `user_id` for downstream modules. Sessions are stored in Redis (EU) or as JWT; all protected endpoints validate the session and attach `user_id` to the request context. Implementation should prioritize security (hashing, HTTPS, rate limiting) and clear 401 handling so the client can redirect to login or refresh the token.
