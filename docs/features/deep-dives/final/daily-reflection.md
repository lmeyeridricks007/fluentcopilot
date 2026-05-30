# Daily Reflection — Deep-Dive Specification

## 1. Purpose

Daily Reflection lets learners log daily activities (optional photo, location, short note) and receive a personalized “Your day” lesson generated from those entries (vocabulary, phrases). It is premium-only and depends on consent for photo, location, and AI use of context (BFR-009). This spec covers FD-07: data model, generation flow, moderation, and integration with LLM and Lesson Engine.

## 2. Core Concept

- **Reflection entry**: User-submitted note with optional photo and location; stored with consent; used as input for lesson generation.
- **Generated lesson**: LLM + user context (level, profile) produce vocabulary and phrases from activities; presented as a lesson; completion recorded like core lessons (FD-02).
- **Moderation**: User notes and generated content moderated (IS-017, IS-018); consent and retention (BR-4) apply.

## 3. Why This Feature Exists

- **Habit and personalization**: Ties learning to the user’s real day; increases relevance and engagement.
- **Premium value**: Differentiated feature; drives retention.

## 4. User / Business Problems Solved

- Learners turn daily experiences into targeted Dutch practice.
- Business gets engagement and premium differentiation.

## 5. Scope

### 6. In Scope

- Persist reflection entries (note, optional photo, location) with consent (FD07-FR-001).
- Generate lesson content from entries using LLM and user context (level, profile) (FD07-FR-002).
- Apply moderation to user input and generated content (IS-017, IS-018) (FD07-FR-003).
- Present “daily lesson” and record completion; entitlement gate (FD07-FR-004).
- Trigger: user adds entry(ies); at defined time or on demand, system generates lesson; user sees “Your day” and completes exercises.
- No entries → no lesson or generic tip (edge case).

### 7. Out of Scope

- Content authoring of lesson templates (Content doc); generation uses templates or prompts.
- Core lesson delivery mechanics (FD-02); daily lesson reuses same completion and progress patterns.
- Native camera/gallery UX details (OS-specific); only storage and consent in scope.

## 8. Main User Personas

- **Premium learner**: Logs activities; expects relevant vocabulary/phrases.
- **Privacy-conscious**: May skip photo/location; only note.

## 9. Main User Journeys

| Journey | Steps |
|--------|--------|
| **Add reflection** | Daily Reflection → Add entry (note; optional photo, location) → Save; consent for photo/location/AI context if first time. |
| **Get lesson** | At defined time or “Generate my lesson” → System generates from entries → “Your day” lesson appears → User completes → Progress + XP. |
| **No entries** | User opens Daily Reflection with no entries → “Add something you did today” or generic tip; no lesson. |

## 10. Triggering Events / Inputs

- **Add entry**: POST /reflections { note, photo_url?, location? }; consent checked; persist.
- **Generate lesson**: Scheduled (e.g. end of day) or on-demand (e.g. “Generate my lesson”); backend loads user’s entries for period (e.g. today); calls LLM with profile and level; generates lesson; stores or caches; notifies or surfaces in app.
- **Complete lesson**: Same as FD-02 (POST /progress/lesson with lesson_id for generated lesson).

## 11. States / Lifecycle

- **Entry created**: Reflection saved; optional photo and location stored per consent.
- **Generation pending**: Entries exist; generation not yet run (scheduled or waiting for trigger).
- **Lesson ready**: Generated lesson available; user can start.
- **Lesson completed**: User completed “Your day” lesson; progress and XP updated.
- **Moderation flag**: If user note or generated content fails moderation; do not show harmful content; optional “Couldn’t generate this time” or retry with sanitized input.

## 12. Business Rules

- **BFR-009**: Consent for photo, location, AI context; withdrawal disables or degrades feature.
- **BR-4**: Retention for reflection data and generated content; per Data doc.
- **Premium only**: Entitlement gate (FD-07).
- **IS-017**: Moderation on AI-generated content; IS-018 on user content (notes).

## 13. Configuration Model

- **Generation trigger**: Time of day (e.g. 20:00) or on-demand only; configurable.
- **LLM prompt**: Template for “generate lesson from activities”; input: entries, level, profile; output: lesson structure (vocabulary, phrases, exercises).
- **Moderation**: Same as FD-03/FD-11; rules and API for user and AI content.
- **Retention**: How long to keep reflection entries and generated lessons; per Data doc.

## 14. Data Model

- **reflection_entries**: id, user_id, note (text), photo_url (nullable), location (lat/lng or place_id, nullable), consent_photo, consent_location, consent_ai_context, created_at. Retention applied.
- **generated_lessons** (or lesson with source=reflection): id, user_id, reflection_entry_ids[] (or date range), prompt_id, content (JSONB: vocabulary, phrases, exercises), generated_at, expires_at (optional TTL).
- **Progress**: Same as FD-02; lesson_id points to generated lesson; completion and XP.

## 15. Read Model / Projection Needs

- **Today’s entries**: List for user to edit or for generation input.
- **Current lesson**: “Your day” lesson if generated and not yet completed; show in home or Daily Reflection.
- **History**: Optional list of past “Your day” lessons and completions.

