import { describe, expect, it } from 'vitest'
import type { ConversationSummary } from '../../models/contracts'
import {
  inferOrderingFoodGoalLabelsFromUserText,
  reconcileOrderingFoodLiveRecap,
} from './orderingFoodLiveRecap'
import type { SpeakLivePersistedState } from './speakLiveFsm'

const ORDERING_GOALS = [
  'Make a clear order',
  'Use polite phrasing',
  'Ask a follow-up question',
  'Clarify or confirm one detail',
] as const

function baseSummary(): ConversationSummary {
  return {
    threadId: 't1',
    whatWentWell: [],
    whatToImprove: [],
    correctedPhrases: [],
    suggestedNextAction: 'Practice',
    saveWordCandidates: [],
  }
}

describe('inferOrderingFoodGoalLabelsFromUserText', () => {
  it('detects order, politeness, price question, and milk detail from typical café lines', () => {
    const lines = [
      'Mag ik een koffie met havermelk?',
      'Wat kost dat?',
      'Dank je wel.',
    ]
    const got = inferOrderingFoodGoalLabelsFromUserText([...ORDERING_GOALS], lines)
    expect(new Set(got)).toEqual(new Set([...ORDERING_GOALS]))
  })
})

describe('reconcileOrderingFoodLiveRecap', () => {
  it('returns summary unchanged for non-ordering slug', () => {
    const s = baseSummary()
    const out = reconcileOrderingFoodLiveRecap({
      summary: s,
      scenarioSlug: 'train-station',
      scenarioGoals: [...ORDERING_GOALS],
      slState: null,
      userMessageTexts: [],
    })
    expect(out).toBe(s)
  })

  it('maps FSM completed indexes onto scenario goal labels', () => {
    const sl: SpeakLivePersistedState = {
      version: 1,
      phase: 'closing',
      goalIndex: 3,
      goalsCompleted: [0, 1, 2],
      clarificationRounds: 0,
      rollingSummaryEnglish: '',
      intentLabel: null,
      updatedAt: new Date().toISOString(),
    }
    const out = reconcileOrderingFoodLiveRecap({
      summary: { ...baseSummary(), goalsCompleted: [], goalsMissed: [...ORDERING_GOALS] },
      scenarioSlug: 'ordering_food',
      scenarioGoals: [...ORDERING_GOALS],
      slState: sl,
      userMessageTexts: [],
    })
    expect(out.goalsCompleted).toEqual([
      'Make a clear order',
      'Use polite phrasing',
      'Ask a follow-up question',
    ])
    expect(out.goalsMissed).toEqual(['Clarify or confirm one detail'])
  })
})
