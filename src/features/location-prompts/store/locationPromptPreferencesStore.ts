/**
 * FD-08 — client-side Smart Prompts preferences (synced with service).
 */

import { create } from 'zustand'
import type { PromptPreferences, VenueType } from '../types'

const STORAGE_KEY = 'language-tutor-smart-prompts-prefs'

const DEFAULT_VENUES: Record<VenueType, boolean> = {
  cafe: true,
  restaurant: true,
  supermarket: true,
  train_station: true,
  pharmacy: true,
  office: true,
  school_daycare: true,
  municipality: true,
}

function getStored(): Partial<PromptPreferences> | null {
  if (typeof window === 'undefined') return null
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? (JSON.parse(s) as Partial<PromptPreferences>) : null
  } catch {
    return null
  }
}

function persist(prefs: PromptPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

interface LocationPromptPreferencesState extends PromptPreferences {
  setEnabled: (v: boolean) => void
  setOnlyWhenAppOpen: (v: boolean) => void
  setAllowPushNotifications: (v: boolean) => void
  setVenueCategory: (venue: VenueType, enabled: boolean) => void
  setFrequency: (v: PromptPreferences['frequency']) => void
  hydrate: (fromService: Partial<PromptPreferences>) => void
}

const defaultPrefs: PromptPreferences = {
  enabled: true,
  onlyWhenAppOpen: true,
  allowPushNotifications: false,
  venueCategories: { ...DEFAULT_VENUES },
  frequency: 'always',
}

export const useLocationPromptPreferencesStore = create<LocationPromptPreferencesState>((set, get) => {
  const stored = getStored()
  const initial = { ...defaultPrefs, ...stored }
  if (stored?.venueCategories) initial.venueCategories = { ...DEFAULT_VENUES, ...stored.venueCategories }
  return {
    ...initial,
    setEnabled: (v) => {
      set((s) => ({ ...s, enabled: v }))
      persist({ ...get(), enabled: v })
    },
    setOnlyWhenAppOpen: (v) => {
      set((s) => ({ ...s, onlyWhenAppOpen: v }))
      persist({ ...get(), onlyWhenAppOpen: v })
    },
    setAllowPushNotifications: (v) => {
      set((s) => ({ ...s, allowPushNotifications: v }))
      persist({ ...get(), allowPushNotifications: v })
    },
    setVenueCategory: (venue, enabled) => {
      set((s) => ({
        ...s,
        venueCategories: { ...s.venueCategories, [venue]: enabled },
      }))
      persist({ ...get(), venueCategories: { ...get().venueCategories, [venue]: enabled } })
    },
    setFrequency: (v) => {
      set((s) => ({ ...s, frequency: v }))
      persist({ ...get(), frequency: v })
    },
    hydrate: (fromService) => {
      set((s) => ({ ...s, ...fromService }))
      persist({ ...get(), ...fromService })
    },
  }
})
