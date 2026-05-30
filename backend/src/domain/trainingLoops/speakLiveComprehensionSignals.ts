import type { LiveSessionEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'

/** When true, scenario / coach sessions may also emit short listening follow-up loops. */
export function speakLiveComprehensionWeakForListeningLoops(evaluation: LiveSessionEvaluation | null): boolean {
  if (!evaluation) return false
  const dims = evaluation.overall?.dimensions ?? []
  for (const d of dims) {
    const lab = (d.label ?? '').toLowerCase()
    if (!/comprehen|listen|understand|catch|follow|detail|instruction/i.test(lab)) continue
    if (typeof d.score === 'number' && d.score < 58) return true
  }
  const kt = (evaluation.keyTakeaway?.message ?? '').toLowerCase()
  if (/missed|misheard|didn|hard to follow|listening|catch what/i.test(kt)) return true
  const fa = (evaluation.focusArea?.label ?? '').toLowerCase()
  if (/listen|follow|catch|understand|comprehen/i.test(fa)) return true
  const coach = evaluation.languageCoachDebrief
  if (coach?.weakPatterns?.some((p) => /listen|hear|catch|follow|detail/i.test(p))) return true
  return false
}
