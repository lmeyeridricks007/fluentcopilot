import type { ListeningTrainingItem } from '@/lib/schemas/exam/listeningTrainingItem.schema'

export type ListeningTrainingPhase = 'intro' | 'task_listen' | 'task_answer' | 'task_result'

export type ListeningEvaluationResult = {
  correct: boolean
  selectedOptionId: string
  correctOptionId: string
  headlineNl: string
  bodyNl: string
  keyPhraseNl?: string
}

export type ListeningSessionTaskRef = {
  orderIndex: number
  orderTotal: number
  item: ListeningTrainingItem
}
