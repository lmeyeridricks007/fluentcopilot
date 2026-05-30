/**
 * Persistence port for review engine — swap localStorage for API later without touching UI.
 */
import { reviewStorageKeys } from '@/lib/storage/storageKeys'
import { reviewItemSchema, type ReviewItem } from '@/lib/schemas/reviewItem.schema'
import { srsItemSchema, type SrsItem } from '@/lib/schemas/srsItem.schema'
import { mistakeEventSchema, type MistakeEvent } from '@/lib/schemas/mistakeEvent.schema'
import { userMasterySchema, type UserMastery } from '@/lib/schemas/userMastery.schema'

/** Must match `LOCAL_ANONYMOUS_LEARNER_ID` in `@/lib/storage/storageKeys`. */
export const DEFAULT_REVIEW_USER_ID = 'local-demo-user'

const bankKey = reviewStorageKeys.bank
const srsKey = reviewStorageKeys.srs
const mistakesKey = reviewStorageKeys.mistakes
const masteryKey = reviewStorageKeys.mastery

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota */
  }
}

export type ReviewPersistencePort = {
  loadReviewBank(userId: string): Promise<ReviewItem[]>
  saveReviewBank(userId: string, items: ReviewItem[]): Promise<void>
  loadSrsItems(userId: string): Promise<SrsItem[]>
  saveSrsItems(userId: string, items: SrsItem[]): Promise<void>
  loadMistakeEvents(userId: string): Promise<MistakeEvent[]>
  saveMistakeEvents(userId: string, events: MistakeEvent[]): Promise<void>
  appendMistakeEvent(userId: string, ev: MistakeEvent): Promise<void>
  loadMastery(userId: string): Promise<UserMastery | null>
  saveMastery(userId: string, m: UserMastery): Promise<void>
}

function parseBank(raw: unknown): ReviewItem[] {
  if (!Array.isArray(raw)) return []
  const out: ReviewItem[] = []
  for (const row of raw) {
    const p = reviewItemSchema.safeParse(row)
    if (p.success) out.push(p.data)
  }
  return out
}

function parseSrs(raw: unknown): SrsItem[] {
  if (!Array.isArray(raw)) return []
  const out: SrsItem[] = []
  for (const row of raw) {
    const p = srsItemSchema.safeParse(row)
    if (p.success) out.push(p.data)
  }
  return out
}

function parseMistakes(raw: unknown): MistakeEvent[] {
  if (!Array.isArray(raw)) return []
  const out: MistakeEvent[] = []
  for (const row of raw) {
    const p = mistakeEventSchema.safeParse(row)
    if (p.success) out.push(p.data)
  }
  return out
}

export const localReviewPersistence: ReviewPersistencePort = {
  async loadReviewBank(userId) {
    return parseBank(readJson(bankKey(userId), []))
  },
  async saveReviewBank(userId, items) {
    writeJson(bankKey(userId), items)
  },
  async loadSrsItems(userId) {
    return parseSrs(readJson(srsKey(userId), []))
  },
  async saveSrsItems(userId, items) {
    writeJson(srsKey(userId), items)
  },
  async loadMistakeEvents(userId) {
    return parseMistakes(readJson(mistakesKey(userId), []))
  },
  async saveMistakeEvents(userId, events) {
    writeJson(mistakesKey(userId), events)
  },
  async appendMistakeEvent(userId, ev) {
    const next = [...(await localReviewPersistence.loadMistakeEvents(userId)), ev].slice(-800)
    writeJson(mistakesKey(userId), next)
  },
  async loadMastery(userId) {
    const raw = readJson<unknown | null>(masteryKey(userId), null)
    if (!raw) return null
    const p = userMasterySchema.safeParse(raw)
    return p.success ? p.data : null
  },
  async saveMastery(userId, m) {
    writeJson(masteryKey(userId), m)
  },
}

/** Synchronous read for client-only view models (same backing store as the port). */
export function readMistakeEventsSync(userId: string): MistakeEvent[] {
  if (typeof window === 'undefined') return []
  return parseMistakes(readJson(mistakesKey(userId), []))
}

export function readMasterySync(userId: string): UserMastery | null {
  if (typeof window === 'undefined') return null
  const raw = readJson<unknown | null>(masteryKey(userId), null)
  if (!raw) return null
  const p = userMasterySchema.safeParse(raw)
  return p.success ? p.data : null
}

export async function ensureMasteryRow(
  port: ReviewPersistencePort,
  userId: string
): Promise<UserMastery> {
  const existing = await port.loadMastery(userId)
  if (existing) return existing
  const fresh: UserMastery = {
    userId,
    vocabMasteryMap: {},
    grammarMasteryMap: {},
    skillLevels: { listening: 2, speaking: 2, writing: 2, reading: 2 },
    streak: 0,
    lastActive: new Date().toISOString(),
    metadata: {},
  }
  await port.saveMastery(userId, fresh)
  return fresh
}
