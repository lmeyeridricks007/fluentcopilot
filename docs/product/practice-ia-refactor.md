# Practice information architecture refactor

## Problem (before)

The Practice hub (`/app/practice`) stacked **many mental models** in one long scroll: next-best hero, readiness/confidence minis, weak-area summary, ability snapshot, featured pick, modalities, continue/next blocks, coach pick, daily/weekly missions, scenario streak, full recommendations list, weak-area cards, browse categories, skill tracks, B1 confidence detail, and a prominent exam-prep entry. Users had to ask *“What am I supposed to do?”* — overload and duplicate “recommended” surfaces (hero vs continue vs featured vs coach).

## New model

Three **internal Practice modes** (not bottom-nav tabs), default **Do**:

| Mode | Intent | Role |
|------|--------|------|
| **Do** | “Practice now” | Single primary action path, one optional secondary rep, rhythm/habit, link into Explore |
| **Improve** | “Get better” | Coaching, weaknesses, ability snapshot, confidence/readiness, exam prep entry, stretch missions |
| **Explore** | “Choose what to practice” | Modalities, browse-by-situation, tracks, full recommendation list |

URL: `?mode=improve` | `?mode=explore` (default **Do** omits `mode`).

## What moved where

### Do (default)

- **Today**: Continue OR fallback “next” OR `NextBestActionHero` (mutually exclusive primary).
- **Smart follow-up**: `PracticeNextRepCompact` when continue/fallback exists and `nextBest` targets a **different** href (deduped via `practiceHubHrefUtils`).
- **Also try**: `RecommendationCard` (featured) only when there is **no** continue/fallback and `featuredScenario` exists (same logic as dashboard summary).
- **Rhythm**: `PracticeHabitStrip`, daily mission only, `ScenarioStreakCard`.
- **Browse all practice** → link to `?mode=explore`.

### Improve

- **Exam track**: `ExamPrepEntryCard` (hub) — exam-specific work stays **Exam Prep**; Practice only **links** here (re-homed from the old top-of-feed slot on the mixed screen).
- **Top focus**: `WeakAreasSummaryCard` + **Coach pick** card (`weaknessCoachHint`).
- **Turn slips into strength**: full `WeakAreaCard` list + empty state → Learn.
- **Ability snapshot**: `MasterySnapshotCard`.
- **Confidence & readiness**: `ReadinessB1MiniCard`, `ConfidenceTrendMiniCard`, `ConfidenceSummaryCard`.
- **Last exam prep recap** (if present).
- **Stretch missions**: weekly + skill-focus missions only (daily stays in **Do** for habit).

### Explore

- **Modalities**: scenarios, voice, listening (same destinations as before).
- **Browse by situation** + **Explore library** → `/app/practice/scenarios`.
- **Skill tracks** + **See all tracks** → `/app/practice/tracks`.
- **Recommended for you**: full `vm.recommendations` list with href dedupe.

### Unchanged placement (contextual)

- **Post-A2 compass** + short exam-prep line: stay in **page header** (all modes) — pathway choice, not daily practice feed.
- **Tier label**: header.
- **Scenario cap** notice: bottom of page, all modes.

### Other app areas (guidance, no deletion)

- **Exam simulations / formal mocks**: still **Exam Prep** (`/app/exam-prep`); Practice surfaces only **entry** and **recap** in Improve.
- **Structured path / lesson review queues**: still **Learn** / Review (linked from weak-area empty state).
- **Home “today” spotlight**: unchanged; Practice **Do** is the focused “practice now” surface inside Practice.

## Merges / deduplication

- **One primary CTA path** in Do: continue > fallback > next-best hero (not all three).
- **Secondary next rep** only when primary href ≠ `nextBest` href.
- **Featured scenario** only when there is no continue/fallback (avoids doubling with hero).
- **Coach pick** lives in **Improve** with weak summary; not repeated in Do (reduces “another recommendation” fatigue).
- **Daily vs weekly/skill missions**: daily in Do; longer “stretch” missions in Improve.
- **Explore recommendations**: single list (no duplicate prepend of “featured” — it is already `recommendations[0]` when distinct from next-best).

## CTA standardization (incremental)

- Shared tokens: `src/lib/dashboard/nextBestActionCtas.ts` (`NEXT_BEST_CTA`) — used by `buildNextBestAction` and Practice surfaces.
- Continue card: **Continue** / **Practice now** (next variant).
- Secondary next rep compact + coach pick: **Practice now** (from `NEXT_BEST_CTA`).
- Scenarios library action: **Explore library** (was “Full library”).
- Tracks: **See all tracks** (was “All tracks”).
- Skill track rows: visible **Open track**.

## Mode analytics & persistence

- **`practice_mode_changed`** (`ANALYTICS_EVENTS`) — fired when the user switches Do / Improve / Explore (`from_mode`, `to_mode`, `surface: practice_hub`). Category: `practice_hub` in `eventCategories.ts`.
- **Last mode memory**: `localStorage` key `fc_practice_hub_mode_v1` via `practiceHubModeStorage.ts`. If the URL has **no** `mode` query, the hub restores Improve/Explore on return; explicit `?mode=` (including shared links) overrides storage.

## Improve layout

- **Flat coaching flow** — no accordions; see **`docs/product/practice-improve-refactor.md`**.

## Key implementation files

- `src/features/practice-hub/PracticeHubPage.tsx` — header, sticky `PracticeModeSwitcher`, mode panels, URL + localStorage restore, analytics on switch.
- `src/features/practice-hub/practiceHubModeStorage.ts`
- `src/features/practice-hub/components/PracticeModeSwitcher.tsx`
- `src/features/practice-hub/components/PracticeNextRepCompact.tsx`
- Improve is **flat** (see `docs/product/practice-improve-refactor.md`; accordions removed).
- `src/features/practice-hub/practiceHubHrefUtils.ts`
- `src/lib/dashboard/nextBestAction.ts`, `nextBestActionCtas.ts`
- `src/features/practice-hub/panels/PracticeDoPanel.tsx`
- `src/features/practice-hub/panels/PracticeImprovePanel.tsx`
- `src/features/practice-hub/panels/PracticeExplorePanel.tsx`
- `src/app/app/practice/page.tsx` — `Suspense` for `useSearchParams`.
- `ContinuePracticeCard`, `SkillTrackCard` — CTA copy tweaks.

## Why this helps

- **Default landing** answers “what now?” in one glance (**Do**).
- **Improve** owns diagnostics and coaching without blocking quick starts.
- **Explore** owns breadth without mixing into the daily action path.
- **Fewer duplicate** “we recommend…” cards through href dedupe and split by mode.

## Future enhancements

- Optional **settings toggle** to disable mode memory (always land on Do).
