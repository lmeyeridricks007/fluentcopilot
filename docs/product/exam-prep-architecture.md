# Exam Prep — product & system architecture

| Attribute | Value |
|-----------|--------|
| Status | **Architecture definition** (design only; no implementation mandate) |
| Audience | Product, UX, engineering, content |
| Alignment | Dutch **A2**, **inburgering** / civic integration / residence-oriented learners |
| Related | [`exam-prep-readiness-audit.md`](./exam-prep-readiness-audit.md) (repo readiness) |

---

## Section 1 — What Exam Prep is

### Definition

**Exam Prep** is a **structured, goal-driven preparation system** for passing **Dutch A2-level** formal assessments used in **inburgering**, **civic integration**, and **visa / residence** pathways. It is organized around **exam-like tasks**, **explicit scoring criteria**, and **repeatable cycles** of attempt → feedback → improvement.

### Primary outcomes

1. **Task execution** — Learners can complete the *kinds* of tasks used in the relevant exams (not only “talk about shopping”).
2. **Scoring criteria** — Learners internalize what “good enough” looks like per dimension (task fulfilment, clarity, accuracy, etc.).
3. **Exam familiarity** — Reduced surprise: prompts, pacing expectations, and response formats feel aligned with the real setting.
4. **Confidence under pressure** — Especially via **simulation mode**: fewer crutches, clearer constraints, honest scoring.

### Design principles

| Principle | Meaning |
|-----------|---------|
| **Realistic tasks** | Prompts, formats, and constraints mirror official task *families* (without copying proprietary exam material). |
| **Measurable scoring** | Every scorable task maps to a **rubric** with observable levels; scores are explainable. |
| **Repeatable improvement** | Same task types can be re-attempted; progress is visible per section and per rubric dimension. |
| **Exam-aligned feedback** | Feedback references **criteria**, not generic praise; training mode may add pedagogy; simulation stays minimal until the end. |
| **Progression toward passing** | Product surfaces **readiness** (per section and holistically), not endless grind without direction. |

### What Exam Prep is **not**

| Not this | Why |
|----------|-----|
| **Open-ended conversation practice** | That is **Practice** (scenarios, AI dialogue). Exam Prep is **task-bound** and **prompt-fixed**. |
| **Casual or exploratory learning** | Lessons and Practice support exploration; Exam Prep is **instrumental** and **outcome-linked**. |
| **Purely exploratory AI chat** | No unconstrained tutor turns as the core loop; AI may **evaluate** or **explain** only within defined contracts. |
| **Loosely guided scenarios** | Scenario “goals” and branching chat are Practice patterns; Exam Prep uses **items**, **sections**, and **attempts**. |
| **A replacement for lessons** | Lessons build language; Exam Prep **targets exam performance** on top of that foundation. |

---

## Section 2 — Practice vs Exam Prep

**Rule:** Practice and Exam Prep **share infrastructure** but **never share scoring semantics or primary UX metaphors**. A single screen must not silently switch between “coach” and “examiner” without an explicit **mode** and **visual system**.

### Comparison matrix

| Dimension | **Practice** | **Exam Prep** |
|-----------|--------------|---------------|
| **Goal** | Fluency, confidence, real-life communication, weak-area repair | **Pass-oriented**: task success under exam-like rules |
| **Structure** | Scenarios (guided → semi → free), skill tracks, conversational turns | **Catalog → session → items**; fixed prompts per item |
| **Feedback style** | Supportive, coaching, incremental hints | **Training**: instructive + rubric-linked. **Simulation**: sparse until end |
| **Scoring strictness** | Soft / heuristic / motivational (`supportUsageScore`, turn patterns) | **Rubric-based**; thresholds and partial credit defined per item type |
| **AI behavior** | Dialogue partner, optional explanations, adaptive difficulty feel | **Structured only**: evaluation JSON, model answers, explanations **only in training** (and within policy) |
| **User mindset** | “I’m practicing / exploring” | “I’m preparing for a test” / “I’m simulating the test” |
| **UI tone** | Warm, coachy, forgiving | Training: supportive but **criteria-forward**. Simulation: **neutral, focused, minimal** |
| **Progression** | Scenarios unlocked, mastery bands, missions | Section readiness, attempt history, rubric mastery, simulation milestones |
| **Retries** | Encouraged; low cost to experiment | **Training**: encouraged (with anti-farm rules). **Simulation**: limited / locked until reset policy |
| **Hints / support** | Support tools, translations, phrase banks | **Training**: on. **Simulation**: off (by default) |

