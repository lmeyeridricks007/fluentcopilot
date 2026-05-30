# Logged-in navigation & home refresh

Implementation pass (IA + hierarchy, not a new visual system). Aligns the private app with FluentCopilot’s strongest hooks: **structured learning**, **guided practice**, and **exam prep**.

## Bottom navigation

| Before | After |
|--------|--------|
| Home · Learn · Practice · **Progress** · Account | Home · Learn · Practice · **Exams** · Account |

- **Exams** is the primary destination for `/app/exam-prep` (and nested exam-prep routes). Practice no longer “absorbs” exam prep for tab highlighting.
- **Progress** remains a full screen at `/app/progress`, reachable from Home (status strip + footer links) and cross-links from other surfaces. It is intentionally **not** a bottom-tab peer to Exams.

## Home information architecture

Home is reframed as a **guided launchpad** with fewer competing blocks:

1. **Greeting** — short subtitle sets expectation (“guided launchpad”).
2. **Post-A2 pathway banner** (when eligible) — unchanged strategic surface.
3. **Compact status strip** — streak, XP, pathway label, readiness headline + weak-area hint, link to **Progress & abilities**.
4. **Primary action** — **Resume** (hero gradient) when a resumable flow exists; otherwise **Next best action** hero (missions, weak area, continue practice, lesson fallback, etc.).
5. **Intent-aware focus** (order + emphasis):
   - **Exam-focused** (`selectedPath === exam_prep`, or `primaryGoalId === exam_inburgering`, or `learningReasonId === exam_visa`): large **Exam prep** promo, then **Practical Dutch** card.
   - **Practical-focused** (`selectedPath === a2_mastery` or everyday/speaking/work-life goals): **Practical** card first, **Exam prep** still prominent (secondary emphasis).
   - **Lesson-first** (default): **Lesson path** card + **Exam prep** promo (primary emphasis).
6. **Review & reinforce** — grouped subsections:
   - **Review**: daily review, fix mistakes.
   - **Practice tools**: single row into Practice hub.
7. **Resume (compact)** — shown when the primary slot was **not** resume (avoids duplicate hero).
8. **More tools** — smaller grid: smart prompts, Dutch from your day, reflection, Learn tab.
9. **Latest unlock** (if any), **Premium** upsell (non-premium), footer text links.

### Demoted / removed from Home (still in product elsewhere)

- Separate **Daily / weekly / skill missions** section (mission often still wins via **next best** hero).
- **Featured scenario** as its own section (fed into **Practical Dutch** card when available).
- **Weak areas**, **confidence grid**, **habit strip**, **mastery snapshot** as standalone sections (hints fold into **status strip**; detail lives on **Progress**).
- **Today’s plan** (`TodayPlanSection`) — Learn tab / path holds this.
- **Weekly rank** on Home — omitted to cut clutter (can return on Progress or Achievements if needed).
- **Exam prep** as a small 2-up tile next to Reflection — replaced by a **first-class promo card** and **Exams** tab.

## Exam prep surfacing

- **Bottom nav → Exams**
- **Home**: large **Exam prep** promo (always for lesson-first; always visible for practical users as second card; primary for exam intent).
- **Exams landing** (`/app/exam-prep`): **Jump into a skill** grid (Speaking, Writing, Listening, Reading, KNM) immediately under the hero; resume card moved below readiness so the page reads as a **hub** first.
- **Progress** page: **Exam prep hub →** link under the title.

## Learner intent

`resolveHomeLearnerIntent()` in `src/features/home/homeLearnerIntent.ts` reads durable profile fields only. It is intentionally shallow (no new branching explosion).

## Dev / demo chrome

- **Demo scenario** switcher removed from the main **Header**; it lives under **Dev → Demo data scenario** on `/app/dev-tools`.
- **Dev** link remains for internal builds but is visually de-emphasized; tooltip notes where the scenario switcher moved.

## Future improvements

- Wire **weekly minutes** on Progress to real retention aggregates instead of demo `MOCK_PROGRESS`.
- Optional **Readiness** mini-card on Home if we find the strip too thin for some cohorts.
- **Exams** tab: active state uses `pathnameMatchesExamsNav()` in `src/lib/routing/examsNav.ts` — `/app/exam-prep`, `/app/exam`, and `/app/exam/*` (without mis-matching `exam-prep` as `exam`).
- Analytics: dedicated event for **Exams tab** vs **Exam promo** clicks (currently reuses `dashboard_next_action_clicked` on promo).
