/**
 * One aggregated writing exam report after four simulation tasks.
 */
import { aggregateWritingAttempt } from '@/lib/exam-scoring/scoreAggregator'
import {
  WRITING_CATEGORY_ORDER,
  WRITING_MAX_BY_CATEGORY,
  WRITING_CATEGORY_LABELS,
} from '@/lib/exam-scoring/writingScoringPolicy'
import type { WritingRawScores } from '@/lib/exam-scoring/types'
import { buildWritingNextBestActions } from '@/lib/exam-prep/writing/writingCoachLayer'
import {
  buildWritingSimulationReadiness,
  type WritingSimulationReadinessUi,
} from '@/lib/exam-prep/writing/writingSimulationReadinessBuilder'
import type { WritingSimulationSessionPlan } from '@/lib/exam-prep/writing/writingSimulationSessionBuilder'
import type { WritingSimulationTaskBundle } from '@/lib/exam-prep/writing/types'
import type { ExamResultSummary } from '@/lib/schemas/exam/examResultSummary.schema'
import type { NextBestAction } from '@/lib/schemas/exam/feedbackBlock.schema'

/** Internal only — satisfies minimum-word guard in `aggregateWritingAttempt`. */
const SESSION_AGG_TEXT =
  'Interne sessieaggregatie voor schrijfexamensimulatie met voldoende woorden voor technische scoreberekening.'

export type WritingSimulationPerTaskRow = {
  taskId: string
  partLabelNl: string
  subtype: string
  promptShortNl: string
  normalizedPercent: number
  pass: boolean
  timedOut: boolean
}

export type WritingSimulationSummaryUi = {
  plan: WritingSimulationSessionPlan
  bundles: WritingSimulationTaskBundle[]
  averageNormalizedPercent: number
  passesCount: number
  timedOutCount: number
  simulationReadiness: WritingSimulationReadinessUi
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
  perTask: WritingSimulationPerTaskRow[]
  nextBestActions: NextBestAction[]
  resultSummaryShape: Pick<
    ExamResultSummary,
    'exerciseCount' | 'totalScore' | 'maxScore' | 'pass' | 'categoryBreakdown' | 'strengths' | 'weaknesses' | 'readinessSignal' | 'suggestedNextSteps'
  > & { examSessionId: string; examType: 'writing' }
}

function averageRawFromBundles(bundles: WritingSimulationTaskBundle[]): WritingRawScores {
  const n = bundles.length
  const sums: WritingRawScores = {
    execution: 0,
    grammar: 0,
    spelling: 0,
    clearness: 0,
    vocabulary: 0,
  }
  for (const b of bundles) {
    for (const k of WRITING_CATEGORY_ORDER) {
      const row = b.engine.rubricScores.find((r) => r.categoryKey === k)
      sums[k] += row?.score ?? 0
    }
  }
  const out = {} as WritingRawScores
  for (const k of WRITING_CATEGORY_ORDER) {
    out[k] = n > 0 ? Math.round(sums[k] / n) : 0
  }
  return out
}

function patternNotes(bundles: WritingSimulationTaskBundle[]): string[] {
  const notes: string[] = []
  const timeouts = bundles.filter((b) => b.timedOut).length
  if (timeouts > 0) {
    notes.push(
      timeouts >= 2
        ? 'Meerdere keren liep de tijd af — oefen eerst korte concepten maken en daarna uitwerken binnen de tijd.'
        : 'Bij één opdracht liep de tijd af — let op klok en voltooi eerst de kern van de opdracht.'
    )
  }
  const gated = bundles.filter((b) => b.engine.executionGatingApplied).length
  if (gated >= 2) {
    notes.push('De opdracht was bij meerdere taken niet volledig uitgevoerd — lees de instructie hardop en check de punten.')
  }
  const spellLow = bundles.filter((b) => {
    const r = b.engine.rubricScores.find((x) => x.categoryKey === 'spelling')
    return r && r.maxScore > 0 && r.score / r.maxScore < 0.45
  }).length
  if (spellLow >= 2) {
    notes.push('Spelling viel meerdere keren op — neem tijd voor controle op bekende woorden en leestekens.')
  }
  if (notes.length === 0) {
    notes.push('Wissel in lengte: formulier strak, berichten met groet, algemene tekst met duidelijke zinnen.')
  }
  return notes.slice(0, 4)
}