### Anti-patterns (explicitly forbidden)

1. Reusing **`buildPostConversationFeedback`** (or any **practice heuristic scorer**) as an **exam score**.
2. Running **Exam Prep** inside **OpenPracticeScenarioPage** without a **separate session type** and **no support chrome** in simulation.
3. Labeling a **chat scenario** as “exam” without **item-level rubrics** and **attempt records**.
4. Mixing **XP/streak** rules for **practice completion** with **exam simulation** without caps (see Section 6).

---

## Section 3 — Supported exam types (domains)

Each **type** is a **domain** with its own **task formats**, **I/O contract**, **evaluation approach**, and **reuse** from the existing app.

### 3.1 Speaking

| Aspect | Definition |
|--------|------------|
| **Purpose** | Produce **spoken** Dutch in response to a prompt under time/register constraints typical of A2 oral exams. |
| **Task families** | Short **answers to questions**; **describe** picture/scene/situation; **react** to a minimal prompt (e.g. opinion, preference, simple problem); **information-gap** style prompts (who/what/where/when). |
| **Expected output** | **Audio capture** (primary) + optional **ASR transcript** for display, editing (policy), and evaluation input. |
| **Scoring dimensions** (rubric — illustrative) | **Task fulfilment** (did they answer what was asked); **Grammar / morphology**; **Fluency / coherence** (A2-appropriate); **Pronunciation / intelligibility**; **Vocabulary adequacy**. Weights vary by task family. |
| **Evaluation approach** | **Rubric scoring** (human-defined levels); optional **AI assist** must output **structured scores + evidence** against fixed rubric IDs; deterministic checks where possible (duration, language switch detection flags). |
| **Reuse from app** | Mic permission patterns (`VoiceTutorPage`, onboarding); Web Speech / MediaRecorder experiments from lessons and skill tracks; **do not** reuse “mock voice tutor” as product logic. |

### 3.2 Writing

| Aspect | Definition |
|--------|------------|
| **Purpose** | Produce **written** Dutch for communicative purposes at A2 (forms, messages, short directed texts). |
| **Task families** | **Form filling** (fields, short phrases); **message writing** (SMS/email-like, fixed word band); **short text to audience** (e.g. note, simple letter, complaint skeleton). |
| **Expected output** | **Plain text** (and structured field map for forms). |
| **Scoring dimensions** | **Task fulfilment**; **Grammar**; **Spelling / orthography**; **Clarity / coherence**; **Vocabulary range / appropriateness**; **Register** (formal/informal) where relevant. |
| **Evaluation approach** | Rubric + **key-point checklist** where applicable; AI structured evaluation **only** against published rubric levels; optional deterministic checks (word count band, required elements present). |
| **Reuse from app** | Skill track **`typed_check`** and **reading** layouts as **UI references** only; lesson writing steps for **field components** — **not** scoring logic. |

### 3.3 Listening

| Aspect | Definition |
|--------|------------|
| **Purpose** | Understand **short spoken Dutch** (announcements, dialogues, instructions) and answer **constrained** questions. |
| **Task focus** | **Gist** (main idea); **detail** (specific fact); **inference** (limited, A2-appropriate). |
| **Expected output** | **Selected response** (MCQ, matching, ordering) or **very short typed** answer where appropriate. |
| **Scoring dimensions** | **Correctness** per item; optional **skill tags** (gist vs detail) for analytics and weaknesses. |
| **Evaluation approach** | **Deterministic** answer keys for MVP; partial credit only if defined in item spec. |
| **Reuse from app** | `ListeningPage` / catalog shell as **UX prototype**; **review item type** `listening` in schema — wire to real **item driver**. |

### 3.4 Reading

| Aspect | Definition |
|--------|------------|
| **Purpose** | Understand **short authentic-style texts** (notice, ad, message, short article) and respond under exam-like constraints. |
| **Task focus** | **Global meaning**; **specific information**; **simple inference**. |
| **Expected output** | MCQ / matching / short gap fill (closed formats preferred for reliability). |
| **Scoring dimensions** | Per-item correctness; tag **subskill** for weaknesses (scanning vs careful read). |
| **Evaluation approach** | Deterministic keys; optional **explanation** in training mode only. |
| **Reuse from app** | Skill track **`reading_mcq`** patterns; same **task runner** abstraction as listening (text instead of audio). |

### 3.5 KNM (Kennis van de Nederlandse Maatschappij)

