# Cursor prompt: implement A2 curriculum improvements

**How to use:** Open a **new Cursor chat**, set the workspace to this repo root, paste **everything from “You are working…” through the checklist** (or attach this file). For background and rationale, read [`a2-feedback-response-and-implementation-prompt.md`](../a2-feedback-response-and-implementation-prompt.md) (sections 2–5).

---

You are working in the `language-tutor` repo. Goal: implement the A2 curriculum improvements described in `docs/curriculum/a2-feedback-response-and-implementation-prompt.md` (sections 2–5), in safe incremental PR-sized steps.

## Constraints

- Do not break existing lesson loading: `catalog.bundle.json` remains the runtime source; `a2Catalog.ts` imports it.
- Prefer **backward-compatible optional JSON fields** so old bundles still parse.
- Match existing naming: locale `nl-NL`, lesson ids stable (`a2-uXX-lYY` style). Avoid renumbering published IDs; add new IDs if splitting lessons.
- After schema/content changes, run `python3 scripts/generate_a2_nl_curriculum.py` (or the project’s documented command) and ensure `npm run build` passes.

## Phase 0 — Documentation & schema sketch

1. Add `docs/curriculum/a2-grammar-spine.md` defining:
   - Ordered grammar milestones for A2.1, A2.2, A2.3 (present recap + modals; perfectum + word order; subordinate clauses + opinions + future consolidation).
   - For each milestone: “introduced in / recycled in” guidance and example Dutch patterns (no copyrighted textbook paste).
2. Update `docs/curriculum/populating-level-curriculum.md` §4 JSON examples to include OPTIONAL fields:
   - `manifest`: `a2_bands` or per-unit `a2_band: "A2.1"|"A2.2"|"A2.3"`.
   - `units`: ensure `objectives_can_do` is required for new authoring; add optional `integration_scripts_summary` (short).
   - `lessons`: `pedagogy.can_do_outcomes: string[]` (2–4 bullets).
   - `lesson_plan.steps[]`: optional `skill_focus: "listening"|"reading"|"speaking"|"writing"|"grammar"|"review"|"mixed"`; optional `listening_level: "slow"|"natural_slow"|"natural"`; optional `recycle_lemmas: string[]`; optional `common_error_tags: string[]`.
3. Extend TypeScript types in `src/demo-data/curriculum/a2Catalog.ts` for all optional fields (use `?.` throughout consumers).

## Phase 1 — Generator & content alignment

1. Open `scripts/generate_a2_nl_curriculum.py` and `scripts/a2_learner_content.py` (and any related modules). Wire new optional fields through to `catalog.bundle.json`.
2. Implement **validation** in the generator (fail or warn):
   - Every lesson must have `can_do_outcomes` OR inherit from unit (define rule explicitly).
   - Every lesson must declare `grammar_primary` matching a spine ID OR document exception in a small allowlist in code.
   - Language focus steps must not use placeholder Dutch unrelated to unit theme (add per-unit expected lemma list or lint against repeated generic sentences).
3. Remap **units** into A2.1 / A2.2 / A2.3 bands in manifest order (content edit + generator). Update unit titles/summaries to reflect progression (Early / Mid / Late A2).
4. Add **real-life scripts**: at least one dedicated step or paragraph pattern per band (Albert Heijn, huisarts phone, landlord, gemeente) with Dutch phrases + EN gloss + listen task.
5. Strengthen **culture** steps: replace vague prompts with phrase lists + short dialogues + one production prompt (still compatible with existing step types and `InteractiveSelfCheck` if used).
6. Add **pronunciation spotlight** content: minimum 3 lessons across the level with short `g/ch`, `ui/eu/ij`, or rhythm focus (can be a step with listen + repeat instructions; TTS already exists in app).

## Phase 2 — UI (read new metadata)

1. In the curriculum path UI, show **band** (A2.1–A2.3) grouping headers using `a2_band` from units.
2. On lesson start or header: show **lesson can-do outcomes** from `pedagogy.can_do_outcomes`.
3. Per step: if `skill_focus` is set, show a small badge (Listen / Read / Speak / Write / Grammar / Review) next to step title; do not change step count logic.
4. Optional feature flag `NEXT_PUBLIC_CURRICULUM_SEQUENTIAL` (or app config): when true, disable jumping to later-band lessons until prior band marked complete (define “complete” as all lessons viewed or all steps completed — pick simplest consistent with existing progress store).

## Phase 3 — Review / SRS stub (minimal)

1. Add a data structure for “review items” keyed by lemma or lesson snippet id (localStorage MVP).
2. After lesson completion, enqueue lemmas from `recycle_lemmas` or from `pedagogy.target_vocabulary_lemmas` with due dates +1d/+3d/+7d.
3. Add a simple “Review” screen or section listing due items (flashcard-style text MVP); no server required.

## Phase 4 — Mistake-oriented exercises

1. Tag at least 10 self-check or gap items across the catalog with `common_error_tags`.
2. Optionally add a “Practice weak spots” entry that filters by tag (local only).

## Verification

- `npx tsc --noEmit`
- `npm run build`
- Manually open one lesson per band and confirm badges, can-dos, and listen buttons still work with `ListenableLessonStepContent` / NL bullet listen paths.

## Deliverables checklist

- [ ] `a2-grammar-spine.md`
- [ ] Updated `populating-level-curriculum.md` JSON examples
- [ ] `a2Catalog.ts` types + null-safe UI
- [ ] Generator emits new fields; bundle regenerated
- [ ] UI: band grouping + can-dos + skill badges
- [ ] Optional: SRS stub + error tags

Start with Phase 0 + TypeScript types, then Phase 1 validation and one unit fully migrated as a template before bulk-updating all lessons.
