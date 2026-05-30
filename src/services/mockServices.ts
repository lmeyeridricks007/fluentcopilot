/**
 * Learner app — mock service implementations.
 * Uses seeded data; swap for API calls when backend exists.
 */

import { useAuthStore } from '@/store/authStore'
import { MOCK_LESSONS } from '@/mocks/lessons'
import { MOCK_SCENARIOS } from '@/mocks/scenarios'
import { MOCK_PROGRESS } from '@/mocks/progress'
import type { LearnerProfile, LessonSummary, ProgressSummary } from './contracts'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

function profileFromStore(): LearnerProfile | null {
  const user = useAuthStore.getState().user
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    nativeLanguage: user.nativeLanguage,
    currentLevel: user.currentLevel,
    targetLevel: user.targetLevel,
    targetObjective: user.targetObjective,
    dailyLearningGoalMinutes: user.dailyLearningGoalMinutes,
    country: user.country,
    timeInNetherlands: user.timeInNetherlands,
  }
}

export const authService = {
  async getCurrentUser(): Promise<LearnerProfile | null> {
    await delay(100)
    return profileFromStore()
  },
  async signOut(): Promise<void> {
    await delay(50)
    useAuthStore.getState().logout()
  },
}

export const onboardingService = {
  async submitOnboarding(): Promise<void> {
    await delay(200)
  },
}

export const recommendationsService = {
  async getContinueLearning(): Promise<LessonSummary[]> {
    await delay(150)
    return MOCK_LESSONS.filter((l) => !l.completed).slice(0, 3).map(lessonToSummary)
  },
  async getRecommended(): Promise<LessonSummary[]> {
    await delay(150)
    return MOCK_LESSONS.filter((l) => !l.completed).slice(0, 5).map(lessonToSummary)
  },
}

function lessonToSummary(l: { id: string; title: string; description: string; level: string; topic: string; type: string; durationMinutes: number; completed?: boolean; progress?: number; isPremium?: boolean }): LessonSummary {
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    level: l.level,
    topic: l.topic,
    type: l.type,
    durationMinutes: l.durationMinutes,
    completed: l.completed,
    progress: l.progress,
    isPremium: l.isPremium,
  }
}

export const lessonsService = {
  async list(): Promise<LessonSummary[]> {
    await delay(120)
    return MOCK_LESSONS.map(lessonToSummary)
  },
  async getById(id: string): Promise<LessonSummary | null> {
    await delay(80)
    const lesson = MOCK_LESSONS.find((l) => l.id === id)
    return lesson ? lessonToSummary(lesson) : null
  },
}

export const progressService = {
  async getSummary(): Promise<ProgressSummary> {
    await delay(100)
    const user = useAuthStore.getState().user
    const dailyGoalMinutes = user?.dailyLearningGoalMinutes ?? MOCK_PROGRESS.dailyGoalMinutes
    return { ...MOCK_PROGRESS, dailyGoalMinutes }
  },
}

export const premiumService = {
  async isPremium(): Promise<boolean> {
    await delay(50)
    return false
  },
}

export { MOCK_SCENARIOS }
