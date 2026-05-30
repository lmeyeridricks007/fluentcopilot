/**
 * Map writing training/simulation scoring → structured learning signals.
 */
import type { WritingSimulationTaskBundle } from '@/lib/exam-prep/writing/types'
import type { WritingTrainingEvaluationBundle } from '@/lib/exam-prep/writing/types'
import type { ExamLearningSignal } from '@/lib/exam-learning-loop/types'
import type { ExamRubricScoreRow } from '@/lib/schemas/exam/scoringResult.schema'

function slug(s: string, max = 40): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, max)
}

function rubricRatio(row: Pick<ExamRubricScoreRow, 'score' | 'maxScore'>): number {
  return row.score / Math.max(1, row.maxScore)
}

function signalsFromWritingRubric(rows: ExamRubricScoreRow[], _exerciseId: string): ExamLearningSignal[] {
  const out: ExamLearningSignal[] = []
  for (const row of rows) {
    const r = rubricRatio(row)
    if (r >= 0.55) continue
    const w: 1 | 2 | 3 = r < 0.3 ? 3 : 2
    const key = row.categoryKey
    let category: ExamLearningSignal['category'] = 'grammar'
    if (key === 'vocabulary') category = 'vocab'
    else if (key === 'spelling') category = 'spelling'
    else if (key === 'execution' || key === 'clearness') category = 'structural'

    out.push({
      category,
      subkind: key,
      weight: w,
      dedupeKey: `rubric-${key}`,
      weakTag: `exam-writing-rubric-${slug(key)}-low`,
      reviewHint: {
        type: key === 'spelling' ? 'grammar' : 'grammar',
        prompt: `Schrijven — ${row.label ?? key}: lees het model en herhaal de kern.`,
        expectedAnswer: row.evidence?.slice(0, 220) || `Let op: ${key} bij examenschrift.`,
        tags: ['exam_prep', 'writing', key],
      },
    })
  }
  return out
}

function weakTagSignals(tags: string[], _exerciseId: string): ExamLearningSignal[] {
  return tags.map((t) => ({
    category: t.includes('vocab') ? 'vocab' : t.includes('spell') ? 'spelling' : t.includes('execution') ? 'structural' : 'grammar',
    subkind: `weak-${slug(t, 24)}`,
    weight: 2 as const,
    dedupeKey: `weak-${slug(t, 32)}`,
    weakTag: t.startsWith('exam-') ? t : `exam-writing-${slug(t, 28)}`,
  }))
}

export function mapWritingTrainingToSignals(bundle: WritingTrainingEvaluationBundle): ExamLearningSignal[] {
  const { item, engine, coach } = bundle
  const signals: ExamLearningSignal[] = []
  signals.push(...signalsFromWritingRubric(engine.rubricScores, item.id))
  signals.push(...weakTagSignals(engine.weakTags, item.id))

  coach.corrections.slice(0, 4).forEach((c, i) => {
    signals.push({
      category: 'grammar',
      subkind: 'correction',
      weight: 3,
      dedupeKey: `corr-${slug(c.originalFragment, 20)}-${i}`,
      weakTag: 'exam-writing-grammar-correction',
      reviewHint: {
        type: 'phrase',
        prompt: `Schrijf dit beter: “${c.originalFragment.slice(0, 80)}”`,
        expectedAnswer: c.correctedFragment,
        tags: ['exam_prep', 'writing', 'correction'],
      },
      mistakeContext: {
        userSnippet: c.originalFragment,
        targetSnippet: c.correctedFragment,
        noteNl: c.explanationNl,
      },
    })
  })

  coach.categoryEntries.forEach((e) => {
    const r = e.maxScore > 0 ? e.score / e.maxScore : 1
    if (r >= 0.55) return
    const w: 1 | 2 | 3 = r < 0.35 ? 3 : 2
    signals.push({
      category:
        e.categoryKey === 'vocabulary'
          ? 'vocab'
          : e.categoryKey === 'spelling'
            ? 'spelling'
            : e.categoryKey === 'execution' || e.categoryKey === 'clearness'
              ? 'structural'
              : 'grammar',
      subkind: `coach-${e.categoryKey}`,
      weight: w,
      dedupeKey: `coach-${e.categoryKey}`,
      weakTag: `exam-writing-coach-${e.categoryKey}-low`,
    })
  })

  if (engine.executionGatingApplied) {
    signals.push({
      category: 'structural',
      subkind: 'execution-gate',
      weight: 3,
      dedupeKey: 'execution-gate',
      weakTag: 'exam-writing-execution-gated',
    })
  }

  ;(coach.mistakeOrientedTags ?? []).forEach((t) => {
    signals.push({
      category: 'grammar',
      subkind: `mistag-${slug(t, 20)}`,
      weight: 2,
      dedupeKey: `mot-${slug(t, 28)}`,
      weakTag: `exam-mistake-${slug(t, 32)}`,
    })
  })

  return signals
}

export function mapWritingSimulationToSignals(bundle: WritingSimulationTaskBundle): ExamLearningSignal[] {
  const { item, engine } = bundle
  const signals: ExamLearningSignal[] = []
  signals.push(...signalsFromWritingRubric(engine.rubricScores, item.id))
  signals.push(...weakTagSignals(engine.weakTags, item.id))
  if (engine.executionGatingApplied) {
    signals.push({
      category: 'structural',
      subkind: 'execution-gate',
      weight: 3,
      dedupeKey: 'execution-gate',
      weakTag: 'exam-writing-simulation-execution-gated',
    })
  }
  if (bundle.timedOut) {
    signals.push({
      category: 'structural',
      subkind: 'timeout',
      weight: 2,
      dedupeKey: 'timed-out',
      weakTag: 'exam-writing-simulation-timeout',
    })
  }
  return signals
}
