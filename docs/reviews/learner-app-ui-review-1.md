# Learner App UI — Review 1

## Scope
Learner-facing mobile-web app: welcome, onboarding, home, lesson discovery, guided lesson, flashcards, quiz, simulation (with coaching panel), voice tutor (unsupported/denied states), listening, pronunciation, reflection, exam prep, progress, achievements, premium, settings. Plus services layer, mocks, premium gating, permissions, navigation.

## What was implemented / updated
- **Welcome**: Hero, How it works (3 steps), feature cards, Sign in placeholder, Get started, Continue as guest, Premium teaser.
- **Onboarding**: Daily learning goal step (5–30 min); permission education screens (microphone, location) with skip; final “You’re all set” step.
- **Navigation**: Bottom nav → Home, Learn, Practice, Progress, Settings (Exam reachable from home).
- **Store**: onboardingStore.dailyLearningGoalMinutes; authStore UserProfile.dailyLearningGoalMinutes; premiumStore (isPremium).
- **Services**: contracts.ts (LearnerProfile, LessonSummary, ProgressSummary, etc.); mockServices.ts (auth, onboarding, recommendations, lessons, progress, premium).
- **Mocks**: Lessons extended (train station, office, school); isPremium on lessons; MOCK_PROGRESS.dailyGoalMinutes.
- **Lesson discovery**: Premium lock indicator on cards; click locked → premium page.
- **Simulation**: Correction/coaching panel (toggle, “View tip” when closed); mock tip after user message.
- **Voice tutor**: Unsupported browser state; permission denied state with Try again + text simulation.
- **Analytics**: Additional events; useTrack hook.

## Scorecard (self-assessment)

| Category | Score | Notes |
|----------|-------|--------|
| UI coherence | 9/10 | Consistent tokens, cards, buttons; welcome and onboarding clear. |
| Mobile usability | 9/10 | Touch targets, bottom nav, sticky header, scroll. |
| Component reusability | 9/10 | Button, Card, Input, ProgressBar, PermissionGate, PremiumLock, etc. |
| Architecture quality | 9/10 | Features + components + store + services; clear separation. |
| Accessibility | 8/10 | Focus visible, aria where needed; more landmarks possible. |
| Implementation completeness | 9/10 | All primary screens and flows; loading/error/empty/offline present. |
| Backend readiness | 9/10 | Typed contracts and mocks; easy swap to API. |

**Overall confidence**: ~90%. Target 95% with refinements.

## Findings
- **Strengths**: Full learner journey, permission education, daily goal, coaching panel, voice unsupported/denied, premium locks on lessons, services layer.
- **Gaps**: Home could use daily goal minutes from profile; some pages could call mock services via TanStack Query for loading states; Settings “Edit” goes to profile (implemented).

## Refinements to consider
- Use progressService.getSummary() and user.dailyLearningGoalMinutes on Home for daily goal copy.
- Add useQuery in one or two places (e.g. home recommendations) to demonstrate async + loading.
