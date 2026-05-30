import { z } from 'zod'

const examXpMetaSchema = z.object({
  scope: z.enum(['full', 'section']),
  runMode: z.enum(['simulation', 'training']),
  trainingSupport: z.enum(['full_guidance', 'light_guidance', 'almost_exam']).optional(),
  timedTraining: z.boolean().optional(),
  weaknessRepair: z.boolean().optional(),
  readinessLift: z.boolean().optional(),
})

export const sessionSummaryBodySchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  type: z.enum([
    'scenario',
    'coach',
    'read_aloud',
    'listening',
    'chat',
    'from_your_day',
    'exam_simulation',
    'exam_training',
  ]),
  durationSeconds: z.number().int().min(0),
  completed: z.boolean(),
  turns: z.number().int().min(0).optional(),
  improvements: z.array(z.string()).optional(),
  weaknessesTargeted: z.array(z.string()).optional(),
  xpAwarded: z.number().optional(),
  createdAt: z.string().min(1),
  meaningfulCompletion: z.boolean().optional(),
  practicePackMode: z.enum(['quick_rep', 'standard', 'deeper_debrief']).optional(),
  examXpMeta: examXpMetaSchema.optional(),
  examTasksCompleted: z.number().int().min(0).optional(),
  examMinTasks: z.number().int().min(0).optional(),
  xpBandSeed: z.string().optional(),
  examProfileId: z.string().optional(),
  examLevel: z.enum(['A1', 'A2', 'B1']).optional(),
})
