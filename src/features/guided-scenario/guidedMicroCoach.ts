import type { GuidedChatMessage } from '@/lib/practice/guided/guidedSessionState'

/** Short, selective coaching line after the learner sends a turn — guided mode only. */
export function microCoachLineAfterUserTurn(lastUser: GuidedChatMessage | undefined): string | null {
  if (!lastUser || lastUser.role !== 'user') return null
  if (lastUser.source === 'custom') {
    if (lastUser.branchQuality === 'weak') return 'Good effort — we’ll tighten phrasing when you wrap up.'
    return 'Nice — you pushed with your own Dutch.'
  }
  if (lastUser.source === 'suggestion') {
    if (lastUser.branchQuality === 'strong') return 'Strong line — that lands naturally here.'
    if (lastUser.branchQuality === 'weak') return 'Understandable — a small tune-up later will lock it in.'
    if (lastUser.branchQuality === 'ok') return 'Solid — you’re staying in the scene.'
  }
  return null
}
