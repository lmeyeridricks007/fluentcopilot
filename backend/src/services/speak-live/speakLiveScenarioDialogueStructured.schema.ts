import { z } from 'zod'

/** Coerces LLM numeric / string scores into integers in 0–100. */
export const score0to100 = z
  .union([z.number(), z.string()])
  .transform((v) => {
    const n = typeof v === 'string' ? Number.parseFloat(v.trim()) : v
    if (!Number.isFinite(n)) return 0
    return Math.max(0, Math.min(100, Math.round(n)))
  })

export const ScenarioDialoguePrimaryFocusSchema = z.object({
  title: z.string().max(200),
  why: z.string().max(600),
  pattern: z.string().max(240),
  example: z.string().max(500),
})

export const ScenarioDialogueOverallSchema = z.object({
  summary: z.string().max(1200),
  scenarioOutcomeScore: score0to100,
  taskCompletionScore: score0to100,
  languageScore: score0to100,
  conversationFlowScore: score0to100,
  grammarScore: score0to100,
  vocabularyScore: score0to100,
  naturalnessScore: score0to100,
  estimatedLevel: z.enum(['A1', 'A2', 'B1', 'B2']),
  confidence: score0to100,
  primaryFocus: ScenarioDialoguePrimaryFocusSchema,
})

export const ScenarioDialogueGoalSchema = z.object({
  goalId: z.string().max(80),
  title: z.string().max(400),
  weight: z
    .union([z.number(), z.string()])
    .transform((v) => {
      const n = typeof v === 'string' ? Number.parseFloat(v.trim()) : v
      if (!Number.isFinite(n)) return 0
      return Math.max(0, Math.min(1, n))
    }),
  status: z.enum(['completed', 'partially_completed', 'missed']),
  score: score0to100,
  evidenceTurnIds: z.array(z.string().max(80)).max(24).default([]),
  evidenceQuote: z.string().max(500).optional().default(''),
  tryNext: z.string().max(500).optional().default(''),
})

export const ScenarioDialogueTurnLanguageScoresSchema = z.object({
  grammar: score0to100,
  vocabulary: score0to100,
  sentenceStructure: score0to100,
  naturalness: score0to100,
  taskRelevance: score0to100,
})

export const ScenarioDialogueTurnEvalSchema = z.object({
  turnId: z.string().max(80),
  languageScores: ScenarioDialogueTurnLanguageScoresSchema,
  mainFix: z.string().max(500).optional().default(''),
  whatLanded: z.array(z.string().max(240)).max(10).default([]),
  tightenNext: z.array(z.string().max(240)).max(10).default([]),
  correctedLine: z.string().max(2000).optional().default(''),
  strongerNaturalLine: z.string().max(2000).optional().default(''),
  weakPatterns: z.array(z.string().max(160)).max(12).default([]),
  saveablePhrase: z
    .union([z.string().max(400), z.null()])
    .optional()
    .transform((v) => (v === undefined || v === '' ? null : v)),
  practiceNext: z.string().max(500).optional().default(''),
})

export const ScenarioDialogueRecommendationsSchema = z.object({
  nextDrillTitle: z.string().max(200),
  nextDrillReason: z.string().max(800),
  suggestedScenarioId: z
    .union([z.string().max(200), z.null()])
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  suggestedPracticeType: z.enum([
    'scenario_retry',
    'word_drill',
    'sentence_drill',
    'coach',
    'read_aloud',
    'listening',
  ]),
})

export const ScenarioDialogueStructuredOutputSchema = z.object({
  overall: ScenarioDialogueOverallSchema,
  goals: z.array(ScenarioDialogueGoalSchema).max(24),
  turns: z.array(ScenarioDialogueTurnEvalSchema).max(40),
  recommendations: ScenarioDialogueRecommendationsSchema,
})

export type ScenarioDialogueStructuredOutput = z.infer<typeof ScenarioDialogueStructuredOutputSchema>

// ─── FAST scenario evaluation schema (default sync production path) ─────
//
// The FAST schema is a strict subset of the deep schema with reduced text caps and array sizes,
// intentionally constrained so the model emits a payload that fits in ~700–900 output tokens.
// Fields are renamed conservatively to mirror the deep schema, but caps are tighter so the
// completion is fast and predictable. The mapper accepts BOTH shapes.

/**
 * Per-bullet hard cap for FAST `strengths` / `improvements`. Tightened from 220 → 140 to keep the
 * full envelope inside ~1100 output tokens for a typical 4–6 user-turn scenario.
 */
const fastShortString = z.string().max(140)

