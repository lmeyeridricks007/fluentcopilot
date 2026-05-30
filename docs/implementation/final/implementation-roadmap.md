# Implementation Roadmap — AI Dutch Coach

**Source**: docs/implementation/ (epic-index, features, stories, tasks, data-model, apis, jobs, integrations, demo-data, qa-scenarios).  
**Purpose**: Epic order, feature order, dependency graph, and recommended implementation sequence for engineers and Cursor.

---

## 1. Epic Order (Recommended Sequence)

| Phase | Epic ID | Epic Name | Rationale |
|-------|---------|-----------|-----------|
| **1** | E-01 | Authentication | Foundation; no dependencies. |
| **2** | E-13 | Entitlements & Subscription | Minimal (tier, usage, cap) needed before gated features. Can start in parallel with E-02 after E-01. |
| **2** | E-02 | Onboarding & Profile | Profile and consent required for level-based catalog and recommendations. |
| **3** | E-03 | Core Lessons | Primary learning loop; depends on E-02 (level), E-13 (cap). |
| **4** | E-11 | Gamification | XP and streak on completion; Core Lessons (and others) call award. |
| **4** | E-14 | Personalization & Recommendations | Session set, recommendations, activity ingestion; depends on E-02, E-03, E-11. |
| **5** | E-12 | AI Tutor Feedback | Post-activity feedback; depends on lesson/scenario/voice data. |
| **6** | E-04 | Scenario Simulations | LLM conversation; depends on E-02, E-13, moderation. |
| **6** | E-05 | AI Voice Tutor | STT/TTS/LLM; depends on E-13, consent, speech APIs. |
| **7** | E-06 | Listening Training | Listening catalog, attempt, scoring; depends on E-13, content. |
| **7** | E-07 | Pronunciation | Pronunciation API, persistence, feedback UI; depends on E-13, consent. |
| **8** | E-10 | Exam Preparation | Exam modules, tasks, simulated exam; depends on E-03, E-13, content. |
| **9** | E-15 | Notifications | Settings, push registration, triggers; depends on E-02, E-13. |
| **10** | E-08 | Daily Reflection | Reflection entries, LLM lesson generation; P2. |
| **10** | E-09 | Location-Aware Prompts | Venue config, prompt trigger; P2, optional. |

---

## 2. Feature Order Within Epics

### E-01 Authentication

Features (implementation order): sign-up → login → session-management → logout → password-reset → oauth-integration.

### E-13 Entitlements & Subscription

Features: entitlement-check → usage-tracking → trial-management → subscription-webhooks → cap-enforcement (used by E-03, E-04, etc.).

### E-02 Onboarding & Profile

Features: profile-steps → profile-persistence → consent-management → onboarding-resume → first-recommendation.

### E-03 Core Lessons

Features: lesson-catalog → lesson-run (with cap check) → lesson-progress (checkpoint) → lesson-completion → lesson-cap-enforcement (logic in run + completion) → quiz → flashcards.

### E-11 Gamification

Features: xp-award → streak-management → achievements → gamification-summary.

### E-14 Personalization & Recommendations

Features: activity-ingestion → skill-profile → recommendations-api → session-set → learning-path → spaced-repetition.

---

## 3. Dependency Graph (Simplified)

```
E-01 Auth
  ├─→ E-02 Onboarding & Profile
  │     ├─→ E-03 Core Lessons ──┬─→ E-11 Gamification
  │     │                        └─→ E-14 Personalization
  │     └─→ E-14 Personalization (profile, first recommendation)
  ├─→ E-13 Entitlements ──→ E-03, E-04, E-05, E-06, E-07, E-08, E-10 (cap / gating)
  └─→ E-15 Notifications (optional; E-02 consent)

E-03, E-04, E-05, E-06, E-08, E-10 ──→ E-11 (award XP on complete)
E-03, E-04, E-05, E-06 ──→ E-12 (AI Tutor Feedback)
E-03, E-02, E-11 ──→ E-14 (activity events, session set)
```

---

## 4. Recommended Implementation Sequence (Sprint-Friendly)

### Foundation (Sprint 1–2)

