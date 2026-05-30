/**
 * Build attempt rows from any scored exam loop input and persist.
 */
import type { ExamPrepTypeId } from '@/features/exam-prep/examPrepCatalog'
import type { ExamReadinessAttemptRecord } from '@/lib/exam-readiness/types'
import type { ExamReadinessLoopInput } from '@/lib/exam-readiness/examReadinessLoopInput'
import { appendExamReadinessAttempt } from '@/lib/exam-readiness/examReadinessHistory'

function weakKeysFromEngine(engine: {
  rubricScores: { categoryKey: string; score: number; maxScore: number }[]
}): string[] {
  return [...engine.rubricScores]
    .map((r) => ({ k: r.categoryKey, ratio: r.score / Math.max(1, r.maxScore) }))
    .filter((x) => x.ratio < 0.55)
    .sort((a, b) => a.ratio - b.ratio)
    .map((x) => x.k)
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `era-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function buildExamReadinessAttemptRecord(input: ExamReadinessLoopInput): ExamReadinessAttemptRecord {
  switch (input.kind) {
    case 'speaking_training':
    case 'speaking_simulation': {
      const e = input.bundle.engine
      return {
        id: newId(),
        at: new Date().toISOString(),
        module: 'speaking',
        mode: input.kind === 'speaking_simulation' ? 'simulation' : 'training',
        normalizedPercent: Math.round(e.normalizedPercent),
        pass: e.pass,
        weakRubricKeys: weakKeysFromEngine(e),
        facets: [input.bundle.item.subtype, input.bundle.item.scenarioGroupId].filter(Boolean) as string[],
      }
    }
    case 'writing_training':
    case 'writing_simulation': {
      const e = input.bundle.engine
      return {
        id: newId(),
        at: new Date().toISOString(),
        module: 'writing',
        mode: input.kind === 'writing_simulation' ? 'simulation' : 'training',
        normalizedPercent: Math.round(e.normalizedPercent),
        pass: e.pass,
        weakRubricKeys: weakKeysFromEngine(e),
        facets: [input.bundle.item.subtype],
      }
    }
    case 'listening': {
      const pct = input.correct ? 86 : 48
      return {
        id: newId(),
        at: new Date().toISOString(),
        module: 'listening',
        mode: 'training',
        normalizedPercent: pct,
        pass: input.correct,
        weakRubricKeys: input.correct ? [] : [input.questionType],
        facets: [
          `listening:${input.questionType}`,
          input.maxReplay > 0 && input.replayCount / input.maxReplay >= 0.66 ? 'replay-heavy' : '',
        ].filter(Boolean),
      }
    }
    case 'reading': {
      const pct = input.correct ? 86 : 48
      return {
        id: newId(),
        at: new Date().toISOString(),
        module: 'reading',
        mode: 'training',
        normalizedPercent: pct,
        pass: input.correct,
        weakRubricKeys: input.correct ? [] : [input.readingSkill],
        facets: [`reading:${input.readingSkill}`],
      }
    }
    case 'kmn': {
      const pct = input.correct ? 88 : 46
      return {
        id: newId(),
        at: new Date().toISOString(),
        module: 'kmn',
        mode: 'training',
        normalizedPercent: pct,
        pass: input.correct,
        weakRubricKeys: input.correct ? [] : [`${input.surface}`, input.topicId],
        facets: [`kmn:${input.topicId}`, input.surface],
      }
    }
  }
}

/** Call after every scored exam interaction (even when mistake signals are empty). */
export function recordExamReadinessFromLoopInput(input: ExamReadinessLoopInput): void {
  if (typeof window === 'undefined') return
  const row = buildExamReadinessAttemptRecord(input)
  appendExamReadinessAttempt(row)
}

/** Optional: aggregate session (e.g. simulation report) as one reading — avoids double-weighting if you skip per-item. */
export function recordExamReadinessAggregate(input: {
  module: ExamPrepTypeId
  mode: ExamReadinessAttemptRecord['mode']
  normalizedPercent: number
  pass: boolean
  weakRubricKeys: string[]
  facets?: string[]
}): void {
  if (typeof window === 'undefined') return
  appendExamReadinessAttempt({
    id: newId(),
    at: new Date().toISOString(),
    module: input.module,
    mode: input.mode,
    normalizedPercent: Math.round(input.normalizedPercent),
    pass: input.pass,
    weakRubricKeys: input.weakRubricKeys,
    facets: input.facets ?? [],
  })
}
