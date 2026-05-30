import { describe, expect, it } from 'vitest'
import {
  normalizeGoalPhraseForCoachSummary,
  splitCanonicalScenarioGoal,
  stripGoalIdBracketsFromText,
} from './speakLiveGoalLabelDisplay'

describe('speakLiveGoalLabelDisplay', () => {
  it('splitCanonicalScenarioGoal separates id and learner text', () => {
    const raw = '[ASK_FOR_TICKET_CLEARY] Clearly ask for or identify the ticket you need.'
    expect(splitCanonicalScenarioGoal(raw)).toEqual({
      goalId: 'ASK_FOR_TICKET_CLEARY',
      learnerLabel: 'Clearly ask for or identify the ticket you need.',
    })
  })

  it('stripGoalIdBracketsFromText removes repeated bracket ids', () => {
    const s =
      'You covered [ask_for_ticket_cleary] clearly ask. and [confirm_ticket_detail] handle detail.'
    expect(stripGoalIdBracketsFromText(s)).toBe('You covered clearly ask. and handle detail.')
  })

  it('normalizeGoalPhraseForCoachSummary strips trailing period and leading Clearly', () => {
    expect(normalizeGoalPhraseForCoachSummary('Clearly ask for or identify the ticket you need.')).toBe(
      'ask for or identify the ticket you need',
    )
    expect(normalizeGoalPhraseForCoachSummary('[X] Keep destination or route context explicit.')).toBe(
      'keep destination or route context explicit',
    )
  })
})
