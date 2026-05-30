/**
 * A2 learning path + catalog — Stage 6 schema modules (multimodal JSON under content/modules/).
 */

import type { DemoLesson } from '../types'
import type { A2BandId, A2CatalogManifest, A2ManifestBand } from './a2Catalog'
import rawM01 from '../../../content/modules/a2-m01-people-daily/module.json'
import rawM02 from '../../../content/modules/a2-m02-food-shopping/module.json'
import rawM03 from '../../../content/modules/a2-m03-plans-social-life/module.json'
import rawM04 from '../../../content/modules/a2-m04-work-professional/module.json'
import rawM05 from '../../../content/modules/a2-m05-housing-services/module.json'
import rawM06 from '../../../content/modules/a2-m06-health-doctor/module.json'
import rawM07 from '../../../content/modules/a2-m07-transport-getting-around/module.json'
import rawM08 from '../../../content/modules/a2-m08-government-administration/module.json'
import rawM09 from '../../../content/modules/a2-m09-leisure-culture-conversations/module.json'
import rawM10 from '../../../content/modules/a2-m10-unexpected-situations-problem-solving/module.json'
import { moduleSchema, type CourseModule } from '@/lib/schemas/module.schema'
import type { LessonType } from '@/lib/schemas/lesson.schema'

const modM01 = moduleSchema.parse(rawM01)
const modM02 = moduleSchema.parse(rawM02)
const modM03 = moduleSchema.parse(rawM03)
const modM04 = moduleSchema.parse(rawM04)
const modM05 = moduleSchema.parse(rawM05)
const modM06 = moduleSchema.parse(rawM06)
const modM07 = moduleSchema.parse(rawM07)
const modM08 = moduleSchema.parse(rawM08)
const modM09 = moduleSchema.parse(rawM09)
const modM10 = moduleSchema.parse(rawM10)

const STAGE6_MODULES: CourseModule[] = [modM01, modM02, modM03, modM04, modM05, modM06, modM07, modM08, modM09, modM10]

function schemaLessonTypeToDemoType(lessonType: LessonType): DemoLesson['type'] {
  switch (lessonType) {
    case 'input':
      return 'listening'
    case 'pattern':
    case 'practice':
      return 'grammar'
    case 'speaking':
      return 'dialogue'
    case 'writing':
      return 'vocabulary'
    case 'task':
      return 'dialogue'
    case 'review':
      return 'quiz'
    case 'checkpoint':
      return 'quiz'
    default:
      return 'listening'
  }
}

function demoLessonsForModule(mod: CourseModule): DemoLesson[] {
  return mod.lessons.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.canDoStatements[0] ?? l.title,
    level: l.cefrLevel,
    topic: mod.title,
    type: schemaLessonTypeToDemoType(l.lessonType),
    durationMinutes: Math.round(l.durationEstimate),
    isPremium: false,
  }))
}

/** Module 1 only — People & daily rhythm (legacy name). */
export const SCHEMA_M01_PEOPLE_DAILY_DEMO_LESSONS: DemoLesson[] = demoLessonsForModule(modM01)

/** Module 2 only — Food & shopping. */
export const SCHEMA_M02_FOOD_SHOPPING_DEMO_LESSONS: DemoLesson[] = demoLessonsForModule(modM02)

/** Module 3 only — Plans & social life. */
export const SCHEMA_M03_PLANS_SOCIAL_DEMO_LESSONS: DemoLesson[] = demoLessonsForModule(modM03)

/** Module 4 only — Work & professional life (A2.2). */
export const SCHEMA_M04_WORK_PROFESSIONAL_DEMO_LESSONS: DemoLesson[] = demoLessonsForModule(modM04)

/** Module 5 only — Housing & services (A2.2). */
export const SCHEMA_M05_HOUSING_SERVICES_DEMO_LESSONS: DemoLesson[] = demoLessonsForModule(modM05)

/** Module 6 only — Health & doctor visits (A2.2). */
export const SCHEMA_M06_HEALTH_DOCTOR_DEMO_LESSONS: DemoLesson[] = demoLessonsForModule(modM06)

/** Module 7 only — Transport & getting around (A2.2). */
export const SCHEMA_M07_TRANSPORT_GETTING_AROUND_DEMO_LESSONS: DemoLesson[] = demoLessonsForModule(modM07)

/** Module 8 only — Government & administration (A2.2). */
export const SCHEMA_M08_GOVERNMENT_ADMINISTRATION_DEMO_LESSONS: DemoLesson[] = demoLessonsForModule(modM08)

/** Module 9 only — Leisure, culture & conversations (A2.3 bridge). */
export const SCHEMA_M09_LEISURE_CULTURE_CONVERSATIONS_DEMO_LESSONS: DemoLesson[] = demoLessonsForModule(modM09)

/** Module 10 only — Unexpected situations & problem solving (A2.3 bridge). */
export const SCHEMA_M10_UNEXPECTED_SITUATIONS_PROBLEM_SOLVING_DEMO_LESSONS: DemoLesson[] = demoLessonsForModule(modM10)

