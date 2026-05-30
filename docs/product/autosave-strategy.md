# Autosave strategy (draft preservation)

Long-form and interruption-prone flows persist **in-progress** work under the user-scoped drafts document (`lt.v1.drafts.<userId>` — see [`localstorage-schema.md`](./localstorage-schema.md)). This **complements** incremental milestone saves ([`incremental-save-strategy.md`](./incremental-save-strategy.md)): milestones stay immediate; typing and session position are **debounced** or **interval**-flushed.

## Principles

1. **Draft vs canonical** — Autosave never replaces submitted scores or completed attempts. On successful submit / session complete, the relevant draft key is **removed** (discarded with reason `submit` / `complete`).
2. **User-scoped** — All keys live under `getUserDrafts(userId)` / `writingDrafts[logicalKey]`. Use `getRetentionUserId()` in client code so keys align with the active session (including mock auth).
3. **Debounced text** — Long text uses ~1000ms debounce and a minimum non-whitespace length (~12 chars) before writing, plus **blur flush** where wired.
4. **Session snapshots** — Simulations and multi-step exams use ~1400ms interval + **visibility hidden** flush. Payloads are versioned (`v: 1`) and include deadlines where timed exams apply.
5. **Restore safety** — Resume only when parse succeeds, `contentVersion` matches `PRACTICE_EXAM_CONTENT_VERSION` for practice exams, task id lists match the freshly loaded plan, and (for timed flows) the wall-clock deadline has not passed.
6. **Discard** — Explicit “discard resume”, category change, `startWithPlan` / `startWithFixedPlan` restart, and completion clear drafts. Sign-out does **not** erase another user’s drafts on disk; in-memory UI state resets via navigation/auth as usual.
7. **Corruption** — Invalid envelopes are ignored; UI falls back to empty/new session. Prefer canonical progress over stale drafts when in doubt.

## What uses autosave

| Domain | Logical keys (prefix) | Restore UX |
|--------|------------------------|------------|
| Writing training | `autosave/v1/writing-training/<taskId>` | Restore on open task; hint “Concept lokaal opgeslagen…” |
| Writing simulation (free + writing PE) | `autosave/v1/writing-simulation/free`, `.../pe/<setId>` | Intro / PE gate: “Doorgaan waar u was” |
| Speaking simulation (free + speaking PE) | `autosave/v1/speaking-simulation/free`, `.../pe/<setId>` | Interval + tab hidden flush; **intro resume UI** can mirror writing (payload + parser ready) |
| Listening practice exam | `autosave/v1/listening-practice-exam/<setId>` | Card: hervatten / verwijderen |
| Reading practice exam | `autosave/v1/reading-practice-exam/<setId>` | Card: hervatten / verwijderen (`useReadingTrainingSession` + screen) |
| Text answer (freer premium) | `autosave/v1/text/freer-practice/<stepKey>` | Restore tab + typed/spoken buffers |

## Envelope shape

Each `writingDrafts[key]` entry is `{ updatedAt, payload }` where `payload` is:

```ts
{ v: 1, domain, entityId, savedAt, body }
```

`body` holds domain-specific JSON (e.g. `WritingSimulationAutosaveBodyV1`).

## Analytics

`autosave_triggered`, `autosave_completed`, `autosave_restored`, `autosave_discarded`, `autosave_failed` (see `ANALYTICS_EVENTS`).

## Code map

| Path | Role |
|------|------|
| `src/lib/autosave/autosavePolicy.ts` | Debounce / interval / text threshold |
| `src/lib/autosave/autosaveKeys.ts` | Logical key builders |
| `src/lib/autosave/autosaveStorage.ts` | Read/write/remove envelopes |
| `src/lib/autosave/examAutosave.ts` | Typed bodies + parsers + resume guards |
| `src/lib/autosave/activeSessionRestore.ts` | `trackAutosaveRestored` |
| `useWritingSimulationSession`, `useSpeakingSimulationSession` | Simulation snapshots |
| `useListeningTrainingSession` + `ListeningPracticeExamScreen` | Listening PE |
| `WritingInputPanel`, `FreerPracticePremiumPanel` | Long text |

## Relation to incremental save

- **Incremental** — Onboarding steps, review submits, lesson completion, speaking question scored → immediate domain writes + progress refresh.
- **Autosave** — Draft text and session position until submit/complete.

## Next step

**Resume where you left off (speaking)** — Speaking snapshots are written on an interval and on tab hidden; add intro/PE resume cards plus `SpeakingSimulationInputPanel` seeding (mirror writing simulation) using `parseSpeakingSimulationAutosave` / `canResumeSpeakingSimulation`.
