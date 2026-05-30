/**
 * AI Conversation Engine — scenario context for prompts and orchestration.
 */

import type { CEFRLevel } from './session.js'

export interface ScenarioContext {
  scenario_id: string
  scenario_name: string
  setting: string
  goal: string
  key_phrases: Array<{ phrase: string; translation?: string; context?: string }>
  expected_vocabulary?: string[]
  difficulty_adjustments?: Record<CEFRLevel, string>
  ai_roleplay_instructions?: {
    role: string
    setting: string
    must_include?: string[]
    tone: string
    language: string
    constraints?: string[]
  }
}
