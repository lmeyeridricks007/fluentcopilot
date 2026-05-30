# Core Lessons (Vocabulary, Grammar, Flashcards, Quizzes) — Implementation-Grade Module Specification

**Target feature**: Core Lessons (FD-02)  
**Version**: 2 (expanded)  
**Status**: Implementation-grade

---

## 1. Purpose

Core Lessons deliver CEFR-aligned micro-learning: vocabulary and grammar lessons composed of intro, cards, exercises, and quizzes. They form the primary learning loop, drive progress and spaced repetition (IS-008), and are subject to free-tier caps (BFR-011, BR-8). This document is an implementation-grade specification so that backend, frontend, QA, and product can build and verify the feature with no ambiguity on behavior, state, rules, data, APIs, events, UI, and integrations.

---

## 2. Core Concept

- **Lesson**: A structured learning unit (vocabulary_guided, grammar_guided, or mixed) built from a lesson template. Content: steps (intro, vocabulary_list, example_sentences, exercise_block) and a quiz block. Tagged by CEFR level and topic (IS-001). Stored as `lessons` with `content_payload` and optional refs to `exercises` and vocabulary.
- **Progress**: Per-user, per-lesson state: `lesson_progress` (status: not_started | in_progress | completed, last_step_index, score, completed_at). Checkpoints at step boundaries; completion triggers Gamification (XP, streak) and spaced-repetition update.
- **Free cap**: Max lessons per period (e.g. per calendar day) for free tier; enforced at lesson start (GET /lessons/:id). When at cap, API returns 403 `free_cap_reached`; client shows upsell or “Come back tomorrow.”
- **Quiz**: One retry on fail; then show correct answers and allow user to continue (no block). Score and pass/fail recorded; feed Personalization and optional adaptive difficulty.

---

## 3. Why This Feature Exists

- **Learning efficacy**: Micro-lessons and spaced repetition are evidence-based (IS-007, IS-008, IS-010).
- **Engagement**: Core loop drives daily return; XP and streak (FD-10) depend on lesson completion.
- **Monetization**: Cap drives upsell when free user hits limit (FD-12).
- **Product coherence**: Lessons are the main “Learn” surface; recommendations (Personalization) and exam prep (FD-09) depend on lesson catalog and progress.

---

## 4. User / Business Problems Solved

- **Learners**: Level-appropriate vocabulary and grammar in short sessions; clear “Continue” and “Next lesson”; progress and streak visible.
- **Business**: Engagement metrics (completions, time), conversion triggers (cap reached), and content discoverability by topic and exam tag.
- **Support**: Progress and completion history for “I lost my progress” and learning history.

---

## 5. Scope

### 6. In Scope

- Lesson catalog: filter by level (user level ± stretch), topic, exam tag; pagination; sort (recommended, level, topic, recent).
- Lesson run: load by id; render steps (intro, vocabulary list, examples, exercise block, quiz); checkpoint at step boundaries; submit quiz; compute score; persist completion; trigger Gamification and spaced repetition.
- Flashcards and quizzes as part of lesson or standalone review; retry quiz once then show answers.
- Free-tier daily (or configurable period) cap; check at lesson start; return 403 with `reason: "free_cap_reached"` and optional `usage`; client shows upsell.
- Integration: Gamification (XP, streak on completion); Entitlements (usage count, cap check); Personalization (recommendations, next lesson, activity-event); Content (lessons, exercises, media from CDN).
- Admin/configuration: cap value, period type (day/week), level-filter rule (strict vs stretch), lesson template and structure_schema; content status (draft, published, archived) for catalog visibility.
- State transitions: not_started → in_progress (on first checkpoint or start); in_progress → completed (on quiz submit with completed: true); in_progress → abandoned (implicit on session end without complete).
- Edge cases: network loss (resume from checkpoint); double submit (idempotent complete); invalid lesson id (404); free at cap (403); quiz partial answers (product rule: allow partial score or require all).

### 7. Out of Scope

- Content authoring and CMS (Content doc); this spec consumes published lessons and exercises.
- Scenario simulations (FD-03), voice (FD-04), listening (FD-05), exam prep modules (FD-09) as separate flows; Lesson Engine may link to them (e.g. “Try this scenario” CTA).
- Full offline lesson delivery (degraded/cached only per UI spec).
- Gamification and Personalization internal logic (their specs); this spec defines triggers and payloads only.

---

## 8. Main Personas

| Persona | Goal | Relevant behavior |
|---------|------|-------------------|
| **Beginner** | A0–A1 vocabulary and phrases | Level filter; simple lessons first; “Continue” and recommendations by level. |
| **Exam-focused** | A2/B1/KNM prep | Lessons tagged exam; filter by exam_tag; progress feeds exam prep dashboard. |
| **Free user** | Learn within limit | Cap enforced; “X/5 lessons today”; upsell when cap reached. |
| **Premium user** | Unlimited practice | No cap (or fair-use only); same progress and XP flow. |
| **Returning** | Resume and streak | “Continue [lesson]” from progress; streak from Gamification. |

