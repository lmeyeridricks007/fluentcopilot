import { describe, expect, it } from 'vitest'
import {
  learnerLineLooksLikeCustomerQuestion,
  referenceLooksLikeStaffAffirmationAnsweringCustomer,
} from './liveSessionLearnerReferenceGuards'

describe('liveSessionLearnerReferenceGuards (legacy QA heuristics)', () => {
  it('detects customer questions and staff-style affirmations', () => {
    expect(learnerLineLooksLikeCustomerQuestion('Mag ik hier scannen?')).toBe(true)
    expect(referenceLooksLikeStaffAffirmationAnsweringCustomer('Ja, u kunt hier scannen.')).toBe(true)
    expect(referenceLooksLikeStaffAffirmationAnsweringCustomer('Mag ik hier scannen?')).toBe(false)
  })
})
