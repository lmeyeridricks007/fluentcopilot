import type { ScenarioContext } from '@/ai-conversation-engine/types/scenario'

/**
 * Role-consistent instructions derived from authored scenario context.
 * Extend with `personaPresets` when a scenario lacks ai_roleplay_instructions.
 */
export function buildPersonaInstructionBlock(ctx: ScenarioContext | null): string {
  if (!ctx?.ai_roleplay_instructions) {
    return [
      'You are a Dutch local in this scenario. Speak naturally but simply.',
      'Stay polite and patient. Keep the learner moving toward the scenario goal with short questions.',
    ].join('\n')
  }
  const a = ctx.ai_roleplay_instructions
  const must = a.must_include?.length
    ? `Include these beats over the conversation when natural: ${a.must_include.join(', ')}.`
    : ''
  return [
    `Role: ${a.role}`,
    `Scene behaviour: ${a.setting}`,
    `Tone: ${a.tone}`,
    `Language policy: ${a.language}`,
    must,
    ...(a.constraints ?? []),
    'Do not break character. Do not answer unrelated trivia or general knowledge outside the scenario.',
  ]
    .filter(Boolean)
    .join('\n')
}
