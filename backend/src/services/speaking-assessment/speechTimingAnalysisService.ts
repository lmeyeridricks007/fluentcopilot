import type { NormalizedWordAssessment } from '../speech/pronunciationAssessmentContracts'
import type { HesitationMoment, PhraseBoundaryCandidate, TimingAnalysis } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import { SPEAKING_DERIVED_THRESHOLDS as T } from '../../domain/speaking-assessment/speakingDerivedHeuristicsConfig'

function wordDurMs(w: NormalizedWordAssessment): number {
  if (w.startMs != null && w.endMs != null && w.endMs >= w.startMs) return w.endMs - w.startMs
  return 0
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function stdev(nums: number[]): number {
  if (nums.length < 2) return 0
  const m = mean(nums)
  return Math.sqrt(mean(nums.map((x) => (x - m) ** 2)))
}

function coefficientOfVariation(nums: number[]): number {
  const m = mean(nums)
  if (m < 1e-6) return 0
  return stdev(nums) / m
}

/**
 * Deterministic timing from Azure word boundaries + clip length.
 * No LLM. When timings are missing, numeric fields fall back to transcript-only heuristics where safe.
 */
export function analyzeSpeechTiming(input: {
  words: NormalizedWordAssessment[]
  userClipDurationMs: number | null
  transcript: string
}): TimingAnalysis {
  const words = input.words.filter((w) => w.word.trim().length > 0)
  const clip = input.userClipDurationMs && input.userClipDurationMs > 0 ? input.userClipDurationMs : 0

  const gaps: { afterIndex: number; pauseMs: number }[] = []
  const hesitationMoments: HesitationMoment[] = []
  const phraseBoundaryCandidates: PhraseBoundaryCandidate[] = []

  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i]
    const b = words[i + 1]
    const endA = a.endMs ?? a.startMs
    const startB = b.startMs
    if (endA != null && startB != null && startB >= endA) {
      const pauseMs = startB - endA
      if (pauseMs > T.pauseMinMs) {
        gaps.push({ afterIndex: i, pauseMs })
        if (pauseMs > T.hesitationPauseMs) {
          hesitationMoments.push({ afterWordIndex: i, pauseMs })
        }
        if (pauseMs > T.phraseBoundaryPauseMs) {
          phraseBoundaryCandidates.push({ afterWordIndex: i, pauseMs })
        }
      }
    }
  }

  const firstStart = words[0]?.startMs
  const last = words.length ? words[words.length - 1] : undefined
  const lastEnd = last?.endMs ?? last?.startMs
  const speakingDurationMs =
    firstStart != null && lastEnd != null && lastEnd >= firstStart ? Math.max(0, lastEnd - firstStart) : 0

  const totalDurationMs = clip > 0 ? clip : speakingDurationMs > 0 ? speakingDurationMs : 0
  const silenceDurationMs =
    clip > 0 && speakingDurationMs > 0 && clip > speakingDurationMs ? Math.round(clip - speakingDurationMs) : null

  const pauseCount = gaps.length
  const gapMs = gaps.map((g) => g.pauseMs)
  const longestPauseMs = gapMs.length ? Math.round(Math.max(...gapMs)) : 0
  const avgPauseMs = pauseCount > 0 ? Math.round(gapMs.reduce((s, x) => s + x, 0) / pauseCount) : 0

  const wcTranscript = input.transcript.trim().split(/\s+/).filter(Boolean).length
  const wordsSpokenCount = Math.max(words.length, wcTranscript)

  const minutes = speakingDurationMs > 0 ? speakingDurationMs / 60000 : totalDurationMs > 0 ? totalDurationMs / 60000 : 0
  const estimatedWpm = minutes > 0 ? Math.round(wordsSpokenCount / minutes) : 0

  const durations = words.map(wordDurMs).filter((d) => d > 0)
  const medDur = median(durations)
  const lastDur = words.length ? wordDurMs(words[words.length - 1]) : 0
  const prevDur = words.length >= 2 ? wordDurMs(words[words.length - 2]) : 0

  const rushedWordPair =
    words.length >= 2 &&
    lastDur > 0 &&
    prevDur > 0 &&
    lastDur < prevDur * T.rushedWordDurationRatio

  let rushedFinalDensity = false
  if (words.length >= T.rushedEndingMinTimedWords && totalDurationMs > 400 && lastEnd != null) {
    const windowStart = totalDurationMs * (1 - T.rushedFinalWindowRatio)
    let inFinal = 0
    let before = 0
    for (const w of words) {
      const s = w.startMs
      if (s == null) continue
      if (s >= windowStart) inFinal += 1
      else before += 1
    }
    if (before > 0 && inFinal > 0) {
      const ratio = inFinal / (before + inFinal)
      rushedFinalDensity = ratio >= T.rushedFinalWordDensityRatio && inFinal >= 2
    }
  }

  const rushedEnding = rushedWordPair || rushedFinalDensity

  const trailingCompression =
    medDur > 0 && lastDur > 0 && lastDur < medDur * 0.38 && words.length >= 3 && (rushedEnding || estimatedWpm > T.wpmRushed)

  const pauseToWord = wordsSpokenCount > 0 ? pauseCount / wordsSpokenCount : 0
  const gapCv = gapMs.length >= 3 ? coefficientOfVariation(gapMs) : 0
  const unevenPauses = pauseToWord > T.highPauseToWordRatio || gapCv > T.gapCvUneven

  let paceProfile: TimingAnalysis['paceProfile'] = 'steady'
  if (estimatedWpm > T.wpmRushed || rushedEnding) paceProfile = 'rushed'
  else if (estimatedWpm > 0 && estimatedWpm < T.wpmTooSlow && pauseCount <= 2) paceProfile = 'tooSlow'
  else if (unevenPauses) paceProfile = 'uneven'

  const sentenceLevelNotes: string[] = []
  if (words.length >= 2 && gaps.length > 0) {
    const firstGapAfter = gaps[0]?.afterIndex ?? -1
    if (firstGapAfter >= 1 && (gaps[0]?.pauseMs ?? 0) < T.phraseBoundaryPauseMs) {
      sentenceLevelNotes.push('steady opening')
    }
  }
  if (longestPauseMs > T.hesitationPauseMs && gaps.some((g) => g.afterIndex >= Math.max(0, words.length - 4))) {
    sentenceLevelNotes.push('long pause before final phrase')
  }
  if (rushedEnding) sentenceLevelNotes.push('ending rushed')
  if (paceProfile === 'tooSlow') sentenceLevelNotes.push('pace understandable but careful')

  if (words.length >= 6 && lastEnd != null && firstStart != null) {
    const midTime = (firstStart + lastEnd) / 2
    const dFirst: number[] = []
    const dSecond: number[] = []
    for (const w of words) {
      const s = w.startMs
      const d = wordDurMs(w)
      if (s == null || d <= 0) continue
      if (s < midTime) dFirst.push(d)
      else dSecond.push(d)
    }
    if (dFirst.length >= 2 && dSecond.length >= 2 && mean(dSecond) < mean(dFirst) * 0.88) {
      sentenceLevelNotes.push('second half speeds up')
    }
  }

  const paceNotes: string[] = [...sentenceLevelNotes]
  if (pauseCount >= 4 && paceProfile !== 'rushed') {
    paceNotes.push('Several pauses between words — link chunks without losing clarity.')
  }
  if (estimatedWpm > T.wpmRushed) {
    paceNotes.push('Estimated speaking rate is on the fast side for short practice clips.')
  }

  return {
    totalDurationMs: Math.round(totalDurationMs),
    speakingDurationMs: Math.round(speakingDurationMs),
    silenceDurationMs: silenceDurationMs != null ? Math.round(silenceDurationMs) : null,
    pauseCount,
    avgPauseMs,
    longestPauseMs,
    wordsSpokenCount,
    estimatedWpm,
    phraseBoundaryCandidates: phraseBoundaryCandidates.slice(0, 16),
    rushedEnding,
    trailingCompression,
    hesitationMoments: hesitationMoments.slice(0, 12),
    paceProfile,
    paceNotes: paceNotes.slice(0, 12),
    sentenceLevelNotes: sentenceLevelNotes.slice(0, 8),
  }
}
