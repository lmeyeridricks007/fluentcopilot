import { describe, expect, it } from 'vitest'
import {
  groundSpeakLiveUserTurn,
  groundTrainStationTurn,
  mergeSpeakLiveSignalsWithGrounding,
  normalizeLearnerUtterance,
} from './scenarioIntentGrounding'

describe('normalizeLearnerUtterance', () => {
  it('folds case and punctuation', () => {
    expect(normalizeLearnerUtterance('  Is de trein op tijd? ')).toBe('is de trein op tijd')
  })
})

describe('groundTrainStationTurn', () => {
  it('detects punctuality question', () => {
    const p = groundTrainStationTurn('Is de trein op tijd?', 'turn-1')
    expect(p.goalIndexesCompleted).toContain(1)
    expect(p.suggestExecution).toBe(true)
  })

  it('detects departure time question', () => {
    const p = groundTrainStationTurn('Hoe laat vertrekt de trein?', 'turn-1')
    expect(p.goalIndexesCompleted).toContain(1)
  })

  it('detects platform question without false time goal', () => {
    const p = groundTrainStationTurn('Van welk perron vertrekt de trein?', 'turn-1')
    expect(p.goalIndexesCompleted).toContain(0)
    expect(p.goalIndexesCompleted).not.toContain(1)
  })

  it('can mark both platform and schedule when both are asked', () => {
    const p = groundTrainStationTurn('Van welk perron vertrekt de trein en is hij op tijd?', 'turn-1')
    expect(p.goalIndexesCompleted).toEqual(expect.arrayContaining([0, 1]))
  })

  it('surfaces possible-tier matches as soft hints without goal completion', () => {
    const p = groundTrainStationTurn('Fijne dag verder.', 'turn-1')
    expect(p.goalIndexesCompleted).toEqual([])
    expect(p.suggestExecution).toBe(false)
    expect(p.softIntentHints.length).toBeGreaterThan(0)
    expect(p.softIntentHints.some((h) => h.includes('THANK_AND_CLOSE'))).toBe(true)
  })

  it('maps ASR-noisy delay question to verified delay intent', () => {
    const p = groundTrainStationTurn('Is de trein optijd', 't1')
    expect(p.goalIndexesCompleted).toContain(1)
    expect(p.softIntentHints.length).toBe(0)
  })
})

describe('groundSpeakLiveUserTurn', () => {
  it('routes train-station through slug normalization', () => {
    const p = groundSpeakLiveUserTurn('train-station', 'Is de trein op tijd?', 't1')
    expect(p.goalIndexesCompleted.length).toBeGreaterThan(0)
  })

  it('meeting_new_people: detects stated origin (Zuid-Afrika)', () => {
    const p = groundSpeakLiveUserTurn('meeting_new_people', 'Ik kom uit Zuid-Afrika.')
    expect(p.intentLabels).toContain('learner_stated_origin_or_home')
    expect(p.englishFactLines[0] ?? '').toMatch(/Do not re-ask where they are from/i)
  })

  it('meeting_new_people: detects "uit Amsterdam" style', () => {
    const p = groundSpeakLiveUserTurn('meeting_new_people', 'Ik ben uit Amsterdam.')
    expect(p.intentLabels).toContain('learner_stated_origin_or_home')
  })

  it('meeting_new_people: ignores generic "uit de"', () => {
    const p = groundSpeakLiveUserTurn('meeting_new_people', 'Ik kom net uit de sportschool.')
    expect(p.intentLabels.length).toBe(0)
  })

  it('meeting_new_people: detects learner question to assistant', () => {
    const p = groundSpeakLiveUserTurn('meeting_new_people', 'Wat doe jij voor werk?')
    expect(p.intentLabels).toContain('learner_asked_assistant_question')
    expect(p.englishFactLines.some((l) => /Answer in Dutch/i.test(l))).toBe(true)
  })

  it('meeting_new_people: combines origin + question when both present', () => {
    const p = groundSpeakLiveUserTurn('meeting_new_people', 'Ik kom uit Berlijn — hoe lang woon jij al in Amsterdam?')
    expect(p.intentLabels).toEqual(expect.arrayContaining(['learner_stated_origin_or_home', 'learner_asked_assistant_question']))
  })

  it('meeting_new_people: does not treat "ik vind je aardig" as a question', () => {
    const p = groundSpeakLiveUserTurn('meeting_new_people', 'Ik vind je aardig.')
    expect(p.intentLabels).not.toContain('learner_asked_assistant_question')
  })
})

describe('mergeSpeakLiveSignalsWithGrounding', () => {
  it('merges model goals with deterministic goals and prefers execution', () => {
    const merged = mergeSpeakLiveSignalsWithGrounding({
      model: { goalIndexesCompleted: [], needsClarification: true },
      patch: groundTrainStationTurn('Is de trein op tijd?', 't1'),
      scenarioGoalCount: 3,
      phase: 'intent_detection',
    })
    expect(merged?.goalIndexesCompleted).toContain(1)
    expect(merged?.nextPhase).toBe('execution')
    expect(merged?.needsClarification).toBe(false)
    expect(merged?.rollingSummaryEnglish).toMatch(/Verified learner facts/i)
  })
})
