/**
 * Personalization Engine — scenario selection by profession, family, goals.
 */

import type { LearnerProfile } from '../types/profile.js'

const SCENARIO_BY_OCCUPATION: Record<string, string[]> = {
  default: ['cafe', 'supermarket_shop', 'social_small_talk'],
  office: ['office_introduction', 'workplace_meeting', 'customer_support_call'],
  tech: ['workplace_meeting', 'office_introduction'],
  healthcare: ['doctor_visit', 'pharmacy'],
  retail: ['supermarket_shop', 'customer_support_call'],
}

const SCENARIO_BY_FAMILY: Record<string, string[]> = {
  parent: ['school_daycare', 'supermarket_shop', 'doctor_visit'],
  default: ['cafe', 'supermarket_shop', 'social_small_talk'],
}

const SCENARIO_BY_GOAL: Record<string, string[]> = {
  integration_exam: ['municipality_appointment', 'social_small_talk', 'doctor_visit'],
  workplace: ['workplace_meeting', 'office_introduction', 'customer_support_call'],
  social: ['social_small_talk', 'cafe', 'dating'],
  daily_life: ['supermarket_shop', 'cafe', 'train_station', 'doctor_visit'],
  general: ['cafe', 'supermarket_shop', 'social_small_talk'],
}

const ALL_SCENARIOS = [
  'cafe',
  'supermarket_shop',
  'doctor',
  'workplace_meeting',
  'introductions',
  'customer_service',
  'social_small_talk',
  'school_daycare',
  'dating',
  'travel',
]

export function selectScenariosForUser(profile: LearnerProfile, maxCount: number): string[] {
  const seen = new Set<string>()
  const add = (ids: string[]) => {
    for (const id of ids) {
      if (seen.size >= maxCount) break
      if (ALL_SCENARIOS.includes(id) || id.includes('_')) seen.add(id)
    }
  }

  const occupation = (profile.occupation ?? '').toLowerCase()
  const occupationKey = occupation.includes('office') || occupation.includes('tech') ? 'office' : occupation.includes('health') ? 'healthcare' : occupation.includes('retail') ? 'retail' : 'default'
  add(SCENARIO_BY_OCCUPATION[occupationKey] ?? SCENARIO_BY_OCCUPATION.default)

  if (profile.family_status?.toLowerCase().includes('parent') || profile.family_status?.toLowerCase().includes('children')) {
    add(SCENARIO_BY_FAMILY.parent)
  }

  add(SCENARIO_BY_GOAL[profile.learning_goal] ?? SCENARIO_BY_GOAL.general)

  add(ALL_SCENARIOS.filter((s) => !seen.has(s)))
  return Array.from(seen).slice(0, maxCount)
}
