# Lesson engine (product & system contract)

| Attribute | Value |
|-----------|--------|
| Status | **Implementation contract** — lesson runtime behaviour and data boundaries |
| Current runtime | `src/app/app/learn/[lessonId]/page.tsx` → `GuidedLessonPage` |
| Content source | `data/curriculum/nl-NL/A2/catalog.bundle.json` + `src/demo-data/curriculum/a2Catalog.ts` |
| Stage 5 pipeline | Zod JSON under `content/modules/*`, validation via `tools/validate-content.ts`, schema player bundle via `schemaLessonBundle.ts` — see `docs/content/` |

---

## 1. Purpose of the lesson engine

Deliver **guided, interaction-dense** Dutch lessons on **mobile-first** surfaces where **each viewport step** has **one primary learner action**, while **content** remains **data-driven** (bundle / future API) so **120–160 lessons** do not require **hardcoded screens**.

---

## 2. Design principles

1. **Guided interaction, not documents** — minimise static reading; prefer tap / listen / speak / choose / build / short write.
2. **Input before explanation** — short exposure (audio, dialogue fragment, gap) **before** rule callouts; rules stay **micro** and **in context**.
3. **Every lesson produces usable output** — learner leaves with **phrases or moves** they can use in a real situation (see `a2-curriculum.md` §11).
4. **Grammar in flow** — no separate “grammar chapter” UI as the default path; grammar steps are **steps** in the same player.
5. **Separation of concerns** — **lesson JSON** describes *what*; **engine** decides *how* to render, navigate, persist, and instrument.

---

## 3. Mobile-first interaction philosophy

- **One primary action** per step (or explicit sub-step within a step component).
- **Thumb reach**: primary CTA bottom-aligned; avoid critical actions under notches without safe-area padding (`spacing.safe-bottom` in `tailwind.config.js`).
- **Touch targets**: minimum **44×44** logical px (Tailwind `min-h-touch` / `min-w-touch`).
- **Session chunking**: default lesson **~12–18 min** catalog `durationMinutes`; steps should **feel** shorter than that cognitively (many **30–90s** loops).

---

## 4. Why page-based / disjointed flow is insufficient (current repo)

**What exists today (strengths)**:

- Single route **one lesson** with **linear step index** and **progress bar** (`GuidedLessonPage`).
- Rich **special-case renderers**: listen (`ListenableLessonStepContent`), grammar (`GrammarLanguageFocusLayout`), guided practice pager (`GuidedPracticePager`), four-skills bridge (`GuidedPracticeFourSkillsBridge`), self-check (`InteractiveSelfCheck`), premium freer panel (`FreerPracticePremiumPanel`).

**Gaps vs product vision**:

| Gap | Risk | Direction |
|-----|------|-----------|
| Step body is **markdown string** + ad-hoc `interaction?: unknown` | Inconsistent density; hard to validate; AI output drifts | Typed **`step.type` + discriminated payload** (see §9) |
| **Heuristic routing** (title patterns, markdown parsing for four-skills) | Fragile when copy changes | Explicit **step kind** or **section markers** in data |
| **Flashcards / quiz** on **separate routes** | Can feel “app-like pages” not **one flow** | Keep routes for deep links but **optional inline** equivalents later |
| **No server progress** | Resume/sync limited | `PATCH /v1/lessons/{id}/progress` (see deep-dive) |

This doc **does not** require rewriting everything at once; it defines the **target contract** and **safe migration** (typed steps alongside legacy markdown).

---

## 5. Target lesson flow (pedagogical spine)

Map **product phases** to **step kinds** in content. Not every lesson needs every phase; **order is flexible** but **defaults** below.

| Phase | Learner job | Typical step kinds |
|-------|-------------|-------------------|
| **Preview** | Orient; activate schema | `context_card`, `goal_can_do` |
| **Hook (listening)** | Hear natural Dutch | `listen_mark`, `listen_select`, `dialogue_snippet` |
| **Discovery** | Notice pattern / meaning | `gap_reveal`, `sort_or_match`, `image_select` |
| **Inline grammar** | Micro-rule + examples | `grammar_focus` (existing layout) |
| **Controlled practice** | Repeat with support | `drill_tap`, `reorder`, `guided_practice_pager` |
| **Speaking** | Produce under low stress | `speak_prompt`, `shadow`, `role_card` |
| **Build complexity** | Combine chunks | `sentence_builder`, `transformation_light` |
| **Mini task** | Short real-world output | `task_micro` (e.g. one SMS line) |
| **Full task** | Autonomy with rubric | `task_full` + optional AI check |
| **Recap** | Consolidate | `recap_lemmas`, `self_check_quiz` |
| **Completion** | Reward + next | `completion_summary`, enqueue review |

**Current bundle**: ~**8 steps** per lesson with **mixed** skill_focus — authors should **tag** which steps fulfil which phase in metadata when the schema grows (`step.phase?: Preview | Hook | …`).

---

## 6. Rules for interaction density

