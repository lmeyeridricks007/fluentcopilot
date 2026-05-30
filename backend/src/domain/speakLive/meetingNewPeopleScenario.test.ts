import { describe, expect, it } from 'vitest'
import {
  MEETING_NEW_PEOPLE_SCENARIO_ID,
  buildMeetingNewPeopleScenario,
  maybeBuildMeetingNewPeopleSpeakLiveScenarioRuntime,
  parseMeetingNewPeopleScenarioRuntimeConfig,
} from './meetingNewPeopleScenario'
import { MEETING_NEW_PEOPLE_GOAL_IDS } from './meetingNewPeopleEvaluationContract'

describe('meetingNewPeopleScenario', () => {
  it('builds runtime with goals and evaluation contract', () => {
    const out = buildMeetingNewPeopleScenario({
      level: 'A2',
      subType: 'social_event',
      variation: 'introductions',
      random: () => 0.2,
    })
    expect(out.id).toBe(MEETING_NEW_PEOPLE_SCENARIO_ID)
    expect(out.goals.some((g) => g.id === MEETING_NEW_PEOPLE_GOAL_IDS.introBalance)).toBe(true)
    expect(out.evaluationContract?.completionRequiredPassGoalIds).toEqual([MEETING_NEW_PEOPLE_GOAL_IDS.introBalance])
  })

  it('maybeBuild returns null for other scenarios', () => {
    expect(
      maybeBuildMeetingNewPeopleSpeakLiveScenarioRuntime({
        scenario: { slug: 'small_talk' } as import('../../models/contracts').ScenarioConfig,
        level: 'A2',
        overrides: {},
      }),
    ).toBeNull()
  })

  it('parse accepts persisted runtime', () => {
    const rt = buildMeetingNewPeopleScenario({
      level: 'A1',
      subType: 'work_introduction',
      variation: 'background',
      random: () => 0.5,
    })
    expect(parseMeetingNewPeopleScenarioRuntimeConfig(rt)?.id).toBe(MEETING_NEW_PEOPLE_SCENARIO_ID)
  })

  it('picks work_introduction opening names aligned with female presentation', () => {
    const secondLine = buildMeetingNewPeopleScenario({
      level: 'A2',
      subType: 'work_introduction',
      variation: 'introductions',
      assistantPresentation: 'female',
      random: () => 0.75,
    }).openingLine
    expect(secondLine).toContain('Sophie')
    expect(secondLine).not.toMatch(/\bMark\b/)
  })

  it('picks work_introduction opening names aligned with male presentation', () => {
    const secondLine = buildMeetingNewPeopleScenario({
      level: 'A2',
      subType: 'work_introduction',
      variation: 'introductions',
      assistantPresentation: 'male',
      random: () => 0.75,
    }).openingLine
    expect(secondLine).toContain('Mark')
    expect(secondLine).not.toMatch(/\bFatima\b|\bSophie\b/)
  })
})
