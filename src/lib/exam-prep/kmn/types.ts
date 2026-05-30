export type KmnTopicId = 'work' | 'healthcare' | 'government' | 'culture'

export type KmnActivityKind = 'quiz' | 'flashcards' | 'scenario'

export type KmnSubtopic = {
  id: string
  titleNl: string
  blurbNl: string
}

export type KmnTopic = {
  id: KmnTopicId
  titleNl: string
  taglineNl: string
  introNl: string
  subtopics: KmnSubtopic[]
}

export type KmnQuizQuestion = {
  id: string
  topicId: KmnTopicId
  subtopicId: string
  level: 1 | 2 | 3
  /** Optional override; otherwise derived from `promptNl` / `topicId`. */
  sceneId?: string
  promptNl: string
  options: { id: string; labelNl: string }[]
  correctOptionId: string
  explanationNl: string
  /** Boost this SRS row when the learner misses the question. */
  linkedReviewItemId?: string
}

export type KmnFlashcardDef = {
  id: string
  topicId: KmnTopicId
  subtopicId: string
  frontNl: string
  backNl: string
  exampleNl?: string
}

export type KmnScenario = {
  id: string
  topicId: KmnTopicId
  subtopicId: string
  level: 1 | 2 | 3
  titleNl: string
  situationNl: string
  choices: { id: string; labelNl: string; isCorrect: boolean; feedbackNl: string }[]
  linkedReviewItemId?: string
}
