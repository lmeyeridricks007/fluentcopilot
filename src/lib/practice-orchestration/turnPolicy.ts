import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import type { PracticeMessageTurn, TurnFeedbackTier } from '@/lib/practice-orchestration/types'

function norm(s: string): string {
  return s.trim().toLowerCase()
}

/**
 * How strongly we surface corrections / coaching (before recovery overrides).
 */
export function selectTurnFeedbackTier(input: {
  mode: PracticeConversationMode
  userMessage: string
  priorUserTurns: number
  messageHistory: PracticeMessageTurn[]
}): TurnFeedbackTier {
  const u = norm(input.userMessage)
  if (u.length < 2) return 'recovery'

  const recentUser = input.messageHistory.filter((m) => m.role === 'user').slice(-3)
  const veryShortStreak = recentUser.filter((m) => m.content.trim().length < 8).length >= 2
  if (veryShortStreak) return 'supportive'

  if (input.mode === 'guided') {
    return input.priorUserTurns < 2 ? 'supportive' : 'light'
  }
  if (input.mode === 'semi_guided') {
    if (u.length < 10) return 'light'
    return 'none'
  }
  /* free */
  return 'none'
}

export function inferTurnObjective(scenarioGoal: string | undefined, priorUserTurns: number): string {
  const g = scenarioGoal?.trim() || 'Move the realistic conversation forward one step.'
  if (priorUserTurns === 0) {
    return `Welcome the learner in character and ask the first natural question toward: ${g}`
  }
  return `Respond in character with a short next step toward: ${g}`
}