export const FastScenarioDialoguePrimaryFocusSchema = z.object({
  title: z.string().max(80),
  why: z.string().max(160),
  pattern: z.string().max(80),
  example: z.string().max(160),
})

export const FastScenarioDialogueOverallSchema = z.object({
  summary: z.string().max(240),
  scenarioOutcomeScore: score0to100,
  taskCompletionScore: score0to100,
  languageScore: score0to100,
  conversationFlowScore: score0to100,
  grammarScore: score0to100,
  vocabularyScore: score0to100,
  naturalnessScore: score0to100,
  estimatedLevel: z.enum(['A1', 'A2', 'B1', 'B2']),
  confidence: score0to100,
  primaryFocus: FastScenarioDialoguePrimaryFocusSchema,
})

export const FastScenarioDialogueGoalSchema = z.object({
  goalId: z.string().max(60),
  title: z.string().max(120),
  weight: z
    .union([z.number(), z.string()])
    .transform((v) => {
      const n = typeof v === 'string' ? Number.parseFloat(v.trim()) : v
      if (!Number.isFinite(n)) return 0
      return Math.max(0, Math.min(1, n))
    }),
  status: z.enum(['completed', 'partially_completed', 'missed']),
  score: score0to100,
})

export const FastScenarioDialogueTurnLanguageScoresSchema = z.object({
  grammar: score0to100,
  vocabulary: score0to100,
  sentenceStructure: score0to100,
  naturalness: score0to100,
  taskRelevance: score0to100,
})

export const FastScenarioDialogueTurnEvalSchema = z.object({
  turnId: z.string().max(80),
  languageScores: FastScenarioDialogueTurnLanguageScoresSchema,
  mainFix: z.string().max(160).optional().default(''),
  /** Hard cap at 2 entries (≤ 140 chars each) — additional strengths are deferred to the deep schema. */
  strengths: z.array(fastShortString).max(2).optional().default([]),
  /** Hard cap at 2 entries (≤ 140 chars each) — additional improvements are deferred to the deep schema. */
  improvements: z.array(fastShortString).max(2).optional().default([]),
  correctedLine: z.string().max(180).optional().default(''),
  strongerNaturalLine: z.string().max(180).optional().default(''),
})

export const FastScenarioDialogueRecommendationsSchema = z.object({
  nextDrillTitle: z.string().max(120),
  nextDrillReason: z.string().max(200),
  suggestedPracticeType: z.enum([
    'scenario_retry',
    'word_drill',
    'sentence_drill',
    'coach',
    'read_aloud',
    'listening',
  ]),
})

/**
 * **FAST** scenario evaluation envelope — the DEFAULT production schema.
 *
 * Constraints chosen so that a typical 4–6 user-turn session emits ≤ ~900 output tokens:
 * - overall: scores + short summary + one primaryFocus
 * - goals: id/title/weight/status/score (no evidence quote, no tryNext)
 * - turns: per-turn scores + 1-line mainFix + correctedLine + strongerNaturalLine + max 2
 *   strengths + max 2 improvements (no whatLanded/tightenNext arrays, no weakPatterns,
 *   no saveablePhrase / practiceNext)
 * - recommendations: minimal next-drill tuple
 *
 * Verbose / deep coaching surfaces (long explanations, advanced drills, deeper CEFR reasoning,
 * detailed alternatives) live in {@link ScenarioDialogueStructuredOutputSchema} (the DEEP schema).
 */
export const FastScenarioEvaluationSchema = z.object({
  overall: FastScenarioDialogueOverallSchema,
  goals: z.array(FastScenarioDialogueGoalSchema).max(24),
  turns: z.array(FastScenarioDialogueTurnEvalSchema).max(40),
  recommendations: FastScenarioDialogueRecommendationsSchema,
})

export type FastScenarioEvaluationOutput = z.infer<typeof FastScenarioEvaluationSchema>

// ─── PARALLEL FAST SUB-SCHEMAS (overall-only + per-turn-only) ────────────
//
// The synchronous FAST path can fan out into N+1 small parallel LLM calls — one for the session
// overall + goals + recommendations, and one per user turn. Each sub-call has its own focused
// schema so the model emits a much smaller payload (fast and reliable) and total wall time
// becomes ≈ max(sub-call latency) instead of sum(everything).

/**
 * Overall-only envelope: `overall + goals + recommendations` WITHOUT the per-turn rows. Used by
 * the parallel FAST path to keep the "session-wide" call small (~300–400 output tokens) while
 * per-turn evaluations run on separate concurrent calls.
 *
 * @see combineFastEvaluationParts
 */
