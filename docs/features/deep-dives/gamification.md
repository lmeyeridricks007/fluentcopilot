# Gamification — Deep-Dive Specification

## 1. Purpose

Gamification awards XP, maintains streaks (consecutive days), and grants achievements to motivate learners. It is triggered by activity completion (lessons, scenarios, voice, listening, etc.) and exposes summary data to the client (home, profile). This spec covers FD-10: rules (BR-7), events, data model, and integration with all completion flows.

## 2. Core Concept

- **XP**: Points awarded on activity completion (lesson, scenario, voice session, listening, exam task); configurable per activity type; no pay-to-win (BR-7).
- **Streak**: Consecutive days with at least one completed activity; optional streak freeze (BR-7); updated when user completes an activity.
- **Achievements**: Rules-based (e.g. “First scenario,” “7-day streak”); evaluated on completion events; persisted and displayed.
- **Exposure**: Home and profile show XP, streak, and achievement list; optional leaderboard and daily challenge (BR-7).

## 3. Why This Feature Exists

- **Retention (OBJ-4)**: Streaks and achievements encourage daily return.
- **Engagement**: Clear progress and rewards; supports conversion (premium features earn XP).

## 4. User / Business Problems Solved

- Learners see tangible progress and are nudged to maintain streaks.
- Business improves retention and time-in-app.

## 5. Scope

### 6. In Scope

- Award XP and update streak on activity completion (lesson, scenario, voice, listening, exam task, etc.) (FD10-FR-001).
- Evaluate and grant achievements per defined rules; persist and display (FD10-FR-002).
- Configurable streak rules (e.g. streak freeze, BR-7) (FD10-FR-003).
- Expose XP, streak, and achievements to client (home, profile) (FD10-FR-004).
- Optional: leaderboard (anonymous or friends); daily challenge; XP caps per day (BR-7).
- Events: xp_awarded, streak_updated, achievement_unlocked.

### 7. Out of Scope

- Defining which activities award how much XP (product/ops config); this spec defines the mechanism.
- Payment or real-money rewards; XP only from activity (BR-7).
- Social graph (friends) if leaderboard is “friends”; only anonymous leaderboard in core scope unless specified.

## 8. Main User Personas

- **Engaged learner**: Tracks streak and achievements; aims for daily goal.
- **Casual learner**: Sees XP and streak on home; no deep engagement with achievements.
- **Competitive**: Uses leaderboard and daily challenge if available.

## 9. Main User Journeys

| Journey | Steps |
|--------|--------|
| **Earn XP** | Complete lesson/scenario/voice/listening → Backend awards XP → Home/profile show updated total. |
| **Streak** | Complete any activity on day N → Streak = N consecutive days; next day no activity → streak broken (or freeze if used). |
| **Achievement** | Complete activity → Backend evaluates rules → New achievement unlocked → Toast or badge; list in profile. |
| **View summary** | Home or Profile → GET /gamification/summary → Display XP, streak, achievements. |

## 10. Triggering Events / Inputs

- **Activity completed**: Lesson (FD-02), scenario (FD-03), voice (FD-04), listening (FD-05), exam task (FD-09), daily reflection lesson (FD-07). Each completion flow calls Gamification service (internal): award XP, update streak, check achievements.
- **Client read**: GET /gamification/summary (or embedded in GET /home) for XP, streak, achievements.
- **Streak freeze**: User applies freeze (e.g. one per week); next missed day does not break streak; consume freeze (product rule).

## 11. States / Lifecycle

- **XP**: Running total; only increases (no deduction in core design); persisted per user.
- **Streak**: Integer (consecutive days); updated daily when activity completed; reset to 0 when day missed (or freeze applied).
- **Achievement**: Unlocked once; persisted; never revoked.
- **Streak freeze**: Count of available freezes; decrement when used; optional refill (e.g. weekly).

## 12. Business Rules

- **BR-7**: Defined rules for streak, XP, achievements; no pay-to-win; XP only from activity; optional streak freeze and XP caps.
- **XP**: Award only on completion (not on start or abandon); amount per activity type configurable.
- **Streak**: “Day” in user’s timezone or UTC; one activity per day counts; optional minimum (e.g. 5 min) to count.
- **Achievements**: Idempotent unlock; same achievement not granted twice.

