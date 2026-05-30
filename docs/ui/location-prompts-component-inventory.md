# FD-08 Location-Aware Prompts — Component Inventory

## Feature components (`src/features/location-prompts/components/`)

| Component | Purpose |
|-----------|---------|
| LocationPromptCard | Feed card: venue badge, title, distance, phrase preview, save/dismiss |
| LocationPromptHeader | Detail header: venue badge, scenario title, distance, CEFR/premium |
| VenueTypeBadge | Badge for venue type (café, train station, etc.) |
| PhraseSuggestionItem | Single phrase: Dutch, translation, usage note, formality |
| PhraseSuggestionList | List of phrases with optional maxVisible |
| LocationPermissionCard | Inline card: why location, enable / not now |
| LocationPermissionModal | Modal: education copy, continue / not now |
| LocationPermissionStatus | Status text + icon: granted / denied / not requested / unsupported |
| LocationPromptSettingsPanel | Full settings: enable, only when open, notifications, frequency, venue toggles, privacy note |
| PromptFrequencySelector | Radio group: always / once per venue / daily |
| VenueCategorySelector | Checkboxes per venue type |
| PromptEmptyState | Empty feed: message, settings CTA, optional simulate (demo) |
| PromptLoadingState | Skeleton cards for feed/detail |
| PromptDeniedState | Location denied: message, open settings, retry |
| PromptUnsupportedState | Geolocation unsupported |
| PremiumSmartPromptGate | Premium upsell card with CTA |
| QuickPracticeEntryCard | CTA to start AI practice from prompt |

## Shared usage

- `@/components/ui/Button`, `Card`, `CardTitle`, `CardDescription`
- `@/store/premiumStore` for premium gating
