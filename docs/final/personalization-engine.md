# Personalization Engine — Final Summary

## Overview

The **Personalization & Adaptive Learning Engine** determines what the learner should study next, which lessons and scenarios to recommend, how difficulty should adapt, which skills need improvement, when to suggest exam preparation, and how to keep learners engaged. It drives the intelligence of the AI Language Coach platform.

---

## Architecture

- **Location**: `src/personalization-engine/`
- **Entry**: `services/personalizationService.ts` — getRecommendations, getLearningPath, getSkillProfile, postActivityEvent.
- **Models**: Learner profile (profileStore); progress snapshot and activity-derived data (lesson completions, quiz results, conversation summaries); spaced repetition items.
- **Scoring**: skillScoring (computeSkillProfile from progress and stored activity); weaknessDetection (threshold-based weak/strong, severity, suggested_action).
- **Recommendations**: engine (generateRecommendations by type); sessionRecommendations (Continue Learning, Daily Practice, Scenario, Weak Skill, Exam Prep, retention).
- **Adaptive**: difficulty (getDifficultyRecommendation: increase/maintain/decrease/review from accuracy and confidence).
- **Learning path**: pathGenerator (daily and weekly path); scenarioPersonalization (selectScenariosForUser by occupation, family, goal); spacedRepetition (recordRecall, getDueForReview).
- **Telemetry**: ingestion (ingestActivityEvent for lesson, quiz, conversation, pronunciation, listening).
- **Retention**: triggers (streak_reminder, daily_goal, challenge).

---

## Learner Profile & Skill Model

**Profile**: user_id, native_language, known_languages, country_of_origin, time_in_country_months, family_status, age_range, occupation, industry, hobbies, current_level, target_level, learning_goal, daily_goal_minutes.

**Skill dimensions**: vocabulary, grammar, listening, speaking, pronunciation, reading, conversation_fluency. Each has score, confidence, recent_performance, trend (up/stable/down), last_updated, sample_count. Weak/strong lists are derived from thresholds (e.g. &lt;0.5 weak, ≥0.75 strong).

---

## Recommendation Logic

- **Next lesson** and **weak_skill_practice** from skill profile and detected weaknesses.
- **Conversation scenario** from scenario personalization (occupation, family, goal).
- **Review flashcards** and **exam_prep_module** (when goal=integration_exam and target A2/B1).
- **Streak_reminder** and **daily_goal** from progress (streak, last_activity, time vs daily_goal_minutes).

Recommendation schema: recommendation_id, type, content_id, reason, priority, estimated_time_minutes, skill_target.

---

## Adaptive Difficulty

Based on recent accuracy and confidence: **high** → suggest next CEFR level; **low** → suggest previous level or review; **else** → maintain. Used for level of next lesson/scenario and can be passed to the AI Conversation Engine for prompt adaptation.

---

## Learning Path Generation

- **Daily path**: recommended_lessons, review_items, scenario_practice, daily_goal_minutes, weekly_goal_minutes, progress_toward_goal_minutes.
- **Weekly path**: goals, skill_balance (vocabulary, grammar, conversation_fluency targets), scenario_rotation, review_cycles.

Spaced repetition: per-item last_reviewed, difficulty, recall_success_count, recall_fail_count, next_review_due; recordRecall and getDueForReview.

---

## Integration with Other Systems

- **Learner app / Home**: GET recommendations with session_set for Continue Learning, Daily Practice, Scenario, Weak Skill, Exam Prep, retention cards.
- **AI Conversation Engine**: Use skill profile (level, weak_skills) and selectScenariosForUser for scenario list and prompt personalization.
- **Content / Lessons**: Map recommendation content_id and type to real lesson, scenario, or exam module IDs (engine uses placeholders; backend or content service resolves).
- **Analytics**: POST activity-event for lesson_completed, quiz_completed, conversation_completed, pronunciation_completed, listening_completed; engine updates progress and skill profile.

---

## Service Contracts (REST)

- **GET /recommendations/:user** — query param or body for includeSessionSet; response: recommendations[], session_set?.
- **GET /learning-path/:user** — response: daily?, weekly_goal_minutes?.
- **GET /skill-profile/:user** — response: profile (skills, weak_skills, strong_skills).
- **POST /activity-event** — body: { event: ActivityEvent }; response: { accepted: boolean }.

---

## Mock Mode

- **seedMockProfile()**, **seedMockProgress()**, **seedMock()** populate in-memory store for development.
- **MOCK_USER_ID** used in tests; 12 tests cover profile, recommendations, session set, skill profile, learning path, activity ingestion, scenario personalization, difficulty, spaced repetition, retention triggers.

---

## Review & Audit

- **Review**: docs/reviews/personalization-engine-review-1.md — scorecard (clarity, learning science, scalability, personalization quality, implementation readiness); overall 8.6/10.
- **Audit**: docs/audits/personalization-engine-audit.md — personalization logic, scalability, fairness, recommendation stability. **Verdict: Pass.**

---

## Recommended Next Steps

1. **Backend**: Expose GET/POST endpoints; persist profile and progress in DB; optionally cache skill profile and recommendations per user/session.
2. **Content resolution**: Replace placeholder content_ids with real lesson/scenario/exam IDs from content or recommendation service.
3. **Enrich scoring**: Add explicit pronunciation/listening attempt history if needed for finer skill signals.
4. **Sync spaced repetition**: Update progress flashcard_success_rate from recordRecall or separate flashcard events.
5. **Exam prep timing**: Add “time to exam” or readiness score to tune when to push exam_prep_module more strongly.
