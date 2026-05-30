/**
 * Maps catalog unit slots (bundle manifest) to implemented schema modules + player routes.
 * Add entries as new module.json files ship.
 */

import type { CourseModule } from '@/lib/schemas/module.schema'
import { moduleSchema } from '@/lib/schemas/module.schema'
import rawPeopleDaily from '../../../content/modules/a2-m01-people-daily/module.json'
import rawFoodShopping from '../../../content/modules/a2-m02-food-shopping/module.json'
import rawPlansSocial from '../../../content/modules/a2-m03-plans-social-life/module.json'
import rawWorkProfessional from '../../../content/modules/a2-m04-work-professional/module.json'
import rawHousingServices from '../../../content/modules/a2-m05-housing-services/module.json'
import rawHealthDoctor from '../../../content/modules/a2-m06-health-doctor/module.json'
import rawTransportGettingAround from '../../../content/modules/a2-m07-transport-getting-around/module.json'
import rawGovernmentAdministration from '../../../content/modules/a2-m08-government-administration/module.json'
import rawLeisureCultureConversations from '../../../content/modules/a2-m09-leisure-culture-conversations/module.json'
import rawUnexpectedSituationsProblemSolving from '../../../content/modules/a2-m10-unexpected-situations-problem-solving/module.json'
import { peopleDailySchemaPlayerHref } from '@/demo-data/curriculum/schemaPeopleDailyPath'

export type SchemaModuleRegistration = {
  /** Unit id from data/curriculum bundle manifest (a2-u01 …). */
  catalogUnitId: string
  /** Module id from module.json */
  moduleId: string
  module: CourseModule
  lessonHref: (lessonId: string) => string
}

const peopleDaily = moduleSchema.parse(rawPeopleDaily)
const foodShopping = moduleSchema.parse(rawFoodShopping)
const plansSocial = moduleSchema.parse(rawPlansSocial)
const workProfessional = moduleSchema.parse(rawWorkProfessional)
const housingServices = moduleSchema.parse(rawHousingServices)
const healthDoctor = moduleSchema.parse(rawHealthDoctor)
const transportGettingAround = moduleSchema.parse(rawTransportGettingAround)
const governmentAdministration = moduleSchema.parse(rawGovernmentAdministration)
const leisureCultureConversations = moduleSchema.parse(rawLeisureCultureConversations)
const unexpectedSituationsProblemSolving = moduleSchema.parse(rawUnexpectedSituationsProblemSolving)

export const REGISTERED_SCHEMA_MODULES: SchemaModuleRegistration[] = [
  {
    catalogUnitId: 'a2-u01',
    moduleId: peopleDaily.id,
    module: peopleDaily,
    lessonHref: peopleDailySchemaPlayerHref,
  },
  {
    catalogUnitId: 'a2-u02',
    moduleId: foodShopping.id,
    module: foodShopping,
    lessonHref: peopleDailySchemaPlayerHref,
  },
  {
    catalogUnitId: 'a2-u03',
    moduleId: plansSocial.id,
    module: plansSocial,
    lessonHref: peopleDailySchemaPlayerHref,
  },
  {
    catalogUnitId: 'a2-u04',
    moduleId: workProfessional.id,
    module: workProfessional,
    lessonHref: peopleDailySchemaPlayerHref,
  },
  {
    catalogUnitId: 'a2-u05',
    moduleId: housingServices.id,
    module: housingServices,
    lessonHref: peopleDailySchemaPlayerHref,
  },
  {
    catalogUnitId: 'a2-u06',
    moduleId: healthDoctor.id,
    module: healthDoctor,
    lessonHref: peopleDailySchemaPlayerHref,
  },
  {
    catalogUnitId: 'a2-u07',
    moduleId: transportGettingAround.id,
    module: transportGettingAround,
    lessonHref: peopleDailySchemaPlayerHref,
  },
  {
    catalogUnitId: 'a2-u08',
    moduleId: governmentAdministration.id,
    module: governmentAdministration,
    lessonHref: peopleDailySchemaPlayerHref,
  },
  {
    catalogUnitId: 'a2-u09',
    moduleId: leisureCultureConversations.id,
    module: leisureCultureConversations,
    lessonHref: peopleDailySchemaPlayerHref,
  },
  {
    catalogUnitId: 'a2-u10',
    moduleId: unexpectedSituationsProblemSolving.id,
    module: unexpectedSituationsProblemSolving,
    lessonHref: peopleDailySchemaPlayerHref,
  },
]

const byCatalog = new Map(REGISTERED_SCHEMA_MODULES.map((r) => [r.catalogUnitId, r]))
const byModuleId = new Map(REGISTERED_SCHEMA_MODULES.map((r) => [r.moduleId, r]))

export function getSchemaRegistrationForCatalogUnit(
  catalogUnitId: string
): SchemaModuleRegistration | undefined {
  return byCatalog.get(catalogUnitId)
}

export function getSchemaRegistrationByModuleId(
  moduleId: string
): SchemaModuleRegistration | undefined {
  return byModuleId.get(moduleId)
}

export function lessonHrefForRegisteredSchemaLesson(lessonId: string): string {
  const reg = REGISTERED_SCHEMA_MODULES.find((r) => r.module.lessons.some((l) => l.id === lessonId))
  return reg ? reg.lessonHref(lessonId) : peopleDailySchemaPlayerHref(lessonId)
}
