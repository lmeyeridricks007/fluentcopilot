import { getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'

export type CatalogBackendTarget = {
  scenarioId: string
  scenarioOverrides?: {
    subType?: string
    variation?: string
    destination?: string
    detailFocus?: string
  }
  cefrLevel?: 'A1' | 'A2' | 'B1'
}

/** Catalog ids that differ from persisted backend scenario slugs. */
const CATALOG_TO_BACKEND: Record<string, CatalogBackendTarget> = {
  cafe: {
    scenarioId: 'ordering_food',
    scenarioOverrides: { subType: 'cafe', variation: 'simple' },
  },
  restaurant: {
    scenarioId: 'ordering_food',
    scenarioOverrides: { subType: 'restaurant' },
  },
  doctor: {
    scenarioId: 'doctor_pharmacy',
    scenarioOverrides: { subType: 'doctor_visit' },
  },
  pharmacy: {
    scenarioId: 'doctor_pharmacy',
    scenarioOverrides: { subType: 'pharmacy' },
  },
  municipality: {
    scenarioId: 'booking_reservations',
    scenarioOverrides: { subType: 'town_hall' },
  },
  phone_appointment: {
    scenarioId: 'booking_reservations',
    scenarioOverrides: { subType: 'phone_appointment' },
  },
  work: { scenarioId: 'work_colleague_interaction' },
  train: { scenarioId: 'train-station' },
  housing: { scenarioId: 'housing_landlord' },
  social_plans: { scenarioId: 'small_talk' },
  problem_solving: { scenarioId: 'store_service_issue' },
}

function difficultyToCefr(catalogId: string): 'A1' | 'A2' | 'B1' {
  const entry = getScenarioCatalogEntry(catalogId)
  const d = entry?.difficulty?.toUpperCase() ?? 'A2'
  if (d.startsWith('A1')) return 'A1'
  if (d.includes('B1') || d.includes('NEAR_B1')) return 'B1'
  return 'A2'
}

/** Resolve a practice catalog id to a backend conversation / Speak Live scenario slug. */
export function resolveCatalogScenarioBackendTarget(catalogId: string): CatalogBackendTarget | null {
  const mapped = CATALOG_TO_BACKEND[catalogId]
  if (mapped) {
    return { ...mapped, cefrLevel: mapped.cefrLevel ?? difficultyToCefr(catalogId) }
  }
  if (!getScenarioCatalogEntry(catalogId)) return null
  return { scenarioId: catalogId, cefrLevel: difficultyToCefr(catalogId) }
}
