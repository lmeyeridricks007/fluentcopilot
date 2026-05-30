/**
 * Map exam signals → weak-tag strings for `recordWeakSelfCheckTags`.
 */
import type { ExamLearningSignal } from '@/lib/exam-learning-loop/types'

export function examSignalsToWeakTags(signals: ExamLearningSignal[]): string[] {
  const set = new Set<string>()
  for (const s of signals) {
    const t = s.weakTag.trim()
    if (t) set.add(t)
    for (const x of s.extraWeakTags ?? []) {
      const u = x.trim()
      if (u) set.add(u)
    }
  }
  return [...set]
}
