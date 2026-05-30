import type { PersonaConfig } from '../../models/contracts'

export function personaVoicePartial(p: PersonaConfig): string {
  return [
    `Persona: ${p.displayName} — ${p.role}`,
    `Tone: ${p.tone}`,
    `Style rules: ${p.styleRules.join('; ')}`,
    `Default intro already sent; stay consistent.`,
  ].join('\n')
}
