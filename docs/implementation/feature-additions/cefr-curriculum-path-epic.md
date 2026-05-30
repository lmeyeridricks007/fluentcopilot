# Epic E-16: CEFR curriculum path, daily plan, weak areas & revision

**Feature slug**: `cefr-curriculum-path`  
**Status**: Planned (build-ready artifacts in this folder)  
**Deep-dive**: `docs/features/deep-dives/cefr-curriculum-path.md`  
**Extension narrative**: `docs/feature-extensions/cefr-curriculum-path-overview.md`

---

## Epic summary

| Field | Value |
|-------|--------|
| **Epic ID** | **E-16** |
| **Name** | CEFR curriculum path, daily plan, weak areas & revision |
| **Priority** | P0 (phased: path + today = P0; weak + revision = P1) |
| **Business value** | Clear “what’s next,” higher completion/retention, structured syllabus without replacing the core lesson runtime |
| **Success metrics** | Path adoption %, lessons started from path vs browse, daily plan completion rate, revision sessions/user/week, weak-area drill CTR |

---

## Problem statement

Learners see a **flat lesson catalog** and generic recommendations. The product already supports CEFR-tagged lessons and `lesson_progress`, but not an **ordered curriculum per study level**, a **daily queue**, **granular mistake signals**, or **revision mixes** from completed content.

---

## Scope (epic boundary)

### In scope

- Published **curriculum manifest** per `(locale, CEFR level)` with ordered units and lessons.
- **User study context** (`active_study_level`, optional daily lesson target).
- **APIs**: path projection, today queue, study-context CRUD, exercise attempts, weak-areas read, revision create/submit.
- **UI**: Path tab on Learn, Today on Home, study level in Settings (and optional onboarding confirmation), weak areas + revision entry on Progress/Learn.
- **Feature flag** `curriculum_path_enabled`.
- **Importer** from `data/curriculum/{locale}/{Level}/` (interim).

### Out of scope (same as deep-dive §5.2)

- ML adaptive ordering, LLM-only revision items, full CMS authoring UI.

---

## Feature breakdown (workstreams)

| # | Workstream | Description | Primary stories |
|---|------------|-------------|-----------------|
| W1 | **Content & data** | Migrations, manifest tables, JSON import, `external_id` alignment with `lessons` | CUR-01, CUR-02 |
| W2 | **Study context** | Profile/BFF PATCH/GET study level + daily target | CUR-03 |
| W3 | **Path & today** | GET path, GET today, caching, Home/Learn UI | CUR-04, CUR-05 |
| W4 | **Assessment signals** | POST exercise-attempt from quiz; GET weak-areas | CUR-06, CUR-07 |
| W5 | **Revision** | Session create/submit, revision UI, optional limits | CUR-08, CUR-09 |
| W6 | **Cross-cutting** | Feature flag, analytics events, E2E, demo seeds | CUR-10 |

---

## Dependencies on other epics

| Epic | Why |
|------|-----|
| **E-01** Authentication | All APIs user-scoped |
| **E-02** Onboarding & Profile | Default study level from profile; Settings |
| **E-03** Core Lessons | Lesson run, `lesson_progress`, cap on GET `/lessons/:id` |
| **E-13** Entitlements | Unchanged cap rules; optional revision/day limits |
| **E-14** Personalization | Session set may embed `today` + path summary (optional BFF) |
| **E-11** Gamification (optional) | `daily_plan_completed`, `revision_session_completed` |

**Blocks**: Nothing critical blocks E-16 except **published lessons** that match manifest `external_id` after import.

---

## Non-goals

- Replacing FD-02 quiz or checkpoint behaviour.
- Changing free-tier lesson cap semantics (only clarifying revision/attempt paths per PATH-BR-05).

---

## Links

| Artifact | Path |
|----------|------|
| User stories | [cefr-curriculum-path-stories.md](cefr-curriculum-path-stories.md) |
| Tasks | [cefr-curriculum-path-tasks.md](cefr-curriculum-path-tasks.md) |
| QA | [cefr-curriculum-path-qa-scenarios.md](cefr-curriculum-path-qa-scenarios.md) |
| Demo data | [cefr-curriculum-path-demo-data.md](cefr-curriculum-path-demo-data.md) |
| Master plan | [cefr-curriculum-path-implementation-plan.md](cefr-curriculum-path-implementation-plan.md) |