## 13. Configuration Model

- **XP per activity**: e.g. lesson=10, scenario=25, voice=20, listening=15; config or DB.
- **Streak**: Timezone (user or UTC); freeze allowed (boolean or count); freeze refill interval.
- **Achievements**: List of { id, name_key, rule_type, rule_params }. Rules: e.g. first_lesson, first_scenario, streak_7, streak_30, lessons_10, xp_100; evaluated on each completion event.
- **Caps**: Optional max XP per day (e.g. 100); beyond that no XP or reduced (product decision).
- **Leaderboard**: Optional; scope (global anonymous, friends); period (daily, weekly, all-time); rank by XP or streak.

## 14. Data Model

- **user_gamification** (or gamification_summary): user_id, total_xp, current_streak_days, longest_streak_days, streak_freeze_available, last_activity_date (for streak calc), updated_at.
- **xp_transactions** (optional, for audit): id, user_id, amount, source (lesson_id, scenario_id, ...), created_at.
- **achievements**: id, code, name_key, description_key, icon_url, rule_type, rule_params (JSONB), sort_order.
- **user_achievements**: user_id, achievement_id, unlocked_at; unique (user_id, achievement_id).
- **streak_freezes**: user_id, used_count, refill_at (optional).

## 15. Read Model / Projection Needs

- **Summary**: total_xp, current_streak, longest_streak, streak_freeze_available, achievements[] (unlocked); computed or read from user_gamification + user_achievements.
- **Leaderboard**: Top N by XP or streak for period; anonymous (no user name or hashed id); optional cache (Redis) for performance.
- **Daily challenge**: Optional; e.g. “Complete 1 lesson today” for bonus XP; requires challenge definition and completion check.

