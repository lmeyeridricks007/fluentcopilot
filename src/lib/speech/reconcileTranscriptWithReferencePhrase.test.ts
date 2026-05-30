import { describe, expect, it } from 'vitest'
import {
  pickMatchingStarterSuggestion,
  reconcileTranscriptWithReferencePhrase,
} from './reconcileTranscriptWithReferencePhrase'

const starters = ['Welk perron is het?', 'Is de trein op tijd?', 'Dank u wel.']

describe('pickMatchingStarterSuggestion', () => {
  it('matches by identical tail when first token differs (Whisper Is→s)', () => {
    expect(pickMatchingStarterSuggestion('s de trein op tijd', starters)).toBe('Is de trein op tijd?')
  })

  it('returns null when two starters share the same tail', () => {
    const ambiguous = ['Alpha de trein op tijd', 'Beta de trein op tijd']
    expect(pickMatchingStarterSuggestion('s de trein op tijd', ambiguous)).toBeNull()
  })

  it('matches exact normalized line', () => {
    expect(pickMatchingStarterSuggestion('Is de trein op tijd?', starters)).toBe('Is de trein op tijd?')
  })
})

describe('reconcileTranscriptWithReferencePhrase', () => {
  it('repairs Is when reference matches', () => {
    expect(reconcileTranscriptWithReferencePhrase('s de trein op tijd', 'Is de trein op tijd?')).toBe(
      'Is de trein op tijd'
    )
  })
})
