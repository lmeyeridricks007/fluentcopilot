import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import type { A2DifficultyBand } from '@/lib/practice-orchestration/types'

/** Mirrors app entitlements; keep lib-layer free of feature imports. */
export type SupportEntitlementTier = 'free' | 'trial' | 'premium'

export type OpenPracticeSupportMode = Extract<PracticeConversationMode, 'semi_guided' | 'free'>

export type SupportToolId =
  | 'hint'
  | 'phrase_suggestions'
  | 'slower_reply'
  | 'translate_key_phrase'
  | 'say_naturally'
  | 'what_means'
  | 'restart_turn'
  | 'easier_mode'

export type SupportToolSurface = 'open_practice' | 'guided'

export interface SupportToolDefinition {
  id: SupportToolId
  label: string
  /** Shown in analytics and compact UI. */
  shortLabel: string
  /** Premium-only (trial counts as premium for gating). */
  premiumOnly: boolean
  /** More prominent in guided / semi-guided vs hidden behind sheet in free. */
  prominence: 'high' | 'medium' | 'low'
}

export interface SupportToolRuntime extends SupportToolDefinition {
  available: boolean
  /** Tappable: opens upgrade path instead of running the tool. */
  premiumLocked?: boolean
  disabledReason?: string
}

export interface OpenSupportContext {
  mode: OpenPracticeSupportMode
  scenarioId: string
  scenarioGoal?: string
  keyPhrases: Array<{ phrase: string; translation?: string; context?: string }>
  messages: { role: 'user' | 'assistant'; content: string; id: string }[]
  composerDraft: string
  difficulty: A2DifficultyBand
  easierModeActive: boolean
  tier: SupportEntitlementTier
  /** Hint opens without struggle; increment in UI to deepen hint. */
  hintUseCount: number
}

export type OpenSupportResult =
  | { kind: 'hint'; text: string }
  | { kind: 'phrase_suggestions'; phrases: string[] }
  | { kind: 'slower_reply'; assistantNl: string; translationEn: string }
  | { kind: 'translate_key_phrase'; messageId: string; chunkNl: string; glossEn: string }
  | { kind: 'say_naturally'; text: string }
  | { kind: 'what_means'; messageId: string; explanationEn: string }
  | { kind: 'restart_turn'; nextMessages: OpenSupportContext['messages'] }
  | {
      kind: 'easier_mode'
      nextDifficulty: A2DifficultyBand
      nextEasierModeActive: boolean
      coachEn: string
    }
