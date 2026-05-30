# Fluent Exam — automated test plan

## Scope

End-to-end reliability for profile registry, blueprint-driven generation, session lifecycle, scoring, timers, readiness, reports, XP/streak via progression, suggestion engine follow-ups, and client history helpers.

## Matrix (what each suite covers)

| Area | Suite file | Notes |
|------|--------------|------|
| 1. Profile loading | `examSystem.test.ts`, `examReadinessLevelsAndFlows.test.ts` | Registry keys, code+level resolution, blueprint presence |
| 2. Blueprint task generation | `examSystem.test.ts`, `examReadinessLevelsAndFlows.test.ts` | Full/section, sim vs train counts |
| 3. Level A1/A2/B1 | `examReadinessLevelsAndFlows.test.ts` | Task `level` field and prompt differentiation |
| 4. Simulation flow | `examReadinessLevelsAndFlows.test.ts`, `examSystem.test.ts` | create → append → finalize → sim report |
| 5. Training flow | `examReadinessLevelsAndFlows.test.ts` | Finalize → training report + support param |
| 6. Support modes | `examSupportAndTrainingPlan.test.ts`, `examSystem.test.ts` | Hints, retries, prep timing, strict answer |
| 7. Timer logic | `examSystem.test.ts`, `examSupportAndTrainingPlan.test.ts` | Model, policy, timer engine |
| 8. Scoring | `examSystem.test.ts` | Sim vs train strictness, aggregate |
| 9. Readiness | `examSystem.test.ts`, `examReadinessLevelsAndFlows.test.ts` | Empty history, post-simulation evidence |
| 10. Report generation | `examSystem.test.ts`, `examReadinessLevelsAndFlows.test.ts` | Sim + training report shape |
| 11. XP awarding | `examSystem.test.ts`, `examProgressionApply.test.ts` | xpEngine + applySessionComplete |
| 12. Streak counting | `examProgressionApply.test.ts` | Meaningful exam completion only |
| 13. Recommendations | `recommendations.test.ts`, `examSuggestionEngineIntegration.test.ts` | `recommendNextTraining` + `generateTodaySuggestion` exam branches |
| 14. History / reopen | `src/lib/exam-system/__tests__/examHistoryCopy.test.ts` | Filters, CTAs, activity payload (imports `features/exam-system/examHistoryCopy`) |

## Risk priorities

1. Progression `meaningfulCompletion` for exam types (streak + XP gate).
2. Training support matrix vs timer policy (almost-exam).
3. Suggestion engine weak-signal ordering (exam-specific repair paths).

## Running tests

```bash
npx vitest run src/lib/exam-system/__tests__
```

History/reopen helpers live under `src/features/exam-system/examHistoryCopy.ts`; their tests live in `src/lib/exam-system/__tests__/examHistoryCopy.test.ts` so they match the Vitest workspace include globs.
