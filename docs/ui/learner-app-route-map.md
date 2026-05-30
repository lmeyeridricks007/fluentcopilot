# Learner App — Route Map

| Route | Screen | Auth | Description |
|-------|--------|------|-------------|
| `/` | WelcomePage | No | Hero, value prop, How it works, feature cards, Get started / Sign in / Continue as guest, Premium teaser |
| `/onboarding` | OnboardingFlow | No | Multi-step: language, origin, situation, level, goals, daily goal, notifications, permission education (mic, location), You're all set |
| `/app` | AppLayout | Yes | Shell: Header, main, BottomNav (Home, Learn, Practice, Progress, Settings) |
| `/app/home` | HomePage | Yes | Greeting, streak/XP, daily goal, continue learning, practice entry, scenario chips, reflection & exam cards, premium teaser, Progress/Achievements links |
| `/app/learn` | LessonDiscoveryPage | Yes | Search, category/level filters, lesson cards (premium lock indicators), browse by skill/scenario/level |
| `/app/learn/:lessonId` | GuidedLessonPage | Yes | Lesson header, progress, content blocks, vocab/grammar/dialogue, next/back, completion summary |
| `/app/learn/:lessonId/flashcards` | FlashcardsPage | Yes | Card stack, flip, confidence, progress, end summary |
| `/app/learn/:lessonId/quiz` | QuizPage | Yes | MCQ, feedback, score summary, retry |
| `/app/practice/simulation` | SimulationPage | Yes | Scenario picker, chat UI, correction/coaching panel, end summary |
| `/app/practice/simulation/:scenarioId` | SimulationPage | Yes | Same with scenario pre-selected |
| `/app/practice/voice` | VoiceTutorPage | Yes | Premium gate, mic permission, unsupported/denied states, scenario, recording, transcript, feedback link |
| `/app/practice/listening/:exerciseId` | ListeningPage | Yes | Audio player, transcript reveal, comprehension questions, result summary |
| `/app/practice/pronunciation-feedback` | PronunciationFeedbackPage | Yes | Score, breakdown, tips, retry |
| `/app/reflection` | ReflectionPage | Yes | Add moments, generate lesson, result screen, privacy |
| `/app/exam` | redirect | Yes | Redirects to `/app/exam-prep` |
| `/app/exam-prep` | ExamPrepLandingPage | Yes | A2 exam prep hub: hero, Practice vs Exam copy, five exam areas |
| `/app/exam-prep/:examType` | ExamTypeHubPage | Yes | Placeholder per domain (speaking, writing, listening, reading, kmn); training/simulation soon |
| `/app/progress` | ProgressPage | Yes | XP, streak, lessons, weekly, skills, weak areas |
| `/app/achievements` | AchievementsPage | Yes | Badges, goals, leaderboard teaser |
| `/app/premium` | PremiumUpsellPage | Yes | Plan comparison, benefits; "Try premium free (demo)" and Select activate premium (persisted); when premium: You're on Premium, Go to Home, End premium demo |
| `/app/settings` | SettingsPage | Yes | Profile, notifications, permissions, privacy, support, Subscription (Free/Premium, Upgrade or End premium demo), sign out |
| `/app/settings/profile` | ProfileSettingsPage | Yes | Edit name, email |
