/**
 * AI Conversation Engine — API contract types (for backend integration).
 */

import type { CEFRLevel } from './session.js'
import type { ConversationSession, ConversationMessage, SessionSummary } from './session.js'

export interface StartConversationRequest {
  user_id: string
  scenario_id: string
  cefr_level: CEFRLevel
  conversation_type: 'text' | 'voice'
  locale?: string
}

export interface StartConversationResponse {
  session_id: string
  session: ConversationSession
  initial_message?: string
}

export interface SendMessageRequest {
  session_id: string
  content: string
  source?: 'text' | 'stt'
}

export interface SendMessageResponse {
  message: ConversationMessage
  tutor_response: ConversationMessage
  corrections?: ConversationMessage['corrections']
  feedback_snippet?: string
}

export interface EndConversationRequest {
  session_id: string
}

export interface EndConversationResponse {
  session: ConversationSession
  summary: SessionSummary
}

export interface GetConversationResponse {
  session: ConversationSession
}
