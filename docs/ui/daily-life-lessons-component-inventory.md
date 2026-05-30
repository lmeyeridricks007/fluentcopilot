# FD-09 Daily Life Lessons — Component Inventory

## Feature components (`src/features/daily-life-lessons/components/`)

| Component | Purpose |
|-----------|---------|
| ActivitySourceBadge | Badge for source type (manual, location, prompt, etc.) |
| DailyLessonActivityItem | Single activity in timeline (title, venue, note, remove) |
| DailyLessonActivityTimeline | List of today's activities |
| DailyLessonStatusCard | Today status: event count, capture/generate/open lesson CTAs |
| DailyLessonFeatureHero | Intro hero with enable / not now |
| DailyLessonPrivacyNotice | Privacy copy and trust messaging |
| DailyLessonSettingsPanel | Toggles: enable, manual-only, location, photo, voice, auto-generate, delete history |
| VenueCategoryPicker | Venue/situation chips for capture form |
| CaptureMomentForm | Form: title, venue, note, photo/voice checkboxes, submit/cancel |
| GenerationProgressCard | "Creating your lesson" loading state |
| GenerationFailedState | Error message and retry CTA |
| InsufficientActivityState | No activity yet, capture CTA |
| PremiumDailyLessonGate | Premium upsell card |
| GeneratedLessonHeader | Lesson title, date, scenario chips |
| GeneratedLessonModuleCard | Module row (phrases, vocabulary, quiz, practice) with navigation |
| GeneratedLessonPhraseList | List of Dutch phrase + translation |
| GeneratedLessonHistoryCard | History list item (date, title, scenarios, status) |
| DeleteHistoryDialog | Confirm delete history modal |

## Shared usage

- `@/components/ui/Button`, `Card`, `CardTitle`, `CardDescription`
- `@/store/premiumStore` for premium gating
