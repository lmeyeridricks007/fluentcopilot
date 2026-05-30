/**
 * Mock API for E-16 curriculum path — swap for real fetch when backend is ready.
 */

import type { StudyCefrLevel } from '@/store/studyContextStore'
import {
  buildCurriculumPathModel,
  buildTodayPlan,
  buildDemoRevisionExercises,
  DEMO_WEAK_AREAS,
  type CurriculumPathModel,
  type TodayPlanModel,
  type WeakAreaTag,
  type RevisionSessionModel,
} from '@/features/curriculum/types'
import type { DemoLesson, DemoLessonProgress } from '@/demo-data'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export interface StudyContextDto {
  activeCefrLevel: StudyCefrLevel
  dailyLessonTarget: 1 | 2 | 3
}

let revisionNonce = 0

export const curriculumMockService = {
  async getPath(lessons: DemoLesson[], progress: DemoLessonProgress[], level: string): Promise<CurriculumPathModel> {
    await delay(180)
    return buildCurriculumPathModel(lessons, progress, level)
  },

  async getToday(path: CurriculumPathModel, lessons: DemoLesson[], dailyTarget: 1 | 2 | 3): Promise<TodayPlanModel> {
    await delay(120)
    return buildTodayPlan(path, dailyTarget, lessons)
  },

  async getWeakAreas(): Promise<WeakAreaTag[]> {
    await delay(150)
    return [...DEMO_WEAK_AREAS]
  },

  async getStudyContext(current: StudyContextDto): Promise<StudyContextDto> {
    await delay(80)
    return { ...current }
  },

  async saveStudyContext(ctx: StudyContextDto): Promise<{ ok: true }> {
    await delay(200)
    void ctx
    return { ok: true }
  },

  async createRevisionSession(completedLessonCount: number): Promise<RevisionSessionModel> {
    await delay(220)
    void completedLessonCount
    revisionNonce += 1
    return {
      sessionId: `rev-mock-${revisionNonce}`,
      exercises: buildDemoRevisionExercises(),
    }
  },

  async submitRevision(
    sessionId: string,
    answers: Record<string, string>
  ): Promise<{ scorePercent: number; sessionId: string }> {
    await delay(250)
    const exercises = buildDemoRevisionExercises()
    let correct = 0
    for (const ex of exercises) {
      if (answers[ex.id] === ex.correctOptionId) correct += 1
    }
    const scorePercent = exercises.length === 0 ? 0 : Math.round((correct / exercises.length) * 100)
    return { scorePercent, sessionId }
  },
}
