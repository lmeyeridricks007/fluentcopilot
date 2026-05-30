import { describe, expect, it } from 'vitest'
import { hydrateExerciseBlocks } from './generatedExercisePackHydration'
import type { StoredExerciseBlock } from './generatedExercisePackTypes'

describe('hydrateExerciseBlocks', () => {
  it('merges results and marks completed', () => {
    const defs: StoredExerciseBlock[] = [
      {
        id: 'x1',
        type: 'explanation_card',
        sourceCaptureIds: [],
        skillTags: [],
        config: { dutch: 'a', englishMeaning: 'b', exampleLines: [] },
      },
    ]
    const out = hydrateExerciseBlocks(
      defs,
      new Map([
        [
          'x1',
          {
            blockId: 'x1',
            correctness: 1,
            completionScore: 0.9,
            userAnswerJson: null,
            notesJson: JSON.stringify(['ok']),
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      ]),
    )
    expect(out[0]?.completionState).toBe('completed')
    expect(out[0]?.result?.notes).toEqual(['ok'])
  })
})
