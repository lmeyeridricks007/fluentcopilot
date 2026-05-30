# FD-09 Daily Life Lessons — UI Review 1

## Scope reviewed

- Feature module: types, mocks, services, store, components, pages
- Routes and App integration
- Home card and Settings entry
- Intro, hub, capture, lesson viewer, history, settings
- Premium gating, generation flow, delete history
- Analytics scaffolding

## Strengths

- **Types**: Clear `DailyActivityEvent`, `GeneratedDailyLesson`, `DailyLessonSummary`, `CaptureMomentInput`, `DailyLessonPreferences`, etc.
- **Mocks**: Realistic Dutch phrases and scenarios (café, supermarket, train, doctor); multiple activities and history items.
- **Services**: Typed contracts and mock implementations; generation simulates delay and status transition; activities and preferences mutable.
- **Permission/privacy**: Privacy notice on intro and settings; manual-only mode; delete history with confirmation.
- **Components**: Reusable timeline, status card, capture form, module cards, phrase list, history card, dialogs.
- **Integration**: Home "Your Dutch lesson from today", Settings "Daily Life Lessons", lesson → practice simulation.

## Findings / refinements

1. **Generation flow**: Hub invalidates `['daily-lessons']` after `requestLessonGeneration()` resolves; summary refetches and returns `todayLesson` when status is `ready`.
2. **Unused props/vars**: Removed unused `GenerationStatus` import, `minSuggested` usage; added `track('daily_lesson_opened')` in GeneratedLessonPage.
3. **Route order**: Static routes (intro, capture, history, settings) declared before `:lessonId` so they match correctly.
4. **Premium**: Hub and lesson viewer show `PremiumDailyLessonGate` when user is not premium; lesson content gated behind premium where `lesson.premiumRequired` is true.

## Scorecard (post-refinement)

| Category | Score | Notes |
|----------|-------|--------|
| UI coherence | 9 | Matches learner app patterns |
| Mobile usability | 9 | Touch targets, forms, sticky actions |
| Trust/privacy clarity | 9 | Privacy notice, manual-only, delete history |
| Practical usefulness | 9 | Capture, generate, view, history, settings |
| Component reusability | 9 | Exported components, shared UI |
| Architecture quality | 9 | Types, contracts, store, queries |
| Accessibility | 8 | Labels, focus; could add more landmarks |
| Implementation completeness | 9 | All primary screens and states |
| Backend readiness | 9 | Contracts and mocks ready for API swap |

## Next steps

- Backend: Wire services to real APIs for activities, generation, history, preferences.
- Optional: Permission education modal before first location/photo use; retention preference UI (historyRetentionDays).
