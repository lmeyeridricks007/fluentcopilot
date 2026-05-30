/**
 * Aggregates multi-question speaking training into session-level insight.
 * Mirrors `examResultSummarySchema` fields where practical (client runtime).
 */
import { aggregateSpeakingAttempt } from '@/lib/exam-scoring/scoreAggregator'
import {
  SPEAKING_CATEGORY_ORDER,
  SPEAKING_MAX_BY_CATEGORY,
  SPEAKING_CATEGORY_LABELS,
} from '@/lib/exam-scoring/speakingScoringPolicy'
import type { SpeakingRawScores } from '@/lib/exam-scoring/types'
import { buildSpeakingNextBestActions } from '@/lib/exam-prep/speaking/speakingCoachLayer'
import {
  computeSpeakingSessionConfidence,
  PLACEHOLDER_RESPONSE,
} from '@/lib/exam-prep/speaking/speakingConfidenceCalculator'
import type { SpeakingTrainingSessionPlan } from '@/lib/exam-prep/speaking/speakingSessionBuilder'
import type { SpeakingTrainingEvaluationBundle } from '@/lib/exam-prep/speaking/types'
import type { ExamResultSummary } from '@/lib/schemas/exam/examResultSummary.schema'
import type { NextBestAction } from '@/lib/schemas/exam/feedbackBlock.schema'

export type SpeakingSessionPerQuestionRow = {
  questionId: string
  promptShortNl: string
  normalizedPercent: number
  pass: boolean
  difficultyBand: number
}

export type SpeakingSessionSummaryUi = {
  plan: SpeakingTrainingSessionPlan
  bundles: SpeakingTrainingEvaluationBundle[]
  averageNormalizedPercent: number
  passesCount: number
  categoryAverages: {
    categoryKey: string
    labelNl: string
    averageScore: number
    maxScore: number
    ratio: number
  }[]
  bestCategoryKey: string
  weakestCategoryKey: string
  patternNotesNl: string[]
  confidence: ReturnType<typeof computeSpeakingSessionConfidence>
  perQuestion: SpeakingSessionPerQuestionRow[]
  nextBestActions: NextBestAction[]
  /** Subset of `ExamResultSummary` for persistence adapters */
  resultSummaryShape: Pick<
    ExamResultSummary,
    'exerciseCount' | 'totalScore' | 'maxScore' | 'pass' | 'categoryBreakdown' | 'strengths' | 'weaknesses' | 'readinessSignal' | 'suggestedNextSteps'
  > & { examSessionId: string; examType: 'speaking' }
}

function averageRawScoresFromBundles(bundles: SpeakingTrainingEvaluationBundle[]): SpeakingRawScores {
  const n = bundles.length
  const sums: SpeakingRawScores = {
    execution: 0,
    vocabulary: 0,
    grammar: 0,
    fluency: 0,
    clearness: 0,
    pronunciation: 0,
  }
  for (const b of bundles) {
    for (const k of SPEAKING_CATEGORY_ORDER) {
      const row = b.engine.rubricScores.find((r) => r.categoryKey === k)
      sums[k] += row?.score ?? 0
    }
  }
  const out = {} as SpeakingRawScores
  for (const k of SPEAKING_CATEGORY_ORDER) {
    out[k] = Math.round(sums[k] / n)
  }
  return out
}

function patternNotes(bundles: SpeakingTrainingEvaluationBundle[]): string[] {
  const notes: string[] = []
  const gated = bundles.filter((b) => b.engine.executionGatingApplied).length
  if (gated >= 2) {
    notes.push('Bij meerdere vragen was de uitvoering te zwak — lees elke opdracht hardop en check of je alle delen beantwoordt.')
  }
  const grammarLow = bundles.filter((b) => {
    const g = b.engine.rubricScores.find((r) => r.categoryKey === 'grammar')
    return g && g.maxScore > 0 && g.score / g.maxScore < 0.5
  }).length
  if (grammarLow >= 2) {
    notes.push('Grammatica viel meerdere keren op — oefen korte zinnen met omdat/want en vaste uitdrukkingen.')
  }
  if (notes.length === 0) {
    notes.push('Varieer je antwoordlengte: soms twee korte zinnen, soms iets meer detail bij moeilijkere vragen.')
  }
  return notes.slice(0, 3)
}

