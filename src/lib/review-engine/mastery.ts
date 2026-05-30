/**
 * Lightweight mastery aggregates (0–1 maps + skill rubric). Extensible for server sync.
 */
import type { UserMastery } from '@/lib/schemas/userMastery.schema'
import type { ReviewItemType } from '@/lib/schemas/reviewItem.schema'
import type { ReviewScore } from '@/lib/review-engine/types'

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function bumpMap(map: Record<string, number>, key: string | undefined, delta: number) {
  if (!key) return
  const prev = map[key] ?? 0.35
  map[key] = clamp01(prev + delta)
}

function skillForType(t: ReviewItemType): keyof UserMastery['skillLevels'] {
  switch (t) {
    case 'listening':
      return 'listening'
    case 'speaking':
      return 'speaking'
    case 'kmn':
      return 'reading'
    default:
      return 'reading'
  }
}

export function updateMasteryFromReviewResult(
  mastery: UserMastery,
  input: {
    itemType: ReviewItemType
    lemmaKey?: string
    grammarKey?: string
    effectiveScore: ReviewScore
    now?: string
  }
): UserMastery {
  const correct = input.effectiveScore >= 3
  const delta = correct ? 0.06 : -0.12
  const vMap = { ...mastery.vocabMasteryMap }
  const gMap = { ...mastery.grammarMasteryMap }
  bumpMap(vMap, input.lemmaKey, delta)
  bumpMap(gMap, input.grammarKey, delta)

  const sk = skillForType(input.itemType)
  const skillLevels = { ...mastery.skillLevels }
  const step = correct ? 1 : -1
  skillLevels[sk] = Math.max(0, Math.min(5, skillLevels[sk] + step))

  return {
    ...mastery,
    vocabMasteryMap: vMap,
    grammarMasteryMap: gMap,
    skillLevels,
    lastActive: input.now ?? new Date().toISOString(),
  }
}

export function updateMasteryFromLessonCompletion(
  mastery: UserMastery,
  input: { lemmas?: string[]; grammarLabel?: string; now?: string }
): UserMastery {
  const vMap = { ...mastery.vocabMasteryMap }
  const gMap = { ...mastery.grammarMasteryMap }
  for (const le of input.lemmas ?? []) {
    bumpMap(vMap, le.toLowerCase(), 0.02)
  }
  if (input.grammarLabel) {
    bumpMap(gMap, input.grammarLabel, 0.02)
  }
  return {
    ...mastery,
    vocabMasteryMap: vMap,
    grammarMasteryMap: gMap,
    lastActive: input.now ?? new Date().toISOString(),
  }
}

export function extendStreakIfNewDay(mastery: UserMastery, now: Date = new Date()): UserMastery {
  const last = new Date(mastery.lastActive)
  const sameUtcDay =
    last.getUTCFullYear() === now.getUTCFullYear() &&
    last.getUTCMonth() === now.getUTCMonth() &&
    last.getUTCDate() === now.getUTCDate()
  if (sameUtcDay) return { ...mastery, lastActive: now.toISOString() }
  const prevDay = new Date(now)
  prevDay.setUTCDate(prevDay.getUTCDate() - 1)
  const consecutive =
    last.getUTCFullYear() === prevDay.getUTCFullYear() &&
    last.getUTCMonth() === prevDay.getUTCMonth() &&
    last.getUTCDate() === prevDay.getUTCDate()
  const nextStreak = consecutive ? mastery.streak + 1 : 1
  return { ...mastery, streak: nextStreak, lastActive: now.toISOString() }
}

export function getWeakAreas(mastery: UserMastery, threshold = 0.42): string[] {
  const out: string[] = []
  for (const [k, v] of Object.entries(mastery.vocabMasteryMap)) {
    if (v < threshold) out.push(`vocab:${k}`)
  }
  for (const [k, v] of Object.entries(mastery.grammarMasteryMap)) {
    if (v < threshold) out.push(`grammar:${k}`)
  }
  return out
}

export function getStrongAreas(mastery: UserMastery, threshold = 0.78): string[] {
  const out: string[] = []
  for (const [k, v] of Object.entries(mastery.vocabMasteryMap)) {
    if (v >= threshold) out.push(`vocab:${k}`)
  }
  for (const [k, v] of Object.entries(mastery.grammarMasteryMap)) {
    if (v >= threshold) out.push(`grammar:${k}`)
  }
  return out
}
