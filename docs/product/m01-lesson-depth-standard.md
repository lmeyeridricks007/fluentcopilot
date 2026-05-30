# Module 1 (People & daily rhythm) — lesson depth standard (A2.1)

| Attribute | Value |
|-----------|--------|
| Status | **Reference** for Stage 5 content in `a2-m01-people-daily` |
| Band | A2.1 — Survival Expansion |
| Target time-on-task | **10–15 minutes** real use (not copy length) |
| Target micro-interactions | **28–38** per lesson (taps, choices, reorders, fills, speaks, recap tasks) |

## Pedagogical spine (every lesson)

Lessons must **not** be one-pass. Each follows a **looping spine**:

1. **Warm-up / preview** — orient; 2+ interactions (preview cards, recognition).
2. **Input** — listen/read/dialogue; gist → detail where possible.
3. **Guided noticing** — discovery phrases, pattern taps, short grammar card.
4. **Controlled practice** — `practice_loop` and/or dedicated `mcq` / `fill_blank` / `reorder` with **escalating** difficulty.
5. **Production** — `speaking` and/or `writing` / `scenario_chat` with scaffolding.
6. **Recap** — `recap` with **≥5** mixed tasks when possible (`listen_mcq`, `fill_blank`, `reorder`, `speak`).

Depth comes from **retrieval, variation, and transformation** — not long instructions.

## Engine constraints (this repo)

- Step types are the **typed union** in `lessonStep.schema.ts` (`preview`, `listening`, `listen_read`, `discovery`, `grammar_card`, `mcq`, `practice_loop`, `reorder`, `fill_blank`, `speaking`, `writing`, `scenario_chat`, `recap`).
- “Keyword spotting”, “phrase match”, “transform” are expressed as **`multiple_choice` / `fill_blank` / `reorder`** inside `listening` or `practice_loop`, not separate schema types (until the union is extended project-wide).
- `practice_loop` supports `multiple_choice`, `reorder`, `fill_blank` only (`LessonStepRenderer`).

## Duration metadata

- `durationEstimate` is aligned with **step count + interaction density**, not inflated by filler text.
- Module 1 lessons use **14** minutes ( **`16`** for the mixed review lesson) as the default band after the depth upgrade.

## Version tag

Lessons may include `lesson.metadata.lessonDepth = { "m01": "v2", "targetMicroInteractions": "28-38" }` after upgrade for QA and future generators.

## Applying the same pattern to Modules 2–12

1. Audit micro-interactions per lesson (preview taps, MCQs in multi-round listening, `practice_loop` length, recap tasks).
2. Insert a **second controlled-practice loop** or expand `practice_loop` before recap.
3. Ensure **output** (speak/write/task) appears **after** sufficient controlled practice.
4. Run `npm run validate-content` with `--module` and `--review`; refresh `content/review-items/*.json` when IDs change.
