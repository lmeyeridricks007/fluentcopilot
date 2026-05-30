# Identity / Auth Provider — Integration Deep-Dive

**Integration**: Strategy (backend session/JWT + OAuth Google, Apple).  
**Version**: 1  
**Status**: Implementation-grade

---

## 1. Purpose

Specify **authentication and identity** for the AI Dutch Coach: sign-up, login (email/password and OAuth), session or JWT, logout, password reset, and optional account linking. Enables all authenticated flows and entitlement linkage (user_id).

---

## 2. Core Concept

- **Our backend** is the identity authority: we store credentials (hashed) or rely on OAuth provider for social login; we issue session or JWT. **OAuth** (Google, Apple) used for “Sign in with Google/Apple”; we receive id_token or code, verify, and create/link our user.
- **Source of truth**: Our users table and session store (or JWT payload); OAuth provider is source of identity for social users until linked to our account.

---

## 3. Why This Integration Exists

- **Access control**: All personalized features require a known user_id (profile, progress, entitlements, scenarios).
- **Entitlement linkage**: Subscription and trial are tied to user_id; payment webhooks and our DB use same id.
- **Compliance**: Login, consent, and account deletion (BFR-008) depend on identity.

---

## 4. Business Capabilities Enabled

- **Sign-up / Login**: Email+password or Google/Apple; create or match user; issue session or JWT.
- **Logout**: Invalidate session or token.
- **Password reset**: Request reset link via email; validate token; set new password.
- **Account linking**: Optional link Google/Apple to existing email account.

---

## 5. Scope

### 6. In Scope

- Session-based or JWT auth; cookie (httpOnly, secure) or Authorization header.
- Email/password sign-up and login; password hash (bcrypt/argon2); verification email.
- OAuth: Google and Apple (redirect or native); verify id_token/code; create or link user.
- Password reset: token generation, email send, token validation, password update.
- Logout: invalidate session (Redis) or client discard JWT (stateless); optional token blacklist.
- Local dev: mock OAuth (fixed test user) or real dev credentials; session store in Redis or memory.

### 7. Out of Scope

- Enterprise SSO/SAML (Phase 2). Social beyond Google/Apple. MFA (future).

---

## 8. Triggering Flows / Usage Points

| Trigger | Flow |
|---------|------|
| POST /login | Validate credentials → create session or issue JWT → set cookie or return token. |
| POST /signup | Create user (email, hashed password) → send verification email → return session/JWT or require verify first. |
| GET /auth/google (or /auth/google/callback) | Redirect to Google → user consents → callback with code → exchange for id_token → verify → create/link user → session/JWT. |
| POST /forgot-password | Create reset token → send email → return 200. POST /reset-password (token, new password) → validate token → update password. |
| POST /logout | Invalidate session in Redis or add JWT to blacklist; clear cookie. |

---

## 9. Inputs

- **Login**: email, password. **Signup**: name, email, password (and optional profile fields). **OAuth**: code or id_token from provider. **Reset**: email (forgot); token + new_password (reset).

---

## 10. Outputs

- **Login/Signup success**: Set-Cookie (session) or { token, user }. **Failure**: 401 invalid credentials; 400 validation. **OAuth**: Redirect to app with session/token. **Reset**: 200 “check your email”; reset form success → 200.

---

## 11. Data Domains Involved

- **users**: id, email, name, password_hash, google_id, apple_id, email_verified_at, created_at, updated_at.
- **sessions**: session_id, user_id, expires_at (if server-side). **password_reset_tokens**: token_hash, user_id, expires_at. **verification_tokens**: same pattern.

---

## 12. Source of Truth Rules

- **Our DB**: Users and sessions are source of truth. OAuth provider id (google_id, apple_id) stored for linking; we do not store provider tokens long-term (only for initial verify).

---

## 13. Authentication Model

- **Our API**: Session cookie (signed, httpOnly, secure) or Bearer JWT. Session: validate against Redis/DB. JWT: verify signature (secret or JWKS); check expiry; optional blacklist.
- **OAuth**: Client redirects to Google/Apple; we use client_id and client_secret (backend) to exchange code for id_token; verify id_token (signature, audience, expiry); extract sub and email.

---

## 14. Authorization / Consent Model

- **OAuth**: User consents at provider (Google/Apple). Our app scope: email, profile. Consent for data use covered by our terms.
- **Password**: User sets password on signup; reset requires access to email.

---

## 15. Configuration Model

| Key | Type | Description |
|-----|------|-------------|
| SESSION_SECRET or JWT_SECRET | string | Signing secret (session cookie or JWT) |
| GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET | string | OAuth |
| APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY | string | Apple Sign In |
| SESSION_TTL_SECONDS | number | Session lifetime |
| REDIS_URL | string | Session store (if session-based) |

---

## 16. Environment Strategy

| Env | Setup |
|-----|--------|
| **Local** | Redis local or in-memory session; OAuth: use dev credentials (Google Cloud Console, Apple Developer) with redirect_uri http://localhost:PORT/callback, or mock OAuth returning fixed user. |
| **Staging** | Same as prod but test OAuth apps (redirect_uri staging URL). |
| **Production** | Redis (EU); production OAuth apps; HTTPS redirect_uri. |

---

## 17. Data Flow Design

- **Login**: Validate password (hash compare) → create session (store in Redis) or sign JWT → set cookie or return token. Attach user_id to request context.
- **OAuth**: Callback receives code → backend exchanges for id_token → verify → find user by google_id/apple_id or email → create user if new → session/JWT.
- **Reset**: Generate token (random, store hash + expiry) → email link → user clicks → validate token → show form → update password → invalidate token.

