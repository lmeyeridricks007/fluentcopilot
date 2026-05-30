import type { ExamPrepTypeId } from '@/features/exam-prep/examPrepCatalog'
import type { ModuleReadinessModel } from '@/lib/exam-readiness/types'

/** Picks the next exam URL to open — mirrors landing/hub “recommended next step” logic. */
export function pickExamPrepRecommendedHref(
  modules: ModuleReadinessModel[],
  focus?: ExamPrepTypeId
): string {
  if (focus) {
    return modules.find((m) => m.module === focus)?.recommendedHref ?? '/app/exam-prep'
  }
  const active = [...modules].filter((m) => m.attemptCount > 0)
  if (active.length === 0) return '/app/exam-prep/speaking/training'
  active.sort((a, b) => (a.readinessScore ?? 999) - (b.readinessScore ?? 999))
  return active[0]!.recommendedHref
}
