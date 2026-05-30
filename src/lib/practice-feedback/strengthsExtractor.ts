import type { PostConversationFeedbackInput, SessionPerformanceSignals } from '@/lib/practice-feedback/types'

const MAX = 3

/**
 * Grounds strengths in session signals (+ optional guided bullets).
 */
export function extractStrengths(
  signals: SessionPerformanceSignals,
  input: PostConversationFeedbackInput
): string[] {
  const out: string[] = []
  const guided = input.guidedOverlay?.wentWellBullets ?? []

  if (guided.length > 0) {
    out.push(guided[0]!)
  }

  if (signals.userTurnCount >= 3) {
    out.push('You kept the conversation moving with several turns.')
  }
  if (signals.hasPoliteness) {
    out.push('You used polite Dutch chunks naturally.')
  }
  if (signals.usedKeyPhraseCount >= 2) {
    out.push('You reused scenario phrases — that builds real fluency.')
  }
  if (signals.strongBranchCount >= 1 && input.mode === 'guided') {
    out.push('Some replies matched strong, natural branches.')
  }
  if (signals.mode === 'free' && signals.userTurnCount >= 4 && signals.avgUserTurnLength > 25) {
    out.push('You drove the topic with fuller sentences in open mode.')
  }
  if (signals.hasQuestion && input.mode !== 'guided') {
    out.push('You asked at least one question — good for real conversations.')
  }

  const dedup = [...new Set(out)]
  if (dedup.length === 0) {
    dedup.push('You showed up and practiced Dutch in a realistic situation.')
  }

  for (let i = 1; i < guided.length && dedup.length < MAX; i++) {
    const g = guided[i]!
    if (!dedup.includes(g)) dedup.push(g)
  }

  return dedup.slice(0, MAX)
}
