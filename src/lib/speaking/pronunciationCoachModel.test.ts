import { describe, expect, it } from 'vitest'
import {
  buildCoachDimensionsFromPronunciation,
  buildSpeakingTopVerdict,
  isDutchNonLexemeToken,
  pickRetryDifficultPhrase,
  pickRetryDifficultWord,
  wordScoreGapNote,
} from './pronunciationCoachModel'
import type { NormalizedAudioPronunciationAssessment } from '@/lib/speech/audioPronunciationTypes'

function baseAssessment(
  overrides: Partial<NormalizedAudioPronunciationAssessment> = {}
): NormalizedAudioPronunciationAssessment {
  return {
    pronunciationScore: 80,
    accuracyScore: 78,
    fluencyScore: 82,
    completenessScore: 90,
    prosodyScore: null,
    overallScore: 84,
    recognizedText: 'test',
    referenceTextUsed: 'test',
    assessmentMode: 'reference',
    referenceAlignment: 'target_phrase',
    words: [],
    actionNotes: [],
    caveatNotes: [],
    ...overrides,
  }
}

describe('buildCoachDimensionsFromPronunciation', () => {
  it('fills intonation row when prosody score is missing', () => {
    const rows = buildCoachDimensionsFromPronunciation(baseAssessment({ prosodyScore: null }))
    const into = rows.find((r) => r.id === 'intonation')
    expect(into?.score).not.toBeNull()
    expect(into?.score).toBe(Math.round(82 * 0.56 + 80 * 0.44))
    expect(into?.hint).toContain('Estimated')
  })

  it('uses direct prosody score when present', () => {
    const rows = buildCoachDimensionsFromPronunciation(baseAssessment({ prosodyScore: 71 }))
    const into = rows.find((r) => r.id === 'intonation')
    expect(into?.score).toBe(71)
    expect(into?.hint).toContain('Melody and emphasis from your recording')
  })

  it('includes why and try-next coaching on every dimension', () => {
    const rows = buildCoachDimensionsFromPronunciation(
      baseAssessment({
        words: [
          { word: 'hallo', accuracyScore: 55 },
          { word: 'trein', accuracyScore: 92 },
        ],
      })
    )
    for (const r of rows) {
      expect(r.why.length).toBeGreaterThan(12)
      expect(r.tryNext.length).toBeGreaterThan(12)
    }
    const pron = rows.find((x) => x.id === 'pronunciation')
    expect(pron?.why).toContain('hallo')
    expect(pron?.why).toMatch(/For "test"/)
  })

  it('surfaces word-level gap note when headline and weakest words disagree', () => {
    const a = baseAssessment({
      overallScore: 90,
      pronunciationScore: 90,
      recognizedText: 'Is de trein op tijd?',
      referenceTextUsed: 'Is de trein op tijd?',
      words: [
        { word: 'Is', accuracyScore: 92 },
        { word: 'trein', accuracyScore: 58 },
      ],
    })
    expect(wordScoreGapNote(a)).toBeTruthy()
    const v = buildSpeakingTopVerdict(a)
    expect(v.headline).toContain('uneven')
  })
})

describe('retry pickers and non-lexeme filter', () => {
  it('orders difficult phrase by speaking time, not score sort', () => {
    const phrase = pickRetryDifficultPhrase(
      baseAssessment({
        words: [
          { word: 'tijd', accuracyScore: 40, startMs: 800 },
          { word: 'Is', accuracyScore: 50, startMs: 0 },
          { word: 'de', accuracyScore: 45, startMs: 100 },
          { word: 'trein', accuracyScore: 90, startMs: 200 },
          { word: 'op', accuracyScore: 88, startMs: 400 },
        ],
      })
    )
    expect(phrase).toBe('Is de tijd')
  })

  it('picks weakest content word over articles/auxiliaries', () => {
    const w = pickRetryDifficultWord(
      baseAssessment({
        words: [
          { word: 'Is', accuracyScore: 40 },
          { word: 'de', accuracyScore: 41 },
          { word: 'trein', accuracyScore: 70 },
        ],
      })
    )
    expect(w).toBe('trein')
  })

  it('classifies common Dutch function words as non-lexeme', () => {
    expect(isDutchNonLexemeToken('de')).toBe(true)
    expect(isDutchNonLexemeToken('Is')).toBe(true)
    expect(isDutchNonLexemeToken('trein')).toBe(false)
  })
})
