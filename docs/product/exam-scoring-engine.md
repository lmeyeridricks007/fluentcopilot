# Exam scoring engine — design & implementation

| Attribute | Value |
|-----------|--------|
| Status | **Implemented** (logic + contracts); LLM caller not wired |
| Code | `src/lib/exam-scoring/*` |
| Fixtures | `content/exam/scoring-fixtures/*.json` |
| Tests | `src/lib/exam-scoring/examScoring.test.ts` (`npm test`) |
| Schemas | `src/lib/schemas/exam/*`, [`exam-prep-schema-overview.md`](./exam-prep-schema-overview.md) |

---

## 1. Overview

The exam scoring engine is a **formal rubric system** for Dutch **A2** speaking and writing prep. It is **stricter and more structured** than Practice scoring: integer category scores, **execution gating**, **auditable** totals, and a **constrained JSON contract** for AI evaluators.

**Official DUO certification** is out of scope; outputs are **product readiness** signals.

**Assumption:** The formal category maxima and execution gate follow the user-provided speaking grading specification (grading PDF cited in product brief was not available in-repo; numeric model is implemented exactly as specified in the task).

---

## 2. Speaking rubric model

| Category | Max | Role |
|----------|-----|------|
| **execution** | 3 | Task fulfilment: addresses prompt, completeness at A2 |
| **vocabulary** | 2 | Range & appropriateness |
| **grammar** | 2 | Errors affecting meaning vs slips |
| **fluency** | 2 | Flow, pauses (often from transcript / metrics later) |
| **clearness** | 1 | Structure / understandability |
| **pronunciation** | 2 | Intelligibility (from transcript proxy unless audio analysis exists) |

**Max total (raw):** 12  

Constants: `SPEAKING_MAX_BY_CATEGORY`, `SPEAKING_CATEGORY_ORDER`, `SPEAKING_RUBRIC_ID` in `speakingScoringPolicy.ts`.

---

## 3. Writing rubric model

| Category | Max |
|----------|-----|
| **execution** | 3 |
| **grammar** | 2 |
| **spelling** | 2 |
| **clearness** | 1 |
| **vocabulary** | 2 |

**Max total (raw):** 10  

Constants: `writingScoringPolicy.ts`.

---

## 4. Execution gating (critical rule)

If **`execution === 0`**, then **all other category scores are set to 0** before totals.

Implemented in:

- `applySpeakingExecutionGate` / `applyWritingExecutionGate` (`scoringGuards.ts`)
- Enforced **after** clamping and **after** minimum-response guard

This matches the formal rule: no partial credit on other dimensions when the task is not performed.

---

## 5. Category weighting

- **Primary model:** **Raw points are summed**; each category already encodes its weight via its **max points** (3 vs 2 vs 1).  
- **No extra hidden weights** on top of the rubric — **audit-friendly**: the rubric *is* the weighting scheme.  
- **Cross-exercise comparison:** use **normalized percent** = `total / max * 100` (same scale for speaking vs writing when comparing *readiness*, but different max raw totals per modality).

---

## 6. Normalization strategy

| Output | Formula / role |
|--------|----------------|
| **Raw total** | Sum of gated category scores |
| **Max total** | 12 (speaking) or 10 (writing) |
| **normalizedPercent** | `round((total/max)*1000)/10` → one decimal |
| **tenPointScale** | `(total/max)*10` → two decimals (display only) |
| **readinessLabel** | `needs_work` \<45% \| `improving` 45–69 \| `nearly_ready` 70–84 \| `strong` ≥85 |

Normalization is a **presentation layer**; persisted `ExamScoringResult` keeps **raw** `totalScore` / `maxScore`; extra fields live in `metadata` via `engineOutputToExamScoringResult`.

---

## 7. Pass / fail strategy

| Scope | Rule |
|-------|------|
| **Single exercise** | `pass` if `normalizedPercent >= 70` (config: `EXERCISE_PASS_PERCENT_DEFAULT`) |
| **Borderline** | `exerciseOutcomeBand`: `close` for 55–69%, `fail` below |
| **Session** | Use **mean of exercise percents** ≥ threshold (`sessionPassMeanPercent`) unless product chooses weighted scheme later |
| **Simulation vs training** | **Same math** today (`passThresholdForMode` returns same threshold); **copy/UX** differs per architecture — stricter *feeling* without changing numbers is allowed |

