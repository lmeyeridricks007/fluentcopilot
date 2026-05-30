# Review engine (SRS, mastery, mistakes)

| Attribute | Value |
|-----------|--------|
| Status | **Implementation contract** |
| Current client impl | **Stage 4:** `src/lib/review-engine/*` + `src/features/review/*` + `/app/review/*` (SRS, adaptive mix, mobile UI). Legacy lemma queue: `src/features/curriculum/a2ReviewStore.ts` + `CurriculumReviewPanel`. |
| Content hooks | `recycle_lemmas`, `target_vocabulary_lemmas`, `grammar_primary_label`, `common_error_tags` on steps |
| Stage 4 technical note | [`docs/technical/review-engine-stage4.md`](../technical/review-engine-stage4.md) |

---

## 1. Purpose

Provide **retention-focused** practice **outside** the main lesson narrative: **spaced repetition**, **mistake-driven review**, and **checkpoint-style** mixes — optimised for **short mobile sessions** without replacing **communicative** lesson time.

---

## 2. Lesson learning vs reinforcement

| Aspect | Lesson path | Review / SRS |
|--------|-------------|--------------|
| Goal | New input + task + integration | Stabilise memory + fix errors |
| Pedagogy | Guided + rich context | **Lean** context; fast loops |
| Duration | 12–18 min typical | **2–8 min** typical session |
| Content source | Full lesson record | **Extracted items** + grammar threads |

---

## 3. Review system layers

| Layer | Scope | Trigger |
|-------|--------|---------|
| **Daily review** | Due SRS items | Home badge / “Review” tab |
| **Module review** | Lemmas + grammar from unit | End of unit CTA (future) |
| **Checkpoint review** | Mixed items | Band or module milestone (future) |
| **Mistake-fix review** | Items tagged from self-check | Auto-queue or filter “Weak spots” |

**Today**: **Daily-like** queue from `enqueueReviewFromLesson` + **weak tags** filter (`recordWeakSelfCheckTags` / `loadWeakTagCounts`).

---

## 4. Spaced repetition model (recommended)

Use a **lightweight SM-2–inspired** or **fixed-interval ladder** for MVP, then graduate to **full SM-2** or **FSRS** when analytics exist.

**MVP (aligned with current code)**:

- Stages **0 → 1 → 2** with intervals **+1d, +3d, +7d** after **successful** review.
- After stage 2 success → **drop** from active queue or move to **monthly maintenance** pool (product choice).

**Target (richer)**:

- Per-item **ease factor**, **interval days**, **repetitions**, **due_at** (UTC).
- **Lapses** reset or reduce interval based on **error category** (see §9).

---

## 5. Practical scheduling algorithm (pseudocode)

```
on_review_result(item, correct, quality optional 0-5):
  if correct:
    item.repetitions += 1
    item.interval = next_interval(item.ease, item.repetitions)  // e.g. SM-2
    item.due_at = now + item.interval
    if item.repetitions >= graduation_threshold:
      item.state = 'graduated' | 'maintenance'
  else:
    item.lapses += 1
    item.interval = min_lapse_interval  // e.g. 10 min same day or +1d
    item.due_at = now + item.interval
    optionally lower item.ease
```

**Quality rating** (optional UX): “Again / Hard / Good / Easy” maps to SM-2 grades.

---

## 6. Item types to review

| Type | ID example | Source |
|------|------------|--------|
| **Lemma → TL** | `lemma_recognition` | `target_vocabulary_lemmas`, `recycle_lemmas` |
| **TL → translation** | `lemma_recall` | same + instruction locale gloss in data |
| **Grammar thread** | `grammar_reminder` | `grammar_primary_label` + optional micro-drill |
| **Chunk / phrase** | `phrase_frame` | future: phrase objects in bundle |
| **Listening** | `sound_discrim` | future: short audio clips |

---

## 7. Extraction from lessons

**Current behaviour** (`enqueueReviewFromLesson`):

1. Union **lemmas** from all `lesson_plan.steps[].recycle_lemmas` and `pedagogy.target_vocabulary_lemmas` (normalised lower-case).
2. Add **grammar** row keyed per lesson if `grammar_primary_label` non-empty.
3. **Upsert** queue in `localStorage` under `language-tutor-a2-review-v1`.

**Target rules**:

- **Dedupe** by `(lemma, locale)` globally; **merge** schedules (max interval wins or conservative min — product pick: **max due priority**).
- **Cap** new items per lesson (e.g. **12 lemmas**) to avoid queue floods — **assumption** until analytics say otherwise.
- **Tag** items with `lesson_id`, `unit_id`, `grammar_primary`, `cefr_level` for adaptive filters.

