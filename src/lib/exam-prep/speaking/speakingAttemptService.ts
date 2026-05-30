/**
 * Normalize a speaking training submission into exam attempt shapes (runtime, client-side).
 */
import type { ExamAttempt } from '@/lib/schemas/exam/examAttempt.schema'
import type { ExamResponseModality } from '@/lib/schemas/exam/examShared.schema'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import type { SpeakingInputMode } from '@/lib/exam-prep/speaking/types'

export function newExamPrepRuntimeIds(): {
  attemptId: string
  scoringResultId: string
  feedbackBlockId: string
} {
  const gen = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return {
    attemptId: gen(),
    scoringResultId: gen(),
    feedbackBlockId: gen(),
  }
}

function modalityForInputMode(mode: SpeakingInputMode): ExamResponseModality {
  return mode === 'voice' ? 'audio_and_transcript' : 'text'
}

export function buildSpeakingTrainingAttempt(input: {
  ids: { attemptId: string }
  userId?: string
  examExerciseId: string
  responseText: string
  inputMode: SpeakingInputMode
  transcriptConfidence?: number
  startedAtIso: string
  submittedAtIso: string
}): ExamAttempt {
  const userId = input.userId ?? getRetentionUserId()
  const modality = modalityForInputMode(input.inputMode)
  const text = input.responseText.trim()

  return {
    id: input.ids.attemptId,
    userId,
    examExerciseId: input.examExerciseId,
    examType: 'speaking',
    mode: 'training',
    startedAt: input.startedAtIso,
    submittedAt: input.submittedAtIso,
    rawResponse:
      input.inputMode === 'voice'
        ? {
            kind: 'text',
            text,
            metadata: { source: 'speech_transcript' },
          }
        : {
            kind: 'text',
            text,
            metadata: { source: 'typed' },
          },
    normalizedResponse: {
      text,
      transcript: input.inputMode === 'voice' ? text : undefined,
      metadata: {},
    },
    modality,
    speakingPayload: {
      transcript: text,
      transcriptConfidence: input.transcriptConfidence,
      transcriptLocale: 'nl-NL',
      metadata: {},
    },
    metadata: {
      flow: 'exam_prep_speaking_training',
      inputMode: input.inputMode,
    },
  }
}

export function buildSpeakingSimulationAttempt(input: {
  ids: { attemptId: string }
  userId?: string
  examExerciseId: string
  responseText: string
  inputMode: SpeakingInputMode
  transcriptConfidence?: number
  startedAtIso: string
  submittedAtIso: string
  timedOut: boolean
}): ExamAttempt {
  const userId = input.userId ?? getRetentionUserId()
  const modality = modalityForInputMode(input.inputMode)
  const text = input.responseText.trim()

  return {
    id: input.ids.attemptId,
    userId,
    examExerciseId: input.examExerciseId,
    examType: 'speaking',
    mode: 'simulation',
    startedAt: input.startedAtIso,
    submittedAt: input.submittedAtIso,
    rawResponse:
      input.inputMode === 'voice'
        ? {
            kind: 'text',
            text,
            metadata: { source: 'speech_transcript' },
          }
        : {
            kind: 'text',
            text,
            metadata: { source: 'typed' },
          },
    normalizedResponse: {
      text,
      transcript: input.inputMode === 'voice' ? text : undefined,
      metadata: {},
    },
    modality,
    speakingPayload: {
      transcript: text,
      transcriptConfidence: input.transcriptConfidence,
      transcriptLocale: 'nl-NL',
      metadata: {},
    },
    metadata: {
      flow: 'exam_prep_speaking_simulation',
      inputMode: input.inputMode,
      timedOut: input.timedOut,
    },
  }
}
