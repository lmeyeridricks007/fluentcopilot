import { describe, expect, it } from 'vitest'
import {
  bandForScore,
  computeReliability,
  computeSessionReliability,
  computeWeightedComposite,
  applyLevelAdjustment,
  selectPriorityDimensions,
  buildHeadlineSummary,
  SCORING_POLICY_BY_LEVEL,
  SCORE_BANDS,
  ALL_DIMENSIONS,
  WEIGHTS_BY_MODE,
  AUDIO_REQUIRED_DIMENSIONS,
  type ScoreDimension,
  type ScoringDimensionId,
} from './speechScoringModel'

// ─── Band assignment ────────────────────────────────────────────────────

describe('bandForScore', () => {
  it('maps 0–39 to notYetWorkable', () => {
    expect(bandForScore(0).id).toBe('notYetWorkable')
    expect(bandForScore(39).id).toBe('notYetWorkable')
  })
  it('maps 40–59 to earlyStep', () => {
    expect(bandForScore(40).id).toBe('earlyStep')
    expect(bandForScore(59).id).toBe('earlyStep')
  })
  it('maps 60–74 to building', () => {
    expect(bandForScore(60).id).toBe('building')
    expect(bandForScore(74).id).toBe('building')
  })
  it('maps 75–89 to strongEnough', () => {
    expect(bandForScore(75).id).toBe('strongEnough')
    expect(bandForScore(89).id).toBe('strongEnough')
  })
  it('maps 90–100 to closeToLocal', () => {
    expect(bandForScore(90).id).toBe('closeToLocal')
    expect(bandForScore(100).id).toBe('closeToLocal')
  })
  it('clamps to valid range', () => {
    expect(bandForScore(-10).id).toBe('notYetWorkable')
    expect(bandForScore(120).id).toBe('closeToLocal')
  })
})

// ─── Reliability ────────────────────────────────────────────────────────

describe('computeReliability', () => {
  it('returns low when no audio', () => {
    expect(computeReliability({ hasAudio: false, wordCount: 10 }).level).toBe('low')
  })
  it('returns high with good audio', () => {
    expect(computeReliability({ hasAudio: true, wordCount: 10 }).level).toBe('high')
  })
  it('returns medium with short utterance', () => {
    expect(computeReliability({ hasAudio: true, wordCount: 2 }).level).toBe('medium')
  })
  it('returns low with multiple issues', () => {
    expect(computeReliability({
      hasAudio: true,
      wordCount: 1,
      clipDurationMs: 400,
    }).level).toBe('low')
  })
})

describe('computeSessionReliability', () => {
  it('returns low for zero turns', () => {
    expect(computeSessionReliability({ turnCount: 0, audioTurnCount: 0, avgWordCount: 0 }).level).toBe('low')
  })
  it('returns low for single turn', () => {
    expect(computeSessionReliability({ turnCount: 1, audioTurnCount: 1, avgWordCount: 8 }).level).toBe('low')
  })
  it('returns high for multiple audio turns', () => {
    expect(computeSessionReliability({ turnCount: 4, audioTurnCount: 4, avgWordCount: 8 }).level).toBe('high')
  })
  it('returns medium for partial audio coverage', () => {
    expect(computeSessionReliability({ turnCount: 4, audioTurnCount: 1, avgWordCount: 8 }).level).toBe('medium')
  })
})

// ─── Level-aware adjustment ─────────────────────────────────────────────

