import { STORAGE_NS } from '@/lib/storage/storageKeys'
import {
  LISTENING_PROFILE_DIMENSIONS,
  type ListeningProfileDimension,
} from '@/lib/listening-mode/listeningSkillModel'
import type { ListeningClipAttempt } from '@/lib/listening-mode/schema'

const SCHEMA_VERSION = 1 as const

export type ListeningLearnerProfile = {
  schemaVersion: typeof SCHEMA_VERSION
  updatedAt: string
  /** 0 = strong, 1 = very weak — higher means needs more practice. */
  dimensionStress: Record<ListeningProfileDimension, number>
  sessionIds: string[]
}

function keyProfile(userId: string): string {
  return `${STORAGE_NS}.listening-profile.v${SCHEMA_VERSION}.${userId}`
}

function defaultStress(): Record<ListeningProfileDimension, number> {
  return Object.fromEntries(LISTENING_PROFILE_DIMENSIONS.map((d) => [d, 0.35])) as Record<
    ListeningProfileDimension,
    number
  >
}

export function readListeningProfile(userId: string): ListeningLearnerProfile {
  if (typeof window === 'undefined') {
    return {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      dimensionStress: defaultStress(),
      sessionIds: [],
    }
  }
  try {
    const raw = window.localStorage.getItem(keyProfile(userId))
    if (!raw) throw new Error('empty')
    const j = JSON.parse(raw) as ListeningLearnerProfile
    if (j.schemaVersion !== SCHEMA_VERSION || !j.dimensionStress) throw new Error('bad')
    return j
  } catch {
    return {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      dimensionStress: defaultStress(),
      sessionIds: [],
    }
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function bumpDimension(
  stress: Record<ListeningProfileDimension, number>,
  d: ListeningProfileDimension,
  delta: number
): void {
  stress[d] = clamp01((stress[d] ?? 0) + delta)
}

/** Heuristic merge from one finished session into local listening memory (client-only). */
export function mergeAttemptsIntoListeningProfile(
  userId: string,
  sessionId: string,
  attempts: ListeningClipAttempt[]
): ListeningLearnerProfile {
  const prev = readListeningProfile(userId)
  const stress = { ...prev.dimensionStress }

  for (const a of attempts) {
    if (!a.correct) {
      if (a.drillType === 'gist' || a.drillType === 'replay_reveal') bumpDimension(stress, 'gist', 0.06)
      if (a.drillType === 'detail_catch' || a.drillType === 'order_instruction') bumpDimension(stress, 'detail_accuracy', 0.07)
      if (a.drillType === 'fast_dutch') bumpDimension(stress, 'fast_speech', 0.08)
      if (a.drillType === 'listen_respond') bumpDimension(stress, 'response_readiness', 0.07)
      if (a.listeningTags.includes('numbers') || a.listeningTags.includes('times')) {
        bumpDimension(stress, 'numbers_times', 0.06)
      }
      if (a.listeningTags.includes('route_words')) {
        bumpDimension(stress, 'route_place', 0.06)
      }
      if (a.listeningTags.includes('natural_reply') || a.listeningTags.includes('service_phrases')) {
        bumpDimension(stress, 'natural_reply', 0.05)
      }
    } else {
      if (a.drillType === 'gist' || a.drillType === 'replay_reveal') bumpDimension(stress, 'gist', -0.03)
      if (a.drillType === 'detail_catch' || a.drillType === 'order_instruction') bumpDimension(stress, 'detail_accuracy', -0.03)
      if (a.drillType === 'fast_dutch') bumpDimension(stress, 'fast_speech', -0.03)
      if (a.drillType === 'listen_respond') bumpDimension(stress, 'response_readiness', -0.03)
      if (a.drillType === 'weak_area') {
        bumpDimension(stress, 'route_place', -0.02)
        bumpDimension(stress, 'numbers_times', -0.02)
      }
    }
    if (a.playsBeforeAnswer >= 3) bumpDimension(stress, 'replay_dependence', 0.04)
    if (a.transcriptRevealed && !a.correct) bumpDimension(stress, 'transcript_dependence', 0.05)
    if (a.transcriptPeekBeforeAnswer) bumpDimension(stress, 'transcript_dependence', 0.04)
  }

  // Perfect bursts still help “fast ear” confidence in the hub even when the pack has no `fast_dutch` clip.
  const allCorrect = attempts.length > 0 && attempts.every((a) => a.correct)
  if (allCorrect) {
    bumpDimension(stress, 'fast_speech', -0.014 * Math.min(attempts.length, 4))
  }

  const sessionIds = [sessionId, ...prev.sessionIds.filter((id) => id !== sessionId)].slice(0, 24)
  const next: ListeningLearnerProfile = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    dimensionStress: stress,
    sessionIds,
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(keyProfile(userId), JSON.stringify(next))
  }
  return next
}
