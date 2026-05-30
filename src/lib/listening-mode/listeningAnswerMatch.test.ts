import { describe, expect, it } from 'vitest'
import { bestOptionMatchIndex, normalizeListeningAnswer } from '@/lib/listening-mode/listeningAnswerMatch'

describe('listeningAnswerMatch', () => {
  it('normalizes punctuation and case', () => {
    expect(normalizeListeningAnswer('  Hello, Café!  ')).toBe('hello cafe')
  })

  it('matches closest option from typed Dutch', () => {
    const opts = [
      { id: 'a', label: 'Nee, zwart graag.' },
      { id: 'b', label: 'Ik zoek de trein.' },
    ]
    expect(bestOptionMatchIndex(opts, 'nee zwart')).toBe(0)
  })
})
