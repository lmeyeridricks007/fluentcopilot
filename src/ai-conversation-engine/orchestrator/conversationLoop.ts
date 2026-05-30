/**
 * AI Conversation Engine — conversation turn processing and orchestration.
 */

import type { ConversationMessage } from '../types/session.js'
import type { ScenarioContext } from '../types/scenario.js'
import { getSession, updateSession } from '../session/sessionStore.js'
import { getModerationService } from '../safety/moderation.js'
import { getProvider } from '../providers/index.js'
import { defaultConversationTemplate, buildSystemPrompt, parseTutorResponse } from '../prompts/templates.js'
import { getScenario } from '../config/scenarios.js'
import { analyzeUserMessage } from '../analysis/grammar.js'
import { defaultConfig } from '../config/index.js'
import { recordTurn } from '../telemetry/events.js'

export interface ProcessTurnInput {
  session_id: string
  content: string
  source?: 'text' | 'stt'
}

export interface ProcessTurnResult {
  user_message: ConversationMessage
  tutor_message: ConversationMessage
  corrections: ConversationMessage['corrections']
  feedback_snippet?: string
  error?: string
}

export async function processTurn(input: ProcessTurnInput): Promise<ProcessTurnResult | { error: string }> {
  const session = getSession(input.session_id)
  if (!session) return { error: 'Session not found' }
  if (session.status !== 'active') return { error: 'Session is not active' }

  const config = defaultConfig
  if (session.messages.length >= config.max_messages_per_session) {
    return { error: 'Maximum messages per session reached' }
  }

  const moderation = getModerationService()
  const modResult = await moderation.check({ text: input.content, context: 'user_message' })
  if (!modResult.allowed) {
    recordTurn({ session_id: input.session_id, event: 'moderation_blocked', payload: { reason: modResult.reason } })
    return { error: modResult.reason ?? 'Message did not pass safety check' }
  }

  const now = new Date().toISOString()
  const analysis = analyzeUserMessage({
    userMessage: input.content,
    cefrLevel: session.cefr_level,
    scenarioId: session.scenario_id,
  })

  const userMessage: ConversationMessage = {
    role: 'user',
    content: input.content.trim(),
    timestamp: now,
    analysis,
  }

  const scenario = getScenario(session.scenario_id)
  const scenarioContext: ScenarioContext = scenario ?? {
    scenario_id: session.scenario_id,
    scenario_name: session.scenario_id,
    setting: 'General conversation',
    goal: 'Practice Dutch.',
    key_phrases: [],
  }

  const systemPrompt = buildSystemPrompt(
    defaultConversationTemplate,
    scenarioContext,
    session.cefr_level,
    session.locale ?? 'nl-NL'
  )

  const history: Array<{ role: 'user' | 'assistant'; content: string }> = session.messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }))
  const provider = getProvider(config.default_provider) ?? getProvider('mock')
  if (!provider) return { error: 'No conversation provider available' }

  const messagesForProvider = [
    { role: 'system' as const, content: systemPrompt },
    ...history,
    { role: 'user' as const, content: input.content.trim() },
  ]

  let rawResponse: string
  try {
    const result = await provider.generateResponse({
      messages: messagesForProvider,
      max_tokens: config.max_tokens_per_turn,
      temperature: config.temperature,
    })
    rawResponse = result.content
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Provider error'
    recordTurn({ session_id: input.session_id, event: 'provider_error', payload: { message } })
    return { error: message }
  }

  const { content: tutorContent, correction } = parseTutorResponse(rawResponse)
  const corrections: ConversationMessage['corrections'] = correction
    ? [{ original: input.content.trim(), corrected: correction, explanation: undefined }]
    : undefined

  const tutorMessage: ConversationMessage = {
    role: 'tutor',
    content: tutorContent,
    timestamp: new Date().toISOString(),
    corrections,
  }

  const updatedMessages = [...session.messages, userMessage, tutorMessage]
  updateSession(input.session_id, { messages: updatedMessages })

  recordTurn({
    session_id: input.session_id,
    event: 'turn_processed',
    payload: { message_count: updatedMessages.length },
  })

  return {
    user_message: userMessage,
    tutor_message: tutorMessage,
    corrections: tutorMessage.corrections,
    feedback_snippet: correction,
  }
}
