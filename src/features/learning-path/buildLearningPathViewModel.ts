import type { A2BandId } from '@/demo-data/curriculum/a2Catalog'
import { A2_MANIFEST, A2_UNITS, a2BandOrder } from '@/demo-data/curriculum/a2Catalog'
import type { CourseModule } from '@/lib/schemas/module.schema'
import type { Lesson } from '@/lib/schemas/lesson.schema'
import type { CurriculumPathModel, CurriculumPathLesson } from '@/features/curriculum/types'
import { isA2LessonSequentialLocked } from '@/features/curriculum/types'
import type { DemoLessonProgress, DemoProgressSummary } from '@/demo-data/types'
import { NL_A2_STAGE_PRODUCT } from './nlA2StageCopy'
import {
  getSchemaRegistrationForCatalogUnit,
  lessonHrefForRegisteredSchemaLesson,
  REGISTERED_SCHEMA_MODULES,
} from './schemaModuleRegistry'
import type {
  LearningPathLessonBadge,
  LearningPathViewModel,
  LessonRowModel,
  ModuleCardModel,
  StageSectionModel,
  PathModuleState,
  PathStageState,
} from './types'
import { isA2CurriculumComplete } from '@/lib/post-a2/a2PathCompletion'
import { POST_A2_TRANSITION_HREF } from '@/lib/post-a2/postA2PathRouter'

const COURSE_ID = 'course-nl-a2'

function badgeForSchemaLesson(lesson: Lesson): LearningPathLessonBadge {
  const t = lesson.title.toLowerCase()
  switch (lesson.lessonType) {
    case 'checkpoint':
      return 'checkpoint'
    case 'input':
      if (t.includes('read') || t.includes('reading')) return 'listening_reading'
      return 'listening'
    case 'pattern':
    case 'practice':
      return 'grammar_patterns'
    case 'speaking':
      return 'speaking'
    case 'writing':
      return 'writing'
    case 'task':
      return 'real_life_task'
    case 'review':
      return 'review'
    default:
      return 'listening'
  }
}

function grammarLineFromModule(mod: CourseModule): string {
  const g = mod.grammarTargets[0]
  if (g && typeof g === 'object' && 'name' in g && typeof (g as { name?: string }).name === 'string') {
    return (g as { name: string }).name
  }
  return mod.learningGoals[0] ?? 'Practical Dutch for daily life'
}

function pathLessonMap(unitLessons: CurriculumPathLesson[]): Map<string, CurriculumPathLesson> {
  return new Map(unitLessons.map((l) => [l.lessonId, l]))
}

function schemaModuleComplete(
  reg: { module: CourseModule },
  pathLessons: CurriculumPathLesson[]
): boolean {
  if (pathLessons.length === 0) return false
  const m = new Map(pathLessons.map((l) => [l.lessonId, l]))
  return reg.module.lessons.every((les) => m.get(les.id)?.status === 'completed')
}

function schemaModuleState(
  reg: { module: CourseModule },
  pathLessons: CurriculumPathLesson[],
  moduleUnlocked: boolean
): PathModuleState {
  if (!moduleUnlocked) return 'locked'
  if (schemaModuleComplete(reg, pathLessons)) return 'completed'
  if (pathLessons.some((l) => l.status === 'in_progress' || l.status === 'completed')) return 'in_progress'
  return 'in_progress'
}

type GlobalSlot = { bandId: A2BandId; catalogUnitId: string }

function globalCatalogSlots(): GlobalSlot[] {
  const out: GlobalSlot[] = []
  for (const band of A2_MANIFEST.a2_bands) {
    const bid = band.band as A2BandId
    for (const catalogUnitId of band.unit_ids) {
      out.push({ bandId: bid, catalogUnitId })
    }
  }
  return out
}

function priorSchemaSlotsComplete(
  slots: GlobalSlot[],
  endExclusive: number,
  getPathLessonsForReg: (reg: NonNullable<ReturnType<typeof getSchemaRegistrationForCatalogUnit>>) => CurriculumPathLesson[]
): boolean {
  for (let i = 0; i < endExclusive; i++) {
    const reg = getSchemaRegistrationForCatalogUnit(slots[i]!.catalogUnitId)
    if (!reg) continue
    const pl = getPathLessonsForReg(reg)
    if (!schemaModuleComplete(reg, pl)) return false
  }
  return true
}

function moduleUnlockedAtIndex(
  slots: GlobalSlot[],
  index: number,
  getPathLessonsForReg: (reg: NonNullable<ReturnType<typeof getSchemaRegistrationForCatalogUnit>>) => CurriculumPathLesson[]
): boolean {
  const stageBand = slots[index]!.bandId
  const stageOrder = a2BandOrder(stageBand)
  if (stageOrder <= 1) {
    /* A2.1: unlocked if prior global schema modules complete */
  } else {
    const priorBand: A2BandId = stageOrder === 2 ? 'A2.1' : 'A2.2'
    const priorSlots = slots.filter((s) => s.bandId === priorBand)
    const priorRegs = priorSlots
      .map((s) => getSchemaRegistrationForCatalogUnit(s.catalogUnitId))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
    for (const reg of priorRegs) {
      const pl = getPathLessonsForReg(reg)
      if (!schemaModuleComplete(reg, pl)) return false
    }
  }
  return priorSchemaSlotsComplete(slots, index, getPathLessonsForReg)
}