---

## 8. Mistake tracking model

| Field | Type | Purpose |
|-------|------|---------|
| `tag` | string | e.g. `word-order`, `register`, `modal-choice` |
| `wrong_count` | number | frequency |
| `last_wrong_at` | ISO | decay / prioritisation |
| `linked_lesson_ids` | string[] | optional trace |

**Current**: `language-tutor-a2-weak-tags-v1` stores **tag + wrongCount** (`A2WeakTagCount`).

---

## 9. Error categories (taxonomy)

Align `common_error_tags` in content with **stable** IDs:

- `word-order` — main clause / separable / question
- `article` — de/het
- `verb-form` — agreement / finite
- `modal` — kunnen/mogen/willen
- `register` — u/je / too informal
- `listening` — minimal pair / missed negation

**Rule**: Authors **must not** invent ad-hoc strings; extend taxonomy in **one** registry file (future `src/features/curriculum/errorTagRegistry.ts`).

---

## 10. Mastery tracking

**States**: `new` → `learning` → `review` → `graduated` (optional `relearning`).

**Signals**:

- SRS outcomes
- **Consecutive correct** count in review
- **Lesson self-check** success (optional boost)

**Display**: “Familiar / Strong” is **derived** — avoid false precision; prefer **confidence** copy.

---

## 11. Adaptive review strategy

1. **Daily budget**: max **N** items (e.g. 20) — mix **due** + **1–3 mistake** items.
2. **Band bias**: if learner in A2.2, **70%** items from A2.2 units, **30%** recycle A2.1.
3. **Grammar thread**: if `grammar_reminder` failed twice, inject **one** micro grammar card from source lesson.

---

## 12. Review UX principles

- **One item per screen** (flashcard-style) for **mobile**; **swipe** or **big buttons**.
- **Instant** grading for closed items; **skip** with explicit “see again soon.”
- **No guilt copy** — neutral, growth framing.
- **Session end summary**: “5 reviewed, 2 need more practice.”

---

## 13. Short-session mobile patterns

- **Resume** mid-session if app killed.
- **Haptic** (optional) on correct/wrong — behind setting.
- **Audio** optional for lemma review (tap to hear).

---

## 14. Scheduling: failed vs successful

| Outcome | Action |
|---------|--------|
| **Fail** | Shorter interval; optionally **same-day** short revisit |
| **Hard pass** | Small interval bump (not full jump) |
| **Easy pass** | Larger interval bump |

---

## 15. When to resurface items

- **Due date** reached (push / badge if notifications enabled).
- **Post-lesson**: optional “**3 quick reviews**” interstitial.
- **Weak tag threshold**: `wrong_count ≥ 2` → inject into next session.

---

## 16. Analytics and learning signals

| Event | Payload |
|-------|---------|
| `review_session_started` | item_count, source (daily / weak / module) |
| `review_item_graded` | item_type, correct, latency_ms, tags |
| `review_item_lapsed` | item_id, lapse_count |

Use signals to tune **intervals** and **caps** — not for public leaderboards by default (adult learners).

---

## 17. Example user flows

**Flow A — After lesson**

1. Complete lesson → `enqueueReviewFromLesson` adds lemmas + grammar label.
2. Toast: “Words saved for review.”
3. User opens **Revision** → sees due list sorted by `dueAt`.

**Flow B — Weak spots**

1. User fails self-check items tagged `word-order`.
2. `recordWeakSelfCheckTags` increments counts.
3. Revision tab shows **filter: weak tags** → prioritised items (future: generate targeted drills).

---

## 18. Persistence / state model (target server)

**Tables / documents (conceptual)**:

- `review_items` — id, user_id, kind, payload_ref, ease, interval, due_at, state, source_lesson_id
- `review_events` — append-only for analytics and FSRS recompute
- `weak_tag_stats` — aggregate per user

**Client today**: `localStorage` only — **migrate** with explicit sync conflict policy (last-write-wins unacceptable for counts; prefer **server merge**).

---

## 19. Risks and trade-offs

| Risk | Mitigation |
|------|------------|
| Queue overload | Per-lesson caps; maintenance pool |
| Lemmas without context | Show **one** example sentence in review card |
| Grammar items too abstract | Tie to **micro** production, not labels alone |
| Privacy (audio review) | Opt-in storage; local-only mode |

---

## 20. Related documents

- `docs/features/deep-dives/sub-features/personalization-recommendations/spaced-repetition.md`
- `docs/features/deep-dives/final/sub-features/core-lessons/guided-catalog-lesson-runtime.md` (review enqueue on completion)
- `a2-curriculum.md` §12–14
- `lesson-engine.md` §13 (AI hooks)
