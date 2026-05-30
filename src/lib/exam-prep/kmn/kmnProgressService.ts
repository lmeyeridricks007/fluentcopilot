/**
 * Local KMN progress + derived mastery labels (complements SRS for flashcards).
 */
import type { KmnTopicId } from '@/lib/exam-prep/kmn/types'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { PRACTICE_DOMAIN_BASE_KEYS, userScopedLocalKey } from '@/lib/storage/storageKeys'

const KMN_BASE = PRACTICE_DOMAIN_BASE_KEYS.kmnProgress

function storageKey(): string {
  if (typeof window === 'undefined') return KMN_BASE
  return userScopedLocalKey(KMN_BASE, getRetentionUserId())
}

export type KmnTopicProgressRow = {
  quizAttempts: number
  quizCorrect: number
  scenarioAttempts: number
  scenarioCorrect: number
  flashCardsGraded: number
  lastActiveIso: string
}

export type KmnProgressStore = {
  version: 1
  topics: Partial<Record<KmnTopicId, KmnTopicProgressRow>>
}

function emptyRow(): KmnTopicProgressRow {
  return {
    quizAttempts: 0,
    quizCorrect: 0,
    scenarioAttempts: 0,
    scenarioCorrect: 0,
    flashCardsGraded: 0,
    lastActiveIso: new Date().toISOString(),
  }
}

export function readKmnProgressStoreForUserId(userId: string): KmnProgressStore {
  if (typeof window === 'undefined') return { version: 1, topics: {} }
  try {
    const raw = localStorage.getItem(userScopedLocalKey(KMN_BASE, userId))
    if (!raw) return { version: 1, topics: {} }
    const p = JSON.parse(raw) as KmnProgressStore
    if (p?.version !== 1 || typeof p.topics !== 'object') return { version: 1, topics: {} }
    return p
  } catch {
    return { version: 1, topics: {} }
  }
}

function readStore(): KmnProgressStore {
  if (typeof window === 'undefined') return { version: 1, topics: {} }
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return { version: 1, topics: {} }
    const p = JSON.parse(raw) as KmnProgressStore
    if (p?.version !== 1 || typeof p.topics !== 'object') return { version: 1, topics: {} }
    return p
  } catch {
    return { version: 1, topics: {} }
  }
}

function writeStore(s: KmnProgressStore) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(), JSON.stringify(s))
    window.dispatchEvent(new CustomEvent('lt-kmn-progress-updated'))
  } catch {
    /* quota */
  }
}

export function getKmnTopicProgress(topicId: KmnTopicId): KmnTopicProgressRow {
  const s = readStore()
  return { ...emptyRow(), ...s.topics[topicId] }
}

function mutateTopic(topicId: KmnTopicId, fn: (row: KmnTopicProgressRow) => KmnTopicProgressRow) {
  const s = readStore()
  const prev = { ...emptyRow(), ...s.topics[topicId] }
  const next = fn(prev)
  next.lastActiveIso = new Date().toISOString()
  s.topics[topicId] = next
  writeStore(s)
  return next
}

export function recordKmnQuizResult(topicId: KmnTopicId, correct: boolean) {
  return mutateTopic(topicId, (row) => ({
    ...row,
    quizAttempts: row.quizAttempts + 1,
    quizCorrect: row.quizCorrect + (correct ? 1 : 0),
  }))
}

export function recordKmnScenarioResult(topicId: KmnTopicId, correct: boolean) {
  return mutateTopic(topicId, (row) => ({
    ...row,
    scenarioAttempts: row.scenarioAttempts + 1,
    scenarioCorrect: row.scenarioCorrect + (correct ? 1 : 0),
  }))
}

export function recordKmnFlashcardsGraded(topicId: KmnTopicId, count: number) {
  return mutateTopic(topicId, (row) => ({
    ...row,
    flashCardsGraded: row.flashCardsGraded + Math.max(0, count),
  }))
}

export type KmnMasteryLabel = 'weak' | 'improving' | 'strong'

/**
 * Heuristic blend of quiz + scenario accuracy and volume.
 * Level 1–3 is a UX band for “basic → applied → decisions”.
 */
export function getKmnMasteryLabel(topicId: KmnTopicId): KmnMasteryLabel {
  const row = getKmnTopicProgress(topicId)
  const qa = row.quizAttempts
  const qc = row.quizCorrect
  const sa = row.scenarioAttempts
  const sc = row.scenarioCorrect
  const combinedAttempts = qa + sa
  const combinedAcc =
    combinedAttempts > 0 ? (qc + sc) / combinedAttempts : 0

  if (combinedAttempts === 0) return 'improving'
  if (combinedAttempts < 4 && combinedAcc < 0.5) return 'weak'
  if (combinedAcc >= 0.78 && qa >= 3 && sa >= 1) return 'strong'
  if (combinedAcc < 0.45 && combinedAttempts >= 3) return 'weak'
  return 'improving'
}

export function getKmnProgressionLevel(topicId: KmnTopicId): 1 | 2 | 3 {
  const row = getKmnTopicProgress(topicId)
  const scenarios = row.scenarioAttempts
  const quizAcc = row.quizAttempts > 0 ? row.quizCorrect / row.quizAttempts : 0
  if (scenarios >= 3 && quizAcc >= 0.55) return 3
  if (row.quizAttempts >= 4 || scenarios >= 1) return 2
  return 1
}

export function masteryNl(label: KmnMasteryLabel): string {
  switch (label) {
    case 'weak':
      return 'Nog oefenen'
    case 'strong':
      return 'Sterk'
    default:
      return 'Groei'
  }
}

export function progressionLabelNl(level: 1 | 2 | 3): string {
  switch (level) {
    case 1:
      return 'Basis — feiten'
    case 2:
      return 'Toegepast — keuzes'
    case 3:
      return 'Scenario’s — beslissingen'
    default:
      return ''
  }
}
