# UI Validation Index

**Purpose**: Map features/modules to required screens, components, routes, actions, and UI states. Compare documented requirements vs implemented status.

**Source of truth**: docs/ui/ui-feature-implementation-plan.md, docs/final/feature-domain-breakdown.md, docs/implementation/features/*.md, App.tsx routes.

**Last updated**: Validation Run 1.

---

## 1. Authentication (E-01)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | WelcomePage, LoginPage, SignUpPage, ForgotPasswordPage, Logout (Settings) | All present | ✓ |
| **Components** | Login form, SignUp form, Forgot form, OAuth placeholders | All present | ✓ |
| **Routes** | /, /login, /signup, /forgot-password | All registered | ✓ |
| **Actions** | Sign in, Create account, Forgot password, OAuth (mock), Sign out | All wired | ✓ |
| **UI States** | Loading (submit), Error (API), Success (forgot), Empty (N/A) | Loading + error on auth pages | ✓ |

---

## 2. Entitlements & Subscription (E-13)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | EntitlementProvider, UsageIndicator, PaywallModal, TrialBanner, Settings subscription, Premium page | All present | ✓ |
| **Components** | Context, UsageIndicator, PaywallModal, TrialBanner | All present | ✓ |
| **Routes** | /app/premium, /app/settings (section) | Present | ✓ |
| **Actions** | Start trial, Upgrade, Manage subscription, End demo, Paywall Upgrade/Come back | All wired | ✓ |
| **UI States** | Trial banner dismissible, Free/Trial/Premium display | Present | ✓ |

---

## 3. Onboarding & Profile (E-02)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | OnboardingFlow (steps), ProfileSettingsPage | All present | ✓ |
| **Components** | Step forms (language, origin, situation, level, goals, daily goal, notifications, permissions) | All present | ✓ |
| **Routes** | /onboarding, /app/settings/profile | Present | ✓ |
| **Actions** | Back, Continue, Start learning, Save profile, Cancel | All wired | ✓ |
| **UI States** | Progress bar, step validation | Present | ✓ |

---

## 4. Core Lessons (E-03)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | LessonDiscoveryPage, GuidedLessonPage, FlashcardsPage, QuizPage, CapReachedModal (PaywallModal) | All present | ✓ |
| **Components** | Lesson list, filters, UsageIndicator, PaywallModal, lesson steps, flashcards, quiz | Present | ✓ |
| **Routes** | /app/learn, /app/learn/:lessonId, flashcards, quiz | Present | ✓ |
| **Actions** | Start lesson, Back/Continue, Flashcards, Quiz, Paywall Upgrade | Wired | ✓ |
| **UI States** | Lesson not found (GuidedLessonPage), Empty filter result (list), Cap reached (modal) | Partial: no loading/skeleton | Gap |

---

## 5. Gamification (E-11)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | XP/streak on Home, AchievementsPage, ProgressPage | Present | ✓ |
| **Routes** | /app/progress, /app/achievements | Present | ✓ |
| **Actions** | Navigate to progress/achievements | Wired | ✓ |
| **UI States** | Empty achievements list | Not explicit EmptyState | Minor |

---

## 6. Personalization & Home (E-14)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | Home: Continue, Daily goal, Scenarios, Smart Prompts, Daily Life, Reflection, Exam, Premium teaser | Present | ✓ |
| **Routes** | /app/home | Present | ✓ |
| **Actions** | See all (learn), Simulation, Voice, Context prompts, Daily lessons, Reflection, Exam, View plans, Progress, Achievements | Wired | ✓ |
| **UI States** | When recommended.length === 0: show empty state + CTA | EmptyState + "Browse lessons" | ✓ Fixed |

---

## 7. Scenario Simulations (E-04)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | SimulationPage, scenario catalog, chat UI | Present | ✓ |
| **Routes** | /app/practice/simulation/:scenarioId? | Present | ✓ |
| **Actions** | Select scenario, Send message, View tip, Paywall when at cap | Wired | ✓ |
| **UI States** | PaywallModal at scenario cap | Present | ✓ |

---

## 8. AI Voice Tutor (E-05)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | VoiceTutorPage (mic, playback, transcript) | Present | ✓ |
| **Routes** | /app/practice/voice/:scenarioId? | Present | ✓ |
| **Actions** | Mic, playback, transcript (mock) | Present | ✓ |

---

## 9. Listening Training (E-06)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | ListeningCatalogPage, ListeningPage (detail), attempt UI | Present; catalog lists MOCK_LISTENING_EXERCISES | ✓ Fixed |
| **Routes** | /app/practice/listening (catalog), /app/practice/listening/:exerciseId | Both registered; Home has Listening card | ✓ Fixed |
| **Actions** | Play, Show transcript, Answer, Check, Done, Back to catalog | Wired | ✓ |

---

## 10. Pronunciation (E-07)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | PronunciationFeedbackPage | Present | ✓ |
| **Routes** | /app/practice/pronunciation-feedback | Present | ✓ |

---

## 11. Exam Preparation (E-10)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | ExamPrepPage (modules, tasks, simulated exam) | Present | ✓ |
| **Routes** | /app/exam | Present | ✓ |

---

## 12. Notifications (E-15)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | Notification settings, push registration UI | NotificationSettingsPage (toggles + push placeholder) | ✓ Fixed |
| **Routes** | /app/settings/notifications | Present; Settings Notifications row navigates here | ✓ Fixed |

---

## 13. Daily Reflection (E-08)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | ReflectionPage, capture, generated lesson | Present | ✓ |
| **Routes** | /app/reflection | Present | ✓ |

---

## 14. Location-Aware Prompts (E-09)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | Context prompts feed, intro, settings, detail | Present; PromptEmptyState used | ✓ |
| **Routes** | /app/context-prompts, intro, settings, :promptId | Present | ✓ |

---

## 15. Daily Life Lessons

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | Hub, intro, capture, history, settings, generated lesson | Present | ✓ |
| **Routes** | /app/daily-lessons/* | Present | ✓ |

---

## 16. Settings (cross-cutting)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | SettingsPage, ProfileSettingsPage, NotificationSettingsPage, SettingsPlaceholderPage (section/:section) | Present | ✓ |
| **Actions** | Profile Edit, Daily lessons, Location & Smart Prompts, Sign out, Subscription actions | Wired | ✓ |
| **Actions** | Notifications, Email, Mic, Privacy, Export, Delete, Help | All navigate to /app/settings/notifications or /app/settings/section/:section | ✓ Fixed |

---

## 17. Admin (optional)

| Area | Required | Implemented | Validation Status |
|------|----------|-------------|------------------|
| **Screens** | Dashboard, Queue, Artifact, Batches, Prompts, Scenarios, Published, Validation, Audit, Settings | Present | ✓ |
| **Routes** | /admin/* | Present | ✓ |

---

## Summary

| Category | Count |
|----------|--------|
| Features/modules indexed | 17 |
| Full pass | 16 |
| Deferred (low) | 1 (Core Lessons: loading/skeleton when API is async) |
