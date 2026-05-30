# Integration Security and Secrets

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **secret taxonomy**, **naming conventions**, **storage**, **rotation**, and **least-privilege** rules for all integrations. It ensures no secret is misplaced (e.g. in frontend bundle or logs) and that engineers know exactly which credentials are needed and where they live.

---

## 2. Secret Taxonomy

| Category | Description | Example | Who can access |
|----------|-------------|---------|----------------|
| **Backend API keys** | Keys used only by backend to call external APIs | OpenAI API key, Stripe secret key | Backend runtime only |
| **Webhook secrets** | Used to verify incoming webhooks | Stripe webhook signing secret | Backend runtime only |
| **Session / JWT secrets** | Used to sign/verify our own tokens | `SESSION_SECRET`, `JWT_SECRET` | Backend only |
| **OAuth client secrets** | Server-side OAuth flow | Google OAuth client secret | Backend only |
| **Database / cache credentials** | DB password, Redis URL | `DATABASE_URL`, `REDIS_URL` | Backend only |
| **Client-safe identifiers** | Designed for client exposure by provider | Sentry DSN, PostHog API key (write-only), VAPID public key, Feature flag client key | Backend (inject at build or runtime) and/or frontend |
| **Storage credentials** | S3/Blob access key or connection string | `MEDIA_STORAGE_CONNECTION_STRING` | Backend only |

**Rule**: If a credential can **charge money**, **access user data**, or **impersonate the server**, it is **never** sent to the frontend. Only credentials explicitly documented as "client-safe" by the provider may appear in client-accessible config.

---

## 3. Naming Conventions

### 3.1 Environment Variable Pattern

- **Prefix**: `INTEGRATION_` or provider-specific prefix for clarity.
- **Format**: `INTEGRATION_<PROVIDER>_<PURPOSE>` or `<PROVIDER>_<PURPOSE>`.
- **Case**: UPPER_SNAKE_CASE.
- **Boolean**: Use `true`/`false` or `1`/`0`; avoid ambiguous strings.

### 3.2 Registry (Examples)

| Variable | Purpose | Backend/Frontend | Required envs |
|----------|---------|------------------|---------------|
| `SESSION_SECRET` | Sign session cookie | Backend | All |
| `JWT_SECRET` | Sign JWT if used | Backend | All |
| `INTEGRATION_OPENAI_API_KEY` | OpenAI API calls | Backend | All |
| `INTEGRATION_ANTHROPIC_API_KEY` | Anthropic fallback | Backend | All |
| `INTEGRATION_AZURE_SPEECH_KEY` | Azure Speech STT/TTS | Backend | All |
| `INTEGRATION_AZURE_SPEECH_REGION` | Azure region | Backend | All |
| `INTEGRATION_ELEVENLABS_API_KEY` | ElevenLabs TTS (optional) | Backend | If using ElevenLabs |
| `INTEGRATION_STRIPE_SECRET_KEY` | Stripe API | Backend | All |
| `INTEGRATION_STRIPE_WEBHOOK_SECRET` | Verify Stripe webhooks | Backend | All |
| `INTEGRATION_STRIPE_PUBLISHABLE_KEY` | Stripe Checkout (can be frontend) | Frontend (build) | All |
| `INTEGRATION_RESEND_API_KEY` | Resend email | Backend | All |
| `INTEGRATION_MEDIA_STORAGE_CONNECTION_STRING` | S3/Blob | Backend | All |
| `INTEGRATION_POSTHOG_API_KEY` | PostHog (write events) | Frontend + Backend | All |
| `INTEGRATION_POSTHOG_HOST` | PostHog host (EU) | Frontend | All |
| `INTEGRATION_SENTRY_DSN` | Sentry (errors) | Frontend + Backend | All |
| `INTEGRATION_LAUNCHDARKLY_SDK_KEY_CLIENT` | Feature flags client | Frontend (build) | All |
| `INTEGRATION_LAUNCHDARKLY_SDK_KEY_SERVER` | Feature flags server | Backend | All |
| `VAPID_PUBLIC_KEY` | Web Push subscribe | Frontend (build) | If push enabled |
| `VAPID_PRIVATE_KEY` | Web Push send | Backend | If push enabled |
| `GOOGLE_OAUTH_CLIENT_ID` | Google login (redirect) | Frontend (build) | If Google login |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google token exchange | Backend | If Google login |
| `APPLE_OAUTH_CLIENT_ID` | Apple login | Frontend (build) | If Apple login |
| `APPLE_OAUTH_CLIENT_SECRET` | Apple token exchange | Backend | If Apple login |
| `DATABASE_URL` | PostgreSQL | Backend | All |
| `REDIS_URL` | Redis | Backend | All |

---

## 4. Where Secrets Are Stored

| Environment | Storage mechanism | Notes |
|-------------|-------------------|--------|
| **Local dev** | `.env.local` (gitignored) or `.env.development.local` | Never commit. Provide `.env.example` with placeholder names and no real values. |
| **CI / Test** | CI secret store (e.g. GitHub Secrets); inject as env | Use test/sandbox keys only. |
| **Staging** | Cloud secret manager or env config (e.g. AWS SSM, Vault) | Prefer vault; rotate same as prod policy. |
| **Production** | Secret manager (e.g. AWS Secrets Manager, Azure Key Vault, Vault) | Backend fetches at startup or on demand; never in image or repo. |