---

## 9. Main User Journeys

| Journey | Steps | Exit / failure |
|--------|--------|-----------------|
| **Start lesson** | Home/Learn → Select lesson → Load content → Steps (intro → cards → exercises → quiz) → Submit quiz → Summary (score, XP, streak) → Next or Home | Cap → 403, upsell; network → retry/resume. |
| **Continue lesson** | Home “Continue [lesson]” → Load lesson + progress → Resume from last_step_index → Continue to quiz → Submit → Summary | 404 lesson → redirect to list; progress corrupt → restart from 0. |
| **Review only** | Learn → “Review” or flashcards → Card stack or quiz-only flow → Complete → Progress updated | Same as lesson run; no “new” lesson start so no cap check for “review” if product treats review separately. |
| **Cap reached** | Free user taps new lesson → GET /lessons/:id → 403 free_cap_reached → Modal “You’ve reached your daily limit” + upsell + “Come back tomorrow.” | — |

---

## 10. Triggering Events / Inputs

| Trigger | Source | Input | System action |
|---------|--------|--------|----------------|
| List lessons | Client (Learn / Home) | GET /lessons?level=&topic=&exam_tag=&limit=&offset= | Filter by level/topic/exam; return catalog slice; no cap check. |
| Start lesson | Client (user taps lesson) | GET /lessons/:id | Auth; if free user, check usage vs cap; if at cap → 403 free_cap_reached; else return lesson content (steps, exercises, quiz). Do not increment usage yet (increment on completion). |
| Checkpoint | Client (after step N) | POST /progress/lesson { lesson_id, step_index, completed: false } | Upsert lesson_progress: status=in_progress, last_step_index=N; return 200. |
| Complete lesson | Client (quiz submit) | POST /progress/lesson { lesson_id, completed: true, score, answers? } | Validate; upsert lesson_progress status=completed, score, completed_at; increment usage (Entitlements); call Gamification (XP, streak); update spaced repetition; return 200. Idempotent for same (user_id, lesson_id). |
| Get progress | Client (Home, Continue) | GET /progress/lessons or GET /me with progress | Return list of lesson_progress (in_progress + completed); for “Continue” use in_progress with max last_step_index or latest by updated_at. |
| Cap/usage read | Client (before start) or API (internal) | GET /entitlements or GET /entitlements/usage | Return tier and usage (e.g. lessons_today, lessons_cap); client can show “3/5 lessons today.” |

---

## 11. Commands / Actions

| Command | Actor | Preconditions | Postconditions |
|---------|--------|----------------|-----------------|
| **List lessons** | Client | Authenticated | Catalog slice returned; no state change. |
| **Start lesson** | Client | Authenticated; not at cap (if free); lesson exists and published | Lesson content returned; optional: create lesson_progress status=in_progress at step 0 when first checkpoint received (or on first GET if product prefers). |
| **Checkpoint progress** | Client | Authenticated; lesson_id valid; step_index within lesson steps | lesson_progress updated: last_step_index, status=in_progress, updated_at. |
| **Complete lesson** | Client | Authenticated; lesson_id valid; completed=true, score present; not already completed (or idempotent overwrite) | lesson_progress status=completed, score, completed_at; usage incremented; Gamification awarded; spaced repetition updated; event lesson_completed. |
| **Resume lesson** | Client | Authenticated; lesson_progress exists with status=in_progress | Load lesson + progress; client resumes from last_step_index. |
| **Enforce cap** | Backend | Free user; GET /lessons/:id for “start” | If usage >= cap → 403 free_cap_reached; else return 200 with lesson. |

---

## 12. States / Lifecycle

**Lesson content**: Stateless (published entity). **User progress per lesson**: Stateful.

| State | Meaning | Stored in | Transitions |
|-------|---------|-----------|-------------|
| **not_started** | User has not started this lesson | No row, or status=not_started if row exists | → in_progress (on first checkpoint or explicit start). |
| **in_progress** | User has started; last_step_index &lt; quiz end | lesson_progress.status=in_progress, last_step_index | → completed (on POST complete); → abandoned (implicit: session end, no complete). |
| **completed** | User submitted quiz; score stored | lesson_progress.status=completed, score, completed_at | No further transition; idempotent if complete called again. |
| **abandoned** | Left without completing | Optional: status=abandoned or leave in_progress | Treated as “Continue” available; no separate DB state required. |

**Lifecycle (summary)**  
not_started → (start/checkpoint) → in_progress → (submit quiz) → completed.  
in_progress can persist indefinitely until complete or “restart” (product may allow clear progress).

---

## 13. State Transition Rules

