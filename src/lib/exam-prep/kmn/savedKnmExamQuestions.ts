/**
 * KNM exam MCQs saved from simulation report — separate from library words/phrases.
 */
import type { ExamTaskInstance } from '@/lib/exam-system/types'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { PRACTICE_DOMAIN_BASE_KEYS, userScopedLocalKey } from '@/lib/storage/storageKeys'

const BASE = PRACTICE_DOMAIN_BASE_KEYS.kmnSavedExamQuestions

export const KNM_SAVED_QUESTIONS_UPDATED_EVENT = 'lt-knm-saved-questions-updated' as const

export type SavedKnmExamQuestion = {
  id: string
  savedAtIso: string
  promptNl: string
  promptEn: string
  options: { id: string; label: string; imageUrl?: string }[]
  correctOptionIds: string[]
  audioScriptNl?: string
  illustrationId?: string
  questionImageUrl?: string
  sourceSessionId?: string
  sourceTaskId?: string
  /** Snapshot from report when saved */
  lastUserAnswerText?: string
  lastAttemptCorrect?: boolean
}

export type SavedKnmExamQuestionsStore = {
  version: 1
  items: SavedKnmExamQuestion[]
}

function storageKeyForUser(userId: string): string {
  return userScopedLocalKey(BASE, userId)
}

function storageKey(): string {
  if (typeof window === 'undefined') return BASE
  return storageKeyForUser(getRetentionUserId())
}

function notifyUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(KNM_SAVED_QUESTIONS_UPDATED_EVENT))
}

function emptyStore(): SavedKnmExamQuestionsStore {
  return { version: 1, items: [] }
}

/** Stable id from question content so the same bank item does not duplicate across sessions. */
export function fingerprintKnmExamQuestion(task: Pick<ExamTaskInstance, 'promptNl' | 'mcq'>): string {
  const opts =
    task.mcq?.options
      .map((o) => `${o.id}:${o.label.trim()}`)
      .sort()
      .join('|') ?? ''
  const correct = [...(task.mcq?.correctOptionIds ?? [])].sort().join(',')
  return `${task.promptNl.trim()}::${opts}::${correct}`
}

export function stableSavedKnmQuestionId(fingerprint: string): string {
  let h = 0
  for (let i = 0; i < fingerprint.length; i += 1) {
    h = (Math.imul(31, h) + fingerprint.charCodeAt(i)) | 0
  }
  return `knm-saved-${(h >>> 0).toString(36)}`
}

export function readSavedKnmExamQuestionsStoreForUser(userId: string): SavedKnmExamQuestionsStore {
  if (typeof window === 'undefined') return emptyStore()
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId))
    if (!raw) return emptyStore()
    const p = JSON.parse(raw) as SavedKnmExamQuestionsStore
    if (p?.version !== 1 || !Array.isArray(p.items)) return emptyStore()
    return p
  } catch {
    return emptyStore()
  }
}

export function readSavedKnmExamQuestions(): SavedKnmExamQuestion[] {
  const store = readSavedKnmExamQuestionsStoreForUser(getRetentionUserId())
  return [...store.items].sort((a, b) => b.savedAtIso.localeCompare(a.savedAtIso))
}

function writeStore(store: SavedKnmExamQuestionsStore) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(), JSON.stringify(store))
    notifyUpdated()
  } catch {
    /* quota */
  }
}

export function isKnmExamQuestionSaved(id: string): boolean {
  return readSavedKnmExamQuestions().some((q) => q.id === id)
}

export type SaveKnmExamQuestionMeta = {
  sessionId?: string
  userAnswerText?: string
  wasCorrect?: boolean
}

export function buildSavedKnmExamQuestionFromTask(
  task: ExamTaskInstance,
  meta?: SaveKnmExamQuestionMeta,
): SavedKnmExamQuestion | null {
  if (!task.mcq?.options?.length || task.taskType !== 'knowledge_mcq') return null
  const fp = fingerprintKnmExamQuestion(task)
  const id = stableSavedKnmQuestionId(fp)
  const audio = task.listeningScriptNl?.trim() || task.promptNl.trim()
  return {
    id,
    savedAtIso: new Date().toISOString(),
    promptNl: task.promptNl.trim(),
    promptEn: task.promptEn.trim(),
    options: task.mcq.options.map((o) => ({
      id: o.id,
      label: o.label,
      ...(o.imageUrl ? { imageUrl: o.imageUrl } : {}),
    })),
    correctOptionIds: [...task.mcq.correctOptionIds],
    ...(audio ? { audioScriptNl: audio } : {}),
    ...(task.mcq.illustrationId ? { illustrationId: task.mcq.illustrationId } : {}),
    ...(task.mcq.questionImageUrl ? { questionImageUrl: task.mcq.questionImageUrl } : {}),
    ...(meta?.sessionId ? { sourceSessionId: meta.sessionId } : {}),
    sourceTaskId: task.id,
    ...(meta?.userAnswerText?.trim() ? { lastUserAnswerText: meta.userAnswerText.trim() } : {}),
    ...(typeof meta?.wasCorrect === 'boolean' ? { lastAttemptCorrect: meta.wasCorrect } : {}),
  }
}

export function saveKnmExamQuestionFromTask(
  task: ExamTaskInstance,
  meta?: SaveKnmExamQuestionMeta,
): SavedKnmExamQuestion | null {
  const item = buildSavedKnmExamQuestionFromTask(task, meta)
  if (!item) return null
  const store = readSavedKnmExamQuestionsStoreForUser(getRetentionUserId())
  const ix = store.items.findIndex((q) => q.id === item.id)
  if (ix >= 0) {
    store.items[ix] = { ...store.items[ix]!, ...item, savedAtIso: new Date().toISOString() }
  } else {
    store.items.unshift(item)
  }
  writeStore(store)
  return item
}

export function removeSavedKnmExamQuestion(id: string): void {
  const store = readSavedKnmExamQuestionsStoreForUser(getRetentionUserId())
  store.items = store.items.filter((q) => q.id !== id)
  writeStore(store)
}
