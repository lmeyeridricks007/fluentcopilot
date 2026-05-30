/**
 * Personalization Engine — skill score computation from progress data.
 */

import type { SkillDimension, SkillState, TrendDirection } from '../types/skills.js'
import type { ProgressSnapshot } from '../types/progress.js'
import { getLessonCompletions, getQuizResults, getConversationSummaries } from '../models/profileStore.js'

const DIMENSIONS: SkillDimension[] = [
  'vocabulary',
  'grammar',
  'listening',
  'speaking',
  'pronunciation',
  'reading',
  'conversation_fluency',
]

function defaultSkillState(dimension: SkillDimension): SkillState {
  return {
    dimension,
    score: 0.5,
    confidence: 0,
    recent_performance: 0.5,
    trend: 'stable',
    last_updated: new Date().toISOString(),
    sample_count: 0,
  }
}

function computeTrend(history: number[]): TrendDirection {
  if (history.length < 2) return 'stable'
  const recent = history.slice(-3)
  const older = history.slice(-6, -3)
  if (older.length === 0) return 'stable'
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
  const diff = recentAvg - olderAvg
  if (diff > 0.05) return 'up'
  if (diff < -0.05) return 'down'
  return 'stable'
}

export function computeSkillProfile(userId: string, progress: ProgressSnapshot | null): Record<SkillDimension, SkillState> {
  const now = new Date().toISOString()
  const result = {} as Record<SkillDimension, SkillState>

  const lessons = getLessonCompletions(userId)
  const quizzes = getQuizResults(userId)
  const conversations = getConversationSummaries(userId)

  for (const dim of DIMENSIONS) {
    const state = defaultSkillState(dim)

    if (dim === 'vocabulary' || dim === 'grammar' || dim === 'reading') {
      const lessonScores = lessons.filter((l) => l.score != null).map((l) => l.score! / 100)
      const quizAcc = quizzes.map((q) => q.accuracy)
      const combined = [...lessonScores, ...quizAcc]
      if (combined.length > 0) {
        state.score = combined.reduce((a, b) => a + b, 0) / combined.length
        state.recent_performance = combined.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, combined.length)
        state.sample_count = combined.length
        state.confidence = Math.min(1, combined.length / 10)
        state.trend = computeTrend(combined)
      }
    }

    if (dim === 'listening') {
      if (progress?.listening_comprehension_avg != null) {
        state.score = progress.listening_comprehension_avg
        state.recent_performance = state.score
        state.sample_count = 1
        state.confidence = 0.3
      }
    }

    if (dim === 'speaking' || dim === 'conversation_fluency') {
      if (conversations.length > 0) {
        const fluencies = conversations.map((c) => c.fluency_score ?? 0.5)
        state.score = fluencies.reduce((a, b) => a + b, 0) / fluencies.length
        state.recent_performance = fluencies.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, fluencies.length)
        state.sample_count = conversations.length
        state.confidence = Math.min(1, conversations.length / 5)
        state.trend = computeTrend(fluencies)
      }
    }

    if (dim === 'pronunciation') {
      if (progress?.pronunciation_score_avg != null) {
        state.score = progress.pronunciation_score_avg
        state.recent_performance = state.score
        state.sample_count = 1
        state.confidence = 0.3
      }
    }

    state.last_updated = now
    result[dim] = state
  }

  return result
}
