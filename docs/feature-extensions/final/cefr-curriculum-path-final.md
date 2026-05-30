# Final — CEFR curriculum path extension

**Date**: 2026-03-25  
**Status**: **Approved** for engineering planning and phased implementation

## Summary scores (from review v2)

- Product fit, completeness, architectural consistency, implementation usefulness, change impact clarity: **all ≥ 9/10**
- **Confidence**: **96%**

## Product-level delta (what changes for the product)

Learners get a **structured CEFR path** with **daily guidance**, **saved progress** (existing mechanism + aggregates), **weak-area practice**, and **revision sessions**, implemented as an **extension** to onboarding, core lessons, and home recommendations—not a replacement lesson runtime.

## Primary artifacts

| Artifact | Path |
|----------|------|
| Overview | [../cefr-curriculum-path-overview.md](../cefr-curriculum-path-overview.md) |
| Impact assessment | [../cefr-curriculum-path-impact-assessment.md](../cefr-curriculum-path-impact-assessment.md) |
| Implementation checklist | [../../implementation/features/cefr-curriculum-path.md](../../implementation/features/cefr-curriculum-path.md) |

## Implementation sequencing (recommended)

1. **Schema + importer**: `curriculum_manifests`, `curriculum_units`, `curriculum_unit_lessons` + seed from `data/curriculum/nl-NL/A2/`.
2. **Profile**: `active_study_level`, optional `daily_lesson_target`.
3. **API**: `GET /v1/curriculum/path`, `GET /v1/curriculum/today`, `PATCH /v1/users/me/study-context`.
4. **UI**: Settings level; Learn “My path”; Home “Today”.
5. **Weak signals**: persist per-item outcomes on quiz submit → aggregate view.
6. **Revision**: `POST /v1/revision/sessions` (draw from completed lesson exercises).

## Rollout

- Feature flag: `curriculum_path_enabled`.
- Default **off** until importer verified; then **on** for internal/staging.

## Sign-off chain

- Review v1 → improvements → Review v2 (threshold met) → Audit pass → this final.
