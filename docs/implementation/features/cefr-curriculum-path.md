# Feature: CEFR curriculum path, daily plan & revision (extension)

**Epic alignment**: Extends **E-02** (profile), **E-03** (core lessons), **E-14** (personalization).  
**Source (read in order)**:

1. **`docs/features/deep-dives/cefr-curriculum-path.md`** — implementation-grade spec (APIs, data, UI, phasing)
2. `docs/feature-extensions/cefr-curriculum-path-overview.md` — product narrative
3. `docs/feature-extensions/cefr-curriculum-path-impact-assessment.md` — file/module impact
4. `docs/feature-extensions/final/cefr-curriculum-path-final.md` — extension sign-off

---

## Purpose

Deliver a **level-bound curriculum** (ordered units and lessons), a **suggested daily routine**, **persisted progress** aligned with existing `lesson_progress`, **weak-area surfacing**, and **revision** sessions built from already completed lesson exercises—without replacing the lesson run, quiz, or entitlement flows.

---

## Scope

### In scope (MVP extension)

- User **study context**: `active_study_level` (e.g. A2) stored on profile or sibling table; validated against available curricula.
- **Curriculum read model**: manifest + units + ordered lesson references (`external_id` or `lessons.id`).
- **Path progress**: next lesson, unit completion % derived from `lesson_progress.status=completed`.
- **Daily plan**: small ordered list (e.g. 1–3 lessons) respecting caps and skips completed items.
- **Weak areas**: tags from incorrect quiz/exercise attempts; “Practice” launches targeted micro-drill or re-run lesson quiz subset.
- **Revision v1**: server picks N exercises from pools linked to completed lessons; single session record for analytics.

### Out of scope (later)

- Full adaptive scheduling (ML), proprietary exam clones, LLM-generated revision-only content.

---

## Dependencies

- **Auth**, **published lessons**, **lesson_progress**, **Entitlements** (unchanged rules), optional **Gamification** for bonus events.

---

## Acceptance criteria (high level)

- [ ] User can set **active study level**; catalog default shows **path** for that level.
- [ ] **Unit order** matches manifest; lesson order matches unit `lesson_ids`.
- [ ] Completing a lesson updates **path** and **unit** aggregate within one session read.
- [ ] **Today** shows at least one actionable card when path incomplete.
- [ ] **Quiz mistakes** contribute to a **weak area** list with threshold (e.g. ≥2 misses on same tag).
- [ ] **Revision** completes without creating duplicate `lesson_progress` completed rows (separate attempt table or sub-type).
- [ ] Feature flag disables path UI and falls back to flat discovery.

---

## Related docs

- **Epic, stories, tasks, QA, demo data**: `docs/implementation/feature-additions/cefr-curriculum-path-implementation-plan.md`
- Curriculum JSON authoring: `docs/curriculum/populating-level-curriculum.md`
- Data tables: `docs/implementation/data-model.md` §1A
