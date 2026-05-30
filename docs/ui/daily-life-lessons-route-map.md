# FD-09 Daily Life Lessons — Route Map

| Route | Screen | Description |
|-------|--------|-------------|
| `/app/daily-lessons` | DailyLessonsHubPage | Hub: today status, activity timeline, capture/generate CTAs, premium gate |
| `/app/daily-lessons/intro` | DailyLessonsIntroPage | Intro: what the feature does, enable CTA, privacy notice, premium gate |
| `/app/daily-lessons/capture` | CaptureMomentPage | Capture moment: title, venue, note, photo/voice placeholders |
| `/app/daily-lessons/history` | DailyLessonsHistoryPage | Previous generated lessons list |
| `/app/daily-lessons/settings` | DailyLessonsSettingsPage | Settings: enable, manual-only, location, photo, voice, auto-generate, delete history |
| `/app/daily-lessons/:lessonId` | GeneratedLessonPage | Generated lesson: header, phrases, modules, practice entry points |

## Entry points

- **Home**: "Your Dutch lesson from today" card → `/app/daily-lessons/intro`
- **Settings**: "Daily Life Lessons" row → `/app/daily-lessons/settings`
- **Hub**: History icon → `/app/daily-lessons/history`; Settings icon → `/app/daily-lessons/settings`; Capture / Generate → capture or generation flow

## Integration

- Generated lesson "Practice with AI tutor" → `/app/practice/simulation/:scenarioId`
- Premium CTA → `/app/premium`
