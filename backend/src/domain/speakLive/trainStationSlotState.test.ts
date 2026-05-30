import { describe, expect, it } from 'vitest'
import {
  detectTrainStationSlots,
  inferAssistantTrainFacts,
  mergeTrainStationScenarioSession,
  scenarioGoalIndexesFromTrainHits,
  trainStationRecapSlotSummary,
} from './trainStationSlotState'

describe('detectTrainStationSlots', () => {
  it('records GoalHit with rule source and transcript id', () => {
    const { hits, userFacts } = detectTrainStationSlots('Is de trein op tijd?', 'user-msg-uuid')
    expect(hits.some((h) => h.goalId === 'ASK_DELAY_STATUS')).toBe(true)
    expect(hits[0]?.source).toBe('rule')
    expect(hits[0]?.transcriptTurnId).toBe('user-msg-uuid')
    expect(hits[0]?.confidence).toBeGreaterThan(0.9)
    expect(hits.every((h) => h.matchTier === 'exact' || h.matchTier === 'strong')).toBe(true)
    expect(userFacts.askedDelayStatus).toBe(true)
  })

  it('detects platform and delay in one utterance', () => {
    const { hits } = detectTrainStationSlots('Van welk perron vertrekt de trein en is hij op tijd?', 't2')
    const ids = new Set(hits.map((h) => h.goalId))
    expect(ids.has('ASK_PLATFORM')).toBe(true)
    expect(ids.has('ASK_DELAY_STATUS')).toBe(true)
  })

  const delayStrongOrExact = [
    'Is de trein op tijd?',
    'Blijft de trein op tijd?',
    'Komt deze trein op tijd?',
    'Is de trein optijd?',
    'Heeft de trein vertraging?',
    'Krijgt de trein vertraging?',
    'De trein heeft vertraging, klopt dat?',
    'Is hij op tijd, die trein?',
    'Vertraging voor deze trein?',
  ]

  it.each(delayStrongOrExact)('delay / punctuality: %s', (line) => {
    const { hits, possibleHits } = detectTrainStationSlots(line, 't')
    expect(hits.some((h) => h.goalId === 'ASK_DELAY_STATUS')).toBe(true)
    expect(possibleHits.some((h) => h.goalId === 'ASK_DELAY_STATUS')).toBe(false)
  })

  const departureStrongOrExact = [
    'Hoe laat vertrekt de trein?',
    'Hoe laat gaat de trein?',
    'Hoelat vertrekt de trein?',
    'Op welke tijd vertrekt de trein?',
    'Welke tijd heeft de trein?',
    'Wanneer vertrekt de trein?',
    'Wanneer rijdt deze trein weg?',
  ]

  it.each(departureStrongOrExact)('departure time: %s', (line) => {
    const { hits } = detectTrainStationSlots(line, 't')
    expect(hits.some((h) => h.goalId === 'ASK_DEPARTURE_TIME')).toBe(true)
  })

  const platformStrongOrExact = [
    'Van welk perron vertrekt de trein?',
    'Van welke perron vertrekt de trein?',
    'Op welk spoor vertrekt de trein?',
    'Welk perron is het?',
    'Welke perron is het?',
    'Van welk peron vertrekt de trayn?',
  ]

  it.each(platformStrongOrExact)('platform: %s', (line) => {
    const { hits } = detectTrainStationSlots(line, 't')
    expect(hits.some((h) => h.goalId === 'ASK_PLATFORM')).toBe(true)
  })

  it('puts literal platform numbers in possibleHits only', () => {
    const { hits, possibleHits } = detectTrainStationSlots('Ik sta op perron 4.', 't')
    expect(hits.some((h) => h.goalId === 'ASK_PLATFORM')).toBe(false)
    expect(possibleHits.some((h) => h.goalId === 'ASK_PLATFORM')).toBe(true)
  })

  it('records thanks as exact hit', () => {
    const { hits } = detectTrainStationSlots('Dank je wel, fijne dag!', 't')
    expect(hits.some((h) => h.goalId === 'THANK_AND_CLOSE')).toBe(true)
  })

  it('does not auto-complete goals on possible-tier thanks alone', () => {
    const { hits, possibleHits } = detectTrainStationSlots('Fijne dag verder.', 't')
    expect(hits.some((h) => h.goalId === 'THANK_AND_CLOSE')).toBe(false)
    expect(possibleHits.some((h) => h.goalId === 'THANK_AND_CLOSE')).toBe(true)
  })

  it('detects OV destination (Dutch tram + naar + multi-word place)', () => {
    const { hits, userFacts } = detectTrainStationSlots(
      'Ik zoek de tram naar Amsterdam Centraal.',
      't-ov-1'
    )
    expect(userFacts.askedDestination).toBe(true)
    expect(hits.some((h) => h.goalId === 'ASK_DESTINATION')).toBe(true)
  })

  it('detects OV destination when STT uses English “tram to …”', () => {
    const { hits, userFacts } = detectTrainStationSlots(
      'I am looking for the tram to Amsterdam Centraal',
      't-ov-2'
    )
    expect(userFacts.askedDestination).toBe(true)
    expect(hits.some((h) => h.goalId === 'ASK_DESTINATION')).toBe(true)
  })
})

