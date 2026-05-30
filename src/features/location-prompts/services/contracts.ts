/**
 * FD-08 — location prompt service contracts.
 */

import type { LocationPrompt, PromptPreferences, PromptHistoryItem, LocationPermissionStatus } from '../types'

export interface LocationPromptService {
  getCurrentPromptFeed(): Promise<LocationPrompt[]>
  getPromptById(promptId: string): Promise<LocationPrompt | null>
  savePrompt(promptId: string): Promise<void>
  dismissPrompt(promptId: string): Promise<void>
  getHistory(): Promise<PromptHistoryItem[]>
}

export interface LocationPromptPreferencesService {
  getPreferences(): Promise<PromptPreferences>
  updatePreferences(prefs: Partial<PromptPreferences>): Promise<void>
}

export interface LocationPermissionService {
  getStatus(): Promise<LocationPermissionStatus>
  requestPermission(): Promise<boolean>
}

export interface SimulateNearbyVenueService {
  simulateVenue(venueType: string): Promise<LocationPrompt | null>
}