- **not_started → in_progress**: On first POST /progress/lesson with lesson_id and any step_index (or step_index=0), or on first GET /lessons/:id that creates progress (if product creates progress on start). No duplicate row: upsert by (user_id, lesson_id).
- **in_progress → completed**: Only when POST /progress/lesson with completed=true and valid score. Server sets status=completed, completed_at=now(), and triggers downstream (usage, Gamification, spaced repetition). Once completed, same POST is idempotent (no double XP, no double usage).
- **in_progress → abandoned**: Implicit; no API. If user leaves and never completes, row stays in_progress; “Continue” still shows. Optional: mark abandoned after N days (admin config); not required for MVP.
- **Restart**: Product may offer “Start over”; implementation = delete or reset lesson_progress for (user_id, lesson_id) then allow start again; usage is not decremented (avoid gaming).
- **Progress corruption**: If last_step_index exceeds current lesson steps length (e.g. content changed), treat as resume from 0 or clamp to max step index; do not fail load.

---

## 14. Business Rules

| ID | Rule | Applies to |
|----|------|------------|
| BR-2 | User level drives which lessons are available and recommended (IS-001, IS-003). | Catalog filter; recommendations. |
| BR-8 | Free-tier limits enforced per user per period (e.g. 3–5 lessons/day). | Cap check at lesson start; Entitlements. |
| FD02-FR-001 | Serve lessons tagged with CEFR level and topic; filter by user level. | GET /lessons, GET /lessons/:id. |
| FD02-FR-002 | Support vocabulary and grammar lesson types with flashcards and quizzes. | Lesson template and content_payload; exercise types. |
| FD02-FR-003 | Update spaced-repetition schedule on lesson completion (IS-008). | On complete: call SR service or persist SR items. |
| FD02-FR-004 | Enforce free-tier lesson/quota limits per user per period (BFR-011). | Cap check before returning lesson for “start.” |
| FD02-FR-005 | Record progress (completed units, score) and expose to Gamification (XP). | lesson_progress; completion event to Gamification. |
| **Quiz** | Allow one retry on fail; then show correct answers and allow continue. | Client + optional retry_count in progress or session. |
| **Checkpoint** | Save at defined step boundaries so network loss does not lose full lesson. | POST /progress/lesson with step_index and completed: false. |
| **Catalog** | Only published lessons (status=published) visible; filter by user level (and optional stretch). | GET /lessons. |
| **Review vs. cap** | Standalone review (flashcard/quiz-only, no new lesson start) does not count toward daily lesson cap; only full lesson completions increment usage. | Cap and usage. |
| **Quiz pass/fail** | For analytics and Gamification, quiz_passed when score >= lesson’s pass_threshold (e.g. 0.7); quiz_failed otherwise. | Events, analytics. |
| **Concurrent complete** | Duplicate complete (e.g. two tabs) is idempotent; first write wins; no double usage or XP. | POST /progress/lesson. |

---

## 15. Configuration / Admin Model

| Config key | Type | Description | Example |
|------------|------|-------------|---------|
| **free_tier.lessons_cap_per_period** | number | Max lessons per period for free user. | 5 |
| **free_tier.period_type** | enum | Period for cap: day \| week. | day |
| **free_tier.period_timezone** | string | User timezone or UTC for “day” boundary. | user \| UTC |
| **catalog.level_filter** | enum | strict \| stretch_1. strict = only lesson.level <= user.level; stretch_1 = allow user.level+1. | stretch_1 |
| **catalog.lesson_status_visible** | string[] | Which lesson statuses appear in catalog. | ["published"] |
| **checkpoint.step_boundaries** | boolean or list | Save checkpoint every step, or only at step indices [N, M, ...]. | true (every step) |
| **quiz.retry_allowed** | boolean | Allow one retry on quiz fail. | true |
| **quiz.require_all_answers** | boolean | Require all questions answered to submit, or allow partial. | false (allow partial) |
| **lesson_templates** | (reference) | From Content: lesson_templates.structure_schema, codes (vocabulary_guided, grammar_guided, ...). | — |
| **content.lessons** | (reference) | lessons.status = draft \| review \| published \| archived; only published in catalog. | — |

Admin can change cap and period_type without code deploy (feature/config service or DB config table). Level filter and catalog status are typically config or env.

---

## 16. Data Model

### 16.1 lessons (reference: database-schema)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| locale | VARCHAR(10) | NOT NULL |
| lesson_template_id | BIGINT | FK lesson_templates |
| external_id | VARCHAR(100) | UNIQUE per locale |
| title | VARCHAR(255) | |
| title_key | VARCHAR(100) | optional i18n |
| cefr_level_id | BIGINT | FK cefr_levels |
| topic | VARCHAR(100) | |
| topic_tags | TEXT[] or JSONB | optional array |
| exam_tags | TEXT[] or JSONB | optional (e.g. ["A2", "KNM"]) |
| content_payload | JSONB | steps, vocabulary_refs, exercise_ids, quiz config (see example below) |
| status | VARCHAR(20) | draft, review, published, archived |
| version | INT | DEFAULT 1 |
| published_at | TIMESTAMPTZ | |
| created_at, updated_at | TIMESTAMPTZ | |

**Indexes**: (locale, cefr_level_id), (locale, status), (external_id, locale), (topic_tags), (exam_tags) if queried.