**Frontend**: Client-safe values (Sentry DSN, PostHog key, Stripe publishable key, VAPID public key, feature flag client key, OAuth client IDs) are **injected at build time** via env vars (e.g. Vite `import.meta.env.VITE_SENTRY_DSN`). Only `VITE_*` (or equivalent) vars are exposed to the client bundle; never put backend secrets in a `VITE_` var.

---

## 5. Rotation Policy

| Secret type | Rotation frequency | Procedure |
|-------------|--------------------|----------|
| **Provider API keys** | Per provider policy (e.g. 90 days) or on compromise | Generate new key in provider dashboard; add new env; deploy; remove old key. |
| **Webhook secrets** | When rotating or recreating webhook endpoint | New secret in provider; update env; redeploy. Old events may fail until cutover. |
| **SESSION_SECRET / JWT_SECRET** | Quarterly or on compromise | Rotate invalidates existing sessions; plan for user re-login or graceful refresh. |
| **OAuth client secrets** | Per provider (e.g. Google) or on compromise | Update in provider and env. |
| **Database/cache** | On compromise or infra change | Standard credential rotation; may require app restart. |
| **Client-safe keys** | Per provider (e.g. Sentry DSN rarely) | No session impact; update build env and redeploy. |

**Audit**: Log when secrets are read from vault (without logging the secret value). Restrict vault access to deployment pipeline and ops; developers get local dev keys only (sandbox).

---

## 6. Least Privilege

- **OpenAI/Anthropic**: Use API key scoped to project/billing if provider supports; avoid org-wide keys in production.
- **Stripe**: Use restricted API keys if possible (e.g. only needed permissions: customers, subscriptions, webhooks). Never use root key in code.
- **Azure Speech**: Use key scoped to Speech resource only.
- **Storage**: Use credentials with minimal permissions: write/read for app bucket only; no delete if not required; lifecycle via IAM.
- **Database**: Application user has only required tables and operations (no DROP, no superuser).

---

## 7. Webhook Signing Verification

- **Stripe**: Header `Stripe-Signature` contains signature and timestamp. Verify using `INTEGRATION_STRIPE_WEBHOOK_SECRET` and library (e.g. `stripe.webhooks.constructEvent`). Reject if signature invalid or timestamp too old (e.g. > 5 min).
- **Others**: If provider supplies webhook secret, verify before processing. Never process unverified webhooks for payment or entitlement changes.

---

## 8. Frontend-Exposed vs Server-Only

| Value | Safe in frontend? | How exposed |
|-------|-------------------|-------------|
| Sentry DSN | Yes (by design) | Build-time env `VITE_SENTRY_DSN` |
| PostHog API key / host | Yes (write-only, per PostHog) | Build-time `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` |
| Stripe publishable key | Yes | Build-time `VITE_STRIPE_PUBLISHABLE_KEY` |
| VAPID public key | Yes | Build-time `VITE_VAPID_PUBLIC_KEY` |
| LaunchDarkly client SDK key | Yes | Build-time `VITE_LAUNCHDARKLY_CLIENT_ID` |
| Google/Apple OAuth client ID | Yes (public identifier) | Build-time | 
| Google/Apple OAuth client **secret** | **No** | Backend only |
| Any provider **secret** or **API key** (OpenAI, Stripe secret, etc.) | **No** | Backend env only |

---

## 9. Example .env.example (Skeleton)

```bash
# App
SESSION_SECRET=          # 32+ bytes random
JWT_SECRET=              # 32+ bytes random (if using JWT)

# Identity (optional OAuth)
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
APPLE_OAUTH_CLIENT_ID=
APPLE_OAUTH_CLIENT_SECRET=

# AI
INTEGRATION_OPENAI_API_KEY=
INTEGRATION_ANTHROPIC_API_KEY=

# Speech
INTEGRATION_AZURE_SPEECH_KEY=
INTEGRATION_AZURE_SPEECH_REGION=westeurope

# Payments
INTEGRATION_STRIPE_SECRET_KEY=sk_test_... or sk_live_...
INTEGRATION_STRIPE_WEBHOOK_SECRET=whsec_...

# Email
INTEGRATION_RESEND_API_KEY=

# Media
INTEGRATION_MEDIA_STORAGE_CONNECTION_STRING=

# Analytics (backend may use same or server key)
INTEGRATION_POSTHOG_API_KEY=phc_...

# Observability
INTEGRATION_SENTRY_DSN=https://...@sentry.io/...

# Feature flags
INTEGRATION_LAUNCHDARKLY_SDK_KEY_SERVER=sdk-...

# Push (if enabled)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# Data
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

**Frontend build env (Vite)** — only these are prefixed for client:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_POSTHOG_KEY=phc_...
VITE_POSTHOG_HOST=https://eu.posthog.com
VITE_LAUNCHDARKLY_CLIENT_ID=...
VITE_VAPID_PUBLIC_KEY=...
VITE_GOOGLE_OAUTH_CLIENT_ID=...
VITE_APPLE_OAUTH_CLIENT_ID=...
```

---

## 10. Audit and Access Controls

- **Access**: Only deployment pipeline and designated ops roles can read production secrets from vault. Developers get sandbox/test keys for local dev.
- **Audit**: Enable audit logging on secret manager (who read what, when). No logging of secret values.
- **Incident**: On suspected leak, rotate affected secrets immediately; revoke old keys in provider dashboard; notify per security policy.
