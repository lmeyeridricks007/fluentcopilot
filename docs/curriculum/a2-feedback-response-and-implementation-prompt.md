# A2 Curriculum Feedback — Response Plan & Implementation Prompt

| Attribute | Value |
|-----------|--------|
| Status | **Action plan** — aligns product, content, and tooling |
| Audience | Curriculum authors, engineers, Cursor agents |
| Related | `populating-level-curriculum.md`, `data/curriculum/nl-NL/A2/`, `scripts/generate_a2_nl_curriculum.py`, `src/demo-data/curriculum/a2Catalog.ts` |

---

## 1. Executive summary

External review correctly identifies that the current A2 track is **strong on thematic units and blended activities** but **weak on explicit grammar progression, skill separation, CEFR can-do signaling, visible difficulty bands, concrete culture scripts, spaced repetition, and pronunciation/listening scaffolding**.  

We will address this in **three layers** that can ship incrementally:

1. **Curriculum & schema** — grammar spine, sub-levels (A2.1–A2.3), per-unit and per-lesson can-dos, lesson template with skill tags, real-life scripts, culture as phrase + situation blocks.
2. **App & lesson runtime** — surface progression (sub-band, prerequisites), optional dedicated step types or labels for listen/read/write/speak, hooks for review queues (even if MVP is manual “review lesson”).
3. **Learning mechanics (later)** — SRS engine, cross-topic recycling, mistake-targeted drills (may start as authored exercises before adaptive logic).

---

## 2. Feedback → how we will address it

### 2.1 No grammar progression (critical)

| Issue | Approach |
|-------|----------|
| A2 treated as vocab + scenarios only | Introduce a **Grammar spine** document and **enforce it in authoring**: each unit declares `grammar_stage` (e.g. `a2.1-present-modals` … `a2.3-subordinate-opinions`) and each lesson’s Language focus **must** teach or deliberately recycle one primary structure from that stage. |
| Missing perfectum, modals, word order, subclauses, comparatives, reflexives, future | Map **explicit lesson slots** across the level (not one-off mentions): e.g. perfectum spread over 2–3 lessons with increasing complexity; `omdat/dat/als` after main-clause order is stable; `gaan + infinitive` after present review. |
| Risk of phrase memorization only | Every dialogue + guided practice must include **productive** prompts (transform, combine, minimal pair) tied to the week’s grammar point. |

**Content deliverable**: `docs/curriculum/a2-grammar-spine.md` (single source of truth) + generator rules so `Language focus` blocks cannot repeat only generic placeholders.

**Code deliverable**: Extend unit/lesson JSON (or bundle generator) with `grammar_primary`, `grammar_recycle[]`, optional `grammar_spine_week` for UI badges.

---

### 2.2 No skill separation (listening / reading / speaking / writing)

| Issue | Approach |
|-------|----------|
| Everything blended in topics | Tag each **lesson plan step** (or each lesson) with `skill: listening \| reading \| speaking \| writing \| mixed` and **learner-visible labels** (icons already partially align with product language). |
| A2 needs distinct practice | **Minimum per lesson (target template)**: 1 listening-oriented step, 1 reading-oriented, 1 speaking prompt, 1 writing micro-task (even if writing is “type 1–2 sentences” in guided or freer practice). |

**MVP without new UI**: encode skills in `learner_title` + `teacher_notes` + consistent step order; **v2**: structured field `step_skills: ('listening'\|'reading'|...)[]` rendered in `GuidedLessonPage`.

---

### 2.3 No CEFR alignment or outcomes

| Issue | Approach |
|-------|----------|
| Learners don’t see what they can *do* | **Unit**: keep and expand `objectives_can_do` (already in catalog shape); show **top 3 can-dos** on unit overview / first lesson of unit. |
| Per-lesson invisible | Add `pedagogy.can_do_outcomes: string[]` (2–4 bullets) per lesson; surface in lesson header or “After this lesson” card. |

**Align wording** with CEFR A2 descriptors (transactions, routine, simple questions) — author in English for instruction locale; optional NL mirror later.

---

### 2.4 No progression (flat modules)

| Issue | Approach |
|-------|----------|
| All units feel same weight | Introduce **sub-level bands** in manifest: `a2_band: "A2.1" \| "A2.2" \| "A2.3"` on units; optional `order_within_band`. |
| Jump anywhere | **Product rule (configurable)**: default path is sequential within band; “explore” unlocks all for power users. **Content rule**: later units assume grammar from earlier bands (documented in spine). |

