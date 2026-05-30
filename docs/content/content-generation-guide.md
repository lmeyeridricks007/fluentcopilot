# Content generation guide (Stage 5)

## Principles

- Output must be **valid JSON** parseable by Zod (`lessonSchema` / `moduleSchema`).
- Targets **Dutch A2**, practical spoken language, **mobile-first** (short prompts).
- Rules and limits live in `src/lib/content-generation/contentRules.ts` and are referenced from prompt templates.

## Prompt templates (library)

| File | Use |
|------|-----|
| `lessonPromptTemplates.ts` | Single-lesson generation (`LESSON_AUTHOR_SYSTEM_PROMPT`, `lessonAuthorUserPrompt`). |
| `modulePromptTemplates.ts` | Full module (10–12 lessons) generation. |
| `qaPromptTemplates.ts` | Post-generation audit rubric (`QA_AUDITOR_SYSTEM_PROMPT`, `qaLessonReviewPrompt`, `qaModuleReviewPrompt`). |

## CLI helpers (no LLM calls)

```bash
# Print lesson prompt package to stdout
npx tsx --tsconfig tsconfig.json tools/generate-lesson.ts

# Print module prompt package
npx tsx --tsconfig tsconfig.json tools/generate-module.ts

# Build audit prompt for a file (optionally save)
npx tsx --tsconfig tsconfig.json tools/audit-content.ts --module content/modules/a2-m01-people-daily/module.json --out /tmp/audit.md
```

Paste stdout into Cursor / ChatGPT / Azure OpenAI with **JSON-only** response instructions.

## After generation

1. Save JSON under `content/modules/.../module.json` or merge lessons into an existing module.
2. Run `tools/validate-content.ts`.
3. Run `tools/extract-review-items.ts` with `--patch-module`.
4. Re-validate with `--manifest` and `--review`.

## Import / export

- **Export**: `tools/export-content.ts --course ... --dir ...` or `--module ... --dir ...` (writes `module.json` + `review-items/*.json`).
- **Import / manifest**: `tools/import-content.ts --out content/courses/nl-a2/course.manifest.json --modules path/to/module.json` (validates resolved course).

## Assembler

`tools/assemble-m01-module.ts` rebuilds the sample **People & daily rhythm** module from `content/samples/people-daily-lesson.json` plus extra lessons. Run when you intentionally refresh that sample from the legacy bundle.
