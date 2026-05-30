/**
 * Learner app — typed service contracts.
 * Implement with mocks or real API later.
 */

export interface LearnerProfile {
  id: string
  name: string
  email: string
  nativeLanguage: string
  currentLevel: string
  targetLevel: string
  targetObjective?: string
  dailyLearningGoalMinutes?: number
  country?: string
  timeInNetherlands?: string
}

export interface LessonSummary {
  id: string
  title: string
  description: string
  level: string
  topic: string
  type: string
  durationMinutes: number
  completed?: boolean
  progress?: number
  isPremium?: boolean
}

export interface ScenarioSummary {
  id: string
  title: string
  description: string
  category: string
  level: string
}

export interface ProgressSummary {
  xp: number
  streak: number
  lessonsCompleted: number
  dailyGoalMinutes: number
  weeklyMinutes: number
}

export interface AuthService {
  getCurrentUser(): Promise<LearnerProfile | null>
  signOut(): Promise<void>
}

export interface OnboardingService {
  submitOnboarding(data: Record<string, unknown>): Promise<void>
}

export interface RecommendationsService {
  getContinueLearning(): Promise<LessonSummary[]>
  getRecommended(): Promise<LessonSummary[]>
}

export interface LessonsService {
  list(filters?: { level?: string; topic?: string; type?: string }): Promise<LessonSummary[]>
  getById(id: string): Promise<LessonSummary | null>
}

export interface ProgressService {
  getSummary(): Promise<ProgressSummary>
}

export interface PremiumService {
  isPremium(): Promise<boolean>
}