**UI**: Curriculum path shows band headers (Survival expansion → Independence → Confidence) and optional lock icons until prior band completion (feature-flagged).

---

### 2.5 Culture & integration too abstract

| Issue | Approach |
|-------|----------|
| Vague “etiquette” | Replace abstract culture-only steps with **script + phrases**: e.g. “Dutch directness” → 3–5 reusable sentences + when to use + mini dialogue; gemeente → appointment vocabulary + one scripted phone/email fragment. |
| Not language-driven | Every culture step must include **memorizable Dutch** + **comprehension or production** task, not essay-only reflection. |

---

### 2.6 No repetition / reinforcement

| Issue | Approach |
|-------|----------|
| Linear only | **Authoring**: each lesson lists `recycle_from_lesson_ids` or `recycle_lemmas[]` (explicit). **Product roadmap**: SRS queue (1d / 3d / 7d) fed by lemmas from completed lessons; mixed review sets. |
| MVP | “Review” step type linking to prior lesson snippets + short quiz pulling lemmas from last N lessons (even if hand-authored first). |

---

### 2.7 Pronunciation & listening foundation

| Issue | Approach |
|-------|----------|
| Dutch-specific sounds | Dedicated **Pronunciation spotlight** steps (short): `g/ch`, `ui/eu/ij`, sentence stress — with listen + repeat prompts (browser TTS + optional recording later). |
| Listening levels | Tag listening tasks `listening_level: slow \| natural_slow \| natural` in content; UI copy sets expectation. Start all A2.1 at `slow`; ramp mid A2.2. |

---

## 3. Concrete additions (from “what you should add”)

| Suggestion | Our implementation |
|------------|-------------------|
| Grammar spine (non-negotiable) | Author `a2-grammar-spine.md` + generator validation; unit `grammar_focus` must reference spine IDs. |
| Restructure A2.1 / A2.2 / A2.3 | Remap existing units into three bands in `manifest.json` + titles/summaries; adjust `lesson_ids` order; no need to delete content — **re-sequence and re-label** first. |
| Can-do per module | Enrich `objectives_can_do`; add lesson-level `can_do_outcomes`. |
| Lesson structure template | Document 8-step pattern mapping vocabulary → grammar → dialogue → L/R/W/S → review; align with current 8-step guided flow where possible. |
| Real-life scripts | New content type or step prefix `**Script:**` (AH, huisarts, landlord, appointment) with listen + key phrases table. |
| Spaced repetition | Phase 1: data model + “due review” list stub; Phase 2: scheduler; content supplies lemma IDs. |
| Mistake-based learning | Author “trap” MC/gap items (word order, de/het, verb end position); tag `common_error: word_order \| article \| verb_position` for analytics and future adaptive sets. |

---

## 4. Suggested phased rollout

| Phase | Scope | Outcome |
|-------|--------|---------|
| **P0** | Schema + docs only | Grammar spine doc; manifest `a2_band`; lesson `can_do_outcomes`; step `skill` tags in JSON (ignored by UI initially). |
| **P1** | Content pass | Regenerate/reauthor units to match spine + template; concrete culture scripts; replace placeholder pattern repetition in Language focus. |
| **P2** | UI | Show band, can-dos, skill badges per step; optional sequential unlock. |
| **P3** | SRS + review mix | Backend/local store for review intervals; review lesson type. |
| **P4** | Pronunciation + adaptive | Recording integration; mistake-tagged drills drive recommendations. |

---

## 5. Files and systems to touch (for implementers)

- **Bundle / generation**: `scripts/generate_a2_nl_curriculum.py`, `scripts/a2_learner_content.py` (or successor), `data/curriculum/nl-NL/A2/catalog.bundle.json`.
- **Types**: `src/demo-data/curriculum/a2Catalog.ts` — extend interfaces for new optional fields.
- **UI**: `GuidedLessonPage.tsx`, `CurriculumPathPanel.tsx` (or equivalent path), lesson header components.
- **Authoring docs**: `docs/curriculum/populating-level-curriculum.md` — add fields to §4 JSON examples.

---

## Appendix A — Implementation prompt (dedicated file)

The full **copy-paste Cursor prompt** (phases, constraints, checklist) lives in:

**[`docs/curriculum/prompts/a2-curriculum-implement-cursor-prompt.md`](prompts/a2-curriculum-implement-cursor-prompt.md)**

Use a new Cursor chat and paste that file’s body (from “You are working…” onward) or `@`-reference the file.

---

## Document history

| Date | Change |
|------|--------|
| 2026-03-25 | Initial plan + Cursor prompt from external A2 feedback |
