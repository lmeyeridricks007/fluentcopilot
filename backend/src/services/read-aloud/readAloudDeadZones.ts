import type { TimedSttWord } from './readAloudOpenAiSttWords'
import type { SentenceWordSpan } from './readAloudSentenceAlignLlm'

const MIN_GAP_SEC = 0.22
const SHORT_PAUSE_SEC = 0.9
const LONG_PAUSE_SEC = 1.8

export type ReadAloudDeadZoneKind = 'edge_silence' | 'transition_pause' | 'long_unmatched'

export type ReadAloudDeadZone = {
  startSec: number
  endSec: number
  kind: ReadAloudDeadZoneKind
  impactWeight: number
  label: string
}

/**
 * Intervals of the learner clip that are not covered by any sentence span (stutters, repeats, silence).
 */
export function computeDeadZones(input: {
  totalSec: number
  words: TimedSttWord[]
  sentenceSpans: SentenceWordSpan[]
  spanStartSec?: number
  spanEndSec?: number
}): ReadAloudDeadZone[] {
  const { words, sentenceSpans, totalSec } = input
  const spanStartSec = Number.isFinite(input.spanStartSec) ? Math.max(0, input.spanStartSec as number) : 0
  const end = Number.isFinite(input.spanEndSec)
    ? Math.max(spanStartSec, input.spanEndSec as number)
    : Number.isFinite(totalSec) && totalSec > 0
      ? totalSec
      : words.length
        ? words[words.length - 1]!.endSec + 0.05
        : 0
  if (!(end > MIN_GAP_SEC)) return []

  const classifyGap = (startSec: number, endSec: number): ReadAloudDeadZone => {
    const durationSec = Math.max(0, endSec - startSec)
    const nearLeadingEdge = startSec - spanStartSec <= 0.3
    const nearTrailingEdge = end - endSec <= 0.3
    const nearEdge = nearLeadingEdge || nearTrailingEdge

    if (nearEdge) {
      return {
        startSec,
        endSec,
        kind: 'edge_silence',
        impactWeight: durationSec <= 1.2 ? 0.12 : 0.24,
        label: 'Possible silence or setup around the reading span',
      }
    }
    if (durationSec <= SHORT_PAUSE_SEC) {
      return {
        startSec,
        endSec,
        kind: 'transition_pause',
        impactWeight: 0.18,
        label: 'Short pause or sentence transition',
      }
    }
    if (durationSec <= LONG_PAUSE_SEC) {
      return {
        startSec,
        endSec,
        kind: 'transition_pause',
        impactWeight: 0.38,
        label: 'Longer pause, retry, or sentence transition',
      }
    }
    return {
      startSec,
      endSec,
      kind: 'long_unmatched',
      impactWeight: 0.72,
      label: 'Longer unmatched region, retry, or off-passage speech',
    }
  }

  const intervals: { a: number; b: number }[] = []
  for (const sp of sentenceSpans) {
    const ws = words[sp.startIdx]
    const we = words[sp.endIdx]
    if (!ws || !we) continue
    const a = Math.max(spanStartSec, ws.startSec - 0.05)
    const b = Math.min(end, we.endSec + 0.08)
    if (b > a + 0.04) intervals.push({ a, b })
  }
  if (!intervals.length) return [classifyGap(spanStartSec, end)]

  intervals.sort((x, y) => x.a - y.a)
  const merged: { a: number; b: number }[] = []
  for (const iv of intervals) {
    const last = merged[merged.length - 1]
    if (!last || iv.a > last.b + 0.02) merged.push({ ...iv })
    else last.b = Math.max(last.b, iv.b)
  }

  const dead: ReadAloudDeadZone[] = []
  let cursor = spanStartSec
  for (const m of merged) {
    if (m.a - cursor >= MIN_GAP_SEC) {
      dead.push(classifyGap(cursor, m.a))
    }
    cursor = Math.max(cursor, m.b)
  }
  if (end - cursor >= MIN_GAP_SEC) {
    dead.push(classifyGap(cursor, end))
  }
  return dead
}
