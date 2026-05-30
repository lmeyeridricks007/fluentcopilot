/**
 * Exam Prep — Zod contracts + inferred TypeScript types.
 *
 * - **Content**: `ExamModule`, `ExamExercise`, `RubricDefinition`, `ModelAnswer`
 * - **Runtime**: `ExamSession`, `ExamAttempt`
 * - **Results**: `ExamScoringResult`, `FeedbackBlock`, `ExamResultSummary`
 *
 * Validate fixtures: `npm run validate-exam`
 * @see docs/product/exam-prep-schema-overview.md
 */

export * from '@/lib/schemas/exam/examShared.schema'
export * from '@/lib/schemas/exam/examType.schema'
export * from '@/lib/schemas/exam/rubricDefinition.schema'
export * from '@/lib/schemas/exam/modelAnswer.schema'
export * from '@/lib/schemas/exam/speakingExam.schema'
export * from '@/lib/schemas/exam/writingExam.schema'
export * from '@/lib/schemas/exam/examExercise.schema'
export * from '@/lib/schemas/exam/examAttempt.schema'
export * from '@/lib/schemas/exam/scoringResult.schema'
export * from '@/lib/schemas/exam/feedbackBlock.schema'
export * from '@/lib/schemas/exam/examModule.schema'
export * from '@/lib/schemas/exam/examSession.schema'
export * from '@/lib/schemas/exam/examResultSummary.schema'
export * from '@/lib/schemas/exam/speakingTrainingItem.schema'
export * from '@/lib/schemas/exam/speakingCoachOutput.schema'
export * from '@/lib/schemas/exam/writingTrainingItem.schema'
export * from '@/lib/schemas/exam/writingCoachOutput.schema'
export * from '@/lib/schemas/exam/listeningTrainingItem.schema'
export * from '@/lib/schemas/exam/readingTrainingItem.schema'
