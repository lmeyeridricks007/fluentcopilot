# Implementation Tasks: Core Lessons (E-03)

**Feature**: Core Lessons  
**Stories**: CL-01 through CL-08

Tasks are categorized and include inputs, outputs, dependencies, and estimated complexity (S/M/L).

---

## Frontend Tasks

| Task ID | Task Title | Description | Inputs | Outputs | Dependencies | Complexity |
|---------|------------|-------------|--------|---------|--------------|------------|
| CL-F01 | LessonListScreen | Implement Learn/catalog screen: call GET /v1/lessons with level, topic, exam_tag, limit, offset, sort; render LessonCard grid/list with title, level, topic, duration, in_progress/completed badges. | Query params from filter bar; auth token | Rendered list; loading/error states | Design tokens; API contract | M |
| CL-F02 | FilterBar component | Level dropdown (CEFR), topic chips, exam_tag filter, sort (recommended/level/topic/recent). Persist filters in URL or state. | User selections | Updated list request | CL-F01 | S |
| CL-F03 | LessonRunScreen | Load GET /v1/lessons/:id on mount; handle 403 free_cap_reached (show CapReachedModal); handle 404 (redirect to list). Render steps from content_payload; resolve exercises by id. | lesson_id from route; auth | Rendered steps; progress bar; cap modal | CL-F01; StepRenderer | L |
| CL-F04 | StepRenderer | Render step types: intro, vocabulary_list, example_sentences, exercise_block, quiz. For exercise_block and quiz load exercise payload from lesson response. | content_payload.steps; exercises[] | Rendered step UI | CL-F03 | M |
| CL-F05 | Checkpoint on step change | On step transition (Next), call POST /v1/progress/lesson { lesson_id, step_index, completed: false }. Debounce if rapid navigation (e.g. 300ms). Show retry on network error. | lesson_id, current step_index | Progress saved; optional toast | CL-F03; Progress API | S |
| CL-F06 | Quiz step UI | Display quiz questions (from exercises); collect answers; compute score client-side or submit to backend; if score < pass_threshold and retry_count=0 show "Try again"; on second fail or pass show correct answers then Continue. Submit single POST complete with final score. | exercise payloads; user answers | Score; optional retry; completion request | CL-F04 | M |
| CL-F07 | LessonSummaryScreen | After POST complete 200: show score, XP awarded, streak; primary CTA "Next lesson" or "Back to Learn"; optional "Review answers". | Completion response (score, xp_awarded, streak_updated) | Summary view | CL-F03 | S |
| CL-F08 | CapReachedModal | On 403 free_cap_reached: show message "You've reached your daily limit (X/Y lessons)"; primary "Upgrade"; secondary "Come back tomorrow". Dismiss to return to list. | error body (usage.lessons_today, lessons_cap) | Modal; navigation to paywall | Entitlements UI | S |
| CL-F09 | Continue / Home progress | On Home/Learn: GET /v1/progress/lessons?status=in_progress; show "Continue [Lesson title]" card; tap opens LessonRunScreen (resume). Optionally show recent completed. | — | Continue card; link to lesson | Progress API | S |
| CL-F10 | Flashcards step / standalone | Render flashcard step (vocabulary_refs); flip animation; optional "Know / Don't know" for SR. Standalone review: load due items from SR API; same card UI. | vocabulary_refs or due items | Card stack UI; record recall (optional) | CL-F04; SR API | M |

---

## Backend Tasks

| Task ID | Task Title | Description | Inputs | Outputs | Dependencies | Complexity |
|---------|------------|-------------|--------|---------|--------------|------------|
| CL-B01 | GET /v1/lessons handler | List published lessons: filter by level, topic, exam_tag; paginate (limit, offset); sort; join lesson_progress for current user (in_progress, completed). Return lessons[] and total. | Query params; user_id | 200 + JSON | lessons table; lesson_progress | M |
| CL-B02 | GET /v1/lessons/:id handler | Load lesson by id; ensure status=published else 404. If free user and no in_progress for (user_id, lesson_id): call Entitlements cap check; if at cap return 403 free_cap_reached with usage. Else load content_payload and exercises by ids; attach progress if exists. Return 200. | lesson_id; user_id | 200 + lesson + progress, or 403, or 404 | lessons; exercises; lesson_progress; Entitlements | M |
| CL-B03 | POST /v1/progress/lesson handler (checkpoint) | Validate lesson_id, step_index (within steps length or clamp). Upsert lesson_progress: user_id, lesson_id, status=in_progress, last_step_index=step_index. Return 200 { saved: true }. | Body (lesson_id, step_index, completed: false); user_id | 200 | lesson_progress; lessons (validate) | S |
| CL-B04 | POST /v1/progress/lesson handler (complete) | Validate lesson_id, completed=true, score (required, 0–100). If lesson_progress already completed for (user_id, lesson_id): return 200 idempotent with existing score; no usage/XP. Else in transaction: (1) upsert lesson_progress status=completed, score, completed_at; (2) increment usage_counts for (user_id, period_key); (3) call Gamification.award; (4) call Personalization activity-event; (5) optional SR recordCompletion. Return 200 with score, xp_awarded?, streak_updated?. | Body (lesson_id, completed, score, answers?); user_id | 200 or 400 | lesson_progress; usage_counts; Gamification; Personalization | L |
| CL-B05 | GET /v1/progress/lessons handler | List lesson_progress for user_id; optional filter status=in_progress|completed; include lesson title (join or lookup). Return progress[] with lesson_id, lesson_title, status, last_step_index, score, completed_at, updated_at. | user_id; query status, limit, offset | 200 + progress[] | lesson_progress; lessons | S |
| CL-B06 | Period key resolution | Resolve period_key for "today" (or week) from config (period_type, timezone). Used by cap check and usage increment. | user_id (timezone from profile or UTC); config | period_key string | Config; profile | S |
| CL-B07 | Idempotent complete and downstream retry | Ensure second POST complete for same (user_id, lesson_id) does not double-increment usage or double-award XP. If Gamification/Personalization fail after DB commit: log; optionally enqueue retry job. | Completion request | No double write | DB transaction; optional queue | M |

