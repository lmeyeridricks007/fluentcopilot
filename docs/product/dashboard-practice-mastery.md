# Dashboard — Practice & Mastery surfaces

| Attribute | Value |
|-----------|--------|
| Status | **Implementation reference** |
| Code | `src/lib/dashboard/*`, `src/features/dashboard/*`, `src/features/home/*`, `src/features/practice-hub/*`, `src/features/progress/*` |

---

## Architecture

| Layer | Role |
|--------|------|
| `lib/dashboard/nextBestAction` | Priority: daily mission → continue/fallback practice → top recommendation → lesson fallback → Practice hub. |
| `lib/dashboard/confidenceTrendSummary` | One-line headline + body from ability trends (improving / slipping / weak / strong). |
| `lib/dashboard/masterySnapshot` | Top 3 ability rows for home/practice snapshots. |
| `features/home/buildHomeDashboardViewModel` | Composes home VM: missions, featured rec, weak top-3, readiness, confidence, mastery snapshot, scenario streak. |
| `features/home/useHomeDashboardViewModel` | Wires retention, practice hub VM, mastery map VM, post-A2 readiness signals. |
| `features/practice-hub/usePracticeDashboardSummary` | Lighter bundle for Practice command center (no lesson fallback). |
| `features/progress/useProgressDashboardModel` | Readiness + confidence + scenario streak + retention for Progress header. |
| `features/dashboard/components/*` | Reusable cards: next-action hero, B1 readiness mini, confidence mini, weak summary, mastery snapshot, habit strip. |

---

## Screen coverage

| Element | Home | Practice | Progress |
|---------|------|----------|----------|
| Daily mission | Yes (+ weekly + skill focus) | Yes (existing section) | Via habit strip / missions elsewhere |
| Recommended scenario | Featured card (deduped vs next action) | Featured pick in command center | — |
| Weak areas | Top 3 summary | Top 3 summary + full list below | Curriculum weak card + mastery map |
| Confidence trend | Mini card | Mini card | Mini card in header |
| Ability mastery | Snapshot + full map link | Snapshot + full map below | Full **MasteryMapSection** |
| Ready for B1 | Mini card + post-A2 link when eligible | Same | Header + post-A2 banner when eligible |
| Practice streak | Habit strip (retention + scenario + XP) | Same | Same in header |

---

## Integrations

- **Live:** missions (`buildPracticeHubViewModel` / `DailyMissionCard`), recommendations, weak areas / weakness insights, mastery map presenter, `evaluateReadinessForB1` + `buildAbilityBandCounts`, scenario streak VM, retention streak/XP.
- **Placeholder / demo:** `MOCK_PROGRESS.weeklyMinutes`, lesson queue still partly mock-driven.

---

## Recommended next step

**Add analytics and evaluation for the full Practice & Mastery system** — funnel events from dashboard CTAs (`dashboard_next_action_clicked`, mission/recommendation surfaces) into product analytics to validate hierarchy and tune copy.
