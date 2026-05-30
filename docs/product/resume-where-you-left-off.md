# Resume where you left off

Product-facing continuation on top of autosave and checkpoints. **Autosave** preserves work; **resume** surfaces it with clear copy, priority, and CTAs.

## Principles

- **User-scoped** — all signals read from the authenticated user’s profile, drafts (`DraftsDocumentV1`), and retention progress.
- **Meaningful flows only** — trivial state (e.g. schema lesson still on step 0) is not promoted.
- **Never resurrect completed work** — completed lessons (retention) and completed/submitted exam sessions do not appear as resumable; `canResume*` guards drop expired timers and invalid versions.
- **Explicit UX** — primary card: title + summary + last saved + Continue; optional **Restart fresh** where safe.
- **No trap** — onboarding is mandatory until complete via guards/bootstrap; lesson/simulation resume is optional (Continue vs Restart).
- **Stale / invalid** — bad keys, wrong content version, past deadlines, or checkpoint step ≥ lesson length → candidate omitted (no navigation into a broken flow).

## What is resumable

| Flow | Resumable when | Source |
|------|----------------|--------|
| **Onboarding** | `onboardingComplete === false` | Profile + `resolveOnboardingState` |
| **Schema lesson** | Checkpoint exists, age &lt; 48h, step &gt; 0, step &lt; total steps, lesson not in `completedLessonIds` | `activeLessonState` `schemaLesson:{id}` |
| **Writing / speaking simulation** | Parsed autosave v1, `canResume*` true (including deadline / scope / content version) | `writingDrafts` autosave keys |
| **Listening / reading practice exam** | Same + plan `taskIds` match current loader for `setId`, reading phase is `task` | `writingDrafts` autosave keys |

## Priority (multiple candidates)

1. **Onboarding** (highest)  
2. **Exam simulations / practice exams** (writing, speaking, listening, reading — among these, **most recently saved** wins)  
3. **Unfinished schema lesson** (latest checkpoint by `updatedAt`)

Implemented in `src/lib/resume/resumePriority.ts` and `resumeResolver.ts`.

## Surfaces

- **Bootstrap / guards** — incomplete onboarding → `/app/onboarding` with store hydration (`runAccountBootstrap`, `RequireAuth`). No main app until complete.
- **Home** (`/app/home`) — `ResumeContinueCard` after next-best hero: primary resume among lesson + exam flows (onboarding omitted once complete).
- **Exam prep landing** — same card filtered to **exam** flows only.
- **Learn** — same card filtered to **schema lesson** only.

## Continue vs restart

- **Onboarding** — Continue only (no Restart on card; reset lives elsewhere if ever added).
- **Lesson** — Continue → lesson route (checkpoint restored by `useLessonEngine`). **Restart fresh** clears `schemaLesson:{id}` then opens the same lesson from the start.
- **Exam simulations / practice exams** — Continue → deep link; session hooks restore autosave. **Restart fresh** calls `removeAutosaveDraft(..., 'restart')` then navigates to the same entry route for a clean run.

## Timers (beta policy)

- If autosave includes a **wall-clock deadline** and it has passed, **`canResume*` is false** — we do not offer resume; user starts a new session from the exam screen.
- If still valid, **remaining time continues** from persisted deadline fields (existing simulation/session logic).

## Implementation map

- `src/lib/resume/resumeTypes.ts` — shared types  
- `resumePriority.ts` — ordering  
- `onboardingResume.ts` — profile + onboarding resolution  
- `lessonResume.ts` — schema lesson checkpoints  
- `simulationResume.ts` — writing/speaking/listening/reading autosave scan  
- `resumeResolver.ts` — `collectResumableFlows` (alias `getResumableFlowsForUser`), `getResumableFlowForUser`, `resolveHighestPriorityResume` (per-surface), surface filters  
- `resumeRouting.ts` — `executeResumeRestart`  
- `src/features/resume/ResumeContinueCard.tsx` — UI + analytics  

## Analytics

- `resumable_flow_detected`, `resume_cta_shown`, `resume_cta_clicked`, `resume_restarted`  
- `onboarding_resume_forced` — guard redirect when onboarding incomplete (`RequireAuth`)  
- `lesson_resume_started`, `simulation_resume_started` — Continue from card (where applicable)  
- `stale_resume_discarded` — reserved for explicit prune paths (optional future hook)

## Related docs

- `account-session-bootstrap.md` — onboarding hydration and post-bootstrap route  
- `localstorage-schema.md` — drafts + profile shape  
- `autosave-strategy.md` — simulation autosave keys and envelopes  
- `progress-state-layer.md` — `completedLessonIds`  

## Next product step

**Build the account/settings surface** (profile, plan, data export, optional “clear drafts”).
