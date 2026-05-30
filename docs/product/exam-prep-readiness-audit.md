# Exam prep readiness audit — Dutch A2 / inburgering orientation

| Attribute | Value |
|-----------|--------|
| Date | 2026-03-26 |
| Scope | Repository inspection (`src/`, `docs/product/`) — **audit & planning only**; no exam modules built |
| Product target | Dutch **A2** exam prep (inburgering / civic integration / residence-oriented learners), eventual coverage: **speaking, writing, listening, reading, KNM** |
| Out of scope for this doc | Implementation of training mode, simulation mode, rubric engine, timed exams, or content packs |

---

## 1. Executive summary

The codebase is **strong on general A2 practice architecture**: a real **Practice hub**, **guided / semi-guided / free** scenario flows, **post-session feedback** with **retention + Stage-4 review ingestion**, **weakness-driven recommendations**, **skill tracks**, and **rich Zod schemas** for session results and scoring shapes. That stack is a **credible foundation** for *training-style* exam prep and for feeding **review / weakness** loops.

It is **not yet ready** for *high-stakes exam simulation* without substantial new design: **speaking and writing exam tasks are largely mock or self-assessed**, **listening/reading exam formats are not modeled** (standalone listening UI is mock MCQ), **there is no exam attempt / section / timing / rubric domain**, and **AI-assisted practice today is effectively deterministic mock replies** (`runPracticeConversationTurn` → `mockDeterministicAssistantReply`), not production LLM grading.

An **`/app/exam`** surface exists (`ExamPrepPage`) but is a **placeholder**: static section list, fake progress, premium lock, and **incorrect navigation** (unlocked rows route to `/app/practice/listening/{sectionId}`). There is **no KNM content model**, **no A2-specific exam framing** on that page (copy says “B1”), and **no backend** for exam state.

**Bottom line:** Reuse **hub shell, review engine, mistake + weakness pipelines, feedback UI patterns, and schemas as templates**; **adapt** orchestration and scoring for exam modes; **build separately** exam session models, rubric scoring, timed simulation UX, and modality-specific task engines (especially speaking capture + writing evaluation).

---

## 2. Current system capabilities relevant to exam prep

| Capability | Where it lives | Relevance to exam prep |
|------------|----------------|-------------------------|
| Practice hub & modality entry | `PracticeHubPage`, `/app/practice/*` | Entry patterns for “choose modality”; can host an **Exam prep** area alongside scenarios / voice / listening |
| Guided scenarios | `GuidedScenarioPage`, `guidedSessionState`, `guidedScenarioRegistry` | Strong **structured turn / option** pattern; useful for **guided exam training** (hints, scaffolding) — not for **silent simulation** without UX fork |
| Open / semi / free chat | `OpenPracticeScenarioPage`, `generateOpenPracticeReply` | **Conversational** practice; orchestrator + support tools — poor fit as-is for **timed, minimal-feedback** simulation |
| Post-session feedback | `buildPostConversationFeedback`, `PracticeFeedbackScreen`, `applyPracticeFeedbackClientEffects` | Strong **coach-style** summary; **reuse components** but **different copy + data** for exam mode |
| Scoring shape (holistic) | `scoringResult.schema.ts`, built in `feedbackBuilder.ts` | Schema supports `subScores`, weakness tags; **current values are heuristic** (turn counts, outcome), not rubric- or item-based |
| Review / SRS Stage 4 | `src/lib/review-engine/*`, `ingestLessonReviewMaterialClient` | **Proven path** to enqueue cards from practice (`practice-{scenarioId}` lesson id) |
| Mistake events | `mistakeEvent.schema.ts`, `recordMistakeEvent` | Used for lessons + review; **taxonomy is lesson-shaped** (`lessonId`/`stepId`/`itemId` required) |
| Weakness aggregation | `src/lib/weakness/*`, Practice Hub VM | **Can consume** exam mistakes **if** events/tags are normalized into same signal shapes |
| Skill tracks | `skillTrack.schema.ts`, `SkillTrackExerciseView` | **Reading MCQ**, **typed short answers**, **speaking prompt + TTS + mic probe** — good **drill** prototypes, not oral exam prototypes |
| Voice / listening “practice” | `VoiceTutorPage`, `ListeningPage` | **Mock UI** — permission / playback / MCQ shells only |
| Exam prep route | `ExamPrepPage` | **Marketing shell** only; **not wired** to real flows |
| AI conversation engine (parallel) | `src/ai-conversation-engine/orchestrator/conversationLoop.ts` | **Provider-capable** path with grammar analysis hooks — **not wired** to main Next practice UI (per earlier product docs; still separate from `practice-orchestration`) |

