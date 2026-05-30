import { describe, expect, it } from 'vitest'
import type { ConversationSummary } from '../../models/contracts'
import { buildLiveScenarioRecapInput, reconcileTrainStationLiveRecap } from './trainStationLiveRecapInput'
import type { ScenarioSessionState } from './trainStationSlotState'

function baseSlotState(overrides: Partial<ScenarioSessionState> = {}): ScenarioSessionState {
  return {
    schemaVersion: 1,
    scenarioSlug: 'train-station',
    sessionId: 's1',
    scenarioId: 'sc1',
    locale: 'nl-NL',
    mode: 'guided',
    status: 'active',
    achievedGoals: [],
    pendingGoals: [],
    mentionedEntities: [],
    turnFacts: [],
    lastUpdatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('buildLiveScenarioRecapInput', () => {
  it('marks ASK_DELAY_STATUS and ASK_DEPARTURE_TIME in transcriptEvidence with user lines', () => {
    const uid1 = '11111111-1111-1111-1111-111111111111'
    const uid2 = '22222222-2222-2222-2222-222222222222'
    const slot: ScenarioSessionState = baseSlotState({
      achievedGoals: [
        {
          goalId: 'ASK_DELAY_STATUS',
          matchedText: 'Is de trein op tijd?',
          transcriptTurnId: uid1,
          confidence: 0.9,
          source: 'rule',
        },
        {
          goalId: 'ASK_DEPARTURE_TIME',
          matchedText: 'Hoe laat vertrekt de trein?',
          transcriptTurnId: uid2,
          confidence: 0.9,
          source: 'rule',
        },
      ],
      pendingGoals: ['ASK_PLATFORM', 'ASK_DESTINATION', 'CONFIRM_DETAIL', 'THANK_AND_CLOSE'],
    })
    const messages = [
      {
        id: uid1,
        threadId: 't',
        sender: 'user' as const,
        messageType: 'text' as const,
        content: 'Is de trein op tijd?',
        createdAt: '',
        metadata: null,
      },
      {
        id: uid2,
        threadId: 't',
        sender: 'user' as const,
        messageType: 'text' as const,
        content: 'Hoe laat vertrekt de trein?',
        createdAt: '',
        metadata: null,
      },
    ]
    const live = buildLiveScenarioRecapInput({
      scenarioId: 'sc1',
      slotState: slot,
      feedbackNotes: '',
      messages,
    })
    expect(live).not.toBeNull()
    expect(live!.transcriptEvidence).toEqual([
      { goalId: 'ASK_DELAY_STATUS', quote: 'Is de trein op tijd?' },
      { goalId: 'ASK_DEPARTURE_TIME', quote: 'Hoe laat vertrekt de trein?' },
    ])
    expect(live!.pendingGoals).toContain('ASK_PLATFORM')
  })
})

describe('reconcileTrainStationLiveRecap', () => {
  it('lists delay and departure goals as completed and removes false "did not ask" claims', () => {
    const slot = baseSlotState({
      achievedGoals: [
        {
          goalId: 'ASK_DELAY_STATUS',
          matchedText: 'Is de trein op tijd?',
          transcriptTurnId: 'u1',
          confidence: 0.9,
          source: 'rule',
        },
        {
          goalId: 'ASK_DEPARTURE_TIME',
          matchedText: 'Hoe laat vertrekt de trein?',
          transcriptTurnId: 'u2',
          confidence: 0.9,
          source: 'rule',
        },
      ],
    })
    const summary: ConversationSummary = {
      threadId: 't1',
      whatWentWell: ['Generic praise.'],
      whatToImprove: [
        'You did not ask whether the train was on time.',
        'You never asked about the departure time.',
        'You could add articles.',
      ],
      correctedPhrases: [],
      suggestedNextAction: 'Drill platform phrases.',
      saveWordCandidates: [],
    }
    const out = reconcileTrainStationLiveRecap({ summary, slotState: slot })
    expect(out.goalsCompleted).toContain('ASK_DELAY_STATUS')
    expect(out.goalsCompleted).toContain('ASK_DEPARTURE_TIME')
    expect(out.goalsMissed).not.toContain('ASK_DELAY_STATUS')
    expect(out.goalsMissed).not.toContain('ASK_DEPARTURE_TIME')
    expect(out.whatToImprove).toEqual(['You could add articles.'])
    expect(out.transcriptEvidence?.some((e) => e.goalId === 'ASK_DELAY_STATUS')).toBe(true)
    expect(out.transcriptEvidence?.some((e) => e.goalId === 'ASK_DEPARTURE_TIME')).toBe(true)
  })

  it('when preserveScenarioGoals, leaves goalsCompleted/goalsMissed unchanged for a later public-transport merge', () => {
    const slot = baseSlotState({
      achievedGoals: [
        {
          goalId: 'ASK_DESTINATION',
          matchedText: 'Naar Utrecht',
          transcriptTurnId: 'u1',
          confidence: 0.9,
          source: 'rule',
        },
      ],
    })
    const summary: ConversationSummary = {
      threadId: 't1',
      whatWentWell: [],
      whatToImprove: [],
      correctedPhrases: [],
      suggestedNextAction: '—',
      saveWordCandidates: [],
      goalsCompleted: ['[IDENTIFY_DESTINATION_OR_LINE_CLEARY] placeholder label'],
      goalsMissed: ['[ASK_ROUTE_OR_BOARDING_QUESTION] placeholder'],
    }
    const out = reconcileTrainStationLiveRecap({ summary, slotState: slot, preserveScenarioGoals: true })
    expect(out.goalsCompleted).toEqual(summary.goalsCompleted)
    expect(out.goalsMissed).toEqual(summary.goalsMissed)
  })
})
