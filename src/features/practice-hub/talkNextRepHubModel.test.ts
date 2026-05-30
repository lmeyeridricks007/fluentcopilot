import { describe, expect, it } from 'vitest'
import type { ContinueConversationResponse, TalkTrainingLoopCard } from '@/lib/api/apiTypes'
import {
  computeHubNextRepReady,
  pickDirectedNextRec,
  selectFallbackDirectedRec,
  selectPrimaryRepLoop,
  suppressStripDirectedNext,
} from './talkNextRepHubModel'

function card(over: Partial<TalkTrainingLoopCard> = {}): TalkTrainingLoopCard {
  return {
    id: 'l1',
    loopType: 'weak_words',
    title: 'T',
    subtitle: null,
    reason: 'r',
    estimatedMinutes: 1,
    difficulty: 'moderate',
    status: 'active',
    targetSkills: [],
    threadId: null,
    sourceSessionId: 's',
    loopSlot: 0,
    ...over,
  }
}

function focusWithRecs(
  recs: NonNullable<ContinueConversationResponse['learningFocus']>['recommendations'],
  cold = false,
): NonNullable<ContinueConversationResponse['learningFocus']> {
  return {
    workingOnChip: null,
    bestNextStep: null,
    recommendedScenarioSlug: null,
    recommendedReadAloudProfile: null,
    recommendedBecause: null,
    coldStart: cold,
    scenarioPersonalizationLine: null,
    recommendations: recs,
    skillsPreview: null,
  }
}

describe('talkNextRepHubModel', () => {
  it('selectPrimaryRepLoop prefers loopSlot 0 over nextTrainingLoop', () => {
    const primary = selectPrimaryRepLoop(
      [card({ id: 'a', loopSlot: 1 }), card({ id: 'b', loopSlot: 0, title: 'slot0' })],
      card({ id: 'next', title: 'fallback' }),
    )
    expect(primary?.id).toBe('b')
  })

  it('selectPrimaryRepLoop falls back to nextTrainingLoop when no slot 0', () => {
    const primary = selectPrimaryRepLoop([card({ id: 'a', loopSlot: 1 })], card({ id: 'next' }))
    expect(primary?.id).toBe('next')
  })

  it('pickDirectedNextRec prefers speak_live_scenario', () => {
    const f = focusWithRecs([
      { type: 'read_aloud_profile', targetId: 'x', title: 'R', subtitle: '', reason: '', confidence: 0.5, priorityScore: 1 },
      {
        type: 'speak_live_scenario',
        targetId: 'y',
        title: 'S',
        subtitle: '',
        reason: '',
        confidence: 0.5,
        priorityScore: 1,
      },
    ])
    expect(pickDirectedNextRec(f)?.type).toBe('speak_live_scenario')
  })

  it('selectFallbackDirectedRec returns null when primary exists or cold start', () => {
    expect(
      selectFallbackDirectedRec({
        useBackend: true,
        primaryRepLoop: card(),
        learningFocus: focusWithRecs([]),
      }),
    ).toBeNull()
    expect(
      selectFallbackDirectedRec({
        useBackend: true,
        primaryRepLoop: null,
        learningFocus: focusWithRecs([], true),
      }),
    ).toBeNull()
  })

  it('computeHubNextRepReady requires success and either loop or titled rec', () => {
    expect(
      computeHubNextRepReady({
        useBackend: true,
        continueSuccess: false,
        primaryRepLoop: null,
        fallbackDirectedRec: null,
      }),
    ).toBe(false)
    expect(
      computeHubNextRepReady({
        useBackend: true,
        continueSuccess: true,
        primaryRepLoop: card(),
        fallbackDirectedRec: null,
      }),
    ).toBe(true)
    expect(
      computeHubNextRepReady({
        useBackend: true,
        continueSuccess: true,
        primaryRepLoop: null,
        fallbackDirectedRec: {
          type: 'read_aloud_profile',
          targetId: 'x',
          title: ' ',
          subtitle: 'sub',
          reason: '',
          confidence: 0.5,
          priorityScore: 1,
        },
      }),
    ).toBe(true)
  })

  it('suppressStripDirectedNext mirrors hub vs strip duplication rule', () => {
    expect(suppressStripDirectedNext(null, null)).toBe(false)
    expect(suppressStripDirectedNext(card(), null)).toBe(true)
  })
})