| Aspect | Definition |
|--------|------------|
| **Purpose** | **Knowledge** of Dutch society, institutions, norms — as tested in integration pathways (distinct from pure language skill). |
| **Task families** | **MCQ**; **true/false**; short **scenario judgment** (“what is appropriate / where to go”). |
| **Expected output** | Selected option(s); no long essays. |
| **Scoring dimensions** | Correctness; **topic tags** (work, health, education, law basics, geography, history highlights — content policy to be curated). |
| **Evaluation approach** | Deterministic; **sourcing and legal review** for content accuracy (product process, not code). |
| **Reuse from app** | Same **MCQ engine** as reading/listening; **separate content pipeline** and **taxonomy** from language items. |

### Cross-domain note: official exams

The product targets **A2-oriented** preparation aligned with **inburgering / integration** narratives. **Exact** DUO format cloning is **out of scope**; task **families** are **inspired by** public descriptions, not copied papers. Content must remain **original** (see curriculum docs).

---

## Section 4 — Modes

### 4.1 Training mode

| Aspect | Specification |
|--------|----------------|
| **Purpose** | Learn task types, rubric language, and strategies; **maximize learning per minute**. |
| **Hints** | Allowed (progressive disclosure: light → strong). |
| **Explanations** | Allowed after submission (why options wrong, grammar note, model answer). |
| **Retries** | Allowed; may **rephrase variant** or **same item** per product rules. |
| **Model answers** | Shown after attempt (or after second failed try — tunable). |
| **Difficulty** | **Adaptive selection** of items within band (future); MVP: fixed band per pack. |
| **Tone** | Supportive, instructive, **criteria-visible** (“You met X; next improve Y”). |
| **AI** | May generate **structured feedback** and **hints** only via **Exam contracts** (never free chat as the core loop). |

### 4.2 Exam simulation mode

| Aspect | Specification |
|--------|----------------|
| **Purpose** | Reproduce **pressure and constraints**; honest **readiness signal**. |
| **Hints** | **Off** (default). |
| **Retries** | **Limited** (e.g. one full attempt per session); **no per-item infinite redo** in same session unless spec says so. |
| **Timing** | **Phase 1**: soft timers optional. **Target**: section timers and global clock **on** (documented per exam pack). |
| **Prompts** | **Fixed** for the session (drawn from pack / blueprint). |
| **Scoring** | **Strict** rubric application; **no partial hint credit**. |
| **Feedback** | **Minimal during** session (correct/incorrect only where unavoidable); **full breakdown after** session end (or after section end — product choice, but consistent). |
| **Tone** | Neutral, exam-like; **no coaching** mid-task. |

### 4.3 What changes between modes

| Layer | Training | Simulation |
|-------|----------|------------|
| **Chrome** | Hints, “Why?”, model answer CTA, coaching copy | Progress, timer, section title only |
| **Scoring display** | Immediate per item or end-of-section | Deferred aggregate; item detail after submit batch |
| **AI prompts** | Explanation + pedagogy allowed | Evaluation-only; no teaching until end |
| **Data written** | `mode: training` on attempt | `mode: simulation` |
| **XP policy** | Lower per-item; caps on repeat | Milestone / completion bonus; **strong anti-farm** |

### 4.4 What stays shared

- **Catalog** definitions (same items may appear in both with different **presentation flags**).
- **Task renderer** components (with **feature flags** for hints/model answer).
- **Evaluation pipeline** (same rubric **definitions**; different **feedback templates** and **timing**).
- **Persistence** shape (`attempt`, `item_results`) with `mode` discriminator.

---

## Section 5 — Core system components

### 5.1 Exam Catalog

| | |
|--|--|
| **Responsibility** | Versioned **exam packs**: sections, item blueprints, rubrics, media refs, allowed modes. |
| **Inputs** | Content authoring / CMS / JSON bundles. |
| **Outputs** | Resolved **item instances** for a session (deterministic seed). |
| **Dependencies** | None at runtime (read-only to engine). |
| **Reuse vs new** | **New** domain (`exam` content). Reuse **patterns** from lesson/module catalog if desired later. |

### 5.2 Exam Session Engine

| | |
|--|--|
| **Responsibility** | Lifecycle: start → navigate items → enforce mode rules (hints, retries, timer) → complete → hand off to aggregation. |
| **Inputs** | User id, `packId`, `mode`, optional blueprint overrides. |
| **Outputs** | `ExamAttempt` (in progress / completed), session events for analytics. |
| **Dependencies** | Catalog, policy service (entitlements, caps). |
| **Reuse vs new** | **New** (distinct from `GuidedScenarioPage` state machine). Reuse **analytics** and **routing** patterns only. |

