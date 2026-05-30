# Demo Data Domains — AI Dutch Coach

**Source**: docs/implementation/data-model.md, docs/implementation/demo-data.md, src/mocks, src/features/*/mocks, codebase inspection.

**Application domain**: Language learning (Dutch) for expats — lessons, practice, scenarios, progress, entitlements, personalization.

---

## 1. Domain Summary

| Domain | Description | Current location | Used by |
|--------|-------------|------------------|---------|
| **users / auth** | Demo users (free, trial, premium, at-cap, in-progress) | src/features/auth/mocks/demoUsers.ts | Auth, Welcome, Settings |
| **locales** | Supported locales (nl, en) | — | Content, i18n |
| **cefr_levels** | A0–C2 levels | — | Lessons, catalog, profile |
| **vocabulary** | Vocabulary terms (lemma, translations) | docs/implementation/demo-data.md | Lesson content |
| **exercises** | Exercise definitions (multiple_choice, flashcard, quiz) | docs/implementation/demo-data.md | Lesson run, quiz |
| **lessons** | Lesson catalog (title, level, topic, type, duration, completed, progress, isPremium) | src/mocks/lessons.ts | Home, LessonDiscovery, recommendations |
| **lesson_content** | Full lesson content_payload (steps, exercise_ids) | — (future GuidedLessonPage) | Guided lesson run |
| **lesson_progress** | Per-user lesson status (in_progress, completed, last_step_index, score) | — | Continue learning, cap logic |
| **usage_counts** | Per-user, per-period usage (lessons_completed_count) | — | Cap enforcement, entitlements |
| **progress_summary** | XP, streak, lessons completed, daily goal, weekly minutes | src/mocks/progress.ts | Home, Progress page |
| **scenarios** | AI practice scenarios (café, doctor, supermarket, etc.) | src/mocks/scenarios.ts | Home, Simulation, practice |
| **recommendations** | Continue / recommended lessons | MOCK_RECOMMENDED from lessons | Home, mockServices |
| **entitlements** | Tier (free/trial/premium), usage, trial_ends_at | — (premiumStore) | Gating, upsell |
| **subscriptions / trials** | Subscription and trial state | — | Entitlements |
| **gamification** | XP, streak, achievements | progress + future | Home, Progress, Achievements |
| **daily_activities** | Daily life events (location, manual, saved phrase) | src/features/daily-life-lessons/mocks/activities.ts | Daily Lessons hub, generated lesson |
| **generated_lessons** | Daily generated lesson from activities | src/features/daily-life-lessons/mocks/lessons.ts | Daily Lessons feature |
| **location_prompts** | Venue-based phrase suggestions | src/features/location-prompts/mocks/prompts.ts | Context prompts feed |
| **notifications** | In-app / push notifications | — | Notifications feature |
| **activity_history** | Timeline of completed lessons, scenarios | — | Progress, dashboard |
| **admin** | Review queue, batches, prompts, scenarios, audit | src/admin/mocks, admin mockServices | Admin app |
| **achievements** | Unlocked achievements | — | Achievements page |
| **listening_exercises** | Listening exercises (audio, questions) | — | Listening feature |
| **exam_content** | Exam modules, tasks | — | Exam prep |

---

## 2. Domain Dependencies

- **lessons** depend on: cefr_levels, vocabulary (for content_payload), exercises.
- **lesson_progress** depends on: users, lessons.
- **usage_counts** depends on: users; period_key (date/week).
- **progress_summary** derives from: lesson_progress, activity history, gamification.
- **recommendations** derive from: lessons, lesson_progress, profile (level).
- **entitlements** depend on: users, subscriptions, trials, usage_counts.
- **generated_lessons** depend on: daily_activities, profile.
- **scenarios** can reference: prompt_templates (admin/content).

---

## 3. Data Store Context

- **Current stack**: Frontend-only; no backend DB in repo. All demo data is in-memory (TypeScript/JSON) imported by features and src/services/mockServices.ts.
- **Seed tooling**: No database seed scripts; “seed” = static mock files and/or runtime demo-data module (factories + scenario builders) that export datasets.
- **Refresh**: Page reload; optional scenario switcher (localStorage or env) to load a different demo scenario.
