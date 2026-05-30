/**
 * AI Conversation Engine — conversation scoring (fluency, CEFR match).
 */

import type { ConversationMessage, CEFRLevel } from '../types/session.js'

export interface ConversationScore {
  fluency_score: number
  cefr_match: boolean
  turn_count: number
  correction_count: number
}

const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1']

export function scoreConversation(messages: ConversationMessage[], targetLevel: CEFRLevel): ConversationScore {
  const userTurns = messages.filter((m) => m.role === 'user')
  const correctionCount = messages.reduce(
    (acc, m) => acc + (m.corrections?.length ?? 0) + (m.analysis?.grammar_issues?.length ?? 0),
    0
  )
  const turnCount = userTurns.length
  const idealTurns = Math.min(10, Math.max(2, CEFR_ORDER.indexOf(targetLevel) + 2))
  const fluencyRaw = turnCount === 0 ? 0 : 1 - Math.min(1, correctionCount / Math.max(1, turnCount * 2))
  const fluency_score = Math.round(Math.max(0, Math.min(1, fluencyRaw)) * 100) / 100
  const cefr_match = turnCount >= idealTurns * 0.5
  return {
    fluency_score,
    cefr_match,
    turn_count: turnCount,
    correction_count: correctionCount,
  }
}
