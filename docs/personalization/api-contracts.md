# Personalization Engine — API Contracts (REST Mapping)

## GET /recommendations/:user

**Query**: `includeSessionSet=true|false` (optional, default false).

**Response** (GetRecommendationsResponse):

```json
{
  "recommendations": [
    {
      "recommendation_id": "string",
      "type": "next_lesson | review_flashcards | conversation_scenario | ...",
      "content_id": "string",
      "reason": "string",
      "priority": "high | medium | low",
      "estimated_time_minutes": 10,
      "skill_target": "vocabulary | grammar | ..."
    }
  ],
  "session_set": {
    "user_id": "string",
    "continue_learning": { /* Recommendation */ },
    "daily_practice": { /* Recommendation */ },
    "scenario_practice": { /* Recommendation */ },
    "weak_skill_practice": { /* Recommendation */ },
    "exam_prep": { /* Recommendation */ },
    "retention": [ /* Recommendation[] */ ],
    "generated_at": "ISO8601"
  }
}
```

---

## GET /learning-path/:user

**Response** (GetLearningPathResponse):

```json
{
  "daily": {
    "user_id": "string",
    "date": "YYYY-MM-DD",
    "recommended_lessons": [ /* Recommendation[] */ ],
    "review_items": [ /* Recommendation[] */ ],
    "scenario_practice": { /* Recommendation */ },
    "daily_goal_minutes": 15,
    "weekly_goal_minutes": 75,
    "progress_toward_goal_minutes": 0
  },
  "weekly_goal_minutes": 75
}
```

---

## GET /skill-profile/:user

**Response** (GetSkillProfileResponse):

```json
{
  "profile": {
    "user_id": "string",
    "skills": {
      "vocabulary": { "dimension": "vocabulary", "score": 0.7, "confidence": 0.5, "recent_performance": 0.72, "trend": "up", "last_updated": "ISO8601", "sample_count": 10 },
      "grammar": { ... },
      "listening": { ... },
      "speaking": { ... },
      "pronunciation": { ... },
      "reading": { ... },
      "conversation_fluency": { ... }
    },
    "overall_level_estimate": "A2",
    "weak_skills": ["grammar"],
    "strong_skills": ["vocabulary"],
    "updated_at": "ISO8601"
  }
}
```

---

## POST /activity-event

**Request** (PostActivityEventRequest):

```json
{
  "event": {
    "event_type": "lesson_completed | quiz_completed | conversation_completed | pronunciation_completed | listening_completed | ...",
    "user_id": "string",
    "timestamp": "ISO8601",
    "payload": {
      "lesson_id": "string",
      "quiz_id": "string",
      "scenario_id": "string",
      "success": true,
      "score": 0.8,
      "accuracy": 0.85,
      "comprehension_score": 0.7,
      "time_spent_seconds": 120,
      "correction_count": 2,
      "fluency_score": 0.75
    }
  }
}
```

**Response** (PostActivityEventResponse):

```json
{
  "accepted": true
}
```