### 16.2 lesson_progress

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | UUID | PK (with lesson_id) |
| lesson_id | BIGINT | PK, FK lessons |
| status | VARCHAR(20) | not_started \| in_progress \| completed |
| last_step_index | INT | 0-based step index; NULL if not_started |
| score | DECIMAL(5,2) | NULL until completed; 0–100 or 0–1 |
| completed_at | TIMESTAMPTZ | NULL until completed |
| created_at, updated_at | TIMESTAMPTZ | |

**Unique**: (user_id, lesson_id). **Index**: (user_id, status) for “Continue” and history.

### 16.3 usage (Entitlements or Lesson Engine)

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | UUID | PK (with period_key) |
| period_key | VARCHAR(20) | e.g. "2025-03-14" (day) or "2025-W11" (week) |
| lessons_completed_count | INT | DEFAULT 0 |
| updated_at | TIMESTAMPTZ | |

**Unique**: (user_id, period_key). Increment on lesson complete; read for cap check.

### 16.4 spaced_repetition (optional; may live in Lesson Engine or Personalization)

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | UUID | |
| item_id | BIGINT | vocabulary_term_id or lesson_id or exercise_id |
| item_type | VARCHAR(20) | vocabulary \| lesson \| exercise |
| last_reviewed_at | TIMESTAMPTZ | |
| next_due_at | TIMESTAMPTZ | |
| recall_success_count | INT | DEFAULT 0 |
| recall_fail_count | INT | DEFAULT 0 |
| created_at, updated_at | TIMESTAMPTZ | |

**Example lesson content_payload (vocabulary_guided)**

```json
{
  "steps": [
    { "type": "intro", "title_key": "lessons.food.intro", "duration_estimate_sec": 30 },
    { "type": "vocabulary_list", "vocabulary_refs": [101, 102, 103], "max_items": 10 },
    { "type": "example_sentences", "examples": [{ "nl": "Ik eet brood.", "en": "I eat bread." }] },
    { "type": "exercise_block", "exercise_ids": [201, 202], "template_codes": ["multiple_choice", "flashcard"] },
    { "type": "quiz", "exercise_ids": [301, 302, 303], "pass_threshold": 0.7 }
  ],
  "options": { "show_translations": true, "allow_skip": false }
}
```

**Example lesson_progress record (in_progress)**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "lesson_id": 42,
  "status": "in_progress",
  "last_step_index": 2,
  "score": null,
  "completed_at": null,
  "updated_at": "2025-03-14T10:15:00Z"
}
```

**Example lesson_progress record (completed)**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "lesson_id": 42,
  "status": "completed",
  "last_step_index": 4,
  "score": 85.5,
  "completed_at": "2025-03-14T10:22:00Z",
  "updated_at": "2025-03-14T10:22:00Z"
}
```

---

## 17. Read Models / Projections

| Read model | Source | Purpose |
|------------|--------|---------|
| **Catalog** | lessons (filter status=published, level, topic, exam_tags) | GET /lessons list; pagination. |
| **Lesson detail** | lessons + exercises (by content_payload.exercise_ids) | GET /lessons/:id for run; include exercise payloads and media URLs. |
| **User progress** | lesson_progress (user_id) | GET /progress/lessons; “Continue” = in_progress with latest updated_at; history = completed. |
| **Usage** | usage (user_id, period_key) | Cap check; GET /entitlements/usage (lessons_today, lessons_cap). |
| **Recommendations** | Personalization: uses progress + profile to suggest next lesson; “Continue” from progress. | Home and Learn; not stored in Lesson Engine; consumed via GET /recommendations or /home. |
| **Spaced repetition due** | spaced_repetition (user_id, next_due_at <= now()) | “Review flashcards” recommendation; getDueForReview(user_id). |

No event-sourced projection required; current state in lesson_progress and usage is sufficient.

---

## 18. API Design

### 18.1 GET /v1/lessons

**Purpose**: List lessons for catalog (Learn, browse). No cap check.

**Query**: level (CEFR code, optional), topic (string, optional), exam_tag (string, optional), limit (default 20), offset (default 0), sort (recommended \| level \| topic \| recent, optional).

**Response**: 200 OK

```json
{
  "lessons": [
    {
      "id": 42,
      "external_id": "food-basics-a1",
      "title": "Food basics",
      "title_key": "lessons.food.basics",
      "cefr_level": "A1",
      "topic": "food",
      "topic_tags": ["food", "daily_life"],
      "exam_tags": [],
      "duration_estimate_min": 8,
      "in_progress": true,
      "completed": false
    }
  ],
  "total": 100
}
```

**Notes**: in_progress and completed derived from lesson_progress for current user if authenticated. Filter by user level per catalog.level_filter (strict or stretch). Only status=published.

### 18.2 GET /v1/lessons/:id

**Purpose**: Get lesson content for run (or resume). **Cap check**: If free user and this is a “new” start (no existing in_progress for this lesson), check usage vs cap; if at cap return 403.

**Response**: 200 OK

