'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type NextActionDismissState = {
  dismissedIds: string[]
  completedIds: string[]
  dismiss: (id: string) => void
  markComplete: (id: string) => void
  clearDismissed: () => void
}

export const useNextActionDismissStore = create<NextActionDismissState>()(
    persist(
    (set) => ({
      dismissedIds: [],
      completedIds: [],
      dismiss: (id) =>
        set((s) =>
          s.dismissedIds.includes(id) ? s : { dismissedIds: [...s.dismissedIds, id] }
        ),
      markComplete: (id) =>
        set((s) =>
          s.completedIds.includes(id) ? s : { completedIds: [...s.completedIds, id] }
        ),
      clearDismissed: () => set({ dismissedIds: [] }),
    }),
    { name: 'next-action-dismiss-v1' }
  )
)

export function isNextActionActive(id: string): boolean {
  const { dismissedIds, completedIds } = useNextActionDismissStore.getState()
  return !dismissedIds.includes(id) && !completedIds.includes(id)
}