function youCanNowLine(reg: { module: CourseModule }, pathLessons: CurriculumPathLesson[]): string {
  const done = reg.module.lessons.filter((les) =>
    pathLessons.find((p) => p.lessonId === les.id && p.status === 'completed')
  )
  const last = done[done.length - 1]
  if (last?.canDoStatements[0]) return last.canDoStatements[0]!
  if (reg.module.learningGoals[0]) return reg.module.learningGoals[0]!
  return 'You’re building real-world Dutch — keep the streak alive.'
}

export function buildLearningPathViewModel(input: {
  path: CurriculumPathModel
  progress: DemoProgressSummary
  lessonProgress: readonly DemoLessonProgress[]
  sequentialBandsActive: boolean
  /** When false (demo), all registered path modules are treated as unlocked regardless of prior completion. */
  pathModuleGatingEnabled: boolean
  dueReviewCount: number
  weakTagsCount: number
  /** Optional copy from retention ability unlocks — overrides heuristic “you can now” line */
  retentionYouCanNowLine?: string | null
  dailyReviewEstMinutes?: number
}): LearningPathViewModel {
  const {
    path,
    progress,
    lessonProgress,
    sequentialBandsActive,
    pathModuleGatingEnabled,
    dueReviewCount,
    weakTagsCount,
    retentionYouCanNowLine,
    dailyReviewEstMinutes,
  } = input

  const getPathUnitForReg = (reg: NonNullable<ReturnType<typeof getSchemaRegistrationForCatalogUnit>>) =>
    path.units.find((u) => u.id === reg.moduleId)

  const getPathLessonsForReg = (reg: NonNullable<ReturnType<typeof getSchemaRegistrationForCatalogUnit>>) =>
    getPathUnitForReg(reg)?.lessons ?? []

  const slots = globalCatalogSlots()

  const nextLessonId = path.nextLesson?.lessonId ?? null

  const modulesByBand = new Map<A2BandId, ModuleCardModel[]>()
  for (const b of A2_MANIFEST.a2_bands) {
    modulesByBand.set(b.band as A2BandId, [])
  }

  slots.forEach((slot, globalIndex) => {
    const catalogUnit = A2_UNITS.find((u) => u.id === slot.catalogUnitId)
    const title = catalogUnit?.title ?? slot.catalogUnitId
    const summary = catalogUnit?.summary ?? ''
    const reg = getSchemaRegistrationForCatalogUnit(slot.catalogUnitId)
    const modUnlocked = pathModuleGatingEnabled
      ? moduleUnlockedAtIndex(slots, globalIndex, getPathLessonsForReg)
      : true

    if (reg) {
      const pathUnit = getPathUnitForReg(reg)
      const pathLessons = pathUnit?.lessons ?? []
      const plMap = pathLessonMap(pathLessons)
      const modState = schemaModuleState(reg, pathLessons, modUnlocked)

      const lessons: LessonRowModel[] = reg.module.lessons.map((les) => {
        const pl = plMap.get(les.id)
        const status = pl?.status ?? 'not_started'
        const seqLock =
          sequentialBandsActive &&
          isA2LessonSequentialLocked(les.id, path.units, [...lessonProgress])
        const locked = !modUnlocked || seqLock
        return {
          lessonId: les.id,
          title: les.title,
          badge: badgeForSchemaLesson(les),
          durationMinutes: Math.round(les.durationEstimate),
          status,
          isNext: nextLessonId === les.id,
          isLocked: locked,
          goalLine: les.canDoStatements[0] ?? null,
          href: reg.lessonHref(les.id),
          isPremium: pl?.isPremium ?? false,
        }
      })

      const grammarOrOutcomeLine =
        reg.module.grammarTargets.length > 0 ? grammarLineFromModule(reg.module) : reg.module.learningGoals.slice(0, 2).join(' · ')

      const defaultExpanded =
        modState !== 'completed' &&
        (lessons.some((l) => l.isNext || l.status === 'in_progress') || modState === 'in_progress')

      const card: ModuleCardModel = {
        id: reg.moduleId,
        catalogUnitId: slot.catalogUnitId,
        title: reg.module.title,
        description: reg.module.description,
        kind: 'schema',
        totalLessons: reg.module.lessons.length,
        completedLessons: pathLessons.filter((l) => l.status === 'completed').length,
        state: modState,
        grammarOrOutcomeLine,
        lessons,
        defaultExpanded,
        lessonHref: reg.lessonHref,
      }
      modulesByBand.get(slot.bandId)!.push(card)
      return
    }

    const totalPlanned = catalogUnit?.lesson_ids.length ?? 0
    const defaultExpanded = false
    const card: ModuleCardModel = {
      id: `placeholder-${slot.catalogUnitId}`,
      catalogUnitId: slot.catalogUnitId,
      title,
      description: summary || 'This module is on the roadmap — content will appear here.',
      kind: 'placeholder',
      totalLessons: totalPlanned,
      completedLessons: 0,
      state: modUnlocked ? 'locked' : 'locked',
      grammarOrOutcomeLine: 'Unlocks after prior modules in your path.',
      lessons: [],
      defaultExpanded,
      lessonHref: () => '',
    }
    modulesByBand.get(slot.bandId)!.push(card)
  })

  const stages: StageSectionModel[] = A2_MANIFEST.a2_bands.map((band) => {
    const bandId = band.band as A2BandId
    const product = NL_A2_STAGE_PRODUCT[bandId]
    const mods = modulesByBand.get(bandId) ?? []

    const regsInBand = mods.filter((m) => m.kind === 'schema')
    const schemaDone = regsInBand.filter((m) => m.state === 'completed').length
    const schemaTotal = regsInBand.length

    const priorBandsComplete = (() => {
      const ord = a2BandOrder(bandId)
      if (ord <= 1) return true
      const prev: A2BandId = ord === 2 ? 'A2.1' : 'A2.2'
      const prevMods = modulesByBand.get(prev) ?? []
      const prevRegs = prevMods.filter((m) => m.kind === 'schema')
      return prevRegs.length > 0 && prevRegs.every((m) => m.state === 'completed')
    })()

    const stageUnlocked = priorBandsComplete
    const stageCompleted =
      stageUnlocked && schemaTotal > 0 && schemaDone === schemaTotal && regsInBand.every((m) => m.state === 'completed')

    let state: PathStageState = 'active'
    if (!stageUnlocked) state = 'locked'
    else if (stageCompleted) state = 'completed'

    const modulesTotal = mods.length
    const modulesDone = mods.filter((m) => m.kind === 'schema' && m.state === 'completed').length

    const defaultExpanded = state === 'active'

    return {
      bandId,
      title: product.title,
      subtitle: band.label,
      description: product.description,
      grammarFocus: product.grammarFocus,
      state,
      modulesDone,
      modulesTotal,
      modules: mods,
      defaultExpanded,
    }
  })

  const activeStage = stages.find((s) => s.state === 'active') ?? stages[0]!
  const currentStageBand = activeStage.bandId

  const primaryReg = REGISTERED_SCHEMA_MODULES[0]
  const primaryPathLessons = primaryReg ? getPathLessonsForReg(primaryReg) : []
  const youLineFallback = primaryReg
    ? youCanNowLine(primaryReg, primaryPathLessons)
    : 'Start your first lesson to unlock personalized tips.'
  const youLine = retentionYouCanNowLine?.trim() || youLineFallback

  const continueLesson = path.nextLesson
    ? {
        lessonId: path.nextLesson.lessonId,
        title: path.nextLesson.title,
        subtitle: path.nextLesson.status === 'in_progress' ? 'Resume' : 'Up next',
        status: path.nextLesson.status,
        href: lessonHrefForRegisteredSchemaLesson(path.nextLesson.lessonId),
      }
    : null

  const completedPathLessonIds = lessonProgress.filter((p) => p.status === 'completed').map((p) => p.lessonId)
  const postA2Cta =
    path.cefrLevel === 'A2' && isA2CurriculumComplete(completedPathLessonIds)
      ? {
          href: POST_A2_TRANSITION_HREF,
          label: 'Plan your next chapter',
          hint: 'B1, A2 Mastery, or Exam preparation — your choice.',
        }
      : undefined

  const nextLockedStage = stages.find((s) => s.state === 'locked')
  const nextCheckpointLabel =
    nextLockedStage && stages.some((s) => s.state === 'active')
      ? `Then · ${nextLockedStage.bandId} ${nextLockedStage.title}`
      : path.pathPercentComplete >= 100
        ? 'Path done — reviews keep you sharp.'
        : null

  return {
    course: {
      id: COURSE_ID,
      title: 'Dutch A2',
      cefrLevel: path.cefrLevel,
      localeLabel: path.locale === 'nl-NL' ? 'Nederlands (NL)' : path.locale,
    },
    hero: {
      courseTitle: 'Dutch A2',
      cefrLevel: path.cefrLevel,
      currentStageBand,
      currentStageTitle: activeStage.title,
      pathPercentComplete: path.pathPercentComplete,
      streak: progress.streak,
      weeklyMinutes: progress.weeklyMinutes,
      xp: progress.xp,
      lessonsCompletedTotal: progress.lessonsCompleted,
      continueLesson,
      youCanNowLine: youLine,
      postA2Cta,
    },
    actions: {
      dailyReviewDueCount: dueReviewCount,
      weakTagsCount,
      continueLesson,
      nextCheckpointLabel,
      dailyReviewEstMinutes: dailyReviewEstMinutes ?? 0,
    },
    stages,
  }
}
