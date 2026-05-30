'use client'

import { useEffect, useMemo } from 'react'
import peopleDailyModule from '../../../content/modules/a2-m01-people-daily/module.json'
import foodShoppingModule from '../../../content/modules/a2-m02-food-shopping/module.json'
import plansSocialModule from '../../../content/modules/a2-m03-plans-social-life/module.json'
import workProfessionalModule from '../../../content/modules/a2-m04-work-professional/module.json'
import housingServicesModule from '../../../content/modules/a2-m05-housing-services/module.json'
import healthDoctorModule from '../../../content/modules/a2-m06-health-doctor/module.json'
import transportGettingAroundModule from '../../../content/modules/a2-m07-transport-getting-around/module.json'
import governmentAdministrationModule from '../../../content/modules/a2-m08-government-administration/module.json'
import leisureCultureConversationsModule from '../../../content/modules/a2-m09-leisure-culture-conversations/module.json'
import unexpectedSituationsProblemSolvingModule from '../../../content/modules/a2-m10-unexpected-situations-problem-solving/module.json'
import { moduleSchema } from '@/lib/schemas/module.schema'
import type { CourseModule } from '@/lib/schemas/module.schema'
import { toSchemaLessonBundle } from '@/lib/content/schemaLessonBundle'
import { parseSchemaLessonBundle, assertLessonCatalogRefs } from '@/lib/lesson-engine/engine'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useLessonEngine } from '@/features/lesson-player/useLessonEngine'
import { LessonRenderer } from '@/features/lesson-player/LessonRenderer'

const modPeopleDaily = moduleSchema.parse(peopleDailyModule)
const modFoodShopping = moduleSchema.parse(foodShoppingModule)
const modPlansSocial = moduleSchema.parse(plansSocialModule)
const modWorkProfessional = moduleSchema.parse(workProfessionalModule)
const modHousingServices = moduleSchema.parse(housingServicesModule)
const modHealthDoctor = moduleSchema.parse(healthDoctorModule)
const modTransportGettingAround = moduleSchema.parse(transportGettingAroundModule)
const modGovernmentAdministration = moduleSchema.parse(governmentAdministrationModule)
const modLeisureCultureConversations = moduleSchema.parse(leisureCultureConversationsModule)
const modUnexpectedSituationsProblemSolving = moduleSchema.parse(unexpectedSituationsProblemSolvingModule)

const SCHEMA_MODULES: CourseModule[] = [
  modPeopleDaily,
  modFoodShopping,
  modPlansSocial,
  modWorkProfessional,
  modHousingServices,
  modHealthDoctor,
  modTransportGettingAround,
  modGovernmentAdministration,
  modLeisureCultureConversations,
  modUnexpectedSituationsProblemSolving,
]

function moduleForLessonId(lessonId: string | undefined): CourseModule {
  if (!lessonId) return modPeopleDaily
  for (const m of SCHEMA_MODULES) {
    if (m.lessons.some((l) => l.id === lessonId)) return m
  }
  return modPeopleDaily
}

function buildBundle(lessonId: string | undefined, defaultModuleId: string) {
  const defaultMod = SCHEMA_MODULES.find((m) => m.id === defaultModuleId) ?? modPeopleDaily
  const mod = lessonId ? moduleForLessonId(lessonId) : defaultMod
  const firstId = mod.lessons[0]!.id
  const resolved = lessonId && mod.lessons.some((l) => l.id === lessonId) ? lessonId : firstId
  const b = parseSchemaLessonBundle(toSchemaLessonBundle(mod, resolved))
  assertLessonCatalogRefs(b.lesson, b.moduleCatalog)
  return b
}

export type SchemaPlayerSource =
  | 'schema_player_people_daily'
  | 'schema_player_food_shopping'
  | 'schema_player_plans_social'
  | 'schema_player_work_professional'
  | 'schema_player_housing_services'
  | 'schema_player_health_doctor'
  | 'schema_player_transport_getting_around'
  | 'schema_player_government_administration'
  | 'schema_player_leisure_culture_conversations'
  | 'schema_player_unexpected_situations_problem_solving'

export function LessonPlayer({
  initialLessonId,
  defaultModuleId = 'a2-m01-people-daily',
}: {
  initialLessonId?: string | null
  /** When `lesson` query is absent, load the first lesson of this module. */
  defaultModuleId?:
    | 'a2-m01-people-daily'
    | 'a2-m02-food-shopping'
    | 'a2-m03-plans-social-life'
    | 'a2-m04-work-professional'
    | 'a2-m05-housing-services'
    | 'a2-m06-health-doctor'
    | 'a2-m07-transport-getting-around'
    | 'a2-m08-government-administration'
    | 'a2-m09-leisure-culture-conversations'
    | 'a2-m10-unexpected-situations-problem-solving'
}) {
  const bundle = useMemo(
    () => buildBundle(initialLessonId ?? undefined, defaultModuleId),
    [initialLessonId, defaultModuleId]
  )

  const engine = useLessonEngine(bundle)

  useEffect(() => {
    const source: SchemaPlayerSource =
      bundle.lesson.moduleId === 'a2-m02-food-shopping'
        ? 'schema_player_food_shopping'
        : bundle.lesson.moduleId === 'a2-m03-plans-social-life'
          ? 'schema_player_plans_social'
          : bundle.lesson.moduleId === 'a2-m04-work-professional'
            ? 'schema_player_work_professional'
            : bundle.lesson.moduleId === 'a2-m05-housing-services'
              ? 'schema_player_housing_services'
              : bundle.lesson.moduleId === 'a2-m06-health-doctor'
              ? 'schema_player_health_doctor'
              : bundle.lesson.moduleId === 'a2-m07-transport-getting-around'
                ? 'schema_player_transport_getting_around'
                : bundle.lesson.moduleId === 'a2-m08-government-administration'
                  ? 'schema_player_government_administration'
                  : bundle.lesson.moduleId === 'a2-m09-leisure-culture-conversations'
                    ? 'schema_player_leisure_culture_conversations'
                    : bundle.lesson.moduleId === 'a2-m10-unexpected-situations-problem-solving'
                      ? 'schema_player_unexpected_situations_problem_solving'
                      : 'schema_player_people_daily'
    track(ANALYTICS_EVENTS.lesson_started, {
      lessonId: bundle.lesson.id,
      source,
    })
  }, [bundle.lesson.id, bundle.lesson.moduleId])

  return <LessonRenderer engine={engine} />
}
