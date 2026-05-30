import { create } from 'zustand'
import type { UserProfileDocumentV1 } from '@/lib/storage/storageTypes'

/**
 * In-memory mirror of the persisted learner profile for the active session user.
 * Not persisted via Zustand — disk is canonical (`userProfileStorageKey`).
 */
export type LearnerProfileStoreStatus = 'idle' | 'loading' | 'ready' | 'error'

type LearnerProfileState = {
  status: LearnerProfileStoreStatus
  userId: string | null
  document: UserProfileDocumentV1 | null
  error: string | null
}

type LearnerProfileActions = {
  beginHydration: (userId: string) => void
  hydrate: (userId: string, document: UserProfileDocumentV1) => void
  clear: () => void
  setError: (message: string) => void
}

export const useLearnerProfileStore = create<LearnerProfileState & LearnerProfileActions>((set) => ({
  status: 'idle',
  userId: null,
  document: null,
  error: null,

  beginHydration: (userId) =>
    set({
      status: 'loading',
      userId,
      document: null,
      error: null,
    }),

  hydrate: (userId, document) => {
    if (document.userId !== userId) return
    set({
      status: 'ready',
      userId,
      document,
      error: null,
    })
  },

  clear: () =>
    set({
      status: 'idle',
      userId: null,
      document: null,
      error: null,
    }),

  setError: (message) =>
    set({
      status: 'error',
      error: message,
    }),
}))