### 5.3 Task Engine (per type)

| | |
|--|--|
| **Responsibility** | Render prompt, accept learner input, validate **format** (word count, required fields). |
| **Inputs** | Item spec + mode flags. |
| **Outputs** | Normalized **Response payload** (text, selections, audio ref). |
| **Dependencies** | Response capture layer. |
| **Reuse vs new** | **New** exam task types; **reuse UI primitives** (cards, audio player, form fields). Skill tracks are **cousins**, not the engine. |

### 5.4 Response Capture Layer

| | |
|--|--|
| **Responsibility** | **Text** (composer, forms); **selection** (MCQ); **audio** (record, upload policy, duration metadata); future **STT** hook. |
| **Inputs** | Raw UI events. |
| **Outputs** | Immutable **response artifacts** linked to `itemAttemptId`. |
| **Dependencies** | Platform APIs (MediaRecorder, Web Speech — to be decided per implementation). |
| **Reuse vs new** | Reuse **permission** UX; **new** exam-specific storage contract. |

### 5.5 Evaluation Engine

| | |
|--|--|
| **Responsibility** | Map **response + item key** → **raw outcome** (correct/incorrect, rubric level per dimension, flags). |
| **Inputs** | Response artifact, item definition, rubric version id, mode. |
| **Outputs** | `ItemEvaluation` (structured). |
| **Dependencies** | Scoring engine for rubric math; optional AI adapter. |
| **Reuse vs new** | **New**. Do **not** call practice `conversationOrchestrator` or `buildPostConversationFeedback`. |

### 5.6 Scoring Engine (rubric-based)

| | |
|--|--|
| **Responsibility** | Apply **weights**, **thresholds**, **partial credit rules**; produce **section and overall** scores. |
| **Inputs** | `ItemEvaluation[]`, rubric definitions, pack cut scores (readiness). |
| **Outputs** | Numeric scores + **pass-likelihood band** (product-facing, not legal guarantee). |
| **Dependencies** | None from Practice scoring. |
| **Implementation** | [`exam-scoring-engine.md`](./exam-scoring-engine.md) + `src/lib/exam-scoring/*` (speaking/writing A2 formal rubrics, execution gating, AI JSON contract). |
| **Reuse vs new** | **New module**. Persisted shape: `ExamScoringResult` under **`exam.*` namespace**. |

### 5.7 Feedback Engine

| | |
|--|--|
| **Responsibility** | Turn evaluations into **learner-facing** copy: training (rich) vs simulation (summary). |
| **Inputs** | `ItemEvaluation`, mode, locale. |
| **Outputs** | Feedback blocks (criteria bullets, model answer, next step). |
| **Dependencies** | Content templates + optional AI **structured** generation. |
| **Reuse vs new** | **Reuse layout components** from `PracticeFeedbackScreen`-style cards; **separate copy and data pipeline**. |

### 5.8 Result Aggregation

| | |
|--|--|
| **Responsibility** | Roll up item → section → attempt; persist; trigger integrations. |
| **Inputs** | Completed session, evaluations, scores. |
| **Outputs** | `ExamAttemptResult`, analytics events, side-effect jobs (review, mastery, weaknesses). |
| **Dependencies** | All upstream components. |
| **Reuse vs new** | **New** orchestrator; mirror **ideas** from `processPracticeScenarioCompletion` **without** sharing implementation. |

### 5.9 Recommendation Engine

| | |
|--|--|
| **Responsibility** | “What next?”: weak rubric dimensions → **Exam** items, **Practice** scenarios, **Review** sessions. |
| **Inputs** | Latest attempts, weakness graph, entitlements. |
| **Outputs** | Ranked actions (deep links). |
| **Dependencies** | Weakness system, catalog. |
| **Reuse vs new** | **Extend** `weakness` / hub recommendation **patterns** with **exam-specific** signal sources. |

---

## Section 6 — Integration with existing systems

### 6.1 Practice

| Topic | Policy |
|-------|--------|
| **Shared ideas** | Real-life themes (shop, doctor) may **inspire** exam items; not the same content ID. |
| **Shared UI** | Buttons, cards, progress bars, audio player shell, typography. |
| **Shared AI infrastructure** | **Provider client**, rate limiting, logging — **yes**. **Prompts and orchestrators** — **no** (separate exam evaluation service). |
| **Logic** | **Strict separation**: Practice routes (`/app/practice/*`) vs Exam routes (`/app/exam/*`). |

