import type { NormalizedPronunciationAssessment } from '../speech/pronunciationAssessmentContracts'
import { normalizeForCompare, tokenizeWords } from './readAloudTextUtils'

function wordKey(w: string): string {
  return normalizeForCompare(w).replace(/\s+/g, ' ').trim()
}

const PAD_BEFORE_SEC = 0.14
const PAD_AFTER_SEC = 0.22

/** Map each reference token index to a sentence index when token counts match the split passage. */
function sentenceIndexPerRefToken(sentencesTarget: string[]): number[] {
  const out: number[] = []
  for (let si = 0; si < sentencesTarget.length; si++) {
    const n = tokenizeWords(sentencesTarget[si]!).length
    for (let k = 0; k < n; k++) out.push(si)
  }
  return out
}

/** When reference length does not match split token count, map by proportional weight. */
function sentenceIndexForRefTokenProportional(refTokIdx: number, refLen: number, counts: number[]): number {
  if (refLen <= 0) return 0
  const total = counts.reduce((a, b) => a + b, 0)
  const pos = ((refTokIdx + 0.5) / refLen) * total
  let c = 0
  for (let si = 0; si < counts.length; si++) {
    c += counts[si]!
    if (pos < c) return si
  }
  return Math.max(0, counts.length - 1)
}

/**
 * Map each `pa.words` entry to the passage sentence it belongs to by walking **reference text**
 * (what Azure scored against). This stays stable when the STT sentence slice is wrong.
 */
function clipBoundsFromReferenceAlignment(
  sentencesTarget: string[],
  pa: NormalizedPronunciationAssessment
): Array<{ startSec: number; endSec: number } | null> {
  const words = pa.words
  const nSents = sentencesTarget.length
  if (!words.length || nSents === 0) return sentencesTarget.map(() => null)

  const refToks = tokenizeWords(pa.referenceTextUsed)
  const refLen = refToks.length
  if (refLen === 0) return sentencesTarget.map(() => null)

  const counts = sentencesTarget.map((s) => Math.max(1, tokenizeWords(s).length))
  const perTokSentence = sentenceIndexPerRefToken(sentencesTarget)
  const usePerTok =
    perTokSentence.length === refLen &&
    perTokSentence.length > 0

  const sentenceForRefIdx = (idx: number): number =>
    usePerTok ? perTokSentence[Math.min(Math.max(0, idx), perTokSentence.length - 1)]! : sentenceIndexForRefTokenProportional(idx, refLen, counts)

  const agg: Array<{ starts: number[]; ends: number[] }> = Array.from({ length: nSents }, () => ({
    starts: [],
    ends: [],
  }))

  let ri = 0
  for (const pw of words) {
    const pk = wordKey(pw.word)
    if (!pk) continue

    let found = -1
    for (let r = ri; r < Math.min(refLen, ri + 48); r++) {
      if (wordKey(refToks[r]!) === pk) {
        found = r
        break
      }
    }

    if (found < 0) continue
    const si = sentenceForRefIdx(found)
    if (pw.startMs != null) agg[si]!.starts.push(pw.startMs)
    if (pw.endMs != null) agg[si]!.ends.push(pw.endMs)
    ri = found + 1
  }

  return agg.map((b) => {
    if (!b.starts.length || !b.ends.length) return null
    const firstMs = Math.min(...b.starts)
    const lastMs = Math.max(...b.ends)
    if (!(lastMs > firstMs)) return null
    return {
      startSec: Math.max(0, firstMs / 1000 - PAD_BEFORE_SEC),
      endSec: lastMs / 1000 + PAD_AFTER_SEC,
    }
  })
}

/**
 * Legacy path: walk spoken sentence tokens against `pa.words` in time order.
 * Kept as fallback when reference alignment yields a gap.
 */