```json
{
  "id": 42,
  "external_id": "food-basics-a1",
  "title": "Food basics",
  "cefr_level": "A1",
  "topic": "food",
  "content_payload": {
    "steps": [
      { "type": "intro", "title_key": "lessons.food.intro", "duration_estimate_sec": 30 },
      { "type": "vocabulary_list", "vocabulary_refs": [101, 102, 103] },
      { "type": "exercise_block", "exercise_ids": [201, 202] },
      { "type": "quiz", "exercise_ids": [301, 302, 303], "pass_threshold": 0.7 }
    ]
  },
  "exercises": [
    { "id": 201, "template_code": "multiple_choice", "payload": { "question": { "text": "Wat eet je?" }, "options": [...], "correct_option_id": "B" } }
  ],
  "progress": {
    "status": "in_progress",
    "last_step_index": 1,
    "score": null
  }
}
```

**Response**: 403 Forbidden (at cap)

```json
{
  "error": {
    "code": "free_cap_reached",
    "message": "You've reached your daily lesson limit. Upgrade for unlimited or come back tomorrow."
  },
  "usage": { "lessons_today": 5, "lessons_cap": 5 }
}
```

**Response**: 404 Not Found (lesson missing or not published).

### 18.3 POST /v1/progress/lesson

**Purpose**: Checkpoint or complete lesson.

**Request (checkpoint)**:

```json
{
  "lesson_id": 42,
  "step_index": 2,
  "completed": false
}
```

**Response**: 200 OK `{ "saved": true }`

**Request (complete)**:

```json
{
  "lesson_id": 42,
  "step_index": 4,
  "completed": true,
  "score": 85.5,
  "answers": [
    { "exercise_id": 301, "selected_option_id": "B" },
    { "exercise_id": 302, "answer": "brood" },
    { "exercise_id": 303, "selected_option_id": "A" }
  ]
}
```

**Response**: 200 OK

```json
{
  "saved": true,
  "completed": true,
  "score": 85.5,
  "xp_awarded": 10,
  "streak_updated": 3
}
```

**Validation**: lesson_id required; if completed=true, score required; step_index optional but recommended. 400 if invalid. Idempotent: same (user_id, lesson_id) with completed=true only updates if not already completed (or overwrite with same result; no double usage/XP).

### 18.4 GET /v1/progress/lessons

**Purpose**: List current user’s lesson progress for “Continue” and history.

**Query**: status (in_progress \| completed, optional), limit (default 50), offset (default 0).

**Response**: 200 OK

```json
{
  "progress": [
    {
      "lesson_id": 42,
      "lesson_title": "Food basics",
      "status": "in_progress",
      "last_step_index": 2,
      "score": null,
      "completed_at": null,
      "updated_at": "2025-03-14T10:15:00Z"
    },
    {
      "lesson_id": 38,
      "lesson_title": "Greetings",
      "status": "completed",
      "last_step_index": 4,
      "score": 90,
      "completed_at": "2025-03-13T14:00:00Z",
      "updated_at": "2025-03-13T14:00:00Z"
    }
  ]
}
```

---

## 19. Information / Data Flows

- **Catalog flow**: Client GET /lessons → Lesson Engine reads lessons (DB) with filters → returns list. Optionally join lesson_progress to attach in_progress/completed per lesson.
- **Start flow**: Client GET /lessons/:id → API checks auth → Entitlements: get usage (user_id, period_key) and cap → if free and usage >= cap → 403; else Lesson Engine loads lesson + exercises (and optional progress) → return 200.
- **Checkpoint flow**: Client POST /progress/lesson (lesson_id, step_index, completed: false) → Lesson Engine upsert lesson_progress (in_progress, last_step_index) → 200.
- **Complete flow**: Client POST /progress/lesson (lesson_id, completed: true, score, answers) → Lesson Engine: validate; upsert lesson_progress (completed, score, completed_at); increment usage (user_id, period_key); call Gamification.award(user_id, activity_type: "lesson", lesson_id, score); call SpacedRepetition.recordCompletion(user_id, lesson_id) or Personalization POST /activity-event; emit lesson_completed event → 200.
- **Continue flow**: Client GET /progress/lessons?status=in_progress → get latest in_progress; then GET /lessons/:id for that lesson → response includes progress.last_step_index; client renders from that step.

---

## 20. Events / Async Flows

| Event | When | Payload (example) | Consumers |
|-------|------|-------------------|-----------|
| **lesson_started** | First checkpoint or first GET /lessons/:id (if product tracks start) | { user_id, lesson_id, started_at } | Analytics |
| **lesson_completed** | POST /progress/lesson with completed=true | { user_id, lesson_id, score, completed_at, duration_sec? } | Gamification (XP, streak), Spaced Repetition, Personalization (activity-event), Analytics |
| **lesson_abandoned** | Optional: session end with in_progress and no activity for N min | { user_id, lesson_id, last_step_index } | Analytics |
| **free_cap_reached** | GET /lessons/:id returns 403 free_cap_reached | { user_id, lesson_id, usage, cap } | Analytics, client (upsell) |
| **quiz_passed** / **quiz_failed** | On complete; derived from score vs pass_threshold | { user_id, lesson_id, score, passed: bool } | Analytics, Personalization (adaptive difficulty) |

