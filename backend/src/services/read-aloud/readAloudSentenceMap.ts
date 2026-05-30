import { diffWords, readingAccuracyScore01 } from './readAloudWordAlign'
import { splitSentences, tokenizeWords } from './readAloudTextUtils'

/** Lower is better: how poorly `spokenSegment` covers `targetSentence`. */
function partitionSliceCost(targetSentence: string, spokenSegment: string): number {
  const seg = spokenSegment.trim()
  const t = targetSentence.trim()
  if (!t) return 0
  if (!seg) {
    const tw = tokenizeWords(t).length
    return tw === 0 ? 0 : tw * 0.45
  }
  const { accuracy01 } = diffWords(t, seg)
  return 1 - accuracy01
}

function scorePartition(targetSentences: string[], parts: string[]): number {
  let total = 0
  for (let i = 0; i < targetSentences.length; i++) {
    total += partitionSliceCost(targetSentences[i]!, parts[i] ?? '')
  }
  return total
}

/**
 * Align transcript tokens to the **start of the passage** (same order as the printed text).
 * Do **not** trim at the first token that merely appears somewhere later in the story (e.g. “kijken”).
 */
function trimLeadingSpokenTokensAgainstPassage(R: string[], targetSentences: string[]): string[] {
  const ts = targetSentences.map((s) => s.trim()).filter(Boolean)
  if (R.length === 0 || ts.length === 0) return R
  const joint: string[] = []
  for (const s of ts) joint.push(...tokenizeWords(s))
  if (joint.length === 0) return R

  const maxScan = Math.min(200, R.length)
  for (let i = 0; i < maxScan; i++) {
    if (R[i] === joint[0]) return R.slice(i)
  }
  if (joint.length >= 2) {
    for (let i = 0; i < Math.min(maxScan, R.length - 1); i++) {
      if (R[i] === joint[0] && R[i + 1] === joint[1]) return R.slice(i)
    }
  }

  const prefixLen = Math.min(26, joint.length)
  const prefix = joint.slice(0, prefixLen).join(' ')
  let bestI = 0
  let bestScore = readingAccuracyScore01(prefix, R.slice(0, Math.min(52, R.length)).join(' '))
  const maxI = Math.min(120, R.length)
  for (let i = 1; i <= maxI; i++) {
    const chunk = R.slice(i, i + 52).join(' ')
    const sc = readingAccuracyScore01(prefix, chunk)
    if (sc > bestScore + 0.015) {
      bestScore = sc
      bestI = i
    }
  }
  if (bestI > 0 && bestScore >= 0.26) return R.slice(bestI)
  return R
}

function avgSentenceAccuracy01(targetSentences: string[], parts: string[]): number {
  const ts = targetSentences.map((s) => s.trim()).filter(Boolean)
  if (!ts.length) return 0
  let sum = 0
  for (let i = 0; i < ts.length; i++) {
    sum += readingAccuracyScore01(ts[i]!, parts[i] ?? '')
  }
  return sum / ts.length
}

/**
 * When the global transcript matches the passage but per-sentence buckets are poor, re-cut
 * the token stream left-to-right so each line gets a contiguous slice that best matches its target.
 */
function refineSpokenPartsSequential(
  targetSentences: string[],
  recognizedText: string,
  initial: string[]
): string[] {
  const ts = targetSentences.map((s) => s.trim()).filter(Boolean)
  const R = tokenizeWords(recognizedText)
  if (ts.length <= 1 || R.length === 0) return initial

  const jointTarget = ts.join(' ')
  const globalAcc = readingAccuracyScore01(jointTarget, recognizedText)
  if (globalAcc < 0.42) return initial

  const initialAvg = avgSentenceAccuracy01(ts, initial)
  if (initialAvg >= 0.52) return initial

  const n = ts.length
  let c = 0
  const out: string[] = []

  for (let i = 0; i < n; i++) {
    const tw = tokenizeWords(ts[i]!).length
    const isLast = i === n - 1
    if (isLast) {
      out.push(R.slice(c).join(' ').trim())
      break
    }

    const remainingSents = n - i - 1
    const remainingToks = R.length - c
    const minTail = remainingSents
    const maxLen = Math.max(
      1,
      Math.min(
        Math.max(1, remainingToks - minTail),
        Math.max(tw + 2, Math.ceil(tw * 2) + 12),
        Math.ceil(remainingToks / Math.max(1, remainingSents)) + tw + 10
      )
    )
    const minLen = Math.max(1, Math.min(tw, Math.floor(tw * 0.3) + 1))

    let bestE = Math.min(R.length, c + Math.min(Math.max(minLen, tw + 1), maxLen))
    let bestAcc = -1
    let hi = Math.min(R.length, c + Math.max(minLen, maxLen))
    if (hi < c + minLen) hi = Math.min(R.length, c + minLen)
    for (let e = c + minLen; e <= hi; e++) {
      const seg = R.slice(c, e).join(' ')
      const a = readingAccuracyScore01(ts[i]!, seg)
      if (a > bestAcc + 1e-6) {
        bestAcc = a
        bestE = e
      }
    }

    if (bestE <= c) bestE = Math.min(R.length, c + minLen)
    out.push(R.slice(c, bestE).join(' ').trim())
    c = bestE
  }

  const refinedAvg = avgSentenceAccuracy01(ts, out)
  return refinedAvg > initialAvg + 0.02 ? out : initial
}