This is **internal readiness**, not a legal exam result.

---

## 8. AI mapping (response → scores)

1. **LLM returns JSON only** matching `aiSpeakingEvaluationPayloadSchema` / `aiWritingEvaluationPayloadSchema` (`aiRubricMapper.ts`).  
2. **Scores are coerced, rounded, clamped** to integer rubric bounds.  
3. **Pipelines:**  
   - `scoreSpeakingFromAiJson` / `scoreWritingFromAiJson` (`index.ts`)  
   - → `aggregateSpeakingAttempt` / `aggregateWritingAttempt` (`scoreAggregator.ts`)

**Prompt contract:** `SPEAKING_AI_JSON_SCHEMA_REMINDER` / `WRITING_AI_JSON_SCHEMA_REMINDER` (`aiEvaluationPromptSpec.ts`) — category-first, execution rules, conservative scoring, gating reminder.

**Guardrails:**

- **Minimum response:** &lt; 2 words → treat as non-answer → `execution` forced to 0 → full gate (`MIN_WORDS_FOR_CREDIT`).  
- **Low STT confidence** (`&lt; 0.55`): cap `clearness` / `pronunciation` (`applyTranscriptConfidenceGuardSpeaking`).  
- **Over-generous AI:** mitigated by prompt + integer clamp + gating; optional human review layer later.

---

## 9. Trust model

| Principle | Implementation |
|-----------|----------------|
| Execution first | AI prompt + engine gate |
| Evidence | `rationales` map → merged into `rubricScores[].evidence` |
| Stable structure | Zod validation; reject malformed JSON |
| Separation | Scores vs `internalReasoning` (optional, not for learner UI) |
| Deterministic fallbacks | `fallbackSpeakingScoresFromText` (dev only — not for production scoring) |

---

## 10. Scoring output model

`ExamScoringEngineOutput` (`types.ts`) includes:

- `rubricScores`, `totalScore`, `maxScore`, `normalizedPercent`, `tenPointScale`  
- `pass`, `exerciseOutcomeBand`, `readinessLabel`  
- `executionGatingApplied`, `weakTags`, `categoryRationales`, `certainty`

`engineOutputToExamScoringResult` maps to persisted **`ExamScoringResult`** + `speakingRubricScores` / `writingRubricScores` mirrors.

---

## 11. Training vs simulation

- **Single engine**; same rubric and gating.  
- **Presentation:** training shows per-category rationales and links to model answers; simulation defers detail (see [`exam-prep-architecture.md`](./exam-prep-architecture.md)).  
- **Future:** optional stricter pass threshold for simulation via `passThresholdForMode` without branching scoring logic.

---

## 12. Integration points

| System | Hook |
|--------|------|
| **Feedback** | `categoryRationales` + `rubricScores` → `FeedbackBlock` builder (future) |
| **Review** | `weakTags` / `mistakeOrientedTagsFrom*` (`integrationHints.ts`) → review card prompts |
| **Weak areas** | Tags `exam-speaking-*`, `exam-writing-*`, `exam-execution` |
| **Mastery** | Consume `normalizedPercent` + modality rolling average (service TBD) |
| **Analytics** | Persist `ExamScoringResult.metadata` (normalizedPercent, readinessLabel, weakTags) |

---

## 13. Public API (summary)

```ts
import {
  aggregateSpeakingAttempt,
  aggregateWritingAttempt,
  scoreSpeakingFromAiJson,
  scoreWritingFromAiJson,
  engineOutputToExamScoringResult,
} from '@/lib/exam-scoring'
```

---

## 14. Fixtures

Under `content/exam/scoring-fixtures/`:

- `fixture-speaking-strong.json` / `fixture-speaking-weak.json`  
- `fixture-writing-strong.json` / `fixture-writing-weak.json`  

Each documents `aiPayload` + `expected` totals for QA.

---

## 15. Schema alignment

- Rubric category keys **`execution`** and **`clearness`** added to `speakingRubricCategoryKeySchema` / `writingRubricCategoryKeySchema` alongside legacy `task_execution` / `clarity` for older JSON.  
- Engine emits **`execution`** / **`clearness`** in `rubricScores`.

---

*End of document.*