**Async**: Gamification and spaced repetition can be called synchronously (request-scoped) or via internal event/queue; completion response should reflect success (e.g. xp_awarded in response or eventual consistency). No user-facing async dependency for “lesson complete” screen.

---

## 21. Integration Design

| System | Direction | Contract | Notes |
|--------|-----------|----------|--------|
| **Entitlements** | Lesson Engine → Entitlements | getUsage(user_id, period_key), incrementUsage(user_id, period_key), getCap(user_id) | Cap check before start; increment on complete. |
| **Gamification** | Lesson Engine → Gamification | award(user_id, { activity_type: "lesson", lesson_id, score }) | On complete; XP and streak. |
| **Personalization** | Lesson Engine → Personalization | POST /activity-event { event_type: "lesson_completed", user_id, lesson_id, score } | Progress and recommendations update. |
| **Spaced Repetition** | Lesson Engine → SR service or internal | recordCompletion(user_id, lesson_id or item_ids), getDueForReview(user_id) | On complete; optional. |
| **Profile** | Lesson Engine ← Profile | getProfile(user_id) → level, locale | For level filter and i18n. |
| **Content / CDN** | Lesson Engine ← lessons, exercises; media URLs | Read lessons, exercises; resolve media URLs (CDN) | No write from Lesson Engine to content. |

**Error handling**: If Gamification or Personalization is down, still persist completion and usage; log and optionally retry or queue event so completion is not lost.

---

## 22. UI Design

- **Learn / Catalog**: List or grid of lesson cards; each card: title, level badge, topic, duration, “In progress” or “Completed” badge; filter by topic, level, exam tag; sort; “Continue” section at top (in_progress lessons).
- **Lesson run**: Full-screen (or modal) flow; progress bar (step X of Y); one step per view (intro → vocabulary list → examples → exercise block → quiz); Next / Submit; checkpoint indicator (“Saving…” or subtle) after each step; quiz: questions one-by-one or batch; Submit quiz → loading → summary.
- **Summary (post-complete)**: Score (e.g. 85%); pass/fail if threshold; “+10 XP”; “Streak: 3 days”; “Next lesson” button (from recommendation or list); “Back to Home.”
- **Cap reached**: Modal or inline banner: “You’ve reached your daily limit (5/5). Upgrade for unlimited or come back tomorrow.” Primary CTA: Upgrade; secondary: Close.
- **Resume**: Same as lesson run but entry at last_step_index; “Continue from step X” or auto-advance to next step.
- **Empty / error**: No lessons: “No lessons match. Try different filters.” 404: “Lesson not found.” Network error: “Couldn’t load. Retry.”

---

## 23. Information Architecture

- **Learn** (section): Entry = Learn tab or /learn. Children: Lesson list (catalog), Lesson run (full flow), Lesson summary (post-complete). “Continue” is a subset of list or separate block on Home/Learn.
- **Home**: Can show “Continue [lesson]” (deep link to /lessons/:id?resume=1), “Recommended” (from Personalization), “X/5 lessons today” (from Entitlements).
- **Progress / History**: Optional screen “My progress” = list of completed lessons (from GET /progress/lessons?status=completed); drill into lesson for score and date.
- **URLs**: /learn, /learn/lessons/:id (run), /learn/lessons/:id/summary (post-complete). Query ?resume=1 optional for clarity.

---

## 24. Main Screens

| Screen | Route | Purpose |
|--------|--------|---------|
| **LessonListScreen** | /learn | Catalog + filters + “Continue” block; tap lesson → LessonRunScreen. |
| **LessonRunScreen** | /learn/lessons/:id | Render steps; progress bar; checkpoint on step change; quiz submit → API → Summary. |
| **LessonSummaryScreen** | /learn/lessons/:id/summary or state after submit | Score, XP, streak; Next lesson / Back to Home. |
| **CapReachedModal** | (overlay) | Shown when 403 free_cap_reached; upsell CTA. |
| **ProgressHistoryScreen** | /progress or /learn/history (optional) | List completed lessons; optional filters. |

---

## 25. Reusable UI Components

| Component | Responsibility | Props (example) |
|-----------|----------------|-----------------|
| **LessonCard** | One lesson in list; title, level, topic, duration, badges (in progress, completed) | lesson, progress?, onPress |
| **StepRenderer** | Renders one step by type (intro, vocabulary_list, exercise_block, quiz) | step, lessonId, stepIndex, onNext, onCheckpoint |
| **ProgressBar** | Step X of Y | currentStep, totalSteps |
| **QuizQuestion** | Single question (multiple choice, fill blank, etc.) by exercise template | exercise, value, onChange, onSubmit |
| **QuizResult** | Correct/incorrect; correct answer; retry button if allowed | correct, correctAnswer, explanation, onRetry |
| **SummaryCard** | Score, XP, streak after complete | score, xpAwarded, streak, nextLesson?, onNext, onHome |
| **CapReachedModal** | Message + usage + upsell CTA | usage, cap, onUpgrade, onDismiss |
| **CheckpointIndicator** | “Saving…” or spinner when checkpoint in flight | saving: boolean |

