import { isClientMockEngineAllowed } from '@/lib/api/apiConfig'
import { runPracticeConversationTurn } from '@/lib/practice-orchestration/conversationOrchestrator'
import { getOrchestratedOpeningLine } from '@/lib/practice-orchestration/openingLine'
import {
  sendOpenPracticeBackendMessage,
  startOpenPracticeBackendSession,
} from '@/lib/practice/conversation/openPracticeBackend'
import type { A2DifficultyBand } from '@/lib/practice-orchestration/types'

export type OpenPracticeMode = 'semi_guided' | 'free'

export interface GenerateOpenPracticeReplyInput {
  mode: OpenPracticeMode
  scenarioId: string
  /** Number of user messages already in the thread (excluding the current send). */
  priorUserTurns: number
  lastUserMessage: string
  /** For recovery + turn policy (recommended). */
  messageHistory?: { role: 'user' | 'assistant'; content: string }[]
  /** Session difficulty (easier mode lowers band). */
  difficulty?: A2DifficultyBand
  easierModeActive?: boolean
  /** Backend text thread id (set after {@link startOpenPracticeBackendSession}). */
  backendThreadId?: string
}

export interface GenerateOpenPracticeReplyOutput {
  assistantNl: string
  coachEn?: string
}

/**
 * Client-friendly facade — backend conversation API when configured, local orchestrator only in dev mock mode.
 */
export async function generateOpenPracticeReply(
  input: GenerateOpenPracticeReplyInput
): Promise<GenerateOpenPracticeReplyOutput> {
  if (!isClientMockEngineAllowed()) {
    const threadId = input.backendThreadId
    if (!threadId) {
      throw new Error('Practice session not started — reload and try again.')
    }
    return sendOpenPracticeBackendMessage(threadId, input.lastUserMessage, input.mode)
  }

  const out = await runPracticeConversationTurn({
    scenarioId: input.scenarioId,
    mode: input.mode,
    userMessage: input.lastUserMessage,
    priorUserTurns: input.priorUserTurns,
    messageHistory: input.messageHistory ?? [],
    difficulty: input.difficulty,
    easierModeActive: input.easierModeActive,
  })
  return { assistantNl: out.assistantNl, coachEn: out.coachEn }
}

export function getOpeningLineForScenario(scenarioId: string): string {
  return getOrchestratedOpeningLine(scenarioId)
}
