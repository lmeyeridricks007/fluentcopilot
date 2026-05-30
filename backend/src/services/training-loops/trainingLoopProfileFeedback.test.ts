import { describe, expect, it } from 'vitest'
import { completionEvidenceMagnitude } from '../../domain/trainingLoops/trainingLoopCompletionResultModels'
import { createEmptyUserLearningProfile } from '../../domain/learningMemory/userLearningProfileDocument'
import type { PersonalizedTrainingLoop } from '../../domain/trainingLoops/trainingLoopTypes'
import { applyTrainingLoopCompletionToLearningProfile } from './trainingLoopProfileFeedback'

function baseLoop(over: Partial<PersonalizedTrainingLoop>): PersonalizedTrainingLoop {
  return {
    id: 'loop-1',
    userId: 'u1',
    sourceSessionId: 'sess-1',
    threadId: null,
    sourceType: 'scenario',
    sourceScenarioId: null,
    loopSlot: 0,
    loopType: 'weak_words',
    title: 'Weak words',
    subtitle: null,
    reason: 'Practice',
    targetSkills: ['vocabulary'],
    targetWeaknessKeys: ['hallo'],
    estimatedMinutes: 2,
    difficulty: 'moderate',
    payload: { words: ['hallo'], exampleSentences: [], referenceAudioUrls: [], targetSkillIds: ['vocabulary'] },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
    status: 'active',
    confidence: 'medium',
    priorityScore: 1,
    dedupeKey: null,
    ...over,
  }
}

describe('applyTrainingLoopCompletionToLearningProfile', () => {
  it('nudges matching weak vocabulary recovery and severity', () => {
    let doc = createEmptyUserLearningProfile('u1')
    doc.weakVocabulary = [
      {
        normalizedKey: 'hallo',
        displayText: 'hallo',
        category: 'lex',
        severityScore: 1.2,
        confidence: 0.5,
        firstSeenAt: '2026-01-01T00:00:00.000Z',
        lastSeenAt: '2026-01-01T00:00:00.000Z',
        occurrences: 2,
        scenarioIds: [],
        evidenceRefs: [],
        recoveryScore: 0.2,
      },
    ]
    const loop = baseLoop({ targetWeaknessKeys: ['hallo'], targetSkills: ['vocabulary'] })
    doc = applyTrainingLoopCompletionToLearningProfile(doc, loop, '2026-02-01T12:00:00.000Z', {
      typedCompletion: { loopType: 'weak_words', wordsAttempted: 4, wordsCompleted: 3 },
    })
    const v = doc.weakVocabulary[0]
    expect(v.recoveryScore).toBeGreaterThan(0.2)
    expect(v.severityScore).toBeLessThan(1.2)
    expect(doc.version).toBe(1)
    expect(doc.userSkillProfile?.metrics.vocabulary?.evidenceCount).toBeGreaterThanOrEqual(1)
    expect(doc.practiceRecommendations.length).toBeGreaterThanOrEqual(0)
  })

  it('applies pronunciation weakness key match', () => {
    let doc = createEmptyUserLearningProfile('u1')
    doc.pronunciationIssues = [
      {
        targetKey: 'ui:vowel',
        issueType: 'vowel',
        severityScore: 0.9,
        confidence: 0.4,
        firstSeenAt: '2026-01-01T00:00:00.000Z',
        lastSeenAt: '2026-01-01T00:00:00.000Z',
        occurrences: 1,
        scenarioIds: [],
        evidenceRefs: [],
        recoveryScore: 0.2,
      },
    ]
    const loop = baseLoop({
      loopType: 'pronunciation_drill',
      targetWeaknessKeys: ['ui:vowel'],
      targetSkills: ['pronunciation'],
      payload: { words: ['ui'], soundFocus: 'ui', tips: [], referenceAudioUrls: [], targetSkillIds: ['pronunciation'] },
    })
    doc = applyTrainingLoopCompletionToLearningProfile(doc, loop, '2026-02-01T12:00:00.000Z', null)
    expect(doc.pronunciationIssues[0].recoveryScore).toBeGreaterThan(0.2)
  })

  it('feeds typed weak_words completion ratio into skill evidence magnitude', () => {
    const loop = baseLoop({ targetSkills: ['vocabulary'] })
    const low = completionEvidenceMagnitude(loop, { loopType: 'weak_words', wordsAttempted: 10, wordsCompleted: 1 })
    const high = completionEvidenceMagnitude(loop, { loopType: 'weak_words', wordsAttempted: 10, wordsCompleted: 10 })
    expect(high).toBeGreaterThan(low)
  })
})
