# Module generation retrospective — Stage 6 (A2-m01 People & daily rhythm)

This document captures what worked, what failed, and what was tightened before scaling to more modules (Stage 7).

## Reference module

- **Module id:** `a2-m01-people-daily`
- **Band:** A2.1 — Survival Expansion
- **Lessons:** 11 (single coherent spine: input → patterns → practice → speaking → variation → pattern → writing-proxy → tasks → mixed review)
- **Builder:** `tools/build-stage6-a2-m01-module.ts` (writes `content/modules/a2-m01-people-daily/module.json`)

## What worked

- **Schema-first loop:** `moduleSchema` validation in the builder catches structural mistakes before JSON lands in `content/`.
- **Review pipeline:** `tools/extract-review-items.ts` with `--patch-module` produces `content/review-items/a2-m01-people-daily.json` and aligns `reviewItemRefs` on lessons (~93 items for this module).
- **Course manifest:** `content/courses/nl-a2/course.manifest.json` resolves the module path; `npm run validate-content -- --manifest … --review …` gives a single **OK** gate for the sample course shell.
- **Lesson player alignment:** `LessonPlayer` loads the module and targets **`a2-m01-l01-listening-friendly-chats-gist`** (the renamed L01), not the old schema sample id.
- **Player-safe step types:** Lessons use only step types supported by `LessonStepRenderer` (no `writing` / `scenario_chat` *steps* until those renderers exist; `lessonType` may still be `writing` / `task` for pedagogy metadata).

## What did not (first pass)

1. **Pedagogy validator (PEDAGOGY_OUTPUT):** `a2-m01-l07-grammar-zijn-hebben` had productive practice only inside `recap`, which does not count as an output step in `contentValidator` (`OUTPUT_STEP_TYPES` = speaking | writing | scenario_chat at **step** level). **Fix:** add a dedicated `speaking` step before the recap in that lesson (rebuild script).
2. **Reorder typo:** L10 reorder tokens included `doet` instead of `doe` for *Wat doe je dit weekend?* **Fix:** corrected token list in the builder.
3. **Vocab POS / examples:** `partOfSpeech: 'adj'` is inconsistent with other lemmas (`adjective`). Example for *leuk* was not idiomatic. **Fix:** use `adjective` and *Leuk om je te zien.*
4. **Builder idempotency:** After L01 was renamed on disk, `build-stage6-a2-m01-module.ts` still required `schema-people-daily-chat-01` as the seed lesson and crashed on re-run. **Fix:** accept either the legacy seed id or `a2-m01-l01-listening-friendly-chats-gist`, and skip `prefixLessonIds` when the lesson is already prefixed.
5. **CLI ergonomics:** `extract-review-items.ts` expects the **module file path** as the first positional argument (`--module` is not a supported flag and was misread as a filename).

## Generator / prompts / rules refined

| Area | Change |
|------|--------|
| `lessonPromptTemplates.ts` | Clarified that productive steps must be **top-level** `speaking` \| `writing` \| `scenario_chat`; recap micro-tasks do **not** satisfy the output requirement. |
| `qaPromptTemplates.ts` | Module and lesson audit prompts now explicitly check for top-level output vs recap-only. |
| `tools/build-stage6-a2-m01-module.ts` | Idempotent L01 seeding; L07 speaking step; reorder fix; vocab fixes. |
| `LessonPlayer.tsx` | Default lesson id updated to L01 final id. |

## Validation commands (runbook)

```bash
# Regenerate module JSON from the Stage 6 builder
npx tsx --tsconfig tsconfig.json tools/build-stage6-a2-m01-module.ts

# Extract review items + patch lesson refs
npx tsx --tsconfig tsconfig.json tools/extract-review-items.ts \
  content/modules/a2-m01-people-daily/module.json \
  --out content/review-items/a2-m01-people-daily.json \
  --patch-module

# Gate: manifest + review (+ optional module path for deeper checks)
npm run validate-content -- \
  --manifest content/courses/nl-a2/course.manifest.json \
  --review content/review-items/a2-m01-people-daily.json

# LLM/human audit prompt
npm run content:audit-module
```

## What to watch in Stage 7

- **Writing / chat steps:** Until UI supports `writing` and `scenario_chat` steps, keep using supported step types with honest `lessonType` / `metadata` notes where needed.
- **PEDAGOGY_OUTPUT:** Any grammar-heavy `pattern` lesson still needs at least one **step**-level speaking (or writing/scenario when available), not only recap.
- **Reorder correctness:** Token lists must match intended Dutch surface forms (verb person/number, punctuation).
- **Re-running builders:** Prefer idempotent seeds or dedicated `content/seeds/*.json` files so regeneration does not depend on obsolete lesson ids.

## Recommended next step

**Stage 7:** Generate the next 2–3 modules with the same pipeline (builder or LLM + validate + extract + audit), reusing `a2-m01-people-daily` as the quality bar and extending manifests incrementally.
