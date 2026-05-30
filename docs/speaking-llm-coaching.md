# Speaking — grounded LLM coaching (Phase 4)

The speaking coach LLM **explains and directs practice** from a **fixed JSON input contract**. It does **not** invent new acoustic scores and must **never** claim native-like production.

## Input contract

Built in `speakingCoachingLlmInput.ts` (`SpeakingCoachingLlmInput` / Zod `SpeakingCoachingLlmInputSchema`).

| Field | Purpose |
|--------|---------|
| `cefrLevel` | `A1` \| `A2` \| `B1` — controls vocabulary and sentence complexity in the prompt. |
| `locale` | e.g. `nl-NL` |
| `scenarioName` | Human title or `scenarioId` — situational grounding. |
| `promptId` | Content anchor. |
| `expectedText` / `transcript` | Gold line vs what was said. |
| `rawScoresFromAzure` | Only Azure-provided numerics (pronunciation, fluency, …). |
| `derivedRhythmAndNaturalness` | Deterministic labels (+ optional scores) for rhythm, stress, naturalness, intonation. |
| `verdicts` | `topLabel`, `clarityLabel`, `naturalnessLabel` (honest learner Dutch). |
| `weakWords` | Text + accuracy + errorType from word assessment **before** LLM word notes. |
| `phraseTargets` | From `extractPhraseTargets` (pauses, rushed tail, English-leaning heuristic). |
| `paceNotes` / `sentenceLevelTimingNotes` | Timing UX strings. |
| `timingSummary` | `paceProfile`, `rushedEnding`, `pauseCount`, `estimatedWpm`. |
| `retryTargetCandidates` | Deterministic list (phrase targets, weak words, gold line chunks). |
| `azureCaveats` | Provider warnings — model must not contradict. |

The HTTP body accepts optional **`scenarioName`** (`SpeakingAssessHttpBodySchema`); if omitted, `scenarioId` is used as `scenarioName` in the payload.

## Prompt strategy

- **System prompt:** `speakingCoachingPrompt.ts` (`SPEAKING_COACHING_SYSTEM_PROMPT`) — grounding rules, tone, required JSON keys, **few-shot** sketches (clear-but-careful, rushed ending, uneven rhythm, weak polite chunk).
- **User messages:** (1) key list reminder, (2) **only** the stringified `SpeakingCoachingLlmInput` JSON — no duplicate free-form paragraphs that invite hallucination.

## Output schema

Validated by `SpeakingAssessmentCoachingLlmSchema` in `speakingCoachingFromAssessmentService.ts`:

- `shortSummary`, `whatWentWell[]`, `improveNext[]`, `retryTarget`, `retryWhy`, `levelAlignedNotes[]`
- **`dutchSoundingLabel`** — short honest learner-Dutch label (not “native”).
- **`confidenceNarrative`** — how much to trust coaching vs scores (sparse timings, caveats, etc.).
- **`wordCoachingNotes[]`** — `{ text, coachingNote }` merged into final `wordAssessments` in the mapper.

Canonical `CoachingBlock` (`speakingAssessmentCanonical.ts`) includes the two new fields for API/FE.

## Validation & failure handling

1. Parse JSON (strip optional ``` fences).
2. `SpeakingAssessmentCoachingLlmSchema.safeParse`.
3. **On failure:** one **repair retry** with the assistant’s invalid reply + Zod error text (`llm_coaching_retry` log).
4. **On second failure:** **deterministic template** from the same `SpeakingCoachingLlmInput` (no API inventing prose beyond template rules).

## Debug storage

When **`SPEAKING_COACHING_DEBUG=1`**:

- `StoredSpeakingAssessment.coachingDebug` holds `{ llmInput, attempts[] }` with raw model text and parse success flags.
- Requires persistence (same as speaking store) — rows are JSON files when `SPEAKING_ASSESSMENT_*` is enabled.

## Frontend surfacing

- Types: `CoachingBlock` in `src/lib/speaking/speakingAssessmentTypes.ts`.
- Helper: `toSpeakingCoachingSurface()` in `src/lib/speaking/speakingCoachingSurface.ts` maps to:
  - **headline** ← `shortSummary`
  - **howItSounded** ← `dutchSoundingLabel` + `confidenceNarrative`
  - **wentWell** / **improve** / **retryNow** / **levelNotes**

## Failure modes

| Mode | Behaviour |
|------|-----------|
| Invalid JSON | Retry once → template. |
| Valid JSON, Zod fail | Retry once → template. |
| API / network error | Template + log error; debug bundle records exception string. |
| No `OPENAI_API_KEY` | Template immediately; debug attempt notes missing key when debug on. |
| Legacy persisted rows without new fields | `normalizeSpeakingCoachingBlock` in mapper fills safe defaults on read. |

## Example coaching object (shape)

```json
{
  "shortSummary": "Understandable order; ending feels squeezed.",
  "whatWentWell": ["Completeness keeps the intent clear for a listener."],
  "improveNext": ["Give the last chunk the same airtime as the opening."],
  "retryTarget": "alstublieft",
  "retryWhy": "It is both weak at word level and a natural micro-drill.",
  "levelAlignedNotes": ["A2: 4–6 word reps, then full line once."],
  "dutchSoundingLabel": "clear learner Dutch with a rushed tail",
  "confidenceNarrative": "Azure clarity scores are moderate; timing flags a rushed ending — enough to coach endings without claiming melody detail.",
  "wordCoachingNotes": []
}
```

## Related

- Derived heuristics: `docs/speaking-derived-analysis.md`
- Reference audio: `docs/reference-audio-and-comparison.md`
- Foundation: `docs/speaking-feedback-foundation.md`
