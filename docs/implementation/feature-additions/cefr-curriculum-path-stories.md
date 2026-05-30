# User stories: CEFR curriculum path (E-16)

**Epic**: E-16  
**Source**: `docs/features/deep-dives/cefr-curriculum-path.md`

Story IDs: **CUR-xx**

---

## CUR-01: Import curriculum manifest into the system

**Title**: Publish ordered curriculum for a locale and CEFR level

**As a** content operator / engineer  
**I want** to load `manifest.json`, `units/*.json`, and lesson order into the database linked to published `lessons` rows  
**So that** the app can show a consistent path for each level.

**Acceptance criteria**

- [ ] Importer validates: every `lesson_id` in units resolves to a published `lessons` row by `external_id` + `locale` (or fails with actionable report).
- [ ] Tables `curriculum_manifests`, `curriculum_units`, `curriculum_unit_lessons` populated with `sort_order` preserved.
- [ ] Only one **published** active manifest per `(locale, cefr_level_id)` for app reads (or explicit `schema_version` selection rule documented).
- [ ] Re-import is idempotent or versioned (no duplicate units for same `external_id` on same manifest).

**Preconditions**: Seed or real `lessons` with matching `external_id` (e.g. `a2-u01-l01`).

**Postconditions**: GET `/v1/curriculum/path` can return non-empty `units` for that level.

---

## CUR-02: Resolve broken manifest references

**Title**: Fail gracefully when a lesson is missing from the manifest chain

**As a** learner  
**I want** the app not to crash if one slot in the path is unpublished  
**So that** I can still study the rest while content is fixed.

**Acceptance criteria**

- [ ] Path builder skips or flags lessons that are missing/not published; `next_lesson` points to first valid incomplete lesson after gap (product rule per deep-dive §20).
- [ ] Logs/alerts for content team when manifest references invalid `lesson_id`.

---

## CUR-03: Set and read active study level

**Title**: Choose the CEFR level I am studying at

**As a** learner  
**I want** to set my **active study level** (e.g. A2) separately from my profile self-assessment if needed  
**So that** my path matches what I am actually studying.

**Acceptance criteria**

- [ ] GET `/v1/users/me/study-context` returns `active_cefr_level`, `daily_lesson_target`, optional pacing.
- [ ] PATCH `/v1/users/me/study-context` validates level against published manifests; returns 400 for invalid; 404 if no manifest (optional message body).
- [ ] New user default: `active_cefr_level` = profile `current_level` when first path is loaded.
- [ ] Changing level does not delete `lesson_progress` for other levels.

---

## CUR-04: View my curriculum path

**Title**: See units and lesson order with progress

**As a** learner  
**I want** a **Path** view with units, lesson order, and done/not-done state  
**So that** I know where I am in the syllabus.

**Acceptance criteria**

- [ ] GET `/v1/curriculum/path` returns `units[]`, per-lesson progress (`not_started` | `in_progress` | `completed`), `next_lesson`, `path_percent_complete`.
- [ ] Progress is derived from `lesson_progress` only (no duplicate completion source).
- [ ] Learn screen shows **Path** tab when `curriculum_path_enabled` is true; hidden when false.

---

## CUR-05: See today’s suggested plan

**Title**: Daily queue of 1–3 lessons

**As a** learner  
**I want** **Today** on Home (and/or Learn) to list what to do now  
**So that** I can build a habit without deciding from the full catalog.

**Acceptance criteria**

- [ ] GET `/v1/curriculum/today` returns `plan_date` (user TZ or configured), `items[]` with `lesson_id`, `role` (`continue` | `next`), stable ordering rules per deep-dive §13.
- [ ] Respects `daily_lesson_target` from study-context.
- [ ] Tapping an item navigates to existing `/app/learn/[lessonId]` flow (E-03).
- [ ] Free cap still enforced by E-03 on each **new** lesson start.

---

## CUR-06: Record per-exercise outcomes

**Title**: Save quiz/exercise attempts for analytics and weak areas

