# Exam Prep — QA pass (holistic review)

| Attribute | Value |
|-----------|--------|
| Date | 2026-03-26 |
| Scope | Full Exam Prep surface: navigation, speaking/writing/listening/reading/KMN, scoring, readiness, recommendations, missions, post-A2, analytics |
| Method | Code + copy audit against product docs; representative journey walkthrough; targeted fixes in-repo |

---

## 1. Executive summary

Exam Prep is **functionally rich** (training + simulation for speaking/writing, structured training for listening/reading/KMN, practice exams, readiness, recommendations, retention). The main **production blockers** found in this pass were **trust and clarity**: several surfaces still claimed features were “in development” while **training links were already live**, and **language mix** (EN titles next to NL flows) weakened the **inburgering / A2** positioning. **Scoring** is structurally sound (execution gating, rubric aggregation, heuristic speaking path); the **minimum word guard** (≥2 words before credit) is **intentional** to cap over-generous AI scores—**do not remove** without replacing that safeguard.

**This pass** adds a structured QA document, fixes the worst UX contradictions, improves **mobile affordances** for listening and reading, and aligns key **Dutch-first** labels on high-traffic screens.

---

## 2. What is working well

- **Architecture**: Clear separation Practice vs Exam Prep in docs; exam scoring engine with execution gating and normalization is documented and tested (`exam-scoring-engine.md`, `examScoring.test.ts`).
- **Speaking**: Heuristic evaluator sets `execution = 0` for `wc < 2`, aligned with rubric “task performed” intent; simulation uses same pipeline without mid-session coaching.
- **Listening**: Replay budgeting, difficulty presets, and MCQ flow are explicit; TTS fallback is labeled as practice mode.
- **Readiness + recommendations**: Readiness card and exam → practice recommendation plumbing exist; analytics instrumentation adds funnel events.
- **Mobile shell**: Most screens use `max-w-lg`, `min-h-touch`, `pb-28`—reasonable defaults for phone layouts.

---

## 3. Highest-impact issues (summary)

| ID | Issue | Dimension | Severity |
|----|--------|-----------|----------|
| H1 | Type hub showed **“Coming next — training in development”** above **live training/simulation links** | UX clarity, trust | **Critical** |
| H2 | Landing **“as we ship them”** and hero **“Each area will offer”** contradicted shipped modules | UX clarity | **High** |
| H3 | **Speaking simulation** title in **English** while breadcrumb and rest NL | UX, A2 audience | **High** |
| H4 | Listening **audio controls** cramped on narrow viewports; **replay budget** easy to miss until blocked | Mobile UX | **High** |
| H5 | **Reading** body text usable but **line-height** modest for long texts on small screens | Mobile / readability | **Medium** |
| H6 | Hub **“All exam areas”** and some error copy in EN while module flows NL | Consistency | **Medium** |
| H7 | **Single-word answers** (“Ja”) with **fake AI execution=3** are zeroed by **min word guard**—good; heuristic already returns execution 0 for `wc<2` | Scoring trust | **Info** (no change) |

---

## 4. Issues by QA dimension

### 4.1 Scoring accuracy

- **Strengths**: Execution gating after clamping; `MIN_WORDS_FOR_CREDIT = 2` blocks absurd full rubric credit on nearly empty answers when upstream scores are wrong; transcript confidence guard for speaking.
- **Risks**: LLM-backed eval (when wired) must stay conservative; heuristic is deterministic but not “human examiner”—**readiness labels** must stay framed as **internal**, not DUO outcomes (already in docs).
- **Contradictions**: If UI ever showed high category scores with execution 0, that would be a bug—spot-check result components when adding new surfaces.

### 4.2 A2 difficulty

- **Content**: Full item-by-item linguistic audit was **not** executed in this pass (would require domain expert review of all JSON/content packs).
- **Product copy**: Mixed EN/NL on exam hub weakened **A2 / inburgering** tone—addressed for primary navigation strings.
- **Listening**: TTS note correctly sets expectations vs final exam audio.

### 4.3 UX clarity

- **Fixed**: Misleading “coming next” vs live modules; landing subtitle; hero expectation text; Dutch simulation title; hub back link label; invalid route message.
- **Remaining**: Some training cards still use English descriptions on type hub for speaking/writing—acceptable for bilingual audience but can be fully NL later.

### 4.4 Mobile usability

- **Fixed**: Listening player controls stack full-width on small screens; explicit **remaining audio starts** line during task phase.
- **Fixed**: Reading text card slightly larger default type size and relaxed line-height.

### 4.5 Feedback usefulness

- **Speaking heuristic** rationales are concrete (overlap, reason markers, length)—good direction.
- **Remaining**: Spot-check writing feedback cards for generic blocks on edge items; not changed in this pass.

### 4.6 AI consistency

