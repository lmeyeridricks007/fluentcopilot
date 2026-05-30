/**
 * AI Conversation Engine — grammar/vocabulary analysis (interface + mock).
 */

import type { MessageAnalysis } from '../types/session.js'

export interface AnalyzeInput {
  userMessage: string
  cefrLevel: string
  scenarioId?: string
}

/**
 * In production, this would call an LLM or dedicated grammar API.
 */
export function analyzeUserMessage(input: AnalyzeInput): MessageAnalysis {
  const trimmed = input.userMessage.trim()
  if (trimmed.length < 3) {
    return {
      grammar_issues: [{ issue: 'Very short input', correction: undefined, explanation: 'Try a full sentence.' }],
    }
  }
  const analysis: MessageAnalysis = {}
  if (!trimmed.endsWith('.') && !trimmed.endsWith('?') && !trimmed.endsWith('!')) {
    analysis.grammar_issues = [
      { issue: 'Missing punctuation', correction: trimmed + '.', explanation: 'Dutch sentences often end with a period.' },
    ]
  }
  return analysis
}
