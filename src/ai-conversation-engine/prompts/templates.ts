/**
 * AI Conversation Engine — prompt template system.
 * Structured, versioned prompts for conversation and feedback.
 */

import type { CEFRLevel } from '../types/session.js'
import type { ScenarioContext } from '../types/scenario.js'

export interface ConversationPromptTemplate {
  version: number
  system_prompt: string
  conversation_instructions: string
  scenario_placeholder: string
  level_placeholder: string
  feedback_instructions: string
  response_format_rules: string
  constraints: string[]
}

const DEFAULT_CONSTRAINTS = [
  'Use Dutch only in your reply unless the learner explicitly asks for help in another language.',
  'Adapt vocabulary and sentence length to the learner CEFR level.',
  'Do not exceed conversation complexity for the level.',
  'Correct mistakes gently and briefly; offer the correct form once.',
  'Stay in character for the scenario.',
]

export function buildSystemPrompt(
  template: ConversationPromptTemplate,
  scenario: ScenarioContext,
  cefrLevel: CEFRLevel,
  _locale: string
): string {
  const scenarioBlock = [
    `Scenario: ${scenario.scenario_name}`,
    `Setting: ${scenario.setting}`,
    `Goal: ${scenario.goal}`,
    scenario.key_phrases.length > 0
      ? `Key phrases to use when appropriate: ${scenario.key_phrases.map((p) => p.phrase).join('; ')}`
      : '',
    scenario.ai_roleplay_instructions
      ? `Role: ${scenario.ai_roleplay_instructions.role}. Tone: ${scenario.ai_roleplay_instructions.tone}. ${scenario.ai_roleplay_instructions.language}.`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const levelBlock = `Learner level: ${cefrLevel}. Use simple, clear Dutch. Avoid idioms and complex grammar above this level.`
  const parts = [
    template.system_prompt,
    template.conversation_instructions,
    scenarioBlock,
    levelBlock,
    template.feedback_instructions,
    template.response_format_rules,
    'Constraints: ' + [...template.constraints, ...DEFAULT_CONSTRAINTS].join(' '),
  ]
  return parts.filter(Boolean).join('\n\n')
}

export const defaultConversationTemplate: ConversationPromptTemplate = {
  version: 1,
  system_prompt:
    'You are a patient, friendly Dutch conversation tutor. You play the role of a character in a realistic scenario. Your goal is to help the learner practice Dutch in a safe, supportive way.',
  conversation_instructions:
    'Respond naturally in character. Keep turns concise (1–3 sentences). After your reply, you may add a single brief correction or tip in [CORRECTION: ...] if the learner made a clear mistake.',
  scenario_placeholder: '{{SCENARIO_CONTEXT}}',
  level_placeholder: '{{CEFR_LEVEL}}',
  feedback_instructions:
    'If the learner makes a grammar or vocabulary mistake, include one short correction in [CORRECTION: suggested correction - brief explanation]. Do not over-correct.',
  response_format_rules:
    'Reply in Dutch. Optionally end with [CORRECTION: ...] on a new line for one correction. No other formatting.',
  constraints: [],
}

export function parseTutorResponse(raw: string): { content: string; correction?: string } {
  const correctionMatch = raw.match(/\n?\[CORRECTION:\s*(.+?)\]\s*$/s)
  if (correctionMatch) {
    const content = raw.replace(/\n?\[CORRECTION:\s*.+?\]\s*$/s, '').trim()
    const correction = correctionMatch[1].trim()
    return { content, correction }
  }
  return { content: raw.trim() }
}
