/**
 * Per-module readiness score from recent attempts (EMA + pass rate + stability).
 */
import type { ExamPrepTypeId } from '@/features/exam-prep/examPrepCatalog'
import type { ExamReadinessAttemptRecord } from '@/lib/exam-readiness/types'
import { attemptsForModule } from '@/lib/exam-readiness/examReadinessHistory'

export type ModuleReadinessSignals = {
  readinessScore: number | null
  recentPassRate: number | null
  attemptCount: number
  emaPercent: number
}

export function computeModuleReadinessSignals(module: ExamPrepTypeId): ModuleReadinessSignals {
  const attempts = attemptsForModule(module)
  return computeModuleReadinessSignalsFromAttempts(attempts)
}

export function computeModuleReadinessSignalsFromAttempts(
  attempts: ExamReadinessAttemptRecord[]
): ModuleReadinessSignals {
  const sorted = [...attempts].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const n = sorted.length
  if (n === 0) {
    return { readinessScore: null, recentPassRate: null, attemptCount: 0, emaPercent: 0 }
  }

  const oldestFirst = [...sorted].reverse()
  let ema = oldestFirst[0]!.normalizedPercent
  const alpha = 0.36
  for (let i = 1; i < oldestFirst.length; i++) {
    ema = alpha * oldestFirst[i]!.normalizedPercent + (1 - alpha) * ema
  }

  const recent = sorted.slice(0, Math.min(10, n))
  const recentPassRate = recent.filter((x) => x.pass).length / recent.length

  const percents = recent.map((r) => r.normalizedPercent)
  const mean = percents.reduce((a, b) => a + b, 0) / percents.length
  const varI =
    percents.length > 1 ? percents.reduce((s, p) => s + (p - mean) ** 2, 0) / percents.length : 0
  const stdev = Math.sqrt(varI)
  const volatilityPenalty = Math.min(14, stdev * 0.5)

  let score = ema * 0.64 + recentPassRate * 100 * 0.26 - volatilityPenalty
  if (n >= 6 && recentPassRate >= 0.65) score += 3
  score = Math.max(0, Math.min(100, Math.round(score)))

  return {
    readinessScore: n >= 2 ? score : null,
    recentPassRate,
    attemptCount: n,
    emaPercent: Math.round(ema),
  }
}
