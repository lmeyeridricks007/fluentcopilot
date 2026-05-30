# Personalization & Recommendations — Deep-Dive Specification

## 1. Purpose

The Personalization & Recommendations engine determines what the learner should do next: recommended lessons, scenarios, review items, exam prep, and retention prompts (e.g. streak reminder, daily goal). It consumes profile and progress, drives the home dashboard and “Continue learning,” and integrates with the Lesson Engine, AI Conversation, and Gamification. This spec covers the recommendation logic, learning path, skill profile, and session recommendations (cross-cutting; references docs/final/personalization-engine.md).

## 2. Core Concept

- **Recommendations**: Ordered list of items (lesson, scenario, exam module, review flashcards, weak-skill practice) with reason and priority; served for home and “What’s next.”
- **Skill profile**: Derived from progress (vocabulary, grammar, listening, speaking, pronunciation, conversation_fluency); weak/strong detection; used to recommend “Practice weak skill” and adapt difficulty.
- **Learning path**: Daily and weekly suggested goals (e.g. recommended_lessons, review_items, scenario_practice, daily_goal_minutes); progress toward goal.
- **Spaced repetition**: Items due for review (flashcards, vocabulary); getDueForReview; recordRecall on completion.
- **Session set**: For home, a curated set of cards: “Continue Learning,” “Daily Practice,” “Try a scenario,” “Weak skill,” “Exam prep,” “Streak reminder,” etc.

## 3. Why This Feature Exists

- **Personalization (BFR-005)**: Profile and progress drive relevance; increases engagement and completion.
- **Learning efficacy**: Spaced repetition (IS-008) and weak-skill focus improve outcomes.
- **Retention**: Streak reminder, daily goal, and “Continue” reduce drop-off.
- **Conversion**: Right recommendations (e.g. scenario, exam prep) support premium conversion.

## 4. User / Business Problems Solved

- Users see a clear “next step” and progress toward goals.
- Business improves engagement, retention, and conversion through relevance.

## 5. Scope

### 6. In Scope

- **Recommendations API**: GET /recommendations (or GET /home/recommendations) with optional session_set; returns list of recommendation items (type, content_id, reason, priority, estimated_time_minutes, skill_target).
- **Learning path**: GET /learning-path (daily and weekly goals; progress toward daily_goal_minutes).
- **Skill profile**: GET /skill-profile (scores per dimension; weak_skills, strong_skills; trend); used by AI Conversation and scenario selection.
- **Activity ingestion**: POST /activity-event (lesson_completed, quiz_completed, conversation_completed, etc.); engine updates progress and skill profile.
- **Spaced repetition**: recordRecall(item_id, user_id, success); getDueForReview(user_id); used by “Review flashcards” recommendation.
- **Scenario personalization**: selectScenariosForUser(profile, level); occupation, family, goal filter; used for scenario list and “Try a scenario” card.
- **Adaptive difficulty**: getDifficultyRecommendation(accuracy, confidence) → increase/maintain/decrease/review; used for next lesson level.
- **Retention triggers**: streak_reminder, daily_goal, challenge; when to show (e.g. no activity today, streak at risk).
- **Content resolution**: Map recommendation content_id and type to real lesson_id, scenario_id, exam_module_id (backend or content service).

### 7. Out of Scope

- Content authoring; engine consumes content IDs and metadata.
- Delivering the actual lesson or scenario (Lesson Engine, FD-03); personalization only recommends.
- Gamification XP/streak computation (FD-10); personalization reads streak and daily goal for retention cards.
- UI layout of home (UI doc); this spec provides data for “session set” and recommendations.

## 8. Main User Personas

- **New user**: Post-onboarding; first lesson recommendation from profile (FD01-FR-004).
- **Returning user**: “Continue” lesson; daily practice; scenario or exam prep by goal.
- **Exam-focused**: Recommendations include exam_prep_module when goal = integration_exam.
- **At-risk**: No activity today; streak_reminder or daily_goal card.

## 9. Main User Journeys

| Journey | Steps |
|--------|--------|
| **Home load** | Client GET /home or /recommendations with session_set → Engine returns recommendations[] and session_set (Continue, Daily, Scenario, Weak skill, Exam prep, Streak reminder) → Client renders cards. |
| **Continue** | User taps “Continue [lesson]” → Client navigates to lesson (content from Lesson Engine); completion → POST activity-event → Engine updates; next load may show new “Continue” or next recommendation. |
| **Skill profile** | Used by scenario list (FD-03) and AI Conversation (level, weak_skills in prompt); GET /skill-profile for profile/settings or internal. |
| **Review** | “Review flashcards” recommendation → User opens review (Lesson Engine); completion → recordRecall; getDueForReview drives next “Review” recommendation. |