### 6.2 Review (SRS)

| Mechanism | Policy |
|-----------|--------|
| **Mistakes → review items** | Failed or weak items enqueue **`ReviewItem`** rows with tags: `source: exam`, `section`, `rubricDimension`, `packId`. |
| **Mapping** | Grammar/spelling/vocab slips → `grammar` / `phrase` / `vocab` cards; listening/reading → typed **`listening`** / **`reading`** cards or **`phrase`** with context. |
| **Scheduling** | Same SM-2 / Stage-4 pipeline; optional **filter** “Exam weak spots”. |
| **Ingest API** | Generalize beyond `lessonId` (today lesson-shaped); use **`sourceLessonId` or successor field** for stable IDs (see future schema doc). |

### 6.3 Mastery / Ability system

| Mechanism | Policy |
|-----------|--------|
| **Updates** | Exam attempts contribute **signals** to ability buckets (`listening`, `speaking`, `reading`, `writing`) + **KNM** as separate axis or tag set. |
| **Confidence** | Derived from **rolling exam performance**, not from practice chat heuristics. |
| **Weighting** | Simulation attempts may **count more** than training (configurable). |

### 6.4 XP / Streak / Missions

| Mechanism | Policy |
|-----------|--------|
| **Training** | Awards **moderate XP** per completed **training session** or **item set**; **diminishing returns** on identical item repeats same day. |
| **Simulation** | **Milestone XP** on first completion of a pack or section simulation; **no** per-item grind loop. |
| **Streak** | May count **either** training or simulation as “exam activity” — **one** canonical rule to avoid double-counting. |
| **Missions** | New mission types: e.g. “Complete 1 exam training session”, “Finish 1 speaking simulation”. |
| **Anti-farm** | Repeat same **simulation** blueprint → **zero or minimal XP** until cooldown or new pack. |

### 6.5 Weakness-driven system

| Mechanism | Policy |
|-----------|--------|
| **Ingest** | Map rubric misses to **normalized tags** (e.g. `exam-writing-task-fulfilment`, `word-order`) compatible with `weaknessAnalyzer` inputs. |
| **Out** | Recommendations: **Exam** (targeted pack), **Practice** (scenario/skill track), **Review** (mistake-fix). |
| **Priority** | Visa / exam-motivated learners: show **Exam** CTA first when `goal: integration` in profile (future profile flag). |

---

## Section 7 — Data flow

### 7.1 Generic flow (all modes)

```
User opens Exam Prep hub
  → selects pack + mode (training | simulation)
    → Session Engine creates ExamAttempt
      → for each item:
          Task Engine renders item
            → Response Capture records artifact
              → Evaluation Engine produces ItemEvaluation
                → Scoring Engine updates running section score
                  → (Training) Feedback Engine shows immediate feedback
      → Session complete
        → Result Aggregation persists ExamAttemptResult
          → side effects:
              Review ingest (optional per item)
              Mistake / weakness signals
              Mastery update
              XP / missions / analytics
              Recommendation Engine refresh
```

### 7.2 Speaking — training

1. User selects **Speaking → Training → Pack A**.  
2. Session loads **item**: prompt audio/text + preparation time (optional).  
3. User records answer; **STT** optional for transcript; user can **re-record** before submit (policy).  
4. **Evaluation**: rubric levels + optional AI structured scores; **model answer** + **coaching** shown.  
5. Weak dimensions enqueue **review** / **weak tags**; **small XP**.  
6. **Recommendation**: next speaking item or linked **Practice** scenario for fluency.

### 7.3 Writing — training

1. User opens **Writing training** item (e.g. short message).  
2. User submits text; **deterministic checks** (length band, required phrases) + **rubric evaluation**.  
3. Feedback: highlighted criteria + **model text**; optional **grammar explain** (training only).  
4. Mistakes recorded; **review cards** for spelling/grammar patterns.  
5. **Mastery** writing signal updated.

### 7.4 Full exam simulation (multi-section)

1. User selects **Simulation blueprint** (e.g. “A2-style full morning”).  
2. **No hints**; **timer** on; sections **sequential** (speaking last or per spec).  
3. Each section runs **fixed item set**; **no mid-exam teaching**.  
4. On **full submit**: **score report** with rubric breakdown; **readiness band**; **compare to last attempt**.  
5. **XP milestone** if first completion or beat personal best; **weakness** and **review** updated from **incorrect** and **low rubric** cells only (policy: avoid noise from single simulation).

