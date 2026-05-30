import type { DerivedScores, RawScores, TimingAnalysis } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import { SPEAKING_DERIVED_THRESHOLDS as T } from '../../domain/speaking-assessment/speakingDerivedHeuristicsConfig'

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function rhythmLabel(score: number | null, timing: TimingAnalysis): { label: string; explanation?: string } {
  if (score == null) return { label: 'timing too sparse to score rhythm', explanation: 'Heuristic skipped — few word timestamps.' }
  if (timing.paceProfile === 'rushed') return { label: 'often rushed', explanation: 'High rate or compressed ending vs earlier words.' }
  if (timing.paceProfile === 'tooSlow') return { label: 'steady but careful', explanation: 'Slow pace can aid clarity; watch melody on stressed syllables.' }
  if (timing.paceProfile === 'uneven') return { label: 'uneven pacing', explanation: 'Pauses or chunk lengths vary a lot across the clip.' }
  if (score >= 74) return { label: 'fairly even learner pace' }
  if (score >= 58) return { label: 'steady but careful' }
  return { label: 'needs steadier rhythm' }
}

function stressLabel(score: number, raw: RawScores): { label: string; explanation?: string } {
  if (raw.pronunciation >= 78 && (raw.fluency ?? 0) < 68) {
    return {
      label: 'key stress not always landing',
      explanation: 'Words are fairly clear; flow suggests stress/melody still being learned.',
    }
  }
  if (score >= 72) return { label: 'reasonable word-level clarity' }
  if (score >= 58) return { label: 'key stress not always landing' }
  return { label: 'stress and clarity need work' }
}

function intonationBlock(raw: RawScores, timing: TimingAnalysis): DerivedScores['intonationGuidance'] {
  if (raw.prosody != null && Number.isFinite(raw.prosody)) {
    const s = clamp100(raw.prosody)
    return {
      score: s,
      label: s >= 72 ? 'prosody cues look supportive' : s >= 58 ? 'melody still learner-like' : 'intonation still flat or uneven',
      explanation: 'Uses Azure prosody score when returned — still a proxy, not a full melody analysis.',
    }
  }
  if (timing.phraseBoundaryCandidates.length >= 2 || timing.longestPauseMs > T.hesitationPauseMs) {
    return {
      score: null,
      label: 'timing-based hint only',
      explanation: 'No reliable prosody score — phrase pauses suggest where melody may need work.',
    }
  }
  return null
}

function naturalnessLabel(score: number, raw: RawScores, timing: TimingAnalysis): { label: string; explanation?: string } {
  if (raw.fluency >= 76 && score < 65) {
    return {
      label: 'clear learner Dutch',
      explanation: 'Fluency looks OK but delivery still sounds careful or flat — common when learning.',
    }
  }
  if (raw.completeness >= 88 && timing.paceProfile === 'uneven') {
    return {
      label: 'understandable but not smooth',
      explanation: 'Text completeness is high; pacing unevenness limits natural flow.',
    }
  }
  if (score >= 76) return { label: 'clear learner Dutch' }
  if (score >= 62) return { label: 'good learner Dutch' }
  return { label: 'still building natural Dutch flow' }
}

function hasTimingSignal(timing: TimingAnalysis): boolean {
  return (
    timing.speakingDurationMs > 0 ||
    timing.totalDurationMs > 0 ||
    timing.wordsSpokenCount > 0 ||
    timing.estimatedWpm > 0
  )
}

/**
 * Bounded derived dimensions from Azure raw scores + deterministic timing.
 * Labels are conservative and never claim native-like production.
 */
export function emptyDerivedScores(): DerivedScores {
  return {
    rhythm: { score: null, label: 'no data', explanation: 'No pronunciation result.' },
    sentenceStress: { score: null, label: 'no data', explanation: 'No pronunciation result.' },
    intonationGuidance: null,
    naturalness: { score: null, label: 'no data', explanation: 'No pronunciation result.' },
  }
}

export function computeDerivedScores(raw: RawScores, timing: TimingAnalysis): DerivedScores {
  const pausePenalty = Math.min(22, timing.pauseCount * 3 + timing.hesitationMoments.length * 2)
  const unevenPenalty = timing.paceProfile === 'uneven' ? 8 : 0
  const rushPenalty = timing.rushedEnding || timing.paceProfile === 'rushed' ? 10 : 0

  const rhythmNumeric = clamp100(raw.fluency - pausePenalty * 0.45 - unevenPenalty * 0.6 - rushPenalty * 0.5)
  const rhythmScore = hasTimingSignal(timing) ? rhythmNumeric : null

  const stressBase = clamp100(raw.pronunciation * 0.65 + raw.accuracy * 0.35)
  const rhythmForAdj = rhythmScore ?? raw.fluency
  const stressAdjusted =
    rhythmForAdj < 62 && stressBase > 72 ? clamp100(stressBase - 8) : stressBase

  const naturalnessBase = clamp100(
    (raw.pronunciation * 0.35 + raw.fluency * 0.35 + raw.completeness * 0.3) - unevenPenalty * 0.35
  )
  const naturalnessScore = clamp100(naturalnessBase - (timing.trailingCompression ? 5 : 0))

  const rl = rhythmLabel(rhythmScore, timing)
  const sl = stressLabel(stressAdjusted, raw)
  const nl = naturalnessLabel(naturalnessScore, raw, timing)

  return {
    rhythm: {
      score: rhythmScore,
      label: rl.label,
      explanation: rl.explanation,
    },
    sentenceStress: {
      score: stressAdjusted,
      label: sl.label,
      explanation: sl.explanation,
    },
    intonationGuidance: intonationBlock(raw, timing),
    naturalness: {
      score: naturalnessScore,
      label: nl.label,
      explanation: nl.explanation,
    },
  }
}
