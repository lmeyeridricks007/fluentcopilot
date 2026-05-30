import { describe, expect, it } from 'vitest'
import {
  buildQuestionDrillPayload,
  buildReadAloudFixPayload,
  buildRetrySentencePayload,
  buildStructureDrillPayload,
  buildWeakWordsPayload,
} from './trainingLoopPayloadBuilders'
import { parseTrainingLoopPayloadFromStorage, type QuestionDrillLoopPayload, type ReadAloudFixLoopPayload } from './trainingLoopPayloads'

describe('trainingLoopPayloadBuilders', () => {
  it('buildWeakWordsPayload adds contextLines and trims', () => {
    const p = buildWeakWordsPayload({
      words: ['hallo', 'hallo', 'dank'],
      exampleSentences: ['Ik zeg hallo tegen de conducteur.'],
      targetSkillIds: ['fluency'],
    })
    expect(p.words).toEqual(['hallo', 'dank'])
    expect(p.contextLines?.length).toBeGreaterThan(0)
    expect(p.targetSkillIds).toEqual(['fluency'])
  })

  it('buildRetrySentencePayload sets compareReplaySuggested when compare clip present', () => {
    const a = buildRetrySentencePayload({
      learnerOriginal: 'A',
      correctedVersion: 'B',
      explanationShort: 'Why',
      referenceAudioUrl: null,
      compareAudioUrl: null,
    })
    expect(a.compareReplaySuggested).toBe(false)
    const b = buildRetrySentencePayload({
      learnerOriginal: 'A',
      correctedVersion: 'B',
      explanationShort: 'Why',
      referenceAudioUrl: 'https://x/a.mp3',
      compareAudioUrl: 'https://x/b.mp3',
    })
    expect(b.compareReplaySuggested).toBe(true)
  })

  it('buildStructureDrillPayload pads to two prompts', () => {
    const p = buildStructureDrillPayload({
      prompts: ['Only one.'],
      targetPatternId: 'p1',
      patternLabel: 'Test',
      skillFocus: ['fluency'],
    })
    expect(p.prompts.length).toBeGreaterThanOrEqual(2)
    expect(p.patternLabel).toBe('Test')
  })

  it('round-trips new optional fields through parseTrainingLoopPayloadFromStorage', () => {
    const raw = buildQuestionDrillPayload({
      prompts: ['Q1'],
      exampleQuestions: ['E1'],
      targetQuestionType: 'follow_up',
      scenarioContext: 'coach · nightly debrief',
    })
    const parsed = parseTrainingLoopPayloadFromStorage('question_drill', raw) as QuestionDrillLoopPayload
    expect(parsed.scenarioContext).toContain('coach')
    const ra = buildReadAloudFixPayload({
      passageText: 'Short text.',
      focusLabel: 'Pacing',
      targetWords: ['a', 'b'],
      targetSounds: ['x'],
      explanationShort: 'Note',
    })
    const parsedRa = parseTrainingLoopPayloadFromStorage('read_aloud_fix', ra) as ReadAloudFixLoopPayload
    expect(parsedRa.explanationShort).toContain('Note')
  })
})