## 10. Triggering Events / Inputs

- **Home / recommendations**: Client GET with user (auth); optional includeSessionSet; optional date for “today” goals.
- **Activity event**: Lesson, quiz, scenario, voice, listening, pronunciation completion → POST /activity-event; engine updates progress snapshot and skill profile.
- **Scenario list**: When FD-03 needs personalized scenario list, backend calls selectScenariosForUser(profile) or recommendations by type=scenario.
- **Learning path**: GET /learning-path; used for dashboard “Daily goal: 20 min” and progress bar.
- **Difficulty**: When choosing next lesson level, backend may call getDifficultyRecommendation(recent_accuracy, confidence).

## 11. States / Lifecycle

- **Recommendations**: Computed on read; no persistent “recommendation” entity; can cache per user with short TTL (e.g. 5 min) and invalidate on activity-event.
- **Skill profile**: Derived from progress and activity events; updated on each activity-event; persisted (e.g. skill_scores table or materialized view).
- **Spaced repetition**: Per-item state (last_reviewed_at, next_due_at, recall counts); updated on recordRecall.
- **Learning path**: Derived (daily goal, progress); can be computed on GET or cached.

## 12. Business Rules

- **BFR-005**: Profile (level, goals, occupation, etc.) drives recommendations and scenario selection.
- **IS-002, IS-003**: Level and target level in profile; content filtered by level.
- **Spaced repetition**: IS-008; items due for review surface in recommendations.
- **Session set**: At least one “Continue” if there is in-progress lesson; one “Daily practice” or “Recommended lesson”; optional Scenario, Weak skill, Exam prep, Streak reminder by rules (e.g. streak_reminder if no activity today and streak > 0).
- **Content resolution**: recommendation.content_id and type must resolve to valid lesson_id, scenario_id, or exam_module_id; 404 or fallback if content missing.

## 13. Configuration Model

- **Recommendation types**: continue_learning, daily_practice, scenario, weak_skill_practice, exam_prep_module, review_flashcards, streak_reminder, daily_goal.
- **Priority/ordering**: Config or code; e.g. Continue first, then Daily, then Scenario, then Weak skill, Exam prep, Review, Retention.
- **Skill dimensions**: vocabulary, grammar, listening, speaking, pronunciation, reading, conversation_fluency; thresholds for weak (< 0.5) and strong (≥ 0.75) (from personalization-engine.md).
- **Daily goal**: daily_goal_minutes from profile; progress from activity duration or count; configurable.
- **Spaced repetition**: Algorithm params (e.g. SM-2 or similar); next_due from last_reviewed and recall success/fail.
- **Retention**: Rules for when to show streak_reminder (e.g. last_activity not today, streak > 0); daily_goal (e.g. progress < goal).

## 14. Data Model

- **Progress snapshot / activity-derived**: lesson_completions, quiz_results, conversation_summaries, pronunciation_scores; aggregated per user for skill profile. Source: progress tables (FD-02, FD-03, FD-04, FD-05, FD-06) and activity events.
- **skill_profile** (or derived): user_id, dimension (vocabulary, grammar, ...), score, confidence, recent_performance, trend (up/stable/down), last_updated, sample_count. Optional: weak_skills[], strong_skills[].
- **spaced_repetition_items**: user_id, item_id (e.g. vocabulary_term_id or lesson_id), last_reviewed_at, next_due_at, recall_success_count, recall_fail_count. (May live in Lesson Engine or shared.)
- **Recommendations**: Not stored; computed from profile, progress, skill profile, spaced repetition, and rules. Optional cache: user_id, recommendations_json, cached_at, TTL.
- **Activity events**: Ingested via POST /activity-event; may be stored for replay or only used to update progress/skill (see personalization-engine.md).

## 15. Read Model / Projection Needs

- **Home**: Recommendations list and session_set; learning path (daily goal, progress); from GET /recommendations and GET /learning-path.
- **Skill profile**: For scenario personalization (FD-03), AI Conversation (level, weak_skills), and “Weak skill” recommendation; GET /skill-profile.
- **Spaced repetition**: getDueForReview for “Review flashcards” recommendation; may be read from Lesson Engine or shared store.
- **Content resolution**: Recommendation content_id → lesson/scenario/exam; backend or BFF resolves before returning to client so client gets deep link or content payload.

