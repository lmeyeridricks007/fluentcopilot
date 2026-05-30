/**
 * Content engine — quality gate tests.
 */

import { describe, it, expect } from 'vitest'
import { evaluateGate } from '../review/qualityGate.js'
import type { ValidationReport } from '../types/validation.js'

describe('evaluateGate', () => {
  it('returns auto_reject when report not passed', () => {
    const report: ValidationReport = {
      artifact_ref: 'x',
      passed: false,
      checks: [{ name: 'schema', passed: false, message: 'Invalid', severity: 'error' }],
    }
    const out = evaluateGate('VocabularyItem', report)
    expect(out.outcome).toBe('auto_reject')
  })

  it('returns manual_review for Dialogue even when passed', () => {
    const report: ValidationReport = {
      artifact_ref: 'x',
      passed: true,
      checks: [{ name: 'schema', passed: true }],
      overall_score: 95,
    }
    const out = evaluateGate('Dialogue', report)
    expect(out.outcome).toBe('manual_review')
  })

  it('returns auto_approve for VocabularyItem when score high', () => {
    const report: ValidationReport = {
      artifact_ref: 'x',
      passed: true,
      checks: [{ name: 'schema', passed: true }],
      overall_score: 92,
    }
    const out = evaluateGate('VocabularyItem', report)
    expect(out.outcome).toBe('auto_approve')
  })
})
