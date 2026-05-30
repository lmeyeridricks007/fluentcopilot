import { z } from 'zod'
import {
  RETENTION_STORAGE_KEY,
  RETENTION_PROFILE_VERSION,
} from '@/lib/retention/constants'
import type { RetentionProfile } from '@/lib/retention/types'
import { isoWeekKey } from '@/lib/retention/xp'

export const RETENTION_UPDATED_EVENT = 'language-tutor-retention-updated'

const streakStateSchema = z.object({
  current: z.number(),
  longest: z.number(),
  lastActiveLocalDate: z.string().nullable(),
})

const xpLedgerEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  amount: z.number(),
  reason: z.string(),
  ref: z.string().optional(),
})

const abilityUnlockSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  headline: z.string(),
  unlockedAt: z.string(),
})

const retentionProfileSchema = z.object({
  version: z.literal(RETENTION_PROFILE_VERSION),
  userId: z.string(),
  streak: streakStateSchema,
  totalXp: z.number(),
  ledger: z.array(xpLedgerEntrySchema),
  completedLessonIds: z.array(z.string()),
  completedModuleIds: z.array(z.string()).default([]),
  abilities: z.array(abilityUnlockSchema),
  milestones: z.object({ seenIds: z.array(z.string()) }),
  leaderboard: z.object({
    weekKey: z.string(),
    weeklyXp: z.number(),
  }),
  metadata: z.record(z.string(), z.unknown()),
})

function storageKeyForUser(userId: string) {
  return `${RETENTION_STORAGE_KEY}:${userId}`
}

export function createDefaultRetentionProfile(userId: string): RetentionProfile {
  const wk = isoWeekKey()
  return {
    version: RETENTION_PROFILE_VERSION,
    userId,
    streak: { current: 0, longest: 0, lastActiveLocalDate: null },
    totalXp: 0,
    ledger: [],
    completedLessonIds: [],
    completedModuleIds: [],
    abilities: [],
    milestones: { seenIds: [] },
    leaderboard: { weekKey: wk, weeklyXp: 0 },
    metadata: {
      firstDailyReviewDone: false,
      firstMistakeFixDone: false,
    },
  }
}

function parseProfile(raw: unknown, userId: string): RetentionProfile {
  const r = retentionProfileSchema.safeParse(raw)
  if (!r.success) return createDefaultRetentionProfile(userId)
  return r.data as RetentionProfile
}

export function loadRetentionProfileSync(userId: string): RetentionProfile {
  if (typeof window === 'undefined') return createDefaultRetentionProfile(userId)
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId))
    if (!raw) return createDefaultRetentionProfile(userId)
    return parseProfile(JSON.parse(raw) as unknown, userId)
  } catch {
    return createDefaultRetentionProfile(userId)
  }
}

export function saveRetentionProfileSync(profile: RetentionProfile): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKeyForUser(profile.userId), JSON.stringify(profile))
    window.dispatchEvent(new CustomEvent(RETENTION_UPDATED_EVENT))
  } catch {
    /* quota */
  }
}

export function subscribeRetentionUpdated(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(RETENTION_STORAGE_KEY)) cb()
  }
  const onCustom = () => cb()
  window.addEventListener('storage', onStorage)
  window.addEventListener(RETENTION_UPDATED_EVENT, onCustom)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(RETENTION_UPDATED_EVENT, onCustom)
  }
}
