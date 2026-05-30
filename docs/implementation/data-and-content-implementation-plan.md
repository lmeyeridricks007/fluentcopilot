# Data and Content Implementation Plan

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document covers **data model implementation sequencing**, **migrations**, **seed/reference data**, **authored vs AI-generated content**, **lesson metadata**, **user profile and progress models**, **speech result storage**, **analytics event taxonomy support**, **retention/deletion support**, **localization and multi-language readiness**, and **exam content / content operations**.

---

## 2. Scope

- **In scope**: Order of schema and migration implementation; seed data strategy; content model for lessons and exam; retention and deletion implementation; support for analytics and GDPR.
- **Out of scope**: Detailed DDL (can be in repo as migration files); CMS product choice (Phase E); analytics warehouse schema (only event taxonomy support in app DB).

---

## 3. Assumptions

- PostgreSQL as primary store; Redis for session and cache (see backend plan).
- Migrations are linear and reversible where possible (rollback script or forward-only with care).
- Lesson content for Phase B is seed data in DB; no CMS until Phase E if needed.
- EU region; retention and deletion must align with GDPR and BR-4.

---

## 4. Initial Data Model Implementation Sequencing

| Order | Area | Tables / entities | Phase | Dependency |
|-------|------|-------------------|-------|------------|
| 1 | Auth & profile | users, profiles, consent | A | — |
| 2 | Lessons (metadata) | lessons, lesson_steps or content JSON | B | A |
| 3 | Progress & gamification | progress_events or lesson_completions, gamification (user_xp, streaks) | B | 1, 2 |
| 4 | Scenarios & conversations | scenarios, conversation_sessions, conversation_turns | C | 1 |
| 5 | Voice & pronunciation | voice_sessions, pronunciation_results; optional audio_refs | C | 1 |
| 6 | Listening | listening_exercises, listening_attempts or answers | C | 2 |
| 7 | Subscriptions & usage | subscriptions, usage_counters or usage_events | D | 1 |
| 8 | Webhooks | webhook_events (idempotency) | D | — |
| 9 | Notifications | notification_preferences | D | 1 |
| 10 | Reflections | reflection_entries, reflection_lessons (optional) | E | 1, 2 |
| 11 | Content versioning (optional) | content_versions, lesson_versions | E | 2 |

---

## 5. Migrations

| Practice | Implementation |
|----------|----------------|
| **Tool** | Use framework migrations (e.g. Knex, Alembic, TypeORM) or plain SQL with versioned filenames |
| **Naming** | YYYYMMDD_description.sql or 001_create_users.up.sql / .down.sql |
| **Order** | Dependencies first: users → profiles → consent → lessons → progress → ... |
| **Rollback** | Implement down migrations or document "no rollback; use backup" for data migrations |
| **CI** | Run migrations on test DB in CI; no destructive migrations on prod without backup |
| **Secrets** | No secrets in migrations; use env for DB URL |

---

## 6. Seed / Reference Data

| Data | When | Format | Owner |
|------|------|--------|--------|
| **Dev user(s)** | Phase A | Seed script or migration; 1–2 test users | Backend |
| **Lessons (Phase B)** | Phase B | 5–10 lessons: metadata + content (JSON or normalized steps) | Content / Backend |
| **Scenarios (Phase C)** | Phase C | 2–5 scenario definitions (title, prompt_config) | Content / Backend |
| **Listening exercises** | Phase C | 2–5 exercises: audio URL, questions, answers | Content / Backend |
| **Stripe products/prices** | Phase D | Created in Stripe dashboard; reference by id in env | Product / DevOps |
| **Reference (e.g. CEFR levels)** | Phase B | Small table or enum: A0, A1, A2, B1, B2, C1 | Backend |

Seed scripts should be idempotent (e.g. "insert if not exists" or run once per env).

---

## 7. Authored vs AI-Generated Content

| Type | Stored where | Phase |
|------|---------------|-------|
| **Authored** | Lessons (title, steps, quiz questions, flashcards); scenarios (prompt config); listening (audio, questions) | B, C |
| **AI-generated** | Conversation turns (assistant messages); TTS audio (optional cache); reflection-generated lesson content | C, E |
| **User-generated** | Reflection notes; uploaded photo refs; conversation user messages | C, E |

- **Moderation**: User and AI content may be moderated (see integration spec); store moderation outcome if needed for review.
- **Retention**: Authored content retained per product; user and AI conversation/reflection per retention policy (e.g. 90 days); audio per BR-4.

---

## 8. Lesson Metadata Model

| Field (conceptual) | Type | Purpose |
|--------------------|------|---------|
| id | UUID / bigint | PK |
| external_id | string | Optional stable id for content |
| level | enum / string | CEFR or level tag |
| topic | string | e.g. "greetings", "shopping" |
| title | string | Display title |
| content_json | JSONB or ref | Steps, cards, quiz; or reference to content table |
| order | int | Display order in list |
| locale / language | string | Teaching language (nl) |
| created_at, updated_at | timestamp | Audit |

Optional: lesson_prerequisites, lesson_duration_minutes. Phase B can start with minimal (id, level, topic, title, content_json, order).

---

## 9. User Profile and Progress Model

