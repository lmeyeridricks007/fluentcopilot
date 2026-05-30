# Security, Privacy, and Compliance Plan

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document covers **GDPR**, **consent**, **retention**, **export/delete**, **permissions**, **auth and session security**, **secrets**, and **logging** so that the product is compliant and secure from Phase A and through launch.

---

## 2. Scope

- **In scope**: Consent model and storage; data export and deletion flows; retention implementation; auth and session security; secrets and PII handling; logging and audit.
- **Out of scope**: Certification (e.g. ISO); legal advice (document implements product decisions; legal review is separate).

---

## 3. Assumptions

- Users are primarily in EU/EEA; GDPR is the primary regulation.
- No payment card data stored (Stripe handles PCI); only subscription state and identifiers.
- Consent must be granular (e.g. analytics, marketing, microphone, location) and withdrawable.
- Data must be exportable and deletable within SLA (e.g. 30 days).

---

## 4. Consent Model

| Item | Implementation |
|------|----------------|
| **Storage** | consent table: user_id, purpose (e.g. analytics, marketing, microphone, location), granted_at, withdrawn_at |
| **Collection** | Onboarding and settings: explicit checkboxes; no pre-ticked for non-essential |
| **Withdrawal** | User can withdraw in settings; set withdrawn_at; stop processing for that purpose (e.g. stop marketing emails; optional anonymize analytics) |
| **Audit** | Retain consent history for dispute (e.g. 90 days after withdrawal); then purge or anonymize |
| **Legal basis** | Document in privacy policy: consent for optional; contract/legitimate interest where applicable |

Reference: BFR-009, BNFR-002; docs/final/business-requirements.md.

---

## 5. Data Export

| Step | Implementation |
|------|----------------|
| **Trigger** | User requests export (e.g. Settings → "Download my data") |
| **Scope** | Profile, consent history, progress summary, conversation summaries (no raw audio unless required by law); list of subscriptions (no payment details) |
| **Format** | JSON or CSV; machine-readable; include request date |
| **Delivery** | Async job; generate file; store in object storage with short TTL (e.g. 7 days); email user download link; require auth to download |
| **SLA** | Complete within 30 days (GDPR); target 7 days |
| **Log** | Log "export requested" and "export delivered"; no PII in logs |

Reference: BFR-008; data-and-content-implementation-plan (retention/deletion).

---

## 6. Data Deletion (Account Deletion)

| Step | Implementation |
|------|----------------|
| **Trigger** | User requests account deletion (e.g. Settings → "Delete account" with confirmation) |
| **Scope** | Hard delete or anonymize: users, profiles, consent, progress, gamification, conversation_sessions/turns, voice_sessions, pronunciation_results, reflection_entries, notification_preferences; usage and subscriptions: anonymize user_id or retain for legal (e.g. invoice id only) |
| **Order** | Respect FK; delete child then parent; or cascade |
| **Async** | Run in background job; notify user "deletion in progress" and "completed" (email if still valid) |
| **SLA** | Complete within 30 days (GDPR); target 72 hours |
| **Log** | Log "deletion requested" and "deletion completed"; no PII after deletion |
| **Backup** | Purge from backups within retention (e.g. 90 days) or document exception |

Reference: BFR-008; data-and-content-implementation-plan.

---

## 7. Retention

| Data | Retention | Implementation |
|------|-----------|----------------|
| **Account** | Until deletion | N/A |
| **Consent** | Until withdrawal + audit (e.g. 90 days) | Job to purge old withdrawn consent |
| **Conversation/voice** | Configurable (e.g. 90 days) | Job to delete old sessions/turns |
| **Pronunciation/audio** | Short (e.g. 30 days) | Lifecycle on object storage; delete DB refs |
| **Logs** | 30–90 days; no PII | Log rotation and deletion |
| **Subscriptions** | Legal (e.g. 7 years for tax); anonymize user after deletion | Retain invoice/subscription id; unlink user_id |

Reference: BR-4; data-model-pipelines; data-and-content-implementation-plan.

---

## 8. Auth and Session Security

| Item | Implementation |
|------|----------------|
| **HTTPS** | All environments in production; redirect HTTP → HTTPS |
| **Password** | Hash with bcrypt or argon2; never log or transmit plaintext |
| **Session** | HttpOnly, Secure, SameSite cookies; or JWT in memory with short expiry; refresh token in HttpOnly if used |
| **CSRF** | Token or SameSite for state-changing requests |
| **Rate limiting** | Login and signup: limit attempts per IP and per email; 429 and lockout after N failures |
| **Session invalidation** | On logout; optional: invalidate all sessions on password change |

---

## 9. Secrets and Config

| Item | Implementation |
|------|----------------|
| **No secrets in code** | All keys and secrets from env or vault |
| **Least privilege** | DB and Redis with limited user; API keys with minimal scope |
| **Logging** | Never log passwords, tokens, or API keys; redact in error messages |
| **Frontend** | Only client-safe ids (e.g. Stripe publishable key); no backend API keys in frontend |

Reference: docs/final/integrations/integration-security-secrets.md.

---

## 10. Permissions (RBAC / Entitlement)

| Item | Implementation |
|------|----------------|
| **User context** | Every request has user_id (and optionally entitlement); enforce in middleware or per-route |
| **Premium** | Check entitlement before premium endpoints (voice, scenario, unlimited lessons); 403 with reason if not entitled |
| **Consent** | For microphone/location: check consent before storing or using; 403 or 400 if missing |
| **Admin** | No broad admin role in Phase A–D; support via lookup by email/id if needed; no public admin API |

---

## 11. Logging and PII

| Rule | Implementation |
|------|----------------|
| **Structured logs** | JSON; request_id; level; message; no PII in message or custom fields |
| **Redaction** | Redact email, name, and free text in logs; log only ids and counts where needed |
| **Audit** | Log auth events (login, logout, signup); log export and deletion requests; retain for security review |
| **Errors** | Sentry or equivalent; attach request_id; no PII in error message to client (generic "Something went wrong") |

---

## 12. Dependencies

- **Data**: Consent and user tables; deletion and export jobs (data-and-content-implementation-plan).
- **Backend**: Auth middleware; entitlement checks; export/delete endpoints (backend-implementation-plan).
- **Frontend**: Consent UI; export/delete triggers in settings (frontend-implementation-plan).

---

## 13. Risks

- **Incomplete deletion**: One table or object store missed. Mitigation: Checklist of all tables and buckets; test full deletion in staging.
- **Export contains too much**: Include raw audio or third-party data. Mitigation: Define scope explicitly; review export output.
- **Consent not respected**: Marketing sent after withdrawal. Mitigation: Check consent before every send; audit preferences table.

---

## 14. Readiness and Done Criteria

- **Phase A**: Consent table and schema; no secrets in code; HTTPS in staging; auth rate limit.
- **Phase B**: Consent collected in onboarding; persisted; visible in settings.
- **Phase D**: Export and delete flows implemented and tested; retention jobs scheduled; logging and redaction verified; launch checklist includes privacy sign-off.
- **Phase E**: Review and document; no new requirement unless regulation changes.
