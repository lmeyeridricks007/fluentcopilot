import { describe, expect, it } from 'vitest'
import {
  accumulateAnsweredFactsFromSession,
  buildTrainStationOrchestrationInput,
  computeRecommendedNextResponseTarget,
} from './trainStationReplyOrchestration'
import type { ScenarioConfig } from '../../models/contracts'
import { ALL_TRAIN_STATION_GOALS, detectTrainStationSlots, type ScenarioSessionState } from './trainStationSlotState'

const scenario: ScenarioConfig = {
  id: 's1',
  slug: 'train-station',
  title: 'Train station',
  description: 'Desk practice',
  userRole: 'Traveller',
  goals: ['Platform', 'Time', 'Close'],
  starterSuggestions: [],
  difficultyBand: 'A2',
  tags: [],
  allowedModes: ['guided', 'free'],
  openingMessage: null,
}

describe('computeRecommendedNextResponseTarget', () => {
  it('prioritizes delay when learner asks on-time', () => {
    const empty = { delayStatus: false, departureTime: false, platform: false, destination: false }
    const t = computeRecommendedNextResponseTarget({
      userText: 'Is de trein op tijd?',
      userMessageId: 'u1',
      answered: empty,
    })
    expect(t.toLowerCase()).toMatch(/delay|punctuality|op tijd|vertraging/)
  })

  it('uses keyword fallback when rules miss but normalized text still has trein + op tijd', () => {
    const empty = { delayStatus: false, departureTime: false, platform: false, destination: false }
    const spaced = 'trein ' + 'a '.repeat(25) + 'op tijd'
    expect(detectTrainStationSlots(spaced, 'u1').hits).toHaveLength(0)
    const t = computeRecommendedNextResponseTarget({
      userText: spaced,
      userMessageId: 'u1',
      answered: empty,
    })
    expect(t.toLowerCase()).toMatch(/punctuality|delay|op tijd|vertraging/)
  })

  it('asks for both delay and time when bundled', () => {
    const empty = { delayStatus: false, departureTime: false, platform: false, destination: false }
    const t = computeRecommendedNextResponseTarget({
      userText: 'Is de trein op tijd? Hoe laat vertrekt hij?',
      userMessageId: 'u1',
      answered: empty,
    })
    expect(t).toMatch(/\(1\).*Punctuality/i)
    expect(t).toMatch(/\(2\).*Departure time/i)
    expect(t.toLowerCase()).toMatch(/op tijd|vertraging/)
    expect(t.toLowerCase()).toMatch(/hoe laat|vertrek/)
  })

  it('still prioritizes punctuality when learner repeats an on-time question after a prior delay answer', () => {
    const answered = { delayStatus: true, departureTime: false, platform: false, destination: false }
    const t = computeRecommendedNextResponseTarget({
      userText: 'Is de trein op tijd?',
      userMessageId: 'u1',
      answered,
    })
    expect(t.toLowerCase()).toMatch(/punctuality|op tijd|vertraging/)
    expect(t.toLowerCase()).toMatch(/again|direct/)
    expect(t.toLowerCase()).not.toMatch(/already covered|perron of overstap|e\.g\. perron/)
  })

  it('orders delay before platform when both appear in one utterance', () => {
    const empty = { delayStatus: false, departureTime: false, platform: false, destination: false }
    const t = computeRecommendedNextResponseTarget({
      userText: 'Van welk perron vertrekt de trein en is hij op tijd?',
      userMessageId: 'u1',
      answered: empty,
    })
    expect(t).toMatch(/\(1\).*Punctuality/i)
    expect(t).toMatch(/\(3\).*Platform/i)
  })

  it('handles platform after time', () => {
    const answered = { delayStatus: true, departureTime: true, platform: false, destination: false }
    const t = computeRecommendedNextResponseTarget({
      userText: 'Van welk perron vertrekt hij?',
      userMessageId: 'u1',
      answered,
    })
    expect(t.toLowerCase()).toMatch(/platform|perron|spoor/)
  })

  it('handles thanking', () => {
    const t = computeRecommendedNextResponseTarget({
      userText: 'Dank u wel',
      userMessageId: 'u1',
      answered: { delayStatus: true, departureTime: true, platform: true, destination: false },
    })
    expect(t.toLowerCase()).toMatch(/thanks|dank|close/)
  })
})

describe('accumulateAnsweredFactsFromSession', () => {
  it('reads assistant flags from turnFacts', () => {
    const state: ScenarioSessionState = {
      schemaVersion: 1,
      scenarioSlug: 'train-station',
      sessionId: 't',
      scenarioId: 'sc',
      locale: 'nl-NL',
      mode: 'guided',
      status: 'active',
      achievedGoals: [],
      pendingGoals: [],
      mentionedEntities: [],
      turnFacts: [
        {
          turnId: 'a1',
          role: 'assistant',
          at: '2020-01-01T00:00:00Z',
          assistantFacts: {
            answeredDepartureTime: true,
            answeredDelayStatus: true,
            answeredPlatform: false,
            answeredDestination: false,
          },
        },
      ],
      lastUpdatedAt: '2020-01-01T00:00:00Z',
    }
    const a = accumulateAnsweredFactsFromSession(state)
    expect(a.departureTime).toBe(true)
    expect(a.delayStatus).toBe(true)
    expect(a.platform).toBe(false)
  })
})

describe('buildTrainStationOrchestrationInput', () => {
  it('includes normalized transcript, this-turn goal IDs, and learner level from scenario band', () => {
    const slot: ScenarioSessionState = {
      schemaVersion: 1,
      scenarioSlug: 'train-station',
      sessionId: 't',
      scenarioId: 'sc',
      locale: 'nl-NL',
      mode: 'guided',
      status: 'active',
      achievedGoals: [],
      pendingGoals: [...ALL_TRAIN_STATION_GOALS],
      mentionedEntities: [],
      turnFacts: [],
      lastUpdatedAt: 'x',
    }
    const orch = buildTrainStationOrchestrationInput({
      scenario,
      slotState: slot,
      userText: 'Heeft de trein vertraging?',
      userMessageId: 'u1',
      answered: { delayStatus: false, departureTime: false, platform: false, destination: false },
    })
    expect(orch.achievedGoalIds).toContain('ASK_DELAY_STATUS')
    expect(orch.pendingGoalIds).not.toContain('ASK_DELAY_STATUS')
    expect(orch.latestTranscript).toContain('vertraging')
    expect(orch.normalizedLatestTranscript).toContain('vertraging')
    expect(orch.thisTurnDetectedGoalIds).toContain('ASK_DELAY_STATUS')
    expect(orch.thisTurnRuleHits.some((h) => h.goalId === 'ASK_DELAY_STATUS')).toBe(true)
    expect(orch.learnerLevel).toBe('A2')
  })

  it('maps B1 difficulty band on orchestration input', () => {
    const b1Scenario = { ...scenario, difficultyBand: 'B1' }
    const orch = buildTrainStationOrchestrationInput({
      scenario: b1Scenario,
      slotState: null,
      userText: 'Dank u wel',
      userMessageId: 'u2',
      answered: { delayStatus: true, departureTime: true, platform: true, destination: false },
    })
    expect(orch.learnerLevel).toBe('B1')
  })
})
