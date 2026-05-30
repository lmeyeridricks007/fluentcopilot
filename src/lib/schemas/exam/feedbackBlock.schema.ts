/**
 * Learner-facing structured feedback after evaluation (training rich, simulation concise).
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { examModeSchema } from '@/lib/schemas/exam/examShared.schema'

export const rubricFeedbackNoteSchema = z.object({
  categoryKey: z.string().min(1),
  headline: z.string().min(1).optional(),
  detail: z.string().min(1),
  metadata: metadataSchema,
})

export const nextBestActionSchema = z.object({
  id: idSchema,
  kind: z.enum(['exam_exercise', 'practice_scenario', 'skill_track', 'review_session', 'lesson']),
  targetId: idSchema,
  label: z.string().min(1),
  rationale: z.string().min(1).optional(),
  metadata: metadataSchema,
})

/** Hints for generating or attaching SRS / review rows (downstream ingest). */
export const reviewExtractionCandidateSchema = z.object({
  /** Suggested stable id for dedupe. */
  suggestedReviewItemId: idSchema.optional(),
  reviewItemType: z.enum(['vocab', 'phrase', 'grammar', 'listening', 'speaking']),
  prompt: z.string().min(1),
  expectedAnswer: z.union([z.string(), z.array(z.string().min(1)).min(1)]),
  tags: z.array(z.string().min(1)).optional(),
  metadata: metadataSchema,
})

export const grammarNoteSchema = z.object({
  id: z.string().min(1).optional(),
  pattern: z.string().min(1),
  exampleWrong: z.string().optional(),
  exampleRight: z.string().optional(),
  metadata: metadataSchema,
})

export const feedbackBlockSchema = z.object({
  id: idSchema,
  examAttemptId: idSchema,
  examExerciseId: idSchema,
  mode: examModeSchema,
  summary: z.string().min(1),
  strengths: z.array(z.string().min(1)).optional(),
  improvements: z.array(z.string().min(1)).optional(),
  rubricFeedback: z.array(rubricFeedbackNoteSchema).optional(),
  correctedVersion: z.string().min(1).optional(),
  betterPhrasing: z.string().min(1).optional(),
  vocabularySuggestions: z.array(z.string().min(1)).optional(),
  grammarNotes: z.array(grammarNoteSchema).optional(),
  nextBestActions: z.array(nextBestActionSchema).optional(),
  reviewCandidates: z.array(reviewExtractionCandidateSchema).optional(),
  /** If false, UI should show summary-only (simulation mid-flow). */
  showDetail: z.boolean().optional(),
  metadata: metadataSchema,
})

export type RubricFeedbackNote = z.infer<typeof rubricFeedbackNoteSchema>
export type NextBestAction = z.infer<typeof nextBestActionSchema>
export type ReviewExtractionCandidate = z.infer<typeof reviewExtractionCandidateSchema>
export type GrammarNote = z.infer<typeof grammarNoteSchema>
export type FeedbackBlock = z.infer<typeof feedbackBlockSchema>
