import { describe, expect, it } from 'vitest'
import type { ConversationMessage } from '../../models/contracts'
import type { TurnEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import {
  buildPhoneCallPerformance,
  findPrecedingAssistantLine,
  PHONE_CALL_WEIGHT_BY_DIMENSION,
} from './phoneCallSessionEvaluation'

function msg(p: Partial<ConversationMessage> & Pick<ConversationMessage, 'id' | 'sender' | 'content'>): ConversationMessage {
  return {
    threadId: 't1',
    messageType: 'text',
    metadata: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...p,
  } as ConversationMessage
}

function baseTurn(overrides: Partial<TurnEvaluation>): TurnEvaluation {
  return {
    turnId: 'u1',
    turnIndex: 0,
    learnerTranscript: 'Ja, morgen om tien uur.',
    transcriptOriginal: 'Ja, morgen om tien uur.',
    transcriptNormalized: 'ja morgen om tien uur',
    originalAudioUrl: null,
    transcriptConfidence: 'high',
    scenarioGoalTags: [],
    scenarioGoalFit: { summary: '', alignmentScore: 70, relevantGoals: [] },
    transcriptCoaching: {
      meaningClarityScore: 70,
      grammarScore: 70,
      naturalnessScore: 70,
      levelFitScore: 70,
      issues: [],
      strengths: [],
      rewriteOptions: { safeForLevel: null, moreNatural: null, stretch: null },
      patternToReuse: null,
      explanations: [],
      evidenceLines: [],
    },
    audioCoaching: null,
    naturalRewrite: null,
    savedWordCandidates: [],
    recommendedDrills: [],
    dimensions: [],
    signalSources: {
      audioMetrics: 'azure_audio',
      languageCoach: 'transcript_language',
      scenarioContext: 'scenario_context',
    },
    feedbackItems: [],
    pronunciationIssues: [],
    fluencyIssues: [],
    referenceSentence: '',
    referenceSentenceReason: '',
    referenceKind: 'reference_pronunciation',
    referenceAudioUrl: null,
    learnerAudioUrl: null,
    quickLabels: { pronunciation: '—', rhythm: '—', naturalness: '—' },
    audioFindings: [],
    keyStrengths: [],
    keyProblems: [],
    focusWords: [],
    dutchLikenessNarrative: '',
    chunkingRhythmSuggestion: '',
    voiceAnalysisUnavailableMessage: null,
    improvementActions: [],
    assistantContext: null,
    audioScores: { pronunciation: 80, fluency: 70, rhythm: 70, completeness: 80, clarity: 75 },
    languageScores: { naturalness: 72, contextualFit: 74, registerFit: 70, grammaticalStability: 75 },
    combinedScores: { overallTurnScore: 74, clarityScore: 76, dutchLikenessScore: 72 },
    ...overrides,
  } as TurnEvaluation
}

describe('findPrecedingAssistantLine', () => {
  it('returns the last assistant message before the user turn', () => {
    const messages: ConversationMessage[] = [
      msg({ id: 'a0', sender: 'assistant', content: 'Goedemiddag.' }),
      msg({ id: 'u0', sender: 'user', content: 'Hallo.' }),
      msg({ id: 'a1', sender: 'assistant', content: 'Wat is uw naam?' }),
      msg({ id: 'u1', sender: 'user', content: 'Ik ben Kim.' }),
    ]
    expect(findPrecedingAssistantLine(messages, 'u1')).toBe('Wat is uw naam?')
    expect(findPrecedingAssistantLine(messages, 'u0')).toBe('Goedemiddag.')
  })

  it('returns empty when there is no preceding assistant', () => {
    const messages: ConversationMessage[] = [msg({ id: 'u1', sender: 'user', content: 'Hallo.' })]
    expect(findPrecedingAssistantLine(messages, 'u1')).toBe('')
  })
})

describe('buildPhoneCallPerformance', () => {
  it('emits five weighted dimensions and a composite when scores exist', () => {
    const messages: ConversationMessage[] = [
      msg({ id: 'a1', sender: 'assistant', content: 'Kunt u morgen om 10:00?' }),
      msg({ id: 'u1', sender: 'user', content: 'Ja, dat klopt.' }),
    ]
    const turn = baseTurn({
      turnId: 'u1',
      learnerTranscript: 'Ja, dat klopt.',
      languageScores: { naturalness: 75, contextualFit: 80, registerFit: 75, grammaticalStability: 78 },
      combinedScores: { overallTurnScore: 78, clarityScore: 82, dutchLikenessScore: 76 },
    })
    const out = buildPhoneCallPerformance({ messages, turnEvaluations: [turn] })
    expect(out.extraDimensions.map((d) => d.id)).toEqual([
      'phone_listening_comprehension',
      'phone_repair_skill',
      'phone_response_clarity',
      'phone_confirmation_skill',
      'phone_pronunciation',
    ])
    expect(out.compositePhoneScore).toBeGreaterThan(0)
    expect(Object.keys(PHONE_CALL_WEIGHT_BY_DIMENSION).length).toBe(5)
    expect(out.sentenceMoments).toHaveLength(1)
    expect(out.sentenceMoments[0].assistantSaidNl).toContain('10:00')
    expect(out.sentenceMoments[0].didYouCatchThis).toBe(false)
  })

  it('flags “did you catch this” when the reply is thin under a detail-heavy prompt', () => {
    const messages: ConversationMessage[] = [
      msg({
        id: 'a1',
        sender: 'assistant',
        content: 'De afspraak is morgen om 10:00 en kost 25 euro. Klopt dat voor u?',
      }),
      msg({ id: 'u1', sender: 'user', content: 'Ok.' }),
    ]
    const turn = baseTurn({
      turnId: 'u1',
      learnerTranscript: 'Ok.',
      languageScores: { naturalness: 50, contextualFit: 55, registerFit: 50, grammaticalStability: 55 },
    })
    const out = buildPhoneCallPerformance({ messages, turnEvaluations: [turn] })
    expect(out.sentenceMoments[0].didYouCatchThis).toBe(true)
  })
})
