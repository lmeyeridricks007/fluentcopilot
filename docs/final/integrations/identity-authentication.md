# Identity & Authentication Integration

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document specifies how **user identity and authentication** are implemented for the AI Language Coach: app authentication (email/password or passwordless), optional social login (Google, Apple), session/token architecture, linkage to premium entitlement, and device/session trust. It enables engineers to implement login, signup, logout, and session handling end-to-end.

---

## 2. Why This Integration Is Needed

- Users must **identify themselves** to access personalized lessons, progress, and premium features.
- **Entitlement** (free vs trial vs premium) is tied to user identity; Payments webhooks update subscription state by user/customer id.
- **Analytics** and **feature flags** need a stable user id (after login) for funnel and targeting.
- **Future**: Enterprise/school/partner access (SSO) is out of scope for Phase 1 but architecture should not block it.

---

## 3. Product Capabilities Supported

- FD-01: Onboarding and profile (after signup/login).
- FD-12: Entitlements (subscription state per user).
- All authenticated routes and API calls.
- Optional: anonymous-to-authenticated upgrade (e.g. browse as guest then sign up to save progress).

---

## 4. Decision Status

| Item | Status |
|------|--------|
| App authentication | **Required now** |
| Email/password | **Required now** |
| Passwordless (magic link) | **Optional now** (recommended later) |
| Social login (Google, Apple) | **Optional now** (recommended for Phase 1 for expat segment) |
| Anonymous-to-authenticated | **Optional now** (recommended later) |
| Enterprise SSO | **Rejected for Phase 1** |

---

## 5. Recommended Provider(s) and Architecture

- **No third-party auth-as-a-service required** for core flow: we implement **our own** session or JWT-based auth and store users in **our PostgreSQL**.
- **Optional**: **Google** and **Apple** as OAuth 2.0 / Sign in with Apple providers for social login. Our backend validates the token or exchanges the authorization code for tokens and creates/links the user in our DB.

**Chosen recommendation**: **Own backend auth** (session or JWT) + **optional Google and Apple OAuth** for social login. Rationale: full control over user record and entitlement linkage; no vendor lock-in; OAuth only for convenience.

---

## 6. High-Level Architecture

```mermaid
sequenceDiagram
  participant U as User
  participant C as Client (React)
  participant API as Backend API
  participant DB as PostgreSQL
  participant Google as Google OAuth

  alt Email/password signup
    U->>C: Sign up (email, password)
    C->>API: POST /v1/auth/signup
    API->>DB: Create user, hash password
    API->>API: Create session / issue JWT
    API->>C: Set-Cookie or return token
  end

  alt Google login
    U->>C: Click "Sign in with Google"
    C->>Google: Redirect to Google
    U->>Google: Authenticate
    Google->>C: Redirect with code
    C->>API: POST /v1/auth/oauth (provider=google, code=...)
    API->>Google: Exchange code for tokens, get profile
    API->>DB: Find or create user by google_id
    API->>API: Create session / issue JWT
    API->>C: Set-Cookie or return token
  end

  alt Authenticated request
    C->>API: Request with Cookie or Authorization: Bearer <token>
    API->>API: Verify session/JWT, load user_id
    API->>C: Response
  end
```

---

## 7. Frontend Responsibilities

- **Signup**: Collect email and password; call `POST /v1/auth/signup`; on success, store session (cookie) or token (memory/localStorage per security choice); redirect to onboarding or home.
- **Login**: Collect email and password; call `POST /v1/auth/login`; same as above.
- **Social login**: Redirect user to Google/Apple consent URL (using our backend-provided URL or client-side OAuth client ID for redirect only); on callback, send `code` (or `id_token`) to our backend `POST /v1/auth/oauth`; do **not** send Google/Apple tokens to any other server; receive our session/token and store.
- **Logout**: Call `POST /v1/auth/logout` (if backend invalidates session); clear local token/cookie.
- **Token storage**: If using JWT in frontend, store in memory (variable) or httpOnly cookie (preferred for XSS). If cookie, backend sets `Set-Cookie` with `HttpOnly`, `Secure`, `SameSite=Strict`.
- **Never**: Hold or send OAuth **client secret**; hold backend API keys; send password in query string or log.

---

## 8. Backend Responsibilities

