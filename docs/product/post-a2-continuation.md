# Post-A2 continuation path

| Attribute | Value |
|-----------|--------|
| Status | **Implementation reference** |
| Code | `src/lib/post-a2/*`, `src/features/post-a2/*`, `/app/learn/post-a2` |
| Related | [`a2-curriculum.md`](./a2-curriculum.md), [`practice-system-architecture.md`](./practice-system-architecture.md), [`practice-retention-integration.md`](./practice-retention-integration.md) |

---

## 1. Naming & packaging decision

**Primary public name for Option B:** **“Dutch in real situations”** — emphasizes real-life mastery and confidence, not drills.

**Subtitle:** **“Your A2 mastery phase”** — frames a deliberate continuation chapter after course completion.

**Option C:** **“Targeted confidence tune-up”** / **“Strengthen before B1”** — reinforcement without sounding like remedial “extra exercises.”

We avoid copy such as “more practice,” “bonus,” or “optional homework.”

---

## 2. Architecture

| Piece | Role |
|--------|------|
| `a2PathCompletion.ts` | Registered A2 lesson ids; `isA2CurriculumComplete`; `isA2PathCompleteMerged` (retention + demo progress merge). |
| `readinessEvaluator.ts` | Explainable B1 readiness from ability band counts + weak-tag pressure. |
| `postA2RecommendationBuilder.ts` | Maps readiness → recommended option id (A / B / C). |
| `postA2PathRouter.ts` | Central hrefs for B1 entry, Practice Hub, mistakes, tracks, review, progress. |
| `masteryPathBuilder.ts` / `weakSkillsPathBuilder.ts` | Product copy + step lists for Option B / C. |
| `postA2Signals.ts` | Client signal aggregation: mastery state, ledger scenario refs, skill tracks, weak tags → band counts. |
| `postA2TransitionModel.ts` | Composes full `PostA2TransitionViewModel` for UI. |
| `PostA2TransitionScreen` | Premium mobile-first layout: hero, readiness card, three option cards, path detail sections. |

---

## 3. Readiness for B1 (how it works)

Signals (all client-local today):

- **Ability bands** — `ABILITY_DEFINITIONS` × `computeAbilityDisplayScore` (EMA, practice ledger refs for scenarios, weak-tag overlap, skill-track lows).
- **Weak tags** — count of distinct weak-tag rows from `loadWeakTags()` (readiness evaluator uses count only).

**Levels:**

| Level | Typical triggers | Recommended option |
|--------|------------------|-------------------|
| `strengthen_first` | Many weak abilities (≥4), or high weak-tag pressure, or combined weak ability + tags | Option C |
| `ready` | ≤1 weak, ≥5 strong, ≤2 tag categories with pressure, enough abilities tracked | Option A |
| `nearly_ready` | Default | Option B |

Copy stays supportive; no “fail” language.

---

## 4. Routing (Options A / B / C)

| Option | Primary CTA target | Product behavior |
|--------|-------------------|------------------|
| A — Continue to B1 | `/app/learn` | Sets `activeStudyLevel` to **B1** via `useStudyContextStore` (B1 curriculum depth is a **placeholder** until content ships). |
| B — Dutch in real situations | `/app/practice` | Practice Hub as home base for scenarios, missions, streak, mastery. |
| C — Targeted tune-up | `/app/review/mistakes` | Mistake fix first; screen also links skill tracks, daily review, progress. |

Deep link for the full chooser: **`/app/learn/post-a2`**. Guard: only if `isA2PathCompleteMerged(...)` is true.

---

## 5. Surfaces updated

- **Lesson completion** (`LessonRenderer`) — After final A2 lesson when path complete: message + primary “Choose your next chapter.”
- **Learning path hero** — When no `nextLesson` but A2 path complete: “Plan your next chapter.”
- **Home** — Gradient card when A2 complete + study level A2.
- **Practice Hub** — Compass callout for post-A2 learners.
- **Progress** — Compact link card to post-A2 chooser.

---

## 6. Analytics

- `post_a2_transition_viewed` — transition screen mount (readiness + recommendation).
- `post_a2_option_selected` — option card navigation (includes `readinessLevel`).
- `post_a2_banner_clicked` — home, practice hub, lesson completion entry.

---

## 7. Assumptions / placeholders

- **B1 curriculum** — Option A switches study context to B1; full B1 path content may still mirror A2 in mock services until expanded.
- **Weak tags vs weakness categories** — Band scoring uses tag strings as a `Set` for overlap with `weaknessCategoryIds` when formats align; otherwise bands still work from EMA + ledger.
- **Readiness** — Not a test; thresholds are tunable constants in `readinessEvaluator.ts`.

---

## 8. Recommended next step

**Integrate the post-A2 path into dashboard and progress surfaces more deeply** — e.g. pinned mission set for “Dutch in real situations,” progress meter toward “B1-ready confidence,” and richer B1 browse once catalog exists.
