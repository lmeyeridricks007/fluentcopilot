import { describe, expect, it } from 'vitest'
import type { ExamTaskInstance } from '../types'
import {
  personalizeListeningMcqOptionLabelNl,
  personalizeListeningMcqPrompts,
  pickListeningSpeakerNames,
  resolveListeningMcqDisplayText,
} from '../listeningSpeakerNamePersonalization'

describe('pickListeningSpeakerNames', () => {
  it('is stable for the same seed', () => {
    expect(pickListeningSpeakerNames('exam-1')).toEqual(pickListeningSpeakerNames('exam-1'))
  })

  it('returns two different names', () => {
    const { nameA, nameB } = pickListeningSpeakerNames('seed-xyz')
    expect(nameA.length).toBeGreaterThan(0)
    expect(nameB.length).toBeGreaterThan(0)
    expect(nameA).not.toBe(nameB)
  })
})

describe('personalizeListeningMcqPrompts', () => {
  it('replaces volgens B and standalone speaker letters in Dutch', () => {
    const { promptNl } = personalizeListeningMcqPrompts(
      'Hoe laat begint de vergadering volgens B?',
      'What time does the meeting start according to B?',
      'Daan',
      'Sophie',
    )
    expect(promptNl).toBe('Hoe laat begint de vergadering volgens Sophie?')
  })

  it('handles Waar moet A volgens B (both speakers)', () => {
    const { promptNl, promptEn } = personalizeListeningMcqPrompts(
      'Waar moet A volgens B eerst naartoe?',
      'Where should A go first according to B?',
      'Daan',
      'Sophie',
    )
    expect(promptNl).toBe('Waar moet Daan volgens Sophie eerst naartoe?')
    expect(promptEn).toBe('Where should Daan go first according to Sophie?')
  })

  it('replaces stuurt A (no \\b between letters and A)', () => {
    const { promptNl } = personalizeListeningMcqPrompts(
      'Wanneer stuurt A de slides naar het team?',
      'When will A send the slides to the team?',
      'Bram',
      'Emma',
    )
    expect(promptNl).toContain('Bram')
    expect(promptNl).not.toMatch(/\bA\b/)
  })

  it('English person A / according to B', () => {
    const { promptEn } = personalizeListeningMcqPrompts(
      'Wat stelt persoon A voor?',
      'What does person A suggest?',
      'Finn',
      'Lotte',
    )
    expect(promptEn).toBe('What does Finn suggest?')
  })
})

describe('personalizeListeningMcqOptionLabelNl', () => {
  it('replaces leading speaker B in an option without touching Bij', () => {
    expect(personalizeListeningMcqOptionLabelNl('B excuseert zich.', 'Daan', 'Sophie')).toBe(
      'Sophie excuseert zich.',
    )
    expect(personalizeListeningMcqOptionLabelNl('Bij de bakkerijhoek.', 'Daan', 'Sophie')).toBe(
      'Bij de bakkerijhoek.',
    )
  })

  it('replaces Dat zegt A niet', () => {
    expect(personalizeListeningMcqOptionLabelNl('Dat zegt A niet.', 'Finn', 'Emma')).toBe(
      'Dat zegt Finn niet.',
    )
  })

  it('does not treat “volgens Bram” as volgens B', () => {
    const { promptNl } = personalizeListeningMcqPrompts(
      'Ik rijd volgens Bram naar huis.',
      'I drive home according to Bram.',
      'Daan',
      'Sophie',
    )
    expect(promptNl).toContain('volgens Bram')
    expect(promptNl).not.toContain('volgens Sophie')
  })
})

describe('resolveListeningMcqDisplayText', () => {
  it('personalizes from a minimal listening MCQ task', () => {
    const task = {
      id: 'task-0',
      taskType: 'listening_mcq_exam' as const,
      sectionId: 'sec',
      level: 'A2' as const,
      promptNl: 'Hoe laat begint de vergadering volgens B?',
      promptEn: 'What time does the meeting start according to B?',
      prepSeconds: 1,
      answerSeconds: 2,
      scoringDimensions: ['listening_accuracy' as const],
      listeningScriptNl: 'A: Hallo. B: Dag.',
      listeningSpeakerNameSeed: 'seed-x',
      mcq: {
        options: [
          { id: 'a', label: 'Om tien uur.' },
          { id: 'b', label: 'B zegt niets.' },
        ],
        correctOptionIds: ['a'],
      },
    } satisfies ExamTaskInstance
    const r = resolveListeningMcqDisplayText(task, 'session-1')
    expect(r).not.toBeNull()
    expect(r!.promptNl).not.toMatch(/volgens B\b/)
    expect(r!.readAloudTask.mcq?.options.find((o) => o.id === 'b')?.label).not.toMatch(/^B /)
  })
})
