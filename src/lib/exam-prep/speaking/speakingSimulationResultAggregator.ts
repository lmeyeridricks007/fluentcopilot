/**
 * Session-level report for speaking exam simulation (one aggregated exam-style result).
 */
import { aggregateSpeakingAttempt } from '@/lib/exam-scoring/scoreAggregator'
import {
  SPEAKING_CATEGORY_ORDER,
  SPEAKING_MAX_BY_CATEGORY,
  SPEAKING_CATEGORY_LABELS,
} from '@/lib/exam-scoring/speakingScoringPolicy'
import type { SpeakingRawScores } from '@/lib/exam-scoring/types'
import { buildSpeakingNextBestActions } from '@/lib/exam-prep/speaking/speakingCoachLayer'
import { PLACEHOLDER_RESPONSE } from '@/lib/exam-prep/speaking/speakingConfidenceCalculator'
import type { SpeakingSimulationSessionPlan } from '@/lib/exam-prep/speaking/speakingSimulationSessionBuilder'
import {
  buildSpeakingSimulationReadiness,
  type SpeakingSimulationReadinessUi,
} from '@/lib/exam-prep/speaking/speakingSimulationReadinessBuilder'
import type { SpeakingSimulationQuestionBundle } from '@/lib/exam-prep/speaking/types'
import type { ExamResultSummary } from '@/lib/schemas/exam/examResultSummary.schema'
import type { NextBestAction } from '@/lib/schemas/exam/feedbackBlock.schema'

export type SpeakingSimulationPerQuestionRow = {
  questionId: string
  promptShortNl: string
  normalizedPercent: number
  pass: boolean
  difficultyBand: number
  timedOut: boolean
}

export type SpeakingSimulationSummaryUi = {
  plan: SpeakingSimulationSessionPlan
  bundles: SpeakingSimulationQuestionBundle[]
  averageNormalizedPercent: number
  passesCount: number
  timedOutCount: number
  simulationReadiness: SpeakingSimulationReadinessUi
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
  strengths: string[]
  weaknesses: string[]
  perQuestion: SpeakingSimulationPerQuestionRow[]
  nextBestActions: NextBestAction[]
  resultSummaryShape: Pick<
    ExamResultSummary,
    'exerciseCount' | 'totalScore' | 'maxScore' | 'pass' | 'categoryBreakdown' | 'strengths' | 'weaknesses' | 'readinessSignal' | 'suggestedNextSteps'
  > & { examSessionId: string; examType: 'speaking' }
}

function averageRawScoresFromSimulationBundles(bundles: SpeakingSimulationQuestionBundle[]): SpeakingRawScores {
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
    out[k] = n > 0 ? Math.round(sums[k] / n) : 0
  }
  return out
}

function patternNotesSimulation(bundles: SpeakingSimulationQuestionBundle[]): string[] {
  const notes: string[] = []
  const timeouts = bundles.filter((b) => b.timedOut).length
  if (timeouts > 0) {
    notes.push(
      timeouts === 1
        ? 'Bij één vraag liep de tijd af — oefen kortere openingszinnen zodat je sneller inhoud kunt geven.'
        : 'Bij meerdere vragen liep de tijd af — hou antwoorden strak en beantwoord eerst de kern van de vraag.'
    )
  }
  const gated = bundles.filter((b) => b.engine.executionGatingApplied).length
  if (gated >= 2) {
    notes.push('Uitvoering viel meerdere keren tegen — lees de opdracht hardop en check of je alle delen beantwoordt.')
  }
  const lowFluency = bundles.filter((b) => {
    const r = b.engine.rubricScores.find((x) => x.categoryKey === 'fluency')
    return r && r.maxScore > 0 && r.score / r.maxScore < 0.45
  }).length
  if (lowFluency >= 2) {
    notes.push('Fluency wisselde — oefen vaste verbindingspatronen (omdat, want, eerst… daarna).')
  }
  if (notes.length === 0) {
    notes.push('Varieer lengte en tempo: soms twee korte zinnen, soms iets meer detail bij moeilijkere vragen.')
  }
  return notes.slice(0, 4)
}

