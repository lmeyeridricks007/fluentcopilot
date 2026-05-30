import type { PostConversationFeedbackInput, SessionPerformanceSignals } from '@/lib/practice-feedback/types'

const MAX = 3

export function extractImprovements(
  signals: SessionPerformanceSignals,
  input: PostConversationFeedbackInput,
  hasGrammarOrOrderNotes: boolean
): string[] {
  const out: string[] = []
  const guided = input.guidedOverlay?.improveBullets ?? []

  if (guided.length > 0) {
    out.push(guided[0]!)
  }

  if (signals.userTurnCount < 4 && signals.mode !== 'guided') {
    out.push('Try one or two more exchanges before wrapping up — short turns are fine.')
  }
  if (!signals.hasQuestion && input.mode === 'free') {
    out.push('When you’re unsure, add one short follow-up question.')
  }
  if (signals.avgUserTurnLength < 22 && signals.userTurnCount > 0) {
    out.push('Add a tiny bit more detail so the other person can help you faster.')
  }
  if (signals.missedKeyPhrases.length >= 2) {
    out.push('Work in one scenario phrase per session — listen, then echo a chunk.')
  }
  if (signals.weakBranchCount >= 1 && input.mode === 'guided') {
    out.push('Try the suggested wording once, then adapt it with your own detail.')
  }
  if (signals.supportHeavy) {
    out.push('Next time, attempt one reply without support — even a rough line counts.')
  }
  if (!hasGrammarOrOrderNotes && out.length < 2) {
    out.push('Record yourself once: smooth beats perfect at A2.')
  }

  const dedup = [...new Set(out)]
  for (let i = 1; i < guided.length && dedup.length < MAX; i++) {
    const g = guided[i]!
    if (!dedup.includes(g)) dedup.push(g)
  }

  return dedup.slice(0, MAX)
}
