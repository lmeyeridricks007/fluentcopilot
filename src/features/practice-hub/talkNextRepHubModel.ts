import type { ContinueConversationResponse, TalkTrainingLoopCard } from '@/lib/api/apiTypes'

export type LearningFocus = NonNullable<ContinueConversationResponse['learningFocus']>
export type DirectedRec = NonNullable<LearningFocus['recommendations']>[number]

/** Same ordering as Talk hub “Suggested next” (Speak Live scenario first). */
export function pickDirectedNextRec(focus: LearningFocus): DirectedRec | null {
  const r = focus.recommendations ?? []
  return (
    r.find((x) => x.type === 'speak_live_scenario') ||
    r.find((x) => x.type === 'read_aloud_profile') ||
    r.find((x) => x.type === 'free_talk_theme') ||
    r.find((x) => x.type === 'report_next_step') ||
    null
  )
}

export function selectPrimaryRepLoop(
  activeTrainingLoops: TalkTrainingLoopCard[],
  nextTrainingLoop: TalkTrainingLoopCard | null | undefined,
): TalkTrainingLoopCard | null {
  const slot0 = activeTrainingLoops.find((l) => (l.loopSlot ?? 0) === 0)
  if (slot0) return slot0
  return nextTrainingLoop ?? null
}

export function selectFallbackDirectedRec(args: {
  useBackend: boolean
  primaryRepLoop: TalkTrainingLoopCard | null
  learningFocus: ContinueConversationResponse['learningFocus'] | null | undefined
}): DirectedRec | null {
  if (!args.useBackend || args.primaryRepLoop) return null
  const lf = args.learningFocus
  if (!lf || lf.coldStart) return null
  return pickDirectedNextRec(lf)
}

export function computeHubNextRepReady(args: {
  useBackend: boolean
  continueSuccess: boolean
  primaryRepLoop: TalkTrainingLoopCard | null
  fallbackDirectedRec: DirectedRec | null
}): boolean {
  if (!args.useBackend || !args.continueSuccess) return false
  if (args.primaryRepLoop) return true
  if (
    args.fallbackDirectedRec &&
    (args.fallbackDirectedRec.title?.trim() || args.fallbackDirectedRec.subtitle?.trim())
  )
    return true
  return false
}

export function suppressStripDirectedNext(
  primaryRepLoop: TalkTrainingLoopCard | null,
  fallbackDirectedRec: DirectedRec | null,
): boolean {
  return Boolean(primaryRepLoop || fallbackDirectedRec)
}
