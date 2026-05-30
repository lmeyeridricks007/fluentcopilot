/**
 * Until ScenarioDefinitions carries DefaultPersonaId, map slugs to seeded persona GUIDs.
 * Keep aligned with database/seed/003_seed_personas.sql
 */
export const DEFAULT_PERSONA_ID_BY_SCENARIO_SLUG: Record<string, string> = {
  'train-station': 'c3d4e5f6-a7b8-4001-8010-000000000002',
  ordering_food: 'c3d4e5f6-a7b8-4001-8010-000000000003',
  supermarket_shop: 'c3d4e5f6-a7b8-4001-8010-000000000006',
  directions_getting_somewhere: 'c3d4e5f6-a7b8-4001-8010-000000000007',
  booking_reservations: 'c3d4e5f6-a7b8-4001-8010-000000000009',
  doctor_pharmacy: 'c3d4e5f6-a7b8-4001-8010-00000000000B',
  store_service_issue: 'c3d4e5f6-a7b8-4001-8010-00000000000D',
  work_colleague_interaction: 'c3d4e5f6-a7b8-4001-8010-00000000000F',
  housing_landlord: 'c3d4e5f6-a7b8-4001-8010-000000000011',
  phone_call: 'c3d4e5f6-a7b8-4001-8010-000000000013',
  small_talk: 'c3d4e5f6-a7b8-4001-8010-000000000015',
  meeting_new_people: 'c3d4e5f6-a7b8-4001-8010-000000000017',
  party_social: 'c3d4e5f6-a7b8-4001-8010-000000000019',
  explaining_something: 'c3d4e5f6-a7b8-4001-8010-000000000021',
  storytelling: 'c3d4e5f6-a7b8-4001-8010-000000000023',
  opinions_discussions: 'c3d4e5f6-a7b8-4001-8010-000000000025',
  language_coach: 'c3d4e5f6-a7b8-4001-8010-000000000027',
}

export function resolvePersonaIdForScenarioSlug(scenarioSlug: string): string | undefined {
  return DEFAULT_PERSONA_ID_BY_SCENARIO_SLUG[scenarioSlug]
}