export function buildWritingSimulationSummaryUi(input: {
  plan: WritingSimulationSessionPlan
  bundles: WritingSimulationTaskBundle[]
}): WritingSimulationSummaryUi {
  const { plan, bundles } = input
  const avgNorm =
    bundles.length > 0
      ? Math.round(bundles.reduce((s, b) => s + b.engine.normalizedPercent, 0) / bundles.length)
      : 0
  const passesCount = bundles.filter((b) => b.engine.pass).length
  const timedOutCount = bundles.filter((b) => b.timedOut).length
  const perNorms = bundles.map((b) => b.engine.normalizedPercent)

  const rawAvg = averageRawFromBundles(bundles)
  const syntheticEngine = aggregateWritingAttempt({
    mode: 'simulation',
    responseText: SESSION_AGG_TEXT,
    scores: rawAvg,
  })

  const categoryAverages = WRITING_CATEGORY_ORDER.map((k) => {
    const max = WRITING_MAX_BY_CATEGORY[k]
    const averageScore = rawAvg[k]
    return {
      categoryKey: k,
      labelNl: WRITING_CATEGORY_LABELS[k].nl,
      averageScore,
      maxScore: max,
      ratio: max > 0 ? averageScore / max : 0,
    }
  })

  const sorted = [...categoryAverages].sort((a, b) => b.ratio - a.ratio)
  const bestCategoryKey = sorted[0]?.categoryKey ?? 'execution'
  const weakestCategoryKey = sorted[sorted.length - 1]?.categoryKey ?? 'execution'

  const simulationReadiness = buildWritingSimulationReadiness({
    averageNormalizedPercent: avgNorm,
    passesCount,
    taskCount: bundles.length,
    timedOutCount,
    perTaskNormalizedPercents: perNorms,
  })

  const bestNl = WRITING_CATEGORY_LABELS[bestCategoryKey as keyof typeof WRITING_CATEGORY_LABELS].nl
  const weakNl = WRITING_CATEGORY_LABELS[weakestCategoryKey as keyof typeof WRITING_CATEGORY_LABELS].nl

  const strengths = [
    `Sterkste rubriek over deze simulatie: ${bestNl}.`,
    passesCount >= Math.ceil(bundles.length * 0.75)
      ? 'De meeste opdrachten zitten richting voldoende — dat helpt in één sessie.'
      : `${passesCount}/${bundles.length} opdrachten met voldoende score op taakniveau.`,
  ]

  const weaknesses = [
    `Meeste groei: ${weakNl}.`,
    timedOutCount > 0
      ? `Tijdslimiet: ${timedOutCount}× automatisch ingeleverd — oefen met klok erbij.`
      : 'Alle opdrachten binnen de tijd afgerond.',
  ]

  const perTask: WritingSimulationPerTaskRow[] = bundles.map((b, i) => {
    const pt = plan.tasks[i]
    const title = b.item.titleNl
    return {
      taskId: b.item.id,
      partLabelNl: pt?.partLabelNl ?? b.item.subtype,
      subtype: b.item.subtype,
      promptShortNl: title.length > 56 ? `${title.slice(0, 53)}…` : title,
      normalizedPercent: Math.round(b.engine.normalizedPercent),
      pass: b.engine.pass,
      timedOut: b.timedOut,
    }
  })

  const nextBestActions = buildWritingNextBestActions(syntheticEngine, {
    writingSubtype: bundles[0]?.item.subtype,
    mode: 'simulation',
  })

  const resultSummaryShape = {
    examSessionId: plan.sessionId,
    examType: 'writing' as const,
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
    patternNotesNl: patternNotes(bundles),
    strengths,
    weaknesses,
    perTask,
    nextBestActions,
    resultSummaryShape,
  }
}
