import { describe, it, expect } from 'vitest'
import { MOCK_BETA_TEMPORARY_PASSWORD } from '@/lib/auth/mockAuthConstants'
import {
  getMockBetaUserByEmail,
  getMockUserByEmail,
  getMockUserPlan,
  canAccessClosedBeta,
  validateMockBetaCredentials,
  validateMockUserCredentials,
  validateMockCredentials,
  canLoginToClosedBeta,
  listMockBetaInviteEmails,
} from '@/lib/auth/mockUserLookup'

describe('mock beta user lookup', () => {
  it('resolves Lee hotmail vs gmail by email (distinct plans)', () => {
    const hotmail = getMockBetaUserByEmail('LeeMeyeridricks@hotmail.com')
    const gmail = getMockUserByEmail('leemeyeridricks@gmail.com')
    expect(hotmail?.plan).toBe('premium')
    expect(gmail?.plan).toBe('basic')
    expect(hotmail?.id).not.toBe(gmail?.id)
  })

  it('getMockUserPlan returns null for unknown email', () => {
    expect(getMockUserPlan('unknown@example.com')).toBeNull()
  })

  it('canAccessClosedBeta is true for invited active users', () => {
    expect(canAccessClosedBeta('aneta.dolinska@gmail.com')).toBe(true)
  })

  it('validateMockBetaCredentials accepts shared temporary password', () => {
    const r = validateMockBetaCredentials('alexis@gmail.com', MOCK_BETA_TEMPORARY_PASSWORD)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.user.displayName).toBe('Alexis')
  })

  it('validateMockUserCredentials rejects wrong password', () => {
    const r = validateMockUserCredentials('sharon@gmail.com', 'wrong')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('password_invalid')
  })

  it('validateMockCredentials matches validateMockBetaCredentials', () => {
    const a = validateMockCredentials('marius@gmail.com', MOCK_BETA_TEMPORARY_PASSWORD)
    const b = validateMockBetaCredentials('marius@gmail.com', MOCK_BETA_TEMPORARY_PASSWORD)
    expect(a).toEqual(b)
  })

  it('canLoginToClosedBeta matches active + flag', () => {
    const u = getMockBetaUserByEmail('aneta.dolinska@gmail.com')
    expect(u).toBeDefined()
    if (u) expect(canLoginToClosedBeta(u)).toBe(true)
  })

  it('listMockBetaInviteEmails has six invites', () => {
    expect(listMockBetaInviteEmails()).toHaveLength(6)
  })
})
