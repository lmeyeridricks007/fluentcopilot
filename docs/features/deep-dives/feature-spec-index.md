# Feature Spec Index — AI Dutch Coach

## Overview

This index lists every major product capability that has a dedicated deep-dive specification. Each spec is implementation-oriented and covers purpose, scope, data, APIs, UI, rules, and implementation guidance.

**Source**: `docs/final/feature-domain-breakdown.md`, business requirements, architecture, and user workflows.

---

## Feature List

| # | Feature / Module | Short Description | Priority | Dependencies | File Name |
|---|------------------|-------------------|----------|--------------|-----------|
| 1 | **Authentication** | Sign-up, login (email/social), session, logout; foundation for all authenticated flows. | P0 | — | authentication.md |
| 2 | **Onboarding & Profile** | Profile collection (level, goals, context), consent, first recommendation; FD-01. | P0 | Authentication | onboarding-and-profile.md |
| 3 | **Core Lessons** | Vocabulary, grammar, flashcards, quizzes; CEFR-aligned micro-lessons; FD-02. | P0 | Profile, Entitlements, Content | core-lessons.md |
| 3A | **CEFR curriculum path & revision** (extension) | Level-bound ordered curriculum, daily plan, weak-area practice, revision; extends FD-01, FD-02, E-14. | P0 / P1 phased | Profile, Core Lessons, Personalization | cefr-curriculum-path.md (see also `final/cefr-curriculum-path.md`) |
| 4 | **Scenario Simulations** | Text/chat practice with AI in Dutch (real-life situations); FD-03. | P1 | Profile, Entitlements, AI Conversation, Moderation | scenario-simulations.md |
| 5 | **AI Voice Tutor** | Spoken Dutch conversation with AI; TTS/STT/LLM; FD-04. | P1 | Entitlements, Consent, Speech APIs, AI Conversation | ai-voice-tutor.md |
| 6 | **Listening Training** | Audio exercises, questions, no transcript during attempt; FD-05. | P1 | Content, Entitlements, CDN | listening-training.md |
| 7 | **Pronunciation** | Pronunciation feedback (phoneme, stress, fluency) after speech; FD-06. | P1 | Entitlements, Consent, Speech/Pronunciation API | pronunciation.md |
| 8 | **Daily Reflection** | Log activities (photo/location/notes); generated “Your day” lesson; FD-07. | P2 | Profile, Consent, LLM, Moderation, Entitlements | daily-reflection.md |
| 9 | **Location-Aware Prompts** | Phrase suggestions when near venues (e.g. café); optional; FD-08. | P2 | Consent, Location, Venue config | location-aware-prompts.md |
| 10 | **Exam Preparation** | A2/B1/KNM (and ONA) aligned practice and simulated exams; FD-09. | P1 | Content, Entitlements, Lesson Engine | exam-preparation.md |
| 11 | **Gamification** | XP, streaks, achievements; retention; FD-10. | P0 | All activity-completion flows | gamification.md |
| 12 | **AI Tutor Feedback** | Post-activity feedback (grammar, vocab, pronunciation, fluency, listening); FD-11. | P0 | Lessons, Scenarios, Voice, Session data | ai-tutor-feedback.md |
| 13 | **Entitlements & Subscription** | Free vs premium, trial, subscription, gating, usage limits; FD-12. | P0 | Payment provider, Usage tracking | entitlements-and-subscription.md |
| 14 | **Personalization & Recommendations** | Learning path, recommendations, skill profile, spaced repetition; cross-cutting. | P0 | Profile, Progress, Content, Lesson Engine | personalization-and-recommendations.md |
| 15 | **Notifications** | In-app and push; preferences, registration; re-engagement. | P2 | Profile, Entitlements, Push provider | notifications.md |

---

## Priority Legend

- **P0**: Critical path; required for launch or core loop.
- **P1**: High value; needed for full product experience.
- **P2**: Important; can follow initial release or be phased.

---

## Dependency Summary

- **Authentication** is required for all authenticated features.
- **Onboarding & Profile** feeds **Personalization**, **Core Lessons**, **Scenarios**, **Exam Prep**, **Daily Reflection**.
- **Entitlements** gates premium features: Scenarios, Voice, Pronunciation, Daily Reflection, Exam Prep (full), Listening (advanced).
- **Personalization** consumes profile and progress; drives home and recommendations for Lessons, Scenarios, Exam Prep. **CEFR curriculum path** (extension) feeds session set: path next, Today, revision — see `docs/feature-extensions/`.
- **AI Tutor Feedback** consumes session/lesson data from Core Lessons, Scenario Simulations, AI Voice Tutor, Listening.

---

## File Locations

- **Specs**: `docs/features/deep-dives/<file-name>.md` (extension **3A** uses `cefr-curriculum-path.md`; product overview remains in `docs/feature-extensions/`)
- **Reviews**: `docs/features/deep-dives/reviews/<feature-name>-review*.md`
- **Audits**: `docs/features/deep-dives/audits/<feature-name>-audit.md`
- **Final**: `docs/features/deep-dives/final/<file-name>.md`

---

## Coverage Status

| Feature | Spec Created | Reviewed | Audited | Finalized |
|---------|--------------|-----------|---------|-----------|
| Authentication | ✓ | ✓ | ✓ | ✓ |
| Onboarding & Profile | ✓ | ✓ | ✓ | ✓ |
| Core Lessons | ✓ | ✓ | ✓ | ✓ |
| Scenario Simulations | ✓ | ✓ | ✓ | ✓ |
| AI Voice Tutor | ✓ | ✓ | ✓ | ✓ |
| Listening Training | ✓ | ✓ | ✓ | ✓ |
| Pronunciation | ✓ | ✓ | ✓ | ✓ |
| Daily Reflection | ✓ | ✓ | ✓ | ✓ |
| Location-Aware Prompts | ✓ | ✓ | ✓ | ✓ |
| Exam Preparation | ✓ | ✓ | ✓ | ✓ |
| Gamification | ✓ | ✓ | ✓ | ✓ |
| AI Tutor Feedback | ✓ | ✓ | ✓ | ✓ |
| Entitlements & Subscription | ✓ | ✓ | ✓ | ✓ |
| Personalization & Recommendations | ✓ | ✓ | ✓ | ✓ |
| Notifications | ✓ | ✓ | ✓ | ✓ |

*(Update checkmarks as reviews and audits are completed.)*
