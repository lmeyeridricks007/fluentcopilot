import type { ConversationMode } from '../../models/contracts'

/** Internal coaching parameters for Speak Live — not a user-facing “mode” picker. */
export type SpeakLiveSupportStrategy = {
  coachingTightness: 'loose' | 'balanced' | 'tight'
  assistanceLevel: 'light' | 'standard' | 'high'
  interruptionPolicy: 'defer_to_learner' | 'balanced' | 'coach_forward'
  hintFrequency: 'minimal' | 'normal' | 'rich'
}

export type SpeakLiveCefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

const CEFR: readonly SpeakLiveCefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export function normalizeSpeakLiveCefrLevel(raw: string | null | undefined): SpeakLiveCefrLevel {
  const u = (raw ?? '').trim().toUpperCase()
  return (CEFR as readonly string[]).includes(u) ? (u as SpeakLiveCefrLevel) : 'A2'
}

/**
 * Defaults from learner level + scenario shape. Product may later merge account settings here.
 */
export function resolveSpeakLiveSupportStrategy(input: {
  cefrLevel: SpeakLiveCefrLevel
  scenarioSlug: string
  scenarioGoalCount: number
  /**
   * When several of the learner’s weakest tracked skills overlap this scenario’s tag set,
   * nudge scaffolding slightly (skill-aware adaptation without changing scene architecture).
   */
  weakSkillScenarioOverlapHits?: number
}): SpeakLiveSupportStrategy {
  const { cefrLevel, scenarioSlug, scenarioGoalCount, weakSkillScenarioOverlapHits = 0 } = input
  const slugNorm = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  const complexScene =
    scenarioGoalCount >= 4 || slugNorm === 'train_station' || slugNorm === 'train_station_classic'
  const beginner = cefrLevel === 'A1' || cefrLevel === 'A2'
  const advanced = cefrLevel === 'B2' || cefrLevel === 'C1' || cefrLevel === 'C2'
  const skillBoost = weakSkillScenarioOverlapHits >= 2

  if (beginner) {
    const hintFrequency = complexScene ? 'rich' : skillBoost ? 'rich' : 'normal'
    return {
      coachingTightness: complexScene ? 'tight' : 'balanced',
      assistanceLevel: 'high',
      interruptionPolicy: complexScene ? 'coach_forward' : 'balanced',
      hintFrequency,
    }
  }
  if (advanced) {
    return {
      coachingTightness: 'loose',
      assistanceLevel: 'light',
      interruptionPolicy: 'defer_to_learner',
      hintFrequency: 'minimal',
    }
  }
  // B1
  const hintFrequency = complexScene ? 'normal' : skillBoost ? 'normal' : 'minimal'
  return {
    coachingTightness: complexScene ? 'balanced' : 'loose',
    assistanceLevel: 'standard',
    interruptionPolicy: 'balanced',
    hintFrequency,
  }
}

/** Maps strategy to legacy thread.mode for prompts and compatibility with text-thread tooling. */
export function legacyConversationModeFromSupportStrategy(s: SpeakLiveSupportStrategy): ConversationMode {
  if (s.assistanceLevel === 'high') return 'guided'
  if (s.assistanceLevel === 'light') return 'free'
  return s.coachingTightness === 'tight' || s.hintFrequency === 'rich' ? 'guided' : 'free'
}

/** Replaces Guided/Free copy in system prompts for Speak Live. */
export function formatSpeakLiveSupportStrategyForPrompt(s: SpeakLiveSupportStrategy): string {
  return [
    'Speak Live coaching policy (internal — do not mention these labels to the learner):',
    `- Coaching tightness: ${s.coachingTightness} (how strictly the scene and goals frame each reply).`,
    `- Assistance level: ${s.assistanceLevel} (how much the assistant proactively steers and scaffolds).`,
    `- Interruption / takeover policy: ${s.interruptionPolicy} (when the assistant may redirect vs follow the learner).`,
    `- Hint density: ${s.hintFrequency} (how often to weave in gentle nudges toward scenario goals).`,
    'Stay in character in Dutch; coach steps in when useful without announcing “modes”.',
  ].join('\n')
}
