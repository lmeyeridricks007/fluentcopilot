import { describe, expect, it } from 'vitest'
import {
  USER_LEARNING_PROFILE_SCHEMA_VERSION,
  createEmptyUserLearningProfile,
  parseUserLearningProfileDocument,
  serializeUserLearningProfileDocument,
} from './userLearningProfileDocument'

describe('parseUserLearningProfileDocument / serializeUserLearningProfileDocument', () => {
  it('returns empty profile for null / empty / invalid JSON', () => {
    expect(parseUserLearningProfileDocument(null, 'u1').userId).toBe('u1')
    expect(parseUserLearningProfileDocument('', 'u1').weakVocabulary).toEqual([])
    expect(parseUserLearningProfileDocument('{not json', 'u1').schemaVersion).toBe(USER_LEARNING_PROFILE_SCHEMA_VERSION)
  })

  it('returns empty profile for unknown schemaVersion', () => {
    const raw = JSON.stringify({ schemaVersion: 999, userId: 'u1', weakVocabulary: [{ bogus: true }] })
    const doc = parseUserLearningProfileDocument(raw, 'u1')
    expect(doc.weakVocabulary).toEqual([])
  })

  it('round-trips a minimal v2 document', () => {
    const base = createEmptyUserLearningProfile('user-42')
    base.totalSessionsObserved = 3
    base.activeFocusAreas = ['articles']
    base.weakVocabulary.push({
      normalizedKey: 'huis',
      displayText: 'huis',
      category: 'noun',
      severityScore: 1.2,
      confidence: 0.55,
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      lastSeenAt: '2026-01-15T00:00:00.000Z',
      occurrences: 2,
      scenarioIds: ['sc1'],
      evidenceRefs: ['e1'],
      recoveryScore: 0.3,
    })
    const json = serializeUserLearningProfileDocument(base)
    const back = parseUserLearningProfileDocument(json, 'user-42')
    expect(back.userId).toBe('user-42')
    expect(back.totalSessionsObserved).toBe(3)
    expect(back.activeFocusAreas).toEqual(['articles'])
    expect(back.weakVocabulary.some((v) => v.normalizedKey === 'huis')).toBe(true)
  })

  it('normalizes v2 partial: drops invalid weakness rows', () => {
    const raw = JSON.stringify({
      schemaVersion: USER_LEARNING_PROFILE_SCHEMA_VERSION,
      userId: 'u',
      weakVocabulary: [{ normalizedKey: 'ok', displayText: 'ok', category: 'x', severityScore: 1, confidence: 0.5, firstSeenAt: 't', lastSeenAt: 't', occurrences: 1, scenarioIds: [], evidenceRefs: [], recoveryScore: 0.2 }, {}],
    } satisfies Record<string, unknown>)
    const doc = parseUserLearningProfileDocument(raw, 'u')
    expect(doc.weakVocabulary).toHaveLength(1)
    expect(doc.weakVocabulary[0].normalizedKey).toBe('ok')
  })
})