describe('inferAssistantTrainFacts', () => {
  it('does not mark destination as answered for a destination clarification question', () => {
    const f = inferAssistantTrainFacts('Dus u wilt nu betalen met pin? Dat kan. Wat is uw bestemming?')
    expect(f.answeredDestination).toBe(false)
  })

  it('still marks destination when staff states route plainly', () => {
    const f = inferAssistantTrainFacts('De tram naar Utrecht vertrekt vanaf halte B.')
    expect(f.answeredDestination).toBe(true)
  })
})

describe('mergeTrainStationScenarioSession', () => {
  it('accumulates achieved goals across turns', () => {
    const after1 = mergeTrainStationScenarioSession({
      prev: undefined,
      sessionId: 'thread-1',
      scenarioId: 'scen-1',
      locale: 'nl-NL',
      mode: 'guided',
      status: 'active',
      userMessageId: 'u1',
      userText: 'Is de trein op tijd?',
      assistantMessageId: 'a1',
      assistantText: 'Ja, deze trein rijdt vandaag op tijd.',
    })
    expect(after1.achievedGoals.some((g) => g.goalId === 'ASK_DELAY_STATUS')).toBe(true)
    expect(after1.pendingGoals).not.toContain('ASK_DELAY_STATUS')

    const after2 = mergeTrainStationScenarioSession({
      prev: after1,
      sessionId: 'thread-1',
      scenarioId: 'scen-1',
      locale: 'nl-NL',
      mode: 'guided',
      status: 'active',
      userMessageId: 'u2',
      userText: 'Van welk perron vertrekt hij?',
      assistantMessageId: 'a2',
      assistantText: 'Van spoor 5.',
    })
    expect(after2.achievedGoals.some((g) => g.goalId === 'ASK_PLATFORM')).toBe(true)
    expect(after2.turnFacts.length).toBeGreaterThanOrEqual(4)
  })
})

describe('scenarioGoalIndexesFromTrainHits', () => {
  it('maps slots to seeded scenario goal indices', () => {
    const hits = detectTrainStationSlots('Heeft de trein vertraging?', 'u').hits
    expect(scenarioGoalIndexesFromTrainHits(hits)).toContain(1)
  })
})

describe('trainStationRecapSlotSummary', () => {
  it('produces a compact line for recap LLM', () => {
    const s = mergeTrainStationScenarioSession({
      prev: undefined,
      sessionId: 't',
      scenarioId: 's',
      locale: 'nl-NL',
      mode: 'free',
      status: 'active',
      userMessageId: 'u',
      userText: 'Hoe laat vertrekt de trein?',
      assistantMessageId: 'a',
      assistantText: 'Om veertien uur dertig.',
    })
    const line = trainStationRecapSlotSummary(s)
    expect(line).toContain('ASK_DEPARTURE_TIME')
    expect(line).toContain('pending')
  })
})