---

## 3. Audit by area

### 3.1 Practice mode

**What exists**

- **Practice Hub** at `/app/practice` (`PracticeHubPage`): scenarios, skill tracks, quick links to voice/listening/simulation, missions, weakness cards, mastery snapshot.
- **Scenario library** → **guided** (`/app/practice/guided/[scenarioId]`), **semi / free** (`/app/practice/semi|free/[scenarioId]`).
- **Support tools** (open practice): hints, phrases, naturalized Dutch, difficulty — `ConversationSupportBar`, `runOpenSupportTool`.
- **Post-practice feedback**: `buildPostConversationFeedback` → `PracticeFeedbackScreen`; side effects: legacy lemma queue + `ingestLessonReviewMaterialClient`, weak tags, XP/streak/missions (`processPracticeScenarioCompletion`).
- **Skill tracks** (`/app/practice/tracks/...`): MCQ, typed check, reading MCQ, speaking prompt, repair MCQ.
- **Weakness-driven practice**: `buildWeaknessInsights` → hub cards; links to scenarios and review.
- **Ability / mastery**: `recordAbilityScenarioSignal`, ability registry tied to skill tracks (`abilityRegistry.ts`).

**Reuse vs scenario-specific**

- **Reusable for exam prep:** hub layout, navigation patterns, entitlement patterns, analytics hooks, **review + retention bridges**, weakness card **presentation**, skill-track **exercise renderer** patterns.
- **Too scenario/chat-specific:** turn-based “conversation outcome,” coach English lines, support-heavy scoring, **mission/scenario streak** semantics.
- **Shared building blocks:** `Card`, `ProgressBar`, feedback presenter split (model vs UI), `reviewItem` + `ingest*` pipeline, Zod schemas under `lib/schemas/practice/`.

### 3.2 Speaking

**What exists**

- **Voice tutor page:** mic permission, fake record toggle, empty transcript, mock TTS (`VoiceTutorPage.tsx`).
- **Lessons:** `FourSkillsSectionInteractive` — **Web Speech API** (`nl-NL`), editable transcript.
- **Skill track `speaking_prompt`:** `speechSynthesis` for model Dutch, **MediaRecorder** ~2.2s “mic check,” then **self-check** copy — **no ASR**, no duration target, no rubric.
- **Onboarding:** mic permission step.
- **Orchestration:** `ProcessTurnInput` in AI engine allows `source: 'stt'` — **hook exists in engine**, not in main practice UI path observed.

**Gaps for speaking exam prep**

- No **stable ASR pipeline** (browser STT vs provider) tied to **graded tasks**.
- No **audio artifact storage**, **time limits**, **prompt rubric**, or **double-rater / benchmark** workflow.
- No **pronunciation scoring** (skill track is explicitly not scoring).

### 3.3 Writing

**What exists**

- **Skill track `typed_check`:** string match against `acceptableAnswers` — suitable for **short cloze / sentence** drills only.
- **Lessons:** `LessonStepRenderer` `writing` case — content-driven (needs verification per lesson JSON).
- **No** dedicated **free-text essay evaluator**, **CEFR-aligned rubric UI**, or **model-answer comparison** surfaced in app code reviewed.