1. **E-01** Authentication: sign-up, login, session, logout, password reset, OAuth.  
2. **E-13** Entitlements (minimal): GET /entitlements (tier, usage), usage_counts, trial start, config for cap; webhook stub or full Stripe webhook.  
3. **E-02** Onboarding & Profile: profile API, consent API, onboarding steps UI, first recommendation at completion.

### Core Learning (Sprint 3–4)

4. **E-03** Core Lessons: catalog (GET /lessons), run (GET /lessons/:id + cap), progress (checkpoint + complete), quiz step, summary; cap modal and upsell.  
5. **E-11** Gamification: award on lesson complete, streak, GET summary; optional achievements.  
6. **E-14** Personalization: activity-event ingestion, recommendations API or session set, Home “Continue” and “Recommended” cards.

### AI & Speech (Sprint 5–7)

7. **E-12** AI Tutor Feedback: feedback generation (rule-based or LLM), persistence, display.  
8. **E-04** Scenario Simulations: scenario catalog, conversation session/turn, moderation, completion, cap.  
9. **E-05** AI Voice Tutor: voice session, STT → LLM → TTS, completion, fair-use.  
10. **E-06** Listening Training: catalog, attempt, scoring.  
11. **E-07** Pronunciation: analysis API, persistence, feedback UI.

### Growth & Optional (Sprint 8+)

12. **E-10** Exam Preparation: exam modules, tasks, progress, simulated exam.  
13. **E-15** Notifications: settings, push registration, trigger delivery.  
14. **E-08** Daily Reflection: entries, lesson generation, delivery.  
15. **E-09** Location-Aware Prompts: consent, venue config, trigger, display.

---

## 5. Artifact Index (Where to Build From)

| Artifact | Location | Use |
|----------|----------|-----|
| Epic index | docs/implementation/epics/epic-index.md | Epic list, dependencies, order. |
| Feature docs | docs/implementation/features/*.md | Purpose, scope, sub-features, completion checklist. |
| User stories | docs/implementation/stories/*.md | AC, pre/post conditions; trace to tasks. |
| Task breakdown | docs/implementation/tasks/*.md | Frontend, backend, DB, integration, jobs; inputs/outputs. |
| Data model | docs/implementation/data-model.md | Tables, indexes, example records; seed requirements. |
| API contracts | docs/implementation/apis.md | Endpoints, request/response, errors. |
| Jobs | docs/implementation/jobs.md | Async workflows, triggers, retry. |
| Integrations | docs/implementation/integrations.md | External systems, env vars, auth. |
| Demo/seed data | docs/implementation/demo-data.md | Reference data, lessons, exercises, demo users. |
| QA scenarios | docs/implementation/qa-scenarios.md | Happy path, errors, edge cases, permissions. |
| Review | docs/implementation/reviews/implementation-plan-review.md | Coverage, gaps, verdict. |

---

## 6. Feature Completion Checklist (Per Feature)

Each feature is complete only when:

- [ ] UI screens implemented; buttons wired to actions.  
- [ ] API endpoints implemented and contract-compliant.  
- [ ] Backend services implemented (including integrations).  
- [ ] Database schema and migrations applied; seed data created.  
- [ ] Background jobs implemented where specified.  
- [ ] Integrations wired (Entitlements, Gamification, Personalization, payment, LLM, STT/TTS, etc.).  
- [ ] Seed/demo data created for local and staging.  
- [ ] Tests written (unit, integration, E2E per qa-scenarios.md).

Use the checklist in each feature file (e.g. core-lessons.md, entitlements-subscription.md) for the detailed list per feature.

---

## 7. Next Steps

1. **Implement in order**: E-01 → E-13 (minimal) + E-02 → E-03 → E-11 → E-14 → E-12 → E-04 → E-05 → …  
2. **Expand remaining epics**: For E-04, E-05, E-06, E-07, E-08, E-09, E-10, E-15, create feature docs, user stories, and task breakdowns using the same structure as Core Lessons and Entitlements (see docs/implementation/features/core-lessons.md and tasks/core-lessons-tasks.md).  
3. **Traceability**: Optionally add story → task mapping (e.g. CL-01 → CL-F01, CL-B01) in stories or a separate traceability matrix.  
4. **Review**: Re-run implementation plan review when new epics are fully broken down; update coverage-report if maintained.
