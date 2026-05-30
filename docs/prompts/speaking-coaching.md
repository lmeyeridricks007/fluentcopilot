# Speaking coaching — prompt pack

This document mirrors the runtime instructions in `backend/src/services/speech/openAiSpeakingCoachingService.ts` (system + user template). Keep code and doc aligned when iterating.

## Design goals

1. **Intent + scenario**: Did the reply move the scenario forward?
2. **Natural Dutch**: Does phrasing sound native enough for the situation?
3. **Level fit**: A1/A2/B1 — feedback complexity must not overshoot the learner.
4. **Minimal correction**: Accept beginner-safe wording; suggest a rewrite only when it clearly helps.
5. **No pronunciation claims**: Model is told it only has transcript + context, not audio.
6. **Structured output**: Single JSON object, camelCase keys (validated with Zod).

## CEFR grounding

- Pass `learnerLevelCefr` from scenario difficulty (`A1` | `A2` | `B1`).
- System text instructs shorter, simpler English explanations for A1/A2; slightly richer for B1 — still no heavy metalanguage.

## System prompt (summary)

- Role: supportive Dutch speaking coach for FluentCopilot.
- Inputs: transcript only (+ optional summary, last assistant turn, scenario fields).
- Explicitly **forbidden** to score pronunciation/prosody.
- Output keys: `shortVerdict`, `naturalnessSuggestion`, `correctedAlternative`, `whyItMatters`, `cefrLevelAppropriateness`, `coachNote`, `encouragement`, `intentMatch`, `naturalness`, `clarity`, `levelFit`, `savePhraseCandidates`, `coachingSignals`, `scenarioIntentMet`.
- Signals: snake_case analytics tags, max 24.

## User prompt (fields)

The user message includes:

- `learnerLevelCefr`, `feedbackMode`, `conversationTurnIndex` (0-based among user turns)
- `scenarioId`, `scenarioTitle`, description, optional goals list
- Optional `lastAssistantTurn`, `threadSummary`, `expectedIntent`
- Final learner `transcript` block

## Sample request body

```json
{
  "transcript": "Ik wil een kaartje naar Amsterdam, alstublieft.",
  "scenarioId": "uuid-or-slug",
  "scenarioTitle": "Train station",
  "scenarioDescription": "Buy a ticket and ask about platforms.",
  "scenarioGoals": ["Ask for ticket", "Confirm destination"],
  "learnerLevelCefr": "A2",
  "feedbackMode": "after_each",
  "conversationTurnIndex": 1,
  "lastAssistantTurn": "Goedemiddag, waarmee kan ik u helpen?",
  "threadSummary": "User is buying a train ticket.",
  "expectedIntent": null
}
```

## Sample response (`coaching`)

```json
{
  "shortVerdict": "Clear and polite — you got the request across.",
  "naturalnessSuggestion": "Ticket desk Dutch often uses \"een enkele reis\" instead of \"kaartje\".",
  "correctedAlternative": "Een enkele reis naar Amsterdam, alstublieft.",
  "whyItMatters": "Sounds more like what travelers say at the counter.",
  "cefrLevelAppropriateness": "on_level",
  "coachNote": "Keep your opener short; add destination + ticket type when you can.",
  "encouragement": "Nice tone — you're sounding more confident.",
  "intentMatch": "strong",
  "naturalness": "ok",
  "clarity": "strong",
  "levelFit": "strong",
  "savePhraseCandidates": [
    { "phrase": "Een enkele reis naar Amsterdam, alstublieft.", "contextNote": "Counter request" }
  ],
  "coachingSignals": ["ticket_lexicon_register", "polite_phrase_used"],
  "scenarioIntentMet": true,
  "evaluationScope": "transcript_only"
}
```

## Failure behavior

If OpenAI is misconfigured, the handler returns **503** with `COACHING_UNAVAILABLE`. If the model returns invalid JSON or fails Zod validation, the service returns a **safe fallback** object (tagged with `coaching_fallback_used` in signals).