---

## 26. UX Rules and Interaction Patterns

- **Checkpoint**: After user advances to next step (or after N seconds on step), client sends checkpoint; show subtle “Saving…” or no UI if fast; do not block step advance on checkpoint response (fire-and-forget or await with short timeout).
- **Quiz submit**: Disable submit until at least one answer (or all if require_all_answers); on submit show loading; on 200 show summary; on 400 show validation error; on network error show retry.
- **Quiz retry**: If score &lt; pass_threshold and retry_count=0, show “Try again” and allow second attempt; store retry_count in client or progress; on second fail show correct answers and “Continue” to summary.
- **Back navigation**: From lesson run, “Back” or “Close” → confirm “Progress is saved. Continue later?” then exit to list; do not lose checkpoint.
- **Cap**: When 403 received, show CapReachedModal; do not allow start until next period or upgrade.
- **Continue**: Tapping “Continue [lesson]” opens same LessonRunScreen with lesson id; backend returns progress.last_step_index; client initializes at that step (or step+1).

---

## 27. Accessibility and Usability Requirements

- **IS-011 (WCAG 2.1 AA target)**: Sufficient color contrast; focus order (keyboard/tab); labels for form inputs and buttons.
- **Screen reader**: Lesson title and step title announced; “Step 2 of 5”; quiz question and options readable; result (correct/incorrect) announced.
- **Touch**: Minimum touch target 44px; spacing between tappable elements.
- **Reduced motion**: Respect prefers-reduced-motion for any animations (e.g. step transition).
- **i18n**: All UI strings from locale; lesson title_key and content from locale (BCP 47); RTL not required for Dutch/EN.

---

## 28. Recommended Frontend Technical Design

- **State**: Lesson run state (current step index, answers for quiz) in component state or React state; progress from API (GET /lessons/:id with progress, or GET /progress/lessons). Do not hold full lesson content in global store if large; fetch on entry to run.
- **Checkpoint**: Debounce or on step change: POST /progress/lesson with step_index and completed: false; do not block render on response; retry once on failure and show “Couldn’t save progress” if both fail.
- **Complete**: POST /progress/lesson with completed: true and score; await response; then show summary (with xp_awarded, streak from response if provided) or navigate to summary screen.
- **Cap**: Before navigating to lesson run from catalog, can pre-check GET /entitlements/usage; if at cap, show modal without calling GET /lessons/:id; or call GET /lessons/:id and handle 403 to show same modal.
- **Routing**: /learn/lessons/:id with optional ?resume=1; same component for start and resume; progress from API.

---

## 29. Recommended Backend Technical Patterns

- **Lesson Engine service**: Owns lesson_progress and orchestrates Entitlements (cap, usage), Gamification, Personalization, Spaced Repetition. Single place for “start” (GET :id with cap check), “checkpoint” (POST progress), “complete” (POST progress + downstream).
- **Cap check**: Before returning lesson for GET /lessons/:id: if free user and no existing in_progress for this lesson_id, then get usage(user_id, period_key) and cap from config/Entitlements; if usage >= cap return 403. Do not increment usage here; only on complete.
- **Idempotent complete**: For POST /progress/lesson with completed=true, use upsert with constraint (user_id, lesson_id). If row already has status=completed, do not increment usage or call Gamification again; return 200 with existing score (idempotent).
- **Transactions**: Persist lesson_progress and increment usage in one transaction if both in same DB; else eventual consistency (persist first, then increment; on increment failure log and retry).
- **Validation**: Validate lesson_id exists and is published; validate step_index within steps length; validate score range if completed.

---

## 30. Permissions / Security

- **Auth**: All endpoints require authenticated user; user_id from session/JWT. No anonymous lesson run.
- **Scope**: User can only read/write own lesson_progress; filter by user_id on every query and mutation.
- **Catalog**: Only published lessons; no bypass to draft by id (return 404).
- **Cap**: Enforced server-side; client cannot override or fake tier/usage.
- **Rate limit**: Optional rate limit on POST /progress/lesson (e.g. 60/min per user) to prevent abuse.

---

## 31. Non-Functional Requirements

- **Latency**: GET /lessons/:id (first content) &lt; 3s p95 (NFR FD-02). POST /progress/lesson (checkpoint) &lt; 2s; complete &lt; 3s including downstream (or async downstream).
- **Availability**: Lesson Engine and dependency (DB) same as API SLA (e.g. 99.5%). Degrade gracefully if Gamification or Personalization temporarily down (persist completion, queue or log event).
- **Offline**: No full offline catalog or run (UI spec: degraded message or cached last lesson only).
- **Scalability**: Stateless API; lesson and progress read/write scale with DB and connection pool; usage increment is single row upsert per (user_id, period_key).

---

## 32. Analytics / Auditability

