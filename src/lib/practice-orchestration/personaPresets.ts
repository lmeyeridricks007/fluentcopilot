/**
 * Optional persona labels for analytics / future CMS — scenario context remains source of truth.
 */
export const PERSONA_PRESET_BY_SCENARIO: Record<string, string> = {
  cafe: 'barista',
  doctor: 'doctor_or_reception',
  train: 'station_staff',
  travel: 'station_staff',
  supermarket_shop: 'shop_staff',
  municipality: 'gemeente_clerk',
  work: 'colleague',
  housing: 'landlord_or_service',
  social_plans: 'friend',
  problem_solving: 'service_desk',
  store_service_issue: 'service_desk',
  work_colleague_interaction: 'colleague',
  housing_landlord: 'landlord_or_service',
  customer_service: 'service_desk',
}

export function getPersonaPresetId(scenarioId: string): string | undefined {
  return PERSONA_PRESET_BY_SCENARIO[scenarioId]
}
