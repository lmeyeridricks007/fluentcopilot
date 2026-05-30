# FD-08 Location-Aware Prompts — Implementation Summary

## What was implemented

### Routes

- **`/app/context-prompts`** — Smart Prompts feed (cards, save/dismiss, empty/loading/denied/unsupported).
- **`/app/context-prompts/intro`** — Intro: what Smart Prompts are, examples, enable CTA, permission card, premium gate.
- **`/app/context-prompts/settings`** — Settings: enable/disable, only when app open, push notifications, frequency, venue categories, permission status, re-request CTA.
- **`/app/context-prompts/:promptId`** — Prompt detail: venue header, phrase list, pronunciation placeholder, quick practice CTA, save/dismiss, premium gate.

### Feature module (`src/features/location-prompts/`)

- **types/** — `LocationPrompt`, `VenueContext`, `PhraseSuggestion`, `PromptPreferences`, `LocationPermissionStatus`, `PromptHistoryItem`, `VenueType`, `SourceType`.
- **mocks/prompts.ts** — Realistic Dutch phrases per venue (café, restaurant, supermarket, train station, pharmacy, office, school/daycare, municipality); `MOCK_LOCATION_PROMPTS`, `getMockPrompt`, `VENUE_DISPLAY_NAMES`.
- **services/contracts.ts** — `LocationPromptService`, `LocationPromptPreferencesService`, `LocationPermissionService`, `SimulateNearbyVenueService`.
- **services/mockServices.ts** — Mock implementations with latency; permission service uses `navigator.permissions` and `getCurrentPosition` when available; save/dismiss in-memory sets.
- **store/locationPromptPreferencesStore.ts** — Zustand store for enabled, onlyWhenAppOpen, allowPushNotifications, venueCategories, frequency; persisted to localStorage; hydrate from service.
- **hooks/useLocationPermission.ts** — Wraps permission service: status, checking, request, recheck.
- **components/** — LocationPromptCard, LocationPromptHeader, VenueTypeBadge, PhraseSuggestionItem/List, LocationPermissionCard/Modal/Status, LocationPromptSettingsPanel, PromptFrequencySelector, VenueCategorySelector, PromptEmptyState/LoadingState/DeniedState/UnsupportedState, PremiumSmartPromptGate, QuickPracticeEntryCard.
- **pages/** — SmartPromptsIntroPage, ContextPromptsFeedPage, ContextPromptDetailPage, ContextPromptsSettingsPage.

### Integration

- **Home**: "Smart Prompts near you" card → `/app/context-prompts/intro`.
- **Settings**: "Location & Smart Prompts" row → `/app/context-prompts/settings`.
- **Detail**: "Start" practice → `/app/practice/simulation/:scenarioId`; premium CTA → `/app/premium`.

### Analytics scaffolding

Events in `src/lib/analytics.ts`: `smart_prompt_intro_viewed`, `smart_prompt_enable_clicked`, `location_permission_requested`, `location_permission_granted`, `location_permission_denied`, `smart_prompt_viewed`, `smart_prompt_saved`, `smart_prompt_dismissed`, `smart_prompt_practice_clicked`, `smart_prompt_settings_updated`, `smart_prompt_premium_cta_clicked`. Wired on intro, feed save/dismiss, detail view/practice/premium CTA.

---

## Architecture decisions

- **Permission**: Single hook `useLocationPermission` backed by `locationPermissionService`; service uses browser APIs when present and falls back to in-memory state for unsupported/demo.
- **Preferences**: Client store (Zustand + localStorage) plus optional hydration from `locationPromptPreferencesService.getPreferences()` on settings load.
- **Feed data**: TanStack Query with key `['location-prompts', 'feed']`; save/dismiss call service and invalidate query.
- **Premium**: `usePremiumStore`; detail shows `PremiumSmartPromptGate` when prompt is premium and user is not; intro shows gate for non-premium users.

---

## Mock / service approach

- **LocationPromptService**: getCurrentPromptFeed, getPromptById, savePrompt, dismissPrompt, getHistory — all mock with delay; save/dismiss mutate in-memory sets used by feed.
- **LocationPromptPreferencesService**: getPreferences, updatePreferences — mock with in-memory object; settings page loads and hydrates store.
- **LocationPermissionService**: getStatus (browser `navigator.permissions?.query('geolocation')` when available), requestPermission (`getCurrentPosition`), plus `setMockStatus` for tests.
- **SimulateNearbyVenueService**: simulateVenue(venueType) returns a prompt for that venue; feed empty state "Simulate" navigates to first mock prompt for demo.

---

## Remaining backend / device dependencies

- **Backend**: Replace mock `locationPromptService` with API for feed, detail, save, dismiss, history. Replace `locationPromptPreferencesService` with API for get/update preferences. Optional: place/nearby-venue and recommendation engine to drive feed from real location.
- **Device**: Real geolocation is used when the app runs in a secure context and user grants permission; no backend required for permission state. Optional: background location or push for "notify when near" if implemented server-side.

---

## Recommended next implementation step

1. **Backend**: Implement REST or BFF endpoints for prompt feed (e.g. by user + location or mock), prompt by ID, save/dismiss, history, and preferences; wire `locationPromptService` and `locationPromptPreferencesService` to those APIs.
2. **Optional**: Add "Recent" / history block on feed using `getHistory()` and optional history detail or filter.
3. **Optional**: Use `LocationPermissionModal` on first "Enable" from intro for a dedicated permission-education step before calling `requestPermission()`.
