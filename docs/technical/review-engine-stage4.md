# Review engine — Stage 4 implementation

## Boundaries

| Layer | Path | Role |
|--------|------|------|
| Scheduler | `src/lib/review-engine/scheduler.ts` | SM-2–inspired intervals, ease factor, lapses |
| Due queue | `src/lib/review-engine/dueQueue.ts` | Due filtering, urgency sort, declustering |
| Adaptive mix | `src/lib/review-engine/reviewSelector.ts` | Daily / module / mistake quotas + seeded shuffle |
| Session cards | `src/lib/review-engine/reviewSessionBuilder.ts` | `ReviewItem` + `SrsItem` → `ReviewSessionCard` |
| Planner | `src/lib/review-engine/reviewSessionPlanner.ts` | Persistence snapshot → ordered cards |
| Persistence port | `src/lib/review-engine/reviewPersistence.ts` | Replace `localReviewPersistence` with API adapter |
| Mistakes | `src/lib/mistakes/mistakeTagger.ts`, `weakPointAnalyzer.ts` | Tagging, weak-area weights |
| Lesson bridge | `src/lib/review-engine/integration.ts` | Seeds bank + SRS after lesson |
| UI | `src/features/review/*`, `src/components/review/*` | Mobile-first session flow |

## Storage keys (local demo)

- `language-tutor-v4-review-bank-${userId}` — `ReviewItem[]`
- `language-tutor-v4-srs-${userId}` — `SrsItem[]`
- `language-tutor-v4-mistakes-${userId}` — `MistakeEvent[]`
- `language-tutor-v4-mastery-${userId}` — `UserMastery`

Legacy lemma queue (`a2ReviewStore`) remains for the existing Revision panel; structured review uses the v4 keys above.

## Extending review item types

1. Extend `reviewItemTypeSchema` if a new **content** type is required.
2. Map UI in `reviewSessionBuilder.ts` (`uiModeForType` + card branch).
3. Add a presenter under `src/components/review/` and branch in `ReviewCard.tsx`.

## SRS notes

- Learner grades 1–4 map to SM-2 quality 0,3,4,5 before interval math.
- Same-day failures use a fractional day interval (`10 / (24*60)`).
- Optional fields on `SrsItem`: `lastScore`, `lapses`, `state` (see `srsItem.schema.ts`).

## Demo data

- `content/samples/sample-review-deck.json` — canonical review items.
- `content/samples/sample-user-review-state.json` — SRS + mistakes + mastery for `local-demo-user`.
- `seedReviewDemoData()` merges bank and overwrites SRS/mistakes/mastery for demos.

## CLI

`npm run review:simulate` — prints planner output for daily / module / mistake_fix using sample files.