- **Events**: lesson_started, lesson_completed, lesson_abandoned, quiz_passed, quiz_failed, free_cap_reached. Include lesson_id, user_id (or hashed), level, score (if completed), duration_sec; no PII in event body.
- **Audit**: lesson_progress and completion stored for learning history and support (“show my progress,” “why didn’t I get XP”).
- **Funnel**: lesson_started → lesson_completed (completion rate); free_cap_reached (conversion trigger).

---

## 33. Example Journeys

**Journey A — First lesson of the day (free user, under cap)**  
1. User opens Learn; GET /lessons?level=A1 → 200, list.  
2. User taps “Food basics”; GET /lessons/42 → cap check: usage=2, cap=5 → 200, lesson + progress null.  
3. Client shows step 0 (intro); user taps Next; POST /progress/lesson { lesson_id: 42, step_index: 0, completed: false } → 200.  
4. Steps 1–3 (vocabulary, exercises); checkpoint each step.  
5. Step 4 (quiz); user answers; Submit; POST /progress/lesson { lesson_id: 42, step_index: 4, completed: true, score: 85.5, answers: [...] } → 200, { xp_awarded: 10, streak_updated: 3 }.  
6. Client shows summary; user taps “Next lesson.” Usage now 3/5.

**Journey B — Free user at cap**  
1. User has completed 5 lessons today. Taps “Greetings” (new lesson); GET /lessons/38 → cap check: usage=5, cap=5 → 403 free_cap_reached.  
2. Client shows CapReachedModal with “5/5 today,” “Upgrade” and “Come back tomorrow.”  
3. User does not call POST progress for this lesson; no usage increment.

**Journey C — Resume**  
1. User had left “Food basics” at step 2. Opens Home; sees “Continue: Food basics”; GET /progress/lessons → in_progress lesson_id=42, last_step_index=2.  
2. User taps Continue; GET /lessons/42 → 200 with progress { last_step_index: 2 }.  
3. Client renders from step 2 (or step 3); user continues to quiz and complete.  
4. POST complete → 200; usage incremented; XP and streak.

---

## 34. Extensibility

- **New lesson types**: Add template codes and structure_schema in Content; Lesson Engine renders steps by type (StepRenderer per type). No change to progress or cap logic.
- **New exercise types**: Add exercise_template codes and payload schema; frontend QuizQuestion (or StepRenderer) handles new type; backend grading may need new rule (exact_match, partial, ai_scored).
- **Cap by content type**: Future: different caps for “lesson” vs “review” vs “exam prep lesson”; extend usage schema (e.g. lessons_completed, review_sessions_completed) and cap config.
- **Adaptive difficulty**: Personalization can consume lesson_completed and score to suggest next level (stretch vs same vs review); Lesson Engine remains level-agnostic for storage; filter still by user level from Profile.
- **A/B tests**: Feature-flag cap value, retry policy, or step order; config-driven.

---

## 35. Testing Requirements

**Unit**  
- Cap logic: at cap → block start (403); under cap → allow.  
- Progress state: not_started → in_progress (first checkpoint); in_progress → completed (complete payload); idempotent complete (no double usage/XP).  
- Score validation: accept 0–100 or 0–1; reject negative or &gt; 100 if applicable.

**Integration**  
- GET /lessons: filter by level, topic, status=published; pagination.  
- GET /lessons/:id: 200 with content when under cap; 403 with usage when at cap; 404 for missing or draft.  
- POST /progress/lesson: checkpoint updates last_step_index; complete updates status, score, completed_at; usage incremented; Gamification and Personalization called (or mocked).  
- GET /progress/lessons: returns only current user; in_progress and completed.

**E2E**  
- Full lesson run: list → select → steps → quiz → submit → summary; progress and usage updated.  
- Resume: in_progress lesson → open → resume from step → complete.  
- Cap: complete until cap → next start returns 403 → modal; next day (or mock period) → start allowed again.

---

## 36. Recommended Implementation Phasing

- **Phase 1**: Catalog (GET /lessons, GET /lessons/:id) with level/topic filter and cap check; single lesson type (e.g. vocabulary_guided); lesson_progress checkpoint and complete; usage increment; Gamification award (sync or stub); 403 at cap; basic UI (list + run + summary + cap modal).  
- **Phase 2**: Quiz retry and show correct answers; resume from last_step_index; GET /progress/lessons and “Continue” on Home; Personalization activity-event and recommendations integration; analytics events.  
- **Phase 3**: Grammar lessons and mixed types; spaced repetition integration (recordCompletion, getDueForReview); topics and exam_tags in catalog; admin config for cap and period; optional progress history screen.

---

## 37. Summary

Core Lessons are the primary learning loop: CEFR-aligned vocabulary and grammar lessons with steps (intro, vocabulary, exercises, quiz), checkpointed progress, and completion-driven XP, streak, usage, and spaced repetition. Free-tier cap is enforced at lesson start (GET /lessons/:id); completion is idempotent and triggers downstream systems. This spec defines business behavior, state transitions, configuration, data model, APIs with example payloads, events, UI screens and components, UX and accessibility, frontend/backend technical design, example journeys, extensibility, and testing so that backend, frontend, QA, and product can implement and ship the feature with no ambiguity.
