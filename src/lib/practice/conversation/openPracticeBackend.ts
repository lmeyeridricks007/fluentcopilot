import { conversationClient } from '@/lib/api/conversationClient'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { resolveCatalogScenarioBackendTarget } from '@/lib/practice/catalogScenarioToBackend'
import type { OpenPracticeMode } from '@/lib/practice/conversation/generateOpenPracticeReply'
import type { ConversationMode } from '@/features/feature1-chat/types'

function mapOpenPracticeModeToConversation(mode: OpenPracticeMode): {
  mode: ConversationMode
  feedbackMode: 'after_each' | 'at_end'
} {
  if (mode === 'free') return { mode: 'free', feedbackMode: 'at_end' }
  return { mode: 'guided', feedbackMode: 'after_each' }
}

export type OpenPracticeBackendSession = {
  threadId: string
  openingAssistantNl: string
}

export async function startOpenPracticeBackendSession(
  catalogScenarioId: string,
  practiceMode: OpenPracticeMode
): Promise<OpenPracticeBackendSession> {
  const target = resolveCatalogScenarioBackendTarget(catalogScenarioId)
  if (!target) {
    throw new Error('This scenario is not available on the backend yet.')
  }
  const { mode, feedbackMode } = mapOpenPracticeModeToConversation(practiceMode)
  const start = await conversationClient.startConversation({
    scenarioId: target.scenarioId,
    mode,
    feedbackMode,
    conversationSurface: 'text',
    cefrLevel: target.cefrLevel,
    scenarioOverrides: target.scenarioOverrides,
  })
  const opening = [...start.messages].reverse().find((m) => m.sender === 'assistant')
  if (!opening?.content?.trim()) {
    throw new Error('Could not start conversation — no opening message from assistant.')
  }
  return { threadId: start.thread.id, openingAssistantNl: opening.content.trim() }
}

export async function sendOpenPracticeBackendMessage(
  threadId: string,
  text: string,
  practiceMode: OpenPracticeMode
): Promise<{ assistantNl: string; coachEn?: string }> {
  const resp = await conversationClient.sendConversationMessage(threadId, text)
  let coachEn: string | undefined
  if (practiceMode === 'semi_guided') {
    if (resp.feedback?.explanation?.trim()) {
      coachEn = resp.feedback.explanation.trim()
    } else if (resp.enrichmentPending) {
      const enrich = await conversationClient.enrichConversationTurn(threadId, {
        userMessageId: resp.userMessage.id,
        assistantMessageId: resp.assistantMessage.id,
      })
      coachEn = enrich.feedback?.explanation?.trim() || undefined
    }
  }
  return { assistantNl: resp.assistantMessage.content.trim(), coachEn }
}

export function isOpenPracticeBackendAvailable(catalogScenarioId: string): boolean {
  return isFeature1ChatBackendEnabled() && resolveCatalogScenarioBackendTarget(catalogScenarioId) != null
}
