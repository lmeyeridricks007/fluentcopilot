# Data Model & Data Pipelines

## Document Info

| Attribute | Value |
|-----------|--------|
| Phase | 8 – Data Model & Data Pipelines |
| Status | **Final** |
| Source | data-model-pipelines-v1.md; audit passed |

---

## 1. Purpose and Scope

This document defines **data models**, **storage**, **retention**, and **pipelines** for the AI Dutch Coach platform so that personal data is handled in line with BNFR-001 (EU residency), BFR-008 (export/deletion), and BR-4 (retention). It supports Backend and Feature implementations.

**In scope**: Logical data model (entities and relationships), PostgreSQL and Redis usage, retention policies per data category, data export and deletion flows, pipelines (e.g. analytics, events).

**Out of scope**: Physical DDL (can be derived); external system schemas (Integrations doc).

---

## 2. Data Residency and Storage

- **PostgreSQL**: Primary persistent store; EU region (ARCH-003, BNFR-001). Tables: users, profiles, consent, lessons, progress, scenarios, conversations, voice_sessions, gamification, subscriptions, usage, reflections, content.
- **Redis**: Session, cache, queues; EU where possible. No long-term persistence of PII in Redis; TTL on session keys.
- **Object storage** (e.g. S3-compatible): Audio recordings, uploaded photos (reflection); EU region; lifecycle rules for retention (see §5).
- **CDN**: Static and media (lesson audio, images); reference by URL; no PII in paths.

---

## 3. Logical Data Model (Summary)

### 3.1 Core Entities

| Entity | Purpose | Key attributes (conceptual) |
|--------|---------|----------------------------|
| **users** | Account and auth | id, email, auth_provider, created_at |
| **profiles** | User profile (FD-01) | user_id, native_language, country, level, target_level, goal, occupation, family_status, ... |
| **consent** | Per-type consent (BFR-009) | user_id, type (microphone, location, notifications, photo, ai_context), granted_at, withdrawn_at |
| **lessons** | Lesson content (CEFR-tagged) | id, type, level, topic, content_ref, version |
| **progress** | Lesson/scenario completion | user_id, lesson_id or session_id, completed_at, score, state |
| **scenarios** | Scenario definitions | id, title, level, topic, prompt_config |
| **conversation_sessions** | Chat sessions | id, user_id, scenario_id, started_at, ended_at |
| **conversation_turns** | Messages | session_id, role (user/assistant), content, created_at |
| **voice_sessions** | Voice tutor sessions | id, user_id, started_at, ended_at, summary |
| **pronunciation_results** | Pronunciation feedback (IS-025) | session_id or turn_id, score, details, created_at |
| **gamification** | XP, streaks, achievements | user_id, xp, streak_count, last_activity_at; achievements table |
| **subscriptions** | Premium state | user_id, status, trial_ends_at, current_period_end, external_id (payment) |
| **usage** | Free-tier usage counts | user_id, period (day/week), lesson_count, scenario_count |
| **reflections** | Daily reflection entries (FD-07) | user_id, note, photo_ref, location_snapshot, created_at |
| **content** | Exam/listening content refs | id, type, level, exam_component, media_ref |

- **Relationships**: profiles 1:1 users; consent 1:N per user; progress N:1 lessons; conversation_turns N:1 conversation_sessions; etc. Full ER in implementation.

### 3.2 Locale and Multi-Language (BFR-006, BFR-007, IS-024)

- **profiles**: `locale` (BCP 47) for UI; `native_language`, `target_level` for content.
- **lessons / content**: `locale` or `language` for teaching language; version for future multi-language content.
- **User-facing content**: Tagged by locale for i18n (UI strings) and by teaching language (Dutch first).

---

## 4. Retention Policies (BR-4, BNFR-002)

| Data category | Retention | Deletion / Anonymization |
|---------------|-----------|---------------------------|
| **Account (users, profiles)** | Until account deletion | On delete: cascade or anonymize per BFR-008 |
| **Consent** | Until withdrawal + audit period (e.g. 90 days) | Soft delete or overwrite |
| **Progress, gamification** | Account lifetime | Deleted with account |
| **Conversation/voice sessions** | Configurable (e.g. 90 days for feedback history) | Purge after retention; or on account delete |
| **Pronunciation / audio** | Short (e.g. 30 days) for improvement; then delete | Lifecycle rule on object storage; DB refs purged |
| **Location** | Not persisted long-term (FD-08); only for trigger | No long-term store |
| **Reflections (notes, photo)** | Configurable (e.g. 90 days) | Purge; photo object storage lifecycle |
| **Subscriptions / payments** | Legal retention (e.g. 7 years for tax) | Anonymize or retain per legal; user identity removable |
| **Logs** | Short (e.g. 30–90 days); no PII | Rotate and delete |
| **Analytics (aggregate)** | Per product; no PII in events | N/A |

- **Export** (BFR-008): Provide user data export (profile, progress, consent history) in machine-readable format; exclude raw audio if not required by law. **Deletion**: Hard delete or anonymize all PII and related data; subscriptions may retain anonymized id for legal.

---

## 5. Data Pipelines and Events

### 5.1 Event Flow (Conceptual)

- **Application events**: Lesson completed, scenario ended, voice ended, trial started, payment success. Emit to internal bus or queue (e.g. Redis stream or message queue).
- **Consumers**: Gamification (award XP, update streak); Analytics (funnel, product metrics); optional Data Warehouse (aggregate only, no PII).
- **BFR-013**: Funnel events (trial_started, trial_ended, payment_success, churn) must be recorded and available for analytics.

### 5.2 Pipelines

- **ETL for analytics**: Backend writes events → queue → analytics consumer → aggregate tables or external analytics (no PII in external). **Data export job**: On user request, aggregate user data from PostgreSQL and optional object storage → generate package → deliver link or email (Operations).

---

## 6. Security and Compliance

- **Access**: Services use least-privilege DB credentials; no raw PII in logs. **Encryption**: At rest (PostgreSQL, Redis, object storage); in transit (TLS). **GDPR**: Retention and deletion as above; lawful basis and consent per Business doc.

---

## 7. Assumptions and Dependencies

- **Assumptions**: PostgreSQL and Redis are managed in EU; object storage supports lifecycle rules. **Dependencies**: Backend (usage of tables), Integrations (payment webhook payloads), Operations (export job, retention jobs).

---

## 8. Traceability

- BNFR-001 (EU residency): All persistent stores in EU. BFR-008 (export/deletion): Retention and deletion flows above. BR-4 (retention): Per-category retention. IS-025 (pronunciation): pronunciation_results persisted with defined schema. FD-*: Progress, sessions, usage, subscriptions align with Feature Domain.
