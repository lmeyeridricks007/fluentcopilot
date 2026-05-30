/**
 * Canonical onboarding option ids — persist these; labels can evolve in copy.
 */

export const ONBOARDING_FLOW_VERSION = 2 as const

export type OnboardingOption = { id: string; label: string; description?: string }

export const PRIMARY_GOAL_OPTIONS: OnboardingOption[] = [
  {
    id: 'everyday_dutch',
    label: 'Improve my everyday Dutch',
    description: 'Shops, appointments, and daily life',
  },
  {
    id: 'exam_inburgering',
    label: 'Prepare for the A2 exam / inburgering',
    description: 'Structured prep for official tests',
  },
  {
    id: 'confidence_b1',
    label: 'Build confidence before B1',
    description: 'Stronger A2 before the next level',
  },
  {
    id: 'speaking_more',
    label: 'Practice speaking more',
    description: 'Real conversations out loud',
  },
  {
    id: 'work_life_nl',
    label: 'Dutch for work and life here',
    description: 'Professional and social situations',
  },
]

export const CURRENT_LEVEL_OPTIONS: OnboardingOption[] = [
  { id: 'beginner', label: 'Complete beginner', description: 'Starting from zero' },
  { id: 'a1', label: 'A1', description: 'Basic phrases and simple exchanges' },
  { id: 'a2', label: 'A2', description: 'Everyday topics and routines' },
  { id: 'between_a2_b1', label: 'Between A2 and B1', description: 'Some fluency, still building' },
  { id: 'not_sure', label: 'Not sure', description: "We'll help you find the right start" },
]

/** Map self-report id → CEFR-ish string for profile / session. */
export function cefrFromLevelSelfReport(id: string): string {
  switch (id) {
    case 'beginner':
      return 'A0'
    case 'a1':
      return 'A1'
    case 'a2':
      return 'A2'
    case 'between_a2_b1':
      return 'A2+'
    case 'not_sure':
      return 'A1'
    default:
      return 'A1'
  }
}

export const TARGET_PATH_OPTIONS: OnboardingOption[] = [
  {
    id: 'a2',
    label: 'A2',
    description: 'General A2 skills and curriculum',
  },
  {
    id: 'a2_mastery',
    label: 'A2 mastery',
    description: 'Go deeper on A2 before moving on',
  },
  {
    id: 'exam_prep',
    label: 'Exam prep',
    description: 'KNM, reading, listening, speaking, writing',
  },
  {
    id: 'b1',
    label: 'B1',
    description: 'Work toward the next level',
  },
]

export const FOCUS_SKILL_OPTIONS: OnboardingOption[] = [
  { id: 'speaking', label: 'Speaking' },
  { id: 'writing', label: 'Writing' },
  { id: 'listening', label: 'Listening' },
  { id: 'reading', label: 'Reading' },
  { id: 'knm', label: 'KNM / Dutch society' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'vocabulary', label: 'Vocabulary' },
]

export const STUDY_RHYTHM_OPTIONS: OnboardingOption[] = [
  { id: 'm5', label: '5 minutes a day', description: 'Small daily habit' },
  { id: 'm10', label: '10 minutes a day', description: 'Steady progress' },
  { id: 'm20', label: '20 minutes a day', description: 'More room to grow' },
  { id: 'x3_week', label: 'A few times a week', description: 'Roughly three sessions' },
  { id: 'flexible', label: 'Flexible', description: 'No fixed rhythm for now' },
]

/** Minutes hint for missions / reminders — optional. */
export function dailyMinutesFromRhythm(id: string): number | undefined {
  if (id === 'm5') return 5
  if (id === 'm10') return 10
  if (id === 'm20') return 20
  return undefined
}

export const LEARNING_REASON_OPTIONS: OnboardingOption[] = [
  { id: 'daily_life', label: 'Daily life in the Netherlands' },
  { id: 'work', label: 'Work' },
  { id: 'exam_visa', label: 'Exam, inburgering, or visa' },
  { id: 'confidence', label: 'Confidence' },
  { id: 'social', label: 'Social life' },
  { id: 'study', label: 'Study' },
  { id: 'other', label: 'Other / not sure' },
]

export function optionLabel<T extends { id: string; label: string }>(options: T[], id: string): string {
  return options.find((o) => o.id === id)?.label ?? id
}
