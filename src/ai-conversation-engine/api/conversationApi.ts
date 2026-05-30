/**
 * AI Conversation Engine — API facade for conversation start, message, end, get.
 * Backend can call these; map to POST/GET routes as needed.
 */

import { createSessionId } from '../lib/uuid.js'
import type {
  StartConversationRequest,
  StartConversationResponse,
  SendMessageRequest,
  SendMessageResponse,
  EndConversationRequest,
  EndConversationResponse,
  GetConversationResponse,
} from '../types/api.js'
import type { ConversationSession } from '../types/session.js'
import { getSession, saveSession, updateSession } from '../session/sessionStore.js'
import { processTurn } from '../orchestrator/conversationLoop.js'
import { buildFeedbackFromSession, buildSessionSummary } from '../feedback/summary.js'
import { recordSessionStart, recordSessionEnd } from '../telemetry/events.js'

function createSession(request: StartConversationRequest): ConversationSession {
  const now = new Date().toISOString()
  return {
    session_id: createSessionId(),
    user_id: request.user_id,
    scenario_id: request.scenario_id,
    cefr_level: request.cefr_level,
    conversation_type: request.conversation_type,
    start_time: now,
    messages: [],
    status: 'active',
    locale: request.locale,
  }
}

export async function startConversation(
  request: StartConversationRequest
): Promise<StartConversationResponse> {
  const session = createSession(request)
  saveSession(session)
  recordSessionStart(session.session_id, {
    user_id: session.user_id,
    scenario_id: session.scenario_id,
    cefr_level: session.cefr_level,
    conversation_type: session.conversation_type,
  })
  return {
    session_id: session.session_id,
    session: { ...session },
    initial_message: undefined,
  }
}

export async function sendMessage(request: SendMessageRequest): Promise<SendMessageResponse | { error: string }> {
  const result = await processTurn({
    session_id: request.session_id,
    content: request.content,
    source: request.source,
  })
  if ('error' in result) return { error: result.error ?? 'Unknown error' }
  return {
    message: result.user_message,
    tutor_response: result.tutor_message,
    corrections: result.corrections,
    feedback_snippet: result.feedback_snippet,
  }
}

export async function endConversation(
  request: EndConversationRequest
): Promise<EndConversationResponse | { error: string }> {
  const session = getSession(request.session_id)
  if (!session) return { error: 'Session not found' }
  const feedback = buildFeedbackFromSession(session.messages)
  const summary = buildSessionSummary(session.messages, feedback)
  const updated = updateSession(request.session_id, {
    status: 'completed',
    feedback,
    summary,
  })
  if (!updated) return { error: 'Session update failed' }
  recordSessionEnd(request.session_id, {
    message_count: updated.messages.length,
    has_feedback: feedback.grammar_mistakes.length > 0,
  })
  const summaryOut = updated.summary
  if (!summaryOut) return { error: 'Session summary not set' }
  return {
    session: updated,
    summary: summaryOut,
  }
}

export async function getConversation(sessionId: string): Promise<GetConversationResponse | { error: string }> {
  const session = getSession(sessionId)
  if (!session) return { error: 'Session not found' }
  return { session }
}
