# Implementation Planning — AI Dutch Coach

This folder contains **build-ready engineering implementation artifacts** derived from the Feature Deep-Dive Specifications.

**Source of truth**:  
- docs/features/deep-dives/final/  
- docs/features/deep-dives/sub-features/  
- docs/features/deep-dives/feature-index.md  

---

## Structure

| Path | Contents |
|------|----------|
| **epics/** | Epic index (epic-index.md): all 15 epics, descriptions, dependencies, priority, recommended order. |
| **features/** | Feature docs per epic: purpose, scope, dependencies, sub-features, completion checklist. Full detail for Core Lessons and Entitlements; summary for Auth, Onboarding, Gamification, Personalization. |
| **stories/** | User stories with "As a / I want / So that", acceptance criteria, preconditions, postconditions. Core Lessons (8), Entitlements (5). |
| **tasks/** | Implementation task breakdown: Frontend, Backend, Database, Integration, Background jobs, Infrastructure. Core Lessons and Entitlements fully broken down with task IDs, inputs/outputs, dependencies, complexity. |
| **data-model.md** | Tables, indexes, relationships, example records, seed requirements (lessons, lesson_progress, usage_counts, subscriptions, trials, content reference). |
| **apis.md** | API contracts: endpoints, request/response examples, auth, error responses (lessons, progress, entitlements, trial, webhook). |
| **jobs.md** | Background jobs: completion downstream retry, trial expiry, webhook processing, daily reflection, streak, notifications. |
| **integrations.md** | External integrations: Stripe, LLM, STT, TTS, Pronunciation, CDN, Email, Push, Redis, Sentry; purpose, auth, env vars. |
| **demo-data.md** | Seed/demo data: locales, CEFR, lessons, exercises, vocabulary, demo users (free_at_cap, in_progress, premium, trial), config. |
| **qa-scenarios.md** | QA scenarios: happy path, errors, edge cases, permissions, integration failures for Core Lessons and Entitlements; auth reference. |
| **reviews/** | Implementation plan review: coverage, missing tasks/data/integrations/QA, clarity, completeness, actionability; scores and verdict. |
| **final/** | Finalized roadmap and checklist: implementation-roadmap.md (epic/feature order, dependency graph, sequence), feature-completion-checklist.md (master checklist). |

---

## How to Use

1. **Start with the roadmap**: docs/implementation/final/implementation-roadmap.md for epic order and feature sequence.  
2. **Implement by epic**: E-01 Auth → E-13 Entitlements (minimal) + E-02 Onboarding → E-03 Core Lessons → E-11 Gamification → E-14 Personalization → …  
3. **Per feature**: Read the feature doc (e.g. features/core-lessons.md) for scope and checklist; use stories (e.g. stories/core-lessons-stories.md) for AC; use tasks (e.g. tasks/core-lessons-tasks.md) for concrete implementation tasks.  
4. **Data and APIs**: data-model.md and apis.md are the single place for schema and contract details.  
5. **Integrations and jobs**: integrations.md and jobs.md for external systems and async work.  
6. **QA**: qa-scenarios.md for test scenarios; ensure tests cover happy path, errors, edge cases, permissions, integration failures.  
7. **Done**: Use feature-completion-checklist.md (and per-feature checklists) to mark a feature complete only when UI, API, backend, DB, jobs, integrations, seed data, and tests are in place.

---

## Expansion

For epics not yet fully broken down (E-04 through E-10, E-12, E-15), use the same template as Core Lessons and Entitlements:

- Add a feature doc in **features/** (purpose, scope, dependencies, sub-features, checklist).  
- Add user stories in **stories/** (multiple per feature, with AC).  
- Add task breakdown in **tasks/** (F/B/D/I/J/N with task IDs, inputs, outputs, dependencies, complexity).  
- Update **data-model.md**, **apis.md**, **jobs.md**, **integrations.md**, **demo-data.md**, **qa-scenarios.md** as new endpoints and tables are defined.  
- Re-run review in **reviews/** and update **final/implementation-roadmap.md** if needed.

---

## Important Rules

- **Tasks are concrete and actionable**: e.g. "GET /v1/lessons handler", "CapReachedModal", "increment usage_counts".  
- **Every feature has**: frontend tasks, backend tasks, database tasks, integration tasks, seed/demo data, and QA scenarios.  
- **Do not skip**: backend, data, or integration work; all are specified where applicable.
