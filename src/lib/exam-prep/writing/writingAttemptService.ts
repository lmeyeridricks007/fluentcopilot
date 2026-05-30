/**
 * Normalize writing training submission into `ExamAttempt` (client runtime).
 */
import type { ExamAttempt } from '@/lib/schemas/exam/examAttempt.schema'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { countWords } from '@/lib/exam-scoring/scoringGuards'

export { newExamPrepRuntimeIds } from '@/lib/exam-prep/speaking/speakingAttemptService'

export function composeWritingAnswerText(input: {
  bodyText: string
  fieldValues?: Record<string, string>
  formLabels?: Record<string, string>
}): string {
  const t = input.bodyText.trim()
  if (!input.fieldValues || Object.keys(input.fieldValues).length === 0) return t
  const lines: string[] = []
  for (const [id, val] of Object.entries(input.fieldValues)) {
    const label = input.formLabels?.[id] ?? id
    const v = val.trim()
    if (v) lines.push(`${label}: ${v}`)
  }
  return lines.length > 0 ? lines.join('\n') : t
}

export function buildWritingTrainingAttempt(input: {
  ids: { attemptId: string }
  userId?: string
  examExerciseId: string
  bodyText: string
  fieldValues?: Record<string, string>
  startedAtIso: string
  submittedAtIso: string
}): ExamAttempt {
  const userId = input.userId ?? getRetentionUserId()
  const text = input.bodyText.trim()
  const wc = countWords(text)

  const hasFormFields = input.fieldValues && Object.keys(input.fieldValues).length > 0

  return {
    id: input.ids.attemptId,
    userId,
    examExerciseId: input.examExerciseId,
    examType: 'writing',
    mode: 'training',
    startedAt: input.startedAtIso,
    submittedAt: input.submittedAtIso,
    rawResponse: hasFormFields
      ? {
          kind: 'form',
          fieldValues: input.fieldValues ?? {},
          metadata: { composedText: text, source: 'exam_prep_writing_training' },
        }
      : {
          kind: 'text',
          text,
          metadata: { source: 'typed' },
        },
    normalizedResponse: {
      text,
      fieldValues: input.fieldValues,
      metadata: {},
    },
    modality: 'text',
    writingPayload: {
      bodyText: text,
      fieldValues: input.fieldValues,
      wordCount: wc,
      metadata: { flow: 'exam_prep_writing_training' },
    },
    metadata: {
      flow: 'exam_prep_writing_training',
    },
  }
}

export function buildWritingSimulationAttempt(input: {
  ids: { attemptId: string }
  userId?: string
  examExerciseId: string
  bodyText: string
  fieldValues?: Record<string, string>
  startedAtIso: string
  submittedAtIso: string
  timedOut: boolean
}): ExamAttempt {
  const userId = input.userId ?? getRetentionUserId()
  const text = input.bodyText.trim()
  const wc = countWords(text)
  const hasFormFields = input.fieldValues && Object.keys(input.fieldValues).length > 0

  return {
    id: input.ids.attemptId,
    userId,
    examExerciseId: input.examExerciseId,
    examType: 'writing',
    mode: 'simulation',
    startedAt: input.startedAtIso,
    submittedAt: input.submittedAtIso,
    rawResponse: hasFormFields
      ? {
          kind: 'form',
          fieldValues: input.fieldValues ?? {},
          metadata: { composedText: text, source: 'exam_prep_writing_simulation' },
        }
      : {
          kind: 'text',
          text,
          metadata: { source: 'typed' },
        },
    normalizedResponse: {
      text,
      fieldValues: input.fieldValues,
      metadata: {},
    },
    modality: 'text',
    writingPayload: {
      bodyText: text,
      fieldValues: input.fieldValues,
      wordCount: wc,
      metadata: { flow: 'exam_prep_writing_simulation' },
    },
    metadata: {
      flow: 'exam_prep_writing_simulation',
      timedOut: input.timedOut,
    },
  }
}
