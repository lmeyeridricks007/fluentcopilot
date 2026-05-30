# Implementation API Contracts

**Source**: docs/features/deep-dives/final/core-lessons.md, docs/features/deep-dives/cefr-curriculum-path.md (§1A), entitlement sub-features, docs/final/backend-architecture.md

All endpoints require authentication unless noted. Base path: `/v1`. Use JSON request/response. Auth: Bearer token (session or JWT).

---

## 1. Core Lessons

### 1.1 GET /v1/lessons

**Purpose**: List published lessons for catalog. No cap check.

**Auth**: Required (for progress badges). Optional for public catalog.

**Query**:

| Param | Type | Default | Description |
|-------|------|--------|-------------|
| level | string | — | CEFR code (A0, A1, A2, …) |
| topic | string | — | Topic slug |
| exam_tag | string | — | e.g. A2, KNM |
| limit | int | 20 | Max 100 |
| offset | int | 0 | Pagination |
| sort | string | recommended | recommended \| level \| topic \| recent |

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

**Errors**: 401 Unauthorized if auth required and missing/invalid.

---

### 1.2 GET /v1/lessons/:id

**Purpose**: Get lesson content for run or resume. **Cap check** for free user on new start (no in_progress); at cap → 403.

**Auth**: Required.

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
    {
      "id": 201,
      "template_code": "multiple_choice",
      "payload": {
        "question": { "text": "Wat eet je?" },
        "options": [
          { "id": "A", "text": "Brood" },
          { "id": "B", "text": "Water" }
        ],
        "correct_option_id": "A"
      }
    }
  ],
  "progress": {
    "status": "in_progress",
    "last_step_index": 1,
    "score": null
  }
}
```

**Response**: 403 Forbidden (free user at cap)

```json
{
  "error": {
    "code": "free_cap_reached",
    "message": "You've reached your daily lesson limit. Upgrade for unlimited or come back tomorrow."
  },
  "usage": { "lessons_today": 5, "lessons_cap": 5 }
}
```

**Response**: 404 Not Found — lesson missing or not published.

---

### 1.3 POST /v1/progress/lesson

**Purpose**: Checkpoint or complete lesson.

**Auth**: Required.

**Request (checkpoint)**:

```json
{
  "lesson_id": 42,
  "step_index": 2,
  "completed": false
}
```

**Response**: 200 OK

```json
{ "saved": true }
```

**Request (complete)**:

```json
{
  "lesson_id": 42,
  "step_index": 4,
  "completed": true,
  "score": 85.5,
  "answers": [
    { "exercise_id": 301, "selected_option_id": "B" },
    { "exercise_id": 302, "answer": "brood" }
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

**Validation**: lesson_id required; if completed=true, score required (0–100). 400 if invalid. Idempotent: second complete for same (user_id, lesson_id) returns 200 with existing data; no double usage/XP.

**Errors**: 400 Bad Request (missing/invalid), 404 Lesson not found.

---

### 1.4 GET /v1/progress/lessons

**Purpose**: List current user's lesson progress (Continue + history).

**Auth**: Required.

**Query**: status (in_progress | completed), limit (default 50), offset (default 0).

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

## 1A. CEFR curriculum path (extension)

**Source**: `docs/features/deep-dives/cefr-curriculum-path.md` §14 (full schemas and examples).

**Auth**: Required for all routes below unless feature flag `curriculum_path_enabled` disables the module (return 404 or omit from gateway).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/curriculum/path` | Manifest + units + lesson order + progress overlay; `next_lesson`, `path_percent_complete` |
| GET | `/v1/curriculum/today` | Daily queue (`plan_date`, `items[]`) |
| GET | `/v1/users/me/study-context` | `active_cefr_level`, `daily_lesson_target`, pacing |
| PATCH | `/v1/users/me/study-context` | Update study level / daily target |
| GET | `/v1/curriculum/weak-areas` | Aggregated weak tags (optional query: threshold) |
| POST | `/v1/progress/exercise-attempt` | Record per-exercise outcomes for weak-area model |
| POST | `/v1/revision/sessions` | Create revision session + exercise payloads |
| POST | `/v1/revision/sessions/:id/submit` | Submit answers; complete session |

**Errors**: 404 (no published manifest for level), 400 (validation), 403 (optional revision limit), 401.

---

## 2. Entitlements & Subscription

### 2.1 GET /v1/entitlements

**Purpose**: Current user's tier, trial/subscription end dates, usage, manage URL.

**Auth**: Required.

**Response**: 200 OK

```json
{
  "tier": "free",
  "trial_ends_at": null,
  "subscription_ends_at": null,
  "usage": {
    "lessons_today": 3,
    "lessons_cap": 5,
    "scenarios_week": 1,
    "scenarios_cap": 3
  },
  "manage_url": null
}
```

For premium: `tier`: "premium", `subscription_ends_at`: ISO 8601, `manage_url`: URL to payment provider portal.

**Caching**: Allowed (e.g. 5 min TTL). Invalidated on webhook and trial/start.

---

### 2.2 POST /v1/entitlements/trial/start

**Purpose**: Start free trial (e.g. 7 days).

**Auth**: Required.

**Request**: Empty body or `{}`.

**Response**: 200 OK

```json
{ "trial_ends_at": "2025-03-21T12:00:00Z" }
```

**Errors**: 400 Bad Request — trial already used.

---

### 2.3 POST /v1/webhooks/payments/:provider

**Purpose**: Receive payment provider webhooks (e.g. Stripe). Not called by frontend; provider calls with signature.

**Auth**: Provider signature verification (e.g. Stripe-Signature + WEBHOOK_SECRET). No Bearer.

**Request**: Raw body (provider-specific). Idempotent by event id or external_id.

**Response**: 200 OK (quick response; process sync or async).

**Errors**: 401 if signature invalid.

---

## 3. Authentication (reference)

- **POST /v1/auth/signup** — email, password (and optional OAuth link).
- **POST /v1/auth/login** — email, password or OAuth; returns session/token.
- **POST /v1/auth/logout** — invalidate session.
- **GET /v1/me** — current user and optional profile, entitlements summary.

---

## 4. Error Response Format

Standard error body:

```json
{
  "error": {
    "code": "free_cap_reached",
    "message": "Human-readable message."
  },
  "usage": { ... }
}
```

Codes: `free_cap_reached`, `unauthorized`, `forbidden`, `not_found`, `validation_error`, `conflict`.

**HTTP**: 400 validation, 401 unauthorized, 403 forbidden (e.g. cap), 404 not found, 409 conflict.
