import type { DemoLesson } from '@/demo-data'
import { type A2BandId, a2BandOrder } from '@/demo-data/curriculum/a2Catalog'
import {
  SCHEMA_PEOPLE_DAILY_MANIFEST,
  SCHEMA_PEOPLE_DAILY_PATH_UNITS,
} from '@/demo-data/curriculum/schemaPeopleDailyPath'

export type LessonPathStatus = 'not_started' | 'in_progress' | 'completed'

export interface CurriculumPathLesson {
  lessonId: string
  title: string
  level: string
  durationMinutes: number
  status: LessonPathStatus
  isPremium?: boolean
}

export interface CurriculumPathUnit {
  id: string
  title: string
  summary?: string
  /** A2 sub-band from catalog (optional for non-A2 paths). */
  a2Band?: A2BandId
  lessons: CurriculumPathLesson[]
  completedLessons: number
  totalLessons: number
}

export interface CurriculumPathModel {
  locale: string
  cefrLevel: string
  manifestVersion: number
  pathPercentComplete: number
  units: CurriculumPathUnit[]
  nextLesson: CurriculumPathLesson | null
}

export interface TodayPlanItem {
  lessonId: string
  title: string
  level: string
  durationMinutes: number
  role: 'continue' | 'next'
  reason: string
}

export interface TodayPlanModel {
  planDate: string
  items: TodayPlanItem[]
}

export interface WeakAreaTag {
  tag: string
  wrongCount: number
  rightCount: number
  lastWrongAt: string
}

export interface RevisionExercise {
  id: string
  question: string
  options: { id: string; text: string }[]
  correctOptionId: string
}

export interface RevisionSessionModel {
  sessionId: string
  exercises: RevisionExercise[]
}

function curriculumUnitsForLevel(cefrLevel: string): {
  id: string
  title: string
  summary: string
  lessonIds: string[]
  a2Band: A2BandId
}[] {
  if (cefrLevel === 'A2') return SCHEMA_PEOPLE_DAILY_PATH_UNITS
  return []
}

function lessonStatus(
  lessonId: string,
  progress: { lessonId: string; status: 'in_progress' | 'completed' }[]
): LessonPathStatus {
  const row = progress.find((p) => p.lessonId === lessonId)
  if (!row) return 'not_started'
  if (row.status === 'completed') return 'completed'
  return 'in_progress'
}

/** Sequential band lock: prior-band lessons must all be `completed`. */
export function isA2LessonSequentialLocked(
  lessonId: string,
  units: CurriculumPathUnit[],
  lessonProgress: { lessonId: string; status: 'in_progress' | 'completed' }[]
): boolean {
  const unit = units.find((u) => u.lessons.some((l) => l.lessonId === lessonId))
  if (!unit?.a2Band) return false
  const need = a2BandOrder(unit.a2Band)
  if (need <= 1) return false
  for (const u of units) {
    const ub = u.a2Band ? a2BandOrder(u.a2Band) : 0
    if (ub >= need) break
    for (const l of u.lessons) {
      if (lessonStatus(l.lessonId, lessonProgress) !== 'completed') return true
    }
  }
  return false
}

