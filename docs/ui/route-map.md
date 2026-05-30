# Route Map

| Route | Screen | Auth | Description |
|-------|--------|------|-------------|
| `/` | WelcomePage | No | Landing, value prop, CTA to start / sign in, premium teaser |
| `/onboarding` | OnboardingFlow | No* | Multi-step profile, level, goals, notifications, permissions |
| `/app` | AppLayout (redirect to /app/home) | Yes | Shell with header + bottom nav |
| `/app/home` | HomePage | Yes | Dashboard: greeting, streak/XP, continue learning, scenarios, reflection, exam, premium |
| `/app/learn` | LessonDiscoveryPage | Yes | Browse/filter lessons |
| `/app/learn/:lessonId` | GuidedLessonPage | Yes | Guided lesson steps, vocab, quiz entry |
| `/app/learn/:lessonId/flashcards` | FlashcardsPage | Yes | Swipe/tap cards, flip, confidence |
| `/app/learn/:lessonId/quiz` | QuizPage | Yes | Multiple choice, instant feedback, summary |
| `/app/practice/simulation` | SimulationPage | Yes | Scenario picker + chat UI |
| `/app/practice/simulation/:scenarioId` | SimulationPage | Yes | Chat simulation for scenario |
| `/app/practice/voice` | VoiceTutorPage | Yes | Voice tutor entry, mic permission, premium gate |
| `/app/practice/voice/:scenarioId` | VoiceTutorPage | Yes | Voice tutor for scenario |
| `/app/practice/listening/:exerciseId` | ListeningPage | Yes | Audio task, play, transcript, questions |
| `/app/practice/pronunciation-feedback` | PronunciationFeedbackPage | Yes | Score, breakdown, tips, retry |
| `/app/reflection` | ReflectionPage | Yes | Add reflection, generate lesson |
| `/app/exam` | ExamPrepPage | Yes | Exam sections, progress, premium lock |
| `/app/progress` | ProgressPage | Yes | XP, streak, lessons, weekly, skills |
| `/app/achievements` | AchievementsPage | Yes | Badges, leaderboard teaser |
| `/app/premium` | PremiumUpsellPage | Yes | Plans, features, restore/manage |
| `/app/settings` | SettingsPage | Yes | Profile, notifications, permissions, privacy, support, sign out |

*Onboarding is reachable without auth; completing it sets onboarding complete and redirects to /app/home.