- **≥1 interaction** (not passive scroll) every **1–2 minutes** of lesson time on average.
- **Self-check** and **guided practice** count as interaction; pure markdown **>120 words** without interaction requires **author justification** or split.
- **Listening steps**: always expose **replay** + **speed** where technically available (`listening_level` in catalog).

---

## 7. Rules for text density

- **Instruction locale** (e.g. EN) for meta-instructions; **Dutch** for target stimuli.
- **Max ~3 short paragraphs** per viewport before a **break** (interaction or audio).
- **Tables** in markdown: allowed for **grammar paradigms** only when followed by **immediate** micro-task (already pattern in `LessonStepContent`).

---

## 8. Supported lesson step types

### 8.1 Implemented today (implicit / partial)

| Mechanism | Where |
|-----------|--------|
| Markdown body | `LessonStepContent`, `ListenableLessonStepContent` |
| Listen + bullets | `NlBulletListenLessonContent`, `PlainDutchStepListen` |
| Self-check quiz | `interaction.kind === 'self_check_quiz'` |
| Warm-up reveal | `WarmUpExampleReveal` |
| Guided practice pages | `GuidedPracticePager` + title heuristics |
| Four skills | Parsed markdown block → `FourSkillsSectionInteractive` |
| Grammar focus | `GrammarLanguageFocusLayout` |
| Freer practice (premium) | `FreerPracticePremiumPanel` |

### 8.2 Target typed step union (contract for future schema)

```ts
// Conceptual — final Zod/TS in src/types/lesson-step.ts (future)
type LessonStep =
  | { type: 'markdown'; body: string; skill_focus: SkillFocus }
  | { type: 'listen'; assets: AudioRef[]; interaction: ListenInteraction }
  | { type: 'self_check'; items: SelfCheckItem[] }
  | { type: 'grammar_focus'; module_ref: string; body: string }
  | { type: 'guided_practice'; items: PracticeItem[] }
  | { type: 'four_skills'; block: FourSkillsSpec }
  | { type: 'speak'; prompt: string; rubric?: string }
  | { type: 'task'; kind: 'micro' | 'full'; spec: TaskSpec }
  | { type: 'completion'; summary: string }
```

**Migration**: Dual-read — if `step.type` absent, fall back to current **markdown + optional interaction** parsing.

---

## 9. Responsibilities of the lesson engine

| Responsibility | Owner |
|----------------|--------|
| Resolve lesson by `lessonId` | Router + catalog lookup |
| **Step machine** (index, back rules, completion) | `GuidedLessonPage` (or extracted hook) |
| Map step → **presenter component** | Step registry (future) vs current conditionals |
| **Media** load, cache, prefetch | Audio subcomponents + future service worker |
| **Hints & feedback** | Per interaction + shared `FeedbackToast` patterns |
| **Progress** | `last_step_index`, completion flags → local then server |
| **Side effects** | `enqueueReviewFromLesson`, `recordWeakSelfCheckTags` |
| **Analytics** | Event emitters (see §15) |

---

## 10. Required data-driven architecture

- **Single lesson record** per id: metadata + pedagogy + `lesson_plan.steps[]` + assessment (as today).
- **No** lesson-specific React pages under `app/learn/[lessonId]/custom-*`.
- **Assets** referenced by **stable URLs** or **content refs** (`content_refs` field reserved in types).
- **Versioning**: `schema_version` on manifest; breaking changes bump version and migration script.

---

## 11. Separation: lesson content vs rendering logic

| Layer | Holds |
|-------|--------|
| **Content** | Copy, audio refs, correct answers, tags, order |
| **Engine** | Navigation, validation, timers, accessibility, layout shell |
| **Components** | Visual + interaction affordances (dumb where possible) |

**Anti-pattern**: Putting **correct answer strings** only inside React components.

---

## 12. Audio, speaking, hints, feedback, progress

- **Audio**: centralise in a small **AudioController** (future) for **single playback** policy, **background pause** on step change.
- **Speaking**: use **device capture** with **permission UX** on first use (FD-01 consent); store **blob or transcript** only when product policy allows.
- **Hints**: progressive disclosure — **1 tap** → chunk highlight; **2 taps** → translation; avoid wall of hints.
- **Feedback**: immediate for **closed** items; delayed **aggregate** for **open** speaking/writing (AI or human).
- **Progress**: persist **step index** on **every completed step** (debounced); completion fires **review enqueue** + analytics.

---

## 13. AI feedback hooks

| Hook point | Input | Output |
|------------|-------|--------|
| After **open writing** | learner text + constraints | structured feedback JSON (scores + 2–3 fixes) |
| After **speaking** | audio or transcript | same |
| **Task full** | rubric + scenario | pass/fail + next phrase suggestion |

**Contract**: API returns **machine-readable** + **short** learner copy; engine **never** trusts raw HTML. Align with `src/app/api/freer-practice/evaluate/route.ts` patterns.

**Guardrails**: rate limits, PII scrubbing, **instruction-locale** explanation default.

---

## 14. Personalisation / adaptive opportunities