function clipBoundsFromSpokenParts(
  spokenParts: string[],
  pa: NormalizedPronunciationAssessment
): Array<{ startSec: number; endSec: number } | null> {
  const words = pa.words
  if (!words.length) return spokenParts.map(() => null)

  const out: Array<{ startSec: number; endSec: number } | null> = []
  let wi = 0

  for (const part of spokenParts) {
    const stoks = tokenizeWords(part)
    if (stoks.length === 0) {
      out.push(null)
      continue
    }

    let firstMs: number | undefined
    let lastMs: number | undefined
    let matched = 0
    let localWi = wi

    for (const tok of stoks) {
      const tk = wordKey(tok)
      if (!tk) continue
      let foundIdx = -1
      const limit = Math.min(words.length, localWi + 96)
      for (let j = localWi; j < limit; j++) {
        const w = words[j]!
        const wk = wordKey(w.word)
        if (wk === tk) {
          foundIdx = j
          break
        }
      }
      if (foundIdx < 0) break
      const w = words[foundIdx]!
      if (w.startMs != null && firstMs == null) firstMs = w.startMs
      if (w.endMs != null) lastMs = w.endMs
      localWi = foundIdx + 1
      matched++
    }

    const need = Math.max(1, Math.ceil(stoks.length * 0.28))
    if (firstMs == null || lastMs == null || matched < need) {
      if (matched > 0) wi = localWi
      out.push(null)
      continue
    }

    wi = localWi
    out.push({
      startSec: Math.max(0, firstMs / 1000 - PAD_BEFORE_SEC),
      endSec: lastMs / 1000 + PAD_AFTER_SEC,
    })
  }

  return out
}

/** Last resort: split the scored audio span by relative sentence length so the UI never plays the whole clip for every line. */
function proportionalClipBoundsFromWordSpan(
  sentencesTarget: string[],
  pa: NormalizedPronunciationAssessment
): Array<{ startSec: number; endSec: number } | null> {
  const timed = pa.words.filter((w) => w.startMs != null && w.endMs != null)
  if (!timed.length) return sentencesTarget.map(() => null)
  const t0Ms = Math.min(...timed.map((w) => w.startMs!))
  const t1Ms = Math.max(...timed.map((w) => w.endMs!))
  if (!(t1Ms > t0Ms + 80)) return sentencesTarget.map(() => null)

  const counts = sentencesTarget.map((s) => Math.max(1, tokenizeWords(s).length))
  const total = counts.reduce((a, b) => a + b, 0)
  const durSec = (t1Ms - t0Ms) / 1000

  let acc = 0
  return counts.map((c) => {
    const startFrac = acc / total
    acc += c
    const endFrac = acc / total
    const startSec = Math.max(0, t0Ms / 1000 + durSec * startFrac - 0.1)
    const endSec = Math.min(t1Ms / 1000 + 0.12, t0Ms / 1000 + durSec * endFrac + 0.12)
    if (!(endSec > startSec + 0.08)) return null
    return { startSec, endSec }
  })
}

function mergeClip(
  a: { startSec: number; endSec: number } | null,
  b: { startSec: number; endSec: number } | null
): { startSec: number; endSec: number } | null {
  const pick = (x: { startSec: number; endSec: number } | null) =>
    x && Number.isFinite(x.startSec) && Number.isFinite(x.endSec) && x.endSec > x.startSec + 0.1 ? x : null
  return pick(a) ?? pick(b)
}

/**
 * Map each sentence to an approximate time window in the learner clip.
 * Prefer alignment to **reference text** + Azure word timings; fall back to spoken-slice matching,
 * then proportional division of the timed span.
 */
export function computeSentenceClipBoundsSec(
  sentencesTarget: string[],
  spokenParts: string[],
  pa: NormalizedPronunciationAssessment | null
): Array<{ startSec: number; endSec: number } | null> {
  if (!sentencesTarget.length) return []
  if (!pa?.words?.length) return sentencesTarget.map(() => null)

  const fromRef = clipBoundsFromReferenceAlignment(sentencesTarget, pa)
  const fromSpoken = clipBoundsFromSpokenParts(spokenParts, pa)
  const fromProp = proportionalClipBoundsFromWordSpan(sentencesTarget, pa)

  return sentencesTarget.map((_, i) =>
    mergeClip(mergeClip(fromRef[i] ?? null, fromSpoken[i] ?? null), fromProp[i] ?? null)
  )
}
