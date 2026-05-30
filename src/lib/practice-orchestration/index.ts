/**
 * Practice AI orchestration — prompts, policies, guardrails, turn handling.
 * UI calls `runPracticeConversationTurn`; LLM adapters consume `systemPromptForProvider`.
 */
export * from '@/lib/practice-orchestration/types'
export { runPracticeConversationTurn } from '@/lib/practice-orchestration/conversationOrchestrator'
export { getOrchestratedOpeningLine } from '@/lib/practice-orchestration/openingLine'
export { buildPracticeScenarioPrompt } from '@/lib/practice-orchestration/scenarioPromptBuilder'
export { buildPersonaInstructionBlock } from '@/lib/practice-orchestration/personaInstructionBuilder'
export { getDifficultyConstraints, difficultyToPromptFragment } from '@/lib/practice-orchestration/difficultyPolicy'
export { cefrA2GuardrailPromptBlock, detectComplexityDrift, postProcessForA2 } from '@/lib/practice-orchestration/cefrGuardrails'
export { selectTurnFeedbackTier, inferTurnObjective } from '@/lib/practice-orchestration/turnPolicy'
export { detectRecovery } from '@/lib/practice-orchestration/recoveryPolicy'
export { buildTurnFeedbackSignals } from '@/lib/practice-orchestration/feedbackPolicy'
export { finalizeAssistantResponse, stripAssistantDrift } from '@/lib/practice-orchestration/responsePostProcessor'
export { mockDeterministicAssistantReply } from '@/lib/practice-orchestration/mockDeterministicProvider'
export { getPersonaPresetId } from '@/lib/practice-orchestration/personaPresets'
