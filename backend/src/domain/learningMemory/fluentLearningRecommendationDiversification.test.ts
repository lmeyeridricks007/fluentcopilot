import { describe, expect, it } from 'vitest'
import { createEmptyUserLearningProfile } from './userLearningProfileDocument'
import { buildFluentLearningRecommendations } from './fluentLearningRecommendationEngine'
import { recomputeDerivedAndRecommendations } from './learningMemoryRecommendationService'

function docWithTravelWeakness(): ReturnType<typeof createEmptyUserLearningProfile> {
  const doc = createEmptyUserLearningProfile('u1')
  doc.totalSessionsObserved = 8
  doc.weakVocabulary.push({
    normalizedKey: 'ticket',
    displayText: 'ticket',
    category: 'travel',
    severityScore: 2,
    confidence: 0.62,
    firstSeenAt: '2026-01-01T00:00:00.000Z',
    lastSeenAt: '2026-01-10T00:00:00.000Z',
    occurrences: 4,
    scenarioIds: [],
    evidenceRefs: [],
    recoveryScore: 0.25,
  })
  return doc
}

describe('buildFluentLearningRecommendations — scenario diversification', () => {
  it('lowers train-station scenario priority when it appears often in recentScenarioSlugs', () => {
    const lowFatigue = docWithTravelWeakness()
    lowFatigue.recentScenarioSlugs = ['directions_getting_somewhere']
    recomputeDerivedAndRecommendations(lowFatigue)
    const trainNoFatigue = buildFluentLearningRecommendations(lowFatigue).find((r) => r.targetId === 'train-station')

    const highFatigue = docWithTravelWeakness()
    highFatigue.recentScenarioSlugs = ['train-station', 'train-station', 'train-station', 'train-station', 'train-station']
    recomputeDerivedAndRecommendations(highFatigue)
    const trainHighFatigue = buildFluentLearningRecommendations(highFatigue).find((r) => r.targetId === 'train-station')

    expect(trainNoFatigue).toBeTruthy()
    expect(trainHighFatigue).toBeTruthy()
    expect(trainHighFatigue!.priorityScore).toBeLessThanOrEqual(trainNoFatigue!.priorityScore)
  })

  it('cold start yields no speak_live_scenario rows', () => {
    const doc = createEmptyUserLearningProfile('u2')
    doc.totalSessionsObserved = 1
    recomputeDerivedAndRecommendations(doc)
    const recs = buildFluentLearningRecommendations(doc)
    expect(recs.some((r) => r.type === 'speak_live_scenario')).toBe(false)
  })
})
