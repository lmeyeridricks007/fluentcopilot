import { ensureCatalogScenariosRegistered } from '@/lib/practice/conversation/ensureCatalogScenarios'
import { buildPostConversationFeedback } from '@/lib/practice-feedback/feedbackBuilder'
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import { getScenario } from '@/ai-conversation-engine/config/scenarios'

export type SessionOutcome = 'success' | 'partial' | 'needs_practice'

/** @deprecated Prefer `buildPostConversationFeedback` + `PracticeFeedbackScreen` */
export interface PracticeSessionEvaluationVm {
  outcome: SessionOutcome
  goalHeadline: string
  wentWell: string[]
  improve: string[]
  betterPhrases: { nl: string; en?: string }[]
  confidenceNote: string
  nextHref: string
  nextLabel: string
}

/**
 * Legacy VM for older call sites — delegates to the post-conversation feedback engine.
 */
export function buildPracticeSessionEvaluation(input: {
  mode: PracticeConversationMode
  scenarioId: string
  messages: { role: 'user' | 'assistant'; content: string }[]
}): PracticeSessionEvaluationVm {
  ensureCatalogScenariosRegistered()
  const ctx = getScenario(input.scenarioId)
  const { presenter } = buildPostConversationFeedback({
    mode: input.mode,
    scenarioId: input.scenarioId,
    scenarioGoal: ctx?.goal,
    messages: input.messages,
    keyPhrases: ctx?.key_phrases ?? [],
    entitlementTier: 'premium',
  })
  const primary = presenter.ctas.find((c) => c.variant === 'primary')
  return {
    outcome: presenter.outcome,
    goalHeadline: presenter.headline,
    wentWell: presenter.strengths,
    improve: presenter.improvements,
    betterPhrases:
      presenter.vocabSuggestions.length > 0
        ? presenter.vocabSuggestions.map((v) => ({ nl: v.nl, en: v.en }))
        : presenter.phrasingUpgrades.map((p) => ({ nl: p.betterNl, en: p.why })),
    confidenceNote: presenter.confidenceLabel,
    nextHref: primary?.href ?? `/app/practice/scenario/${input.scenarioId}`,
    nextLabel: primary?.label ?? 'Continue',
  }
}
