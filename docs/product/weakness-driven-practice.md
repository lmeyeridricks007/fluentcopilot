# Weakness-driven practice

| Attribute | Value |
|-----------|--------|
| Status | **Implemented (client-first)** — extends Practice Hub, Home, post-conversation signals |
| Code | `src/lib/weakness/*`, `buildPracticeHubViewModel`, `weaknessInsight.schema.ts` |

## Architecture

1. **Signals** — `weaknessAnalyzer` turns mistakes (`MistakeEvent` via `readMistakeEventsSync`), lesson weak tags (`a2ReviewStore`), last scenario feedback tags (`lastPracticeSignalsStorage`), low skill-track band scores, and optional `UserMastery.skillLevels` into weighted `RawWeaknessSignal` rows (with simple time decay on mistakes).
2. **Categories** — `WEAKNESS_CATEGORY_DEFINITIONS` map regex / error types / classifier categories to learner-facing headlines, coach copy, scenario ids, skill tracks, and review entry points.
3. **Aggregation** — each signal is assigned to the **single highest-priority** matching category; scores sum per category (`weaknessAggregator`).
4. **Ranking** — top categories by score (floor **0.45**), max **3** (`weaknessRanker`).
5. **Recommendations** — `buildWeaknessInsights` builds `WeaknessInsight` payloads (Zod schema); Practice Hub maps them to `WeakAreaVm` (multi-action cards) and boosts `RecommendationVm` rows.

## Integrations

| System | Status |
|--------|--------|
| Mistake events (local) | **Live** — `readMistakeEventsSync` |
| Lesson weak tags | **Live** |
| Post-conversation personalization | **Live** — `personalizationTags` on feedback + `recordLastPracticeWeakSignals` |
| Skill tracks | **Live** — low `bestScoreByLevel` nudges matching categories |
| Review | **Live** — actions link to `/app/review/mistakes` or `/app/review/daily` |
| Scenarios | **Live** — `getPracticeScenarioHref` |
| Mastery `skillLevels` | **Live** when `UserMastery` exists in local store |
| Server-backed mistakes / cohort models | **Placeholder** — swap persistence port + add API |

## Assumptions

- **No shame metrics**: support-heavy sessions add *repair/listening* signals, not punitive scores.
- **Explainability**: `basedOn` lists coarse sources (mistakes, self-checks, last scenario, etc.), not per-event IDs.
- **Fallback**: if no category clears the floor, Hub weak areas fall back to legacy `WEAK_TAG_ROUTING` cards.

## Related

- [`practice-schema-overview.md`](./practice-schema-overview.md) — `weaknessInsight` schema
- [`review-engine.md`](./review-engine.md) — mistake pipeline
