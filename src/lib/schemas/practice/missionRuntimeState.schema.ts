/**
 * Client-persisted mission runtime: assignments, weekly rollups, scenario streak.
 * Content definitions stay in missionRegistry; this is learner state only.
 */
import { z } from 'zod'
import { practiceConversationModeSchema } from '@/lib/schemas/practice/practiceShared.schema'
import { scenarioCatalogCategorySchema } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'

export const examPrepMissionDomainSchema = z.enum(['speaking', 'writing', 'listening', 'reading', 'kmn'])
export type ExamPrepMissionDomain = z.infer<typeof examPrepMissionDomainSchema>

export const examPrepMissionModeSchema = z.enum(['training', 'simulation', 'practice_exam'])
export type ExamPrepMissionMode = z.infer<typeof examPrepMissionModeSchema>

export const missionProgressRuleSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('scenario_complete'),
    modes: z.array(practiceConversationModeSchema).optional(),
    category: scenarioCatalogCategorySchema.optional(),
  }),
  z.object({
    kind: z.literal('scenario_completes_week'),
  }),
  z.object({
    kind: z.literal('health_scenarios_week'),
  }),
  z.object({
    kind: z.literal('skill_track_complete'),
    trackIds: z.array(z.string()).optional(),
    anyTrack: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('distinct_skill_tracks_week'),
  }),
  z.object({
    kind: z.literal('mistake_fix_sessions'),
    minCards: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal('daily_review_sessions'),
    minCards: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal('practice_days_week'),
  }),
  z.object({
    kind: z.literal('exam_prep_completion'),
    domains: z.array(examPrepMissionDomainSchema).optional(),
    modes: z.array(examPrepMissionModeSchema).optional(),
    minNormalizedPercent: z.number().optional(),
  }),
  z.object({
    kind: z.literal('exam_prep_week_count'),
    domain: examPrepMissionDomainSchema.optional(),
  }),
  z.object({
    kind: z.literal('exam_prep_practice_exam_week'),
  }),
  z.object({
    kind: z.literal('exam_category_improved'),
    domain: z.enum(['speaking', 'writing']),
    categoryKey: z.string(),
    minDelta: z.number().int().positive(),
  }),
])

export type MissionProgressRule = z.infer<typeof missionProgressRuleSchema>

export const assignedMissionInstanceSchema = z.object({
  templateId: z.string(),
  title: z.string(),
  description: z.string(),
  rationale: z.string().optional(),
  current: z.number().int().nonnegative(),
  target: z.number().int().positive(),
  xpReward: z.number().int().nonnegative(),
  countsForStreak: z.boolean(),
  href: z.string(),
  ctaLabel: z.string(),
  completed: z.boolean(),
  rewardGranted: z.boolean(),
  rule: missionProgressRuleSchema,
})

export type AssignedMissionInstance = z.infer<typeof assignedMissionInstanceSchema>

export const scenarioStreakStateSchema = z.object({
  lastScenarioPracticeLocalDate: z.string().nullable(),
  consecutiveDays: z.number().int().nonnegative(),
  longestConsecutive: z.number().int().nonnegative(),
  weekKey: z.string(),
  scenariosThisWeek: z.number().int().nonnegative(),
})

export type ScenarioStreakState = z.infer<typeof scenarioStreakStateSchema>

export const missionRuntimeStateSchema = z.object({
  version: z.literal(1),
  userId: z.string(),
  dailyKey: z.string(),
  weeklyKey: z.string(),
  daily: assignedMissionInstanceSchema.nullable(),
  weekly: assignedMissionInstanceSchema.nullable(),
  skillFocus: assignedMissionInstanceSchema.nullable(),
  scenarioStreak: scenarioStreakStateSchema,
  weekDistinctPracticeDays: z.array(z.string()),
  weekSkillTrackIds: z.array(z.string()),
  /** Completed health-category scenarios this ISO week */
  weekHealthScenarioCount: z.number().int().nonnegative().default(0),
  /** Exam prep completions this ISO week (any domain) */
  weekExamPrepTotal: z.number().int().nonnegative().default(0),
  weekExamPrepByDomain: z.record(z.string(), z.number().int().nonnegative()).default({}),
  /** Last observed rubric points per `${domain}:${categoryKey}` for improvement missions */
  lastExamCategoryScores: z.record(z.string(), z.number()).default({}),
  /** Finished practice-exam runs (any module) this ISO week */
  weekExamPrepPracticeExamCount: z.number().int().nonnegative().default(0),
})

export type MissionRuntimeState = z.infer<typeof missionRuntimeStateSchema>
