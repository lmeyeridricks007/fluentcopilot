# Personalization Engine — Architecture

## Overview

The Personalization & Adaptive Learning Engine determines what the learner should study next, which lessons and scenarios to recommend, how difficulty should adapt, which skills need improvement, and when to suggest exam prep or retention actions. It drives the intelligence of the AI Language Coach product.

## Principles

- **Structured models**: Learner profile, skill dimensions, progress snapshot, and recommendation schema are explicitly typed.
- **Behavior + goals**: Recommendations consider both observed behavior (quiz accuracy, conversation performance) and learner goals (integration exam, workplace, daily life).
- **Scenario relevance**: Scenario selection uses occupation, family context, and learning goal.
- **Adaptive difficulty**: Difficulty recommendations use recent accuracy and confidence (increase / maintain / decrease / review).
- **Retention**: Streak reminders, daily goals, and challenge suggestions are generated from progress.

## Directory Layout

```
src/personalization-engine/
├── types/           # profile, skills, progress, recommendations, activity, learning-path, api
├── models/          # profileStore (in-memory), seed (mock data)
├── scoring/         # skillScoring, weaknessDetection
├── recommendations/ # engine (generateRecommendations), sessionRecommendations
├── adaptive/        # difficulty (getDifficultyRecommendation)
├── learning-path/   # pathGenerator (daily/weekly), scenarioPersonalization, spacedRepetition
├── telemetry/       # ingestion (ingestActivityEvent)
├── retention/       # triggers (getRetentionTriggers)
├── services/        # personalizationService (getRecommendations, getLearningPath, getSkillProfile, postActivityEvent)
└── tests/
```

## Core Data Model

**Learner profile**: user_id, native_language, known_languages, country_of_origin, time_in_country_months, family_status, age_range, occupation, industry, hobbies, current_level, target_level, learning_goal, daily_goal_minutes.

**Skill dimensions**: vocabulary, grammar, listening, speaking, pronunciation, reading, conversation_fluency. Each skill has score, confidence, recent_performance, trend, last_updated, sample_count.

**Progress snapshot**: lessons_completed, flashcard_success_rate, quiz_accuracy_avg, conversation_sessions_count, pronunciation_score_avg, listening_comprehension_avg, current_streak_days, total_xp, total_time_minutes, last_activity_at.

**Recommendation**: recommendation_id, type (next_lesson, review_flashcards, conversation_scenario, pronunciation_exercise, listening_practice, exam_prep_module, weak_skill_practice, daily_goal, streak_reminder, challenge), content_id, reason, priority, estimated_time_minutes, skill_target.

## Service API (REST Mapping)

- **GET /recommendations/:user** — getRecommendations(userId, includeSessionSet). Returns list of recommendations and optional session set (Continue Learning, Daily Practice, Scenario Practice, Weak Skill, Exam Prep, retention).
- **GET /learning-path/:user** — getLearningPath(userId). Returns daily path (recommended lessons, review items, scenario practice, goals) and weekly_goal_minutes.
- **GET /skill-profile/:user** — getSkillProfile(userId). Returns skill profile with weak_skills and strong_skills.
- **POST /activity-event** — postActivityEvent({ event }). Body: ActivityEvent (event_type, user_id, timestamp, payload). Ingests event and updates progress; returns { accepted: true }.

## Integration with Other Systems

- **Learner app / Home dashboard**: Call getRecommendations with includeSessionSet=true to show Continue Learning, Daily Practice, Scenario Practice, Weak Skill, Exam Prep, and retention cards.
- **AI Conversation Engine**: Use getSkillProfile and scenario personalization (selectScenariosForUser) to tailor scenario list and level; use learner level and weak skills in prompt context.
- **Content / Lessons**: Use recommendation content_id and type to route to correct lesson, scenario, or exam prep module.
- **Analytics**: Activity events (lesson_completed, quiz_completed, conversation_completed, etc.) feed telemetry ingestion and drive skill scoring and recommendations.
