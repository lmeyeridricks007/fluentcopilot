# Implementation tasks: CEFR curriculum path (E-16)

**Stories**: CUR-01 … CUR-12 (see [cefr-curriculum-path-stories.md](cefr-curriculum-path-stories.md))  
**Complexity**: S = small (~0.5–1d), M = medium (~1–3d), L = large (>3d) — indicative only.

---

## Frontend tasks

| Task ID | Title | Description | Story | Deps | CX |
|---------|--------|-------------|-------|------|-----|
| CUR-F01 | Path tab on Learn | Add tabs **Path** \| **Browse** on `LessonDiscoveryPage`; mount `CurriculumPathView`. | CUR-04 | API client | M |
| CUR-F02 | CurriculumPathView | Accordion/list of units; lesson rows with status badge; highlight `next_lesson`; CTA opens `/app/learn/[id]`. | CUR-04 | CUR-F01 | M |
| CUR-F03 | TodayPlanSection (Home) | Fetch GET `/v1/curriculum/today`; render 1–3 cards; loading/empty; navigate to lesson. | CUR-05 | API client | M |
| CUR-F04 | StudyContextSettings | On `settings/profile`: level select, daily target; PATCH study-context; success/error toasts. | CUR-03 | CUR-F03 API | M |
| CUR-F05 | Feature flag wiring | Read `curriculum_path_enabled` from config/env; hide Path/Today/Weak/Revision when false. | CUR-10 | — | S |
| CUR-F06 | Quiz → exercise attempts | After quiz submit (or per question): POST exercise-attempt batch with `topic_tags` from exercise metadata if available. | CUR-06 | E-03 quiz UI | M |
| CUR-F07 | WeakAreasPanel | On Progress (and/or Learn): list tags from GET weak-areas; empty state; tap → revision or practice route. | CUR-07 | CUR-F08 optional | M |
| CUR-F08 | RevisionSessionPage | New route `/app/revision` or modal: load session exercises; reuse existing exercise/quiz components from lessons. | CUR-08 | CL-F04 patterns | L |
| CUR-F09 | Revision submit flow | POST submit; show score summary; optional XP line (if E-11 wired). | CUR-08 | CUR-F08 | S |
| CUR-F10 | Onboarding study confirm | Optional step: level confirm → PATCH study-context. | CUR-11 | Onboarding flow | S |
| CUR-F11 | TanStack Query hooks | `useCurriculumPath`, `useTodayPlan`, `useStudyContext`, `useWeakAreas`, `useRevisionSession` with staleTime for manifest cache. | All | — | M |

---

## Backend tasks

| Task ID | Title | Description | Story | Deps | CX |
|---------|--------|-------------|-------|------|-----|
| CUR-B01 | GET `/v1/curriculum/path` | Load manifest by user locale + active level; join lessons + lesson_progress; compute next + %; handle gaps (CUR-02). | CUR-02,04 | DB | L |
| CUR-B02 | GET `/v1/curriculum/today` | Build queue: in_progress first, then next path lessons; cap count by daily target; date in user TZ. | CUR-05 | CUR-B01 | M |
| CUR-B03 | GET/PATCH `/v1/users/me/study-context` | Upsert `user_curriculum_state`; validate manifest exists; invalidate Redis cache key. | CUR-03 | DB | M |
| CUR-B04 | POST `/v1/progress/exercise-attempt` | Validate lesson_id/exercise_id belong to user-accessible content; bulk insert attempts. | CUR-06 | DB | M |
| CUR-B05 | GET `/v1/curriculum/weak-areas` | Aggregate `exercise_attempts` by tag with threshold/lookback from config. | CUR-07 | DB | M |
| CUR-B06 | POST `/v1/revision/sessions` | Verify min completed lessons; sample exercises; insert `revision_sessions` row `in_progress`. | CUR-08 | DB, exercises | L |
| CUR-B07 | POST `/v1/revision/sessions/:id/submit` | Validate answers; score; insert attempts; update session; optional Gamification. | CUR-08 | CUR-B06 | M |
| CUR-B08 | Revision rate limit / entitlement | If config limits: check count per user per day before CUR-B06. | CUR-09 | E-13 | S |
| CUR-B09 | Manifest cache | Redis/cache TTL for manifest JSON by `(locale, level, version)`; bust on publish/import. | CUR-01 | Redis | S |
| CUR-B10 | Feature flag middleware | Route registration skips curriculum routes when flag off. | CUR-10 | Config | S |

---

## Database tasks

| Task ID | Title | Description | Story | CX |
|---------|--------|-------------|-------|-----|
| CUR-D01 | Migration: curriculum tables | Add `curriculum_manifests`, `curriculum_units`, `curriculum_unit_lessons` per `docs/implementation/data-model.md` §1A. | CUR-01 | M |
| CUR-D02 | Migration: user + attempts + revision | Add `user_curriculum_state`, `exercise_attempts`, `revision_sessions` + indexes (GIN tags optional). | CUR-03,06,08 | M |
| CUR-D03 | FK and uniqueness | Enforce unique `(curriculum_manifest_id, external_id)` on units; PK on unit_lessons. | CUR-01 | S |
| CUR-D04 | Seed alignment script | Map `data/curriculum/nl-NL/A2/` lesson JSON `id` → ensure `lessons.external_id` matches. | CUR-01 | M |

---

## Integration tasks

| Task ID | Title | Description | Story | CX |
|---------|--------|-------------|-------|-----|
| CUR-I01 | E-03 cap unchanged | Confirm GET `/lessons/:id` still sole gate for new lesson start; document revision bypass. | CUR-05,08 | S |
| CUR-I02 | E-11 optional events | Emit or call award on `revision_session_completed` / `daily_plan_completed` if product approves. | CUR-08,05 | S |
| CUR-I03 | Analytics | Wire `curriculum_path_viewed`, `study_context_updated`, `revision_session_completed`, etc. | CUR-10 | S |
| CUR-I04 | E-14 home payload (optional) | Extend BFF home response with `path_summary` + `today` if CUR-12 approved. | CUR-12 | M |

---

## Jobs / workers

| Task ID | Title | Description | Trigger | Story | CX |
|---------|--------|-------------|---------|-------|-----|
| CUR-J01 | Import job | CLI or admin: `import-curriculum --locale nl-NL --level A2 --dir ./data/curriculum/...` | Manual / CI | CUR-01 | M |
| CUR-J02 | Weak-area materialized view (optional) | Nightly refresh of tag aggregates if GET weak-areas too heavy. | Cron | CUR-07 | S |
| CUR-J03 | Stale revision cleanup | Abandon `in_progress` revision sessions older than N hours. | Cron | CUR-08 | S |

---

## Infrastructure / config

| Task ID | Title | Description | CX |
|---------|--------|-------------|-----|
| CUR-N01 | Config keys | `feature.curriculum_path_enabled`, weak-area threshold, revision exercise count, optional limits. | S |
| CUR-N02 | Env for dev | Point importer at local JSON; feature flag true in `.env.example` for devs. | S |

---

## Task dependency graph (simplified)

```
CUR-D01, CUR-D02 → CUR-B01 → CUR-B02, CUR-F01–F03
CUR-D04, CUR-J01 → CUR-B01
CUR-B03 → CUR-F04, CUR-F10
CUR-B04 → CUR-B05 → CUR-F07
CUR-B06 → CUR-B07 → CUR-F08–F09
CUR-N01, CUR-B10 → all routes
```
