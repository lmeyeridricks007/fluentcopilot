# Implementation roadmap (A2 mobile-first Dutch)

| Attribute | Value |
|-----------|--------|
| Status | **Implementation contract** |
| Aligns with | `docs/final/feature-domain-breakdown.md`, `docs/product/*.md` |

---

## 1. Purpose

Sequence work so the product moves from **today’s demo-grade bundle + client review** to a **production-grade** lesson engine, **server-backed progress**, **scalable content pipeline**, and **~132 lesson** curriculum — **without** a single unbounded “build everything” prompt.

---

## 2. Assumptions

- **Web-first** delivery (responsive) is the **current** ship vehicle; **native shell** may wrap later.
- **A2 nl-NL** remains the **first** full path; other levels reuse patterns.
- **Team** may be **1–2 engineers** + **AI-assisted** authoring — phases are **merge-sized**.
- **Strict typing** of bundle remains mandatory (`a2Catalog.ts` + generator).

---

## 3. Why not one giant prompt

- **Risk**: breaks **review queue**, **grammar layouts**, or **path UI** without tests.
- **Learning**: engine + content contracts need **human-readable** docs (this folder).
- **Quality**: schema + CI gates catch errors **between** features.

---

## 4. Recommended phases (high level)

| Phase | Name |
|-------|------|
| 0 | Docs & contracts **(this deliverable)** |
| 1 | Lesson step schema & registry (dual-read) |
| 2 | Vertical slice lesson (typed steps + analytics stubs) |
| 3 | Review engine v2 (server + SM-2-lite) |
| 4 | Content generation pipeline unification |
| 5 | First **full** module at scale (~11 lessons) |
| 6 | Remaining modules to ~132 lessons |
| 7 | UX polish & offline |
| 8 | Analytics, QA tooling, release hardening |

---

## 5. Stage-by-stage plan

### Phase 0 — Docs / contracts ✅ target

**Deliverables**: `docs/product/*.md` (six files), cross-links to `docs/curriculum/*`.

**Acceptance**: Product + eng agree on **terminology** (band, module, step type, review item).

**Dependencies**: None.

---

### Phase 1 — Schema / engine foundations

**Deliverables**:

- Zod (or TS) **discriminated union** for `lesson_plan.steps[]` **additive** to current JSON.
- **Step registry** map `type → component`; fallback to markdown path.
- Unit tests for **registry** + **one** golden lesson JSON.

**Acceptance**: At least **one** production lesson renders via **typed** step without removing legacy steps.

**Dependencies**: Phase 0.

---

### Phase 2 — One vertical slice lesson

**Deliverables**:

- End-to-end **listen → grammar → practice → self-check → four-skills → completion** with **typed** steps.
- `lesson_started` / `lesson_completed` events (console or analytics adapter).

**Acceptance**: New lesson id ships **only** via JSON + passes CI.

**Dependencies**: Phase 1.

---

### Phase 3 — Review engine

**Deliverables**:

- Server model for `review_items` **or** hardened client with **export/import** pending API.
- Scheduling upgrade path (SM-2-lite or FSRS stub).
- Weak-tag → **prioritised** queue.

**Acceptance**: User can complete **20-item** session; progress survives **reload** (in target env).

**Dependencies**: Phase 2 (for stable item extraction).

---

### Phase 4 — Content generation pipeline

**Deliverables**:

- Single **authoring → validate → bundle** command documented in README slice.
- Optional: blueprint import from `content-engine` → A2 record mapper (spike).

**Acceptance**: New lesson added **only** under `data/curriculum/...` + generator passes.

**Dependencies**: Phase 1 (schema stability).

---

### Phase 5 — First module at scale

**Deliverables**:

- **11 lessons** in one module with **task** lesson + **review** hooks audited.
- QA checklist run **once** per module template.

**Acceptance**: Module passes **rubric** in `content-generation-system.md` §13.

**Dependencies**: Phases 2–4.

---

### Phase 6 — Additional modules (~132 lessons)

**Deliverables**:

- Expand from **9 → 12** modules (or equivalent unit split) and lesson count toward **132**.

**Acceptance**: Manifest `unit_order` complete; no orphan lessons; bands balanced.

**Dependencies**: Phase 5 playbook.

---

### Phase 7 — UX refinement

**Deliverables**:

- `LessonShell` / `StepViewport` extraction; keyboard/safe-area audit.
- Optional **inline** flashcard loop vs only separate routes.

**Acceptance**: Core Web Vitals / manual **mobile** test pass on **mid-tier** device.

**Dependencies**: Phase 2+.

---

### Phase 8 — Analytics / QA / polish

**Deliverables**:

- Wire events to product analytics.
- Admin: batch diff + validation page hooks for curriculum.
- **MVP** vs **A2 complete** release notes.

**Acceptance**: Funnel **lesson_started → completed** measurable; **<1%** schema CI failures on main.

**Dependencies**: All prior.

---

## 6. Dependencies between stages (summary)

```
0 → 1 → 2 → 3
      ↓
      4 → 5 → 6
2,3,5 → 7 → 8
```

---

## 7. Suggested repo structure evolution

- Keep **`data/curriculum/nl-NL/A2/`** as **source**; `catalog.bundle.json` as **build artifact**.
- Add **`src/types/lesson-step.ts`** when discriminated steps land.
- Add **`src/features/lessons/engine/`** for player hook + registry.

---

## 8. Risks and mitigation

| Risk | Mitigation |
|------|------------|
| Typed step migration stalls | Dual-read + **one lesson** pilot |
| Review server delayed | IndexedDB sync layer spike |
| Content debt at 132 lessons | Batch QA + automated duplicate detection |
| AI wrong answers | Golden tests on `interaction` payloads |

---

## 9. Recommended working model with Cursor

1. **One phase per PR** (or sub-phase).
2. Paste **relevant** `docs/product/*.md` section into prompt + **file paths**.
3. Require **tests** + `npx tsc --noEmit` + `npm run build` before merge.
4. **Never** mix “rewrite entire lesson folder” with unrelated UI changes.

---

## 10. Review loop strategy

- **Author** → **AI draft** → **schema validate** → **peer review** → **merge**.
- **Weekly** sample **listening + self-check** in **device lab**.

---

## 11. Definition of done

### MVP (learner-ready slice)

- **One band** (e.g. A2.1) **fully** passable with **typed** engine path for **≥80%** steps.
- **Review** works for **lemmas** with **persistence** (local or server).
- **No** critical a11y blockers on lesson player.

### Fuller A2 release

- **12 modules / ~132 lessons** published.
- **SRS** with lapse handling + **weak-tag** adaptation.
- **Server progress** + **auth** integration.
- **Analytics** baseline dashboard.

---

## 12. Suggested next prompts (after documentation)

1. “Implement **Phase 1**: add `LessonStep` discriminated union in Zod, dual-read in `GuidedLessonPage`, migrate **one** lesson JSON.”
2. “Add **review API** sketch + client sync for `a2ReviewStore` items.”
3. “Extend generator with **step.phase** tagging for analytics.”

---

## 13. Current repo snapshot (baseline for roadmap)

| Area | State |
|------|--------|
| Bundle | `catalog.bundle.json` + strict TS |
| Lesson UI | `GuidedLessonPage` + specialised components |
| Review | `localStorage` queue + weak tags |
| Content engine | Parallel `src/content-engine` artifacts |
| Docs | Feature deep-dives + curriculum docs + **this product folder** |

Use this table to **diff** future progress against the roadmap.
