import { STORAGE_NS } from '@/lib/storage/storageKeys'
import {
  INTERACTIVE_PACK_PROGRESS_SCHEMA,
  type InteractiveBlockProgressRecord,
  type InteractivePackProgressV2,
} from './interactivePackProgressTypes'

const key = (packId: string) => `${STORAGE_NS}.fyd-interactive-progress.${packId}`

/** Legacy boolean map — migrated once on read. */
const legacyKey = (packId: string) => `${STORAGE_NS}.fyd-interactive-done.${packId}`

function nowIso(): string {
  return new Date().toISOString()
}

function migrateLegacy(raw: unknown): InteractivePackProgressV2 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.schemaVersion === INTERACTIVE_PACK_PROGRESS_SCHEMA && o.blocks && typeof o.blocks === 'object') {
    return raw as InteractivePackProgressV2
  }
  const blocks: InteractivePackProgressV2['blocks'] = {}
  const t = nowIso()
  for (const [id, v] of Object.entries(o)) {
    if (v === true) {
      blocks[id] = { completionState: 'completed', completedAt: t, result: undefined }
    }
  }
  return { schemaVersion: INTERACTIVE_PACK_PROGRESS_SCHEMA, blocks }
}

export function loadInteractivePackProgress(packId: string): InteractivePackProgressV2 {
  if (typeof window === 'undefined') return { schemaVersion: INTERACTIVE_PACK_PROGRESS_SCHEMA, blocks: {} }
  try {
    const raw = window.localStorage.getItem(key(packId))
    if (raw) {
      const j = JSON.parse(raw) as unknown
      const migrated = migrateLegacy(j)
      if (migrated) return migrated
    }
    const leg = window.localStorage.getItem(legacyKey(packId))
    if (leg) {
      const j = JSON.parse(leg) as unknown
      if (j && typeof j === 'object') {
        const migrated = migrateLegacy(j)
        if (migrated && Object.keys(migrated.blocks).length) {
          saveInteractivePackProgress(packId, migrated)
          window.localStorage.removeItem(legacyKey(packId))
          return migrated
        }
      }
    }
  } catch {
    /* ignore */
  }
  return { schemaVersion: INTERACTIVE_PACK_PROGRESS_SCHEMA, blocks: {} }
}

export function saveInteractivePackProgress(packId: string, state: InteractivePackProgressV2): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key(packId), JSON.stringify(state))
  } catch {
    /* quota */
  }
}

/** @deprecated use loadInteractivePackProgress */
export function loadInteractivePackDone(packId: string): Record<string, boolean> {
  const p = loadInteractivePackProgress(packId)
  const out: Record<string, boolean> = {}
  for (const [id, row] of Object.entries(p.blocks)) {
    if (row?.completionState === 'completed') out[id] = true
  }
  return out
}

/** @deprecated use saveInteractivePackProgress — merges into existing v2 state */
export function saveInteractivePackDone(packId: string, done: Record<string, boolean>): void {
  const cur = loadInteractivePackProgress(packId)
  const t = nowIso()
  const next = { ...cur.blocks }
  for (const [id, v] of Object.entries(done)) {
    if (v === true && !next[id]) {
      next[id] = { completionState: 'completed', completedAt: t }
    }
  }
  saveInteractivePackProgress(packId, { schemaVersion: INTERACTIVE_PACK_PROGRESS_SCHEMA, blocks: next })
}

/**
 * First completion wins — ignores repeat taps on the same beat (anti-farming).
 * Returns whether a new row was written.
 */
export function mergeInteractiveBlockCompletion(
  state: InteractivePackProgressV2,
  exerciseId: string,
  result?: InteractiveBlockProgressRecord['result'],
): { next: InteractivePackProgressV2; didWrite: boolean } {
  const existing = state.blocks[exerciseId]
  if (existing?.completionState === 'completed') {
    return { next: state, didWrite: false }
  }
  const completedAt = nowIso()
  const next: InteractivePackProgressV2 = {
    schemaVersion: INTERACTIVE_PACK_PROGRESS_SCHEMA,
    blocks: {
      ...state.blocks,
      [exerciseId]: { completionState: 'completed', completedAt, result },
    },
  }
  return { next, didWrite: true }
}