**As a** product owner  
**I want** granular correct/incorrect per `exercise_id` with optional `topic_tags`  
**So that** we can surface weak areas and improve content.

**Acceptance criteria**

- [ ] POST `/v1/progress/exercise-attempt` accepts batch attempts with `context: lesson_run | revision_session`.
- [ ] Rows stored in `exercise_attempts` with `user_id`, `lesson_id`, `exercise_id`, `correct`, `topic_tags`, timestamps.
- [ ] Client sends attempts after quiz submit (E-03 completion may still send aggregate score only; attempts are additive).

---

## CUR-07: View weak areas

**Title**: See topics I miss often

**As a** learner  
**I want** a **Weak areas** list when I have enough wrong answers on a tag  
**So that** I can practice what I struggle with.

**Acceptance criteria**

- [ ] GET `/v1/curriculum/weak-areas` returns tags above configurable threshold within lookback window.
- [ ] Empty state when no data.
- [ ] Progress page (or Learn) shows list; tap navigates to practice flow (revision or filtered exercises — minimum: start revision biased to tag).

---

## CUR-08: Start and complete a revision session

**Title**: Mixed exercises from lessons I already completed

**As a** learner  
**I want** a short **revision** session drawn from past lessons  
**So that** I do not forget earlier material.

**Acceptance criteria**

- [ ] POST `/v1/revision/sessions` returns `session_id` and resolved `exercises[]` only from **completed** lessons’ exercise pools; deterministic sampling rule documented.
- [ ] POST `/v1/revision/sessions/:id/submit` scores, writes `exercise_attempts` with `revision_session` context, sets session `completed`.
- [ ] Revision flow does **not** set `lesson_progress` to completed for those lessons again.
- [ ] Revision does **not** increment `lessons_completed_count` (usage cap).

---

## CUR-09: Optional revision limits (premium)

**Title**: Gate extra revision by tier (if product enables)

**As a** business  
**I want** optional limits on revision sessions per day for free users  
**So that** premium has differentiation.

**Acceptance criteria**

- [ ] If config `revision.session.max_per_day_free` > 0: enforce 403 with clear code when exceeded.
- [ ] Premium/unlimited bypass per entitlement tier.
- [ ] If config 0: unlimited (default for MVP).

---

## CUR-10: Feature flag and observability

**Title**: Safely roll out curriculum path

**As a** engineer  
**I want** server and client feature flags  
**So that** we can disable path without breaking Learn.

**Acceptance criteria**

- [ ] When `curriculum_path_enabled=false`: path/today/revision endpoints 404 or omitted; Learn defaults to existing catalog-only UX.
- [ ] Analytics events from deep-dive §22 emitted with stable names (behind analytics provider).

---

## CUR-11: Onboarding study level confirmation (optional)

**Title**: Confirm study level at end of onboarding

**As a** new learner  
**I want** to confirm the level I will follow on the path  
**So that** my first Today is correct.

**Acceptance criteria**

- [ ] Optional step calls PATCH study-context with chosen level.
- [ ] Skip allowed; defaults still apply from profile.

---

## CUR-12: Home session integration (optional BFF)

**Title**: Reduce round-trips for Home

**As a** frontend  
**I want** path summary and today embedded in home payload (if E-14 extended)  
**So that** Home loads faster.

**Acceptance criteria**

- [ ] Documented contract extension on GET home session set OR parallel queries documented as acceptable for MVP.

---

## Traceability

| Story | Deep-dive § |
|-------|-------------|
| CUR-01–02 | §12, §20 |
| CUR-03 | §8, §10 PATH-BR-04 |
| CUR-04 | §7, §13, §14.1 |
| CUR-05 | §13, §14.2 |
| CUR-06 | §14.5, §12 |
| CUR-07 | §10 PATH-BR-06, §14 (weak) |
| CUR-08–09 | §14.6–14.7, §10 PATH-BR-05 |
| CUR-10 | §11, §22 |
| CUR-11–12 | §18, §24 |
