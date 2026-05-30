'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SessionActivityKind =
  | 'open_practice'
  | 'guided'
  | 'read_aloud'
  | 'photo_reading'
  | 'exam_prep'
  | 'listening'
  | 'exam_simulation'
  | 'exam_training'

export type SessionActivityEvent = {
  id: string
  at: string
  kind: SessionActivityKind
  scenarioId?: string
  mode?: string
  title?: string
  outcome?: string
  turnCount?: number
  note?: string
}

const MAX = 80

type State = {
  events: SessionActivityEvent[]
  append: (e: Omit<SessionActivityEvent, 'id' | 'at'>) => void
}

function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `ev-${Date.now()}`
}

export const useSessionActivityStore = create<State>()(
  persist(
    (set) => ({
      events: [],
      append: (e) =>
        set((s) => ({
          events: [{ ...e, id: uid(), at: new Date().toISOString() }, ...s.events].slice(0, MAX),
        })),
    }),
    { name: 'fc-session-activity-v1' }
  )
)

export function appendSessionActivityClient(e: Omit<SessionActivityEvent, 'id' | 'at'>): void {
  useSessionActivityStore.getState().append(e)
}
