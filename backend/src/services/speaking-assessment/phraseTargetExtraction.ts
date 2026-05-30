import type { PhraseTarget, TimingAnalysis, WordAssessment } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import { SPEAKING_DERIVED_THRESHOLDS as T } from '../../domain/speaking-assessment/speakingDerivedHeuristicsConfig'

/** Common English insertions in otherwise Dutch learner clips (heuristic only). */
const ENGLISH_LEANING_TOKENS =
  /\b(the|a|an|sorry|please|thanks|thank you|hello|hi|yes|no|okay|ok|my|your|can i|i want)\b/i

function joinWords(words: WordAssessment[], from: number, to: number): string {
  return words
    .slice(from, to + 1)
    .map((w) => w.text)
    .join(' ')
    .trim()
}

function dedupe(targets: PhraseTarget[]): PhraseTarget[] {
  const seen = new Set<string>()
  const out: PhraseTarget[] = []
  for (const t of targets) {
    const k = t.text.toLowerCase().replace(/\s+/g, ' ')
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

/**
 * Deterministic phrase targets: weak words, pause-bounded chunks, rushed tail,
 * English-leaning cues vs transcript (not phonetic science).
 */
export function extractPhraseTargets(input: {
  wordAssessments: WordAssessment[]
  timing: TimingAnalysis
  expectedText: string
  transcript: string
}): PhraseTarget[] {
  const { wordAssessments: wa, timing, expectedText, transcript } = input
  const targets: PhraseTarget[] = []

  for (const w of wa.filter((x) => x.isWeak)) {
    targets.push({
      text: w.text,
      reason: 'Lower word-level confidence from the audio assessment.',
      priority: 'high',
    })
  }

  for (const b of timing.phraseBoundaryCandidates) {
    const i = b.afterWordIndex
    if (i >= 0 && i < wa.length - 1) {
      const chunk = joinWords(wa, Math.max(0, i - 1), Math.min(wa.length - 1, i + 2))
      if (chunk.length > 2) {
        targets.push({
          text: chunk,
          reason: `Notable pause (${Math.round(b.pauseMs)} ms) — phrase boundary may feel abrupt.`,
          priority: b.pauseMs > T.hesitationPauseMs ? 'high' : 'medium',
        })
      }
    }
  }

  if (timing.rushedEnding && wa.length >= 2) {
    const tail = joinWords(wa, Math.max(0, wa.length - 4), wa.length - 1)
    if (tail.length > 2) {
      targets.push({
        text: tail,
        reason: 'ending rushed',
        priority: 'high',
      })
    }
  }

  if (ENGLISH_LEANING_TOKENS.test(transcript) && expectedText.length > 0 && !ENGLISH_LEANING_TOKENS.test(expectedText)) {
    const m = transcript.match(ENGLISH_LEANING_TOKENS)
    if (m?.[0]) {
      targets.push({
        text: m[0],
        reason: 'Possible English-leaning insertion vs expected Dutch line (text heuristic only).',
        priority: 'medium',
      })
    }
  }

  return dedupe(targets).slice(0, 10)
}