---

## Section 8 — Reuse vs separation strategy

### Shared

- **Design system** (layout, cards, buttons, progress, typography).  
- **Navigation** patterns (hub → detail → session).  
- **Auth / entitlements** infrastructure.  
- **Analytics** pipeline (new event names: `exam_session_started`, `exam_item_submitted`, …).  
- **AI provider layer** (HTTP client, keys, tracing) — **not** practice prompts.  
- **Review bank + SRS** storage and scheduler.  
- **Weakness / recommendation** UI shells.  
- **Retention** store patterns (with separate event reasons for exam).

### Separate

- **Exam catalog** and **item schema**.  
- **Exam session / attempt** state machine.  
- **Evaluation + rubric scoring** implementation.  
- **Simulation** timing and constraint policy.  
- **Feedback copy** and templates (exam-specific).  
- **Routes** under `/app/exam/*` (keep **Practice** under `/app/practice/*`).  
- **Database / localStorage keys** — never prefix `exam` data with `practice` keys.

---

## Section 9 — UX principles

### Training mode

- **Supportive**: normalize struggle (“A2 exams reward clarity over perfection”).  
- **Instructive**: always tie UI to **what is being scored**.  
- **Encouraging**: celebrate **rubric gains**, not just scores.  
- **Feedback timing**: per item or small batches — **fast loop**.  
- **Progress**: show **dimension bars** per section (grammar, task fulfilment, etc.).

### Exam simulation mode

- **Focused**: single column, minimal distractions, **no** Practice promos mid-session.  
- **Minimal**: no coach English in task chrome.  
- **Realistic**: optional ambient copy (“You may not use dictionary”) where true to target exam.  
- **Slightly serious** tone: calm, respectful, not playful.  
- **Feedback timing**: **end-weighted**; optional **section summary** if long.  
- **Results**: **report** layout (scores, rubric grid, “compare to last time”), not chat-style recap.

### Progress visualization

- **Hub**: section tiles with **readiness** (not fake percentages).  
- **History**: list of attempts with mode badge.  
- **Next best action**: one primary CTA from Recommendation Engine.

---

## Section 10 — Implementation guardrails

1. **Never** mix practice scoring with exam scoring — separate functions, separate namespaces, separate analytics properties.  
2. **Always** use **rubric-based** evaluation for exam items (even if rubric is simple “correct/incorrect” for MCQ).  
3. **AI** must follow **structured evaluation rules** (JSON schema, rubric id, version); no unstructured “tutor ramble” as the scored output.  
4. **Exam tasks** must be **deterministic in structure** (same item id → same prompt shape); variable content only via **authorized fields** (e.g. name in scenario).  
5. **Feedback** must be **concise and actionable** — max bullets per dimension; link “learn more” to training resources.  
6. **Content** must not copy **proprietary exam** texts; **original** items aligned to **public task descriptions**.  
7. **Premium gating**: do not block **good-faith exam access** without clear value; align with product ethics for residence-motivated learners.

---

## Section 11 — Phased implementation plan (no code)

| Phase | Scope | Exit criteria |
|-------|--------|---------------|
| **1** | **Speaking + writing training mode** | End-to-end session: catalog → items → capture → persist attempt → training feedback; **no** simulation |
| **2** | **Scoring engine + feedback** | Rubric versioning; structured `ItemEvaluation`; reporting UI; AI optional behind feature flag |
| **3** | **Simulation mode** | Hint-free UI; session rules; end report; anti-farm XP |
| **4** | **Listening + reading + KMN** | Shared task runner for MCQ/matching; KNM content pipeline; media handling |
| **5** | **Full integration + analytics** | Review/mastery/weakness/missions wired; dashboards; content ops playbook |

**Vertical slice recommendation (within Phase 1):** one **writing** training flow **or** one **speaking** training flow with **full** persistence and **review enqueue** — proves architecture before scaling formats.

---

## Document control

| Version | Date | Notes |
|---------|------|--------|
| 1.0 | 2026-03-26 | Initial architecture |

**Schemas:** [`exam-prep-schema-overview.md`](./exam-prep-schema-overview.md) — Zod layer in `src/lib/schemas/exam/` (`ExamModule`, `ExamExercise`, `ExamAttempt`, `RubricDefinition`, `ExamScoringResult`, …).

---

*End of architecture document.*
