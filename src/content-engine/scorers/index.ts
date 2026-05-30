/**
 * Content engine — scoring: compute quality score from artifact + validation report.
 */

import type { NormalizedArtifact } from '../types/artifacts.js'
import type { ValidationReport } from '../types/validation.js'

export interface QualityScore {
  score: number
  factors?: Record<string, number>
}

export function scoreFromReport(
  _artifact: NormalizedArtifact,
  report: ValidationReport
): QualityScore {
  const passedCount = report.checks.filter((c) => c.passed).length
  const total = report.checks.length
  const score = total > 0 ? Math.round((passedCount / total) * 100) : 0
  return {
    score: report.overall_score ?? score,
    factors: { checks_passed: passedCount, checks_total: total },
  }
}
