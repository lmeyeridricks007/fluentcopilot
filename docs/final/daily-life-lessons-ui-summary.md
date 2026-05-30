# FD-09 Daily Life AI Lesson Generator — Implementation Summary

## What was implemented

### Routes

- **`/app/daily-lessons`** — Hub: today status, activity timeline, capture moment CTA, generate lesson CTA, open lesson when ready, premium gate, loading/generation/failed states.
- **`/app/daily-lessons/intro`** — Intro: explanation, how it works, enable CTA, privacy notice, premium gate.
- **`/app/daily-lessons/capture`** — Capture moment: title, venue picker, note, photo/voice placeholders, save/cancel.
- **`/app/daily-lessons/history`** — Previous generated lessons; tap to open.
- **`/app/daily-lessons/settings`** — Enable/disable, manual-only mode, location, photo analysis, voice notes, auto-generate at end of day, delete history, privacy notice.
- **`/app/daily-lessons/:lessonId`** — Generated lesson: header, phrases, module cards (phrases, vocabulary, quiz, scenario recap, pronunciation, practice with AI), premium gate when required.

### Feature module (`src/features/daily-life-lessons/`)

- **types/index.ts** — `DailyActivityEvent`, `CaptureMomentInput`, `DailyLessonSummary`, `GeneratedDailyLesson`, `GeneratedDailyLessonModule`, `DailyLessonHistoryItem`, `DailyLessonPreferences`, `DailyLessonGenerationStatus`, `PermissionState`, `VenueType`, `DailyActivitySource`.
- **mocks/activities.ts** — `MOCK_TODAY_ACTIVITIES`, `VENUE_DISPLAY_NAMES`, `SOURCE_DISPLAY_NAMES`.
- **mocks/lessons.ts** — `MOCK_GENERATED_LESSON`, `MOCK_LESSON_HISTORY`, `getMockLessonById`.
- **services/contracts.ts** — `DailyLessonService`, `DailyActivityService`, `DailyLessonGenerationService`, `DailyLessonPreferencesService`, `DailyLessonPermissionsService`, `DailyLessonHistoryService`.
- **services/mockServices.ts** — Mock implementations with latency; in-memory activities and generation status; preferences and history service stubs.
- **store/dailyLessonPreferencesStore.ts** — Zustand store for enabled, useLocation, usePhotoAnalysis, useVoiceNotes, manualOnlyMode, autoGenerateAtEndOfDay; localStorage persistence; hydrate from service.
- **components/** — ActivitySourceBadge, DailyLessonActivityItem, DailyLessonActivityTimeline, DailyLessonStatusCard, DailyLessonFeatureHero, DailyLessonPrivacyNotice, DailyLessonSettingsPanel, VenueCategoryPicker, CaptureMomentForm, GenerationProgressCard, GenerationFailedState, InsufficientActivityState, PremiumDailyLessonGate, GeneratedLessonHeader, GeneratedLessonModuleCard, GeneratedLessonPhraseList, GeneratedLessonHistoryCard, DeleteHistoryDialog.
- **pages/** — DailyLessonsIntroPage, DailyLessonsHubPage, CaptureMomentPage, GeneratedLessonPage, DailyLessonsHistoryPage, DailyLessonsSettingsPage.

### Integration

- **Home**: "Your Dutch lesson from today" card → `/app/daily-lessons/intro`.
- **Settings**: "Daily Life Lessons" row under Preferences → `/app/daily-lessons/settings`.
- **Generated lesson**: "Practice with AI tutor" module → `/app/practice/simulation/:scenarioId`; premium CTA → `/app/premium`.

### Analytics scaffolding

Events in `src/lib/analytics.ts`: `daily_lesson_intro_viewed`, `daily_lesson_enable_clicked`, `daily_lesson_permission_requested`, `daily_lesson_permission_granted`, `daily_lesson_manual_capture_started`, `daily_lesson_manual_capture_saved`, `daily_lesson_generation_requested`, `daily_lesson_generation_succeeded`, `daily_lesson_generation_failed`, `daily_lesson_opened`, `daily_lesson_completed`, `daily_lesson_history_opened`, `daily_lesson_delete_history_clicked`, `daily_lesson_premium_cta_clicked`. Wired on intro, enable, capture, generation, lesson open, history open, delete history, premium CTA.

---

## Architecture decisions

- **State**: TanStack Query for summary, activities, lesson by id, history, generation status, preferences; Zustand for client preferences with persistence; mock services hold mutable in-memory state for activities and generation status.
- **Generation**: Mock `requestLessonGeneration()` sets status to `generating`, then after delay to `ready`; hub invalidates `['daily-lessons']` on resolve so summary refetches and returns `todayLesson`; hub shows `GenerationProgressCard` while `genStatus.status === 'generating'`.
- **Premium**: `usePremiumStore`; hub and lesson viewer show `PremiumDailyLessonGate` when user is not premium; lesson viewer gates content when `lesson.premiumRequired && !isPremium`.
- **Privacy**: Privacy notice on intro and in settings; manual-only mode; delete history with confirmation dialog.

---

## Mock / service approach

- **DailyLessonService**: getTodaySummary (reads generation status and returns todayLesson when ready), getTodayLesson, getLessonById, getLessonHistory — all mock with delay.
- **DailyActivityService**: getTodayActivities, captureMoment, removeActivityEvent — in-memory list; capture prepends, remove filters.
- **DailyLessonGenerationService**: requestLessonGeneration (sets generating → after 2.5s ready), getGenerationStatus; setMockStatus for tests.
- **DailyLessonPreferencesService / DailyLessonHistoryService**: getPreferences, updatePreferences; getHistory, deleteHistory — mock with in-memory/defaults.

---

## Remaining backend / device dependencies

- **Backend**: Replace mocks with API for: today summary and today lesson; lesson by id; history; capture moment and remove event; request lesson generation and poll status; preferences get/update; history delete. Implement actual lesson-generation pipeline that consumes activity events and returns generated lesson content.
- **Device**: Optional location/photo/voice permission flows can be wired to real APIs or device APIs when moving out of manual-only mode.

---

## Recommended next implementation step

1. **Backend**: Implement endpoints for daily-lesson summary, activities CRUD, generation request/status, lesson by id, history, preferences; implement lesson-generation job that uses activity events and returns modules/phrases/vocabulary.
2. **Optional**: Permission education modal before first use of location/photo; history retention preference control (historyRetentionDays); completion tracking and `daily_lesson_completed` when user finishes lesson modules.
