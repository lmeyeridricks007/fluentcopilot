import type { ScenarioCatalogCategory } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import type { Tier } from '@/features/entitlements/EntitlementContext'
import type { WeaknessInsight } from '@/lib/schemas/practice/weaknessInsight.schema'
import type {
  ExamPrepMissionDomain,
  ExamPrepMissionMode,
} from '@/lib/schemas/practice/missionRuntimeState.schema'

export type MissionSignal =
  | { type: 'scenario_complete'; scenarioId: string; mode: string }
  | { type: 'skill_track_complete'; trackId: string }
  | { type: 'review_complete'; mode: 'daily' | 'mistake_fix'; total: number }
  | {
      type: 'exam_prep_complete'
      domain: ExamPrepMissionDomain
      mode: ExamPrepMissionMode
      normalizedPercent?: number
      categoryScores?: Record<string, number>
    }

export type MissionSlot = 'daily' | 'weekly' | 'skill_focus'

export interface MissionTemplateDef {
  id: string
  slot: MissionSlot
  title: string
  description: string
  target: number
  xpReward: number
  countsForStreak: boolean
  requiresPremium: boolean
  rule: import('@/lib/schemas/practice/missionRuntimeState.schema').MissionProgressRule
  /** Build CTA + href from context */
  buildAction: (ctx: MissionActionContext) => { href: string; ctaLabel: string }
  /** Optional rationale line when this template is chosen */
  rationale?: (ctx: MissionGeneratorContext) => string | undefined
}

export interface MissionActionContext {
  tier: Tier
  atScenarioCap: boolean
  /** For category-specific missions */
  category?: ScenarioCatalogCategory
  /** For track-specific missions */
  trackId?: string
  /** Suggested scenario id from weakness routing */
  suggestedScenarioId?: string
}

export interface MissionGeneratorContext {
  tier: Tier
  atScenarioCap: boolean
  weaknessInsights: WeaknessInsight[]
  /** Primary scenario id from top weakness action if any */
  weaknessScenarioId?: string
  /** Catalog category inferred from weakness or recent practice */
  inferredCategory?: ScenarioCatalogCategory
  /** Stable id for deterministic mission variety (Practice Hub / client) */
  userId?: string
  /** True when learner already completed exam-prep activities this ISO week */
  hasExamPrepActivityThisWeek?: boolean
}

export function normalizeConversationMode(mode: string): PracticeConversationMode | null {
  const m = mode.replace(/-/g, '_')
  if (m === 'guided' || m === 'semi_guided' || m === 'free') return m
  if (m === 'semi' || m === 'semiguided') return 'semi_guided'
  return null
}
