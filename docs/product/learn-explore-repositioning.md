# Learn — Browse demoted to Explore

## Why Browse was demoted

- **Equal tab treatment** (`Path | Browse | Review`) made Explore feel like a parallel “learning mode,” which weakened path discipline and increased decision fatigue.
- The old Browse screen was **filter-first** (search, category chips, level chips, flat list) — closer to a content admin view than a guided product.
- FluentCopilot is a **guided progression + habit** product; the Learn surface should reinforce **next best action** on the path, not random catalog picking.

## New hierarchy

1. **Path** — default; primary progress and curriculum visualization.
2. **Review** — strong secondary tab; reinforcement, SRS, mistake repair (retention).
3. **Explore** — **tertiary**; intentional extra practice, reachable from Path (and direct URL), not a peer segmented tab.

Formula: **Path > Review > Explore**.

## How Explore is accessed

- **From Path:** dashed secondary row **“Explore — Topics, skills, or something specific”** below **Keep momentum** (daily review / mistakes / checkpoint).
- **Direct URL:** `/app/learn/explore` (e.g. deep links, legacy `?tab=browse` redirects here).
- **From Explore:** back link to `/app/learn`; prominent row to **Review**; copy reminds users path + review are primary.

## Learn mode switcher

- **Path | Review** only (two segments, native pill switcher).

## Explore UX structure

Order is **curated first**, **filters last**:

1. Short intro + links to Path / Review.
2. **Pick a focus** — horizontal job cards (speaking, listening, grammar, daily life, exam-style, short sessions). Tapping sets an intent filter (and clears overly narrow category rules where needed).
3. **Recommended next** — from `MOCK_RECOMMENDED`, excluding completed.
4. **Good for your stage** — lessons matching `activeStudyLevel` from study context.
5. **Collections** — lightweight topic rails (e.g. conversations, food & shopping, plans, health) via simple title/topic heuristics on the demo catalog.
6. **Looking for something specific?** — search + **progressive disclosure** for type/level chips (“Filter by type & level”).
7. **All matching lessons** — list respects search, filters, and active job focus.
8. **Review upsell** row at bottom — reinforces that Review beats open-ended browsing for outcomes.

## Removed / demoted vs old Browse

- **Removed** Browse as a **third top-level tab**.
- **Removed** opening Learn into filter wall + list as the default “mode” when path UI is on.
- Filters are **secondary** (collapsed by default) and no longer define the whole screen.

## Why this helps retention

- Fewer competing “modes” → clearer **habit loop** (Path → lesson → Review).
- Explore is framed as **optional control**, not the main way to learn.
- Review stays **more visible and strategic** than Explore (tab vs buried tool).

## Future enhancements

- Replace heuristics with **weak-skill** and **path-position** signals from the progress layer.
- **Single** “suggested for today” strip fed by the same engine as Home.
- **Native sheet** for Explore on small viewports instead of full page (optional).
- Respect **entitlements** in Explore rails (premium vs free) with clearer lock treatment.

## Key files

- `src/features/lessons/LessonDiscoveryPage.tsx` — Path | Review only; `?tab=browse` → `/app/learn/explore`.
- `src/features/learning-path/components/LearnModeSwitcher.tsx` — two modes.
- `src/features/learning-path/components/PathExploreEntry.tsx` — Path entry to Explore.
- `src/features/learning-path/components/LearningPathJourney.tsx` — mounts Explore entry under habit row.
- `src/features/lessons/LearnExplorePage.tsx` — curated Explore experience.
- `src/app/app/learn/explore/page.tsx` — route shell.