/** All Stage 6 schema lessons in path order (Modules 1–10). */
export const SCHEMA_PEOPLE_DAILY_DEMO_LESSONS: DemoLesson[] = [
  ...SCHEMA_M01_PEOPLE_DAILY_DEMO_LESSONS,
  ...SCHEMA_M02_FOOD_SHOPPING_DEMO_LESSONS,
  ...SCHEMA_M03_PLANS_SOCIAL_DEMO_LESSONS,
  ...SCHEMA_M04_WORK_PROFESSIONAL_DEMO_LESSONS,
  ...SCHEMA_M05_HOUSING_SERVICES_DEMO_LESSONS,
  ...SCHEMA_M06_HEALTH_DOCTOR_DEMO_LESSONS,
  ...SCHEMA_M07_TRANSPORT_GETTING_AROUND_DEMO_LESSONS,
  ...SCHEMA_M08_GOVERNMENT_ADMINISTRATION_DEMO_LESSONS,
  ...SCHEMA_M09_LEISURE_CULTURE_CONVERSATIONS_DEMO_LESSONS,
  ...SCHEMA_M10_UNEXPECTED_SITUATIONS_PROBLEM_SOLVING_DEMO_LESSONS,
]

export const SCHEMA_PEOPLE_DAILY_LESSON_IDS_ORDERED: string[] = SCHEMA_PEOPLE_DAILY_DEMO_LESSONS.map((l) => l.id)

/** Route to the schema player that owns this lesson id. */
export function peopleDailySchemaPlayerHref(lessonId: string): string {
  if (modM10.lessons.some((l) => l.id === lessonId)) {
    return `/app/learn/schema/unexpected-situations-problem-solving?lesson=${encodeURIComponent(lessonId)}`
  }
  if (modM09.lessons.some((l) => l.id === lessonId)) {
    return `/app/learn/schema/leisure-culture-conversations?lesson=${encodeURIComponent(lessonId)}`
  }
  if (modM08.lessons.some((l) => l.id === lessonId)) {
    return `/app/learn/schema/government-administration?lesson=${encodeURIComponent(lessonId)}`
  }
  if (modM07.lessons.some((l) => l.id === lessonId)) {
    return `/app/learn/schema/transport-getting-around?lesson=${encodeURIComponent(lessonId)}`
  }
  if (modM06.lessons.some((l) => l.id === lessonId)) {
    return `/app/learn/schema/health-doctor?lesson=${encodeURIComponent(lessonId)}`
  }
  if (modM05.lessons.some((l) => l.id === lessonId)) {
    return `/app/learn/schema/housing-services?lesson=${encodeURIComponent(lessonId)}`
  }
  if (modM04.lessons.some((l) => l.id === lessonId)) {
    return `/app/learn/schema/work-professional?lesson=${encodeURIComponent(lessonId)}`
  }
  if (modM03.lessons.some((l) => l.id === lessonId)) {
    return `/app/learn/schema/plans-social?lesson=${encodeURIComponent(lessonId)}`
  }
  if (modM02.lessons.some((l) => l.id === lessonId)) {
    return `/app/learn/schema/food-shopping?lesson=${encodeURIComponent(lessonId)}`
  }
  return `/app/learn/schema/people-daily?lesson=${encodeURIComponent(lessonId)}`
}

/** Path units: Modules 1–9 (A2.1 + A2.2 + A2.3 bridge). */
export const SCHEMA_PEOPLE_DAILY_PATH_UNITS: {
  id: string
  title: string
  summary: string
  lessonIds: string[]
  a2Band: A2BandId
}[] = STAGE6_MODULES.map((mod) => ({
  id: mod.id,
  title: mod.title,
  summary: mod.description,
  lessonIds: mod.lessons.map((l) => l.id),
  a2Band: mod.band,
}))

const bandEarlyLabel = 'Early A2 — survival expansion'
const bandMidLabel = 'Mid A2 — independence'
const bandLateLabel = 'Late A2 — confidence / pre-B1 bridge'

const stage6Bands: A2ManifestBand[] = [
  {
    band: 'A2.1',
    label: bandEarlyLabel,
    unit_ids: [modM01.id, modM02.id, modM03.id],
  },
  {
    band: 'A2.2',
    label: bandMidLabel,
    unit_ids: [modM04.id, modM05.id, modM06.id, modM07.id, modM08.id],
  },
  {
    band: 'A2.3',
    label: bandLateLabel,
    unit_ids: [modM09.id, modM10.id],
  },
]

/** Minimal manifest for CurriculumPathPanel band grouping. */
export const SCHEMA_PEOPLE_DAILY_MANIFEST: A2CatalogManifest = {
  schema_version: 1,
  locale: 'nl-NL',
  instruction_locale: 'en',
  cefr_level: 'A2',
  title: 'A2 Dutch — Stage 6 modules',
  summary: `${modM01.title}; ${modM02.title}; ${modM03.title}; ${modM04.title}; ${modM05.title}; ${modM06.title}; ${modM07.title}; ${modM08.title}; ${modM09.title}; ${modM10.title}. Practical multimodal lessons (schema player).`,
  unit_order: STAGE6_MODULES.map((m) => m.id),
  a2_bands: stage6Bands,
}
