'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CoachQueuedMistake = {
  id: string
  at: string
  source: 'read_aloud' | 'photo_capture' | 'stt_alignment'
  title: string
  detail?: string
  /** 0–100 rough alignment / confidence proxy */
  score?: number
}

const MAX = 40

type State = {
  items: CoachQueuedMistake[]
  enqueue: (o: Omit<CoachQueuedMistake, 'id' | 'at'>) => void
  dismiss: (id: string) => void
}

function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `mq-${Date.now()}`
}

export const useCoachMistakeQueueStore = create<State>()(
  persist(
    (set) => ({
      items: [],
      enqueue: (o) =>
        set((s) => ({
          items: [{ ...o, id: uid(), at: new Date().toISOString() }, ...s.items].slice(0, MAX),
        })),
      dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
    }),
    { name: 'fc-coach-mistake-queue-v1' }
  )
)

export function enqueueCoachMistakeClient(o: Omit<CoachQueuedMistake, 'id' | 'at'>): void {
  useCoachMistakeQueueStore.getState().enqueue(o)
}
