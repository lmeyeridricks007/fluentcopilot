import { describe, expect, it } from 'vitest'
import { listeningPromptParts, parseYouHearPrompt } from '@/lib/review-engine/reviewListeningPrompt'
import type { ReviewItem } from '@/lib/schemas/reviewItem.schema'

describe('parseYouHearPrompt', () => {
  it('parses curly quotes after You hear', () => {
    const p = 'You hear: “Twee koffie, alstublieft.” What did they order?'
    expect(parseYouHearPrompt(p)).toEqual({
      snippet: 'Twee koffie, alstublieft.',
      instruction: 'What did they order?',
    })
  })

  it('parses You heard with straight double quotes', () => {
    const p = 'You heard: "Goedemorgen." What time of day is it?'
    expect(parseYouHearPrompt(p)).toEqual({
      snippet: 'Goedemorgen.',
      instruction: 'What time of day is it?',
    })
  })
})

describe('listeningPromptParts', () => {
  const base = {
    id: 'x',
    sourceLessonId: 'lesson-1',
    type: 'listening' as const,
    difficulty: 'A2_low' as const,
    expectedAnswer: 'twee koffie',
    metadata: {},
  }

  it('splits prompt and snippet for standard You hear format', () => {
    const item: ReviewItem = {
      ...base,
      prompt: 'You hear: “Twee koffie, alstublieft.” What did they order?',
    }
    expect(listeningPromptParts(item)).toEqual({
      listeningTextNl: 'Twee koffie, alstublieft.',
      displayPrompt: 'What did they order?',
    })
  })

  it('uses metadata.listeningNl when set', () => {
    const item: ReviewItem = {
      ...base,
      prompt: 'You hear: “X.” Pick the meaning.',
      metadata: { listeningNl: 'Mag ik betalen?' },
    }
    expect(listeningPromptParts(item).listeningTextNl).toBe('Mag ik betalen?')
    expect(listeningPromptParts(item).displayPrompt).toBe('Pick the meaning.')
  })
})