/** Exported for read-aloud evaluation so PA + sentence rows use the same trimmed transcript. */
export function trimLeadingTranscriptTokensToPassage(recognizedText: string, targetText: string): string {
  const ts = splitSentences(targetText)
    .map((s) => s.trim())
    .filter(Boolean)
  const R = trimLeadingSpokenTokensAgainstPassage(tokenizeWords(recognizedText), ts)
  return R.join(' ').trim()
}

/**
 * Map each recognized token to the target sentence it aligns with by walking a **global**
 * word diff between the concatenated targets and the full transcript. This avoids the old
 * proportional slice bug (sentence N getting words from a totally different part of the story).
 */
function distributeRecognizedDiffWalk(targetSentences: string[], recognizedText: string): string[] {
  const ts = targetSentences.map((s) => s.trim()).filter(Boolean)
  const spokenWords = tokenizeWords(recognizedText)
  if (spokenWords.length === 0) return ts.map(() => '')
  if (ts.length === 1) return [recognizedText.trim()]

  const targetTokensAll: string[] = []
  const tokenSentenceIdx: number[] = []
  for (let si = 0; si < ts.length; si++) {
    for (const tok of tokenizeWords(ts[si]!)) {
      targetTokensAll.push(tok)
      tokenSentenceIdx.push(si)
    }
  }
  const jointTarget = targetTokensAll.join(' ')
  const { ops } = diffWords(jointTarget, recognizedText)

  const buckets: string[][] = ts.map(() => [])
  let targetTokIdx = 0
  let lastSi = 0
  /** Until we align to the passage, spoken-only inserts must not land on sentence 0 (Whisper prefix junk). */
  let alignedToPassage = false

  const sentenceForTargetTok = (ti: number): number => {
    if (ti >= 0 && ti < tokenSentenceIdx.length) return tokenSentenceIdx[ti]!
    return lastSi
  }

  for (const op of ops) {
    if (op.kind === 'match') {
      alignedToPassage = true
      const si = sentenceForTargetTok(targetTokIdx)
      buckets[si].push(op.spoken)
      lastSi = si
      targetTokIdx++
    } else if (op.kind === 'substitute') {
      alignedToPassage = true
      const si = sentenceForTargetTok(targetTokIdx)
      buckets[si].push(op.spoken)
      lastSi = si
      targetTokIdx++
    } else if (op.kind === 'delete') {
      targetTokIdx++
    } else if (op.kind === 'insert') {
      if (alignedToPassage) {
        buckets[lastSi].push(op.spoken)
      }
    }
  }

  return buckets.map((w) => w.join(' '))
}

/**
 * Optimal contiguous partition of transcript tokens across target sentences (dynamic programming).
 * Use together with the diff-walk mapper: pick whichever yields lower total slice cost.
 */
function partitionRecognizedDp(targetSentences: string[], recognizedText: string): string[] | null {
  const ts = targetSentences.map((s) => s.trim()).filter(Boolean)
  const R = tokenizeWords(recognizedText)
  const m = R.length
  const n = ts.length
  if (n === 0) return []
  if (m === 0) return ts.map(() => '')

  const INF = 1e18
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(INF))
  const back: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(-1))
  dp[0]![0] = 0

  for (let i = 1; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      for (let k = 0; k <= j; k++) {
        if (dp[i - 1]![k]! >= INF) continue
        const seg = R.slice(k, j).join(' ')
        const c = dp[i - 1]![k]! + partitionSliceCost(ts[i - 1]!, seg)
        if (c < dp[i]![j]!) {
          dp[i]![j] = c
          back[i]![j] = k
        }
      }
    }
  }

  if (dp[n]![m]! >= INF) return null

  const raw: string[][] = ts.map(() => [])
  let j = m
  for (let i = n; i >= 1; i--) {
    const k = back[i]![j]!
    if (k < 0) return null
    raw[i - 1] = R.slice(k, j)
    j = k
  }
  if (j !== 0) return null

  return raw.map((w) => w.join(' '))
}

export function distributeRecognizedAcrossSentences(targetSentences: string[], recognizedText: string): string[] {
  const ts = targetSentences.map((s) => s.trim()).filter(Boolean)
  if (ts.length === 0) return []
  const R0 = tokenizeWords(recognizedText)
  if (R0.length === 0) return ts.map(() => '')
  const R = trimLeadingSpokenTokensAgainstPassage(R0, ts)
  const recognizedTrimmed = R.join(' ').trim()
  if (ts.length === 1) return [recognizedTrimmed]

  const diffParts = distributeRecognizedDiffWalk(ts, recognizedTrimmed)
  const dpParts = partitionRecognizedDp(ts, recognizedTrimmed)
  const base = !dpParts
    ? diffParts
    : scorePartition(ts, dpParts) + 1e-9 < scorePartition(ts, diffParts)
      ? dpParts
      : diffParts
  return refineSpokenPartsSequential(ts, recognizedTrimmed, base)
}
