# Component system (mobile-first learning UI)

| Attribute | Value |
|-----------|--------|
| Status | **Implementation contract** |
| UI stack | React 18, Next.js 15 App Router, Tailwind (`tailwind.config.js`) |
| Shared UI | `src/components/ui/*` |

---

## 1. Purpose

Define a **coherent, reusable** component architecture so **lesson**, **review**, and **task** experiences stay **visually consistent**, **accessible**, and **cheap to extend** as new **step types** land — without **one-off** screens per lesson.

---

## 2. Mobile-first UI principles

- **Single-column** primary layout; **bottom sheet** for secondary actions.
- **Sticky lesson chrome**: progress + safe area; avoid double scroll (content vs page).
- **Touch-first**: large hit targets, swipe where it aids review.
- **Performance**: lazy-load heavy panels (four-skills, audio).

---

## 3. Design principles for interaction components

- **Presentational by default** — data and callbacks from parent or thin container.
- **Deterministic feedback** — same action → same visual pattern (correct/wrong/partial).
- **No business rules in leaf components** — validation lives in hooks or engine.

---

## 4. Recommended component categories

### 4.1 Lesson components

| Component (existing) | Responsibility |
|---------------------|----------------|
| `GuidedLessonPage` | Shell: routing, step index, completion, side effects |
| `LessonStepContent` | Markdown rendering, tables, inline bold |
| `ListenableLessonStepContent` | Listen UI + formatted body |
| `GrammarLanguageFocusLayout` | Grammar mini-module layout |
| `GuidedPracticePager` | Multi-card practice |
| `GuidedPracticeFourSkillsBridge` | Practice ↔ four-skills sequencing |
| `FourSkillsSectionInteractive` | Per-skill interactive blocks |
| `InteractiveSelfCheck` | MC / short answer self-check |
| `WarmUpExampleReveal` | Progressive reveal |
| `FreerPracticePremiumPanel` | Premium-gated freer practice |
| `LessonStepIllustration` | Images |

### 4.2 Review components

| Component (target / partial) | Responsibility |
|------------------------------|----------------|
| `CurriculumReviewPanel` | List due items, weak filters |
| `ReviewCard` (future) | One item, flip or grade buttons |
| `ReviewSessionTimer` (optional) | Soft session length |

### 4.3 Speaking / audio components

| Component | Responsibility |
|-----------|----------------|
| `PlainDutchStepListen` | Simple listen + text |
| `NlBulletListenLessonContent` | Bulleted listen |
| Future `AudioPlayer` | Single playback policy, speed, transcript toggle |

### 4.4 Task / simulation components

| Pattern | Responsibility |
|---------|----------------|
| **`PracticeHubPage`** (`features/practice-hub`) | Main Practice tab: missions, recommendations, **Exam prep entry card**, categories, skill tracks, confidence — entry before chat |
| **`ExamPrepLandingPage`** (`features/exam-prep`) | `/app/exam-prep` — structured A2 exam track, distinct from scenario Practice |
| **`ScenarioCatalogPage`** (`features/scenario-catalog`) | `/app/practice/scenarios` — filterable library (category, level, skill, mode, premium, weak-area) |
| Scenario routes under `app/practice/simulation` | Text role-play (deeper flow from hub / catalog) |
| Future `TaskComposer` | Short writing with constraints |

### 4.5 Progress / motivation components

| Component | Responsibility |
|-----------|----------------|
| `ProgressBar` | Step progress |
| Path / band UI (`CurriculumPathPanel`, etc.) | Journey framing |
| Achievement surfaces (`app/achievements`) | Long-term motivation |

---

## 5. Recommended component list (new / to extract)

| Name | Responsibility |
|------|----------------|
| `LessonShell` | Header, progress, safe area, keyboard avoidance |
| `StepViewport` | Max-height scroll region + one primary CTA slot |
| `PrimaryActionBar` | Fixed bottom actions |
| `FeedbackBanner` | Correct/incorrect neutral copy |
| `Chip` | Skill focus, band, tags |
| `AudioAttachment` | Play/pause, scrub (if enabled), transcript |
| `TapGrid` | 2×2 / 3×2 choice grids for listening |
| `SentenceSlotBoard` | Tap-to-fill word order (mobile) |

