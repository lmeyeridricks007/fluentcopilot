# CEFR curriculum path, learning plan & revision — feature overview

**Slug**: `cefr-curriculum-path`  
**Status**: Extension (builds on FD-01, FD-02, FD-10, E-14)  
**Instruction locale**: product/docs in English; target content remains nl-NL where applicable  
**Last updated**: 2026-03-25

---

## 1. Feature purpose

Give learners a **coherent CEFR-aligned journey**: they choose or confirm their **study level** (e.g. A2, B1), follow that level’s **ordered curriculum** (units and lessons), see a **suggested daily routine** (what to do today), have **progress saved continuously**, and return to **weak spots** via analytics on mistakes plus dedicated **revision** mixes—without replacing existing micro-lesson, quiz, gamification, or entitlement mechanics.

---

## 2. User / business value

| Stakeholder | Value |
|-------------|--------|
| **Learner** | Clear path (“what next?”), less choice overload, habit formation, visible progress, targeted remediation. |
| **Business** | Higher completion and D7/D30 retention; stronger justification for premium (deeper paths, more revision items); alignment with integration-exam positioning without copying proprietary materials. |

---

## 3. Fit within existing product

- **Onboarding (FD-01)** already collects current/target CEFR and goals; this feature makes **active study level** and **curriculum binding** explicit and editable.
- **Core lessons (FD-02)** remain the execution layer: same lesson run, checkpoints, quiz, cap enforcement.
- **Gamification (FD-10)** continues to consume **lesson_completed** (and related) events; optional bonus XP for “daily plan completed.”
- **Personalization / Home (E-14)** gains a primary signal: **curriculum next + daily queue** instead of only generic recommendations.
- **Exam prep (FD-09)** stays separate but can **cross-link** units by exam tags later.

Interim content source in-repo: `data/curriculum/{locale}/{CEFR}/` per `docs/curriculum/populating-level-curriculum.md`; production path: CMS/API with stable IDs.

---

## 4. Affected existing features

| Feature | Change |
|---------|--------|
| FD-01 Onboarding & profile | Optional step or settings: “Study at level X”; sync with `active_study_level`. |
| FD-02 Core lessons | Catalog filters default to path; lesson IDs stable across manifest and DB. |
| E-14 Home / recommendations | “Today’s plan,” “Continue path,” “Revision due.” |
| FD-10 Gamification | Optional events: `daily_plan_completed`, `revision_session_completed`. |
| FD-11 AI feedback | Optional CTA: “Add weak topic to revision queue.” |

---

## 5. New capabilities required

1. **Level selection (study context)** — Read/write `active_study_level` (must be compatible with profile `current_level` / `target_level` rules).
2. **Curriculum graph** — Manifest + units + ordered `lesson_ids`; API to fetch path for `(locale, level)`.
3. **User path state** — Which unit/lesson is next; unit completion derived from lesson_progress.
4. **Daily learning plan** — Configurable daily goal; server- or client-computed queue for the day; idempotent “mark today’s item done.”
5. **Weak-area model** — Store aggregates from quiz/exercise outcomes (topic, grammar_point_id, skill).
6. **Revision** — Generator for short exercise sets from prior content (deterministic draw from completed lessons); track revision attempts separately from first-pass lesson_progress if needed.

---

## 6. UI impact

| Area | Addition / change |
|------|-------------------|
| **Onboarding or Settings** | Level picker for “I am studying at …” with helper copy; warn if far above/below profile self-assessment. |
| **Learn / Home** | Tab or section: **My path** (unit list, progress ring per unit); **Today** (ordered cards); **Revision** entry. |
| **Lesson discovery** | Default tab = “Path”; keep “Browse all” as secondary. |
| **Post-lesson / quiz fail** | “Practice weak area” chip when tags exceed threshold. |
| **Progress page** | Path completion %, units done, revision streak. |

See `cefr-curriculum-path-impact-assessment.md` for file-level doc list; `docs/ui/ui-feature-implementation-plan.md` updated with a new row.

---

## 7. Backend impact

- **Lesson Engine** (or BFF): endpoints for curriculum manifest, user path state, daily plan snapshot, revision session create/submit.
- **Profile service**: `active_study_level` and pacing preferences.
- **Event pipeline**: emit normalized events for plan/revision for analytics and gamification.

Details: impact assessment §Backend.

---

## 8. Data impact

New or extended entities (see `docs/implementation/data-model.md` patch):

- Curriculum metadata (manifest, units, unit–lesson order) — content side.
- `user_curriculum_state`, `user_unit_progress` (or materialized from `lesson_progress`).
- `exercise_attempt` or extension of existing exercise results for **weak signals**.
- `revision_sessions` (optional) for analytics and cap logic.

No breaking change to existing `lesson_progress` PK `(user_id, lesson_id)`; path is additive.

---

## 9. Integration impact

- **CDN / CMS**: curriculum content ultimately served like lessons (media unchanged).
- **Analytics**: new events (`curriculum_level_set`, `unit_completed`, `daily_plan_item_done`, `revision_started`, `revision_completed`, `weak_area_practice_started`).
- **Entitlements**: optional premium gate on “extra revision sets per day” (product decision; default off in MVP extension).

Updated: `docs/integrations/deep-dives/per-feature/feature-integration-index.md`.

---

## 10. Demo data impact

- Wire **one level** (e.g. `nl-NL` / A2) from `data/curriculum/nl-NL/A2/` into mock catalog or codegen.
- Demo users: one **on path** mid-unit, one **completed unit**, one with **weak tags** and revision queue.

Updated: `docs/demo-data/demo-data-feature-map.md`.

---

## 11. Operational impact

- **Content ops**: publishing order changes require manifest/version bump; avoid reusing lesson IDs for different content.
- **Support**: users may confuse “profile level” vs “study level”; copy and tooltips must clarify.
- **Performance**: path endpoints should be cacheable per `(locale, level, manifest_version)`.

---

## 12. Risks / unknowns

| Risk | Mitigation |
|------|------------|
| Two “levels” confuse users | Single recommended level; profile = self-assessment, study = active path; smart defaults. |
| Curriculum JSON vs DB drift | `manifest.schema_version` + validation script; single importer. |
| Revision quality | Start with rule-based pulls from completed lessons; LLM generation later (optional). |
| Scope creep | Ship path + daily queue + weak list before advanced adaptive algorithm. |

---

## 13. Recommended next steps

1. Approve data model additions and API sketch (see impact assessment).
2. Implement **curriculum importer** from `data/curriculum/` → DB or read-through loader for dev.
3. UI: **My path** + **Today** on Home/Learn; Settings level control.
4. Backend: aggregate **weak signals** from existing quiz submit payload.
5. **Revision v1**: fixed-size quiz from past `exercise` templates linked to completed lessons.
6. E2E: onboarding → path → complete lesson → next auto → revision.

**Related artifacts**: [Deep-dive spec (implementation-grade)](../features/deep-dives/cefr-curriculum-path.md) · [Impact assessment](cefr-curriculum-path-impact-assessment.md) · [Final sign-off](final/cefr-curriculum-path-final.md)
