/**
 * Content engine — validation and quality gate types.
 */

export type CheckSeverity = 'error' | 'warning'

export interface CheckResult {
  name: string
  passed: boolean
  message?: string
  severity?: CheckSeverity
}

export interface ValidationReport {
  artifact_ref: string
  passed: boolean
  checks: CheckResult[]
  overall_score?: number
  recommendations?: string[]
}

export type GateOutcome =
  | { outcome: 'auto_reject'; report: ValidationReport }
  | { outcome: 'auto_retry'; report: ValidationReport }
  | { outcome: 'manual_review'; report: ValidationReport }
  | { outcome: 'auto_approve'; report: ValidationReport }
