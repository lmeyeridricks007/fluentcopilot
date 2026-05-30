/**
 * Content engine — validator interfaces.
 * Validators are pure functions: (artifact, context) => CheckResult[]
 */

import type { NormalizedArtifact } from '../types/artifacts.js'
import type { CheckResult, ValidationReport } from '../types/validation.js'

export interface ValidationContext {
  locale: string
  scenario_id?: string
  scenario_code?: string
  existing_store_ref?: unknown
  allowed_cefr_levels?: string[]
}

export type ValidatorFn = (
  artifact: NormalizedArtifact,
  context: ValidationContext
) => CheckResult[] | Promise<CheckResult[]>

export interface IValidatorRegistry {
  getValidators(artifactType: string): ValidatorFn[]
  register(artifactType: string, name: string, fn: ValidatorFn): void
}

export function buildValidationReport(
  artifactRef: string,
  checks: CheckResult[],
  options?: { overall_score?: number; recommendations?: string[] }
): ValidationReport {
  const passed = checks.filter((c) => c.severity === 'error' || !c.severity).every((c) => c.passed)
  return {
    artifact_ref: artifactRef,
    passed,
    checks,
    overall_score: options?.overall_score,
    recommendations: options?.recommendations,
  }
}
