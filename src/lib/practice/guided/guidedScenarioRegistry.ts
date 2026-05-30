import { guidedScenarioDefinitionSchema } from '@/lib/schemas/practice/guidedScenarioDefinition.schema'
import type { GuidedScenarioDefinition } from '@/lib/schemas/practice/guidedScenarioDefinition.schema'
import { validateGuidedDefinition } from '@/lib/practice/guided/validateGuidedDefinition'
import cafeRaw from '../../../../content/practice/guided/scenarios/cafe.json'
import directionsGettingSomewhereRaw from '../../../../content/practice/guided/scenarios/directions_getting_somewhere.json'
import doctorRaw from '../../../../content/practice/guided/scenarios/doctor.json'
import supermarketShopRaw from '../../../../content/practice/guided/scenarios/supermarket_shop.json'
import trainRaw from '../../../../content/practice/guided/scenarios/train.json'

function loadGuided(raw: unknown, label: string): GuidedScenarioDefinition {
  const parsed = guidedScenarioDefinitionSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`[guided] Invalid ${label}: ${parsed.error.message}`)
  }
  const issues = validateGuidedDefinition(parsed.data)
  if (issues.length) {
    throw new Error(`[guided] ${label}: ${issues.map((i) => i.message).join(' | ')}`)
  }
  return parsed.data
}

const cafe = loadGuided(cafeRaw, 'cafe')
const directionsGettingSomewhere = loadGuided(directionsGettingSomewhereRaw, 'directions_getting_somewhere')
const doctor = loadGuided(doctorRaw, 'doctor')
const supermarketShop = loadGuided(supermarketShopRaw, 'supermarket_shop')
const train = loadGuided(trainRaw, 'train')

const BY_ID: Record<string, GuidedScenarioDefinition> = {
  [cafe.scenarioId]: cafe,
  [directionsGettingSomewhere.scenarioId]: directionsGettingSomewhere,
  [doctor.scenarioId]: doctor,
  [supermarketShop.scenarioId]: supermarketShop,
  [train.scenarioId]: train,
}

export function listGuidedScenarioIds(): string[] {
  return Object.keys(BY_ID)
}

export function hasGuidedScenario(scenarioId: string): boolean {
  return scenarioId in BY_ID
}

export function getGuidedScenarioDefinition(scenarioId: string): GuidedScenarioDefinition | null {
  return BY_ID[scenarioId] ?? null
}
