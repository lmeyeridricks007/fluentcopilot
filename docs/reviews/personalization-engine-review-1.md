# Personalization Engine — Review 1

## Scope

First-pass review of the Personalization & Adaptive Learning Engine: types, profile store, skill scoring, weakness detection, recommendations, adaptive difficulty, learning path, scenario personalization, spaced repetition, telemetry ingestion, retention triggers, and service API.

## Strengths

- **Structured models**: Learner profile, skill dimensions (7 dimensions with score/confidence/trend), progress snapshot, recommendation schema with type/priority/skill_target.
- **Weakness detection**: Threshold-based weak/strong skills; severity and suggested_action per weakness; inference from quiz and conversation activity.
- **Recommendation engine**: Multiple types (next_lesson, weak_skill_practice, conversation_scenario, review_flashcards, exam_prep, streak_reminder); considers skill gaps, goals, and scenario relevance.
- **Session set**: Continue Learning, Daily Practice, Scenario Practice, Weak Skill, Exam Prep, retention cards generated in one call.
- **Scenario personalization**: Occupation, family, and learning_goal drive scenario selection (workplace, parent, integration_exam, etc.).
- **Adaptive difficulty**: increase/maintain/decrease/review based on accuracy and confidence; CEFR-ordered.
- **Learning path**: Daily path (recommended lessons, review items, scenario); weekly path (goals, skill balance, scenario rotation).
- **Spaced repetition**: last_reviewed, difficulty, recall_success/fail, next_review_due; recordRecall and getDueForReview.
- **Telemetry**: Activity events (lesson, quiz, conversation, pronunciation, listening) update progress snapshot and stored completions.
- **Retention**: getRetentionTriggers for streak_reminder, daily_goal, challenge.
- **Service API**: getRecommendations, getLearningPath, getSkillProfile, postActivityEvent; maps to GET/POST contracts.
- **Mock mode**: seedMockProfile, seedMockProgress, seedMock for development; in-memory store.

## Gaps / Weaknesses

- Skill scoring uses only lessons, quizzes, and conversation summaries; pronunciation/listening are smoothed from snapshot only. Could add explicit attempt lists for finer granularity.
- Recommendation content_id values (e.g. lesson-continue-1, lesson-vocabulary-1) are placeholders; production should resolve to real lesson/scenario IDs from content service.
- Spaced repetition is item-based but flashcard_success_rate in progress is not yet updated from recordRecall; could sync.
- No explicit “when to suggest exam prep” rule beyond goal=integration_exam and target A2/B1; could add time-to-exam or readiness score.

## Scorecard

| Category | Score | Notes |
|----------|-------|--------|
| Clarity | 9/10 | Clear types, modules, and API |
| Learning science validity | 8/10 | Weakness detection, difficulty, spaced rep are sound; could deepen |
| Scalability | 8/10 | In-memory store; replace with DB/API for multi-instance |
| Personalization quality | 9/10 | Scenario and goal-driven; session set is rich |
| Implementation readiness | 9/10 | Ready for backend wiring and content IDs |

**Overall**: 8.6/10. Confident for integration; improve content resolution and optional scoring depth in next phase.
