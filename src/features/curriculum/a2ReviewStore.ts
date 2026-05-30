'use client'

import { getA2LessonRecordById } from '@/demo-data/curriculum/a2Catalog'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { PRACTICE_DOMAIN_BASE_KEYS, userScopedLocalKey } from '@/lib/storage/storageKeys'

const REVIEW_BASE = PRACTICE_DOMAIN_BASE_KEYS.a2ReviewQueue
const WEAK_BASE = PRACTICE_DOMAIN_BASE_KEYS.a2WeakTags

function reviewKey(): string {
  if (typeof window === 'undefined') return REVIEW_BASE
  return userScopedLocalKey(REVIEW_BASE, getRetentionUserId())
}

function weakTagsKey(): string {
  if (typeof window === 'undefined') return WEAK_BASE
  return userScopedLocalKey(WEAK_BASE, getRetentionUserId())
}

export type A2ReviewQueueItem = {
  id: string
  lemma: string
  lessonId: string
  /** Vocabulary row vs grammar-thread reminder */
  kind?: 'lemma' | 'grammar'
  /** 0 = due +1d from enqueue; after review → 1 (+3d), then 2 (+7d), then dropped */
  stage: 0 | 1 | 2
  dueAt: string
}

export type A2WeakTagCount = { tag: string; wrongCount: number }

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
    /* ignore quota */
  }
}

function addDays(isoStart: string, days: number): string {
  const d = new Date(isoStart)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

const STAGE_DELTAS_DAYS: Record<0 | 1 | 2, number> = {
  0: 1,
  1: 3,
  2: 7,
}

/**
 * After finishing the guided path (last step → quiz), queue lemmas for spaced recall.
 */
export function enqueueReviewFromLesson(lessonId: string): void {
  const rec = getA2LessonRecordById(lessonId)
  if (!rec) return
  const fromSteps = rec.lesson_plan.steps.flatMap((s) => s.recycle_lemmas ?? [])
  const fromPed = rec.pedagogy.target_vocabulary_lemmas
  const lemmas = [...new Set([...fromSteps, ...fromPed].map((x) => x.trim().toLowerCase()).filter(Boolean))]
  const grammarLabel = rec.pedagogy.grammar_primary_label.trim()
  if (lemmas.length === 0 && !grammarLabel) return

  const now = new Date().toISOString()
  const items = readJson<A2ReviewQueueItem[]>(reviewKey(), [])
  const byLemma = new Map(items.map((x) => [x.kind === 'grammar' ? `__g__${x.lessonId}` : x.lemma, x]))

  for (const lemma of lemmas) {
    const id = `${lessonId}::${lemma}`
    const row: A2ReviewQueueItem = {
      id,
      lemma,
      lessonId,
      kind: 'lemma',
      stage: 0,
      dueAt: addDays(now, STAGE_DELTAS_DAYS[0]),
    }
    byLemma.set(lemma, row)
  }

  if (grammarLabel) {
    const gkey = `__g__${lessonId}`
    const row: A2ReviewQueueItem = {
      id: `${lessonId}::grammar`,
      lemma: grammarLabel,
      lessonId,
      kind: 'grammar',
      stage: 0,
      dueAt: addDays(now, STAGE_DELTAS_DAYS[0]),
    }
    byLemma.set(gkey, row)
  }

  writeJson(reviewKey(), [...byLemma.values()])
}

/**
 * Queue lemmas + optional grammar label from schema-driven lessons (no catalog bundle required).
 */
export function enqueueReviewForSchemaLesson(
  lessonId: string,
  lemmas: string[],
  grammarLabel?: string
): void {
  const cleaned = [...new Set(lemmas.map((x) => x.trim().toLowerCase()).filter(Boolean))]
  const gl = grammarLabel?.trim() ?? ''
  if (cleaned.length === 0 && !gl) return

  const now = new Date().toISOString()
  const items = readJson<A2ReviewQueueItem[]>(reviewKey(), [])
  const byLemma = new Map(items.map((x) => [x.kind === 'grammar' ? `__g__${x.lessonId}` : x.lemma, x]))

  for (const lemma of cleaned) {
    const row: A2ReviewQueueItem = {
      id: `${lessonId}::${lemma}`,
      lemma,
      lessonId,
      kind: 'lemma',
      stage: 0,
      dueAt: addDays(now, STAGE_DELTAS_DAYS[0]),
    }
    byLemma.set(lemma, row)
  }

  if (gl) {
    const gkey = `__g__${lessonId}`
    const row: A2ReviewQueueItem = {
      id: `${lessonId}::grammar`,
      lemma: gl,
      lessonId,
      kind: 'grammar',
      stage: 0,
      dueAt: addDays(now, STAGE_DELTAS_DAYS[0]),
    }
    byLemma.set(gkey, row)
  }

  writeJson(reviewKey(), [...byLemma.values()])
}

export function loadReviewQueue(): A2ReviewQueueItem[] {
  return readJson<A2ReviewQueueItem[]>(reviewKey(), [])
}

export function dueReviewItems(nowIso = new Date().toISOString()): A2ReviewQueueItem[] {
  return loadReviewQueue()
    .filter((x) => x.dueAt <= nowIso)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
}

/** Mark reviewed: schedule +3d, then +7d, then remove from queue. */
export function markReviewed(itemId: string): void {
  const items = loadReviewQueue()
  const ix = items.findIndex((x) => x.id === itemId)
  if (ix < 0) return
  const row = items[ix]
  const now = new Date().toISOString()
  if (row.stage === 0) {
    items[ix] = { ...row, stage: 1, dueAt: addDays(now, 3) }
  } else if (row.stage === 1) {
    items[ix] = { ...row, stage: 2, dueAt: addDays(now, 7) }
  } else {
    items.splice(ix, 1)
  }
  writeJson(reviewKey(), items)
}

export function loadWeakTags(): A2WeakTagCount[] {
  return readJson<A2WeakTagCount[]>(weakTagsKey(), [])
}

export function recordWeakSelfCheckTags(tags: string[] | undefined): void {
  if (!tags?.length) return
  const cur = loadWeakTags()
  const map = new Map(cur.map((x) => [x.tag, x.wrongCount]))
  for (const t of tags) {
    const k = t.trim()
    if (!k) continue
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  writeJson(
    weakTagsKey(),
    [...map.entries()].map(([tag, wrongCount]) => ({ tag, wrongCount }))
  )
}
