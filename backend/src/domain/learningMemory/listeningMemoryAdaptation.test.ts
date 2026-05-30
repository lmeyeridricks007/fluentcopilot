import { describe, expect, it } from 'vitest'
import { createEmptyUserLearningProfile } from './userLearningProfileDocument'
import type { ListeningMemorySignalRow } from './listeningMemorySignalTypes'
import {
  formatLanguageCoachListeningAdaptationRules,
  listeningMemoryScenarioMerge,
} from './listeningMemoryAdaptation'

const now = '2026-04-01T12:00:00.000Z'

function strongSignal(signalId: 'fast_transport_replies_struggle' | 'gist_strong_detail_weak'): ListeningMemorySignalRow {
  return {
    signalId,
    label: 'x',
    severityScore: 1.2,
    confidence: 0.55,
    firstSeenAt: now,
    lastSeenAt: now,
    occurrences: 4,
    evidenceRefs: ['e1'],
    recoveryScore: 0.2,
  }
}

describe('listeningMemoryScenarioMerge', () => {
  it('returns empty merge when cold profile', () => {
    const doc = createEmptyUserLearningProfile('u1')
    doc.totalSessionsObserved = 1
    doc.listeningMemorySignals = [strongSignal('fast_transport_replies_struggle')]
    const m = listeningMemoryScenarioMerge(doc, 'train_station')
    expect(m.hints).toEqual([])
    expect(m.dimensionPatches).toEqual({})
  })

  it('adds pacing hints and patches for transport + fast transport struggle (non-stretch)', () => {
    const doc = createEmptyUserLearningProfile('u1')
    doc.totalSessionsObserved = 4
    doc.listeningMemorySignals = [strongSignal('fast_transport_replies_struggle')]
    const m = listeningMemoryScenarioMerge(doc, 'train_station', { sessionStance: 'balanced' })
    expect(m.dimensionPatches.tolerance).toBe('patient')
    expect(m.dimensionPatches.responseLength).toBe('shorter')
    expect(m.dimensionPatches.pressure).toBe('low')
    expect(m.hints.some((h) => h.includes('Listening memory'))).toBe(true)
  })

  it('does not shrink responseLength when stance is stretch', () => {
    const doc = createEmptyUserLearningProfile('u1')
    doc.totalSessionsObserved = 4
    doc.listeningMemorySignals = [strongSignal('fast_transport_replies_struggle')]
    const m = listeningMemoryScenarioMerge(doc, 'train_station', { sessionStance: 'stretch' })
    expect(m.dimensionPatches.responseLength).toBeUndefined()
    expect(m.dimensionPatches.pressure).toBeUndefined()
    expect(m.dimensionPatches.tolerance).toBe('patient')
    expect(m.hints.some((h) => h.includes('richer vocabulary'))).toBe(true)
  })

  it('sets confirm_more for gist/detail weak', () => {
    const doc = createEmptyUserLearningProfile('u1')
    doc.totalSessionsObserved = 4
    doc.listeningMemorySignals = [strongSignal('gist_strong_detail_weak')]
    const m = listeningMemoryScenarioMerge(doc, 'small_talk')
    expect(m.dimensionPatches.followUpDepth).toBe('confirm_more')
  })
})

describe('formatLanguageCoachListeningAdaptationRules', () => {
  it('returns null on cold start', () => {
    const doc = createEmptyUserLearningProfile('u1')
    doc.totalSessionsObserved = 4
    doc.listeningMemorySignals = [strongSignal('fast_transport_replies_struggle')]
    expect(formatLanguageCoachListeningAdaptationRules(doc, true)).toBeNull()
  })

  it('includes comprehension guardrails when not cold', () => {
    const doc = createEmptyUserLearningProfile('u1')
    doc.totalSessionsObserved = 4
    doc.listeningMemorySignals = [strongSignal('fast_transport_replies_struggle')]
    const block = formatLanguageCoachListeningAdaptationRules(doc, false)
    expect(block).toContain('Comprehension guardrails')
    expect(block).toContain('fast_transport_replies_struggle')
  })
})

describe('listeningMemoryScenarioMerge — scenario adaptation hooks', () => {
  function svcSignal(): ListeningMemorySignalRow {
    return {
      signalId: 'misses_short_service_questions',
      label: 'Short service',
      severityScore: 1.1,
      confidence: 0.55,
      firstSeenAt: now,
      lastSeenAt: now,
      occurrences: 3,
      evidenceRefs: ['e1'],
      recoveryScore: 0.25,
    }
  }

  it('adds service-counter hints for supermarket slug when service-question weakness is strong', () => {
    const doc = createEmptyUserLearningProfile('u1')
    doc.totalSessionsObserved = 4
    doc.listeningMemorySignals = [svcSignal()]
    const m = listeningMemoryScenarioMerge(doc, 'supermarket_shop', { sessionStance: 'balanced' })
    expect(m.hints.some((h) => h.includes('service-style') || h.includes('service'))).toBe(true)
  })
})