**Gaps for writing exam prep**

- No **rubric dimensions** (task completion, coherence, grammar, vocabulary) as **first-class runtime**.
- No **AI or human-in-loop** evaluation path **wired** for writing (practice AI is mock conversational reply).

### 3.4 Review engine

**What exists**

- Stage 4: **SM-2–inspired** scheduler, bank + SRS, adaptive mixes (`reviewSessionPlanner`, `reviewSelector`).
- **Mistake-fix mode** weights items via `weakPointAnalyzer`.
- **Ingestion** from lessons and from **practice** (pseudo-`lessonId` `practice-{scenarioId}`).

**How exam prep could feed review**

- **Map exam items** → `ReviewItem` rows (vocab/phrase/grammar/listening types exist; `speaking` type exists in schema but **UI/support** unclear for graded speaking cards).
- **Reuse** `ingestLessonReviewMaterial` / bank upsert + `createInitialSrsItem` patterns with **`sourceLessonId`** or a generalized **`sourceId`** (today lesson-shaped).

**Extensions needed**

- **Tagging** review items with `examSection`, `skill`, `rubricDimension` for filtering.
- Optional **separate queues** (“Exam mistakes”) vs **daily SRS** to avoid mixing pedagogy.

### 3.5 Mistake tracking

**What exists**

- `MistakeEvent`: `errorType` enum (grammar, vocab, order, pronunciation, listening, spelling, hesitation), **required** `lessonId`, `stepId`, `itemId`.
- Classifier + `metadata.mistakeTags` (`mistakeTagger.ts`).
- Lesson mistakes → `recordMistakeEvent`; review mistakes → `useReviewSession`.

**Fit for exam errors**

