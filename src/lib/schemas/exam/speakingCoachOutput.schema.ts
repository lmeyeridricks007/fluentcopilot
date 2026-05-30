/**
 * Learner-facing coach output for Speaking Exam Prep (training).
 * Sits alongside formal `ExamScoringEngineOutput` / `ExamScoringResult` — not a substitute for rubric scores.
 */
import { z } from 'zod'

/** Aligned with `SpeakingEngineCategoryKey` / formal speaking rubric. */
export const speakingCoachRubricCategoryKeySchema = z.enum([
  'execution',
  'vocabulary',
  'grammar',
  'fluency',
  'clearness',
  'pronunciation',
])

export const speakingCorrectionItemSchema = z.object({
  /** Short slice of the learner answer (as said/typed). */
  originalFragment: z.string().min(1),
  correctedFragment: z.string().min(1),
  explanationNl: z.string().min(1),
})

export const speakingCategoryCoachEntrySchema = z.object({
  categoryKey: speakingCoachRubricCategoryKeySchema,
  labelNl: z.string().min(1),
  score: z.number().nonnegative(),
  maxScore: z.number().positive(),
  /** Primary learner-facing line for this category. */
  learnerFeedbackNl: z.string().min(1),
  /** Optional extra detail (aligned with score; avoid duplicating learnerFeedbackNl). */
  evidenceNl: z.string().min(1).optional(),
})

export const speakingCoachOutputSchema = z.object({
  categoryEntries: z.array(speakingCategoryCoachEntrySchema).min(1),
  corrections: z.array(speakingCorrectionItemSchema).max(5),
  /** Rewritten learner answer — same intent, more natural A2 Dutch. */
  improvedVersionDutch: z.string().min(1),
  improvedVersionNoteNl: z.string().min(1),
  /** Distinct from model answer: exam-style strong example. */
  idealAnswerDutch: z.string().min(1),
  idealAnswerNoteEn: z.string().min(1).optional(),
  nextStepNl: z.string().min(1),
  /** Tags for weak-area / mistake orientation (e.g. grammar, vocab). */
  mistakeOrientedTags: z.array(z.string().min(1)).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type SpeakingCorrectionItem = z.infer<typeof speakingCorrectionItemSchema>
export type SpeakingCategoryCoachEntry = z.infer<typeof speakingCategoryCoachEntrySchema>
export type SpeakingCoachOutput = z.infer<typeof speakingCoachOutputSchema>
