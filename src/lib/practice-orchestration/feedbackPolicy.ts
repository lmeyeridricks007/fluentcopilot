import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import type {
  PracticeTurnFeedbackSignals,
  RecoveryKind,
  TurnFeedbackTier,
} from '@/lib/practice-orchestration/types'

export function buildTurnFeedbackSignals(input: {
  mode: PracticeConversationMode
  tier: TurnFeedbackTier
  recovery: RecoveryKind
  userMessage: string
  coachEn?: string
}): PracticeTurnFeedbackSignals {
  const resolvedTier: TurnFeedbackTier =
    input.recovery !== 'none'
      ? 'recovery'
      : input.mode === 'free' && input.tier !== 'recovery'
        ? 'none'
        : input.tier

  const mistakeSignal =
    input.recovery === 'english_input'
      ? { tag: 'code_switch_en', note: 'Learner used English; nudge to Dutch.' }
      : input.recovery === 'dont_know'
        ? { tag: 'freeze_phrase', note: 'Offered model phrase scaffold.' }
        : undefined

  return {
    tier: resolvedTier,
    recovery: input.recovery,
    mistakeSignal,
    learnerCoachEn: input.coachEn,
    reviewLemmaHints: [],
  }
}
