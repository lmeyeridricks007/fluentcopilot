# Ability / mastery layer (real-life map)

| Attribute | Value |
|-----------|--------|
| Status | **Implemented (client-first)** |
| Code | `src/lib/mastery/*`, `abilityMasteryState.schema.ts`, Progress + ability detail routes |

## Purpose

Bridge **“I finished A2”** and **“I’m ready for B1”** with a **practical capability map**: ordering food, doctor talk, gemeente, etc. — not abstract grammar completion.

**Weak areas** = what’s going wrong (weakness pipeline). **Abilities** = what you can do in real life (this layer).

## Architecture

| Piece | Role |
|--------|------|
| `abilityRegistry.ts` | Data-driven `ABILITY_DEFINITIONS` (id, copy, map group, scenarios, skill tracks, weakness category links). |
| `abilityMapper.ts` | Reverse lookup: scenario / skill track → abilities. |
| `abilityMasteryStorage.ts` | `localStorage` state `language-tutor-v4-ability-mastery-{userId}`. |
| `recordAbilitySignals.ts` | Incremental EMA updates from scenario feedback, skill tracks, review. |
| `abilityScorer.ts` | Display score 0–1: EMA + ledger completion counts + weakness drag + low skill-track bands. |
| `abilityTrendCalculator.ts` | `improving` / `stable` / `slipping` / `needs_refresh` (history + recency). |
| `abilityRecommendationBuilder.ts` | Next practice: guided / semi / free / review / track. |
| `masteryPresenterModel.ts` | `buildMasteryMapViewModel`, `buildAbilityDetailViewModel`. |

## User-facing bands

- **Still building** (`weak`) — score &lt; 0.42  
- **Improving** — 0.42–0.68  
- **Strong** — ≥ 0.68  

## Integrations (live)

- **Scenarios** — `applyPracticeFeedbackClientEffects` → `recordAbilityScenarioSignal` (outcome quality).  
- **Skill tracks** — `SkillTrackSessionPage` → `recordAbilitySkillTrackSignal`.  
- **Review** — `recordReviewSessionComplete` → `recordAbilityReviewSignal` (touched abilities only).  
- **Weakness** — top weakness category ids reduce display score slightly when they overlap an ability’s `weaknessCategoryIds`.  
- **Ledger** — `practice_scenario_complete` refs boost evidence for linked scenarios.  
- **UI** — Progress (`MasteryMapSection`), `/app/progress/abilities/[abilityId]`, Practice Hub compass card link.

## Placeholder / next

- **Lesson completion** — `completedLessonIds` is passed into the builder but not yet folded into scores (hook reserved).  
- **Server persistence** — replace `localStorage` with API + merge.  
- **Per-session outcome in ledger** — richer quality than counts-only bootstrap.

## Related

- [`practice-schema-overview.md`](./practice-schema-overview.md) — `abilityMasteryState` schema  
- [`weakness-driven-practice.md`](./weakness-driven-practice.md)  
