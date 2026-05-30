/**
 * Content engine — quality gate: map validation result + policy to outcome.
 */

import type { ArtifactType } from '../types/artifacts.js'
import type { GateOutcome, ValidationReport } from '../types/validation.js'

export interface QualityGatePolicy {
  auto_approve_artifact_types?: ArtifactType[]
  require_manual_review_types?: ArtifactType[]
  min_score_for_auto_approve?: number
}

const defaultPolicy: QualityGatePolicy = {
  auto_approve_artifact_types: ['VocabularyItem'],
  require_manual_review_types: ['Dialogue', 'LessonBlueprint', 'LessonInstance', 'ExamTask', 'ReflectionLessonDraft'],
  min_score_for_auto_approve: 90,
}

export function evaluateGate(
  artifactType: ArtifactType,
  report: ValidationReport,
  policy: QualityGatePolicy = defaultPolicy
): GateOutcome {
  if (!report.passed) {
    return { outcome: 'auto_reject', report }
  }
  if (policy.require_manual_review_types?.includes(artifactType)) {
    return { outcome: 'manual_review', report }
  }
  const score = report.overall_score ?? 0
  if (
    policy.auto_approve_artifact_types?.includes(artifactType) &&
    score >= (policy.min_score_for_auto_approve ?? 90)
  ) {
    return { outcome: 'auto_approve', report }
  }
  return { outcome: 'manual_review', report }
}
