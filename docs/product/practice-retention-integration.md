# Practice → retention & gamification integration

| Attribute | Value |
|-----------|--------|
| Status | **Implementation reference** — complements [`practice-system-architecture.md`](./practice-system-architecture.md), [`practice-schema-overview.md`](./practice-schema-overview.md), [`review-engine.md`](./review-engine.md) |
| Code | `src/lib/practice-progress/*`, `src/lib/practice-feedback/sessionSideEffects.ts`, `src/lib/retention/retentionService.ts`, `src/lib/practice/scenarioProgressStorage.ts` |

---

## 1. Files created / updated (high level)

| Area | Paths |
|------|--------|
| Integration layer | `src/lib/practice-progress/` (`types`, `practiceRewardCalculator`, `practiceUnlockService`, `practiceAbilityIntegration`, `practiceMilestoneService`, `practiceProgressService`, `practiceProgressUiStorage`, `practiceSkillTrackProgress`, `practiceToMissionMapper`, `practiceStreakIntegration`, `index`) |
| Scenario progress | `src/lib/practice/scenarioProgressStorage.ts`, `src/lib/practice/scenarioModeAccess.ts` |
| Catalog / launch | `src/features/scenario-catalog/*`, `src/features/practice-scenario-launch/*` (mode access copy) |
| Feedback pipeline | `src/lib/practice-feedback/types.ts`, `feedbackBuilder.ts`, `sessionSideEffects.ts` |
| Retention | `src/lib/retention/retentionService.ts`, `src/lib/retention/constants.ts` |
| Analytics | `src/lib/analytics.ts` |
| Completion UI | `PracticeFeedbackScreen`, guided/open practice pages, skill track session page |

---

## 2. Architecture summary

**Single entry for scenario completion (client):** `applyPracticeFeedbackClientEffects` runs legacy review/weak-tag hooks, then `processPracticeScenarioCompletion`, which orchestrates unlocks → `recordPracticeScenarioComplete` (retention: XP, streak milestone, missions) → ability signals → milestone detection → `writePracticeCompletionUi` for the feedback screen → analytics.

**Skill tracks:** `processSkillTrackSessionProgress` wraps skill-track retention recording, milestones, UI payload, and analytics.

**Missions:** Progress continues to flow through existing `applyMissionSignal` inside retention paths; `practiceToMissionMapper` documents the contract rather than duplicating mission rules.

**UI refresh:** `scenarioProgressStorage` dispatches `lt-practice-progress-updated`; the scenario catalog listens to rebuild unlock/mode state.

---

## 3. Streak integration

- **Meaningful session:** `practiceQualifiesForStreak` (in `practiceRewardCalculator`) requires successful outcomes, minimum user turns, and disallows “support-heavy” shortcut sessions where configured.
- **Application:** `recordPracticeScenarioComplete` / `recordSkillTrackSessionComplete` in `retentionService` align with review-style streak milestones when the session qualifies.
- **Messaging:** Completion UI reads `readPracticeCompletionUi()` for highlight chips (e.g. streak continued).

---

## 4. XP integration

- **Calculation:** `calculateScenarioXp` / `resolveScenarioXpAmount` factor mode, outcome tier, confidence, and support usage (soft penalty, not harsh).
- **Anti-farm:** Same-day repeat completions for the same scenario or skill track apply diminishing factors (floors) via `retentionService` + `retention/constants`.
- **Dedupe:** `applyPracticeFeedbackClientEffects` uses a short sessionStorage window so double-submit does not double-award; on skip, pages fall back to builder XP for display only.

---

## 5. Unlocks (modes & catalog)

- **Semi-guided:** Still gated by guided completion where guided content exists.
- **Free mode (premium/trial):** Allowed after guided completion **or** practice-earned free unlock (`freeModeUnlockedAt`) after a solid semi-guided success path (see `practiceUnlockService` + `scenarioProgressStorage`).
- **Catalog breadth:** After enough **distinct** successful scenarios, an additional scenario (e.g. work) can be marked practice-unlocked for free-tier access where product rules apply (`buildScenarioCardModels` checks practice-unlocked ids).

---

## 6. Mastery / abilities

- **Signals:** `recordAbilityScenarioSignal` runs after qualifying completion; `practiceAbilityIntegration` compares EMA bands before/after and surfaces `PracticeMasteryHighlight` + `practice_ability_upgraded` when the band moves up.

---

## 7. Missions & milestones

- **Missions:** Driven by existing retention mission hooks triggered from `recordPracticeScenarioComplete` / skill-track completion (no duplicate mission engine in practice-progress).
- **Milestones:** `practiceMilestoneService` detects first-mode / streak / breadth-style moments (client `localStorage` for “seen” IDs), emits `practice_milestone_reached`, and can pass highlights into completion UI storage.

---

## 8. Guardrails (meaningful effort)

| Guardrail | Mechanism |
|-----------|-----------|
| Min participation | Minimum user turns + outcome must be “successful” for streak/XP/unlock progression |
| Support-heavy | Flag from feedback side effects can disqualify streak-like treatment |
| Double submit | SessionStorage dedupe on feedback effects |
| Same-day farming | Reduced XP for repeated scenario / skill-track completions |
| Abandon | No completion pipeline → no retention writes |

---

## 9. Schema / service changes

- **`scenarioProgressStorage` (v2):** Tracks semi success counts, per-scenario free-mode unlock timestamp, global successful scenario id set, practice-unlocked scenario ids; migrates from v1 key.
- **`ModeAccessReason`:** Includes `needs_semi_success_first` for premium users who have not yet met free-mode prerequisites.
- **Analytics:** `practice_session_completed`, `practice_xp_awarded`, `practice_streak_applied`, `practice_unlock_earned`, `practice_ability_upgraded`, `practice_milestone_reached`, `practice_reward_shown`, `practice_reward_cta_clicked` (CTA wiring optional per surface).

---

## 10. Premium / free

- Free conversation remains a premium/trial **feature**; progression **within** premium/trial is gated on meaningful guided or semi-guided success.
- Practice-earned catalog unlocks (e.g. work) respect entitlement checks in card models so free users still get earned paths without feeling paywalled out of earned progress.

---

## 11. Recommended next step

**Implement post-A2 packaging for users not ready for B1** — segment onboarding, catalog surfacing, and mission defaults so late-A2 learners get coherent practice depth before B1 scenarios dominate recommendations.
