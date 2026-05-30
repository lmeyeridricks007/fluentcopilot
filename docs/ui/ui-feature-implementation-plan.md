# UI Feature Implementation Plan — AI Dutch Coach

**Source**: docs/implementation/final/implementation-roadmap.md, docs/implementation/features/, docs/implementation/stories/

**Stack**: React 18, Vite, TypeScript, React Router 6, TanStack Query, Zustand, react-hook-form, zod, Tailwind CSS, lucide-react.

---

## Repository Analysis (Summary)

| Item | Finding |
|------|---------|
| **Frontend framework** | React 18 + Vite + TypeScript |
| **Routing** | react-router-dom v6 (Routes in App.tsx) |
| **State management** | Zustand (authStore, premiumStore, etc.); TanStack Query for server state |
| **Design system** | components/ui: Button, Input, Card, LoadingScreen, ErrorState, EmptyState, Skeleton, ProgressBar; components/layout: AppLayout, Header, BottomNav |
| **Forms** | react-hook-form + zod (used in codebase) |
| **Existing routes** | / (Welcome), /onboarding, /app/* (RequireAuth), /admin/* |

---

## Feature Implementation Order (UI-First)

Implementation order follows docs/implementation/final/implementation-roadmap.md. One feature at a time; UI complete (screens, components, routing, forms, actions, loading/empty/error, mock integration) before moving to next.

| # | Feature | UI screens required | Dependencies | Priority | Status |
|---|---------|--------------------|--------------|----------|--------|
| 1 | **Authentication (E-01)** | WelcomePage (existing), LoginPage, SignUpPage, ForgotPasswordPage, Logout (Settings), OAuth buttons | — | P0 | **Complete** |
| 2 | Entitlements & Subscription (E-13) | EntitlementProvider/context, UsageIndicator, PaywallModal, TrialBanner, Trial start flow, Settings subscription section | Auth | P0 | **Complete** |
| 3 | Onboarding & Profile (E-02) | OnboardingFlow (existing), profile steps, consent toggles, Settings profile edit | Auth | P0 | **Complete** |
| 4 | Core Lessons (E-03) | LessonDiscoveryPage, GuidedLessonPage, FlashcardsPage, QuizPage, LessonSummary, CapReachedModal, Continue on Home | Profile, Entitlements | P0 | **Complete** |
| 4b | **CEFR curriculum path** (extension) | Settings: active study level; Learn: **My path** (units/progress), **Today** queue; Home: plan summary; **Weak areas** / **Revision** entry and short session UI | E-02, E-03, E-14, optional E-11 | P0 (path+Today) / P1 (weak+revision) | **UI complete (mock)** — `docs/ui/feature-additions/cefr-curriculum-path-ui.md` |
| 5 | Gamification (E-11) | XP/streak display, AchievementsPage, summary on Home | — | P0 | **Complete** |
| 6 | Personalization & Recommendations (E-14) | Home session set (Continue, Daily, Recommended), skill/profile cards | Profile, Lessons, Gamification | P0 | **Complete** |
| 7 | AI Tutor Feedback (E-12) | Feedback card, “Practice this” CTA | Lessons, Scenarios, Voice | P0 | **Complete** |
| 8 | Scenario Simulations (E-04) | SimulationPage (existing), scenario catalog, chat UI | Profile, Entitlements | P1 | **Complete** |
| 9 | AI Voice Tutor (E-05) | VoiceTutorPage (existing), mic, playback, transcript | Entitlements, Consent | P1 | **Complete** |
| 10 | Listening Training (E-06) | ListeningPage (existing), catalog, attempt UI | Entitlements | P1 | **Complete** |
| 11 | Pronunciation (E-07) | PronunciationFeedbackPage (existing), feedback UI | Entitlements, Consent | P1 | **Complete** |
| 12 | Exam Preparation (E-10) | ExamPrepPage (existing), modules, tasks, simulated exam | Lessons, Entitlements | P1 | **Complete** |
| 13 | Notifications (E-15) | Notification settings, push registration UI | Profile, Entitlements | P2 | **Complete** |
| 14 | Daily Reflection (E-08) | ReflectionPage, capture, generated lesson | Profile, Entitlements | P2 | **Complete** |
| 15 | Location-Aware Prompts (E-09) | Context prompts (existing), settings, feed | Consent | P2 | **Complete** |

---

## UI Completion Criteria (Per Feature)

- [ ] All screens defined in documentation exist and are reachable via routes.
- [ ] Routes are registered; navigation works (links and programmatic).
- [ ] All buttons have handlers (no dead CTAs).
- [ ] Forms validate correctly (client-side with clear error messages).
- [ ] UI reflects loading states (skeletons or loading indicators).
- [ ] UI reflects error states (API or validation errors).
- [ ] UI handles empty data states (empty lists, no results).
- [ ] Tables/lists render correctly with mock or seed data.
- [ ] Components follow existing design system patterns (Button, Input, Card, etc.).
- [ ] Mock or seed data allows the UI to function locally without backend.

---

## Mock Data / Services

- **Location**: src/mocks/ and per-feature src/features/{feature}/mocks/ or services/mockServices.ts.
- **Auth**: mockAuthService (login, signup, forgotPassword, logout) with simulated delay and error conditions. Demo login: `demo@example.com` / `demo123` or `test@example.com` / `demo123` (see src/features/auth/mocks/demoUsers.ts).
- **Other features**: Per implementation tasks (lessons, entitlements, etc.) as each feature is implemented.

---

## Document References

- **Implementation roadmap**: docs/implementation/final/implementation-roadmap.md
- **Feature docs**: docs/implementation/features/*.md
- **Stories**: docs/implementation/stories/*.md
- **Tasks (UI)**: docs/implementation/tasks/*.md (Frontend tasks)
- **Reviews**: docs/ui/reviews/ (authentication-ui-review, entitlements-ui-review, onboarding-profile-ui-review, remaining-features-batch-review)
- **Audits**: docs/ui/audits/ (authentication-ui-audit, entitlements-ui-audit, onboarding-profile-ui-audit, remaining-features-batch-audit)
