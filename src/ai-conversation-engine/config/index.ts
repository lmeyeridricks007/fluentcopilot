/**
 * AI Conversation Engine — configuration.
 */

import type { CEFRLevel } from '../types/session.js'

export interface ConversationEngineConfig {
  default_provider: string
  default_model: string
  max_tokens_per_turn: number
  temperature: number
  moderation_required: boolean
  mock_mode: boolean
  max_messages_per_session: number
}

export const defaultConfig: ConversationEngineConfig = {
  default_provider: 'mock',
  default_model: 'mock',
  max_tokens_per_turn: 512,
  temperature: 0.7,
  moderation_required: true,
  mock_mode: true,
  max_messages_per_session: 50,
}

const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1']

export function isLevelAtOrAbove(level: CEFRLevel, min: CEFRLevel): boolean {
  return CEFR_ORDER.indexOf(level) >= CEFR_ORDER.indexOf(min)
}
