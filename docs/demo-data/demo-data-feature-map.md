# Demo Data Feature Map — AI Dutch Coach

**Purpose**: Map each product feature to the demo data it needs so the UI looks populated and functional locally.

**Source**: docs/implementation/, docs/ui/ui-feature-implementation-plan.md, src/features, src/mocks.

---

## 1. Feature → Data Mapping

| Feature | Screens / components | Demo data required | Current source | Gap |
|---------|----------------------|--------------------|----------------|-----|
| **Authentication** | Welcome, Login, SignUp, ForgotPassword, Settings (logout) | Demo users (multiple states) | auth/mocks/demoUsers.ts | Add trial, premium, at-cap users |
| **Onboarding** | OnboardingFlow | Profile defaults | authStore | OK |
| **Home** | HomePage | Progress summary, recommended lessons, scenarios slice, daily goal | MOCK_PROGRESS, MOCK_RECOMMENDED, MOCK_SCENARIOS | Richer progress; “Continue” from lesson_progress |
| **Core Lessons** | LessonDiscoveryPage, GuidedLessonPage, Flashcards, Quiz | Lessons list (many, varied), lesson_progress (in_progress + completed), lesson content | MOCK_LESSONS | More lessons; in_progress item; content_payload for run |
| **CEFR curriculum path** (extension) | Learn/Home “My path”, “Today”, Settings study level, Revision entry | `manifest` + units + ordered lesson ids aligned with `MOCK_LESSONS` or DB; `user_curriculum_state`; sample weak-area tags; optional revision session | `data/curriculum/nl-NL/A2/` + importer mock | Map `catalog`/`id` from JSON to lesson cards; demo user mid-path and one with weak areas |
| **Lesson run / progress** | GuidedLessonPage, summary | lesson_progress, usage_counts | — | Add lesson_progress, usage for demo users |
| **Entitlements / cap** | Cap modal, usage indicator | usage_counts, tier, trial_ends_at | premiumStore (boolean) | usage_counts, trial/premium states |
| **Gamification** | Progress page, Home (streak, XP) | XP, streak, lessons completed, weekly minutes, skills | MOCK_PROGRESS | Skills from real data; activity history |
| **Achievements** | AchievementsPage | Achievements list, user unlocks | — | Mock achievements + unlocks |
| **Scenario simulations** | SimulationPage, Home cards | Scenarios list with metadata | MOCK_SCENARIOS | More scenarios; session history optional |
| **AI Voice Tutor** | VoiceTutorPage | — | — | Mock session or placeholder |
| **Listening** | ListeningPage | Listening exercises (audio URL, questions) | — | 1–2 mock exercises |
| **Pronunciation** | PronunciationFeedbackPage | — | — | Placeholder or sample result |
| **Daily Reflection** | DailyLessonsHub, Capture, Generated lesson, History | Daily activities, generated lessons, history | daily-life-lessons/mocks | Richer history; multiple generated lessons |
| **Location prompts** | Context prompts feed, detail, settings | Prompts by venue, phrases | location-prompts/mocks/prompts | OK; more prompts for variety |
| **Exam prep** | ExamPrepPage | Exam modules, tasks | — | Mock exam modules + tasks |
| **Progress** | ProgressPage | Progress summary, skills, history | MOCK_PROGRESS | Activity timeline; skills from data |
| **Premium / upsell** | PremiumUpsellPage, Settings subscription | Tier, manage_url | premiumStore | Trial end date; usage for free |
| **Settings** | SettingsPage, Profile | User profile, consent | authStore | OK |
| **Notifications** | (Future) | Notification preferences, items | — | Mock notifications |
| **Admin** | Dashboard, queue, batches, prompts, scenarios, audit | Queue items, batches, prompts, scenarios, audit logs | admin/mocks, mockServices | Richer queue and batches |

---

## 2. List Screens and Minimum Data

| Screen | Minimum records for “populated” feel |
|--------|--------------------------------------|
| Lesson discovery | 12+ lessons with mix of levels (A0–A2), topics, types; some completed, one in_progress |
| Home recommended | 3–5 recommended; 1 “Continue” lesson |
| Home scenarios | 3–5 scenario cards |
| Progress | XP, streak, lessons completed, weekly minutes; 3+ skill bars; optional activity list |
| Achievements | 6+ achievements; 2–3 unlocked |
| Daily Lessons history | 2+ generated lessons (today + past) |
| Context prompts feed | 5+ prompt cards across venues |
| Admin review queue | 5+ items in queue |
| Admin batches | 2+ batches with items |

---

## 3. Detail Screens and Linked Data

| Screen | Primary entity | Linked data needed |
|--------|----------------|-------------------|
| Guided lesson | Lesson by id | content_payload (steps, exercise_ids), exercises resolved |
| Lesson summary | Lesson + completion | score, XP awarded, streak updated |
| Scenario run | Scenario by id | Prompt/config for conversation |
| Generated lesson | Generated lesson by id | modules, phrases, vocabulary, scenarios |
| Context prompt detail | Prompt by id | Phrases list, venue |
| Admin artifact | Artifact by id | Full artifact body, validation results |
| Batch detail | Batch by id | Requests, status, errors |

---

## 4. Dashboards and Aggregates

| Dashboard | Data needed |
|-----------|-------------|
| Home | Greeting, streak, XP, daily goal progress, “Continue” card, recommended list, scenario cards, daily lesson CTA |
| Progress | Streak, total XP, lessons completed, weekly minutes, skill breakdown, optional timeline |
| Admin dashboard | Queue count, batch stats, recent activity |

---

## 5. Edge Cases and States

- **Free at cap**: User with usage_counts.lessons_completed_count = 5 today; no in_progress.
- **In-progress lesson**: User with one lesson_progress status=in_progress, last_step_index=2.
- **New user**: No lesson_progress; no usage; empty or minimal recommendations.
- **Trial user**: trial_ends_at in future; full access.
- **Premium user**: subscription active; no cap.
- **Empty states**: New user (no recommendations); no daily activities (empty hub).
- **Error/stale**: (Optional) Failed generation, stale sync for admin.