- **Feasible** by convention: e.g. `lessonId: 'exam-a2-listening'`, `stepId: attemptId, `itemId`: itemId — **works but is a hack** without schema migration.
- **Mapping exam rubric → mistake categories** needs a **crosswalk doc** (e.g. “inadequate task completion” → `order`/`grammar`/`vocab` + custom tags).

### 3.6 AI integration

**What exists**

- **Client practice orchestrator:** prompts built in `scenarioPromptBuilder`, **replies from** `mockDeterministicAssistantReply` (not live LLM in the path used by `OpenPracticeScenarioPage`).
- **Separate** `ai-conversation-engine`: provider registry (`mock`, OpenAI adapter stubs), `processTurn` with grammar analysis, moderation — **parallel architecture**.

**Reuse for exam prep**

- **Provider abstraction** pattern from `ai-conversation-engine` is the right **reference** for **batch scoring** (writing/speaking) **if** you add a **non-conversational** API surface.
- **Do not** reuse **conversational tutor prompts** as-is for **official-style feedback** (tone, length, and determinism requirements differ).

### 3.7 Schemas

**Strong / reusable**

- `practiceSessionResult.schema.ts` — turn results, `scoringResult`, `practiceFeedback`, optional `draftReviewItems`, `mistakeSignals`, XP/streak hooks — good **target shape** for “persist one exam attempt” **if** generalized.
- `scoringResult.schema.ts` — `subScores`, `weaknessSignals`, `skillSignals` — **extend keys** for exam dimensions.
- `reviewItem.schema.ts` — types include `listening`, `speaking` (content pipeline TBD).

**Gaps / risks**

- `practiceActivityKindSchema` has **no** `exam_training` / `exam_simulation` — would need extension **or** parallel `examAttempt` schema.
- `mistakeEventSchema` is **lesson-centric** — risk of **semantic drift** if every exam row fakes lesson IDs.
- **`practiceSessionResult` may not be persisted** as a single document in client flow reviewed — feedback is built in memory and **side effects** are partial (lemmas/Grammar → review); full result object is a **contract** more than **runtime store** today.

---

## 4. Reuse vs adapt vs rebuild matrix

| Area | Classification | Why |
|------|----------------|-----|
| Scenario engine (guided / open) | **Adapt / extend** | Great for **training**; **fork UX** for simulation (no coach, no support). |
| AI orchestration (current practice path) | **Adapt / extend** + **parallel API** | Mock today; need **explicit** exam scoring path, not chat turns. |
| `ai-conversation-engine` | **Adapt / extend** | Provider + safety + analysis **patterns** reusable; **not** the product path wired to UI today. |
| Microphone / speaking capture | **Missing** (core) | Only **mic check** / mock voice page; **no** ASR → task → storage. |
| Writing feedback (holistic) | **Missing** | Typed checks only; **no** rubric-scored free text. |
| Review integration | **Reuse directly** | Ingest + SRS proven; add **tagging/filters** for exam. |
| Mistake tracking | **Adapt / extend** | Model works; add **`source: exam`** or relax lesson-centric fields. |
| Weak area system | **Reuse directly** | Will ingest **tags** if exam pipeline emits compatible signals. |
| Progress / mastery | **Adapt / extend** | Ability layer is **practice-oriented**; exam needs **section proficiency** model. |
| Feedback screens | **Adapt / extend** | Reuse layout; **separate copy** and **data** for exam vs coach. |
| Analytics events | **Adapt / extend** | `exam_section_viewed` exists; need **attempt/item** granularity. |
| Schemas (practice result / scoring) | **Adapt / extend** | Strong base; add **exam-specific** attempt + rubric artifacts. |
| Session / result models | **Adapt / extend** | `practiceSessionResult` is close conceptually; **persist** and **generalize**. |
| Listening / reading exam UI | **Missing** | Current `ListeningPage` is **mock**; reading not consolidated for exam. |
| KNM | **Missing entirely** | No content type, no schema, no UI. |
| `/app/exam` | **Rebuild** (behavior) | Replace placeholder wiring and **align** to A2 product. |

---

## 5. Missing capabilities (exam-prep readiness)

1. **Exam product model:** sections (speaking, writing, listening, reading, KNM), **training vs simulation**, **attempt** history, **pass/fail or readiness** semantics (even if soft at first).
2. **Item types** per section matching **DUO-style task families** (content design + JSON schema — not implemented).
3. **Timed sessions** and **navigation rules** (back, skip, review flag).
4. **Rubric engine:** deterministic keys + optional AI assist with **audit trail** (versioned rubric, item id, prompt hash).
5. **Speaking:** ASR choice, audio blob lifecycle, min/max duration, retake policy.
6. **Writing:** rich text constraints, word count, **structured evaluator output** mapped to UI.
7. **Listening/reading:** real audio/assets, **question driver**, connection to **mistake** + **review** extraction.
8. **KNM:** MCQ / true-false (likely) + explanation feedback + **legal/sourcing** workflow for civic content.
9. **Persistence:** server-side attempts (today client-first stores dominate practice/review).

---

## 6. Architecture risks (if rushed)

1. **Merging exam simulation into scenario chat** — learners get **hints and coach English** when they need **exam silence**; also **contaminates** analytics.
2. **Using heuristic `buildPostConversationFeedback` scores as “exam scores”** — **false precision**; undermines trust and **inburgering** positioning.
3. **Duplicating** listening/speaking/writing flows **per section** instead of a **shared task runner** + **content schema**.
4. **Schema drift:** forcing exam into `lessonId` / `practice-*` ids without a **canonical `sourceType`**.
5. **No auditability** for AI-assisted scoring (no stored rubric version, no human override).
6. **Premium gating** on `ExamPrepPage` **before** core value exists — product/ethical risk for **visa-motivated** users.

---

## 7. Recommended shared components / services

- **Review bank + SRS** (`review-engine`, `ingestLessonReviewMaterial*` pattern).
- **Mistake + weak-tag pipeline** (`mistakeTagger`, `weaknessAnalyzer`, hub cards).
- **Design system:** `Card`, `Button`, `ProgressBar`, navigation shells.
- **Analytics** baseline (`exam_section_viewed` → extend).
- **Entitlements** infrastructure (reuse gates; tune policy separately).
- **Zod-first contracts** (`lib/schemas`) — extend rather than fork.

---

## 8. Recommended separate exam-specific components / services

- **Exam hub** (replace or heavily revise `ExamPrepPage`) — correct routes, A2 copy, progress from **real data**.
- **Exam session runner** — timer, section flow, attempt state machine.
- **Rubric / scoring service** — separate from `conversationOrchestrator`.
- **Speaking capture + ASR adapter** layer.
- **Writing evaluation** pipeline (rule-based + optional LLM with **structured output**).
- **KNM module** content + CMS/JSON discipline.

---

## 9. What to design next (before building)

| Deliverable | Purpose |
|-------------|---------|
| **Exam prep PRD** | Personas (inburgering vs self-study), **training vs simulation**, tone, **free vs premium** ethics |
| **Information architecture** | Routes under `/app/exam/*`, relationship to **Practice** and **Review** |
| **Content schema** | Item types per skill; **versioning**; media references; **accessibility** |
| **Attempt + rubric schema** | One JSON artifact per attempt; **rubric version**; mapping to `MistakeEvent` / `ReviewItem` |
| **Scoring policy** | When AI is allowed; human review; **deterministic** section for DUO-like MCQ |
| **Vertical slice spec** | e.g. **Reading training**: 1 passage, 5 items, **review extraction**, **weak tag** — proves end-to-end without all modalities |

---

## 10. Suggested implementation order (after design)

1. **Schema + API sketch** — `ExamAttempt`, `ExamItem`, `RubricScore` (or extend `practiceSessionResult` with `activityKind: exam_*` once enums updated).
2. **Exam hub fix** — remove broken links; **honest** “coming soon” or **one** live training path.
3. **One modality vertical slice** (reading **or** listening **training**) — real items, local persistence, **enqueue review** + **mistake events** with clean IDs.
4. **Weakness integration** — exam tags → hub / review CTAs.
5. **Writing / speaking** — only after **capture + storage** decisions are fixed.
6. **Simulation mode** — timer, no support tools, **frozen** feedback until end.
7. **KNM** — parallel track once language exam loop is stable.

---

## 11. Key file references (grounding)

| Topic | Path |
|-------|------|
| Practice hub | `src/features/practice-hub/PracticeHubPage.tsx` |
| Guided flow | `src/features/guided-scenario/GuidedScenarioPage.tsx` |
| Open practice | `src/features/open-practice/OpenPracticeScenarioPage.tsx` |
| Orchestration (mock replies) | `src/lib/practice-orchestration/conversationOrchestrator.ts` |
| Post-session feedback | `src/lib/practice-feedback/feedbackBuilder.ts`, `sessionSideEffects.ts` |
| Practice progress / XP | `src/lib/practice-progress/practiceProgressService.ts` |
| Review ingest | `src/lib/review-engine/integration.ts` |
| Mistakes | `src/lib/mistakes/mistakeTagger.ts`, `src/lib/schemas/mistakeEvent.schema.ts` |
| Session result contract | `src/lib/schemas/practice/practiceSessionResult.schema.ts` |
| Scoring shape | `src/lib/schemas/practice/scoringResult.schema.ts` |
| Skill tracks | `src/lib/schemas/practice/skillTrack.schema.ts`, `src/features/skill-tracks/components/SkillTrackExerciseView.tsx` |
| Voice / listening mock | `src/features/voice/VoiceTutorPage.tsx`, `src/features/listening/ListeningPage.tsx` |
| Exam placeholder | `src/features/exam-prep/ExamPrepPage.tsx` |

---

*End of audit.*
