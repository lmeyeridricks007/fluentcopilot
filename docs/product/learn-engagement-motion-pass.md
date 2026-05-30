# Learn engagement & motion pass

Second-layer polish on **Learn** (Path → Review → Explore): keep the existing information architecture and hierarchy, and strengthen **progression feel**, **momentum copy**, **state differentiation**, and **lightweight motion**—adult, calm, premium (not cartoonish).

## What changed

### Path as a journey

- **Spine + glow**: Vertical rail uses a soft primary-tinted gradient plus a narrow “pulse” band to suggest forward motion without looking decorative.
- **Framing copy**: Under “Your path”, a short line explains sequence and that the next step stays highlighted.
- **Unit labels**: `PathModuleLabel` can show **Unit X of Y** within a stage and a subtle “Next stretch along the path” cue.

### Next lesson as hero

- **`PathLessonNode`**: Next items use a **badge-style “NEXT”** label, stronger border/ring/shadow, **`animate-path-next-invite`** (two soft shadow cycles), and a **CTA row** (“Continue this step” + chevron).
- Completed, in-progress, review, standard, and locked cards have **distinct** borders, backgrounds, and rail dots (review uses a **violet** accent; completed leans **success** tint; locked is muted/desaturated).

### Completion / reward loop

- Existing path-node **celebration** session handoff still drives **`animate-path-node-complete`** on transition to completed.
- **`ProgressSummary`** bar uses a longer **width transition** (no conflicting scale animation on the fill).

### Review as quick win

- **`CurriculumReviewPanel`**: Warmer positioning copy, **featured** primary “Start here” row, positive **empty states** (“Review queue is clear”, “Nothing to repair yet”), shorter session framing, tightened button labels (“Mark reviewed”).

### Explore as curated

- **`LearnExplorePage`**: **Featured “Best next”** card for the first recommendation, eyebrow labels for sections, **lighter collection** headers vs hero sections, intro and Review cross-link copy refined.

### Momentum surfaces

- **`PathSummaryStrip`**: Streak / weekly minutes / XP lines rewritten as **momentum** language (still factual).
- **`PathSupportingRow`**: Pill hints read as continuation cues, not empty admin text.
- **`LockedStagePreview`**: **“Ahead on your path”**, gradient card, unlock hint.
- **`nlA2StageCopy`**: Slightly more human stage descriptions (same titles).

### Motion tokens (`tailwind.config.js`)

- **`path-next-invite`**: Soft shadow pulse on the next node (finite iteration count).
- **`learn-segment-crossfade`**: Light fade on stage-complete marker.
- **`ProgressSummary`**: Duration-only bar animation (keyframes reserved for other surfaces if needed).

### Mode switcher

- **`LearnModeSwitcher`**: Selected tab gets subtle **scale** and **shadow** transition (respects `motion-safe` / `motion-reduce` where applicable via Tailwind conventions).

## Future opportunities

- **Scroll anchoring**: On Learn mount, optional `scrollIntoView` to next node when returning from a lesson (already partially supported via `scrollOnMount`).
- **XP / time earned**: Short inline count-up when closing a lesson (guarded, single-fire).
- **Stage complete**: One-shot ribbon or progress tick when the last unit in a stage completes (coordinate with path VM).
- **Haptics**: On supported WebViews, light impact on “next” tap and completion (native shell only).

## Key files

| Area | Files |
|------|--------|
| Path UI | `src/features/learning-path/components/LearningPathJourney.tsx`, `PathLessonNode.tsx`, `PathSummaryStrip.tsx`, `PathModuleLabel.tsx`, `LockedStagePreview.tsx`, `PathSupportingRow.tsx`, `PathExploreEntry.tsx`, `LearnModeSwitcher.tsx`, `ProgressSummary.tsx` |
| Review | `src/features/curriculum/CurriculumReviewPanel.tsx` |
| Explore | `src/features/lessons/LearnExplorePage.tsx` |
| Copy | `src/features/learning-path/nlA2StageCopy.ts` |
| Motion | `tailwind.config.js` |
