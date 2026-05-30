/**
 * Scenario stage — one phase within a scenario track (intro, ordering, repair, close).
 * Supports guided → semi-guided → free via modeCompatibility and turn plans.
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { exerciseDifficultySchema } from '@/lib/schemas/exercise.schema'
import { practiceConversationModeSchema } from '@/lib/schemas/practice/practiceShared.schema'
import { conversationTurnSchema } from '@/lib/schemas/practice/conversationTurn.schema'

export const scenarioStageSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
  /** Which conversation modes may include this stage */
  modeCompatibility: z.array(practiceConversationModeSchema).min(1),
  goal: z.string().min(1),
  /** Ordered turn expectations (template); runtime may truncate in free mode */
  turnPlan: z.array(conversationTurnSchema).optional(),
  suggestedPhrases: z.array(z.string().min(1)).optional(),
  hintAvailability: z.enum(['always', 'on_request', 'after_error', 'none']),
  expectedOutcome: z.string().min(1),
  successCriteria: z.array(z.string().min(1)).min(1),
  /** Stage-level difficulty hint for orchestration */
  difficultyNotes: z.string().optional(),
  difficulty: exerciseDifficultySchema.optional(),
  metadata: metadataSchema,
})

export type ScenarioStage = z.infer<typeof scenarioStageSchema>
