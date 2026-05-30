# Launch Checklist

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **release readiness checklist** for production launch: functionality, performance, security, privacy, billing, operations, legal, and go/no-go. It is used at the end of Phase D to decide whether to launch.

---

## 2. Scope

- **In scope**: All checks required for first production launch; sign-off and go/no-go.
- **Out of scope**: Post-launch monitoring (see post-launch-stabilization-plan); Phase E scope.

---

## 3. Functionality

| # | Check | Verified by |
|---|--------|-------------|
| L1 | All Phase D exit criteria met (see delivery-phases.md) | Phase gate review |
| L2 | Critical paths: signup → onboarding → lesson → scenario → voice → subscription | E2E or manual |
| L3 | Free tier caps enforced; upsell shown when cap reached | E2E |
| L4 | Premium flow: trial start, payment, entitlement update, cancellation | E2E (test mode) |
| L5 | Notifications: verification and receipt emails send; preferences respected | Manual |
| L6 | No P0/P1 bugs open for launch scope | Bug tracker |
| L7 | Fallback and error states (LLM/speech timeout, 503) show user-friendly message | Manual |

---

## 4. Performance

| # | Check | Verified by |
|---|--------|-------------|
| L8 | Key pages LCP within target (e.g. < 2.5s on 4G-like) | Lighthouse or manual |
| L9 | API health and lesson load latency acceptable | Staging or prod test |
| L10 | Conversation and voice turn latency acceptable (or user sees loading state) | Manual |
| L11 | No critical N+1 or missing indexes on hot paths | Code/DB review |

---

## 5. Security and Privacy

| # | Check | Verified by |
|---|--------|-------------|
| L12 | No secrets in repo or frontend bundle | Audit; CI scan |
| L13 | HTTPS only; cookies Secure, HttpOnly, SameSite | Config review |
| L14 | Data export: user receives correct data; no PII of others | Manual test |
| L15 | Account deletion: all user data removed per checklist; no access after delete | Manual test; DB check |
| L16 | Consent: withdrawal stops processing (e.g. no marketing email); consent persisted | Manual test |
| L17 | Tenant isolation: user A cannot access user B data | API test |
| L18 | Rate limiting and auth on all protected endpoints | API test |

---

## 6. Billing

| # | Check | Verified by |
|---|--------|-------------|
| L19 | Stripe webhook verified and idempotent; subscription state correct after events | Replay test |
| L20 | Checkout and return URL work in production (or test live mode) | Manual |
| L21 | Entitlement reflects subscription and trial; free cap enforced | E2E |
| L22 | At least one successful test purchase and one cancellation in prod-like env | Manual |
| L23 | Customer portal link works (manage subscription) | Manual |

---

## 7. Operations

| # | Check | Verified by |
|---|--------|-------------|
| L24 | Production env provisioned; secrets in vault; deploy pipeline works | DevOps |
| L25 | Monitoring and alerting on (errors, latency, health) | Dashboard check |
| L26 | Runbook for top 3 failure modes (e.g. API down, Stripe webhook fail, DB connection) | Doc review |
| L27 | Rollback and hotfix process documented and tested once | DevOps |
| L28 | On-call or escalation path defined | Ops/Product |
| L29 | Log retention and PII redaction verified | Config review |

---

## 8. Legal and Communication

| # | Check | Verified by |
|---|--------|-------------|
| L30 | Privacy policy and Terms live and linked (e.g. in footer or signup) | Manual |
| L31 | Cookie banner or consent banner if required (e.g. EU) | Manual |
| L32 | Launch communication (waitlist, stakeholders) ready; support channel and owner set | Product |

---

## 9. Go/No-Go

| # | Check | Verified by |
|---|--------|-------------|
| L33 | Go/no-go meeting held; checklist reviewed | Product/Tech/Stakeholder |
| L34 | Decision (Go / No-Go / Conditional) documented with date and sign-off | Meeting notes |
| L35 | If Go: launch date and time confirmed; monitoring and support ready | Product |
| L36 | If No-Go: blocking items listed; next review date set | Product |

---

## 10. Sign-Off

| Role | Responsibility |
|------|-----------------|
| **Product** | Scope and launch criteria; communication and support |
| **Tech lead** | Functionality, performance, security, and ops |
| **QA** | Test coverage and sign-off on critical paths and billing |
| **Stakeholder** | Final go/no-go and launch approval |

Document sign-off and date. Keep this checklist in version control and update for future launches (e.g. add product-specific items).

---

## 11. When This Becomes Relevant

- **Phase D**: Complete this checklist before launch.
- **Releases after launch**: Adapt for hotfix or feature release (subset of items).
- **Audit**: External or compliance audit may request evidence of launch checklist completion.
