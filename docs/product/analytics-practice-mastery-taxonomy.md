# Practice & Mastery — analytics taxonomy

This document defines **what we track**, **payload shape**, **funnels**, and **metrics → events** for the Practice Hub, scenarios, support tools, retention, mastery, and premium signals.

Implementation lives under `src/lib/analytics/` (`analyticsService`, `analyticsContextBuilder`, `analyticsSession`, `eventCategories`, `practiceScenarioAnalytics`) and `track()` / `emitAnalyticsEvent()` in `src/lib/analytics.ts`.

---

## 1. Envelope (every event)

Dispatched via `emitAnalyticsEvent`: each payload is merged with:

| Field | Source |
|--------|--------|
| `event_name` | First argument to `emitAnalyticsEvent` / `track()` |
| `event_category` | `eventCategories.ts` → `categoryForEvent()` |
| `session_id` | `analyticsSession` (browser session, ~4h TTL) |
| `user_id` | `getRetentionUserId()` (no PII beyond stable app id) |
| `timestamp_iso` | UTC ISO string at emit time |
| `experiment_variant` | `NEXT_PUBLIC_ANALYTICS_EXPERIMENT_VARIANT` or `null` |

**Convention:** Scenario funnel helpers in `practiceScenarioAnalytics.ts` use **snake_case** for cross-mode warehouse fields (`scenario_id`, `scenario_mode`, …). Many legacy UI calls still pass **camelCase** (`scenarioId`); both may appear until normalized in the sink.

---

## 2. Event categories (`event_category`)

| Category | Purpose |
|----------|---------|
| `scenario` | Catalog, launch, lifecycle, first response |
| `support` | Hints, translate, rephrase, restart, easier mode |
| `practice_quality` | Session / feedback quality |
| `review` / `review_loop` | SRS review + practice → review clicks |
| `weakness` | Weak area surfacing and CTA |
| `skill_track` | Track sessions, exercises, level unlock |
| `mission` | Daily / weekly / skill missions |
| `retention` | Streak application, streak-by-practice |
| `rewards` | XP, unlocks, milestones |
| `mastery` | Ability band upgrades, state transitions |
| `premium` | Paywall, upgrade click, feature exposure |
| `modality` | Typing vs speaking (where instrumented) |
| `post_a2` | Post-A2 path |
| `dashboard` | Next-action CTAs |
| `general` | Fallback for unmapped names |

---

## 3. Core event list (Practice & Mastery focus)

### Scenario lifecycle

| Event | When |
|--------|------|
| `scenario_catalog_viewed` | Scenario library mount / filter result count changes |
| `scenario_viewed` | Scenario launch screen (`surface: launch`) |
| `scenario_started` | Unified “conversation started” (guided: Start conversation; open: start chat) |
| `scenario_first_response` | First learner turn in session |
| `scenario_completed` | Unified completion (with duration, turns, support count, confidence when available) |
| `scenario_abandoned` | Component unmount without completion |
| `guided_scenario_opened` | Guided run mounted |
| `guided_scenario_started` | User starts chat phase |
| `guided_scenario_reply_submitted` | Reply sent |
| `guided_scenario_completed` | Guided state machine finished |
| `practice_open_conversation_started` | Semi / free chat started |
| `practice_open_conversation_completed` | User finished & feedback built |

### Support tools

| Event | When |
|--------|------|
| `practice_support_tool_used` | Open-practice tool fired |
| `guided_scenario_support_used` | Guided toolbar / phrase chip |
| `support_tool_opened` | First open of support UI (open practice) |
| `hint_used` | Hint |
| `phrase_suggestion_used` | Phrase suggestions / chip |
| `translation_requested` | Key phrase / translate |
| `explanation_requested` | Meaning in context |
| `slower_reply_requested` | Simpler / slower line |
| `natural_rephrase_requested` | Say naturally (premium) |
| `turn_restarted` | Rewind turn |
| `easier_mode_requested` | Easier mode |

