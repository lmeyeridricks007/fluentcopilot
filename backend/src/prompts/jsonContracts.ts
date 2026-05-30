/**
 * Single JSON contract for one assistant turn (conversation + coaching metadata).
 * Instruct model to output ONLY this shape (response_format json_object).
 */
export const TURN_OUTPUT_JSON_CONTRACT = `
{
  "assistantReply": "string — Dutch reply in persona, concise",
  "feedback": null | {
    "category": "phrasing|grammar|register|clarity",
    "originalText": "user excerpt",
    "correctedText": "improved Dutch",
    "explanation": "short English tip",
    "severity": "info|warn"
  },
  "saveWordCandidates": ["string", "..."],
  "scenarioProgress": null | { "stage": "opening|platform_ok|timing_ok|route_ok|closing|ended", "notes": "optional" },
  "shouldConversationEnd": false,
  "updatedSummary": "compact English summary for next turns: goals, facts, open questions"
}
`

/** Stage A — minimal structured output so the model stays on-scene without coaching JSON. */
export const REPLY_ONLY_JSON_CONTRACT = `
{
  "assistantReply": "string — Dutch reply in persona voice, concise (alias key assistantMessage is accepted)",
  "scenarioProgress": null | { "stage": "string", "notes": "optional" },
  "shouldConversationEnd": false,
  "speakLiveSignals": null | {
    "nextPhase": "greeting|intent_detection|clarification|execution|closing",
    "intentLabel": "optional short English label",
    "needsClarification": false,
    "goalIndexesCompleted": [0],
    "advancePrimaryGoal": false,
    "readyForClosing": false,
    "rollingSummaryEnglish": "≤400 chars English for next orchestration turn"
  },
  "trainTurnResponse": null | {
    "answeredGoals": ["ASK_DELAY_STATUS", "ASK_DEPARTURE_TIME"],
    "unresolvedGoals": ["ASK_PLATFORM"],
    "nextLikelyGoal": "ASK_PLATFORM",
    "newGoalSuggestions": ["optional ASK_* the learner might try next"],
    "followUpIntentOptional": "optional short English label for analytics",
    "coachNotesOptional": "optional short English for logs/coach"
  }
}
`

/** Stage B — everything except the live persona line the learner already saw. */
export const ENRICHMENT_JSON_CONTRACT = `
{
  "feedback": null | {
    "category": "phrasing|grammar|register|clarity",
    "originalText": "user excerpt",
    "correctedText": "improved Dutch",
    "explanation": "short English tip",
    "severity": "info|warn"
  },
  "saveWordCandidates": ["string", "..."],
  "updatedSummary": "compact English rolling summary for future turns",
  "scenarioProgress": null | { "stage": "string", "notes": "optional" },
  "evaluation": null | { "signals": "optional lightweight JSON object for coaching analytics" }
}
`
