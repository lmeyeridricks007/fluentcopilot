'use client'

import type { SkillTrackId } from '@/lib/schemas/practice/skillTrack.schema'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { PRACTICE_DOMAIN_BASE_KEYS, userScopedLocalKey } from '@/lib/storage/storageKeys'

const SKILL_BASE = PRACTICE_DOMAIN_BASE_KEYS.skillTrackProgress

function storageKey(): string {
  if (typeof window === 'undefined') return SKILL_BASE
  return userScopedLocalKey(SKILL_BASE, getRetentionUserId())
}

export type SkillTrackProgressRow = {
  trackId: SkillTrackId
  /** Highest level index the learner may start (0–3) */
  unlockedLevelIndex: number
  /** Best session score 0–1 per level */
  bestScoreByLevel: Record<number, number>
  sessionsCompleted: number
  lastPlayedAt: string | null
}

export type SkillTrackProgressState = {
  tracks: Record<string, SkillTrackProgressRow>
}

export function readSkillTrackProgressStateForUserId(userId: string): SkillTrackProgressState {
  if (typeof window === 'undefined') return { tracks: {} }
  try {
    const raw = localStorage.getItem(userScopedLocalKey(SKILL_BASE, userId))
    if (!raw) return { tracks: {} }
    const p = JSON.parse(raw) as SkillTrackProgressState
    return p?.tracks ? p : { tracks: {} }
  } catch {
    return { tracks: {} }
  }
}

function read(): SkillTrackProgressState {
  if (typeof window === 'undefined') return { tracks: {} }
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return { tracks: {} }
    const p = JSON.parse(raw) as SkillTrackProgressState
    return p?.tracks ? p : { tracks: {} }
  } catch {
    return { tracks: {} }
  }
}

function write(state: SkillTrackProgressState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(), JSON.stringify(state))
    window.dispatchEvent(new CustomEvent('lt-weakness-updated'))
    window.dispatchEvent(new CustomEvent('lt-skill-track-progress-updated'))
  } catch {
    /* quota */
  }
}

export function loadSkillTrackProgress(trackId: SkillTrackId): SkillTrackProgressRow {
  const s = read()
  return (
    s.tracks[trackId] ?? {
      trackId,
      unlockedLevelIndex: 0,
      bestScoreByLevel: {},
      sessionsCompleted: 0,
      lastPlayedAt: null,
    }
  )
}

export function saveSkillTrackSessionOutcome(input: {
  trackId: SkillTrackId
  levelIndex: number
  score: number
  passedThreshold: boolean
}): SkillTrackProgressRow {
  const s = read()
  const prev = loadSkillTrackProgress(input.trackId)
  const best = Math.max(prev.bestScoreByLevel[input.levelIndex] ?? 0, input.score)
  const nextBest = { ...prev.bestScoreByLevel, [input.levelIndex]: best }
  let unlocked = prev.unlockedLevelIndex
  if (input.passedThreshold && input.levelIndex === unlocked && unlocked < 3) {
    unlocked = unlocked + 1
  }
  const row: SkillTrackProgressRow = {
    trackId: input.trackId,
    unlockedLevelIndex: Math.max(unlocked, prev.unlockedLevelIndex),
    bestScoreByLevel: nextBest,
    sessionsCompleted: prev.sessionsCompleted + 1,
    lastPlayedAt: new Date().toISOString(),
  }
  s.tracks[input.trackId] = row
  write(s)
  return row
}