describe('applyLevelAdjustment', () => {
  /**
   * The current production policy applies `pronunciationBandShift` / `fluencyBandShift` /
   * `rhythmBandShift` directly to the raw score. `encouragementFloor` is intentionally not
   * blended in by `applyLevelAdjustment` (it remains on the policy as a future hook).
   */
  it('A2 leaves pronunciation unchanged (shift = 0)', () => {
    const policy = SCORING_POLICY_BY_LEVEL.A2
    expect(policy.pronunciationBandShift).toBe(0)
    expect(applyLevelAdjustment('pronunciation', 60, policy)).toBe(60)
  })
  it('B1 leaves pronunciation unchanged (shift = 0)', () => {
    const policy = SCORING_POLICY_BY_LEVEL.B1
    expect(policy.pronunciationBandShift).toBe(0)
    expect(applyLevelAdjustment('pronunciation', 60, policy)).toBe(60)
  })
  it('B2 penalizes fluency by its band shift', () => {
    const policy = SCORING_POLICY_BY_LEVEL.B2
    expect(applyLevelAdjustment('fluency', 60, policy)).toBe(60 + policy.fluencyBandShift)
  })
  it('wording dimension is not shifted by band (no per-band wording adjustment)', () => {
    const policy = SCORING_POLICY_BY_LEVEL.A2
    expect(applyLevelAdjustment('wording', 60, policy)).toBe(60)
  })
})

// ─── Weighted composite ─────────────────────────────────────────────────

describe('computeWeightedComposite', () => {
  it('computes weighted average from full dimension map', () => {
    const dims = new Map<ScoringDimensionId, number | null>([
      ['pronunciation', 80],
      ['fluency', 70],
      ['rhythm', 60],
      ['wording', 75],
      ['grammar', 65],
      ['scenarioFit', 85],
    ])
    const policy = SCORING_POLICY_BY_LEVEL.A2
    const result = computeWeightedComposite(dims, 'live_speak', policy)
    expect(result.overall).toBeGreaterThan(0)
    expect(result.overall).toBeLessThanOrEqual(100)
    expect(result.band).toBeTruthy()
    expect(result.breakdown).toHaveLength(6)
  })

  it('handles null dimensions by excluding from weight', () => {
    const dims = new Map<ScoringDimensionId, number | null>([
      ['pronunciation', null],
      ['fluency', null],
      ['rhythm', null],
      ['wording', 70],
      ['grammar', 70],
      ['scenarioFit', 70],
    ])
    const policy = SCORING_POLICY_BY_LEVEL.A2
    const result = computeWeightedComposite(dims, 'live_speak', policy)
    /** Three contributing dimensions, all 70 → weighted composite is 70 (no encouragement floor blending). */
    expect(result.overall).toBe(70)
    expect(result.breakdown.filter((b) => b.contribution == null)).toHaveLength(3)
  })
})

// ─── Priority dimension selection ───────────────────────────────────────

describe('selectPriorityDimensions', () => {
  function makeDim(id: ScoringDimensionId, score: number | null): ScoreDimension {
    return {
      id,
      score,
      band: score != null ? bandForScore(score) : null,
      reliability: { level: 'high', reason: '' },
      source: 'azure_audio',
      evidenceSummary: '',
      feedbackItems: [],
    }
  }

  it('returns the 3 lowest-scoring dimensions', () => {
    const dims = [
      makeDim('pronunciation', 80),
      makeDim('fluency', 50),
      makeDim('rhythm', 40),
      makeDim('wording', 90),
      makeDim('grammar', 60),
      makeDim('scenarioFit', 70),
    ]
    const picks = selectPriorityDimensions(dims, 3)
    expect(picks).toHaveLength(3)
    expect(picks.map((p) => p.id)).toEqual(['rhythm', 'fluency', 'grammar'])
  })

  it('includes scenarioFit if below 60', () => {
    const dims = [
      makeDim('pronunciation', 80),
      makeDim('fluency', 70),
      makeDim('rhythm', 65),
      makeDim('wording', 75),
      makeDim('grammar', 72),
      makeDim('scenarioFit', 45),
    ]
    const picks = selectPriorityDimensions(dims, 3)
    expect(picks.some((p) => p.id === 'scenarioFit')).toBe(true)
  })

  it('skips null-scored dimensions', () => {
    const dims = [
      makeDim('pronunciation', null),
      makeDim('fluency', null),
      makeDim('wording', 70),
      makeDim('grammar', 65),
      makeDim('scenarioFit', 55),
    ]
    const picks = selectPriorityDimensions(dims, 3)
    expect(picks.every((p) => p.score != null)).toBe(true)
  })
})

// ─── Headline builder ───────────────────────────────────────────────────

