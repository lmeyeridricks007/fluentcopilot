# Daily practice missions

| Attribute | Value |
|-----------|--------|
| Status | **Implemented (client)** — extends [`practice-system-architecture.md`](./practice-system-architecture.md), [`practice-schema-overview.md`](./practice-schema-overview.md) |
| Code | `src/lib/missions/*`, `src/lib/schemas/practice/missionRuntimeState.schema.ts` |
| Retention | XP reasons: `daily_mission_complete`, `weekly_mission_complete`, `skill_mission_complete` |

## Summary

Rule-based, data-driven missions tie **scenarios**, **skill tracks**, and **review** (daily + mistake-fix) to **XP** and **analytics**. A separate **scenario streak** (consecutive local days with ≥1 completed scenario + scenarios-this-week) complements the global habit streak from retention.

Personalization: **daily** and **skill-focus** templates are chosen from weakness insights + last-practice catalog category; **weekly** templates rotate deterministically by ISO week + tier. `applyMissionSignal` uses a default context (`free`, no cap) when firing from retention hooks so progress is never blocked before the hub hydrates richer assignments.

## Lifecycle

1. **Assign** — `ensureMissionRuntimeHydrated` → roll day/week → `rollAndFillMissionSlots` → persist (`language-tutor-mission-runtime-v1-{userId}`).
2. **Show** — `buildMissionPresentationBundle` → Practice Hub + Home.
3. **Progress** — `applyMissionSignal` from `recordPracticeScenarioComplete`, `recordSkillTrackSessionComplete`, `recordReviewSessionComplete` (when `total` ≥ review credit minimum).
4. **Complete** — `grantMissionRewardIfNeeded` → retention profile XP + ledger.
5. **Reset** — New local day clears daily + skill-focus slots; new ISO week clears weekly slot and weekly counters.

## Assumptions / next steps

- Tier and scenario cap on assign paths use **entitlements** on the hub; retention hooks use a **safe default** for mission assignment during events.
- Speaking minutes and ability-level missions are stubbed via **guided scenario** / **skill track** proxies until dedicated timers and mastery deltas exist.
- **Recommended next step:** connect practice mode selection, streak milestones, and unlocks in one cohesive loop (per product roadmap).
