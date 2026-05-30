/**
 * Practice scenario — catalog entry for a situational practice track (café, doctor, gemeente, …).
 * Content definition only; runtime session state lives in practiceSessionResult + orchestration store.
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { exerciseDifficultySchema } from '@/lib/schemas/exercise.schema'
import {
  practiceConversationModeSchema,
  practiceAccessRulesSchema,
  cefrBandSchema,
  practiceLifeAreaSchema,
} from '@/lib/schemas/practice/practiceShared.schema'
import { scenarioStageSchema } from '@/lib/schemas/practice/scenarioStage.schema'
import { rolePersonaSchema } from '@/lib/schemas/practice/rolePersona.schema'
import { practiceObjectiveSchema } from '@/lib/schemas/practice/practiceObjective.schema'
import { expectedSkillSchema } from '@/lib/schemas/practice/expectedSkills.schema'

export const scenarioSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  category: practiceLifeAreaSchema,
  cefrLevel: cefrBandSchema,
  /** Curriculum spine links (module or lesson ids). */
  moduleRefs: z.array(idSchema).optional(),
  summary: z.string().min(1),
  /** Setting / context paragraph for learners and prompts */
  context: z.string().min(1),
  difficulty: exerciseDifficultySchema,
  supportedModes: z.array(practiceConversationModeSchema).min(1),
  access: practiceAccessRulesSchema,
  scenarioStages: z.array(scenarioStageSchema).min(1),
  personas: z.array(rolePersonaSchema).min(1),
  objectives: z.array(practiceObjectiveSchema).min(1),
  expectedSkills: z.array(expectedSkillSchema).min(1),
  /** String ids matching lesson/module grammar spine */
  vocabTargets: z.array(idSchema).optional(),
  grammarTargets: z.array(idSchema).optional(),
  metadata: metadataSchema,
})

export type Scenario = z.infer<typeof scenarioSchema>
