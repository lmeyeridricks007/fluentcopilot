'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CoachReminderState = {
  enabled: boolean
  hour: number
  minute: number
  label: string
  setEnabled: (v: boolean) => void
  setTime: (hour: number, minute: number) => void
  setLabel: (label: string) => void
}

export const useCoachReminderStore = create<CoachReminderState>()(
  persist(
    (set) => ({
      enabled: false,
      hour: 18,
      minute: 0,
      label: 'Continue your Dutch thread',
      setEnabled: (enabled) => set({ enabled }),
      setTime: (hour, minute) => set({ hour, minute }),
      setLabel: (label) => set({ label }),
    }),
    { name: 'fc-coach-reminder-v1' }
  )
)