export function buildCurriculumPathModel(
  lessons: DemoLesson[],
  lessonProgress: { lessonId: string; status: 'in_progress' | 'completed' }[],
  cefrLevel: string
): CurriculumPathModel {
  const byId = new Map(lessons.map((l) => [l.id, l]))
  const blueprint = curriculumUnitsForLevel(cefrLevel)
  const units: CurriculumPathUnit[] = blueprint.map((u) => {
    const pathLessons: CurriculumPathLesson[] = []
    for (const lid of u.lessonIds) {
      const lesson = byId.get(lid)
      if (!lesson) continue
      pathLessons.push({
        lessonId: lesson.id,
        title: lesson.title,
        level: lesson.level,
        durationMinutes: lesson.durationMinutes,
        status: lessonStatus(lid, lessonProgress),
        isPremium: lesson.isPremium,
      })
    }
    const completed = pathLessons.filter((l) => l.status === 'completed').length
    return {
      id: u.id,
      title: u.title,
      summary: u.summary,
      a2Band: u.a2Band,
      lessons: pathLessons,
      completedLessons: completed,
      totalLessons: pathLessons.length,
    }
  }).filter((u) => u.lessons.length > 0)

  const flatOrder = units.flatMap((u) => u.lessons)
  const total = flatOrder.length
  const done = flatOrder.filter((l) => l.status === 'completed').length
  const pathPercentComplete = total === 0 ? 0 : Math.round((done / total) * 100)

  const nextLesson =
    flatOrder.find((l) => l.status === 'in_progress') ??
    flatOrder.find((l) => l.status === 'not_started') ??
    null

  return {
    locale: cefrLevel === 'A2' ? SCHEMA_PEOPLE_DAILY_MANIFEST.locale : 'nl-NL',
    cefrLevel,
    manifestVersion: cefrLevel === 'A2' ? SCHEMA_PEOPLE_DAILY_MANIFEST.schema_version : 1,
    pathPercentComplete,
    units,
    nextLesson,
  }
}

export function buildTodayPlan(
  path: CurriculumPathModel,
  dailyTarget: 1 | 2 | 3,
  lessons: DemoLesson[]
): TodayPlanModel {
  const byId = new Map(lessons.map((l) => [l.id, l]))
  const planDate = new Date().toISOString().slice(0, 10)
  const items: TodayPlanItem[] = []
  const flat = path.units.flatMap((u) => u.lessons)

  const inProgress = flat.find((l) => l.status === 'in_progress')
  if (inProgress && items.length < dailyTarget) {
    const meta = byId.get(inProgress.lessonId)
    items.push({
      lessonId: inProgress.lessonId,
      title: meta?.title ?? inProgress.title,
      level: meta?.level ?? inProgress.level,
      durationMinutes: meta?.durationMinutes ?? inProgress.durationMinutes,
      role: 'continue',
      reason: 'in_progress',
    })
  }

  for (const l of flat) {
    if (items.length >= dailyTarget) break
    if (l.status !== 'not_started') continue
    if (items.some((i) => i.lessonId === l.lessonId)) continue
    const meta = byId.get(l.lessonId)
    items.push({
      lessonId: l.lessonId,
      title: meta?.title ?? l.title,
      level: meta?.level ?? l.level,
      durationMinutes: meta?.durationMinutes ?? l.durationMinutes,
      role: 'next',
      reason: 'path_order',
    })
  }

  return { planDate, items }
}

/** Demo weak-area tags (until exercise-attempt API exists). */
export const DEMO_WEAK_AREAS: WeakAreaTag[] = [
  { tag: 'present_tense', wrongCount: 3, rightCount: 5, lastWrongAt: new Date().toISOString() },
  { tag: 'word_order', wrongCount: 2, rightCount: 8, lastWrongAt: new Date().toISOString() },
]

export function buildDemoRevisionExercises(): RevisionExercise[] {
  return [
    {
      id: 'r1',
      question: 'Kies de juiste vorm: Ik ___ elke dag naar werk.',
      options: [
        { id: 'A', text: 'ga' },
        { id: 'B', text: 'gaan' },
        { id: 'C', text: 'ging' },
      ],
      correctOptionId: 'A',
    },
    {
      id: 'r2',
      question: 'Wat betekent "alstublieft" in de winkel?',
      options: [
        { id: 'A', text: 'Tot ziens' },
        { id: 'B', text: 'Alsjeblieft / graag (bij geven/ontvangen)' },
        { id: 'C', text: 'Excuseer' },
      ],
      correctOptionId: 'B',
    },
    {
      id: 'r3',
      question: 'Vul in: Hoe ___ is het? — Vijf euro.',
      options: [
        { id: 'A', text: 'veel' },
        { id: 'B', text: 'duur' },
        { id: 'C', text: 'laat' },
      ],
      correctOptionId: 'A',
    },
  ]
}
