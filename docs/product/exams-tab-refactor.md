# Exams tab refactor (landing)

## Problems in the previous landing

- Long header and Dutch explainer before any action.
- No single dominant “start now” surface (compared to Home’s primary hero).
- Duplicate entry to skills: **Jump into a skill** grid plus **Examengebieden** list.
- **Exam readiness** used the full report card on the landing: nested “per onderdeel” rows, heavy chrome, and duplicated navigation patterns.
- **Practice vs Exams** sat as a full bordered block with similar weight to primary content.
- Skill cards mixed a whole-card link with static **Training / Simulation** tags — mode was informational, not actionable; tap model vs buttons was ambiguous.

## New information architecture (landing)

1. **Plan banner** (Basic) — unchanged role.
2. **Header** — NL title + value paragraph (`ExamPrepHero`).
3. **Start hero** (`ExamPrepStartHero`) — NL copy; recommended next step + primary CTA (Premium-gated like hub cards).
4. **Readiness summary** (`ExamReadinessSummary`) — NL; headline, one supporting line, **Bekijk details** + compact CTA (`pickExamPrepRecommendedHref`).
5. **Jouw examenonderdelen** — single list of `GatedExamTypeCard` (hub + direct training/simulation NL CTAs).
6. **Hoe dit verschilt** — flat divider-style strip in Dutch (`ExamPrepCompareStrip`).
7. **Resume** — continuation card at the bottom (does not compete with the start hero).

## Removed / merged

- **Removed** `ExamsQuickSkillsGrid` (“Jump into a skill”).
- **Merged** skill discovery into one section: **`GatedExamTypeCard`** list.
- **Moved** detailed readiness UI off the landing to **`/app/exam-prep/readiness`** (`ExamPrepReadinessDetailPage` + full `ExamReadinessCard`).

## Readiness model

- **Modules** include `lastAttemptAt` (ISO) from `examReadinessCalculator` for “laatst gewerkt” on cards.
- **Landing:** `ExamReadinessSummary` only — light NL summary.
- **Detail:** Full `ExamReadinessCard` (overall + per-module list). Module titles use `titleNl` from `examPrepCatalog`.
- **Hub / reports:** `ExamReadinessCard` with `focusModule` where appropriate.

## Start hero behavior

- Uses `pickExamPrepRecommendedHref(modules)` from `src/lib/exam-prep/examPrepRecommendedStep.ts`.
- Copy derives from target URL via `examPrepTypeIdFromTargetHref` + `inferExamActionMode` + `minutesForRecommendedHref` (`src/lib/exam-prep/examPrepSkillLaunch.ts`), with **Dutch** titles from `titleNl` on each catalog row.
- **Basic:** CTA opens `FeatureLockModal` for `exam_prep_modules`.

## Skill card behavior

- **Upper block:** hub link; **Open vaardigheidshub**; optional **Oefenexamens** pill when `canAccess('exam_practice_exams')` (Premium).
- **Laatst gewerkt:** NL relative line from `formatExamLastWorkedNl` when `lastAttemptAt` exists and `attemptCount > 0`.
- **Footer:** **Start training** / **Onderwerpen** (KNM), **Start simulatie** or **Simulatie volgt**; gated for Basic.
- **Catalog:** each row has `titleNl` (Spreken, Schrijven, …) for exam surfaces.

## `EXAM_SKILL_LAUNCH`

Single file for per-skill URLs + minute hints. **When listening, reading, or KNM simulations ship,** set `simulationHref` and `simulationMinutes` on that skill only — landing cards and CTAs update without other refactors.

## Hub (`ExamTypeHubPage`)

- **Removed** the duplicate “Practice vs examenvoorbereiding” card; the landing compare strip carries that story once.
- Hub **h1** uses `titleNl`.

## Future improvements

- Richer mock-exam affordance (e.g. deep link from badge) without nested links in the hub row.
- Optional English toggle or bilingual keys if marketing surfaces must stay EN.
