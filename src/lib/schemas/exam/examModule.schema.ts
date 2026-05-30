/**
 * Top-level exam-prep module (navigation / catalog grouping), e.g. "A2 Speaking Prep".
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { cefrBandSchema } from '@/lib/schemas/practice/practiceShared.schema'
import { examModeSchema } from '@/lib/schemas/exam/examShared.schema'
import { examTypeKeySchema } from '@/lib/schemas/exam/examType.schema'

export const examModuleSectionSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  exerciseIds: z.array(idSchema).min(1),
  metadata: metadataSchema,
})

export const examModuleSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  /** Use `mixed` for packs that span domains; rubrics stay per-exercise. */
  examType: examTypeKeySchema,
  level: cefrBandSchema,
  description: z.string().min(1).optional(),
  modesSupported: z.array(examModeSchema).min(1),
  /** Flat list of all exercise ids in module (must match union of sections if both set). */
  exerciseRefs: z.array(idSchema).min(1),
  sections: z.array(examModuleSectionSchema).optional(),
  /** Default rubric pack for this module (exercises may override). */
  defaultRubricPackId: idSchema.optional(),
  metadata: metadataSchema,
})

export type ExamModuleSection = z.infer<typeof examModuleSectionSchema>
export type ExamModule = z.infer<typeof examModuleSchema>
