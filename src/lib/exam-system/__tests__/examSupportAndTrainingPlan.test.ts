import { describe, expect, it } from 'vitest'
import { getExamProfile } from '../examProfileRegistry'
import { generateExamTasks } from '../taskGenerator'
import { shapeTrainingTasks } from '../trainingTaskPlan'
import {
  allowSkipPrep,
  coachingVerbosity,
  maxTrainingRetries,
  showHintsInAnswer,
  showHintsInPrep,
  showStructurePattern,
  trainingUsesStrictAnswerTimer,
} from '../trainingSupportPolicy'
import { trainingPrepIsTimed, resolveAnswerAutoSubmitOnTimeout } from '../examTimerPolicy'

describe('training support policy', () => {
  it('gates hints in answer by support tier', () => {
    expect(showHintsInAnswer('full_guidance', false)).toBe(true)
    expect(showHintsInAnswer('light_guidance', false)).toBe(false)
    expect(showHintsInAnswer('almost_exam', true)).toBe(true)
  })

  it('always allows hints in prep for full and light', () => {
    expect(showHintsInPrep('full_guidance', false)).toBe(true)
    expect(showHintsInPrep('light_guidance', false)).toBe(true)
  })

  it('scales retries: full > light > almost_exam', () => {
    expect(maxTrainingRetries('full_guidance')).toBe(2)
    expect(maxTrainingRetries('light_guidance')).toBe(1)
    expect(maxTrainingRetries('almost_exam')).toBe(0)
  })

  it('disallows prep skip only in almost_exam', () => {
    expect(allowSkipPrep('full_guidance')).toBe(true)
    expect(allowSkipPrep('almost_exam')).toBe(false)
  })

  it('structure pattern hidden in almost_exam', () => {
    expect(showStructurePattern('full_guidance')).toBe(true)
    expect(showStructurePattern('almost_exam')).toBe(false)
  })

  it('coaching verbosity steps down toward almost_exam', () => {
    expect(coachingVerbosity('full_guidance')).toBe('full')
    expect(coachingVerbosity('light_guidance')).toBe('light')
    expect(coachingVerbosity('almost_exam')).toBe('minimal')
  })

  it('strict answer timer for almost_exam even when timedTraining is false', () => {
    expect(trainingUsesStrictAnswerTimer('almost_exam', false)).toBe(true)
    expect(trainingUsesStrictAnswerTimer('light_guidance', false)).toBe(false)
    expect(trainingUsesStrictAnswerTimer('light_guidance', true)).toBe(true)
  })
})

describe('shapeTrainingTasks', () => {
  it('filters to focus task type when tasks of that type exist', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'training',
      scope: 'full',
      sessionSeed: 'shape-focus',
    })
    const counts = new Map<string, number>()
    for (const t of tasks) counts.set(t.taskType, (counts.get(t.taskType) ?? 0) + 1)
    const focusType = [...counts.entries()].find(([, n]) => n >= 2)?.[0] ?? tasks[0].taskType
    const shaped = shapeTrainingTasks(tasks, 'by_task_type', focusType as (typeof tasks)[0]['taskType'])
    expect(shaped.length).toBeGreaterThanOrEqual(1)
    expect(shaped.every((t) => t.taskType === focusType)).toBe(true)
  })

  it('reorders by weakness priority for by_weakness', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'training',
      scope: 'full',
      sessionSeed: 'shape-weak',
    })
    const shaped = shapeTrainingTasks(tasks, 'by_weakness', undefined)
    expect(shaped.length).toBe(tasks.length)
    const priorities = ['compare_options', 'justify_reason', 'follow_up_response', 'give_opinion']
    const headTypes = shaped.slice(0, 4).map((t) => t.taskType)
    expect(headTypes.some((t) => priorities.includes(t))).toBe(true)
  })
})

describe('training prep timing vs policy', () => {
  const prepRule = { kind: 'prep' as const, seconds: 60, optionalInTraining: true, autoAdvance: false }

  it('almost_exam forces timed prep even with optional rule', () => {
    expect(
      trainingPrepIsTimed({
        support: 'almost_exam',
        timedTraining: false,
        prepRule,
      }),
    ).toBe(true)
  })

  it('full_guidance respects optional prep when not timed meta', () => {
    expect(
      trainingPrepIsTimed({
        support: 'full_guidance',
        timedTraining: false,
        prepRule,
      }),
    ).toBe(false)
  })

  it('answer auto-submit mirrors support for training', () => {
    const simAns = { kind: 'answer' as const, seconds: 120, autoAdvance: true }
    const trainAns = { kind: 'answer' as const, seconds: 150, autoAdvance: false }
    expect(
      resolveAnswerAutoSubmitOnTimeout({
        runMode: 'training',
        timedTraining: false,
        support: 'almost_exam',
        simAnswerRule: simAns,
        trainAnswerRule: trainAns,
      }),
    ).toBe(true)
  })
})
