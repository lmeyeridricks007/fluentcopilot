import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  loadInteractivePackProgress,
  mergeInteractiveBlockCompletion,
  saveInteractivePackProgress,
} from './packProgressStorage'
import { INTERACTIVE_PACK_PROGRESS_SCHEMA } from './interactivePackProgressTypes'

describe('packProgressStorage', () => {
  const ls = new Map<string, string>()

  beforeEach(() => {
    ls.clear()
    globalThis.window = {
      localStorage: {
        getItem: (k: string) => ls.get(k) ?? null,
        setItem: (k: string, v: string) => {
          ls.set(k, v)
        },
        removeItem: (k: string) => {
          ls.delete(k)
        },
        clear: () => ls.clear(),
        key: (i: number) => Array.from(ls.keys())[i] ?? null,
        get length() {
          return ls.size
        },
      },
    } as unknown as Window & typeof globalThis
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window')
  })

  it('migrates legacy boolean map', () => {
    ls.set('lt.v1.fyd-interactive-done.p1', JSON.stringify({ a: true, b: true }))
    const p = loadInteractivePackProgress('p1')
    expect(p.schemaVersion).toBe(INTERACTIVE_PACK_PROGRESS_SCHEMA)
    expect(p.blocks.a?.completionState).toBe('completed')
    expect(p.blocks.b?.completionState).toBe('completed')
  })

  it('merge is idempotent on repeat completion', () => {
    const base = { schemaVersion: INTERACTIVE_PACK_PROGRESS_SCHEMA, blocks: {} }
    const first = mergeInteractiveBlockCompletion(base, 'x', { outcome: 'correct' })
    expect(first.didWrite).toBe(true)
    const second = mergeInteractiveBlockCompletion(first.next, 'x', { outcome: 'incorrect' })
    expect(second.didWrite).toBe(false)
    expect(second.next.blocks.x?.result?.outcome).toBe('correct')
  })

  it('persists v2 round-trip', () => {
    saveInteractivePackProgress('p2', {
      schemaVersion: INTERACTIVE_PACK_PROGRESS_SCHEMA,
      blocks: { z: { completionState: 'completed', completedAt: '2026-01-01T00:00:00.000Z' } },
    })
    const r = loadInteractivePackProgress('p2')
    expect(r.blocks.z?.completedAt).toContain('2026')
  })
})
