import type { ComparisonRow } from './PlanComparisonTable'

/** Free / Core / Premium — maps to public marketing only; entitlements in-app may differ during beta. */
export const PRICING_COMPARISON_ROWS: ComparisonRow[] = [
  {
    category: 'Messaging & scenarios',
    free: 'Limited scenarios — enough to feel the loop.',
    core: 'Full everyday scenarios and messaging-style practice with stronger feedback.',
    premium: 'Higher limits for intensive prep and deeper scenario coaching.',
    freeLevel: 'partial',
    coreLevel: 'full',
    premiumLevel: 'full',
  },
  {
    category: 'Speaking & voice',
    free: 'Light speaking exposure.',
    core: 'Solid speaking practice with clear next-step coaching.',
    premium: 'Full speaking depth, voice surfaces, and exam-shaped speaking runs.',
    freeLevel: 'partial',
    coreLevel: 'partial',
    premiumLevel: 'full',
  },
  {
    category: 'Read aloud & analysis',
    free: 'Not included or very limited preview.',
    core: 'Meaningful read-aloud practice where enabled.',
    premium: 'Full read-aloud and delivery analysis — stress, pacing, clarity, model compare.',
    freeLevel: 'none',
    coreLevel: 'partial',
    premiumLevel: 'full',
  },
  {
    category: 'Personalization',
    free: 'Basic progress.',
    core: 'Saved words, recaps, and practical follow-up tied to your practice.',
    premium: 'Richer personalization, deeper recaps, and advanced follow-up loops.',
    freeLevel: 'partial',
    coreLevel: 'partial',
    premiumLevel: 'full',
  },
  {
    category: 'Exam prep',
    free: 'Tasters only — not full simulations or mocks.',
    core: 'Light exam exposure and orientation.',
    premium: 'Full stack: training, simulations, and practice exams across skills (e.g. KNM, speaking, writing, listening, reading).',
    freeLevel: 'none',
    coreLevel: 'partial',
    premiumLevel: 'full',
  },
]

export const FREE_PLAN_FEATURES = [
  'Explore messaging and scenarios — feel the coaching loop',
  'Limited feedback on what you submit',
  'Enough structure to judge fit before you commit',
  'Daily usage limits during beta',
]

export const CORE_PLAN_FEATURES = [
  'Practical daily progress: scenarios, messaging, and speaking core',
  'Clear corrections and next-step coaching',
  'Personal word library and review tied to your practice',
  'Smart recaps and follow-up content',
  'Light exam prep exposure — upgrade when your date firms up',
]

export const PREMIUM_PLAN_FEATURES = [
  'Everything in Core',
  'Full speaking depth and read-aloud / voice analysis where enabled',
  'Deeper personalization and recap intelligence',
  'Full exam prep: simulations, practice exams, and performance surfaces',
  'Maximum coaching bandwidth for serious timelines',
]

/** @deprecated Use CORE_PLAN_FEATURES */
export const BASIC_PLAN_FEATURES = CORE_PLAN_FEATURES