export function buildSpeakingSimulationSummaryUi(input: {
  plan: SpeakingSimulationSessionPlan
  bundles: SpeakingSimulationQuestionBundle[]
}): SpeakingSimulationSummaryUi {
  const { plan, bundles } = input
  const avgNorm =
    bundles.length > 0
      ? Math.round(bundles.reduce((s, b) => s + b.engine.normalizedPercent, 0) / bundles.length)
      : 0
  const passesCount = bundles.filter((b) => b.engine.pass).length
  const timedOutCount = bundles.filter((b) => b.timedOut).length
  const perNorms = bundles.map((b) => b.engine.normalizedPercent)

  const rawAvg = averageRawScoresFromSimulationBundles(bundles)
  const syntheticEngine = aggregateSpeakingAttempt({
    mode: 'simulation',
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

  const simulationReadiness = buildSpeakingSimulationReadiness({
    averageNormalizedPercent: avgNorm,
    passesCount,
    questionCount: bundles.length,
    timedOutCount,
    perQuestionNormalizedPercents: perNorms,
  })

  const bestNl = SPEAKING_CATEGORY_LABELS[bestCategoryKey as keyof typeof SPEAKING_CATEGORY_LABELS].nl
  const weakNl = SPEAKING_CATEGORY_LABELS[weakestCategoryKey as keyof typeof SPEAKING_CATEGORY_LABELS].nl

  const strengths = [
    `Sterkste rubriek over deze simulatie: ${bestNl}.`,
    passesCount >= Math.ceil(bundles.length * 0.75)
      ? 'Meerderheid van de vragen scoort richting voldoende — dat helpt onder tijdsdruk.'
      : `Je haalde ${passesCount}/${bundles.length} keer een voldoende score op vraagniveau.`,
  ]

  const weaknesses = [
    `Meeste groei: ${weakNl}.`,
    timedOutCount > 0 ? `Tijdslimiet: ${timedOutCount}× automatisch afgerond — oefen strakkere openingszinnen.` : 'Geen tijds‑timeouts — goed voor ritme.',
  ]

  const perQuestion: SpeakingSimulationPerQuestionRow[] = bundles.map((b) => ({
    questionId: b.item.id,
    promptShortNl:
      b.item.promptDutch.length > 72 ? `${b.item.promptDutch.slice(0, 69)}…` : b.item.promptDutch,
    normalizedPercent: Math.round(b.engine.normalizedPercent),
    pass: b.engine.pass,
    difficultyBand: b.item.difficultyBand,
    timedOut: b.timedOut,
  }))

  const nextBestActions = buildSpeakingNextBestActions(syntheticEngine, {
    scenarioGroupId: bundles[0]?.item.scenarioGroupId,
    mode: 'simulation',
  })

  const resultSummaryShape = {
    examSessionId: plan.sessionId,
    examType: 'speaking' as const,
    exerciseCount: bundles.length,
    totalScore: syntheticEngine.totalScore,
    maxScore: syntheticEngine.maxScore,
    pass: passesCount >= Math.ceil(bundles.length / 2),
    categoryBreakdown: categoryAverages.map((c) => ({
      categoryKey: c.categoryKey,
      label: c.labelNl,
      averageScore: c.averageScore,
      maxScore: c.maxScore,
      metadata: { ratio: c.ratio },
    })),
    strengths,
    weaknesses,
    readinessSignal: simulationReadiness.readinessSignal,
    suggestedNextSteps: nextBestActions,
  }

  return {
    plan,
    bundles,
    averageNormalizedPercent: avgNorm,
    passesCount,
    timedOutCount,
    simulationReadiness,
    categoryAverages,
    bestCategoryKey,
    weakestCategoryKey,
    patternNotesNl: patternNotesSimulation(bundles),
    strengths,
    weaknesses,
    perQuestion,
    nextBestActions,
    resultSummaryShape,
  }
}
