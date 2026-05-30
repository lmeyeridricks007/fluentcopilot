/**
 * Grounds Azure word-level assessments to transcript + reference so STT hallucinations
 * (e.g. nonsense tokens) are not quoted in “Listen for…” / drill copy.
 */
import type { NormalizedWordAssessment } from '../speech/pronunciationAssessmentContracts'
import type { WrongWordDetection } from './liveVoiceEvaluationTypes'

function stripWordSurface(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^[«»""'„‚'`]+|[«»""'„‚'`.,?!;:…]+$/g, '')
    .trim()
}

function normalizeBlob(s: string): string {
  return s
    .toLowerCase()
    .replace(/[«»""'„‚'`.,?!;:…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function roughTokens(s: string): string[] {
  return normalizeBlob(s)
    .split(' ')
    .map((t) => stripWordSurface(t))
    .filter((t) => t.length >= 2)
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  const dp = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) dp[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost)
      prev = tmp
    }
  }
  return dp[n]!
}

function bestRefDistance(word: string, referenceSentence: string): number {
  const w = stripWordSurface(word)
  if (!w || w.length < 3) return 0
  const refToks = roughTokens(referenceSentence)
  if (!refToks.length) return 0
  return Math.min(...refToks.map((t) => (t.length >= 3 ? levenshtein(t, w) : 99)))
}

/**
 * Safe to surface in pronunciation coaching (listen / drill): appears tied to the scene Dutch,
 * not a lone ASR fragment unrelated to the reference line.
 */
export function isSafePronunciationCoachToken(
  wordRaw: string,
  learnerTranscript: string,
  referenceSentence: string,
  wrongWords: WrongWordDetection[],
  pronunciationIssueWords: string[],
): boolean {
  const w = stripWordSurface(wordRaw)
  if (!w || w.length < 2) return false
  const refPool = normalizeBlob(referenceSentence)
  const learnPool = normalizeBlob(learnerTranscript)
  // Trust tokens that appear in the **reference** Dutch line (coach target), not merely in STT transcript.
  if (refPool.includes(w)) return true

  const learnToks = roughTokens(learnerTranscript)
  const refToks = roughTokens(referenceSentence)
  // Only align to **reference** Dutch (plus explicit bridges below). Never “approve” a token
  // solely because the same garbage appears in the STT transcript.
  for (const t of refToks) {
    if (t === w) return true
    if (t.length >= 4 && w.length >= 4) {
      const maxEd = Math.min(2, 1 + Math.floor(Math.min(t.length, w.length) / 5))
      if (levenshtein(t, w) <= maxEd) return true
    }
  }

  for (const ww of wrongWords) {
    if (stripWordSurface(ww.observedToken) === w || stripWordSurface(ww.suggestedCorrection) === w) return true
  }
  for (const p of pronunciationIssueWords) {
    if (stripWordSurface(p) === w) return true
  }

  const tiny = new Set([
    'de',
    'het',
    'een',
    'ik',
    'je',
    'u',
    'me',
    'mij',
    'mijn',
    'niet',
    'en',
    'van',
    'naar',
    'op',
    'aan',
    'is',
    'was',
    'dat',
    'die',
    'dit',
    'er',
    'maar',
    'ook',
    'al',
    'te',
    'zo',
  ])
  if (tiny.has(w)) return true

  // Appears in learner transcript but nowhere close to reference Dutch → likely STT garbage for this beat.
  if ((learnToks.includes(w) || learnPool.includes(w)) && refToks.length > 0) {
    const bridged =
      wrongWords.some((ww) => stripWordSurface(ww.observedToken) === w) ||
      pronunciationIssueWords.some((p) => stripWordSurface(p) === w)
    if (!bridged && bestRefDistance(w, referenceSentence) > 2) return false
  }

  return false
}

export function filterAssessmentsForPronunciationCopy(
  words: NormalizedWordAssessment[],
  learnerTranscript: string,
  referenceSentence: string,
  wrongWords: WrongWordDetection[],
  pronunciationIssueWords: string[],
): NormalizedWordAssessment[] {
  return words.filter((row) =>
    isSafePronunciationCoachToken(
      row.word?.trim() ?? '',
      learnerTranscript,
      referenceSentence,
      wrongWords,
      pronunciationIssueWords,
    ),
  )
}
