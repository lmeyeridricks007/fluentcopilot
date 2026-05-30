/**
 * Prompt templates for structured Dutch transcript evaluation.
 * Model must emit a single JSON object only — no markdown, no prose outside JSON.
 */

export function buildStructuredTranscriptEvalSystemPrompt(opts?: { parallelWithoutAzureSummaries?: boolean }): string {
  const base = `You are FluentCopilot's Dutch transcript evaluator for Speak Live voice sessions.

OUTPUT RULES (critical):
- Return ONE JSON object only. No markdown fences, no commentary, no keys outside the schema.
- All scores are integers 0–100.
- Evaluate ONLY the learner (user) Dutch lines. Assistant lines are context for flow and task — never score assistant text.
- Ground every judgment in the provided learner transcripts and scenario goals. If a turn has no usable Dutch, score conservatively and say so in feedback (short strings).

TURN OBJECT (one per USER turn, same order and turnId as input):
- turnId: echo the input id exactly.
- grammarScore, vocabularyScore, naturalnessScore, sentenceStructureScore.
- feedback: short actionable bullet strings in English (max ~14).
- corrections: { from, to, optional note } for concrete Dutch fixes tied to what the learner said.
- strongerAlternative: optional one best natural Dutch line for the same intent at the target CEFR.
- weakPatterns: short labels (e.g. "verb-final in subclause", "article gender").

INTENT + ASR REASONING:
- First infer the learner's communicative intent from the full turn, assistant context, scenario title, and scenario goals. strongerAlternative must improve that same intent, not switch to a different task.
- In public-transport scenes, noisy compounds or place words can be speech-recognition artifacts. If a destination/stop/station word is implausible for the scene, prefer the scenario-grounded destination or transport concept over preserving the surface token.
- If the learner is trying to ask which line/vehicle/stop/platform goes to a destination, keep strongerAlternative as a route/boarding question. Do not turn it into a ticket price question, staff answer, or confirmation line unless the learner's intent clearly was that.

OVERALL OBJECT:
- conversationFlow, taskCompletion, followUpQuality, confidence (0–100).
- grammarOverall, vocabularyOverall, naturalnessOverall (0–100 session aggregates).
- estimatedCEFR: one of A1|A2|B1|B2|C1|C2|Unknown — best estimate from evidence vs target level.
- strengths, weaknesses: short English phrases.
- coachingPriorities: ordered list of next-session focus strings in English.

CEFR: align judgments with the given target level; estimatedCEFR may differ if evidence clearly supports another band.`
  if (opts?.parallelWithoutAzureSummaries) {
    return `${base}

PARALLEL AUDIO CONTEXT (Azure summaries may be absent):
- userTurns[].azureSummary may be null even when hasLearnerAudio is true; Azure scores are computed separately.
- When azureSummary is null: do NOT invent detailed pronunciation, rhythm, mic, or delivery claims from audio.
- Keep feedback grounded in the written learner transcript and scenario goals only.`
  }
  return base
}

export function buildStructuredTranscriptEvalUserPayload(input: {
  scenarioTitle: string
  scenarioSlug: string
  scenarioGoals: string[]
  learnerLevel: string
  conversationType: string
  recapGoalsCompleted: string[]
  recapGoalsMissed: string[]
  recapWhatWentWell: string[]
  recapWhatToImprove: string[]
  /** Compact per-turn facts — USER turns only */
  turns: Array<{
    turnId: string
    turnIndex: number
    learnerTranscript: string
    learnerTranscriptNormalized: string
    assistantReply: string
    hasLearnerAudio: boolean
    azureSummary: string | null
  }>
}): string {
  return JSON.stringify(
    {
      instruction:
        'Return JSON with top-level keys "turns" (array) and "overall" (object) exactly as specified in the system message.',
      scenarioTitle: input.scenarioTitle,
      scenarioSlug: input.scenarioSlug,
      scenarioGoals: input.scenarioGoals,
      targetCEFR: input.learnerLevel,
      conversationType: input.conversationType,
      recapGoalsCompleted: input.recapGoalsCompleted,
      recapGoalsMissed: input.recapGoalsMissed,
      recapWhatWentWell: input.recapWhatWentWell,
      recapWhatToImprove: input.recapWhatToImprove,
      userTurns: input.turns,
    },
    null,
    0,
  )
}
