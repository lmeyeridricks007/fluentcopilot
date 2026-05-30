import { create } from 'zustand'
import type { LearnerProgressSnapshotV1 } from './progressTypes'

export type LearnerProgressStoreStatus = 'idle' | 'loading' | 'ready' | 'error'

type State = {
  status: LearnerProgressStoreStatus
  userId: string | null
  snapshot: LearnerProgressSnapshotV1 | null
  error: string | null
  lastHydratedAt: string | null
}

type Actions = {
  beginHydration: (userId: string) => void
  hydrate: (userId: string, snapshot: LearnerProgressSnapshotV1) => void
  clear: () => void
  setError: (message: string) => void
}

export const useLearnerProgressStore = create<State & Actions>((set) => ({
  status: 'idle',
  userId: null,
  snapshot: null,
  error: null,
  lastHydratedAt: null,

  beginHydration: (userId) =>
    set({
      status: 'loading',
      userId,
      snapshot: null,
      error: null,
      lastHydratedAt: null,
    }),

  hydrate: (userId, snapshot) => {
    if (snapshot.userId !== userId) return
    const at = new Date().toISOString()
    set({
      status: 'ready',
      userId,
      snapshot,
      error: null,
      lastHydratedAt: at,
    })
  },

  clear: () =>
    set({
      status: 'idle',
      userId: null,
      snapshot: null,
      error: null,
      lastHydratedAt: null,
    }),

  setError: (message) =>
    set({
      status: 'error',
      error: message,
    }),
}))
