# Practice → Improve: flat coaching pass

## Why change

Improve used **accordion `<details>` blocks** (`ImproveAccordionSection`). That interaction model felt **heavy and admin-like**: hidden defaults, extra taps, nested chrome, and weak at-a-glance coaching. The Do / Improve / Explore split stays; only **Improve’s presentation** changed.

## What we did

- **Removed all collapsible panels** from Improve. Content is **visible in one vertical scan** (phone-first).
- **Linear coaching hierarchy** (top → bottom):
  1. **Top focus** — one lead block: headline, short “why,” **Practice now** + **Review mistakes** + optional **More detail** → `/app/practice/improve/weak/[id]` (full `WeakAreaCard` drill); optional “Also try” when coach `href` ≠ primary weak `href`.
  2. **Turn slips into strength** — up to **two** additional weak rows (flat dividers, no `WeakAreaCard` shells); each row links **Practice now** and **More detail** to the same drill route when learners want depth.
  3. **Practical abilities** — `MasterySnapshotCard` **`variant="preview"`** (max 3 rows, lighter container) + **See ability map** → `/app/progress#mastery-map`.
  4. **Confidence & readiness** — single **merged** block: B1 readiness gist, confidence trend line, max **2** strengths / **2** gaps, link row (**See progress**, **How readiness works**, **See ability map**). No embedded `ConfidenceSummaryCard` wall.
  5. **Exam track** — **compact** exam entry + short kicker (demoted below core coaching).
  6. **Last exam prep recap** — unchanged optional block.
  7. **Stretch missions** — **demoted**: small eyebrow, compact mission cards (`DailyMissionCard compact`), **See Practice hub** link.

## Content preservation

| Before | After |
|--------|--------|
| Weak summary list + coach card | Top focus merges **#1 weak** + optional coach line |
| All `WeakAreaCard`s | **#2–#3** only as **slip rows**; full depth still on Practice/lesson targets via links |
| Full mastery list | **Preview** (3) + ability map link |
| Two minis + fat confidence card | **One** combined confidence/readiness section |
| Hub `ExamPrepEntryCard` | **`compact`** variant |
| Weekly/skill missions | Same data, **`compact`** + lower placement |

## CTAs (`improve/improveCtas.ts`)

Shared Improve verbs: **Practice now**, **Review mistakes**, **More detail**, **See progress**, **See ability map**, **Open Learn**, **How readiness works**, **See Practice hub**. Weak-area primary CTAs in the VM align with **`NEXT_BEST_CTA`** where it makes sense (`buildPracticeHubViewModel.ts`). Preview snapshot rows use **Practice now**; full `MasterySnapshotCard` (elsewhere) still uses per-row `ctaLabel`.

## Analytics

- **`weak_area_shown`** is emitted **once per `weak_area_id` per browser tab session** via `trackWeakAreaShownOnce` (`weakAreaShownAnalytics.ts`), shared by Top focus, slip rows, `WeakAreaCard`, and the Improve drill page — surfaces differ via `surface` on the payload (first eligible mount wins the event).
- **`weak_area_drill_viewed`** fires when the Improve weak drill route mounts (`ImproveWeakDrillPage`), in addition to the deduped `weak_area_shown` when that id has not been seen yet this session.

## Key files

- `src/features/practice-hub/panels/PracticeImprovePanel.tsx` — layout only
- `src/features/practice-hub/improve/*` — `ImproveTopFocus`, `ImproveSlipsSection`, `ImproveWeakDrillPage`, `improveWeakDrillRoutes`, `ImproveConfidenceReadiness`, `ImproveSectionIntro`, `improveCtas`
- `src/app/app/practice/improve/weak/[weakAreaId]/page.tsx` — optional full weak-area drill
- `src/features/practice-hub/weakAreaShownAnalytics.ts` — session dedupe for `weak_area_shown`
- `src/features/dashboard/components/MasterySnapshotCard.tsx` — `variant` / `maxRows`
- `src/features/practice-hub/components/DailyMissionCard.tsx` — `compact`
- **Removed:** `ImproveAccordionSection.tsx`

## Future

- Tune copy with real learner testing; keep tone adult/calm.
