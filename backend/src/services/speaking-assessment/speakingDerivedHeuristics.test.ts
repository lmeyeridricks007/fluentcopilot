import { describe, expect, it } from 'vitest'
import type { NormalizedWordAssessment } from '../speech/pronunciationAssessmentContracts'
import type { DerivedScores, TimingAnalysis, WordAssessment } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import { analyzeSpeechTiming } from './speechTimingAnalysisService'
import { computeDerivedScores } from './speakingDerivedScoresService'
import { mapVerdictLabelsFromSignals } from './speakingVerdictLabels'
import { extractPhraseTargets } from './phraseTargetExtraction'

function w(word: string, startMs: number, endMs: number, accuracyScore = 92): NormalizedWordAssessment {
  return { word, accuracyScore, startMs, endMs }
}

function wordA(partial: Partial<WordAssessment> & Pick<WordAssessment, 'text' | 'isWeak'>): WordAssessment {
  return {
    normalizedText: partial.text.toLowerCase(),
    accuracyScore: partial.accuracyScore ?? 88,
    errorType: 'None',
    startMs: partial.startMs ?? null,
    endMs: partial.endMs ?? null,
    isStrong: partial.isStrong ?? !partial.isWeak,
    coachingNote: partial.coachingNote ?? '',
    ...partial,
  }
}

describe('analyzeSpeechTiming', () => {
  it('flags rushed ending when last word is much shorter than the previous', () => {
    const words = [
      w('Met', 0, 400),
      w('melk', 450, 900), // 450ms
      w('graag', 920, 940), // 20ms << 450 * 0.45
    ]
    const t = analyzeSpeechTiming({ words, userClipDurationMs: 1000, transcript: 'Met melk graag.' })
    expect(t.rushedEnding).toBe(true)
    expect(t.sentenceLevelNotes).toContain('ending rushed')
  })

  it('flags hesitation moments for long gaps between words', () => {
    const words = [w('Een', 0, 200), w('twee', 800, 1000)] // 600ms gap > 450
    const t = analyzeSpeechTiming({ words, userClipDurationMs: 1200, transcript: 'Een twee' })
    expect(t.pauseCount).toBe(1)
    expect(t.hesitationMoments).toHaveLength(1)
    expect(t.hesitationMoments[0]?.pauseMs).toBeGreaterThanOrEqual(600)
  })

  it('sets paceProfile to rushed when estimated WPM exceeds band', () => {
    // 20 words in ~4000ms active speech ≈ 300 WPM
    const words: NormalizedWordAssessment[] = []
    let t0 = 0
    for (let i = 0; i < 20; i++) {
      words.push(w(`w${i}`, t0, t0 + 180))
      t0 += 200
    }
    const t = analyzeSpeechTiming({ words, userClipDurationMs: t0 + 200, transcript: words.map((x) => x.word).join(' ') })
    expect(t.estimatedWpm).toBeGreaterThan(155)
    expect(t.paceProfile).toBe('rushed')
  })

  it('detects high final-window word density as rushed ending', () => {
    const clip = 10_000
    const words: NormalizedWordAssessment[] = []
    // Four words in first 7s
    let t0 = 500
    for (let i = 0; i < 4; i++) {
      words.push(w(`a${i}`, t0, t0 + 300))
      t0 += 1500
    }
    // Six starts in final 20% (>= 8000ms)
    const starts = [8100, 8300, 8500, 8700, 8900, 9050]
    for (let i = 0; i < 6; i++) {
      const s = starts[i]!
      words.push(w(`z${i}`, s, s + 120))
    }
    const timing = analyzeSpeechTiming({
      words,
      userClipDurationMs: clip,
      transcript: words.map((x) => x.word).join(' '),
    })
    expect(timing.rushedEnding).toBe(true)
  })
})

