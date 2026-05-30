import { describe, expect, it } from 'vitest'
import { normalizeTrainStationUtterance } from './trainStationTranscriptNormalize'

describe('normalizeTrainStationUtterance', () => {
  it('lowercases, strips punctuation, and collapses whitespace', () => {
    expect(normalizeTrainStationUtterance('  Is de trein op tijd? ')).toBe('is de trein op tijd')
    expect(normalizeTrainStationUtterance('Hoe   laat\nvertrekt…de—trein?!')).toBe('hoe laat vertrekt de trein')
  })

  it('strips combining marks from accented input', () => {
    expect(normalizeTrainStationUtterance('Heeft dé trein vertraging?')).toBe('heeft de trein vertraging')
  })

  it('normalizes common Dutch ASR variants for station intents', () => {
    expect(normalizeTrainStationUtterance('Van welk peron vertrekt de trayn')).toBe('van welk perron vertrekt de trein')
    expect(normalizeTrainStationUtterance('Is de trein optijd')).toBe('is de trein op tijd')
    expect(normalizeTrainStationUtterance('Hoelat vertrekt de trein')).toBe('hoe laat vertrekt de trein')
    expect(normalizeTrainStationUtterance('De trein heeft vertaging')).toBe('de trein heeft vertraging')
  })

  it('preserves meaning-bearing tokens for downstream regexes', () => {
    const s = normalizeTrainStationUtterance('Welk perron is het voor de trein naar Utrecht?')
    expect(s).toContain('perron')
    expect(s).toContain('trein')
    expect(s).toContain('utrecht')
  })
})
