/**
 * Top-level practice conversation orchestrator.
 * Produces provider-ready system text, deterministic mock reply (today), feedback signals, and listening hints.
 */
import { getScenario } from '@/ai-conversation-engine/config/scenarios'
import { ensureCatalogScenariosRegistered } from '@/lib/practice/conversation/ensureCatalogScenarios'
import { buildPracticeScenarioPrompt } from '@/lib/practice-orchestration/scenarioPromptBuilder'
import { selectTurnFeedbackTier, inferTurnObjective } from '@/lib/practice-orchestration/turnPolicy'
import { detectRecovery } from '@/lib/practice-orchestration/recoveryPolicy'
import { buildTurnFeedbackSignals } from '@/lib/practice-orchestration/feedbackPolicy'
import { finalizeAssistantResponse } from '@/lib/practice-orchestration/responsePostProcessor'
import { isClientMockEngineAllowed } from '@/lib/api/apiConfig'
import { mockDeterministicAssistantReply } from '@/lib/practice-orchestration/mockDeterministicProvider'
import type {
  ListeningOutputHints,
  RunPracticeConversationTurnInput,
  RunPracticeConversationTurnOutput,
} from '@/lib/practice-orchestration/types'
import type { A2DifficultyBand } from '@/lib/practice-orchestration/types'

function buildListeningHints(text: string): ListeningOutputHints {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean)
  return {
    suitableForTts: text.length < 260 && parts.length <= 3,
    simplerReplaySuggested: parts.length > 2 || text.length > 220,
  }
}

const DEBUG_FLAG =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PRACTICE_ORCH_DEBUG === '1'

export async function runPracticeConversationTurn(
  input: RunPracticeConversationTurnInput
): Promise<RunPracticeConversationTurnOutput> {
  ensureCatalogScenariosRegistered()
  const ctx = getScenario(input.scenarioId)
  let difficulty: A2DifficultyBand = input.difficulty ?? 'a2_mid'
  if (input.examStyleConversation) {
    difficulty = 'a2_upper'
  }

  const recovery = detectRecovery({
    userMessage: input.userMessage,
    inputModality: input.inputModality,
    sttConfidence: input.sttConfidence,
  })

  const tier = selectTurnFeedbackTier({
    mode: input.mode,
    userMessage: input.userMessage,
    priorUserTurns: input.priorUserTurns,
    messageHistory: input.messageHistory,
  })

  const turnObjective = inferTurnObjective(ctx?.goal, input.priorUserTurns)

  const { systemPrompt } = buildPracticeScenarioPrompt({
    ctx,
    scenarioId: input.scenarioId,
    mode: input.mode,
    difficulty,
    turnObjective,
    locale: input.localeInstruction,
    easierModeActive: input.easierModeActive,
  })

  let assistantNl: string
  let coachEn: string | undefined

  if (recovery.scriptedAssistantNl) {
    assistantNl = recovery.scriptedAssistantNl
    coachEn = recovery.coachEn
  } else if (isClientMockEngineAllowed()) {
    const mock = mockDeterministicAssistantReply({
      scenarioId: input.scenarioId,
      mode: input.mode,
      priorUserTurns: input.priorUserTurns,
      lastUserMessage: input.userMessage,
      feedbackTiming: input.feedbackTiming,
    })
    assistantNl = mock.assistantNl
    coachEn = mock.coachEn
  } else {
    throw new Error('Conversation backend is required for practice replies.')
  }

  const ft = input.feedbackTiming ?? 'end'
  if (recovery.kind === 'none' && (ft === 'silent' || ft === 'end')) {
    coachEn = undefined
  }

  assistantNl = finalizeAssistantResponse(assistantNl, difficulty)

  const feedbackSignals = buildTurnFeedbackSignals({
    mode: input.mode,
    tier,
    recovery: recovery.kind,
    userMessage: input.userMessage,
    coachEn,
  })

  const out: RunPracticeConversationTurnOutput = {
    assistantNl,
    coachEn,
    feedbackSignals,
    listeningHints: buildListeningHints(assistantNl),
    systemPromptForProvider: systemPrompt,
  }

  const debugOn = input.debug ?? DEBUG_FLAG
  if (debugOn) {
    out.debug = {
      systemPrompt: systemPrompt,
      modeRulesApplied: [
        `mode:${input.mode}`,
        `difficulty:${difficulty}`,
        `recovery:${recovery.kind}`,
        `tier:${tier}`,
      ],
      recoveryApplied: recovery.kind,
    }
  }

  return out
}