- **Simulation/training**: Structured JSON path + heuristic reduces “chatty” evaluator drift for speaking MVP.
- **Remaining**: When LLM scoring is enabled, enforce prompt contracts in `aiEvaluationPromptSpec` and monitor schema violations.

---

## 5. Severity / priority table

| Severity | Count (approx.) | Action |
|----------|------------------|--------|
| Critical | 1 | Fixed (H1) |
| High | 4 | Fixed (H2–H4) + doc |
| Medium | 2 | Fixed (H5–H6) |
| Low | Many polish items | Backlog |

---

## 6. Recommended fixes (backlog beyond this pass)

1. Full **content audit** (prompts, model answers, distractors) with a Dutch examiner / CEFR specialist.
2. **Listening simulation** path when product-ready (hub already “Soon”).
3. **Writing simulation** timer visibility sticky header on long tasks.
4. Unify **je/u** register across Exam Prep (formal “u” for exam framing vs friendly training).
5. E2E tests for critical flows (start training → submit → result → recommendation click).
6. Analytics dashboards: completion vs abandon by `unit_kind` (see learning intelligence events).

---

## 7. What was fixed during this QA pass

- `ExamTypeHubPage.tsx`: Removed false “Coming next / in development” block; replaced with accurate **Practice vs exam prep** distinction.
- `ExamPrepLandingPage.tsx`: **Exam areas** subtitle reflects **live** modules.
- `ExamPrepHero.tsx`: Present-state description of training vs simulation.
- `SpeakingSimulationScreen.tsx`: Dutch **page title** aligned with breadcrumb.
- `ExamTypeHubPage.tsx`: Dutch labels for **invalid** exam type; **Alle examengebieden** link; **Trainingsmodus** / **Examensimulatie** for speaking & writing entry cards.
- `ListeningTrainingScreen.tsx`: **Replay budget** line under the player (`aria-live` for screen readers).
- `ListeningAudioPlayer.tsx`: **Mobile-first** control layout (stacked full-width play/replay below `sm`); clearer replay label.
- `ReadingTextCard.tsx`: Improved **readability** (line-height / slightly larger minimum font size).
- `KMNHomeScreen.tsx`: Breadcrumb label **Examenvoorbereiding** (was English “Exam prep”).

---

## 8. What still remains for future work

- Per-item **A2 linguistic** review of all exam content JSON.
- **LLM scoring** production hardening and regression fixtures.
- **KMN** simulation and listening/reading **full exam** simulations.
- Deeper **result screen** hierarchy pass (writing/speaking report density).
- Formal **accessibility** audit (screen reader on timers, audio controls).
- **Premium / free** differentiation QA where applicable.

---

## 9. Representative journeys (reasoning)

| # | Journey | Outcome of review |
|---|---------|-------------------|
| 1 | New user → Exam Prep landing | Copy updated; compare strip still strong. |
| 2 | Speaking training task | Flow sound; heuristic enforces short-answer behavior. |
| 3 | Weak speaking simulation | Timed submit + end report; trust OK. |
| 4 | Writing message task | Not individually re-run; backlog content check. |
| 5 | Writing simulation | Intro clear; NL/EN mix reduced on speaking sim only in this pass. |
| 6 | Listening + replay | Budget now visible; controls improved on phone. |
| 7 | Reading scanning | Typography tweak; skill-specific UX unchanged. |
| 8 | KMN home | Copy OK; link “Exam prep” could be NL—low priority. |
| 9 | Readiness card | No logic change; disclaimers already in presenter model. |
| 10 | Recommendation → Practice | Engine present; click analytics exist from prior work. |
| 11 | Post-A2 → Exam Prep | Routed in app; not re-audited in this pass. |
| 12 | Free vs premium | Not systematically tested here. |

---

## 10. Production-readiness assessment (after fixes)

| Area | Rating | Note |
|------|--------|------|
| Trust (no false claims) | **Improved** | Hub/landing aligned with shipped features |
| Scoring architecture | **Strong** | Keep gating + tests on any change to guards |
| Mobile fit | **Improved** | Listening + reading incremental |
| Content / A2 fit | **Needs expert pass** | Not solved by engineering-only QA |
| Overall | **Closer to beta / soft launch** | Internal testing + content review still recommended |

---

## 11. Recommended next step

1. **Internal user testing** (5–8 learners on real phones): speaking sim + listening training + one writing task.  
2. **Analytics review**: funnel `learning_unit_*` vs legacy exam events.  
3. **Prompt/scoring tuning** when LLM eval is on.  
4. **Launch readiness polish**: register consistency (je/u), full NL hub copy, WCAG spot-check.

---

## 12. Assumptions

- Product **does not** claim official DUO certification; readiness is internal.  
- **Heuristic speaking** remains a valid MVP until LLM is production-grade.  
- **MIN_WORDS_FOR_CREDIT = 2** remains the backstop against malformed high scores from future AI evaluators.
