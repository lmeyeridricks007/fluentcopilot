import type { LanguageCoachConversationRole } from '@/lib/api/languageCoachTypes'

/** Tags for the role detail panel — “best for” learning goals. */
export type LanguageCoachRoleBestForTag = 'confidence' | 'realism' | 'professional' | 'learning'

export type LanguageCoachRoleCard = {
  id: LanguageCoachConversationRole
  title: string
  /** Short line under title (premium subtitle). */
  subtitle: string
  /** One-line tone hint for the card (e.g. “Warm · relaxed”). */
  toneDescriptor: string
  /** Compact vibe line on the card. */
  vibe: string
  /** Detail panel: how it feels in practice. */
  detailFeel: string
  /** Detail panel: how the role challenges the learner (secondary to CEFR). */
  challengeLine: string
  /** Best-for tags shown as pills in the detail panel. */
  bestForTags: readonly LanguageCoachRoleBestForTag[]
  /** Single “Best for:” line for a11y / clarity. */
  bestForSummary: string
  /** “Style:” line in the panel. */
  styleLine: string
  /** Coach only: shown in detail panel. */
  coachGuideHint?: string
}

const BEST_FOR_LABELS: Record<LanguageCoachRoleBestForTag, string> = {
  confidence: 'Confidence',
  realism: 'Realism',
  professional: 'Professional Dutch',
  learning: 'Learning support',
}

/** UI + URL (`lcRole`) — must match backend `LanguageCoachConversationRole`. */
export const LANGUAGE_COACH_ROLE_CARDS: readonly LanguageCoachRoleCard[] = [
  {
    id: 'friend',
    title: 'Friend',
    subtitle: 'Casual, relaxed conversation',
    toneDescriptor: 'Warm · light · chatty',
    vibe: 'Reactions first · hobbies & weekend energy',
    detailFeel: 'Feels like texting a friend — informal Dutch, emotional room, low pressure.',
    challengeLine: 'Keeps corrections almost invisible; you stretch by talking more, not by being corrected.',
    bestForTags: ['confidence'],
    bestForSummary: 'Building confidence and natural flow',
    styleLine: 'Friendly, encouraging, emotionally light',
  },
  {
    id: 'colleague',
    title: 'Colleague',
    subtitle: 'Practical, professional Dutch',
    toneDescriptor: 'Clear · efficient · neutral-warm',
    vibe: 'Work-safe phrasing · concrete follow-ups',
    detailFeel: 'Like a quick desk chat — practical, respectful, no small-talk overload.',
    challengeLine: 'You are nudged toward clearer, more specific answers — still within your level.',
    bestForTags: ['professional'],
    bestForSummary: 'Professional Dutch and clarity',
    styleLine: 'Concise, task-aware, moderately warm',
  },
  {
    id: 'dutch_local',
    title: 'Dutch local',
    subtitle: 'Realistic everyday Dutch',
    toneDescriptor: 'Direct · natural · low fluff',
    vibe: 'Real-life rhythm · short reactions',
    detailFeel: 'Sounds like everyday Netherlands — slightly more direct, less “textbook cheerful”.',
    challengeLine: 'Slightly higher realism pressure: shorter, more natural phrasing — never harsh for your CEFR.',
    bestForTags: ['realism'],
    bestForSummary: 'Real-world Dutch and social realism',
    styleLine: 'Realistic, socially natural, modestly direct',
  },
  {
    id: 'date',
    title: 'Date',
    subtitle: 'Social, warm, curious',
    toneDescriptor: 'Warm · curious · respectful',
    vibe: 'Open follow-ups · preferences & experiences · always safe',
    detailFeel: 'Warm social energy — interested in you, never flirty or sexualized.',
    challengeLine: 'More open questions and social warmth; corrections stay minimal so flow wins.',
    bestForTags: ['confidence', 'realism'],
    bestForSummary: 'Warm conversation and social confidence',
    styleLine: 'Engaged, curious, emotionally present — premium-safe',
  },
  {
    id: 'coach',
    title: 'Coach',
    subtitle: 'Supportive, adaptive, corrective',
    toneDescriptor: 'Adaptive · educational · partner-like',
    vibe: 'Strongest learning path · recasts & nudges when helpful',
    detailFeel: 'A real conversation partner who quietly teaches — patient, clear, goal-aware.',
    challengeLine: 'Adapts to your goal and weak spots with subtle or active guidance (your choice).',
    bestForTags: ['learning', 'confidence'],
    bestForSummary: 'Improving weak areas naturally',
    styleLine: 'Supportive and adaptive',
    coachGuideHint: 'Optional: Guide me while speaking — mid-conversation phrasing help when you want it.',
  },
] as const

const ROLE_SET = new Set<string>(LANGUAGE_COACH_ROLE_CARDS.map((r) => r.id))

export function parseLanguageCoachRoleParam(raw: string | null | undefined): LanguageCoachConversationRole {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'dutchlocal') return 'dutch_local'
  if (ROLE_SET.has(v)) return v as LanguageCoachConversationRole
  return 'coach'
}

export function getLanguageCoachRoleCard(role: LanguageCoachConversationRole): LanguageCoachRoleCard {
  return LANGUAGE_COACH_ROLE_CARDS.find((c) => c.id === role) ?? LANGUAGE_COACH_ROLE_CARDS.find((c) => c.id === 'coach')!
}

export function languageCoachBestForPills(tags: readonly LanguageCoachRoleBestForTag[]): string[] {
  return tags.map((t) => BEST_FOR_LABELS[t])
}

/** Structured role profile (subset surfaced in UI; server prompt uses the full mirror). */
export type ConversationRoleProfile = {
  id: LanguageCoachConversationRole
  label: string
  description: string
  tone: string
  energy: 'low' | 'medium' | 'high'
  directness: 'soft' | 'balanced' | 'direct'
  correctionStyle: 'minimal' | 'subtle' | 'supportive' | 'active'
  pacingBias: 'slow' | 'normal' | 'slightly_fast'
  vocabularyBias: 'simple' | 'level_matched' | 'slightly_richer'
  followUpStyle: 'light' | 'balanced' | 'curious' | 'coaching'
}
