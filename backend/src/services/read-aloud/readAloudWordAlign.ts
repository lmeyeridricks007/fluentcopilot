import { tokenizeWords } from './readAloudTextUtils'

export type WordDiffOp =
  | { kind: 'match'; target: string; spoken: string }
  | { kind: 'substitute'; target: string; spoken: string }
  | { kind: 'insert'; spoken: string }
  | { kind: 'delete'; target: string }

/**
 * Word-level diff using Levenshtein on token arrays with backtracking.
 */
export function diffWords(targetRaw: string, spokenRaw: string): { ops: WordDiffOp[]; accuracy01: number } {
  const a = tokenizeWords(targetRaw)
  const b = tokenizeWords(spokenRaw)
  if (a.length === 0 && b.length === 0) return { ops: [], accuracy01: 1 }
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = 0; i <= n; i++) dp[i]![0] = i
  for (let j = 0; j <= m; j++) dp[0]![j] = j
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      )
    }
  }
  const ops: WordDiffOp[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push({ kind: 'match', target: a[i - 1]!, spoken: b[j - 1]! })
      i--
      j--
      continue
    }
    if (i > 0 && j > 0) {
      const sub = dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)
      const del = dp[i - 1]![j]! + 1
      const ins = dp[i]![j - 1]! + 1
      if (sub <= del && sub <= ins) {
        if (a[i - 1] !== b[j - 1]) {
          ops.push({ kind: 'substitute', target: a[i - 1]!, spoken: b[j - 1]! })
        }
        i--
        j--
        continue
      }
    }
    if (j > 0 && (i === 0 || dp[i]![j - 1]! <= dp[i - 1]![j]!)) {
      ops.push({ kind: 'insert', spoken: b[j - 1]! })
      j--
      continue
    }
    if (i > 0) {
      ops.push({ kind: 'delete', target: a[i - 1]! })
      i--
      continue
    }
    break
  }
  ops.reverse()
  const matches = ops.filter((o) => o.kind === 'match').length
  const accuracy01 = Math.max(0, Math.min(1, (2 * matches) / Math.max(1, n + m)))
  return { ops, accuracy01 }
}

export function readingAccuracyScore01(targetRaw: string, spokenRaw: string): number {
  const t = targetRaw.trim()
  const s = spokenRaw.trim()
  if (!t && !s) return 1
  if (!t || !s) return 0
  return diffWords(t, s).accuracy01
}
