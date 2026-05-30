# CEFR-grounded speaking evaluation (Speak Live)

FluentCopilot judges **spoken Dutch in context**, not “native perfection.” Scores and comments are anchored to the learner’s **selected CEFR band** (currently A1 / A2 / B1 in product flows).

## Design principles

1. **Level fit is not ceiling avoidance** — we still surface errors, but severity and wording reflect what is reasonable at that band.
2. **Two questions every turn (language layer)**  
   - *Is this good enough for the learner’s level?* → `levelBasedComment`, `levelFitScore`.  
   - *What is the next improvement beyond this level?* → `nextStepBeyondLevel` (one concrete skill / pattern, not generic motivation).
3. **Audio vs language** — Azure metrics describe **how** things were said; the LLM describes **what** was said (grammar, word order, scene fit). They may reinforce each other but should not double-count the same issue as both “mouth” and “syntax” without reason.

## Band expectations (speaking)

### A1 — survival / minimal production

- Short chunks, lists, single clauses, heavy reliance on familiar patterns are **expected**.
- Intelligibility and appropriate **intent in the scenario** weigh heavily.
- Grammar issues that do not block comprehension may be noted lightly; praise successful communication.

### A2 — functional short sentences

- **Question forms** and basic **word order** should be mostly stable when the learner attempts them.
- Polite fixed phrases (“alstublieft”, “ik wil graag …”) are teachable wins.
- Connectors beyond “en / maar” are a bonus, not required for a strong score.

### B1 — more natural flow

- When the learner produces longer utterances, expect **connectors**, clearer **aspect/tense** choices, and more **natural phrasing** for the setting.
- Self-corrections and reformulations are positive signals.

## Where this is enforced

- **System prompt**: `backend/src/services/speak-live/liveSessionEvaluationLlm.ts` (`SYSTEM` constant) — scoring rubric and required JSON fields for `turnLanguageEvaluation`.
- **Orchestrator**: `liveSessionEvaluationOrchestrator.ts` — passes `learnerLevel`, raw + normalized transcripts, scenario goals, Azure summary per turn.
- **Types**: `TurnLanguageEvaluation`, `LiveTurnDeepEvaluation`, `SessionEvaluationInsights` in `liveVoiceEvaluationTypes.ts`.

## UI hints

- Turn cards show **grammar & sentence construction** with explicit **word order** bullets when returned.
- **Beyond your level** paragraph nudges the learner toward the next band without rewriting the whole rubric.

## Operational notes

- If the evaluation LLM is unavailable (offline / parse failure), deterministic stubs still return CEFR-flavored placeholders so the UI and API contract remain stable.