## 16. APIs / Contracts

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/v1/reflections` | Add reflection entry | { note, photo_url?, location? } | 201 { entry_id }; 400 invalid; 403 no consent / not entitled |
| GET | `/v1/reflections` | List user’s entries (e.g. today) | Query: date_from, date_to, limit | 200 { entries[] } |
| POST | `/v1/reflections/generate-lesson` | Trigger lesson generation from entries | { date? (default today) } | 202 { job_id } or 200 { lesson_id } if sync; 403 not entitled; 404 no entries |
| GET | `/v1/reflections/daily-lesson` | Get current “Your day” lesson (if any) | — | 200 { lesson }; 404 none |
| (Completion) | POST /v1/progress/lesson | Same as FD-02; lesson_id = generated lesson | — | — |

**Async**: Generation can be async (job_id); client polls GET /reflections/daily-lesson or receives push when ready.

## 17. Events / Async Flows

- **reflection_added**: user_id, entry_id (analytics).
- **daily_lesson_generated**: user_id, lesson_id (analytics); may trigger in-app or push “Your day lesson is ready.”
- **daily_lesson_completed**: Same as lesson_completed (FD-02); progress and XP.
- **Moderation**: If content blocked, no lesson generated or sanitized retry; optional event for ops.

## 18. UI / UX Design

- **Add entry**: Form with note (required); optional “Add photo” (opens picker; consent); optional “Add location” (consent); Save.
- **Consent**: First-time use of photo/location: explain and get consent; store with entry.
- **Your day**: When lesson ready, card on home or in Daily Reflection; “Start your lesson” → same UX as FD-02 lesson run.
- **No entries**: Empty state “What did you do today? Add a note to get a personalized lesson.”

## 19. Main Screens / Components

- **ReflectionEntryForm**: Note, photo upload, location; consent checkboxes or prior consent.
- **ReflectionListScreen**: Today’s entries; “Generate my lesson” or wait for scheduled.
- **DailyLessonCard**: “Your day” lesson summary; CTA to start (reuses LessonRunScreen from FD-02).

## 20. Permissions / Security Rules

- **Entitlement**: Premium only; 403 if free user.
- **Consent**: Photo, location, AI context; backend checks before storing and before generation.
- **User scope**: Only own entries and generated lessons; filter by user_id.

## 21. Notifications / Alerts / Side Effects

- **Push/in-app**: “Your day lesson is ready” when generation completes (Notifications module).
- **Withdraw consent**: If user withdraws photo/location consent, existing entries with that data handled per policy (e.g. redact or delete); future generation without that data.

## 22. Integrations / Dependencies

- **LLM**: Generate lesson content from entries + profile (Integrations doc).
- **Moderation**: User notes (IS-018) and generated text (IS-017); internal or API.
- **Storage**: Object storage for photos (CDN or blob); URLs in reflection_entries.
- **Profile**: Level and profile for LLM context; consent from Profile service.
- **Entitlements**: Premium gate.
- **FD-02 (Lesson Engine)**: Deliver generated lesson (same progress and completion flow).
- **Gamification**: XP on daily lesson completion.

## 23. Edge Cases / Failure Cases

- **No entries**: No lesson; show empty state or “Add an entry to get a lesson.”
- **Moderation blocks user note**: Reject entry or sanitize; inform user “Content couldn’t be used.”
- **Moderation blocks generated content**: Retry with different prompt or skip; “Couldn’t generate this time.”
- **LLM timeout**: Retry once; then 503 “Try again later.”
- **Generation async**: Client polls or waits for push; show “Generating your lesson…” with spinner.
- **Consent withdrawn**: Stop using photo/location for new entries; existing data per retention and policy.

## 24. Non-Functional Requirements

- **Latency**: Generation async acceptable (e.g. within minutes) (FD-07). Entry save < 2s.
- **Retention**: Reflection and generated content per Data doc (BR-4).
- **Availability**: Depends on LLM and moderation; degrade with message.

## 25. Analytics / Auditability Requirements

- **Events**: reflection_added, daily_lesson_generated, daily_lesson_completed. Include user_id; no PII in event payload.
- **Audit**: Optional audit for consent and data handling; retention compliance.

## 26. Testing Requirements

- Unit: Consent and entitlement check; moderation stub (pass/block).
- Integration: POST reflection; trigger generation (mock LLM); get daily lesson; complete lesson and XP; 403 when not entitled.
- E2E: Add entry with note; generate lesson; complete “Your day” lesson.

## 27. Recommended Architecture

- **Reflection service or module**: Owns reflection_entries and trigger for generation; calls LLM with entries + profile; runs moderation on input and output; creates generated_lessons record; Lesson Engine serves lesson content and progress. Optional: queue for async generation (job worker).
- **Storage**: Photos in object storage; URLs in DB; retention policy on bucket and DB.

## 28. Recommended Technical Design

- **Generation**: Idempotent per user per day (one “Your day” lesson per day); if user triggers again, return existing or regenerate (product decision).
- **Prompt**: Structured prompt with entries, level, learning_goal; output schema (vocabulary list, phrases, 2–3 exercises) for Lesson Engine to render.
- **Moderation**: Same pipeline as scenarios (IS-017, IS-018); block or redact before storing or showing.

## 29. Suggested Implementation Phasing

- **Phase 1**: Add entry (note only); consent; store; on-demand generation (sync); display generated lesson; complete and XP; entitlement.
- **Phase 2**: Photo and location (optional); moderation on entry and generated content; scheduled generation; push when ready.
- **Phase 3**: History of entries and lessons; retention and deletion; analytics.

## 30. Summary

Daily Reflection allows premium users to log activities (note, optional photo/location) with consent and receive a personalized “Your day” lesson generated by LLM. User and generated content are moderated (IS-017, IS-018). Completion flows like FD-02 and awards XP. Implementation must enforce consent and entitlement, apply moderation, and handle async generation and missing entries gracefully.
