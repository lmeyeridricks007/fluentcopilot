'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { DayPracticePackApi, QuickCaptureApiStatus, QuickCaptureApiType, QuickCaptureItem } from '@/lib/api/quickCaptureClient'

function ymd(): string {
  return new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `qc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

type OfflinePack = DayPracticePackApi & { steps: unknown[] }

let ssrOrTestLocalStorageFallback: Storage | null = null

function getQuickCapturePersistStorage(): Storage {
  if (typeof window !== 'undefined') {
    try {
      const ls = window.localStorage
      ls.setItem('__fc_qc_ls_probe', '1')
      ls.removeItem('__fc_qc_ls_probe')
      return ls
    } catch {
      /* private mode / blocked */
    }
  }
  if (!ssrOrTestLocalStorageFallback) {
    const mem = new Map<string, string>()
    ssrOrTestLocalStorageFallback = {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => {
        mem.set(k, v)
      },
      removeItem: (k) => {
        mem.delete(k)
      },
      clear: () => mem.clear(),
      key: (i) => Array.from(mem.keys())[i] ?? null,
      get length() {
        return mem.size
      },
    } as Storage
  }
  return ssrOrTestLocalStorageFallback
}

type State = {
  captures: QuickCaptureItem[]
  packs: OfflinePack[]
  addCapture: (input: {
    captureType: QuickCaptureApiType
    title?: string | null
    bodyPrimary?: string | null
    bodySecondary?: string | null
    transcript?: string | null
    localCaptureDate?: string
    placeKind?: string | null
    imageMime?: string | null
    rawJson?: string | null
    initialStatus?: QuickCaptureApiStatus
  }) => QuickCaptureItem
  setCaptureStatus: (id: string, status: QuickCaptureApiStatus) => void
  addPack: (pack: OfflinePack) => void
  completePack: (packId: string) => void
  reset: () => void
}

export const useQuickCaptureOfflineStore = create<State>()(
  persist(
    (set) => ({
      captures: [],
      packs: [],
      addCapture: (input) => {
        const now = new Date().toISOString()
        const localCaptureDate = input.localCaptureDate ?? ymd()
        const primary = (input.bodyPrimary ?? input.transcript ?? '').trim()
        const status: QuickCaptureApiStatus =
          input.initialStatus ?? (primary ? 'ready_for_practice' : 'enriched')
        const row: QuickCaptureItem = {
          id: uid(),
          captureType: input.captureType,
          status,
          title: input.title ?? null,
          bodyPrimary: input.bodyPrimary ?? null,
          bodySecondary: input.bodySecondary ?? null,
          enrichedJson:
            primary || input.transcript
              ? JSON.stringify({ tags: ['offline'], scenarioSlugGuess: null, registerNotes: null })
              : null,
          rawJson: input.rawJson ?? null,
          localCaptureDate,
          placeKind: input.placeKind ?? null,
          imageMime: input.imageMime ?? null,
          transcript: input.transcript ?? null,
          dayPackId: null,
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({ captures: [row, ...s.captures] }))
        return row
      },
      setCaptureStatus: (id, status) =>
        set((s) => ({
          captures: s.captures.map((c) => (c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c)),
        })),
      addPack: (pack) => set((s) => ({ packs: [pack, ...s.packs] })),
      completePack: (packId) =>
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id === packId
              ? { ...p, status: 'completed', completedAt: new Date().toISOString() }
              : p,
          ),
          captures: s.captures.map((c) =>
            c.dayPackId === packId && c.status === 'included_in_practice'
              ? { ...c, status: 'practiced' as const, updatedAt: new Date().toISOString() }
              : c,
          ),
        })),
      reset: () => set({ captures: [], packs: [] }),
    }),
    {
      name: 'fc-quick-capture-offline-v1',
      storage: createJSONStorage(getQuickCapturePersistStorage),
    },
  ),
)

export function offlineSummaryForDate(localDate: string): { readyCount: number; newCount: number } {
  const caps = useQuickCaptureOfflineStore.getState().captures.filter((c) => c.localCaptureDate === localDate)
  let readyCount = 0
  let newCount = 0
  for (const c of caps) {
    if (c.status === 'ready_for_practice') readyCount += 1
    if (c.status === 'new') newCount += 1
  }
  return { readyCount, newCount }
}
