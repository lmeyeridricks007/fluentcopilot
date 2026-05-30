import type { DerivedScores, RawScores, TimingAnalysis } from '../../domain/speaking-assessment/speakingAssessmentCanonical'

/**
 * Honest, non-native verdict strings. Never imply native-like production.
 */
export function mapVerdictLabelsFromSignals(input: {
  raw: RawScores
  derived: DerivedScores
  timing: TimingAnalysis
}): { topLabel: string; clarityLabel: string; naturalnessLabel: string } {
  const { raw, derived, timing } = input
  const clarityAvg = (raw.accuracy + raw.completeness) / 2
  const natScore =
    derived.naturalness.score ?? Math.round((raw.pronunciation + raw.fluency + raw.completeness) / 3)

  let clarityLabel = 'clear and understandable'
  if (clarityAvg < 62) clarityLabel = 'still working toward clear delivery'
  else if (clarityAvg < 76) clarityLabel = 'mostly clear with rough edges'

  let naturalnessLabel = 'good learner Dutch'
  if (natScore != null && natScore >= 78) naturalnessLabel = 'clear learner Dutch with steady intent'
  else if (natScore != null && natScore < 55) naturalnessLabel = 'careful or uneven delivery — not yet Dutch-like flow'
  else if (timing.paceProfile === 'uneven' || timing.hesitationMoments.length >= 3) {
    naturalnessLabel = 'clear but still English-leaning rhythm'
  }

  if (raw.pronunciation >= 78 && (derived.rhythm.score ?? 0) < 62) {
    naturalnessLabel = 'words fairly clear — flow less natural yet'
  }

  let topLabel = 'solid practice clip'
  if (raw.overall >= 80 && timing.paceProfile === 'steady') topLabel = 'clear and understandable'
  else if (raw.overall >= 72) topLabel = 'good learner Dutch overall'
  else if (raw.overall < 60) topLabel = 'needs a steadier rhythm and clearer endings'
  else topLabel = 'understandable — room to smooth pacing'

  if (timing.rushedEnding) {
    topLabel = 'understandable — ending feels rushed'
  }

  return { topLabel, clarityLabel, naturalnessLabel }
}