export function buildSpeakingSessionSummaryUi(input: {
  plan: SpeakingTrainingSessionPlan
  bundles: SpeakingTrainingEvaluationBundle[]
}): SpeakingSessionSummaryUi {
  const { plan, bundles } = input
  const avgNorm =
    bundles.length > 0
      ? Math.round(bundles.reduce((s, b) => s + b.engine.normalizedPercent, 0) / bundles.length)
      : 0
  const passesCount = bundles.filter((b) => b.engine.pass).length

  const rawAvg = averageRawScoresFromBundles(bundles)
  const syntheticEngine = aggregateSpeakingAttempt({
    mode: 'training',
    responseText: PLACEHOLDER_RESPONSE,
    scores: rawAvg,
  })

  const categoryAverages = SPEAKING_CATEGORY_ORDER.map((k) => {
    const max = SPEAKING_MAX_BY_CATEGORY[k]
    const averageScore = rawAvg[k]
    return {
      categoryKey: k,
      labelNl: SPEAKING_CATEGORY_LABELS[k].nl,
      averageScore,
      maxScore: max,
      ratio: max > 0 ? averageScore / max : 0,
    }
  })

  const sorted = [...categoryAverages].sort((a, b) => b.ratio - a.ratio)
  const bestCategoryKey = sorted[0]?.categoryKey ?? 'execution'
  const weakestCategoryKey = sorted[sorted.length - 1]?.categoryKey ?? 'execution'

  const strengths = [
    `Sterkste rubriek deze sessie: ${SPEAKING_CATEGORY_LABELS[bestCategoryKey as keyof typeof SPEAKING_CATEGORY_LABELS].nl}.`,
  ]
  const weaknesses = [
    `Meeste aandacht: ${SPEAKING_CATEGORY_LABELS[weakestCategoryKey as keyof typeof SPEAKING_CATEGORY_LABELS].nl}.`,
  ]

  const confidence = computeSpeakingSessionConfidence(bundles)

  const perQuestion: SpeakingSessionPerQuestionRow[] = bundles.map((b) => ({
    questionId: b.item.id,
    promptShortNl: b.item.promptDutch.length > 72 ? `${b.item.promptDutch.slice(0, 69)}…` : b.item.promptDutch,
    normalizedPercent: Math.round(b.engine.normalizedPercent),
    pass: b.engine.pass,
    difficultyBand: b.item.difficultyBand,
  }))

  const nextBestActions = buildSpeakingNextBestActions(syntheticEngine, {
    scenarioGroupId: plan.scenarioGroupId,
    mode: 'training',
  })

  const resultSummaryShape = {
    examSessionId: plan.sessionId,
    examType: 'speaking' as const,
    exerciseCount: bundles.length,
    totalScore: syntheticEngine.totalScore,
    maxScore: syntheticEngine.maxScore,
    pass: passesCount >= bundles.length / 2,
    categoryBreakdown: categoryAverages.map((c) => ({
      categoryKey: c.categoryKey,
      label: c.labelNl,
      averageScore: c.averageScore,
      maxScore: c.maxScore,
      metadata: { ratio: c.ratio },
    })),
    strengths,
    weaknesses,
    readinessSignal: confidence.readinessSignal,
    suggestedNextSteps: nextBestActions,
  }

  return {
    plan,
    bundles,
    averageNormalizedPercent: avgNorm,
    passesCount,
    categoryAverages,
    bestCategoryKey,
    weakestCategoryKey,
    patternNotesNl: patternNotes(bundles),
    confidence,
    perQuestion,
    nextBestActions,
    resultSummaryShape,
  }
}
