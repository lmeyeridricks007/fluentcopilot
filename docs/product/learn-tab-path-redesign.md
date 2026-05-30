# Learn tab — path-first redesign

## Problems addressed

- Large three-column “tabs” felt like stacked web controls, not native mode switching.
- Path and curriculum read as nested card stacks; progression did not read as a journey.
- Browse and Review competed equally with Path; hierarchy did not support daily continuation.
- Hero + Quick actions dominated the screen before the actual sequence of lessons.

## Mode switcher

- **Control**: compact **segmented pill** — **`Path | Review`** — Explore is **not** a third tab (see [`learn-explore-repositioning.md`](./learn-explore-repositioning.md)).
- **Default**: Path (`/app/learn` vs `?tab=review`).
- **Behavior**: instant client switch with URL replace; legacy `?tab=browse` redirects to `/app/learn/explore`.

## Path mode (primary)

- **Summary strip**: current band + stage title, one-line capability (`you can now`), path %, light rhythm stats (streak + weekly minutes) without a full hero gradient.
- **Vertical path**: lesson **nodes** on a thin rail — states for next, in progress, completed, review-typed, locked, standard.
- **Stage framing**: compact header per band — label, title, tightened description, **unit progress** within stage; does not use heavy expandable stage cards.
- **Unit clusters**: small “Unit · …” label before each module’s lesson nodes.
- **Next lesson**: strongest node treatment (`Next up`, ring, gradient fill, `Continue →`), auto-scroll into view when it is the true next step.
- **Stage complete**: subtle marker between completed band and what follows.
- **Locked future stages**: dashed **Up next** previews — aspirational, low height, unlock hint in stage header pattern.
- **Supporting row** (ex–Quick actions): horizontal scroll pills under the path — Daily review, Fix mistakes, Checkpoint — analytics surface `learn_path_support`.

## Explore (tertiary, off switcher)

- **Route:** `/app/learn/explore` — curated rails + intent cards first; filters behind disclosure. Entry from Path via `PathExploreEntry`. Path remains default.

## Review mode (secondary)

- Framed as **reinforcement**, not a filter on the same list.
- **Start here**: tappable rows to structured daily SRS and mistake-fix flows in `/app/review/*`.
- **Due in Learn**: local queue with an explicit empty state.
- **Weak tags**: compact repair chips with counts.

## Node taxonomy (visual)

| Role | Treatment |
|------|-----------|
| Next | Primary ring, scale, “Next up”, gradient card, continue cue |
| In progress | Play circle on rail, standard card |
| Completed | Check on rail, filled completion node |
| Review lesson type | Recycle cue on rail when not yet completed |
| Locked | Muted rail, lock, dashed optional module placeholder |
| Placeholder module | Dashed rail + roadmap copy |
| **Checkpoint** (`lessonType: checkpoint`) | Larger **milestone** rail + card; “Milestone” label; Flag-style default node; map between clusters in authored order |

_stage-complete divider_: thin “Stage complete” marker still appears between finished bands.

## Sticky stage header + scroll spy

- Below the **Your path** title, a **`sticky top-2`** bar shows the **active** CEFR band (id + title + stage unit progress).
- **Scroll spy** (`usePathStageSpy`): each unlocked stage wraps its content in a ref-backed section; on scroll/resize, the band whose top has crossed **just below the sticky bar’s bottom edge** becomes active — so long paths always show **where you are** without re-opening accordions.
- **No duplicate stage card** under “Your path”: band id, status (`In progress` / `Done`), title, short description, and unit progress live **only** in the sticky bar (content is not repeated again before each unit block).

## Completion motion

- On **first-time** lesson completion, `recordLessonComplete` stores the lesson id in `sessionStorage` via `schedulePathNodeCelebration`.
- Returning to Learn, the matching path node runs **`animate-path-node-complete`** once (~0.7s): soft green ring + imperceptible scale — premium, not gamey.
- If progress updates **in-session** (same mount) from not-started → completed, the same animation runs without storage.

## Interactions

- Nodes use `min-h-touch`, `active:scale-[0.99]`, focus rings, clear disabled state when locked.
- Sequential band lock still blocks interaction and clears “next” emphasis when applicable.

## Mobile ergonomics

- Mode switch full width on small screens (`max-w-sm` on larger).
- Supporting actions scroll horizontally to avoid tall grids.
- Path rail left-aligns with consistent `scroll-mt` for scroll-into-view; milestone nodes use slightly wider rail column.

## Copy

- Stage descriptions and checkpoint strings shortened in `nlA2StageCopy` and view-model subtitles.

## Future opportunities

- Native shell haptics on checkpoint / completion.
- View Transitions API when toggling Learn subtabs.
- Deeper gamification only if it stays **adult / premium** — no mascots or noisy FX.

## Key implementation files

- `src/features/lessons/LessonDiscoveryPage.tsx` — Path | Review switcher, Learn title; Explore is a separate route.
- `src/features/lessons/LearnExplorePage.tsx`, `src/app/app/learn/explore/page.tsx`
- `src/features/learning-path/components/LearnModeSwitcher.tsx`, `PathExploreEntry.tsx`
- `src/features/learning-path/usePathStageSpy.ts` — scroll spy + sticky ref for activation line.
- `src/lib/learning-path/pathNodeCelebration.ts` — session handoff for completion animation.
- `src/lib/schemas/lesson.schema.ts` — `lessonType: checkpoint`.
- `tailwind.config.js` — `path-node-complete` keyframes.
- `src/features/learning-path/components/LearningPathJourney.tsx`
- `src/features/learning-path/components/PathLessonNode.tsx`, `PathSummaryStrip.tsx`, `PathSupportingRow.tsx`, `LockedStagePreview.tsx`, `PathModuleLabel.tsx`
- `src/features/learning-path/LearningPathScreen.tsx`
- `src/features/curriculum/CurriculumReviewPanel.tsx`
- `src/features/learning-path/buildLearningPathViewModel.ts`, `nlA2StageCopy.ts`

Legacy components `LearningPathHero`, `LearningActionCards`, `StageSection`, `ModuleCard` are unused by the Learn path screen after this pass but remain in the repo for reference or rollback.
