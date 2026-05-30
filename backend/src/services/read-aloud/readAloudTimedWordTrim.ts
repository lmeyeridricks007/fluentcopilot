import { splitSentences, tokenizeWords } from './readAloudTextUtils'
import type { TimedSttWord } from './readAloudOpenAiSttWords'

/** Join timed words into a single string (preserves order). */
export function timedWordsToText(words: TimedSttWord[]): string {
  return words
    .map((w) => w.word.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
}

type FlattenedTimedToken = {
  token: string
  wordIndex: number
}

export type TimedWordWindow = {
  startWordIndex: number
  endWordIndex: number
  source: 'llm_full_passage' | 'full_passage_match' | 'prefix_fallback'
}

function flattenTimedWordTokens(words: TimedSttWord[]): FlattenedTimedToken[] {
  const out: FlattenedTimedToken[] = []
  for (let i = 0; i < words.length; i++) {
    const toks = tokenizeWords(words[i]!.word)
    for (const token of toks) out.push({ token, wordIndex: i })
  }
  return out
}

function findPrefixTrimWindow(words: TimedSttWord[], targetText: string): TimedWordWindow | null {
  const sentences = splitSentences(targetText)
    .map((s) => s.trim())
    .filter(Boolean)
  const first = sentences[0]
  if (!first) return null

  const starters = tokenizeWords(first).filter((w) => w.length >= 1).slice(0, 10)
  if (!starters.length) return null

  const needAligned = starters.length >= 2 ? 2 : 1

  /** Compare rolling window of transcript tokens to starters. */
  for (let i = 0; i < words.length; i++) {
    const sliceToks: string[] = []
    for (let j = i; j < words.length && sliceToks.length < starters.length + 4; j++) {
      sliceToks.push(...tokenizeWords(words[j]!.word))
    }
    let matched = 0
    for (; matched < starters.length && matched < sliceToks.length; matched++) {
      if (sliceToks[matched] !== starters[matched]!) break
    }
    if (matched >= needAligned) {
      return {
        startWordIndex: i,
        endWordIndex: words.length - 1,
        source: 'prefix_fallback',
      }
    }
  }

  return null
}

/**
 * Find the most likely contiguous word window for the full passage anywhere in the recording.
 * This is more robust than only trimming on the first sentence prefix because it can skip
 * long pre-roll speech, retries, or other audio before the learner starts reading.
 */
function findBestPassageWordWindow(
  words: TimedSttWord[],
  targetText: string
): TimedWordWindow | null {
  const targetTokens = tokenizeWords(targetText)
  const heardTokens = flattenTimedWordTokens(words)
  if (!targetTokens.length || !heardTokens.length) return null

  const n = targetTokens.length
  const m = heardTokens.length
  const scores: Float64Array[] = Array.from({ length: n + 1 }, () => new Float64Array(m + 1))
  const dirs: Uint8Array[] = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1))

  let bestScore = 0
  let bestI = 0
  let bestJ = 0

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const match = targetTokens[i - 1] === heardTokens[j - 1]!.token
      const diag = scores[i - 1]![j - 1]! + (match ? 3 : -2)
      const up = scores[i - 1]![j]! - 1
      const left = scores[i]![j - 1]! - 1
      let score = 0
      let dir = 0
      if (diag >= up && diag >= left && diag > 0) {
        score = diag
        dir = 1
      } else if (up >= left && up > 0) {
        score = up
        dir = 2
      } else if (left > 0) {
        score = left
        dir = 3
      }
      scores[i]![j] = score
      dirs[i]![j] = dir
      if (score > bestScore) {
        bestScore = score
        bestI = i
        bestJ = j
      }
    }
  }

  if (bestScore <= 0) return null

  let i = bestI
  let j = bestJ
  let minTokenIdx = Number.POSITIVE_INFINITY
  let maxTokenIdx = -1
  let exactMatches = 0

  while (i > 0 && j > 0 && scores[i]![j]! > 0) {
    const dir = dirs[i]![j]!
    if (dir === 1) {
      const tokenIdx = j - 1
      minTokenIdx = Math.min(minTokenIdx, tokenIdx)
      maxTokenIdx = Math.max(maxTokenIdx, tokenIdx)
      if (targetTokens[i - 1] === heardTokens[tokenIdx]!.token) exactMatches++
      i--
      j--
      continue
    }
    if (dir === 2) {
      i--
      continue
    }
    if (dir === 3) {
      const tokenIdx = j - 1
      minTokenIdx = Math.min(minTokenIdx, tokenIdx)
      maxTokenIdx = Math.max(maxTokenIdx, tokenIdx)
      j--
      continue
    }
    break
  }

  if (!(maxTokenIdx >= 0) || !Number.isFinite(minTokenIdx)) return null

  const minExactMatches = Math.min(targetTokens.length, Math.max(2, Math.ceil(targetTokens.length * 0.12)))
  if (exactMatches < minExactMatches) return null

  const startWordIndex = heardTokens[minTokenIdx]!.wordIndex
  const endWordIndex = heardTokens[maxTokenIdx]!.wordIndex
  if (endWordIndex < startWordIndex) return null

  return { startWordIndex, endWordIndex, source: 'full_passage_match' }
}

/**
 * Select the most likely word-level passage window in the full transcript.
 * Falls back to the older first-sentence prefix trim if no strong full-passage match is found.
 */
export function findPassageTimedWordWindow(words: TimedSttWord[], targetText: string): TimedWordWindow | null {
  if (!words.length) return null
  return findBestPassageWordWindow(words, targetText) ?? findPrefixTrimWindow(words, targetText)
}

/**
 * Select the most likely word-level passage window in the full transcript.
 * Falls back to the older first-sentence prefix trim if no strong full-passage match is found.
 */
export function trimTimedWordsToPassageStart(words: TimedSttWord[], targetText: string): TimedSttWord[] {
  if (!words.length) return words
  const window = findPassageTimedWordWindow(words, targetText)
  if (window) return words.slice(window.startWordIndex, window.endWordIndex + 1)
  return words
}
