import { describe, expect, it } from 'vitest'
import { resolveSessionLoopAdapterHints } from './resolveSessionLoopAdapterHints'
import type { SessionAdapterResolutionInput } from './sessionLoopAdapterTypes'

const SESSION_V2 = 2 as const

function baseInput(over: Partial<SessionAdapterResolutionInput> = {}): SessionAdapterResolutionInput {
  return {
    sessionType: 'speak_live',
    scenarioSlug: 'train_station',
    insights: {
      schemaVersion: SESSION_V2,
      sessionId: 's1',
      userId: 'u1',
      sessionType: 'speak_live',
      scenarioId: 'sc1',
      extractedAt: new Date().toISOString(),
      weakWords: [],
      weakPatterns: [],
      pronunciationIssues: [],
      hesitationIssues: [],
      scenarioPerformance: null,
      strengths: [],
      confidenceSummary: 't',
    },
    profile: {
      schemaVersion: 2,
      userId: 'u1',
      version: 1,
      updatedAt: new Date().toISOString(),
      totalSessionsObserved: 1,
      weakVocabulary: [],
      weakGrammarPatterns: [],
      pronunciationIssues: [],
      hesitationPatterns: [],
      scenarioPerformance: {},
      practiceRecommendations: [],
      strongestAreas: [],
      activeFocusAreas: [],
      levelEstimate: null,
      recentScenarioSlugs: [],
      lastSessionModality: null,
    } as SessionAdapterResolutionInput['profile'],
    speakLiveEvaluation: null,
    readAloudResult: null,
    ...over,
  }
}

describe('resolveSessionLoopAdapterHints', () => {
  it('maps chat sessions to chat adapter with pronunciation_drill allowed', () => {
    const hints = resolveSessionLoopAdapterHints({
      input: baseInput({
        sessionType: 'text_conversation',
        insights: {
          ...baseInput().insights,
          sessionType: 'text_conversation',
        },
      }),
      source: 'chat',
      hesitationStrong: false,
    })
    expect(hints.adapterId).toBe('chat_messaging')
    expect(hints.allowedLoopTypes.has('pronunciation_drill')).toBe(true)
    expect(hints.chatSpeakingTransferPrompts?.length).toBeGreaterThan(0)
  })

  it('maps read_aloud sessions to read-aloud adapter', () => {
    const hints = resolveSessionLoopAdapterHints({
      input: baseInput({
        sessionType: 'read_aloud',
        insights: { ...baseInput().insights, sessionType: 'read_aloud' },
      }),
      source: 'read_aloud',
      hesitationStrong: false,
    })
    expect(hints.adapterId).toBe('read_aloud_modality')
    expect(hints.allowedLoopTypes.has('read_aloud_fix')).toBe(true)
    expect(hints.allowedLoopTypes.has('question_drill')).toBe(false)
  })

  it('maps speak_live coach to language coach adapter', () => {
    const hints = resolveSessionLoopAdapterHints({
      input: baseInput({ scenarioSlug: 'language_coach' }),
      source: 'coach',
      hesitationStrong: false,
    })
    expect(hints.adapterId).toBe('language_coach')
    expect(hints.questionDrillTitle).toContain('question')
  })

  it('maps listening sessions to listening modality adapter (loop generation)', () => {
    const hints = resolveSessionLoopAdapterHints({
      input: baseInput({
        sessionType: 'listening',
        insights: { ...baseInput().insights, sessionType: 'listening' },
        scenarioSlug: 'cafe',
      }),
      source: 'listening',
      hesitationStrong: false,
    })
    expect(hints.adapterId).toBe('listening_modality')
    expect(hints.source).toBe('listening')
    expect(hints.allowedLoopTypes.has('listening_burst')).toBe(true)
    expect(hints.preferredLoopTypesForSession.includes('missed_detail_retry')).toBe(true)
  })
})
