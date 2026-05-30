import { describe, expect, it } from 'vitest'
import { OPINIONS_DISCUSSIONS_SCENARIO_ID } from '@/features/speak-live/speakLiveScenarios'
import { scenarioSetupSkillHint, talkSkillPreviewChips } from './talkSkillSurfaces'

describe('talkSkillSurfaces', () => {
  it('builds at most two landing chips from preview labels', () => {
    const chips = talkSkillPreviewChips(
      {
        headline: 'x',
        lines: [],
        overallScore: 70,
        strongestLabel: 'Storytelling',
        focusLabel: 'Follow-up questions',
      },
      2,
    )
    expect(chips).toEqual(['Focus · Follow-up questions', 'Strong · Storytelling'])
  })

  it('combines scenario snippet with learner focus', () => {
    const s = scenarioSetupSkillHint(OPINIONS_DISCUSSIONS_SCENARIO_ID, 'Reasoning')
    /** Asserts the two intentional pieces of the hint: focus bridge + scenario strength snippet. */
    expect(s).toContain('working on reasoning')
    expect(s?.toLowerCase()).toContain('good for opinions, reasoning, and nuance')
  })
})
