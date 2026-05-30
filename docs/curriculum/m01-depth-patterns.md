# Module 1 depth patterns (authoring cheat sheet)

Use together with:

- `docs/product/m01-lesson-depth-standard.md` — product rules  
- `tools/m01-depth-upgrade.ts` — inserts a `practice_loop` before each lesson recap (re-runnable; skips if step id exists)  
- `src/lib/content/lessonMicroInteractions.ts` — `estimateLessonMicroInteractions()` + CI warn via `validate-content`

## Reusable building blocks

| Need | Step types to combine |
|------|------------------------|
| Warm-up | `preview` (require all played), optional short `mcq` |
| Input | `listening` / `listen_read` with **multiple** `multiple_choice` exercises (gist → detail) |
| Noticing | `discovery`, `grammar_card` |
| Dense drills | `practice_loop` with `multiple_choice`, `fill_blank`, `reorder` |
| Single drill | `mcq`, `reorder`, `fill_blank` |
| Output | `speaking` (×2 turns = two steps), `writing`, `scenario_chat` |
| Consolidation | `recap` with 5–7 `tasks` (`listen_mcq`, `fill_blank`, `reorder`, `speak`) |

## Engine note

New “interaction kinds” from the product brief (keyword_spotting, transform, …) are expressed as **closed exercises** inside existing types until the `lessonStep` union is extended project-wide.

## Modules 2–12

1. Measure `estimateLessonMicroInteractions` per lesson.  
2. If &lt; 25, add a **`practice_loop`** (6–10 items) before `recap` or split listening into gist + detail rounds.  
3. Re-run `npm run validate-content` and `tools/extract-review-items.ts`.
