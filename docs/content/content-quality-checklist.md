# Content quality checklist (Stage 5)

Use this for human QA or to inform LLM audit prompts (`qaPromptTemplates.ts`).

## CEFR A2

- [ ] Vocabulary and grammar match **A2** — no advanced subjunctive, heavy relative stacks, or abstract debate prompts.
- [ ] **Can-do** statements describe observable learner actions.
- [ ] `cefrLevel` on lesson is `A2` (or aligned band on module `A2.1` / `A2.2` / `A2.3`).

## Pedagogy (enforced in `contentValidator`)

- [ ] At least one **input** step (listening, listen_read, discovery, mcq, reorder, fill_blank).
- [ ] At least one **output** step (speaking, writing, scenario_chat).
- [ ] A **recap** step at the end of the lesson.
- [ ] Non-empty **grammarTargets** and **vocabTargets** where the lesson teaches concrete forms.

## UX / mobile

- [ ] Step prompts under ~220 characters (`MAX_STEP_PROMPT_CHARS` — soft warn).
- [ ] MCQ stems concise (`MAX_MCQ_QUESTION_CHARS`).
- [ ] `durationEstimate` roughly 10–20 minutes for A2 mobile sessions.
- [ ] One primary interaction per screen where possible (engine supports multi-exercise steps but avoid overload).

## Dutch quality

- [ ] Idiomatic **Dutch** in examples; EN glosses accurate.
- [ ] **Register** fits scenario (friend chat vs shop).

## Interactions

- [ ] **MCQ**: one best answer; distractors plausible.
- [ ] **Reorder** / **fill_blank**: `correctAnswer` matches joined tokens exactly as engine expects.
- [ ] **feedbackConfig** on interactive steps (hint, incorrectFeedback, **errorTags** for mistake routing).

## References & IDs

- [ ] Lesson **grammarTargets** / **vocabTargets** ids exist on the module catalog.
- [ ] **reviewItemRefs** present or generated; match `content/review-items` after extraction.
- [ ] No duplicate **step ids** inside a lesson; avoid reusing step ids across lessons when possible.

## Repetition

- [ ] Adjacent lessons in a module do not repeat the same dialogue skeleton.
- [ ] Step type variety across the module (not only mcq chains).

## Tooling

- [ ] `tools/validate-content.ts` → **status: OK** (warnings reviewed).
- [ ] `tools/extract-review-items.ts` run after substantive edits.
