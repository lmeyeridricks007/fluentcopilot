import { describe, expect, it } from 'vitest'
import { splitListeningDialogueForTts } from './listeningDialogueTts'

describe('splitListeningDialogueForTts', () => {
  it('returns a single narrator segment when there are no A/B speaker tags', () => {
    expect(splitListeningDialogueForTts('Weerbericht: vandaag regen.')).toEqual([
      { role: 'narrator', text: 'Weerbericht: vandaag regen.' },
    ])
  })

  it('strips A:/B: prefixes and preserves order', () => {
    expect(splitListeningDialogueForTts('A: Hallo. B: Dag.')).toEqual([
      { role: 'A', text: 'Hallo.' },
      { role: 'B', text: 'Dag.' },
    ])
  })

  it('supports lowercase tags', () => {
    expect(splitListeningDialogueForTts('a: Eén. b: Twee.')).toEqual([
      { role: 'A', text: 'Eén.' },
      { role: 'B', text: 'Twee.' },
    ])
  })

  it('keeps leading narrator before the first speaker tag', () => {
    expect(splitListeningDialogueForTts('Mededeling: let op. A: Ja. B: Goed.')).toEqual([
      { role: 'narrator', text: 'Mededeling: let op.' },
      { role: 'A', text: 'Ja.' },
      { role: 'B', text: 'Goed.' },
    ])
  })
})
