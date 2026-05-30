import { describe, expect, it } from 'vitest'
import { buildSpeakLiveFsmPromptBlock } from './speakLiveFsmPrompt'
import type { SpeakLivePersistedState } from './speakLiveFsm'

function baseState(overrides: Partial<SpeakLivePersistedState> = {}): SpeakLivePersistedState {
  return {
    version: 1,
    phase: 'execution',
    goalIndex: 0,
    goalsCompleted: [],
    clarificationRounds: 0,
    rollingSummaryEnglish: '',
    intentLabel: null,
    updatedAt: '2020-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('buildSpeakLiveFsmPromptBlock', () => {
  it('does not present playbook cursor as the mandatory turn topic in execution', () => {
    const block = buildSpeakLiveFsmPromptBlock({
      state: baseState({ phase: 'execution', goalIndex: 0 }),
      scenarioGoals: ['Ask which platform the train leaves from', 'Confirm schedule', 'Close'],
      scenarioTitle: 'Train station',
    })
    expect(block).toMatch(/playbook cursor/i)
    expect(block).toMatch(/recommendedNextResponseTarget/i)
    expect(block).toMatch(/booking\/reservations/i)
    expect(block).not.toMatch(/Next objective for this turn: Ask which platform/i)
  })

  it('allows longer listener replies for explaining_something (step recap)', () => {
    const block = buildSpeakLiveFsmPromptBlock({
      state: baseState({ phase: 'execution', goalIndex: 0 }),
      scenarioGoals: ['Structure', 'Completeness', 'Listener'],
      scenarioTitle: 'Explaining something',
      scenarioSlug: 'explaining_something',
    })
    expect(block).toMatch(/explaining_something/)
    expect(block).toMatch(/faithful recap/i)
  })

  it('allows longer listener replies for storytelling (beat recap)', () => {
    const block = buildSpeakLiveFsmPromptBlock({
      state: baseState({ phase: 'execution', goalIndex: 0 }),
      scenarioGoals: ['Setting', 'Sequence', 'Close'],
      scenarioTitle: 'Storytelling',
      scenarioSlug: 'storytelling',
    })
    expect(block).toMatch(/storytelling/)
    expect(block).toMatch(/faithful recap/i)
  })
})
