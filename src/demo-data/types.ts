/**
 * Demo data types — aligned with src/mocks and feature mocks.
 */

export interface DemoLesson {
  id: string
  title: string
  description: string
  level: string
  topic: string
  type: 'vocabulary' | 'grammar' | 'dialogue' | 'listening' | 'quiz'
  durationMinutes: number
  completed?: boolean
  progress?: number
  isPremium?: boolean
}

export interface DemoProgressSummary {
  xp: number
  streak: number
  lessonsCompleted: number
  dailyGoal: number
  dailyGoalMinutes: number
  weeklyMinutes: number
}

export interface DemoScenario {
  id: string
  title: string
  description: string
  category: string
  level: string
  icon: string
}

export interface DemoLessonProgress {
  lessonId: string
  status: 'in_progress' | 'completed'
  lastStepIndex?: number
  score?: number
  completedAt?: string
  updatedAt: string
}

export interface DemoUsageCounts {
  lessonsCompletedCount: number
  scenariosCompletedCount: number
  periodKey: string
}

/** Achievement definition + earned state for demo (e.g. Achievements page). */
export interface DemoAchievement {
  id: string
  name: string
  description: string
  /** Icon key for UI to map to component: star, trophy, target, etc. */
  iconId: string
  earned: boolean
  earnedAt?: string
}

export interface DemoDataset {
  lessons: DemoLesson[]
  recommended: DemoLesson[]
  progress: DemoProgressSummary
  scenarios: DemoScenario[]
  lessonProgress: DemoLessonProgress[]
  usage: DemoUsageCounts
  achievements: DemoAchievement[]
}

export type DemoScenarioId = 'happy-path' | 'new-user' | 'at-cap' | 'trial' | 'premium' | 'power-user' | 'edge-case'