## 16. APIs / Contracts

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/v1/gamification/summary` | XP, streak, achievements for current user | — | 200 { total_xp, current_streak, longest_streak, streak_freeze_available, achievements[] } |
| POST | `/v1/gamification/streak-freeze` | Use a streak freeze (optional) | — | 200 { streak_freeze_available }; 400 none available |
| GET | `/v1/gamification/leaderboard` | Optional: top users by XP or streak | Query: period (daily|weekly|all), limit | 200 { entries[] } (anonymous) |
| (Internal) | Gamification service | Called by Lesson Engine, AI Conversation, Speech, etc. on activity complete | { user_id, activity_type, activity_id, metadata? } | — |

**Internal contract**: Completion flows (FD-02, FD-03, FD-04, FD-05, FD-07, FD-09) call Gamification with user_id, activity_type, activity_id; Gamification awards XP, updates streak, evaluates achievements, persists; no HTTP required if in-process; or POST /internal/gamification/award (server-to-server).

## 17. Events / Async Flows

- **xp_awarded**: user_id, amount, source (analytics).
- **streak_updated**: user_id, current_streak, is_new_record? (analytics).
- **achievement_unlocked**: user_id, achievement_id (analytics; can trigger in-app celebration).
- **Input**: Gamification is consumer of completion events; producers (Lesson Engine, etc.) emit or call Gamification synchronously after persisting progress.

## 18. UI / UX Design

- **Home**: XP bar or total; streak flame and number; “Don’t break your streak!”; next achievement hint.
- **Profile**: Full achievement list (locked vs unlocked); streak history optional; leaderboard link if present.
- **Post-activity**: “+10 XP”; “Streak: 5 days”; “Achievement unlocked: First scenario!”
- **Streak freeze**: “Use streak freeze?” when user might miss day; or in Settings.
- **Leaderboard**: List of ranks (anonymous); “You’re #12 this week.”

## 19. Main Screens / Components

- **GamificationSummaryWidget**: XP, streak, achievements count; used on Home and Profile.
- **AchievementList**: Grid or list of achievements; locked (grey) vs unlocked (color).
- **StreakFreezeButton**: Use freeze; show count.
- **LeaderboardScreen**: Optional; table or list; period selector.

## 20. Permissions / Security Rules

- **Authenticated**: Summary and leaderboard (if anonymous) require auth for “my” data; leaderboard may be public read (anonymous ids only).
- **No cheating**: XP only from server-side completion events; client cannot POST arbitrary XP.
- **Internal award**: Only backend services can trigger award; validate activity_id and activity_type against actual completion.

## 21. Notifications / Alerts / Side Effects

- **Push**: “Don’t forget! One lesson to keep your streak” (Notifications; optional).
- **In-app**: Achievement unlock toast or modal; streak milestone (e.g. 7 days).
- **No side effect on completion**: Completion flows must not fail if Gamification is down; award can be async or best-effort (product decision: strict vs eventual).

## 22. Integrations / Dependencies

- **FD-02 (Core Lessons)**: On lesson completion → call Gamification (XP, streak, achievements).
- **FD-03 (Scenarios)**: On scenario_completed → Gamification.
- **FD-04 (Voice)**: On voice_session_ended → Gamification.
- **FD-05 (Listening)**: On listening_completed → Gamification.
- **FD-07 (Daily Reflection)**: On daily_lesson_completed → Gamification.
- **FD-09 (Exam Prep)**: On task or simulated exam completed → Gamification.
- **All**: Same pattern: persist completion first, then award XP and update streak; check achievement rules.
- **Notifications**: Optional streak reminder and achievement push.

## 23. Edge Cases / Failure Cases

- **Same day multiple activities**: Streak already counts; XP sums; achievements evaluated once per type (e.g. first_scenario only once).
- **Timezone**: Streak “day” must be consistent (user timezone or UTC); document and apply consistently.
- **Gamification service down**: Completion still saved; award can be queued and processed later (eventual consistency) or skipped and logged.
- **Negative XP**: Not allowed; only add.
- **Achievement rule edge**: e.g. “10 lessons” — count only completed; idempotent so 11th lesson doesn’t double-grant.

## 24. Non-Functional Requirements

- **Latency**: Summary GET < 500ms; award path should not block completion response (fire-and-forget or async queue).
- **Availability**: Gamification read critical for home; write can be eventually consistent with completion.
- **Scalability**: High write volume (every completion); consider batch or async processing.

## 25. Analytics / Auditability Requirements

- **Events**: xp_awarded, streak_updated, achievement_unlocked. Include user_id, amount/achievement_id; for funnel and retention analysis.
- **Audit**: XP transactions optional for support (e.g. “user says missing XP”); streak and achievement state queryable.

## 26. Testing Requirements

- Unit: XP amount by activity type; streak logic (consecutive, freeze); achievement rules (first_lesson, streak_7).
- Integration: Complete lesson → Gamification called → summary updated; streak after N days; achievement unlock.
- E2E: Complete activity; see XP and streak on home; unlock achievement and see in profile.

## 27. Recommended Architecture

- **Gamification service**: Single place for XP, streak, achievements; exposes GET summary and internal award API. Called by Lesson Engine, AI Conversation, Speech, etc. after they persist completion. Optional: event-driven (publish completion event; Gamification subscribes and awards).
- **Data**: PostgreSQL for user_gamification, user_achievements, xp_transactions; Redis for summary cache and optional leaderboard.

## 28. Recommended Technical Design

- **Award flow**: Synchronous call from completion handler (e.g. Lesson Engine) to Gamification; Gamification updates DB and returns; completion response already sent. Or: completion handler publishes event; Gamification worker consumes and updates; summary may be eventually consistent.
- **Streak**: On award, read last_activity_date; if today already has activity, no streak change; if last was yesterday, increment streak; if gap > 1 day, reset to 1. Use user timezone or UTC midnight.
- **Achievements**: On each award, load achievement rules; for each not yet unlocked, evaluate (e.g. total lessons >= 10); if true, insert user_achievement and emit event.

## 29. Suggested Implementation Phasing

- **Phase 1**: XP and streak only; award on lesson and scenario completion; GET summary; no achievements.
- **Phase 2**: Achievements (first_lesson, first_scenario, streak_7); achievement list in profile; unlock toast.
- **Phase 3**: Streak freeze; leaderboard (anonymous); daily challenge; XP caps; analytics events.

## 30. Summary

Gamification awards XP and maintains streaks on activity completion and evaluates achievements (BR-7). It is triggered by all completion flows (lessons, scenarios, voice, listening, exam, daily lesson). Summary is exposed to client for home and profile. Implementation must ensure XP only from server-side completion, consistent streak day logic, and idempotent achievement unlocks. Optional: leaderboard, streak freeze, daily challenge.
