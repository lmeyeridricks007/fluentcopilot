# Email & Communication Integration

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Specifies **email** for verification, passwordless (optional), receipts, onboarding, reactivation, and consent/unsubscribe. Provider: Resend or SendGrid.

---

## 2. Why Needed

- Email verification (optional but recommended); password reset; subscription receipts (Stripe can send; we may send our own); onboarding welcome; reactivation (lapsed users); BFR-009 consent and unsubscribe.

---

## 3. Decision Status

| Item | Status |
|------|--------|
| Transactional email | **Required now** |
| Provider | **Required now** — Resend (recommended) or SendGrid |
| Verification | **Required now** (recommended) |
| Receipts | Stripe or our template via provider |
| Reactivation | **Required later** (Phase 2) |

---

## 4. Credentials

| Credential | Purpose | Where |
|------------|---------|--------|
| `INTEGRATION_RESEND_API_KEY` | Send email (Resend) | Backend only |
| Or `INTEGRATION_SENDGRID_API_KEY` | Send email (SendGrid) | Backend only |

**Resend**: From resend.com; API key with send permission. **SendGrid**: API key with Mail Send; restrict to our IP if possible.

---

## 5. Backend Responsibilities

- **Send**: POST to provider API (e.g. Resend `POST /emails` with from, to, subject, html). Use templates (e.g. verification link, reset link, welcome). Include **unsubscribe link** in marketing/reactivation emails (one-click unsubscribe; update preference in DB).
- **Verification**: Generate token (signed, expiry 24 h); link `https://app.example.com/verify?token=...`; on click, backend validates and marks email verified.
- **Rate limit**: Throttle per recipient (e.g. 5/hour) to avoid abuse and provider limits.
- **Bounce/complaint**: If provider supports webhooks (e.g. SendGrid events), handle bounce and complaint; mark email invalid or suppress.

---

## 6. Frontend

- No email credentials. Display “Verification email sent” or “Check your email for reset link.” Unsubscribe link in email points to our app (e.g. /settings/notifications?unsubscribe=token).

---

## 7. Privacy and Consent

- **Transactional** (verification, reset, receipt): Legitimate interest or contract. **Marketing/reactivation**: Consent; allow unsubscribe (BFR-009). Store preference in profile.

---

## 8. Failure and Retries

- Provider 5xx: Retry with backoff (e.g. 3 times). On failure, log and optionally queue for later. Do not block user flow (e.g. signup succeeds even if verification email fails; user can resend).

---

## 9. Testing

- Use provider test mode or sandbox; send to test address. Verify links (verification, reset, unsubscribe). Test bounce handling if webhook configured.