| Entity | Key fields |
|--------|------------|
| **users** | id, email, password_hash, auth_provider, created_at |
| **profiles** | user_id (FK), name, level, target_level, goals (array or JSON), onboarding_complete, locale, updated_at |
| **consent** | user_id, purpose (e.g. analytics, marketing, microphone), granted_at, withdrawn_at |
| **progress** | user_id, lesson_id or session_id, event_type (started, completed), score, created_at; unique constraint for idempotency (user, lesson, event_type) or (user, session) |
| **gamification** | user_id, xp, current_streak, longest_streak, last_activity_date |

Progress can be one table with event_type or separate lesson_completions and session_completions. Gamification can be computed from progress or stored and updated on each completion.

---

## 10. Speech Result Storage Model

| Entity | Purpose |
|--------|---------|
| **voice_sessions** | id, user_id, started_at, ended_at; optional summary |
| **voice_turns** (optional) | session_id, user_text, assistant_text, tts_url, created_at |
| **pronunciation_results** | session_id or turn_id, score, details (JSON), created_at |
| **listening_attempts** | user_id, exercise_id, answers (JSON), score, created_at |

Audio files: store URL (object storage) or reference; do not store binary in PostgreSQL. Retention: short (e.g. 30 days) for pronunciation; per BR-4 and integration spec.

---

## 11. Analytics Event Taxonomy Implementation Support

| Need | Implementation |
|------|----------------|
| **Event source** | Backend emits events (trial_started, payment_success, lesson_completed) to queue or analytics provider (PostHog, etc.); or frontend only for UI events |
| **Schema** | Event name, user_id (or anonymous_id), timestamp, properties (JSON); no PII in properties where possible |
| **DB** | No requirement to store raw events in app DB; optional analytics_events table for audit or replay |
| **Taxonomy** | Align with analytics-and-observability-implementation-plan.md; implement event names and properties in code |

---

## 12. Retention and Deletion Support

| Requirement | Implementation |
|-------------|----------------|
| **Account deletion** | Hard delete or anonymize: users, profiles, consent, progress, gamification, conversation_sessions/turns, voice_sessions, pronunciation_results, reflection_entries; subscriptions: anonymize user_id or retain for legal; usage: delete or anonymize. Order: respect FKs; cascade or explicit delete. |
| **Export** | Generate JSON or CSV: profile, consent, progress summary, conversation summaries (no full audio); run as async job; store in object storage with short TTL; user downloads link. |
| **Retention jobs** | Cron or worker: delete pronunciation_results older than 30 days; conversation_turns older than 90 days (or configurable); purge exported files after 7 days. |
| **Consent withdrawal** | Update consent record; stop sending marketing; optional: purge marketing-related data; analytics may retain anonymized. |

Implement deletion in Phase D with GDPR export/delete flows (see security-privacy-and-compliance-plan.md).

---

## 13. Localization and Multi-Language Readiness

| Item | Phase | Implementation |
|------|-------|----------------|
| **Locale in profile** | A, B | profiles.locale (BCP 47); used in API and UI |
| **Lesson language** | B | lessons.language or locale = 'nl'; filter by teaching language |
| **Content versioning** | E | Optional: lesson_versions (locale, version); or separate rows per locale |
| **Schema** | B | No schema change for second language; add content and filter by language |
| **i18n UI** | B | Frontend: keys per screen; no hardcoded copy (see frontend plan) |

Phase B: Dutch only; schema and code should not assume single language (e.g. avoid hardcoding "nl" in queries where a column is preferred).

---

## 14. Exam Content / Content Operations Approach

| Phase | Approach |
|-------|----------|
| **B** | No exam-specific content beyond optional "exam prep" entry; lessons are generic |
| **C** | Listening exercises can double as exam-style; no separate exam schema required |
| **D** | Launch content set: lessons and scenarios curated; no CMS |
| **E** | Exam modules (reading, listening, speaking, writing, KNM); content_versions or exam_exercises table; content ops process: add/edit lessons via script or CMS pilot; workflow for translation if multi-language |

Content ops: who creates lessons (product, content lead); where stored (DB seed or CMS); review process (optional editorial). Content ops owner and review process (who creates/edits lessons, approval flow) to be defined in Phase D. Document in Phase D; implement tooling in Phase E if needed.

---

## 15. Dependencies

- **Backend**: Backend consumes these tables; migrations run before or with API that uses them.
- **Integrations**: Stripe webhook writes to subscriptions; LLM/speech do not write directly (backend service writes).
- **Security/Privacy**: Retention and deletion must align with security-privacy-and-compliance-plan.md.

---

## 16. Risks

- **Migration failure on prod**: Test migrations on copy of prod data; have rollback or restore plan.
- **Seed data quality**: Lessons must be valid JSON and complete; validate in seed script.
- **Deletion order**: FK constraints require correct order; test full account deletion in staging.

---

## 17. Readiness and Done Criteria

- **Phase A**: users, profiles, consent tables exist; migrations run in CI and staging.
- **Phase B**: lessons (and steps/content); progress and gamification tables; seed lessons loaded.
- **Phase C**: conversation_sessions/turns; voice_sessions; pronunciation_results; listening tables; seed scenarios and listening exercises.
- **Phase D**: subscriptions; usage; webhook_events; notification_preferences; retention and deletion jobs designed and tested.
- **Phase E**: reflection_entries; optional content_versions; content ops process and optional CMS.
