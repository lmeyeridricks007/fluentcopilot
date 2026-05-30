import { describe, expect, it } from 'vitest'
import type { TrainingLoopCompletionContext } from './trainingLoopCompletionResultModels'
import {
  buildCompletionInsight,
  buildDefaultTypedCompletionPayload,
  completionEvidenceMagnitude,
  mergeTypedCompletionPayload,
} from './trainingLoopCompletionResultModels'

function weakWordsLoop(over: Partial<TrainingLoopCompletionContext> = {}): TrainingLoopCompletionContext {
  return {
    id: 'l1',
    loopType: 'weak_words',
    title: 'Words',
    difficulty: 'moderate',
    payload: {
      words: ['a', 'b'],
      exampleSentences: [],
      referenceAudioUrls: [],
      targetSkillIds: [],
    },
    ...over,
  }
}

describe('mergeTypedCompletionPayload', () => {
  it('returns defaults when client payload is absent or not an object', () => {
    const loop = weakWordsLoop()
    const d = mergeTypedCompletionPayload(loop, null)
    expect(d).toEqual(buildDefaultTypedCompletionPayload(loop))
    expect(mergeTypedCompletionPayload(loop, 'x')).toEqual(d)
  })

  it('ignores client when loopType discriminator mismatches', () => {
    const loop = weakWordsLoop()
    const m = mergeTypedCompletionPayload(loop, { loopType: 'retry_sentence', replayCount: 9 })
    expect(m.loopType).toBe('weak_words')
  })

  it('clamps weak_words completed to attempted', () => {
    const loop = weakWordsLoop()
    const m = mergeTypedCompletionPayload(loop, { loopType: 'weak_words', wordsAttempted: 5, wordsCompleted: 99 })
    expect(m.loopType).toBe('weak_words')
    if (m.loopType === 'weak_words') {
      expect(m.wordsAttempted).toBe(5)
      expect(m.wordsCompleted).toBe(5)
    }
  })
})

describe('buildCompletionInsight', () => {
  it('includes counts for weak_words', () => {
    const loop = weakWordsLoop()
    const line = buildCompletionInsight(loop, {
      loopType: 'weak_words',
      wordsAttempted: 4,
      wordsCompleted: 3,
    })
    expect(line).toContain('3/4')
    expect(line).toContain(loop.title)
  })
})

describe('completionEvidenceMagnitude', () => {
  it('stays within 0..0.3 for stretch difficulty', () => {
    const loop = weakWordsLoop({ difficulty: 'stretch' })
    const m = completionEvidenceMagnitude(loop, { loopType: 'weak_words', wordsAttempted: 10, wordsCompleted: 10 })
    expect(m).toBeLessThanOrEqual(0.3)
    expect(m).toBeGreaterThan(0)
  })

  it('uses mild default when typed summary missing', () => {
    const loop = weakWordsLoop({ difficulty: 'easy' })
    const m = completionEvidenceMagnitude(loop, null)
    expect(m).toBeLessThanOrEqual(0.3)
  })
})