export const FastScenarioOverallOnlySchema = z.object({
  overall: FastScenarioDialogueOverallSchema,
  goals: z.array(FastScenarioDialogueGoalSchema).max(24),
  recommendations: FastScenarioDialogueRecommendationsSchema,
})

export type FastScenarioOverallOnlyOutput = z.infer<typeof FastScenarioOverallOnlySchema>

/**
 * Single-turn envelope used by the parallel FAST path. Each per-turn call returns ONE row that
 * matches {@link FastScenarioDialogueTurnEvalSchema}. The combiner merges N of these with one
 * {@link FastScenarioOverallOnlyOutput} to reconstruct the full {@link FastScenarioEvaluationOutput}.
 */
export const FastScenarioTurnOnlySchema = z.object({
  turn: FastScenarioDialogueTurnEvalSchema,
})

export type FastScenarioTurnOnlyOutput = z.infer<typeof FastScenarioTurnOnlySchema>

/**
 * Merge a parallel-fast `overall` envelope with N per-turn envelopes into the canonical
 * {@link FastScenarioEvaluationOutput}. `turns` are kept in the supplied positional order.
 *
 * Caller is responsible for ensuring `turns.length === userTurnInputs.length` — the orchestrator
 * fills any missing/failed positions with a deterministic stub before calling this.
 */
export function combineFastEvaluationParts(
  overall: FastScenarioOverallOnlyOutput,
  turns: FastScenarioEvaluationOutput['turns'],
): FastScenarioEvaluationOutput {
  return {
    overall: overall.overall,
    goals: overall.goals,
    turns,
    recommendations: overall.recommendations,
  }
}

/**
 * **DEEP** scenario evaluation schema — alias for the existing rich envelope. Reserved for the
 * optional async enrichment pass; never used by the synchronous FAST report flow.
 *
 * @see ScenarioDialogueStructuredOutputSchema
 */
export const DeepScenarioEvaluationSchema = ScenarioDialogueStructuredOutputSchema

export type DeepScenarioEvaluationOutput = ScenarioDialogueStructuredOutput

/**
 * Promote a {@link FastScenarioEvaluationOutput} to a {@link ScenarioDialogueStructuredOutput} so the
 * existing mapper / merge code path can stay unchanged. We synthesize empty / safe defaults for the
 * deep-only fields (whatLanded, tightenNext, weakPatterns, saveablePhrase, practiceNext, evidence
 * quote, tryNext) so downstream UI sections that read those fields still render the same shape.
 */
export function liftFastToDeepScenarioEvaluation(
  fast: FastScenarioEvaluationOutput,
): ScenarioDialogueStructuredOutput {
  return {
    overall: {
      summary: fast.overall.summary,
      scenarioOutcomeScore: fast.overall.scenarioOutcomeScore,
      taskCompletionScore: fast.overall.taskCompletionScore,
      languageScore: fast.overall.languageScore,
      conversationFlowScore: fast.overall.conversationFlowScore,
      grammarScore: fast.overall.grammarScore,
      vocabularyScore: fast.overall.vocabularyScore,
      naturalnessScore: fast.overall.naturalnessScore,
      estimatedLevel: fast.overall.estimatedLevel,
      confidence: fast.overall.confidence,
      primaryFocus: {
        title: fast.overall.primaryFocus.title,
        why: fast.overall.primaryFocus.why,
        pattern: fast.overall.primaryFocus.pattern,
        example: fast.overall.primaryFocus.example,
      },
    },
    goals: fast.goals.map((g) => ({
      goalId: g.goalId,
      title: g.title,
      weight: g.weight,
      status: g.status,
      score: g.score,
      evidenceTurnIds: [],
      evidenceQuote: '',
      tryNext: '',
    })),
    turns: fast.turns.map((t) => ({
      turnId: t.turnId,
      languageScores: t.languageScores,
      mainFix: t.mainFix ?? '',
      whatLanded: (t.strengths ?? []).slice(0, 2),
      tightenNext: (t.improvements ?? []).slice(0, 2),
      correctedLine: t.correctedLine ?? '',
      strongerNaturalLine: t.strongerNaturalLine ?? '',
      weakPatterns: [],
      saveablePhrase: null,
      practiceNext: '',
    })),
    recommendations: {
      nextDrillTitle: fast.recommendations.nextDrillTitle,
      nextDrillReason: fast.recommendations.nextDrillReason,
      suggestedScenarioId: null,
      suggestedPracticeType: fast.recommendations.suggestedPracticeType,
    },
  }
}
