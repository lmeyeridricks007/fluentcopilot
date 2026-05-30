# Feature: Gamification (E-11)

**Epic**: E-11 Gamification  
**Source**: docs/features/deep-dives (Gamification), feature-index

---

## Feature Purpose

Award XP on activity completion (lesson, scenario, voice, listening, etc.); manage streak (consecutive days); unlock achievements (rules-based); expose summary (XP, streak, achievements) to client for Home and profile.

---

## Feature Scope

- **In scope**: XP award per activity type (configurable); streak calculation (consecutive days with activity); achievements (rules: e.g. "Complete 5 lessons", "7-day streak"); GET summary for client; no pay-to-win (BR-7).
- **Out of scope**: Leaderboards; paid XP boosts (product decision).

---

## Dependencies

- All completion flows: Core Lessons (E-03), Scenarios (E-04), Voice (E-05), Listening (E-06), Daily Reflection (E-08), Exam (E-10) call award on complete.

---

## Sub-Features

xp-award, streak-management, achievements, gamification-summary.

---

## Feature Completion Checklist

- [ ] UI: XP display (header/profile); streak badge; achievement list or badges; summary on Home.
- [ ] API: Internal award( user_id, activity_type, source_id, score ); GET /gamification/summary or embedded in /me.
- [ ] Backend: Gamification service; award logic; streak from activity_completions or daily aggregates; achievement rules engine.
- [ ] Database: user_xp or activity_completions; user_streak; achievements definition table; user_achievements (unlocks).
- [ ] Integrations: Called by Lesson Engine, Scenario, Voice, etc. on complete.
- [ ] Seed/demo: Achievement definitions; sample XP and streak for demo user.
- [ ] Tests: Award XP on complete; streak increment and reset; achievement unlock conditions.
