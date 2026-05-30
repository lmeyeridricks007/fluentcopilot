# Feature Completion Checklist (Master)

Each feature is marked complete only when all of the following exist. Use this in addition to the checklist in each feature file (e.g. docs/implementation/features/core-lessons.md).

---

## Global Criteria (All Features)

| # | Criterion | Notes |
|---|-----------|--------|
| 1 | **UI screens implemented** | Screens and flows from feature/story specs. |
| 2 | **Buttons and actions wired** | All CTAs call correct APIs or navigation. |
| 3 | **API endpoints implemented** | Match docs/implementation/apis.md (and feature-specific contracts). |
| 4 | **Backend services implemented** | Business logic, validation, integrations. |
| 5 | **Database schema implemented** | Tables, indexes, FKs from docs/implementation/data-model.md. |
| 6 | **Background jobs implemented (if needed)** | Per docs/implementation/jobs.md. |
| 7 | **Integrations wired** | External and internal (Entitlements, Gamification, Personalization, payment, LLM, etc.) per docs/implementation/integrations.md. |
| 8 | **Seed/demo data created** | Per docs/implementation/demo-data.md; app looks alive locally. |
| 9 | **Tests written** | Unit, integration, and E2E scenarios from docs/implementation/qa-scenarios.md. |

---

## By Epic (Summary)

| Epic | Key deliverables |
|------|-------------------|
| E-01 Authentication | SignUp/Login/Logout UI; auth API; session/JWT; OAuth; password reset; users/sessions in DB. |
| E-02 Onboarding & Profile | Onboarding steps UI; profile + consent API; profiles + consent_preferences; first recommendation. |
| E-03 Core Lessons | Lesson list + run + progress + completion UI; GET/POST lessons and progress; cap modal; lessons, lesson_progress, usage; Entitlements + Gamification + Personalization integration. |
| E-13 Entitlements | Entitlement context + usage indicator + paywall/trial UI; GET entitlements + trial/start + webhook; subscriptions, trials, usage_counts; Redis cache; Stripe. |
| E-11 Gamification | XP/streak/achievements UI; award API + summary; user_xp, streak, achievements; called from completion flows. |
| E-14 Personalization | Home/session set UI; recommendations + activity-event API; skill profile; activity ingestion; session set builder. |
| E-12 AI Tutor Feedback | Feedback card UI; feedback generation + persistence API; feedback records; triggered by lesson/scenario/voice. |
| E-04 Scenario Simulations | Scenario catalog + chat UI; scenario + conversation API; moderation; LLM integration. |
| E-05 AI Voice Tutor | Voice UI (mic, playback); voice session + turn API; STT + TTS + LLM integration. |
| E-06 Listening Training | Listening catalog + attempt UI; listening API; audio from CDN. |
| E-07 Pronunciation | Pronunciation feedback UI; analysis API; persistence; pronunciation provider. |
| E-10 Exam Preparation | Exam modules + tasks + simulated exam UI and API; exam content and progress. |
| E-15 Notifications | Settings UI; push registration + trigger delivery; push provider. |
| E-08 Daily Reflection | Reflection entries UI; lesson generation job; LLM integration. |
| E-09 Location-Aware Prompts | Consent; venue config; prompt trigger and display. |

---

## Reference

- **Feature-level checklists**: docs/implementation/features/*.md  
- **Implementation roadmap**: docs/implementation/final/implementation-roadmap.md  
- **QA scenarios**: docs/implementation/qa-scenarios.md  
