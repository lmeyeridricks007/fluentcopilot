/**
 * FD-09 — client-side daily lesson preferences (synced with service).
 */

import { create } from 'zustand'
import type { DailyLessonPreferences } from '../types'

const STORAGE_KEY = 'language-tutor-daily-lessons-prefs'

function getStored(): Partial<DailyLessonPreferences> | null {
  if (typeof window === 'undefined') return null
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? (JSON.parse(s) as Partial<DailyLessonPreferences>) : null
  } catch {
    return null
  }
}

function persist(p: DailyLessonPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // ignore
  }
}

const defaults: DailyLessonPreferences = {
  enabled: true,
  useLocation: true,
  usePhotoAnalysis: false,
  useVoiceNotes: false,
  manualOnlyMode: false,
  autoGenerateAtEndOfDay: false,
  historyRetentionDays: 90,
}

interface State extends DailyLessonPreferences {
  setEnabled: (v: boolean) => void
  setUseLocation: (v: boolean) => void
  setUsePhotoAnalysis: (v: boolean) => void
  setUseVoiceNotes: (v: boolean) => void
  setManualOnlyMode: (v: boolean) => void
  setAutoGenerateAtEndOfDay: (v: boolean) => void
  hydrate: (p: Partial<DailyLessonPreferences>) => void
}

export const useDailyLessonPreferencesStore = create<State>((set, get) => {
  const stored = getStored()
  const initial = { ...defaults, ...stored }
  return {
    ...initial,
    setEnabled: (v) => {
      set({ enabled: v })
      persist({ ...get(), enabled: v })
    },
    setUseLocation: (v) => {
      set({ useLocation: v })
      persist({ ...get(), useLocation: v })
    },
    setUsePhotoAnalysis: (v) => {
      set({ usePhotoAnalysis: v })
      persist({ ...get(), usePhotoAnalysis: v })
    },
    setUseVoiceNotes: (v) => {
      set({ useVoiceNotes: v })
      persist({ ...get(), useVoiceNotes: v })
    },
    setManualOnlyMode: (v) => {
      set({ manualOnlyMode: v })
      persist({ ...get(), manualOnlyMode: v })
    },
    setAutoGenerateAtEndOfDay: (v) => {
      set({ autoGenerateAtEndOfDay: v })
      persist({ ...get(), autoGenerateAtEndOfDay: v })
    },
    hydrate: (p) => set((s) => ({ ...s, ...p })),
  }
})
