/**
 * AI Conversation Engine — conversation feedback and session summary generation.
 */

import type { ConversationFeedback, SessionSummary, ConversationMessage } from '../types/session.js'

export function buildFeedbackFromSession(messages: ConversationMessage[]): ConversationFeedback {
  const grammar_mistakes: ConversationFeedback['grammar_mistakes'] = []
  const vocabulary_improvements: ConversationFeedback['vocabulary_improvements'] = []
  for (const msg of messages) {
    if (msg.role === 'user' && msg.analysis?.grammar_issues) {
      for (const g of msg.analysis.grammar_issues) {
        if (g.correction) grammar_mistakes.push({ message: g.issue, correction: g.correction, explanation: g.explanation })
      }
    }
    if (msg.corrections?.length) {
      for (const c of msg.corrections) {
        grammar_mistakes.push({ message: c.original, correction: c.corrected, explanation: c.explanation })
      }
    }
  }
  return {
    grammar_mistakes: [...new Map(grammar_mistakes.map((m) => [m.message, m])).values()],
    vocabulary_improvements,
    fluency_score: undefined,
    cefr_match: undefined,
  }
}

export function buildSessionSummary(
  messages: ConversationMessage[],
  feedback: ConversationFeedback,
  options?: { pronunciation_score?: number }
): SessionSummary {
  const userTurns = messages.filter((m) => m.role === 'user').length
  const summary = `You had ${userTurns} exchange(s). ${feedback.grammar_mistakes.length > 0 ? 'Review the corrections below.' : 'Good job!'}`
  return {
    conversation_summary: summary,
    grammar_mistakes_list: feedback.grammar_mistakes.map((m) => ({ message: m.message, correction: m.correction })),
    new_vocabulary_learned: feedback.vocabulary_improvements.length > 0 ? feedback.vocabulary_improvements.map((v) => v.suggestion) : undefined,
    pronunciation_score: options?.pronunciation_score,
    recommended_next_lessons: undefined,
  }
}
