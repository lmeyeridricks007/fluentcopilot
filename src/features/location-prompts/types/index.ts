/**
 * FD-08 Location-Aware Prompts — types.
 */

export type VenueType =
  | 'cafe'
  | 'restaurant'
  | 'supermarket'
  | 'train_station'
  | 'pharmacy'
  | 'office'
  | 'school_daycare'
  | 'municipality'

export type SourceType = 'mocked_location' | 'saved' | 'notification' | 'recommendation'

export interface PhraseSuggestion {
  dutch: string
  translation: string
  pronunciationHint?: string
  usageNote?: string
  formality?: 'informal' | 'formal' | 'neutral'
}

export interface VenueContext {
  venueType: VenueType
  venueName?: string
  scenarioId: string
  scenarioTitle: string
  cefrLevel: string
  distanceText?: string
}

export interface LocationPrompt {
  promptId: string
  venueType: VenueType
  venueName?: string
  scenarioId: string
  scenarioTitle: string
  cefrLevel: string
  distanceText?: string
  generatedAt: string
  isSaved: boolean
  isPremium: boolean
  phrases: PhraseSuggestion[]
  quickPracticeAvailable: boolean
  sourceType: SourceType
}

export interface PromptPreferences {
  enabled: boolean
  onlyWhenAppOpen: boolean
  allowPushNotifications: boolean
  venueCategories: Record<VenueType, boolean>
  frequency: 'always' | 'once_per_venue' | 'daily'
}

export type LocationPermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported'

export interface PromptHistoryItem {
  promptId: string
  venueType: VenueType
  scenarioTitle: string
  seenAt: string
  saved: boolean
  dismissed: boolean
}