describe('buildHeadlineSummary', () => {
  it('shows transcript-only message when no audio', () => {
    const composite = computeWeightedComposite(
      new Map([['wording', 70], ['grammar', 70], ['scenarioFit', 70]] as [ScoringDimensionId, number][]),
      'live_speak',
      SCORING_POLICY_BY_LEVEL.A2,
    )
    const headline = buildHeadlineSummary(composite, 'A2', false)
    expect(headline).toContain('A2')
    expect(headline).toContain('audio')
  })

  it('shows building message for mid scores', () => {
    const composite = computeWeightedComposite(
      new Map(ALL_DIMENSIONS.map((d) => [d, 65] as [ScoringDimensionId, number])),
      'live_speak',
      SCORING_POLICY_BY_LEVEL.B1,
    )
    const headline = buildHeadlineSummary(composite, 'B1', true)
    expect(headline).toContain('B1')
  })
})

// ─── Mode weighting sums to 1.0 ────────────────────────────────────────

describe('WEIGHTS_BY_MODE', () => {
  for (const [mode, weights] of Object.entries(WEIGHTS_BY_MODE)) {
    it(`${mode} weights sum to 1.0`, () => {
      const sum = Object.values(weights).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1.0, 5)
    })
  }
})

// ─── Audio-required dimensions ──────────────────────────────────────────

describe('AUDIO_REQUIRED_DIMENSIONS', () => {
  it('includes pronunciation, fluency, rhythm', () => {
    expect(AUDIO_REQUIRED_DIMENSIONS.has('pronunciation')).toBe(true)
    expect(AUDIO_REQUIRED_DIMENSIONS.has('fluency')).toBe(true)
    expect(AUDIO_REQUIRED_DIMENSIONS.has('rhythm')).toBe(true)
  })
  it('excludes wording, grammar, scenarioFit', () => {
    expect(AUDIO_REQUIRED_DIMENSIONS.has('wording')).toBe(false)
    expect(AUDIO_REQUIRED_DIMENSIONS.has('grammar')).toBe(false)
    expect(AUDIO_REQUIRED_DIMENSIONS.has('scenarioFit')).toBe(false)
  })
})

// ─── Scoring policy by level sanity checks ──────────────────────────────

describe('SCORING_POLICY_BY_LEVEL', () => {
  it('A1 keeps an encouragement floor (>= B1) and B2+ have no floor', () => {
    expect(SCORING_POLICY_BY_LEVEL.A1.encouragementFloor).toBeGreaterThanOrEqual(
      SCORING_POLICY_BY_LEVEL.B1.encouragementFloor,
    )
    expect(SCORING_POLICY_BY_LEVEL.B2.encouragementFloor).toBe(0)
    expect(SCORING_POLICY_BY_LEVEL.C1.encouragementFloor).toBe(0)
    expect(SCORING_POLICY_BY_LEVEL.C2.encouragementFloor).toBe(0)
  })
  it('C2 has strictest settings', () => {
    expect(SCORING_POLICY_BY_LEVEL.C2.hesitationStrictness).toBeGreaterThan(SCORING_POLICY_BY_LEVEL.A2.hesitationStrictness)
    expect(SCORING_POLICY_BY_LEVEL.C2.grammarStrictness).toBeGreaterThan(SCORING_POLICY_BY_LEVEL.A2.grammarStrictness)
  })
  it('B2+ has negative band shifts', () => {
    expect(SCORING_POLICY_BY_LEVEL.B2.pronunciationBandShift).toBeLessThan(0)
    expect(SCORING_POLICY_BY_LEVEL.C1.fluencyBandShift).toBeLessThan(0)
  })
})

// ─── Score bands are contiguous ─────────────────────────────────────────

describe('SCORE_BANDS', () => {
  it('covers 0–100 contiguously', () => {
    expect(SCORE_BANDS[0].min).toBe(0)
    expect(SCORE_BANDS[SCORE_BANDS.length - 1].max).toBe(100)
    for (let i = 1; i < SCORE_BANDS.length; i++) {
      expect(SCORE_BANDS[i].min).toBe(SCORE_BANDS[i - 1].max + 1)
    }
  })
})
