# Personalization Engine — Recommendation Logic

## Inputs

- Learner profile (level, goal, occupation, family, daily_goal_minutes).
- Skill profile (scores, confidence, trend per dimension; weak_skills, strong_skills).
- Progress snapshot (lessons, quiz accuracy, conversations, streak, time).
- Detected weaknesses (skill, reason, severity, suggested_action).

## Recommendation Types

| Type | When | Example content_id |
|------|------|--------------------|
| next_lesson | Always | lesson-continue-1 |
| weak_skill_practice | Any weak skill | lesson-{dimension}-1 |
| conversation_scenario | Scenario personalization | scenario id (e.g. cafe, workplace_meeting) |
| review_flashcards | Always | flashcards-due |
| exam_prep_module | learning_goal=integration_exam, target A2/B1 | exam-reading-a2 |
| streak_reminder | No recent activity, streak=0 | daily-goal |
| daily_goal | Profile has daily_goal_minutes | — |

## Session Recommendation Set

When the learner opens the app, the engine can return a **session set**:

- **continue_learning**: Next lesson or weak-skill lesson (high priority).
- **daily_practice**: Review flashcards or daily goal.
- **scenario_practice**: One scenario from scenario personalization.
- **weak_skill_practice**: If weak skills detected.
- **exam_prep**: If goal is integration_exam.
- **retention**: Streak reminder, challenge, daily goal.

## Scenario Personalization

Scenarios are selected by:

- **Occupation**: office/tech → workplace_meeting, office_introduction; healthcare → doctor, pharmacy; retail → supermarket, customer_support.
- **Family**: parent → school_daycare, supermarket, doctor.
- **Learning goal**: integration_exam → municipality, social, doctor; workplace → meeting, office, customer_support; social → social_small_talk, cafe, dating; daily_life → supermarket, cafe, train, doctor.

## Adaptive Difficulty

- **High accuracy (e.g. ≥0.85) and confidence (e.g. ≥0.5)** → suggest next CEFR level (increase).
- **Low accuracy (e.g. <0.5) or low confidence** → suggest previous level or review.
- **Otherwise** → maintain current level.

Used to recommend level for next lesson or scenario; can be passed to AI Conversation Engine for prompt adaptation.
