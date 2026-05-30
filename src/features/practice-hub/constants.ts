/**
 * Practice Hub constants + weak-tag routing.
 * Browse categories use the scenario catalog taxonomy (`hubCategoryCards`).
 */

import type { ScenarioCategoryVm, SkillTrackVm } from './types'
import {
  CATALOG_CATEGORY_LABELS,
  countScenariosByCategory,
} from '@/lib/practice/scenarioCatalog'
import type { ScenarioCatalogCategory } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import type { SkillTrackId } from '@/lib/schemas/practice/skillTrack.schema'

/** Hub carousel: fixed order, copy + icon; counts from catalog JSON. */
export const HUB_CATALOG_NAV: Array<{
  category: ScenarioCatalogCategory
  icon: string
  description: string
}> = [
  { category: 'food', icon: '☕', description: 'Cafés, shops, paying' },
  { category: 'work', icon: '💼', description: 'Meetings, colleagues' },
  { category: 'health', icon: '🩺', description: 'Doctor, pharmacy' },
  { category: 'municipality', icon: '🏛️', description: 'Gemeente, documents' },
  { category: 'housing', icon: '🏠', description: 'Landlord, repairs' },
  { category: 'transport', icon: '🚂', description: 'Station, tickets' },
  { category: 'social', icon: '💬', description: 'Plans, small talk' },
  { category: 'problem_solving', icon: '🔧', description: 'Fix mix-ups calmly' },
  { category: 'appointments', icon: '📅', description: 'Book slots, confirm details' },
]

export function hubCategoryCards(): ScenarioCategoryVm[] {
  const counts = countScenariosByCategory()
  return HUB_CATALOG_NAV.map((row) => ({
    id: row.category,
    title: CATALOG_CATEGORY_LABELS[row.category].title,
    description: row.description,
    icon: row.icon,
    scenarioCount: counts[row.category],
    href: `/app/practice/scenarios?category=${encodeURIComponent(row.category)}`,
  }))
}

export function skillTrackDefinitions(): SkillTrackVm[] {
  return [
    {
      id: 'speaking_fluency',
      title: 'Speaking fluency',
      description: 'Say it out loud — short prompts, less freezing',
      icon: '🎙️',
      href: '/app/practice/tracks/speaking_fluency',
      premium: true,
    },
    {
      id: 'listening_confidence',
      title: 'Listening confidence',
      description: 'Gist, detail, realistic clips — without a full chat',
      icon: '🎧',
      href: '/app/practice/tracks/listening_confidence',
    },
    {
      id: 'reading_real_life',
      title: 'Reading in real life',
      description: 'Signs, messages, menus — scan for what matters',
      icon: '📖',
      href: '/app/practice/tracks/reading_real_life',
    },
    {
      id: 'writing_messages',
      title: 'Writing simple messages',
      description: 'Polite, clear lines for work, friends, admin',
      icon: '✉️',
      href: '/app/practice/tracks/writing_messages',
    },
    {
      id: 'conversation_repair',
      title: 'Reaction speed & repair',
      description: 'Clarify, recover, keep the talk moving',
      icon: '⚡',
      href: '/app/practice/tracks/conversation_repair',
    },
  ]
}

/** Weak-tag substrings → user-facing copy + scenario fallback + optional skill-track primary CTA */
export const WEAK_TAG_ROUTING: Array<{
  match: (tag: string) => boolean
  label: string
  why: string
  scenarioId: string
  /** When set, weak-area card opens this skill track first (still uses scenarioId for recommendations fallback). */
  skillTrackPrimaryId?: SkillTrackId
}> = [
  {
    match: (t) => /order|word|modal|polite|request/i.test(t),
    label: 'Polite requests',
    why: 'Service Dutch sticks faster with short scenario reps.',
    scenarioId: 'cafe',
    skillTrackPrimaryId: 'writing_messages',
  },
  {
    match: (t) => /grammar|word-order|order/i.test(t),
    label: 'Word order',
    why: 'Questions and modals need rhythm — micro-writing reinforces structure.',
    scenarioId: 'supermarket_shop',
    skillTrackPrimaryId: 'writing_messages',
  },
  {
    match: (t) => /listen|gist|audio|hear/i.test(t),
    label: 'Listening speed',
    why: 'Short listening drills build gist and detail before long chats.',
    scenarioId: 'train',
    skillTrackPrimaryId: 'listening_confidence',
  },
  {
    match: () => true,
    label: 'Targeted practice',
    why: 'We picked a scenario that matches your recent slips.',
    scenarioId: 'doctor',
  },
]
