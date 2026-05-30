export type MergeSessionType = 'speak_live' | 'text_conversation' | 'read_aloud' | 'listening' | 'quick_capture'

export const LOW_CONFIDENCE_FOCUS_FLOOR = 0.34
export const RECOVERY_IMPROVING_THRESHOLD = 0.74

/**
 * Ranking weight for persisted weaknesses (used for ordering + active focus).
 * `severity × confidence × log(2+occ) × (1 − 0.38·recovery) × improvingPenalty`
 */
export function effectiveWeaknessItemScore(x: {
  severityScore: number
  confidence: number
  occurrences: number
  recoveryScore?: number
  improving?: boolean
}): number {
  const rec = typeof x.recoveryScore === 'number' && Number.isFinite(x.recoveryScore) ? x.recoveryScore : 0.22
  const improvingPen = x.improving ? 0.78 : 1
  const occ = Math.log(2 + Math.min(48, Math.max(1, x.occurrences)))
  return x.severityScore * x.confidence * occ * (1 - 0.38 * Math.min(0.95, rec)) * improvingPen
}

export function incomingConfidenceMultiplier(signalSource: string | null | undefined, sessionType: MergeSessionType): number {
  const src = (signalSource ?? '').toLowerCase()
  if (sessionType === 'speak_live') {
    if (/word_assessment|azure|audio|live_word_assessment|live_azure|live_turn_pronunciation/.test(src)) return 1
    if (/wrong_word|uncertain|transcript_only/.test(src)) return 0.62
    if (/transcript|feedback|debrief|sentence|focus/.test(src)) return 0.88
    return 0.82
  }
  if (sessionType === 'read_aloud') {
    if (/pronunciation|segment_pronunciation|weak_word/.test(src)) return 0.94
    if (/dimension_gap|coaching_line/.test(src)) return 0.86
    return 0.8
  }
  if (sessionType === 'listening') {
    if (/listening_attempt|listening_clip/i.test(src)) return 0.9
    return 0.84
  }
  if (sessionType === 'quick_capture') {
    if (/quick_capture_vocab/i.test(src)) return 0.58
    if (/quick_capture_practice|real-life/i.test(src)) return 0.74
    return 0.66
  }
  if (/corrected_phrase|feedback_row|feedback_pattern/.test(src)) return 0.88
  if (/summary_improve|language_notes/.test(src)) return 0.72
  return 0.78
}
