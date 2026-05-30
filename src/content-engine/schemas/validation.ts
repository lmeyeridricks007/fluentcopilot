/**
 * Content engine — Zod schemas for validation reports and check results.
 */

import { z } from 'zod'

export const checkResultSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  message: z.string().optional(),
  severity: z.enum(['error', 'warning']).optional(),
})

export const validationReportSchema = z.object({
  artifact_ref: z.string(),
  passed: z.boolean(),
  checks: z.array(checkResultSchema),
  overall_score: z.number().min(0).max(100).optional(),
  recommendations: z.array(z.string()).optional(),
})

export type CheckResultInput = z.infer<typeof checkResultSchema>
export type ValidationReportInput = z.infer<typeof validationReportSchema>
