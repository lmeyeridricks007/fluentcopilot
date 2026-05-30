# AI Conversation Engine — Prompt Design

## Template Structure

Prompts are built from:

1. **System prompt** — Role (patient Dutch tutor, in-character for scenario).
2. **Conversation instructions** — Keep turns short; optional `[CORRECTION: ...]` at end.
3. **Scenario block** — Name, setting, goal, key phrases, AI roleplay instructions (role, tone, language).
4. **Level block** — Learner CEFR level; instruct model to use simple, level-appropriate Dutch.
5. **Feedback instructions** — When to add one brief correction in `[CORRECTION: ...]`.
6. **Response format rules** — Dutch only; optional single correction line.
7. **Constraints** — Use Dutch only; adapt to level; don’t over-correct; stay in character.

## Default Constraints

- Use Dutch only unless the learner asks for help in another language.
- Adapt vocabulary and sentence length to learner CEFR level.
- Do not exceed conversation complexity for the level.
- Correct mistakes gently and briefly; offer the correct form once.
- Stay in character for the scenario.

## Response Parsing

Tutor output may end with a single line:

`[CORRECTION: suggested correction or brief explanation]`

- `parseTutorResponse(raw)` strips this and returns `{ content, correction? }`.
- The main reply is shown as the tutor message; the correction is attached for the correction panel / feedback snippet.

## Scenario Context

Each scenario (café, doctor, supermarket, etc.) supplies:

- `scenario_name`, `setting`, `goal`
- `key_phrases` (Dutch + optional translation)
- `expected_vocabulary`, `difficulty_adjustments` per CEFR
- `ai_roleplay_instructions`: role, setting, must_include, tone, language, constraints

These are injected into the system prompt so the model stays on-scenario and level-appropriate.