---

## 18. Sync / Polling / Webhook Design

- **Sync**: Login, signup, OAuth callback, reset are request/response. No webhooks from identity providers for basic flows (Google/Apple do not push user changes for our scope).

---

## 19. Failure Handling

| Failure | Handling |
|---------|----------|
| Invalid credentials | 401; do not reveal “email not found” vs “wrong password” (timing-safe). |
| OAuth verify fail | 401; log; redirect to login with error. |
| Expired reset token | 400 “Link expired”; prompt request again. |
| Session store down | 503; do not create session; ask retry. |

---

## 20. Retry Strategy

- No automatic retry for auth failures (security). OAuth token exchange: one retry on 5xx.

---

## 21. Rate Limiting / Quota Considerations

- **Login/Signup**: Rate limit by IP (e.g. 10/min) and per email (e.g. 5/min) to prevent brute force and abuse.
- **OAuth**: Provider rate limits; our callback: rate limit per IP.

---

## 22. Security / Compliance Requirements

- **Secrets**: JWT_SECRET, OAuth client secrets in env/vault. Never in client.
- **Password**: Hash with bcrypt/argon2; never log or return. Reset token: one-time, short TTL (1h).
- **Cookie**: httpOnly, secure, SameSite=Lax or Strict. **GDPR**: Account deletion (BFR-008); export (BFR-008); consent records.

---

## 23. Auditability / Logging Requirements

- Log: Login success/fail (user_id or email hash, no password); OAuth success/fail; reset requested. Do not log tokens or passwords.

---

## 24. Observability / Monitoring

- **Metrics**: Login/signup rate; OAuth success/fail; reset request rate; session creation. **Alerts**: Spike in 401; OAuth failure rate.

---

## 25. UI / UX Implications

- **Login/Signup**: Clear validation errors; “Sign in with Google/Apple” buttons; link to reset. **Post-login**: Redirect to onboarding or home. **Reset**: “Check your email” same message for any email (no enumeration).

---

## 26. Admin / Operations Implications

- **User lookup**: Support may look up user by email (no password). **Force logout**: Invalidate all sessions for user_id (clear Redis keys or blacklist JWTs).

---

## 27. API / Adapter Design

- **Endpoints**: POST /login, POST /signup, GET/POST /auth/google, GET/POST /auth/apple (or callback), POST /forgot-password, POST /reset-password, POST /logout. **Adapter**: OAuthClient (Google, Apple) with getToken(code), verifyIdToken(token); AuthService with login, signup, createSession, invalidateSession.

---

## 28. Event / Async Flow Design

- **Verification email**: Enqueue send (see email-provider). **Sync**: Login and session creation are sync.

---

## 29. Data Persistence Requirements

- **users**: id, email, name, password_hash, google_id, apple_id, email_verified_at, created_at, updated_at.
- **sessions**: session_id, user_id, expires_at (Redis or DB). **password_reset_tokens**, **verification_tokens**: token_hash, user_id, expires_at.

---

## 30. Local Development Setup

- **Session**: Redis on localhost or in-memory store. **OAuth**: Create Google/Apple dev apps; set redirect_uri http://localhost:3000/auth/google/callback; use client secret in .env.local. Or **mock**: /auth/google returns fixed test user and session (no real provider).
- **Env**: SESSION_SECRET, REDIS_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (and Apple if used). Optional AUTH_MOCK=true for mock OAuth.

---

## 31. Testing Requirements

- **Unit**: Password hash/verify; JWT sign/verify; OAuth token verify (mock). **Integration**: Login with test user; signup then login; OAuth callback with mocked id_token; reset flow with mock email. **E2E**: Full login and logout in browser.

---

## 32. Rollout / Feature Flag Strategy

- **Feature flag**: “oauth_google_enabled”, “oauth_apple_enabled” to enable per platform. “email_verification_required” to gate access until verified.

---

## 33. Example Scenarios

**Email login**: POST /login { email, password } → validate → session created → Set-Cookie → 200 { user }. **Google**: User clicks “Sign in with Google” → redirect → callback with code → backend exchanges → verify → find/create user → session → redirect to app.

---

## 34. Edge Cases

- **Email already exists (signup)**: Return 400 “Email already registered” or offer “Sign in” link. **OAuth email matches existing email account**: Link provider to existing user (or require login to link). **Concurrent sessions**: Allow multiple; logout can be “this device” or “all devices” (invalidate all for user_id).

---

## 35. Recommended Technical Design

- **AuthService**: login, signup, forgotPassword, resetPassword, logout; uses UserRepository, SessionStore, EmailAdapter (for verification/reset). **OAuth**: Dedicated routes; exchange code; verify; UserRepository.findOrCreateByOAuth; then create session. **Middleware**: RequireAuth reads session/JWT; attaches user_id to context.

---

## 36. Suggested Implementation Phasing

- **Phase 1**: Email/password signup and login; session (Redis); password reset; verification email (optional). **Phase 2**: Google OAuth; Apple if required. **Phase 3**: Account linking; MFA if needed.

---

## 37. Summary

**Identity** is **strategy-based**: our backend is the authority; **OAuth** (Google, Apple) for social login. Session or JWT; Redis for session store. **Local dev**: Redis + dev OAuth credentials or mock OAuth. Rate limiting, secure cookies, no logging of secrets. Required for all authenticated and entitlement-linked flows.
