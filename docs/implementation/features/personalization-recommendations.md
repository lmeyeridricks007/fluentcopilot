# Feature: Personalization & Recommendations (E-14)

**Epic**: E-14 Personalization & Recommendations  
**Source**: docs/final/personalization-engine.md, feature-index

---

## Feature Purpose

Provide recommendations (next lesson, daily goal, scenario, exam); maintain skill profile from progress and activity; ingest activity events (lesson_completed, etc.); build session set (Continue, Daily, Scenario, Weak skill, Exam, Streak); support learning path and spaced repetition (due-for-review). **CEFR curriculum path** (see `docs/feature-extensions/cefr-curriculum-path-overview.md`) adds a primary signal: **next lesson on path**, **Today’s queue**, and **revision/weak-area** cards—session set should prefer path order when `active_study_level` and manifest exist.

---

## Feature Scope

- **In scope**: GET recommendations (and session set); skill profile compute and expose; POST activity-event ingestion; session set curation; learning path / goals; spaced repetition (recordRecall, getDueForReview).
- **Out of scope**: Full adaptive curriculum generation (future); content authoring.

---

## Dependencies

- E-02 Profile; E-03 Core Lessons (progress, completion events); E-11 Gamification (streak); E-13 Entitlements (tier for gating recommendations).

---

## Sub-Features

recommendations-api, skill-profile, activity-ingestion, session-set, learning-path, spaced-repetition.

---

## Feature Completion Checklist

- [ ] UI: Home cards (Continue, Daily, Recommended lessons, Streak, etc.); "Review flashcards" from SR.
- [ ] API: GET /recommendations or /home/session-set; POST /activity-event; GET /skill-profile; SR getDueForReview.
- [ ] Backend: Recommendation service; skill model from progress; activity ingestion; session set builder; SR scheduler.
- [ ] Database: activity_events or equivalent; skill_scores; spaced_repetition table.
- [ ] Integrations: Consumes completion events from Lesson Engine, Scenarios, etc.
- [ ] Seed/demo: Sample session set for demo user.
- [ ] Tests: Activity ingestion; recommendations reflect progress; session set; SR due items.