### Modality

| Event | When |
|--------|------|
| `typing_mode_used` | First typed user message (guided + open practice paths instrumented) |

*Speaking / STT events:* use `schema_lesson_speaking_attempt`, `voice_tutor_*`, and skill-track `speaking_prompt` participation where applicable — not all scenario UIs use voice yet.

### Practice completion & retention

| Event | When |
|--------|------|
| `practice_session_completed` | Central progress processor after scenario or skill track |
| `practice_xp_awarded` | XP from practice paths |
| `practice_streak_applied` | Streak tick tied to practice |
| `streak_extended_by_practice` | Streak **increment** from scenario or skill-track session |
| `streak_extended` / `streak_updated` | General retention layer |
| `xp_awarded` | Retention XP (lessons + practice) |

### Mastery

| Event | When |
|--------|------|
| `practice_ability_upgraded` | Ability highlight after scenario completion |
| `ability_state_changed` | Band transition `weak` → `improving` → `strong` (with `from` / `to`) |

### Weakness

| Event | When |
|--------|------|
| `weak_area_shown` | Weak area surfaced (Top focus, slip row, card, or drill); **deduped** to once per `weak_area_id` per tab session via `trackWeakAreaShownOnce` — check `surface` on payload |
| `weak_area_drill_viewed` | Improve weak drill route opened (`/app/practice/improve/weak/...`) |
| `weak_area_practice_started` | User taps practice CTA on card |

### Skill tracks

| Event | When |
|--------|------|
| `skill_track_session_started` | Session page |
| `skill_track_session_completed` | Session scored |
| `skill_track_level_progressed` | `unlockedLevelIndex` increased after passed level |
| `skill_track_exercise_answered` | Per exercise |

### Premium

| Event | When |
|--------|------|
| `premium_block_shown` | Paywall modal opened (deduped per `reason` while open) |
| `premium_feature_exposed` | Paywall for premium feature, locked tool, or modal surface |
| `premium_upgrade_clicked` | Upgrade CTA in paywall |
| `premium_cta_viewed` / `premium_cta_clicked` | Other CTAs |

*Note:* **Purchase / subscription conversion** is not in-app without billing webhooks — treat `premium_upgrade_clicked` as funnel proxy until backend confirms `premium_conversion`.

### Post-A2 & dashboard

| Event | When |
|--------|------|
| `post_a2_transition_viewed` | Post-A2 screen |
| `post_a2_option_selected` | Path choice |
| `post_a2_banner_clicked` | Banner |
| `dashboard_next_action_clicked` | Dashboard CTA |
| `practice_mode_changed` | Practice hub Do / Improve / Explore switcher (`from_mode`, `to_mode`) |

---

## 4. Example payloads

### `scenario_abandoned`

```json
{
  "event_name": "scenario_abandoned",
  "event_category": "scenario",
  "session_id": "…",
  "user_id": "…",
  "timestamp_iso": "2025-03-26T12:00:00.000Z",
  "experiment_variant": null,
  "scenario_id": "cafe_order",
  "scenario_mode": "guided",
  "scenario_category": "food",
  "entitlement_tier": "free",
  "exit_phase": "chat",
  "duration_ms": 120000,
  "conversation_turn_count": 2,
  "support_used_before_exit": true,
  "support_tool_count": 4,
  "scenario_goal_completed": false,
  "scenario_exit_point": "component_unmount"
}
```

### `scenario_completed`

```json
{
  "event_name": "scenario_completed",
  "scenario_mode": "semi_guided",
  "session_outcome": "partial",
  "scenario_goal_completed": false,
  "duration_ms": 240000,
  "conversation_turn_count": 6,
  "support_tool_count": 3,
  "confidence_percent": 72
}
```

### `ability_state_changed`

```json
{
  "event_name": "ability_state_changed",
  "ability_id": "practical_speaking",
  "ability_state_from": "weak",
  "ability_state_to": "improving",
  "scenarioId": "cafe_order",
  "source": "practice_scenario"
}
```

