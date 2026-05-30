# Implementation Epic Index — AI Dutch Coach

**Source**: docs/features/deep-dives/final/, docs/features/deep-dives/sub-features/, docs/features/deep-dives/feature-index.md

---

## Epic Summary

| Epic ID | Epic Name | Description | Business Value | Priority | Dependencies on Other Epics |
|---------|------------|-------------|----------------|----------|-----------------------------|
| E-01 | Authentication | Sign-up, login (email/social), session, logout, password reset, OAuth | Foundation for all personalized flows; identity and security | P0 | — |
| E-02 | Onboarding & Profile | Profile collection, consent, onboarding resume, first recommendation | Personalization and level-based content; compliance (consent) | P0 | E-01 |
| E-03 | Core Lessons | Lesson catalog, run, progress, completion, cap, quiz, flashcards | Primary learning loop; engagement and conversion (cap) | P0 | E-02, E-13 |
| E-04 | Scenario Simulations | Scenario catalog, conversation session/turn/moderation, completion, cap | Premium differentiation; real-life practice | P1 | E-02, E-13 |
| E-05 | AI Voice Tutor | Voice session, turn (STT/TTS/LLM), completion, fair-use | Premium value; speaking practice at scale | P1 | E-13, E-02 (consent) |
| E-06 | Listening Training | Listening catalog, attempt, scoring; no transcript during attempt | Engagement; exam prep | P1 | E-13, Content |
| E-07 | Pronunciation | Pronunciation analysis, persistence, feedback UI | Premium value; learning efficacy | P1 | E-13, E-02 (consent) |
| E-08 | Daily Reflection | Reflection entries, lesson generation, daily lesson delivery | Habit and personalization; premium | P2 | E-02, E-13, LLM |
| E-09 | Location-Aware Prompts | Location consent, venue config, prompt trigger, display | Optional differentiation | P2 | E-02 (consent) |
| E-10 | Exam Preparation | Exam modules, tasks, progress, simulated exam | Conversion; exam-focused users | P1 | E-03, E-13, Content |
| E-11 | Gamification | XP award, streak management, achievements, summary | Retention and engagement | P0 | All completion flows (E-03, E-04, E-05, E-06, E-08, E-10) |
| E-12 | AI Tutor Feedback | Feedback generation, persistence, display | Learning efficacy; trust (IS-016) | P0 | E-03, E-04, E-05, E-06 |
| E-13 | Entitlements & Subscription | Entitlement check, usage tracking, trial, webhooks, cap enforcement | Revenue; gating and conversion | P0 | Payment provider |
| E-14 | Personalization & Recommendations | Recommendations API, skill profile, activity ingestion, session set, learning path, spaced repetition | Relevance and “what’s next” | P0 | E-02, E-03, E-11 |
| E-15 | Notifications | Notification settings, push registration, trigger delivery | Re-engagement; trial/conversion nudges | P2 | E-02, E-13 |
| E-16 | CEFR curriculum path & revision | Manifest import, path/today APIs, study context, exercise attempts, weak areas, revision sessions | Structured learning, retention, remediation | P0 (phased) | E-01, E-02, E-03, E-13; optional E-11, E-14 |

**E-16 implementation bundle**: `docs/implementation/feature-additions/cefr-curriculum-path-implementation-plan.md`

---

## Epic Dependency Graph (High Level)

```
E-01 (Auth)
  → E-02 (Onboarding & Profile)
       → E-03 (Core Lessons) ──→ E-11 (Gamification)
       → E-14 (Personalization)    E-12 (Feedback)
  → E-13 (Entitlements) ──→ E-03, E-04, E-05, E-06, E-07, E-08, E-10 (gating)
  → E-11 (Gamification) ←── E-03, E-04, E-05, E-06, E-08, E-10 (completion events)
  → E-12 (Feedback) ←── E-03, E-04, E-05, E-06
  → E-15 (Notifications)
  → E-16 (CEFR curriculum path) ← E-03, E-02, E-13
```

---

## Dependent Features (Cross-Epic)

- **Core Lessons** depends on: Profile (user level), Entitlements (cap, usage), Content (lessons, exercises), Gamification (XP on complete), Personalization (activity-event).
- **Entitlements** depends on: Payment provider (webhooks), all gated features (consume entitlement check and usage).
- **Gamification** depends on: Lesson completion, scenario completion, voice completion, listening completion, daily reflection completion, exam task completion (all emit completion events).
- **Personalization** depends on: Profile, progress (lesson_progress, etc.), activity events from all completion flows.
- **E-16 CEFR curriculum path** depends on: Core Lessons (lessons, lesson_progress, lesson start cap), Profile (study context), Entitlements (optional revision limits); see `docs/implementation/feature-additions/`.

---

## Recommended Epic Order (Implementation)

1. **E-01** Authentication  
2. **E-13** Entitlements & Subscription (minimal: tier, usage, cap)  
3. **E-02** Onboarding & Profile  
4. **E-03** Core Lessons  
5. **E-11** Gamification  
6. **E-14** Personalization & Recommendations (recommendations, session set)  
6b. **E-16** CEFR curriculum path (after E-03 + minimal E-13 + E-02; phased P0/P1)  
7. **E-12** AI Tutor Feedback  
8. **E-04** Scenario Simulations  
9. **E-05** AI Voice Tutor  
10. **E-06** Listening Training  
11. **E-07** Pronunciation  
12. **E-10** Exam Preparation  
13. **E-15** Notifications  
14. **E-08** Daily Reflection  
15. **E-09** Location-Aware Prompts  

*Note: E-13 can be implemented in parallel with E-02 after E-01; minimal E-13 (tier + usage + cap) is needed before E-03.*
