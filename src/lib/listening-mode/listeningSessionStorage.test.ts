import { afterEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_NS } from '@/lib/storage/storageKeys'
import { listeningModeReportHref } from '@/lib/routing/appRoutes'
import type { ListeningSessionRecord } from '@/lib/listening-mode/schema'
import { listListeningSessionHistory, writeListeningSessionRecord } from '@/lib/listening-mode/listeningSessionStorage'

const store = new Map<string, string>()

afterEach(() => {
  store.clear()
  vi.unstubAllGlobals()
})

function stubStorage() {
  const ls = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size
    },
  } as Storage
  vi.stubGlobal('localStorage', ls)
  vi.stubGlobal('window', { localStorage: ls } as unknown as Window & typeof globalThis)
}

function minimalRecord(overrides: Partial<ListeningSessionRecord> = {}): ListeningSessionRecord {
  const base: ListeningSessionRecord = {
    sessionId: 'sid-1',
    userId: 'u1',
    startedAt: '2026-04-01T10:00:00.000Z',
    endedAt: '2026-04-01T10:08:00.000Z',
    level: 'A2',
    packId: 'pack-cafe-burst',
    scenarioId: 'cafe',
    drillTypesUsed: ['gist'],
    attempts: [
      {
        clipId: 'cafe-gist-1',
        drillType: 'gist',
        scenarioId: 'cafe',
        correct: true,
        selectedIndex: 0,
        playsBeforeAnswer: 1,
        playsSlowAfterAnswer: 0,
        transcriptRevealed: false,
        revealedMeaning: false,
        listeningTags: [],
      },
    ],
    coachSummary: 'Solid gist ear — keep chaining short clips.',
    reviewClips: [],
  }
  return { ...base, ...overrides }
}

describe('writeListeningSessionRecord + history index', () => {
  it('indexes completed session for listListeningSessionHistory', () => {
    stubStorage()
    writeListeningSessionRecord(minimalRecord())
    const rows = listListeningSessionHistory('u1')
    expect(rows).toHaveLength(1)
    expect(rows[0].sessionId).toBe('sid-1')
    expect(rows[0].packTitle).toContain('Café')
    expect(rows[0].correctCount).toBe(1)
    expect(rows[0].totalAttempts).toBe(1)
    expect(rows[0].coachSummarySnippet).toContain('gist')
  })

  it('dedupes by sessionId on rewrite', () => {
    stubStorage()
    const r = minimalRecord()
    writeListeningSessionRecord(r)
    writeListeningSessionRecord({ ...r, coachSummary: 'Updated headline for same session.' })
    expect(listListeningSessionHistory('u1')).toHaveLength(1)
    expect(listListeningSessionHistory('u1')[0].coachSummarySnippet).toContain('Updated')
  })

  it('backfills history from session record keys when index is missing', () => {
    stubStorage()
    const r = minimalRecord({ sessionId: 'legacy-sid' })
    store.set(`${STORAGE_NS}.listening-session-record.legacy-sid`, JSON.stringify(r))
    const rows = listListeningSessionHistory('u1')
    expect(rows).toHaveLength(1)
    expect(rows[0].sessionId).toBe('legacy-sid')
    expect(store.get(`${STORAGE_NS}.listening-session-history.u1`)).toBeTruthy()
  })

  it('report reopen URL contains encoded session id (FluentCopilot archive)', () => {
    const sid = 'listen-sess-42'
    const href = listeningModeReportHref(sid)
    expect(href).toContain(encodeURIComponent(sid))
    expect(href).toMatch(/sessionId=/)
  })
})
