/**
 * Structured accessors over KMN catalog + seed content.
 */
import { getKmnTopic, KMN_TOPICS } from '@/lib/exam-prep/kmn/kmnCatalog'
import { KMN_FLASHCARDS, KMN_QUIZ_QUESTIONS, KMN_SCENARIOS } from '@/lib/exam-prep/kmn/kmnSeedContent'
import type { KmnFlashcardDef, KmnQuizQuestion, KmnScenario, KmnTopic, KmnTopicId } from '@/lib/exam-prep/kmn/types'

export function listKmnTopics(): KmnTopic[] {
  return KMN_TOPICS
}

export function getKmnTopicOrThrow(id: string): KmnTopic {
  const t = getKmnTopic(id)
  if (!t) throw new Error(`Unknown KMN topic: ${id}`)
  return t
}

export function isKmnTopicId(id: string): id is KmnTopicId {
  return KMN_TOPICS.some((t) => t.id === id)
}

export function getKmnQuizQuestions(topicId: KmnTopicId): KmnQuizQuestion[] {
  return KMN_QUIZ_QUESTIONS.filter((q) => q.topicId === topicId)
}

export function getKmnQuizQuestionById(id: string): KmnQuizQuestion | undefined {
  return KMN_QUIZ_QUESTIONS.find((q) => q.id === id)
}

export function getKmnFlashcardDefs(topicId: KmnTopicId): KmnFlashcardDef[] {
  return KMN_FLASHCARDS.filter((f) => f.topicId === topicId)
}

export function getKmnScenarios(topicId: KmnTopicId): KmnScenario[] {
  return KMN_SCENARIOS.filter((s) => s.topicId === topicId)
}

export function getKmnScenario(scenarioId: string): KmnScenario | undefined {
  return KMN_SCENARIOS.find((s) => s.id === scenarioId)
}

export function countKmnActivities(topicId: KmnTopicId): {
  quiz: number
  flashcards: number
  scenarios: number
} {
  return {
    quiz: getKmnQuizQuestions(topicId).length,
    flashcards: getKmnFlashcardDefs(topicId).length,
    scenarios: getKmnScenarios(topicId).length,
  }
}
