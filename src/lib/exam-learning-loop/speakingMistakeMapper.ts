/**
 * Map speaking training/simulation scoring → structured learning signals.
 */
import type { SpeakingSimulationQuestionBundle } from '@/lib/exam-prep/speaking/types'
import type { SpeakingTrainingEvaluationBundle } from '@/lib/exam-prep/speaking/types'
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

function signalsFromEngineRubric(
  rows: ExamRubricScoreRow[],
  _exerciseId: string,
  domain: 'speaking'
): ExamLearningSignal[] {
  const out: ExamLearningSignal[] = []
  for (const row of rows) {
    const r = rubricRatio(row)
    if (r >= 0.55) continue
    const w: 1 | 2 | 3 = r < 0.3 ? 3 : 2
    const key = row.categoryKey
    let category: ExamLearningSignal['category'] = 'grammar'
    if (key === 'vocabulary') category = 'vocab'
    else if (key === 'execution') category = 'structural'
    else if (key === 'fluency') category = 'fluency'
    else if (key === 'pronunciation') category = 'pronunciation'
    else if (key === 'clearness') category = 'structural'

    out.push({
      category,
      subkind: key,
      weight: w,
      dedupeKey: `rubric-${key}`,
      weakTag: `exam-${domain}-rubric-${slug(key)}-low`,
      reviewHint: {
        type: 'speaking',
        prompt: `Spreken — ${row.label ?? key}: oefen het modelantwoord.`,
        expectedAnswer: row.evidence?.slice(0, 200) || `Verbeter uw antwoord op de examenvraag (${key}).`,
        tags: ['exam_prep', 'speaking', key],
      },
    })
  }
  return out
}

function weakTagSignals(tags: string[], _exerciseId: string, domain: 'speaking'): ExamLearningSignal[] {
  return tags.map((t) => ({
    category: t.includes('vocab') ? 'vocab' : t.includes('execution') ? 'structural' : 'grammar',
    subkind: `weak-${slug(t, 24)}`,
    weight: 2 as const,
    dedupeKey: `weak-${slug(t, 32)}`,
    weakTag: t.startsWith('exam-') ? t : `exam-${domain}-${slug(t, 28)}`,
  }))
}

export function mapSpeakingTrainingToSignals(bundle: SpeakingTrainingEvaluationBundle): ExamLearningSignal[] {
  const { item, engine, coach } = bundle
  const id = item.id
  const signals: ExamLearningSignal[] = []

  signals.push(...signalsFromEngineRubric(engine.rubricScores, id, 'speaking'))
  signals.push(...weakTagSignals(engine.weakTags, id, 'speaking'))

  coach.corrections.slice(0, 4).forEach((c, i) => {
    signals.push({
      category: 'grammar',
      subkind: 'correction',
      weight: 3,
      dedupeKey: `corr-${slug(c.originalFragment, 20)}-${i}`,
      weakTag: 'exam-speaking-grammar-correction',
      reviewHint: {
        type: 'phrase',
        prompt: `Vervang dit fragment: “${c.originalFragment.slice(0, 80)}”`,
        expectedAnswer: c.correctedFragment,
        tags: ['exam_prep', 'speaking', 'correction'],
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
          : e.categoryKey === 'execution' || e.categoryKey === 'clearness'
            ? 'structural'
            : e.categoryKey === 'fluency'
              ? 'fluency'
              : e.categoryKey === 'pronunciation'
                ? 'pronunciation'
                : 'grammar',
      subkind: `coach-${e.categoryKey}`,
      weight: w,
      dedupeKey: `coach-${e.categoryKey}`,
      weakTag: `exam-speaking-coach-${e.categoryKey}-low`,
    })
  })

  if (engine.executionGatingApplied) {
    signals.push({
      category: 'structural',
      subkind: 'execution-gate',
      weight: 3,
      dedupeKey: 'execution-gate',
      weakTag: 'exam-speaking-execution-gated',
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

export function mapSpeakingSimulationToSignals(bundle: SpeakingSimulationQuestionBundle): ExamLearningSignal[] {
  const { item, engine } = bundle
  const signals: ExamLearningSignal[] = []
  signals.push(...signalsFromEngineRubric(engine.rubricScores, item.id, 'speaking'))
  signals.push(...weakTagSignals(engine.weakTags, item.id, 'speaking'))
  if (engine.executionGatingApplied) {
    signals.push({
      category: 'structural',
      subkind: 'execution-gate',
      weight: 3,
      dedupeKey: 'execution-gate',
      weakTag: 'exam-speaking-simulation-execution-gated',
    })
  }
  if (bundle.timedOut) {
    signals.push({
      category: 'structural',
      subkind: 'timeout',
      weight: 2,
      dedupeKey: 'timed-out',
      weakTag: 'exam-speaking-simulation-timeout',
    })
  }
  return signals
}