## 16. APIs / Contracts

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/v1/recommendations` or `/v1/home/recommendations` | Recommendations and optional session set | Query: includeSessionSet=true | 200 { recommendations[], session_set? } |
| GET | `/v1/learning-path` | Daily/weekly path and goal progress | — | 200 { daily?, weekly_goal_minutes?, progress_toward_goal_minutes? } |
| GET | `/v1/skill-profile` | Skill scores and weak/strong | — | 200 { profile: { skills[], weak_skills[], strong_skills[] } } |
| POST | `/v1/activity-event` | Ingest completion event | Body: { event: ActivityEvent } (lesson_completed, quiz_completed, conversation_completed, ...) | 202 or 200 { accepted: true } |
| (Internal) | recordRecall, getDueForReview | Spaced repetition | user_id, item_id, success (for record) | Used by Lesson Engine or Personalization; getDueForReview returns item ids |
| (Internal) | selectScenariosForUser | Scenario list for user | profile | Used by FD-03 scenario list |
| (Internal) | getDifficultyRecommendation | Next difficulty | accuracy, confidence | increase/maintain/decrease/review |

**Recommendation schema**: recommendation_id (optional), type, content_id, reason (i18n key or text), priority, estimated_time_minutes, skill_target. content_id resolved to real id (lesson_id, scenario_id, exam_module_id) by backend or client with second call.

## 17. Events / Async Flows

- **Activity events**: Incoming from completion flows (FD-02, FD-03, FD-04, FD-05, FD-07, FD-09); POST /activity-event; engine updates progress and skill profile; no outbound event from personalization except optional analytics (recommendation_served, recommendation_clicked).
- **Recommendation served**: Optional analytics when client displays recommendations.
- **Recommendation clicked**: Optional when user taps a recommendation (for tuning).

## 18. UI / UX Design

- **Home**: Session set as cards: “Continue [Lesson title],” “Daily practice: [Lesson],” “Try a scenario: [Scenario name],” “Practice grammar,” “Exam prep: B1 Reading,” “Don’t break your streak!,” “You’re 10 min toward your 20 min goal.” Order and presence from session_set and recommendations.
- **Empty**: If no recommendations (e.g. new user, no content), “Get started” or “Complete onboarding” or generic “Explore lessons.”
- **Content resolution**: Client receives content_id and type; navigates to /lessons/:id or /scenarios/:id or /exam-prep/...; 404 handled if content removed.

## 19. Main Screens / Components

- **HomeScreen**: Consumes GET /recommendations (or /home); renders RecommendationCard per item; Continue card, Daily card, Scenario card, etc.
- **RecommendationCard**: Title, reason, CTA (“Continue,” “Start,” “Review”); deep link from content_id.
- **LearningPathWidget**: Daily goal progress bar; “X min today”; optional weekly goal.
- **SkillProfileView**: Optional in profile/settings; shows skills and weak/strong (from GET /skill-profile).

## 20. Permissions / Security Rules

- **Authenticated**: All endpoints require auth; recommendations and skill profile only for current user.
- **Content resolution**: Resolve content_id to content user is allowed to access (level, entitlement); do not recommend locked premium content to free user without upsell (or recommend with “Upgrade to unlock”).
- **Activity event**: Validate event payload (user_id from auth; event type and ids valid); idempotent if same event id (optional).

## 21. Notifications / Alerts / Side Effects

- **Retention**: Streak reminder and daily goal can drive push notifications (Notifications module); personalization only defines “when” (e.g. no activity today); notification content and delivery in Notifications.
- **No side effect on activity**: POST /activity-event is fire-and-forget for caller; engine updates internal state; does not block completion response.

## 22. Integrations / Dependencies

- **Profile (FD-01)**: Level, goals, occupation, family, daily_goal_minutes; read for recommendations and scenario selection.
- **Lesson Engine (FD-02)**: Progress (completed lessons, in-progress); content resolution for lesson_id; spaced repetition (recordRecall, getDueForReview) may live here or in Personalization.
- **FD-03 (Scenarios)**: Scenario list filtered by selectScenariosForUser; scenario recommendation content_id.
- **FD-04, FD-05, FD-07, FD-09**: Activity events from voice, listening, daily lesson, exam task; feed skill profile and recommendations.
- **Gamification (FD-10)**: Streak and daily activity for streak_reminder and daily_goal cards; read-only.
- **Content**: Resolve content_id to lesson, scenario, exam module; may require Content or Lesson Engine API.
- **AI Conversation**: Uses skill profile (level, weak_skills) for prompt personalization; see ai-conversation-engine.md.

## 23. Edge Cases / Failure Cases

- **No profile or incomplete**: New user; use defaults (e.g. first lesson by level) or “Complete profile” recommendation.
- **No progress**: Only “Daily practice” and “Recommended lesson”; no “Continue.”
- **Content deleted**: content_id no longer exists; 404 on navigate; recommendation engine should filter or content service returns only valid ids.
- **Activity event duplicate**: Idempotent by event_id or (user_id, activity_type, source_id); do not double-count.
- **Skill profile cold start**: Few activities; low confidence; show generic recommendations until enough data.
- **Spaced repetition empty**: No “Review” card or “No items due” message.

## 24. Non-Functional Requirements

- **Latency**: GET /recommendations < 1s (cache or precomputed); POST /activity-event < 500ms (async accept).
- **Scalability**: Recommendation computation can be cached per user; activity-event volume high (every completion); consider async processing and batch updates for skill profile.
- **Stability**: Engine should not fail completion flows; activity-event accept and process async if needed.

## 25. Analytics / Auditability Requirements

- **Events**: recommendation_served (session_set or list), recommendation_clicked (type, content_id); activity-event types for funnel (lesson_completed, etc.) in analytics pipeline.
- **Skill profile**: Stored for debugging and support (“why did I get this recommendation”); optional audit.

## 26. Testing Requirements

- Unit: Recommendation rules (Continue if in-progress; Daily; Scenario by profile); skill scoring (weak/strong thresholds); getDueForReview.
- Integration: GET /recommendations returns list and session_set; POST /activity-event updates state; GET /skill-profile after events; selectScenariosForUser returns filtered list.
- E2E: Home shows Continue and Daily; complete lesson; home updates; scenario card matches profile.

## 27. Recommended Architecture

- **Personalization service**: Entry: getRecommendations, getLearningPath, getSkillProfile, postActivityEvent (see personalization-engine.md). Consumes profile (Profile service or DB), progress (Lesson Engine or shared DB), and activity events. Returns recommendations with content_id; BFF or client resolves to URLs. Optional: cache recommendations per user (Redis) with TTL and invalidation on activity-event.
- **Location**: src/personalization-engine/ or backend service; models: Learner profile, progress snapshot, spaced repetition items.

## 28. Recommended Technical Design

- **Session set**: Generate in order: Continue (if in-progress lesson), Daily (next recommended lesson), Scenario (one scenario by selectScenariosForUser), Weak skill (if weak_skills non-empty), Exam prep (if goal=integration_exam and target A2/B1), Review (if getDueForReview non-empty), Streak reminder (if rule), Daily goal (if progress < goal). Limit to N cards (e.g. 5–7).
- **Content resolution**: Backend resolves content_id to lesson/scenario/exam and returns deep link or content summary; or client calls GET /lessons/:id after tap; 404 handling in client.
- **Activity event**: Schema { event_type, source_id, user_id, timestamp, payload? }; idempotency key optional; process in order or at-least-once.

## 29. Suggested Implementation Phasing

- **Phase 1**: GET /recommendations with simple rules (Continue from progress, Daily from lesson catalog by level); GET /learning-path (daily_goal_minutes from profile, progress from activity count); POST /activity-event stub (accept and store).
- **Phase 2**: Skill profile (compute from progress); weak_skill recommendation; selectScenariosForUser; session_set full set.
- **Phase 3**: Spaced repetition (recordRecall, getDueForReview); retention triggers (streak_reminder, daily_goal); getDifficultyRecommendation; cache and invalidation.

## 30. Summary

Personalization & Recommendations power the home dashboard and “what’s next”: recommendations (lessons, scenarios, exam prep, review, weak skill) and session set (Continue, Daily, Scenario, Weak skill, Exam prep, Streak reminder, Daily goal). Skill profile drives scenario selection and AI Conversation; activity events keep progress and skills up to date. Implementation should cache recommendations for latency, resolve content_id to valid content, and ensure activity-event ingestion does not block completion flows. See docs/final/personalization-engine.md for existing design and contracts.