---

## Database Tasks

| Task ID | Task Title | Description | Inputs | Outputs | Dependencies | Complexity |
|---------|------------|-------------|--------|---------|--------------|------------|
| CL-D01 | lessons table and indexes | Ensure lessons table: id, locale, lesson_template_id, external_id, title, title_key, cefr_level_id, topic, topic_tags, exam_tags, content_payload (JSONB), status, version, published_at, created_at, updated_at. Indexes: (locale, cefr_level_id), (locale, status), (external_id, locale), GIN(topic_tags), GIN(exam_tags). | Schema spec | Migrations | — | M |
| CL-D02 | lesson_progress table and indexes | Table: user_id, lesson_id (PK composite), status, last_step_index, score, completed_at, created_at, updated_at. Unique (user_id, lesson_id). Index (user_id, status) for Continue and history. | Schema spec | Migrations | — | S |
| CL-D03 | usage_counts table (or shared with Entitlements) | Table: user_id, period_key (composite PK), lessons_completed_count, scenarios_completed_count?, updated_at. Unique (user_id, period_key). Used for cap and GET entitlements. | Schema spec | Migrations | — | S |
| CL-D04 | exercises table reference | Ensure exercises table exists and is joinable by ids from content_payload; include template_code, payload (JSONB). | Content schema | Migrations | — | S |
| CL-D05 | Seed published lessons | Insert 5–10 published lessons (A0–A2); at least 2 lesson types (vocabulary_guided, grammar_guided); valid content_payload with steps and exercise_ids; link to seed exercises. | Seed spec | Seed SQL or script | CL-D01; exercises | M |

---

## Integration Tasks

| Task ID | Task Title | Description | Inputs | Outputs | Dependencies | Complexity |
|---------|------------|-------------|--------|---------|--------------|------------|
| CL-I01 | Entitlements: get tier and usage | Before returning lesson in GET /lessons/:id (new start): call Entitlements GET /v1/entitlements or internal getTierAndUsage(user_id). Compare lessons_today vs lessons_cap; if free and >= cap return 403. | user_id | tier; usage (lessons_today, lessons_cap) | Entitlements service | S |
| CL-I02 | Entitlements: increment usage | On lesson complete: call Entitlements incrementUsage(user_id, period_key, "lessons") or internal increment. Must be idempotent when complete is idempotent. | user_id; period_key | — | Entitlements service; CL-B04 | S |
| CL-I03 | Gamification: award on complete | On lesson complete (first time): call Gamification.award(user_id, { activity_type: "lesson", lesson_id, score }). Receive xp_awarded, streak_updated for response. | user_id; lesson_id; score | xp_awarded; streak_updated | Gamification service | S |
| CL-I04 | Personalization: activity-event | On lesson complete: POST /activity-event or internal record { event_type: "lesson_completed", lesson_id, score, completed_at }. | user_id; lesson_id; score; completed_at | 202 accepted | Personalization service | S |
| CL-I05 | Spaced Repetition: recordCompletion | Optional: on lesson complete call SR.recordCompletion(user_id, lesson_id) or POST to SR API for vocabulary/items in lesson. | user_id; lesson_id; optional item_ids | — | SR service | S |

---

## Background Jobs / Workers

| Task ID | Task Title | Description | Trigger | Processing | Output | Failure / Retry | Complexity |
|---------|------------|-------------|---------|-------------|--------|-----------------|------------|
| CL-J01 | Downstream completion retry | If Gamification or Personalization fails after DB commit for lesson complete, enqueue job with (user_id, lesson_id, score, completed_at). Job retries award and activity-event; no double usage (already incremented). | Async after complete | Call Gamification.award; Personalization activity-event | Updated XP/streak; activity recorded | Retry 3x with backoff; dead-letter log | S |

---

## Infrastructure Tasks

| Task ID | Task Title | Description | Inputs | Outputs | Dependencies | Complexity |
|---------|------------|-------------|--------|---------|--------------|------------|
| CL-N01 | Config for cap and period | Expose free_tier.lessons_cap_per_period, free_tier.period_type (day\|week), free_tier.period_timezone (user\|UTC), catalog.level_filter (strict\|stretch_1). Load in Lesson Engine at runtime. | Config store or env | Config object | Config service | S |
| CL-N02 | Feature flag for lesson cap | Optional: feature flag to disable cap (e.g. launch promo). When enabled, GET /lessons/:id never returns 403 free_cap_reached. | Flag service | Boolean | Feature flags | S |
