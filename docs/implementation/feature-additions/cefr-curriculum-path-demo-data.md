# Demo data requirements: CEFR curriculum path (E-16)

**Source**: `docs/features/deep-dives/cefr-curriculum-path.md`, `data/curriculum/nl-NL/A2/`

---

## Objectives

1. Local/staging demos show **Path**, **Today**, **weak areas**, and **revision** without production CMS.
2. Lesson cards in UI use the same **stable IDs** as curriculum JSON (`external_id` = e.g. `a2-u01-l01`).

---

## Data sets

### D1 — Published lessons aligned to A2 JSON

| Requirement | Detail |
|-------------|--------|
| **Source** | Import or codegen from `data/curriculum/nl-NL/A2/lessons/*.json` `catalog` block + map to `DemoLesson` / DB `lessons` |
| **Count** | At minimum all lesson ids referenced in `units/a2-u0x.json` (24 for current A2 pack) |
| **Fields** | `external_id` = JSON `id`; `cefr_level` = A2; `status` = published |
| **content_payload** | Stub acceptable for demo if run screen minimal; prefer 1–3 fully wired lessons for E2E |

### D2 — Curriculum graph in DB (or mock API)

| Requirement | Detail |
|-------------|--------|
| **Manifest** | One row for `nl-NL` + A2 matching `manifest.json` |
| **Units** | Six units `a2-u01` … `a2-u06` with `sort_order` |
| **Unit–lesson links** | `curriculum_unit_lessons` rows matching each unit’s `lesson_ids` order |

### D3 — Demo users (Zustand / `demoUsers` or seed)

| User profile | Purpose |
|--------------|---------|
| **path_new** | No `lesson_progress`; Path shows all not_started; Today shows first 2 |
| **path_mid** | `in_progress` on `a2-u01-l02`; first lesson completed |
| **path_cap** | Free tier at cap; Today shows new lesson → 403 on start |
| **path_weak** | Seeded `exercise_attempts` with wrong answers on tag `present_tense` ≥ threshold |
| **path_revision_ready** | ≥2 completed lessons with exercises; revision session creatable |

### D4 — `user_curriculum_state`

| Field | Demo value |
|-------|------------|
| `active_cefr_level_id` | A2 |
| `daily_lesson_target` | 2 |
| `curriculum_manifest_id` | FK to seeded manifest |

### D5 — Feature flag

| Environment | Value |
|-------------|--------|
| Local dev | `curriculum_path_enabled=true` in env or mock config |
| Storybook / tests | Toggle fixture |

---

## Mock vs DB strategy

| Layer | Recommendation |
|-------|----------------|
| **MVP UI** | Mock handlers in `src/mocks/` returning fixtures from JSON until API exists |
| **Integration** | Seed PostgreSQL via migration + SQL script after CUR-D01–D04 |
| **E2E** | Use `path_mid` user against staging API |

---

## Validation checklist

- [ ] Every `lesson_id` in `units/*.json` exists as `lessons.external_id` (locale `nl-NL`).
- [ ] `manifest.unit_order` matches unit rows’ order.
- [ ] No orphan `curriculum_unit_lessons.lesson_id`.

---

## Files to touch (typical)

| Area | File / pattern |
|------|----------------|
| Demo lessons | `src/demo-data/factories/lessonFactory.ts` or new `curriculumLessonFactory.ts` |
| API mocks | `src/mocks/lessons.ts`, new `src/mocks/curriculum.ts` |
| Users | `src/features/auth/mocks/demoUsers.ts` |

---

## Related doc

- `docs/demo-data/demo-data-feature-map.md` (row for curriculum path)