- **Weak tags** from self-check → prioritise **review** and **optional recap step** variants (future).
- **Skip known lemmas** (future): requires per-learner lemma state.
- **Listening speed default** from history.

---

## 15. Analytics / instrumentation (recommendations)

| Event | When |
|-------|------|
| `lesson_started` | first view of lesson id |
| `lesson_step_viewed` | step index + step id hash |
| `lesson_step_completed` | interaction outcome summary |
| `self_check_result` | item id, correct, tags |
| `lesson_completed` | duration, band, grammar_primary |

**Properties**: `lesson_id`, `unit_id`, `a2_band`, `grammar_primary`, `archetype`, `step_index`.

---

## 16. Accessibility

- **Focus order** matches visual order; trap focus **only** inside modals.
- **Live regions** for self-check feedback.
- **Transcripts** for all scripted audio (collapsible).
- **Contrast**: use `ink` / `surface` tokens; test grammar tables.
- **Reduced motion**: respect `prefers-reduced-motion` for step transitions.

---

## 17. Error states / offline / loading

| State | Behaviour |
|-------|-----------|
| Unknown `lessonId` | Dedicated not-found or “lesson unavailable” |
| Bundle load failure | Retry + support link |
| Audio fail | Show text transcript + retry button |
| Offline | Allow **cached** completed steps read-only; queue progress sync |
| AI evaluate timeout | Save draft locally; “try again” without losing text |

---

## 18. Example end-to-end lesson flow (narrative)

**Lesson**: “Order at the bakery” (`grammar_primary`: `a2.1-imperatives-service`).

1. **Preview** — One card: “After this you can ask for two common items politely.”
2. **Hook** — 12s audio: counter dialogue; tap **what did they buy?** (2 icons).
3. **Discovery** — Drag **word chunks** into sentence skeleton (mobile: tap-to-slot).
4. **Grammar** — `GrammarLanguageFocusLayout`: 2 imperatives + **u/je** note + **one** production line.
5. **Practice** — `GuidedPracticePager`: 3 short lines, hear + repeat (optional mic off).
6. **Speaking** — Role card: “You — customer”; one prompt; optional AI later.
7. **Mini task** — Type **one** sentence: “You want a whole wheat loaf.”
8. **Self-check** — 3 MC items tagged `word-order`, `register`.
9. **Four skills** — Short listen + read + write + speak micro-prompts.
10. **Completion** — Streak + “Review 4 words” CTA → review engine.

---

## 19. Component / state boundaries (example)

```
GuidedLessonShell (layout, progress, router)
  └── useLessonPlayer(lessonId) → { record, stepIndex, actions, status }
        └── StepRenderer(step)
              ├── MarkdownStep
              ├── ListenStep
              ├── GrammarFocusStep
              ├── GuidedPracticeStep
              ├── SelfCheckStep  → calls recordWeakSelfCheckTags on wrong
              └── CompletionStep → enqueueReviewFromLesson
```

---

## 20. Step progression logic (rules)

- **Forward**: primary CTA advances when **step completion criteria** met (or optional **skip** only for non-assessed preview — product policy).
- **Back**: allowed unless **speaking recording** in progress; reset partial state for **repeatable** steps.
- **Branching (future)**: only via **explicit** `step.on_result` in data — no hidden `if lessonId` in UI.

---

## 21. What must not be hardcoded

- Per-lesson **copy**, **answers**, **audio URLs**, **order of steps**.
- **Grammar rule text** (except shared **UI chrome** labels).
- **Band/unit membership** (comes from manifest).
- **Review lemmas** (derived from pedagogy + steps, not duplicated in React).

---

## 22. Related docs & code

- `docs/features/deep-dives/final/sub-features/core-lessons/guided-catalog-lesson-runtime.md`
- `docs/curriculum/populating-level-curriculum.md`
- `src/features/lessons/GuidedLessonPage.tsx`

---

## 23. Stage 5 schema player — step types (A2 modules)

Used by `src/features/lesson-player/LessonStepRenderer.tsx` + `content/modules/*/module.json`.

| Type | Behaviour |
|------|-----------|
| `listening` | `DialoguePlayer` + **one or many** embedded `multiple_choice` exercises. **Multiple MCQs** = play dialogue once (or replay), then answer questions **in sequence** on the same step. |
| `listen_read` | Same renderer as listening; transcript is **always visible** (ignores `hideTranscriptUntilPlayed`). |
| `scenario_chat` | Same as `listen_read` / listening — use for dialogue + comprehension / choice chains. |
| `practice_loop` | Runs **`exercises[]` in order** (`multiple_choice`, `reorder`, `fill_blank` only) before advancing; optional `content.lemmas` for review extraction. |
| `writing` | Short typed line: `content.prompt`, `content.acceptable[]`, optional `modelNl`, `minChars`. |
| `preview` | Optional `interactionConfig.requireAllPreviewPlayed: true` — learner must tap **🔊 on every** preview card before **Verder**. |

**Authoring**: `tools/m01-deepen-module.ts` is the reference for deepening a module without hand-editing thousands of lines; re-run `extract-review-items.ts` after structural changes.
