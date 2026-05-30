/**
 * AI Conversation Engine — conversation session and message types.
 */

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'

export type ConversationType = 'text' | 'voice'

export type SessionStatus = 'active' | 'completed' | 'abandoned' | 'error'

export interface MessageAnalysis {
  grammar_issues?: Array<{ issue: string; correction?: string; explanation?: string }>
  vocabulary_feedback?: Array<{ word: string; suggestion?: string; level_appropriate?: boolean }>
  fluency_notes?: string
}

export interface ConversationMessage {
  role: 'user' | 'tutor'
  content: string
  timestamp: string
  analysis?: MessageAnalysis
  corrections?: Array<{ original: string; corrected: string; explanation?: string }>
}

export interface ConversationFeedback {
  grammar_mistakes: Array<{ message: string; correction: string; explanation?: string }>
  vocabulary_improvements: Array<{ word: string; suggestion: string }>
  fluency_score?: number
  cefr_match?: boolean
  suggested_corrections?: string[]
  example_better_responses?: string[]
}

export interface SessionSummary {
  conversation_summary: string
  grammar_mistakes_list: Array<{ message: string; correction: string }>
  new_vocabulary_learned?: string[]
  pronunciation_score?: number
  recommended_next_lessons?: string[]
}

export interface ConversationSession {
  session_id: string
  user_id: string
  scenario_id: string
  cefr_level: CEFRLevel
  conversation_type: ConversationType
  start_time: string
  messages: ConversationMessage[]
  feedback?: ConversationFeedback
  summary?: SessionSummary
  status: SessionStatus
  locale?: string
}