describe('computeDerivedScores', () => {
  const baseRaw = {
    pronunciation: 82,
    fluency: 80,
    completeness: 90,
    overall: 82,
    prosody: 70 as number | null,
    accuracy: 84,
  }

  it('labels naturalness when completeness is high but pace is uneven', () => {
    const timing: TimingAnalysis = {
      totalDurationMs: 5000,
      speakingDurationMs: 4500,
      silenceDurationMs: 500,
      pauseCount: 6,
      avgPauseMs: 400,
      longestPauseMs: 800,
      wordsSpokenCount: 12,
      estimatedWpm: 110,
      phraseBoundaryCandidates: [],
      rushedEnding: false,
      trailingCompression: false,
      hesitationMoments: [],
      paceProfile: 'uneven',
      paceNotes: [],
      sentenceLevelNotes: [],
    }
    const d = computeDerivedScores({ ...baseRaw, completeness: 90 }, timing)
    expect(d.naturalness.label).toBe('understandable but not smooth')
  })

  it('labels careful delivery when fluency is good but derived naturalness score is pulled down', () => {
    const timing: TimingAnalysis = {
      totalDurationMs: 8000,
      speakingDurationMs: 7800,
      silenceDurationMs: 200,
      pauseCount: 8,
      avgPauseMs: 500,
      longestPauseMs: 900,
      wordsSpokenCount: 10,
      estimatedWpm: 95,
      phraseBoundaryCandidates: [{ afterWordIndex: 2, pauseMs: 500 }],
      rushedEnding: false,
      trailingCompression: true,
      hesitationMoments: [{ afterWordIndex: 1, pauseMs: 600 }],
      paceProfile: 'uneven',
      paceNotes: [],
      sentenceLevelNotes: [],
    }
    const d = computeDerivedScores(
      { ...baseRaw, fluency: 78, pronunciation: 60, completeness: 78, accuracy: 75 },
      timing
    )
    expect(d.naturalness.score).toBeLessThan(65)
    expect(d.naturalness.label).toBe('clear learner Dutch')
  })

  it('returns intonation block with score when prosody is present', () => {
    const timing: TimingAnalysis = {
      totalDurationMs: 3000,
      speakingDurationMs: 2800,
      silenceDurationMs: null,
      pauseCount: 0,
      avgPauseMs: 0,
      longestPauseMs: 0,
      wordsSpokenCount: 5,
      estimatedWpm: 100,
      phraseBoundaryCandidates: [],
      rushedEnding: false,
      trailingCompression: false,
      hesitationMoments: [],
      paceProfile: 'steady',
      paceNotes: [],
      sentenceLevelNotes: [],
    }
    const d = computeDerivedScores({ ...baseRaw, prosody: 65 }, timing)
    expect(d.intonationGuidance).not.toBeNull()
    expect(d.intonationGuidance?.score).toBe(65)
  })
})

describe('mapVerdictLabelsFromSignals', () => {
  const steadyTiming: TimingAnalysis = {
    totalDurationMs: 4000,
    speakingDurationMs: 3800,
    silenceDurationMs: 200,
    pauseCount: 1,
    avgPauseMs: 200,
    longestPauseMs: 200,
    wordsSpokenCount: 8,
    estimatedWpm: 105,
    phraseBoundaryCandidates: [],
    rushedEnding: false,
    trailingCompression: false,
    hesitationMoments: [],
    paceProfile: 'steady',
    paceNotes: [],
    sentenceLevelNotes: [],
  }

  it('prefers clarity-vs-rhythm mismatch copy when pronunciation is high but rhythm score is low', () => {
    const raw = {
      pronunciation: 82,
      fluency: 70,
      completeness: 86,
      overall: 78,
      prosody: null as number | null,
      accuracy: 80,
    }
    const derived: DerivedScores = {
      rhythm: { score: 55, label: 'uneven pacing' },
      sentenceStress: { score: 74, label: 'reasonable word-level clarity' },
      intonationGuidance: null,
      naturalness: { score: 72, label: 'good learner Dutch' },
    }
    const v = mapVerdictLabelsFromSignals({ raw, derived, timing: steadyTiming })
    expect(v.naturalnessLabel).toBe('words fairly clear — flow less natural yet')
  })
})

describe('extractPhraseTargets', () => {
  it('adds a high-priority tail chunk when ending is rushed', () => {
    const timing: TimingAnalysis = {
      totalDurationMs: 2000,
      speakingDurationMs: 1800,
      silenceDurationMs: 200,
      pauseCount: 0,
      avgPauseMs: 0,
      longestPauseMs: 0,
      wordsSpokenCount: 4,
      estimatedWpm: 120,
      phraseBoundaryCandidates: [],
      rushedEnding: true,
      trailingCompression: false,
      hesitationMoments: [],
      paceProfile: 'rushed',
      paceNotes: [],
      sentenceLevelNotes: ['ending rushed'],
    }
    const wa: WordAssessment[] = [
      wordA({ text: 'Met', isWeak: false }),
      wordA({ text: 'melk', isWeak: false }),
      wordA({ text: 'graag', isWeak: true }),
    ]
    const targets = extractPhraseTargets({
      wordAssessments: wa,
      timing,
      expectedText: 'Met melk, graag.',
      transcript: 'Met melk graag',
    })
    const rushed = targets.find((t) => t.reason === 'ending rushed')
    expect(rushed?.priority).toBe('high')
    expect(rushed?.text.toLowerCase()).toContain('melk')
  })

  it('flags English-leaning insertions vs expected Dutch', () => {
    const timing: TimingAnalysis = {
      totalDurationMs: 3000,
      speakingDurationMs: 2800,
      silenceDurationMs: null,
      pauseCount: 0,
      avgPauseMs: 0,
      longestPauseMs: 0,
      wordsSpokenCount: 3,
      estimatedWpm: 60,
      phraseBoundaryCandidates: [],
      rushedEnding: false,
      trailingCompression: false,
      hesitationMoments: [],
      paceProfile: 'steady',
      paceNotes: [],
      sentenceLevelNotes: [],
    }
    const wa: WordAssessment[] = [wordA({ text: 'Koffie', isWeak: false })]
    const targets = extractPhraseTargets({
      wordAssessments: wa,
      timing,
      expectedText: 'Koffie met melk',
      transcript: 'Coffee please thanks',
    })
    expect(targets.some((t) => t.reason.includes('English-leaning'))).toBe(true)
  })
})