---

## 5. Funnels

**Scenario (cross-mode)**  
`scenario_viewed` → `scenario_started` → `scenario_first_response` → (`support_*` optional) → `scenario_completed` | `scenario_abandoned`

**Guided (legacy granularity)**  
`guided_scenario_opened` → `guided_scenario_started` → `guided_scenario_reply_submitted` → `guided_scenario_completed`

**Open practice**  
`practice_open_conversation_started` → `scenario_first_response` → `practice_open_conversation_completed` → `scenario_completed`

**Practice → retention**  
`scenario_completed` / `practice_session_completed` → `practice_xp_awarded` → `practice_streak_applied` / `streak_extended_by_practice`

**Premium**  
`premium_feature_exposed` → `premium_block_shown` → `premium_upgrade_clicked` → *(billing: `premium_conversion` — future)*

**Weakness**  
`weak_area_shown` → `weak_area_practice_started` → `scenario_started`

**Skill track**  
`skill_track_session_started` → `skill_track_exercise_answered` * n → `skill_track_session_completed` → `skill_track_level_progressed` (conditional)

**Post-A2**  
`post_a2_transition_viewed` → `post_a2_option_selected` → continued `lesson_*` / `scenario_*`

---

## 6. Metrics → events (reporting map)

| Metric | Events / formula |
|--------|-------------------|
| DAU / WAU | Distinct `user_id` by day/week on any `event_name` |
| Scenario completion rate | `scenario_completed` / `scenario_started` by `scenario_id`, `scenario_mode` |
| Drop-off phase | `scenario_abandoned.exit_phase` distribution |
| Time to first response | `scenario_first_response.timestamp` − `scenario_started.timestamp` (session join) |
| Support reliance | `support_tool_count` on `scenario_completed` / `scenario_abandoned`; counts of `hint_used`, etc. |
| Typing vs speaking | `typing_mode_used` vs voice-related events (lessons / skill track) |
| Weak area engagement | `weak_area_practice_started` / `weak_area_shown` |
| Mission completion | `mission_completed` / `mission_started` |
| Streak impact of practice | `streak_extended_by_practice` filtered by `practice_kind` |
| Confidence lift by scenario | Avg `confidence_percent` on `scenario_completed` by `scenario_id` |
| Premium funnel | `premium_feature_exposed` → `premium_upgrade_clicked` |

---

## 7. Experimentation

- Set `NEXT_PUBLIC_ANALYTICS_EXPERIMENT_VARIANT` per build or segment.
- Compare `scenario_completed` rates and `confidence_percent` by `experiment_variant` and `scenario_mode` (e.g. guided vs free).
- Use `event_category` + `scenario_id` for cohort exports.

---

## 8. Privacy & performance

- No raw message text in analytics payloads; scenario ids and counts only.
- Events are small objects; no batching layer yet — add in `setAnalyticsSink` if the provider requires it.
- Provider: implement `setAnalyticsSink()` or `window.analytics.track` for production.

---

## 9. Gaps & limitations

- **Speaking in open/guided scenarios:** not all composers use STT; speaking adoption is partial until unified `speaking_mode_used` on scenario send paths.
- **`scenario_catalog_viewed`** fires when `filtered.length` or weak-only filter changes — not strictly “once per visit.”
- **`premium_conversion`:** requires payment provider / server truth; not emitted in-app today.
- **Lesson ↔ practice loops:** infer from sequences of `lesson_completed`, `scenario_started`, `review_session_completed` (no single chained event yet).
- **Weak area “ignored”:** no explicit event — derive from `weak_area_shown` without following `weak_area_practice_started` within N days.

---

## 10. Recommended next step

**Run first real user analysis and identify the largest scenario drop-offs** — segment by `scenario_abandoned.exit_phase`, `scenario_mode`, and `support_tool_count`, then prioritize content and UX where abandonment and support load cluster.
