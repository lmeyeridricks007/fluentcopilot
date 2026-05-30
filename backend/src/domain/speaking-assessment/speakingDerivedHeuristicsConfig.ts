/**
 * Tunable thresholds for deterministic speaking analysis.
 * Adjust here only — document changes in `docs/speaking-derived-analysis.md`.
 */
export const SPEAKING_DERIVED_THRESHOLDS = {
  /** Gaps above this (ms) count as a “pause” between words. */
  pauseMinMs: 120,
  /** Gaps above this count as hesitation / long boundary candidates. */
  hesitationPauseMs: 450,
  /** Boundary candidate: notable pause before a new phrase chunk. */
  phraseBoundaryPauseMs: 280,
  /** Last-word duration below this fraction of previous word → rushed syllable (legacy cue). */
  rushedWordDurationRatio: 0.45,
  /** Final segment of clip (ratio) used for density-based rushed ending. */
  rushedFinalWindowRatio: 0.2,
  /** If word count in final window / words before window exceeds this, flag rushed ending. */
  rushedFinalWordDensityRatio: 0.55,
  /** Minimum words with timings required for density-based rushed ending. */
  rushedEndingMinTimedWords: 5,
  /** Pauses per word above this suggests hesitation / uneven pacing. */
  highPauseToWordRatio: 0.35,
  /** WPM bands (rough, language-agnostic; Dutch short replies skew low). */
  wpmTooSlow: 70,
  wpmRushed: 155,
  /** Coefficient of variation of gaps above this → uneven (needs ≥3 gaps). */
  gapCvUneven: 0.85,
} as const
