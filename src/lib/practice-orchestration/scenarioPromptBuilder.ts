import type { ScenarioContext } from '@/ai-conversation-engine/types/scenario'
import {
  buildSystemPrompt,
  defaultConversationTemplate,
} from '@/ai-conversation-engine/prompts/templates'
import type { CEFRLevel } from '@/ai-conversation-engine/types/session'
import { cefrA2GuardrailPromptBlock } from '@/lib/practice-orchestration/cefrGuardrails'
import { difficultyToPromptFragment } from '@/lib/practice-orchestration/difficultyPolicy'
import { buildPersonaInstructionBlock } from '@/lib/practice-orchestration/personaInstructionBuilder'
import type { A2DifficultyBand } from '@/lib/practice-orchestration/types'
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'

function modeToOrchestrationRules(mode: PracticeConversationMode): string {
  switch (mode) {
    case 'guided':
      return [
        'Mode: GUIDED. The learner may follow visible scaffolding; keep your Dutch aligned with short, clear prompts.',
        'Prefer one question at a time. You may restate more explicitly if the learner seems stuck.',
      ].join('\n')
    case 'semi_guided':
      return [
        'Mode: SEMI-GUIDED. The learner types more independently.',
        'Give light, natural follow-ups. Only add explicit coaching if the learner is clearly lost.',
        'Keep Dutch strictly A2: short sentences, common words, one clear question when needed.',
      ].join('\n')
    case 'free':
      return [
        'Mode: FREE. Minimal teaching voice.',
        'Stay in role; avoid long corrections mid-scene unless the message is unintelligible.',
      ].join('\n')
    default:
      return ''
  }
}

function bandToCefrLevel(band: A2DifficultyBand): CEFRLevel {
  if (band === 'a2_upper') return 'A2'
  return 'A2'
}

export interface BuiltScenarioPrompt {
  systemPrompt: string
  scenarioSummaryForLogs: string
}

/**
 * Full system prompt for LLM providers; also documents constraints for mock providers.
 */
export function buildPracticeScenarioPrompt(input: {
  ctx: ScenarioContext | null
  scenarioId: string
  mode: PracticeConversationMode
  difficulty: A2DifficultyBand
  turnObjective: string
  locale?: string
  /** Extra scaffolding for “easier mode” recovery (open / semi-guided). */
  easierModeActive?: boolean
}): BuiltScenarioPrompt {
  const ctx = input.ctx
  const scenarioSummaryForLogs = ctx
    ? `${ctx.scenario_name} · ${ctx.goal}`
    : input.scenarioId

  const base =
    ctx != null
      ? buildSystemPrompt(defaultConversationTemplate, ctx, bandToCefrLevel(input.difficulty), input.locale ?? 'nl-NL')
      : [
          defaultConversationTemplate.system_prompt,
          `Scenario id: ${input.scenarioId}. Use simple A2 Dutch in a realistic service encounter.`,
        ].join('\n\n')

  const boosters: string[] = []
  if (input.easierModeActive) {
    boosters.push(
      'Session: EASIER MODE. Prefer very short sentences, at most one question, and a clear next step for the learner — stay in character.'
    )
  }

  const extra = [
    modeToOrchestrationRules(input.mode),
    difficultyToPromptFragment(input.difficulty),
    cefrA2GuardrailPromptBlock(),
    buildPersonaInstructionBlock(ctx),
    `Current turn objective: ${input.turnObjective}`,
    ...boosters,
  ].join('\n\n')

  return {
    systemPrompt: `${base}\n\n---\nPractice orchestration layer:\n${extra}`,
    scenarioSummaryForLogs,
  }
}