- **User storage**: Table `users` (id, email, password_hash, created_at, etc.) and optionally `oauth_accounts` (user_id, provider, provider_user_id, access_token encrypted if needed for API calls).
- **Password**: Hash with **bcrypt** or **argon2**; never store plain text. Min length and complexity enforced (e.g. 8+ chars).
- **Session option**: Store session id in Redis or DB; cookie holds session id only; validate on each request; TTL e.g. 7 days with sliding expiry.
- **JWT option**: Sign with `JWT_SECRET`; include `sub` (user_id), `exp`, `iat`; short-lived access token (e.g. 15 min) + refresh token (longer, stored in DB/Redis and revocable) if using JWT.
- **OAuth**: For Google: exchange `code` for tokens via `https://oauth2.googleapis.com/token`; get profile from `https://www.googleapis.com/oauth2/v2/userinfo`. For Apple: verify `id_token` (JWT) and decode; get user identity. Create or link user; issue our session/JWT.
- **Entitlement linkage**: User id is foreign key in `subscriptions` / `entitlements`; no separate "identity provider" — our `users.id` is the source of truth for entitlement checks.
- **Rate limiting**: Throttle login/signup by IP and by email to prevent brute force and abuse.

---

## 9. Required Credentials / Keys / Secrets

| Credential | Purpose | Where used | Stored | Frontend-safe? |
|------------|---------|------------|--------|----------------|
| `SESSION_SECRET` | Sign session cookie (if session-based) | Backend | Env / vault | No |
| `JWT_SECRET` | Sign JWT (if JWT-based) | Backend | Env / vault | No |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth redirect and consent URL | Frontend (redirect URL) + Backend (token exchange) | Env | Yes (client ID is public) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Exchange code for tokens | Backend only | Env / vault | No |
| `APPLE_OAUTH_CLIENT_ID` | Apple Sign In (service ID) | Frontend + Backend | Env | Yes |
| `APPLE_OAUTH_CLIENT_SECRET` | Apple token verification (private key + JWT) | Backend only | Env / vault (or key file) | No |

**Google**: Create OAuth 2.0 credentials in Google Cloud Console. **Client ID** is safe for frontend (redirect). **Client secret** must stay on backend. Use redirect URI like `https://api.example.com/v1/auth/oauth/callback` for server-side exchange, or frontend redirect URI if using frontend-only flow and then sending token to backend.

**Apple**: Create Sign in with Apple in Apple Developer. Client ID (service ID), Team ID, Key ID, Private Key (.p8) and optionally Client Secret (JWT generated from private key). Private key and secret backend only.

---

## 10. Environment Variables

| Variable | Example | Required |
|----------|---------|----------|
| `SESSION_SECRET` | 64-char hex | If session-based |
| `JWT_SECRET` | 64-char hex | If JWT-based |
| `JWT_ACCESS_EXPIRY` | 15m | If JWT |
| `JWT_REFRESH_EXPIRY` | 7d | If JWT |
| `GOOGLE_OAUTH_CLIENT_ID` | xxx.apps.googleusercontent.com | If Google login |
| `GOOGLE_OAUTH_CLIENT_SECRET` | GOCSPX-... | If Google login |
| `GOOGLE_OAUTH_REDIRECT_URI` | https://api.example.com/v1/auth/oauth/callback | If Google |
| `APPLE_OAUTH_CLIENT_ID` | com.example.service | If Apple login |
| `APPLE_OAUTH_TEAM_ID` | XXXXX | If Apple |
| `APPLE_OAUTH_KEY_ID` | XXXXX | If Apple |
| `APPLE_OAUTH_PRIVATE_KEY` | -----BEGIN PRIVATE KEY-----... | If Apple (multiline in vault) |

Frontend build env (for redirect URLs only): `VITE_GOOGLE_OAUTH_CLIENT_ID`, `VITE_APPLE_OAUTH_CLIENT_ID` if client builds the consent URL.

---

## 11. Setup Checklist

1. **Database**: Create `users` table (id, email, password_hash, name, created_at, updated_at). Optionally `oauth_accounts` (user_id, provider, provider_user_id).
2. **Backend**: Implement POST /v1/auth/signup, POST /v1/auth/login, POST /v1/auth/logout. If OAuth: GET /v1/auth/oauth/redirect?provider=google (returns redirect URL) and POST /v1/auth/oauth/callback or GET callback that receives `code` and exchanges it.
3. **Google**: In Google Cloud Console, create OAuth 2.0 Client ID (Web application). Add authorized redirect URI (our backend callback). Copy Client ID and Client Secret to env.
4. **Apple**: In Apple Developer, create Sign in with Apple (Services ID), create Key for Sign in with Apple. Configure redirect and return URLs. Store Client ID, Team ID, Key ID, and .p8 private key.
5. **Frontend**: Signup/Login forms; call API; store session (cookie) or token; redirect. Social buttons link to backend redirect endpoint or client-side redirect with our client ID.
6. **Validation**: Test signup, login, logout; test Google/Apple flow in sandbox; verify session/JWT on protected route.

