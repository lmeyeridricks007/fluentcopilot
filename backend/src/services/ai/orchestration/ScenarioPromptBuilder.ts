import type { ConversationMode, PersonaConfig, ScenarioConfig } from '../../../models/contracts'
import { scenarioContextPartial } from '../../../prompts/partials/scenarioContext'
import { personaVoicePartial } from '../../../prompts/partials/personaVoice'

/**
 * Scenario + persona + mode instructions for turn system prompts.
 * Provider-agnostic; composed into full system prompt by `prompts/buildTurnMessages`.
 */
export function buildScenarioPersonaModeBlock(params: {
  scenario: ScenarioConfig
  persona: PersonaConfig
  mode: ConversationMode
  /**
   * When set (Speak Live), replaces the legacy guided/free mode line with internal coaching parameters.
   */
  speakLiveSupportSummary?: string | null
}): string {
  const pacingLine =
    params.speakLiveSupportSummary?.trim() ??
    `Conversation mode: ${params.mode} (guided = tighter scene boundaries; free = natural but still on-scenario).`
  return [scenarioContextPartial(params.scenario), personaVoicePartial(params.persona), pacingLine].join('\n')
}
