# Feature Demo Data Requirements — AI Dutch Coach

**Purpose**: Exact demo data needed per feature so its UI and flows feel complete. Use with demo-data-feature-map.md.

---

## 1. Authentication

- **Demo users**: At least 4 (free default, free at-cap, trial, premium). Each: id, name, email, nativeLanguage, currentLevel, targetLevel.
- **Passwords (mock)**: One known password (e.g. `demo123`) for all demo users when using mock login.
- **State**: No server; authStore holds current user. Switching scenario can imply switching “current user” for cap/trial/premium.

---

## 2. Home

- **Progress summary**: xp (number), streak (number), lessonsCompleted, dailyGoal, dailyGoalMinutes, weeklyMinutes. Must be consistent with lesson_progress and activity.
- **Continue learning**: 1–3 lessons from lesson_progress where status=in_progress or last completed (by updated_at). Each needs: lesson id, title, level, durationMinutes.
- **Recommended**: 3–5 lessons from catalog not completed (or not in Continue). Same shape as lesson summary.
- **Scenarios**: 3–5 scenario cards: id, title, description, category, level, icon.
- **Daily goal**: Progress bar (e.g. 1 of 3 lessons); dailyGoal from progress summary.

---

## 3. Core Lessons (catalog and list)

- **Lessons**: 12+ items. Each: id, title, description, level (A0–A2), topic, type (vocabulary|grammar|dialogue|listening|quiz), durationMinutes, completed?, progress?, isPremium?.
- **Variation**: Mix of A0, A1, A2; multiple topics (Basics, Food, Health, Transport, Work, Family, Shopping, Grammar); at least 1–2 isPremium for gating demo.
- **Lesson progress (per user)**: For “Continue” and “completed” badges: lesson_id, status (in_progress|completed), last_step_index?, score?, completed_at?, updated_at.

---

## 4. Lesson run (guided lesson, quiz, flashcards)

- **Lesson detail**: For each lesson id, optional content_payload: steps (intro, vocabulary_list, example_sentences, exercise_block, quiz), exercise_ids, pass_threshold.
- **Exercises**: Resolved by id: template_code, payload (question, options, correct_option_id, etc.). At least 2–3 per lesson for exercise_block and quiz.
- **Progress**: When resuming: last_step_index, status=in_progress. On complete: status=completed, score, completed_at.

---

## 5. Entitlements and cap

- **usage_counts**: user_id, period_key (e.g. today YYYY-MM-DD), lessons_completed_count, scenarios_completed_count.
- **Cap config**: lessons_cap = 5 (or from config); period = day.
- **Tier**: free | trial | premium. Trial: trial_ends_at. Premium: subscription_ends_at, manage_url (optional).
- **Demo**: At least one user with usage 5/5 (at-cap), one with 0/5 (new-user), one with 2/5 (happy-path).

---

## 6. Gamification and progress

- **Progress summary**: xp, streak, lessonsCompleted, dailyGoal, dailyGoalMinutes, weeklyMinutes (see Home).
- **Skills (optional)**: Vocabulary, Grammar, Listening with level or score (e.g. A1, 60%) for Progress page bars.
- **Activity timeline (optional)**: List of recent completions (lesson title, date, score) for last 7 days.

---

## 7. Achievements

- **Achievement definitions**: id, title, description, icon, condition (e.g. “Complete 5 lessons”), order.
- **User unlocks**: user_id, achievement_id, unlocked_at. For demo: 2–3 unlocked, rest locked.
- **Minimum**: 6 achievements; 2–3 unlocked for default user.

---

## 8. Scenarios (AI practice)

- **Scenarios**: id, title, description, category, level, icon. 5+ with variety (café, doctor, supermarket, municipality, work, etc.).
- **Session history (optional)**: Last session date, duration for “Last practiced” on card.

---

## 9. Daily Reflection / Daily Lessons

- **Daily activities**: eventId, timestamp, sourceType, venueType, title, note, hasPhoto, hasVoice, confidence, removable. 3–8 for “today”.
- **Generated lessons**: lessonId, date, title, sourceEvents, scenarios, modules, phrases, vocabulary, completionStatus, premiumRequired, generationStatus. At least 1 for today, 1–2 for history.
- **History list**: 2+ generated lessons (different dates).

---

## 10. Location prompts

- **Prompts**: id, venueType, title, phrases (dutch, translation, formality), optional location. 5+ prompts across venues (café, train, supermarket, pharmacy, office, etc.).
- **Feed**: List of prompt cards with venue, title, phrase count.

---

## 11. Admin (if used locally)

- **Review queue**: 5+ items (artifact id, type, status, created_at).
- **Batches**: 2+ batches (id, status, request count, created_at).
- **Prompts / scenarios**: Same as content or extended for admin list.
- **Audit logs**: Optional list of events.

---

## 12. Notifications (future)

- **Preferences**: email, push booleans.
- **Items**: 0–3 in-app notifications (title, body, read, created_at) for “notification center” UI.
