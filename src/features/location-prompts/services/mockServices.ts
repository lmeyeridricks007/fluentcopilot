/**
 * FD-08 — mock location prompt services.
 */

import type { PromptPreferences } from '../types'
import { MOCK_LOCATION_PROMPTS, getMockPrompt } from '../mocks/prompts'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

const saved = new Set<string>(['prompt-super-1'])
const dismissed = new Set<string>()

let mockPreferences: PromptPreferences = {
  enabled: true,
  onlyWhenAppOpen: true,
  allowPushNotifications: false,
  venueCategories: {
    cafe: true,
    restaurant: true,
    supermarket: true,
    train_station: true,
    pharmacy: true,
    office: true,
    school_daycare: true,
    municipality: true,
  },
  frequency: 'always',
}

export const locationPromptService = {
  async getCurrentPromptFeed() {
    await delay(250)
    return MOCK_LOCATION_PROMPTS.map((p) => ({
      ...p,
      isSaved: saved.has(p.promptId),
    })).filter((p) => !dismissed.has(p.promptId))
  },
  async getPromptById(promptId: string) {
    await delay(150)
    const p = getMockPrompt(promptId)
    if (!p) return null
    return { ...p, isSaved: saved.has(promptId) }
  },
  async savePrompt(promptId: string) {
    await delay(200)
    saved.add(promptId)
  },
  async dismissPrompt(promptId: string) {
    await delay(200)
    dismissed.add(promptId)
  },
  async getHistory() {
    await delay(150)
    return MOCK_LOCATION_PROMPTS.slice(0, 5).map((p) => ({
      promptId: p.promptId,
      venueType: p.venueType,
      scenarioTitle: p.scenarioTitle,
      seenAt: p.generatedAt,
      saved: saved.has(p.promptId),
      dismissed: dismissed.has(p.promptId),
    }))
  },
}

export const locationPromptPreferencesService = {
  async getPreferences() {
    await delay(100)
    return { ...mockPreferences }
  },
  async updatePreferences(prefs: Partial<PromptPreferences>) {
    await delay(150)
    mockPreferences = { ...mockPreferences, ...prefs }
  },
}

let mockLocationStatus: 'prompt' | 'granted' | 'denied' | 'unsupported' = 'prompt'

export const locationPermissionService = {
  async getStatus() {
    await delay(50)
    if (typeof navigator === 'undefined') return mockLocationStatus
    if (!navigator.geolocation) return 'unsupported' as const
    try {
      const perm = await navigator.permissions?.query({ name: 'geolocation' })
      if (perm) {
        if (perm.state === 'granted') return 'granted' as const
        if (perm.state === 'denied') return 'denied' as const
      }
    } catch {
      // ignore
    }
    return mockLocationStatus
  },
  async requestPermission() {
    await delay(300)
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      return new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            mockLocationStatus = 'granted'
            resolve(true)
          },
          () => {
            mockLocationStatus = 'denied'
            resolve(false)
          },
          { timeout: 5000 }
        )
      })
    }
    mockLocationStatus = 'unsupported'
    return false
  },
  setMockStatus(s: typeof mockLocationStatus) {
    mockLocationStatus = s
  },
}

export const simulateNearbyVenueService = {
  async simulateVenue(venueType: string) {
    await delay(400)
    const prompt = MOCK_LOCATION_PROMPTS.find((p) => p.venueType === venueType)
    return prompt ? { ...prompt, isSaved: saved.has(prompt.promptId) } : null
  },
}
