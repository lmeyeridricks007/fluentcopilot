/**
 * Scenario / life-area keys aligned with practice catalog string ids (e.g. cafe, train).
 * Stored as NVARCHAR in SQL — not the same as Speak Live UUID scenario rows when those exist.
 */
export type ListeningScenarioId = string

/** Known catalog ids for validation / docs (non-exhaustive). */
export const KNOWN_LISTENING_SCENARIO_IDS = [
  'cafe',
  'train',
  'supermarket_shop',
  'doctor',
  'booking_reservations',
  'directions_getting_somewhere',
  'phone_appointment',
  'store_service_issue',
  'work_colleague_interaction',
  'housing_landlord',
  'phone_call',
  'small_talk',
  'meeting_new_people',
  'opinions_discussions',
] as const
