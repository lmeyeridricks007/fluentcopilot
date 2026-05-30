/**
 * Input shape for readiness recording — mirrors ApplyExamLoopInput (avoid importing extractor).
 */
import type { SpeakingSimulationQuestionBundle } from '@/lib/exam-prep/speaking/types'
import type { SpeakingTrainingEvaluationBundle } from '@/lib/exam-prep/speaking/types'
import type { WritingSimulationTaskBundle } from '@/lib/exam-prep/writing/types'
import type { WritingTrainingEvaluationBundle } from '@/lib/exam-prep/writing/types'
import type { KmnTopicId } from '@/lib/exam-prep/kmn/types'
import type { ListeningQuestionType } from '@/lib/schemas/exam/listeningTrainingItem.schema'

export type ExamReadinessLoopInput =
  | { kind: 'speaking_training'; bundle: SpeakingTrainingEvaluationBundle }
  | { kind: 'speaking_simulation'; bundle: SpeakingSimulationQuestionBundle }
  | { kind: 'writing_training'; bundle: WritingTrainingEvaluationBundle }
  | { kind: 'writing_simulation'; bundle: WritingSimulationTaskBundle }
  | {
      kind: 'listening'
      itemId: string
      attemptId: string
      questionType: ListeningQuestionType
      correct: boolean
      replayCount: number
      maxReplay: number
    }
  | {
      kind: 'reading'
      itemId: string
      attemptId: string
      readingSkill: 'scanning' | 'comprehension'
      correct: boolean
    }
  | {
      kind: 'kmn'
      topicId: KmnTopicId
      surface: 'quiz' | 'scenario' | 'flashcard'
      conceptOrStepId: string
      correct: boolean
      attemptId: string
    }