**Rule**: Add **generic** building blocks before **lesson-specific** names.

---

## 6. Presentational vs stateful

| Stateful / container | Presentational |
|---------------------|----------------|
| `GuidedLessonPage`, review session page | `Button`, `Card`, `LessonStepContent` |
| Hooks: `useLessonPlayer`, `useReviewSession` | `GrammarLanguageFocusLayout` (mostly) |

---

## 7. Animation principles

- **Step transitions**: 150–250ms opacity/slide; **respect** `prefers-reduced-motion`.
- **Celebration**: subtle (checkmark scale), not blocking timers.
- **No** continuous decorative motion behind text.

---

## 8. Feedback patterns

- **Self-check**: inline per item + summary strip (`InteractiveSelfCheck` pattern).
- **Listen**: wrong choice → **replay** prompt, not long explanation.
- **Speaking (future)**: waveform optional; **never** required for pass/fail UI clarity.

---

## 9. Audio UX patterns

- Visible **duration** or progress when file length known.
- **Replay** always available for **task-critical** audio.
- **Auto-play** only after explicit user gesture (mobile policy).

---

## 10. Writing / speaking prompt UX

- **Single focused prompt** per screen.
- **Character limit** hint for A2 writing (e.g. “max ~40 words”).
- **Mic permission** explainer modal first time.
- **Fallback**: if speech denied, offer **text** input where pedagogically valid.

---

## 11. Reusability rules

- **Three uses** → extract to `src/components/learning/*` or `src/features/lessons/primitives/*`.
- **Copy variants** via props, not duplicated components.
- **Markdown** remains **one** pipeline (`LessonStepContent`) unless a step type **must** be non-markdown for a11y.

---

## 12. Accessibility rules

- **Roles**: `button` for clickable cards; **headings** per step title.
- **Focus**: move focus to **feedback region** on submit (politely).
- **Transcripts**: paired with audio.
- **Colour alone**: never sole signal — add icon/text.

---

## 13. Theming / design tokens

Use **Tailwind semantic tokens** from `tailwind.config.js`:

- **Colours**: `primary`, `surface`, `ink`, `success`, `warning`, `error`
- **Type scale**: `text-display` … `text-caption`
- **Radius**: `rounded-card`, `rounded-sheet`
- **Shadow**: `shadow-card`, `shadow-elevated`

**Avoid** raw hex in new components unless extending theme.

---

## 14. Example component tree — one lesson step (self-check)

```
LessonShell
  └── StepViewport
        ├── StepHeader (title + skill Chip)
        ├── InteractiveSelfCheck
        │     └── LessonStepContent (per item prompt)
        └── PrimaryActionBar
              └── Button (Next)
```

---

## 15. Suggested file / folder structure (evolution)

**Today** (flattened features):

```
src/features/lessons/*.tsx
src/components/ui/*.tsx
```

**Target** (incremental):

```
src/features/lessons/
  engine/          # useLessonPlayer, step registry
  steps/           # one file per step type presenter
  primitives/      # TapGrid, AudioAttachment, ...
src/features/review/
  components/
  hooks/
src/components/learning/   # cross-feature dumb UI
```

**Migration**: move **new** code into `steps/`; **avoid** mass rename in one PR.

---

## 16. Risks of over-specialised components

| Risk | Mitigation |
|------|------------|
| `ListenFoodLessonA2M02Step3` explosion | Step **type** + props |
| Prop drilling | Context only for **session-scoped** data (audio, locale) |
| Markdown vs structured split | Typed steps for **interactions** only |

---

## 17. Related code entry points

- `src/features/lessons/GuidedLessonPage.tsx`
- `src/components/ui/Button.tsx`, `Card.tsx`, `ProgressBar.tsx`
- `tailwind.config.js`
