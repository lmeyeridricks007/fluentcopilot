# Behavior-driven app architecture — FluentCopilot

## Philosophy

FluentCopilot is a **real-life Dutch communication coach**, not a generic lesson library with chat bolted on. The product is organized around **behavior loops** (continue conversation → get feedback → fix → recap → repeat), **user state** (how much support to apply), and **next-best-action** routing across tabs.

## Information architecture (bottom navigation)

| Tab | Route | Role |
|-----|--------|------|
| **Talk** | `/app/talk` | Primary daily surface: messaging/voice/scenarios. Deep routes stay `/app/practice/*` (scenarios, voice, tracks, listening). |
| **Coach** | `/app/coach` | Memory & recap: next action, mistakes, wins, daily/weekly rhythm, embedded **Review** + **Progress**. |
| **Exam** | `/app/exam-prep` | Outcome engine: readiness, simulations, practice exams, monetization urgency. |
| **Library** | `/app/library` | **Personal Dutch bank**: segmented **Saved** (words/phrases), **Captured** (moments/photos/text), **Places**, **Lessons** (embedded path). Quick capture (+) in header. |

**Profile / account** remains **top-right** → `/app/settings`.

## What moved / re-homed

| Legacy mental model | New home |
|---------------------|----------|
| Learn (tab) | **Library** tab; `/app/learn` root redirects to `/app/library`. Schema and lesson URLs remain `/app/learn/...`. |
| Practice (tab root) | **Talk**; `/app/practice` root redirects to `/app/talk`. |
| Review (tab) | **Coach** → Review section; `/app/review` root redirects to `/app/coach?tab=review`. Deep routes `/app/review/*` unchanged. |
| Progress (tab) | **Coach** → Progress section + existing `/app/progress` page for bookmarks and `#mastery-map`. |
| Home dashboard | `/app/home` redirects to `/app/talk` (Talk is the default “open app” surface). |
| Post-sign-in entry | `/app` → `/app/talk` (see `authRedirects.ts`). |

## User state model

Implemented in `src/lib/product/userLearningState.ts`:

- **starting** — low XP / no streak; more guided flow.
- **practicing** — default steady state.
- **stuck** — multiple weak areas; emphasize short fixes.
- **improving** — strong streak, fewer weak tags; stretch scenarios.
- **preparing** — exam focus; emphasize Exam surfaces and structured drills.

`resolveUserLearningState` consumes streak, XP, weak-area counts, and an optional exam-focus flag (extend when profile stores it).

## Next action system

- **Types**: `src/lib/product/nextActionTypes.ts` — kind, source, priority, href, copy.
- **Composer**: `src/lib/product/buildNextActionRecommendations.ts` — layers Talk, Exam, Library nudges on top of `buildNextBestAction`.
- **Dismiss / complete**: `src/store/nextActionStore.ts` — persisted ids for “done with this suggestion.”
- **Legacy single hero**: `src/lib/dashboard/nextBestAction.ts` still powers the primary CTA; hub fallbacks point to **`/app/talk`**.

## Guidance & friction

- **Store**: `src/lib/product/guidanceMode.ts` — `useGuidancePreferences` (Zustand + persist): guided vs free conversation, feedback each turn vs end vs silent, optional exam-style conversation.
- Intended for Talk / speaking UIs to read preferences without a separate “settings screen” trip.

## Micro-wins

Copy catalog in `src/lib/product/microWins.ts` — meaningful outcomes (e.g. stayed in Dutch, self-corrected word order) for Coach recap and session end states.

## Quick capture (global)

- **Header** (+) next to avatar opens `QuickCaptureSheet` (`src/components/capture/`).
- Persists into `usePersonalLibraryStore` (`src/store/personalLibraryStore.ts`) with seed data in `src/mocks/personalLibrarySeed.ts`.
- Routes to Library with the right segment (`?tab=saved|captured|places`).

## Scene imagery

- Category browse cards resolve a **representative scenario image** per taxonomy category (`CATEGORY_REPRESENTATIVE_SCENARIO_ID` in `scenarioImageRegistry.ts`).
- Production WebP assets live under `public/images/scenarios/` (see `docs/product/scenario-image-prompts.md`).

## Reading aloud (premium surface)

- Route: `/app/practice/reading-aloud` — UI shell and pipeline notes; STT/alignment can plug in later.
- Surfaced from **Talk → Now** quick modes, **Talk → Scenes**, and **Library**.

## Key behavior loops

1. **Daily**: Open app → Talk → continue or start scenario → optional voice → Coach recap / next action.
2. **Fix loop**: Coach highlights mistake → weak-area drill → back to Talk with same scenario id.
3. **Exam loop**: Exam tab shows readiness → drill links to practice scenarios → Coach explains impact.
4. **Library activation**: Saved word / lesson → “Use in Talk” / reading aloud / exam context.

## Exam integration outside the Exam tab

- Coach: “Exam impact” link to `/app/exam-prep`.
- Talk: post-A2 banner and scenario copy remain cross-linked to exam prep.
- `resolveNextBestActionHref` default fallback: `/app/talk`.

## Legacy content

Structured lessons, schema paths, and scenario JSON are unchanged; only **tab entry points** and **labels** moved. Admin and content pipelines stay the same.

## Future work

- Wire `useGuidancePreferences` into guided/open practice composers and feedback tier selection.
- Persist exam-focus on profile for `resolveUserLearningState`.
- Connect `nextActionStore` dismissals to UI chips on Talk / Coach.
- Replace reading-aloud placeholder with OCR + alignment + scoring pipeline.
- Optional: merge duplicate **Progress** surface (Coach embed vs `/app/progress`) behind one canonical URL once hash/deep-link strategy is finalized.
