import type { A2BandId } from '@/demo-data/curriculum/a2Catalog'

export type PathStageState = 'locked' | 'active' | 'completed'

export type PathModuleState = 'locked' | 'in_progress' | 'completed'

export type LessonPathRowStatus = 'not_started' | 'in_progress' | 'completed'

/** Visual / UX category for badges (maps from schema lesson types + heuristics). */
export type LearningPathLessonBadge =
  | 'listening'
  | 'listening_reading'
  | 'grammar_patterns'
  | 'speaking'
  | 'writing'
  | 'real_life_task'
  | 'review'
  /** Schema `lessonType: checkpoint` — milestone / band checkpoint in the path. */
  | 'checkpoint'

export interface LearningPathCourseMeta {
  id: string
  title: string
  cefrLevel: string
  localeLabel: string
}

export interface LearningPathHeroModel {
  courseTitle: string
  cefrLevel: string
  currentStageBand: A2BandId
  currentStageTitle: string
  pathPercentComplete: number
  streak: number
  weeklyMinutes: number
  xp: number
  lessonsCompletedTotal: number
  continueLesson: {
    lessonId: string
    title: string
    subtitle: string
    status: LessonPathRowStatus
    href: string
  } | null
  youCanNowLine: string
  /** When A2 path is 100% complete — premium continuation CTA. */
  postA2Cta?: { href: string; label: string; hint: string }
}

export interface LearningPathActionModel {
  dailyReviewDueCount: number
  weakTagsCount: number
  continueLesson: LearningPathHeroModel['continueLesson']
  nextCheckpointLabel: string | null
  /** Estimated minutes for a daily review session (SRS due count). */
  dailyReviewEstMinutes: number
}

export interface LessonRowModel {
  lessonId: string
  title: string
  badge: LearningPathLessonBadge
  durationMinutes: number
  status: LessonPathRowStatus
  isNext: boolean
  isLocked: boolean
  goalLine: string | null
  href: string
  isPremium: boolean
}

export interface ModuleCardModel {
  id: string
  catalogUnitId: string
  title: string
  description: string
  kind: 'schema' | 'placeholder'
  totalLessons: number
  completedLessons: number
  state: PathModuleState
  grammarOrOutcomeLine: string
  lessons: LessonRowModel[]
  defaultExpanded: boolean
  lessonHref: (lessonId: string) => string
}

export interface StageSectionModel {
  bandId: A2BandId
  title: string
  subtitle: string
  description: string
  grammarFocus: string
  state: PathStageState
  modulesDone: number
  modulesTotal: number
  modules: ModuleCardModel[]
  defaultExpanded: boolean
}

export interface LearningPathViewModel {
  course: LearningPathCourseMeta
  hero: LearningPathHeroModel
  actions: LearningPathActionModel
  stages: StageSectionModel[]
}