---

## 12. Request/Response Patterns

### POST /v1/auth/signup

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss1",
  "name": "Optional Display Name"
}
```

**Response 201:**
```json
{
  "user": {
    "id": "usr_xxx",
    "email": "user@example.com",
    "name": "Optional Display Name"
  },
  "session_token": "..." 
}
```
Or Set-Cookie: `session=...; HttpOnly; Secure; SameSite=Strict; Path=/`.

**Response 400:** Validation error (e.g. email invalid, password too weak).
**Response 409:** Email already registered.

### POST /v1/auth/login

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss1"
}
```

**Response 200:** Same as signup (user + session/token).
**Response 401:** Invalid credentials.

### POST /v1/auth/oauth (callback from frontend with code)

**Request:**
```json
{
  "provider": "google",
  "code": "4/0AeaYS...",
  "redirect_uri": "https://app.example.com/oauth/callback"
}
```

**Response 200:** user + session/token. (Backend exchanges code for tokens, gets profile, finds or creates user.)

---

## 13. Security Requirements

- **HTTPS only** in production for all auth endpoints.
- **Password**: Min length 8; hash with bcrypt (cost 10+) or argon2.
- **Rate limiting**: 5 failed logins per email per 15 min; 20 signup attempts per IP per hour (adjust as needed).
- **Cookie**: HttpOnly, Secure, SameSite=Strict; Path=/. If JWT in cookie, same.
- **CSRF**: If using cookie-based session, use CSRF token for state-changing requests or rely on SameSite and same-origin.
- **OAuth state**: Use `state` parameter in OAuth flow to prevent CSRF; verify state on callback.

---

## 14. Privacy / GDPR

- **Lawful basis**: Contract (account) and consent where applicable. Email and profile stored in our DB; we are data controller.
- **Retention**: User data retained until account deletion. On deletion (BFR-008), purge or anonymize user and related data.
- **OAuth**: We receive only what user consents to (e.g. email, name from Google). Do not request unnecessary scopes (e.g. only email and profile).

---

## 15. Failure Modes and Retries

- **DB down**: Login/signup returns 503; retry not applicable (user retries).
- **OAuth provider down**: Return 503 "Sign in with Google temporarily unavailable"; do not retry OAuth automatically in same request (user can retry).
- **Invalid/expired OAuth code**: Return 401; do not retry (user must restart flow).
- **Token refresh** (if JWT): If refresh token invalid/expired, return 401; client redirects to login.

---

## 16. Logging and Metrics

- **Log**: Login success/failure (no password); signup success; OAuth success/failure. Do not log passwords, tokens, or full OAuth codes.
- **Metrics**: login_attempts_total (by result: success, failure); signup_total; oauth_attempts_total (by provider and result).

---

## 17. Testing

- **Unit**: Password hash and verify; JWT sign and verify.
- **Integration**: Signup → login → protected route with session; OAuth mock (mock Google token endpoint) or use Google test users in sandbox.
- **Security**: Verify rate limiting; verify cookie flags; verify no password in logs.

---

## 18. Rollout

- Launch with email/password first; add Google/Apple when ready. Feature-flag social login if desired.
- Communicate to users that we store email and hashed password; link to privacy policy.

---

## 19. Risks and Open Questions

| Risk | Mitigation |
|------|------------|
| Credential stuffing | Rate limiting; consider CAPTCHA on login after N failures |
| OAuth token leakage | Never log tokens; use backend-only exchange |
| Session fixation | Regenerate session id on login |

**Open questions**: (1) JWT vs session (session simpler for revocation; JWT better for stateless scale). (2) Passwordless (magic link) as Phase 2. (3) Anonymous-to-authenticated: merge progress by device id or email claim.

---

## 20. Recommended Implementation Guidelines

- Prefer **session-based** auth with Redis/DB store for Phase 1 (simpler revocation and audit). Use **httpOnly cookie** for session id.
- Implement **refresh** only if using JWT (short-lived access + refresh token in DB).
- **Google OAuth**: Use authorization code flow; backend does code exchange. Redirect URI must be backend endpoint so client never sees refresh token.
- **Apple**: Return user identity only on first sign-in; store it for subsequent logins (Apple may not return email again). Handle "Hide My Email" if used.
- **Entitlement**: On every authenticated request, backend loads `user_id` from session/JWT; entitlement service checks subscription by `user_id`. No separate "identity provider" call for entitlement.
