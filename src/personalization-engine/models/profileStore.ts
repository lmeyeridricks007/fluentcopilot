/**
 * Personalization Engine — in-memory learner profile and progress store.
 * Replace with DB/API in production.
 */

import type { LearnerProfile } from '../types/profile.js'
import type { ProgressSnapshot } from '../types/progress.js'
import type { LessonCompletion, QuizResult, ConversationSessionSummary } from '../types/progress.js'
import type { SpacedRepetitionItem } from '../types/learning-path.js'

const profiles = new Map<string, LearnerProfile>()
const progressSnapshots = new Map<string, ProgressSnapshot>()
const lessonCompletions = new Map<string, LessonCompletion[]>()
const quizResults = new Map<string, QuizResult[]>()
const conversationSummaries = new Map<string, ConversationSessionSummary[]>()
const spacedItems = new Map<string, SpacedRepetitionItem[]>()

export function getProfile(userId: string): LearnerProfile | null {
  return profiles.get(userId) ?? null
}

export function setProfile(profile: LearnerProfile): void {
  profiles.set(profile.user_id, { ...profile, updated_at: new Date().toISOString() })
}

export function getProgressSnapshot(userId: string): ProgressSnapshot | null {
  return progressSnapshots.get(userId) ?? null
}

export function setProgressSnapshot(snapshot: ProgressSnapshot): void {
  progressSnapshots.set(snapshot.user_id, { ...snapshot })
}

export function getLessonCompletions(userId: string): LessonCompletion[] {
  return lessonCompletions.get(userId) ?? []
}

export function addLessonCompletion(userId: string, completion: LessonCompletion): void {
  const list = lessonCompletions.get(userId) ?? []
  list.push(completion)
  lessonCompletions.set(userId, list)
}

export function getQuizResults(userId: string): QuizResult[] {
  return quizResults.get(userId) ?? []
}

export function addQuizResult(userId: string, result: QuizResult): void {
  const list = quizResults.get(userId) ?? []
  list.push(result)
  quizResults.set(userId, list)
}

export function getConversationSummaries(userId: string): ConversationSessionSummary[] {
  return conversationSummaries.get(userId) ?? []
}

export function addConversationSummary(userId: string, summary: ConversationSessionSummary): void {
  const list = conversationSummaries.get(userId) ?? []
  list.push(summary)
  conversationSummaries.set(userId, list)
}

export function getSpacedRepetitionItems(userId: string): SpacedRepetitionItem[] {
  return spacedItems.get(userId) ?? []
}

export function upsertSpacedItem(userId: string, item: SpacedRepetitionItem): void {
  const list = spacedItems.get(userId) ?? []
  const idx = list.findIndex((i) => i.item_id === item.item_id)
  if (idx >= 0) list[idx] = item
  else list.push(item)
  spacedItems.set(userId, list)
}
