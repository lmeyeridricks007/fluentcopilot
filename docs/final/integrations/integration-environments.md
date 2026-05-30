# Integration Environments

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Defines **environments** (development, test, staging, production), **env var layout**, **sandbox vs live** credentials, and **isolation** for integrations.

---

## 2. Environments

| Environment | Purpose | Integration credentials |
|-------------|---------|-------------------------|
| **Development** | Local dev (engineer machine) | .env.local; use sandbox/test keys only (Stripe test, OpenAI test project, Azure test resource) |
| **Test / CI** | Automated tests | Injected env (e.g. GitHub Secrets); mocks preferred; if real, sandbox only |
| **Staging** | Pre-production; QA and E2E | Sandbox/test keys; Stripe test mode; separate PostHog/Sentry project; real Azure/OpenAI test projects |
| **Production** | Live users | Live keys (Stripe live, OpenAI/Anthropic prod, Azure prod); EU regions; vault or managed secrets |

---

## 3. Env Var Layout

- **Naming**: `INTEGRATION_<PROVIDER>_<NAME>` or `VITE_<NAME>` for client-safe (see integration-security-secrets.md).
- **Files**: `.env.example` with placeholder names (no values). `.env.local` (gitignored) for local. Staging/Prod: no files; use secret manager or platform env (e.g. Vercel, AWS).
- **Validation**: On startup, backend checks required vars (e.g. `INTEGRATION_OPENAI_API_KEY`); fail fast with clear message if missing. Optional: use schema (e.g. zod) for env object.

---

## 4. Sandbox and Test Accounts

| Provider | Sandbox / test | How to get |
|----------|----------------|------------|
| **Stripe** | Test mode | Same dashboard; toggle Test mode; use sk_test_, pk_test_, whsec_ (test webhook secret) |
| **OpenAI** | Separate project or org | New project in platform.openai.com; usage limits; do not use prod project in dev |
| **Anthropic** | Test project | Console; separate key for dev |
| **Azure Speech** | Separate resource | Azure Portal; create “dev” Speech resource in same region; key for dev only |
| **Resend/SendGrid** | Test mode / sandbox | Resend: test domain; SendGrid: sandbox mode (no real send) |
| **PostHog** | Separate project | Create “Development” project; different API key |
| **Sentry** | Separate project | Create “staging” project; different DSN |
| **LaunchDarkly** | Separate environment | LD has environments (dev, staging, prod); different SDK keys |

---

## 5. Isolation Rules

- **No production data in non-prod**: Do not send real user PII to sandbox providers (e.g. do not use prod user email in Stripe test). Use test emails and test user ids in staging.
- **Webhook URLs**: Staging backend has public URL (e.g. staging-api.example.com); configure Stripe webhook to staging URL with staging signing secret. Production webhook URL for production Stripe.
- **Database**: Separate DB per environment (dev can be local PostgreSQL; staging and prod separate instances). No shared DB between staging and prod.

---

## 6. Local Development Setup

1. Copy `.env.example` to `.env.local`.
2. Obtain sandbox keys (see above); fill `.env.local`. Do not commit.
3. Run backend; verify startup (no “missing env” error).
4. Optional: Stripe CLI for webhook forwarding (`stripe listen --forward-to localhost:3000/webhooks/stripe`).
5. Frontend: ensure `VITE_*` vars in `.env.local` for client (e.g. VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...). Restart dev server after env change.
6. Run integration tests (with mocks or sandbox) to verify connectivity.

---

## 7. Checklist for New Environment

- [ ] All required env vars set (see integration-security-secrets registry).
- [ ] Stripe: test vs live mode correct; webhook URL and secret match.
- [ ] LLM/Speech: test vs prod project/resource; EU region for prod.
- [ ] Analytics/Observability: separate project for non-prod.
- [ ] No prod secrets in CI or local.
